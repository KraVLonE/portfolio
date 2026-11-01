"""Admin blog API (BLG-30–38, 45–46). Every route requires x-admin-token."""
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import verify_admin_token
from app.blog import service as svc
from app.blog.schemas import (
    AdminCommentOut, AdminPostDetail, AdminPostSummary, AuthorCommentIn, CommentStatusIn, ImageOut, PostIn,
    PublishIn, TagIn, TagWithCount,
)
from app.blog.text import slugify
from app.core.config import settings
from app.core.database import get_db
from app.models.blog import BlogComment, BlogImage, BlogPost, BlogTag, blog_post_tags

router = APIRouter(prefix="/admin/blog", tags=["blog-admin"], dependencies=[Depends(verify_admin_token)])


# ======================= posts =======================
@router.get("/posts", response_model=List[AdminPostSummary])
async def list_posts(status: Optional[Literal["draft", "published"]] = None, db: AsyncSession = Depends(get_db)):
    q = select(BlogPost).order_by(BlogPost.updated_at.desc(), BlogPost.id.desc())
    if status:
        q = q.where(BlogPost.status == status)
    posts = (await db.execute(q)).scalars().all()
    pending = await svc.pending_counts(db, (p.id for p in posts))
    return [svc.to_admin_summary(p, pending.get(p.id, 0)) for p in posts]


@router.get("/posts/{post_id}", response_model=AdminPostDetail)
async def get_post(post_id: int, db: AsyncSession = Depends(get_db)):
    post = await svc.load_post(db, post_id)
    pending = await svc.pending_counts(db, [post.id])
    return svc.to_admin_detail(post, pending.get(post.id, 0))


async def _apply(db: AsyncSession, post: BlogPost, data: PostIn) -> None:
    post.tags = await svc.resolve_tags(db, data.tags)
    await svc.claim_slug(db, post, await svc.choose_slug(db, data.slug, data.title, post.id))
    post.title = data.title
    post.excerpt = data.excerpt
    post.content_md = data.content_md
    post.cover_image_url = data.cover_image_url
    post.comments_enabled = data.comments_enabled


@router.post("/posts", response_model=AdminPostDetail, status_code=201)
async def create_post(data: PostIn, db: AsyncSession = Depends(get_db)):
    post = BlogPost(status="draft", slug="", tags=[])  # always starts as draft
    await _apply(db, post, data)
    db.add(post)
    await db.commit()
    return svc.to_admin_detail(await svc.load_post(db, post.id))


@router.put("/posts/{post_id}", response_model=AdminPostDetail)
async def update_post(post_id: int, data: PostIn, db: AsyncSession = Depends(get_db)):
    post = await svc.load_post(db, post_id)
    await _apply(db, post, data)
    post.updated_at = func.now()  # tag-only edits don't trigger onupdate
    await db.commit()
    return await get_post(post_id, db)


@router.post("/posts/{post_id}/publish", response_model=AdminPostDetail)
async def publish_post(post_id: int, data: PublishIn = PublishIn(), db: AsyncSession = Depends(get_db)):
    post = await svc.load_post(db, post_id)
    if not post.content_md.strip():
        raise HTTPException(status_code=422, detail="Cannot publish an empty post")
    if data.published_at is not None:
        at = data.published_at
        post.published_at = at if at.tzinfo else at.replace(tzinfo=timezone.utc)
    elif post.published_at is None:  # BLG-05: first publish sets the date; re-publish keeps it
        post.published_at = datetime.now(timezone.utc)
    post.status = "published"
    await db.commit()
    return await get_post(post_id, db)


@router.post("/posts/{post_id}/unpublish", response_model=AdminPostDetail)
async def unpublish_post(post_id: int, db: AsyncSession = Depends(get_db)):
    post = await svc.load_post(db, post_id)
    post.status = "draft"
    await db.commit()
    return await get_post(post_id, db)


@router.delete("/posts/{post_id}")
async def delete_post(post_id: int, db: AsyncSession = Depends(get_db)):
    post = await svc.load_post(db, post_id)
    await db.delete(post)
    await db.commit()
    return {"status": "deleted"}


