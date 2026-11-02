"""Public blog API (BLG-03, 10–13, 40–45)."""
import math
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.blog import service as svc
from app.blog.schemas import CommentIn, CommentOut, PostDetail, PostPage, TagOut
from app.blog.text import count_links
from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import get_real_ip, limiter
from app.models.blog import BlogComment, BlogPost, BlogSlugRedirect, BlogTag, blog_post_tags

router = APIRouter(prefix="/blog", tags=["blog"])

MIN_FORM_MS = 3000  # BLG-42: faster than this is a bot
MAX_LINKS = 2


async def post_page(db: AsyncSession, tag: Optional[str], page: int, per_page: int = 10) -> PostPage:
    """Shared by the API and the SEO renderer (which embeds it so the SPA starts with data)."""
    q = svc.visible_posts()
    if tag:
        q = q.where(BlogPost.tags.any(BlogTag.slug == tag.lower()))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    posts = (
        await db.execute(
            q.order_by(BlogPost.published_at.desc(), BlogPost.id.desc()).offset((page - 1) * per_page).limit(per_page)
        )
    ).scalars().all()
    return PostPage(
        items=[svc.to_summary(p) for p in posts],
        page=page, per_page=per_page, total=total, pages=max(1, math.ceil(total / per_page)),
    )


@router.get("/posts", response_model=PostPage)
async def list_posts(
    tag: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    return await post_page(db, tag, page, per_page)


async def _visible_post(db: AsyncSession, slug: str) -> Optional[BlogPost]:
    return (await db.execute(svc.visible_posts().where(BlogPost.slug == slug))).scalars().first()


@router.get("/posts/{slug}", response_model=PostDetail)
async def get_post(slug: str, db: AsyncSession = Depends(get_db)):
    post = await _visible_post(db, slug)
    if not post:
        # BLG-04: old slug -> 301 to the current one (only if that post is visible).
        target = (
            await db.execute(
                select(BlogPost.slug)
                .join(BlogSlugRedirect, BlogSlugRedirect.post_id == BlogPost.id)
                .where(BlogSlugRedirect.old_slug == slug, svc.visible())
            )
        ).scalar_one_or_none()
        if target:
            return RedirectResponse(f"{settings.API_V1_STR}/blog/posts/{target}", status_code=301)
        raise HTTPException(status_code=404, detail="Post not found")  # drafts too: don't leak existence
    return await post_detail(db, post)


async def post_detail(db: AsyncSession, post: BlogPost) -> PostDetail:
    related = await svc.related_posts(db, post)
    return PostDetail(
        **svc.to_summary(post).model_dump(exclude={"tags"}),
        tags=[TagOut.model_validate(t) for t in post.tags],
        content_md=post.content_md,
        comments_enabled=post.comments_enabled,
        related=[svc.to_summary(r) for r in related],
    )


@router.get("/tags", response_model=List[dict])
async def list_tags(db: AsyncSession = Depends(get_db)):
    """Tags that have at least one visible post, with counts."""
    return await public_tags(db)


async def public_tags(db: AsyncSession) -> list[dict]:
    rows = await db.execute(
        select(BlogTag.slug, BlogTag.name, func.count(BlogPost.id))
        .join(blog_post_tags, blog_post_tags.c.tag_id == BlogTag.id)
        .join(BlogPost, BlogPost.id == blog_post_tags.c.post_id)
        .where(svc.visible())
        .group_by(BlogTag.id)
        .order_by(func.count(BlogPost.id).desc(), BlogTag.name)
    )
    return [{"slug": s, "name": n, "post_count": c} for s, n, c in rows.all()]


@router.get("/posts/{slug}/comments", response_model=List[CommentOut])
async def list_comments(slug: str, db: AsyncSession = Depends(get_db)):
    post = await _visible_post(db, slug)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comments = (
        await db.execute(
            select(BlogComment)
            .where(BlogComment.post_id == post.id, BlogComment.status == "approved")
            .order_by(BlogComment.created_at.asc(), BlogComment.id.asc())
        )
    ).scalars().all()
    return [svc.to_comment(c) for c in comments]


@router.post("/posts/{slug}/comments", status_code=202)
@limiter.limit("3/minute;20/day")
async def create_comment(request: Request, slug: str, body: CommentIn, db: AsyncSession = Depends(get_db)):
    post = await _visible_post(db, slug)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if not post.comments_enabled:
        raise HTTPException(status_code=403, detail="Comments are closed for this post")

    accepted = JSONResponse({"status": "pending", "message": "Comment submitted — visible after review."}, 202)
    # Bots: pretend success so they don't adapt; store nothing.
    if body.website or (body.form_ms is not None and body.form_ms < MIN_FORM_MS):
        return accepted

    if body.display_name and body.display_name.lower() in svc.RESERVED_NAMES:
        raise HTTPException(status_code=422, detail="That display name is reserved")
    if count_links(body.body) > MAX_LINKS:
        raise HTTPException(status_code=422, detail=f"At most {MAX_LINKS} links per comment")

    db.add(BlogComment(
        post_id=post.id,
        display_name=body.display_name,
        body=body.body,
        status="pending",
        ip_hash=svc.ip_hash(get_real_ip(request)),
    ))
    await db.commit()
    return accepted