@router.post("/posts/{post_id}/comments", response_model=AdminCommentOut, status_code=201)
async def author_comment(post_id: int, data: AuthorCommentIn, db: AsyncSession = Depends(get_db)):
    """BLG-46: owner reply, auto-approved, shown with author badge."""
    post = await svc.load_post(db, post_id)
    c = BlogComment(post_id=post.id, body=data.body.strip(), status="approved", is_author=True)
    db.add(c)
    await db.commit()
    return await _admin_comment(db, c.id)


# ======================= tags =======================
@router.get("/tags", response_model=List[TagWithCount])
async def list_tags(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(BlogTag, func.count(blog_post_tags.c.post_id))
        .outerjoin(blog_post_tags, blog_post_tags.c.tag_id == BlogTag.id)
        .group_by(BlogTag.id)
        .order_by(BlogTag.name)
    )
    return [TagWithCount(id=t.id, slug=t.slug, name=t.name, post_count=n) for t, n in rows.all()]


async def _tag_slug_free(db: AsyncSession, slug: str, exclude_id: Optional[int] = None) -> None:
    q = select(BlogTag.id).where(BlogTag.slug == slug)
    if exclude_id is not None:
        q = q.where(BlogTag.id != exclude_id)
    if (await db.execute(q)).first():
        raise HTTPException(status_code=409, detail=f"Tag '{slug}' already exists")


def _tag_slug(data: TagIn) -> str:
    slug = data.slug or slugify(data.name, max_len=40)
    if not slug:
        raise HTTPException(status_code=422, detail="Tag name needs at least one latin letter or digit, or give a slug")
    return slug


@router.post("/tags", response_model=TagWithCount, status_code=201)
async def create_tag(data: TagIn, db: AsyncSession = Depends(get_db)):
    slug = _tag_slug(data)
    await _tag_slug_free(db, slug)
    tag = BlogTag(slug=slug, name=data.name)
    db.add(tag)
    await db.commit()
    return TagWithCount(id=tag.id, slug=tag.slug, name=tag.name, post_count=0)


async def _get_tag(db: AsyncSession, tag_id: int) -> BlogTag:
    tag = await db.get(BlogTag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


async def _tag_usage(db: AsyncSession, tag_id: int) -> int:
    return (await db.execute(
        select(func.count()).select_from(blog_post_tags).where(blog_post_tags.c.tag_id == tag_id)
    )).scalar_one()


@router.put("/tags/{tag_id}", response_model=TagWithCount)
async def update_tag(tag_id: int, data: TagIn, db: AsyncSession = Depends(get_db)):
    tag = await _get_tag(db, tag_id)
    slug = _tag_slug(data)
    await _tag_slug_free(db, slug, exclude_id=tag_id)
    tag.slug, tag.name = slug, data.name
    await db.commit()
    return TagWithCount(id=tag.id, slug=slug, name=data.name, post_count=await _tag_usage(db, tag_id))


@router.delete("/tags/{tag_id}")
async def delete_tag(tag_id: int, force: bool = False, db: AsyncSession = Depends(get_db)):
    """BLG-34: blocked while in use unless force=true (detaches from posts)."""
    tag = await _get_tag(db, tag_id)
    used = await _tag_usage(db, tag_id)
    if used and not force:
        raise HTTPException(status_code=409, detail=f"Tag is used by {used} post(s); pass force=true to detach")
    await db.delete(tag)
    await db.commit()
    return {"status": "deleted", "detached_from": used}


# ======================= comments =======================
async def _admin_comment(db: AsyncSession, comment_id: int) -> AdminCommentOut:
    c = (await db.execute(
        select(BlogComment).where(BlogComment.id == comment_id).execution_options(populate_existing=True)
    )).scalars().first()
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    return _to_admin_comment(c)


def _to_admin_comment(c: BlogComment) -> AdminCommentOut:
    return AdminCommentOut(
        **svc.to_comment(c).model_dump(), status=c.status,
        post_id=c.post_id, post_title=c.post.title, post_slug=c.post.slug,
    )


@router.get("/comments", response_model=List[AdminCommentOut])
async def list_comments(
    status: Optional[Literal["pending", "approved", "rejected"]] = "pending",
    post_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(BlogComment).order_by(BlogComment.created_at.desc(), BlogComment.id.desc())
    if status:
        q = q.where(BlogComment.status == status)
    if post_id is not None:
        q = q.where(BlogComment.post_id == post_id)
    return [_to_admin_comment(c) for c in (await db.execute(q)).scalars().all()]


@router.get("/comments/pending-count")
async def pending_count(db: AsyncSession = Depends(get_db)):
    n = (await db.execute(select(func.count()).where(BlogComment.status == "pending"))).scalar_one()
    return {"count": n}


@router.patch("/comments/{comment_id}", response_model=AdminCommentOut)
async def set_comment_status(comment_id: int, data: CommentStatusIn, db: AsyncSession = Depends(get_db)):
    c = await db.get(BlogComment, comment_id)
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    c.status = data.status
    await db.commit()
    return await _admin_comment(db, comment_id)


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: int, db: AsyncSession = Depends(get_db)):
    c = await db.get(BlogComment, comment_id)
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    await db.delete(c)
    await db.commit()
    return {"status": "deleted"}


# ======================= images =======================
# BLG-37: decide type from file signature, never from name/Content-Type header. No SVG.
SIGNATURES = [
    (b"\xff\xd8\xff", "jpg", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "png", "image/png"),
    (b"GIF87a", "gif", "image/gif"),
    (b"GIF89a", "gif", "image/gif"),
]


def sniff_image(head: bytes) -> Optional[tuple[str, str]]:
    for sig, ext, ctype in SIGNATURES:
        if head.startswith(sig):
            return ext, ctype
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp", "image/webp"
    return None


def _media_dir() -> Path:
    d = Path(settings.BLOG_MEDIA_DIR)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _image_url(filename: str) -> str:
    return f"{settings.BLOG_MEDIA_BASE_URL.rstrip('/')}/{filename}"


async def _usage_map(db: AsyncSession) -> list[tuple[str, str]]:
    rows = await db.execute(select(BlogPost.slug, BlogPost.content_md, BlogPost.cover_image_url))
    return [(slug, f"{md}\n{cover or ''}") for slug, md, cover in rows.all()]


def _to_image(img: BlogImage, usage: list[tuple[str, str]]) -> ImageOut:
    return ImageOut(
        id=img.id, filename=img.filename, url=_image_url(img.filename), content_type=img.content_type,
        size_bytes=img.size_bytes, created_at=img.created_at,
        used_in=[slug for slug, text in usage if img.filename in text],
    )


@router.post("/images", response_model=ImageOut, status_code=201)
async def upload_image(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    data = await file.read(settings.BLOG_MAX_IMAGE_BYTES + 1)
    if len(data) > settings.BLOG_MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail=f"Image larger than {settings.BLOG_MAX_IMAGE_BYTES // (1024 * 1024)} MB")
    kind = sniff_image(data[:16])
    if not kind:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG, WebP or GIF images are allowed")
    ext, ctype = kind
    filename = f"{uuid.uuid4().hex}.{ext}"
    (_media_dir() / filename).write_bytes(data)
    img = BlogImage(filename=filename, content_type=ctype, size_bytes=len(data))
    db.add(img)
    await db.commit()
    await db.refresh(img)
    return _to_image(img, [])


@router.get("/images", response_model=List[ImageOut])
async def list_images(db: AsyncSession = Depends(get_db)):
    imgs = (await db.execute(select(BlogImage).order_by(BlogImage.created_at.desc(), BlogImage.id.desc()))).scalars().all()
    usage = await _usage_map(db)
    return [_to_image(i, usage) for i in imgs]


@router.delete("/images/{image_id}")
async def delete_image(image_id: int, force: bool = False, db: AsyncSession = Depends(get_db)):
    img = await db.get(BlogImage, image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    used_in = _to_image(img, await _usage_map(db)).used_in
    if used_in and not force:
        raise HTTPException(status_code=409, detail=f"Image is used in: {', '.join(used_in)}; pass force=true")
    (_media_dir() / img.filename).unlink(missing_ok=True)
    await db.execute(delete(BlogImage).where(BlogImage.id == image_id))
    await db.commit()
    return {"status": "deleted"}
