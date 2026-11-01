"""Queries and serialisation shared by the public and admin blog routers."""
import hashlib
import hmac
from typing import Iterable, List, Optional, Sequence

from fastapi import HTTPException
from sqlalchemy import Select, and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.blog.schemas import AdminPostDetail, AdminPostSummary, CommentOut, PostSummary, TagOut
from app.blog.text import make_excerpt, reading_time_min, slugify
from app.core.config import settings
from app.models.blog import BlogComment, BlogPost, BlogSlugRedirect, BlogTag, blog_post_tags

AUTHOR_NAME = "kravlone"
ANON_NAME = "anonymous"
RESERVED_NAMES = {AUTHOR_NAME, "admin", "author", "moderator"}


def visible():
    """BLG-03: published and publish time reached."""
    return and_(BlogPost.status == "published", BlogPost.published_at <= func.now())


def visible_posts() -> Select:
    return select(BlogPost).where(visible())


# ---------- serialisation ----------
def _summary_fields(p: BlogPost) -> dict:
    return dict(
        id=p.id,
        title=p.title,
        slug=p.slug,
        excerpt=p.excerpt or make_excerpt(p.content_md),
        cover_image_url=p.cover_image_url,
        tags=[TagOut.model_validate(t) for t in p.tags],
        published_at=p.published_at,
        updated_at=p.updated_at,
        reading_time_min=reading_time_min(p.content_md),
    )


def to_summary(p: BlogPost) -> PostSummary:
    return PostSummary(**_summary_fields(p))


def to_admin_summary(p: BlogPost, pending: int = 0) -> AdminPostSummary:
    return AdminPostSummary(**_summary_fields(p), status=p.status, created_at=p.created_at, pending_comments=pending)


def to_admin_detail(p: BlogPost, pending: int = 0) -> AdminPostDetail:
    return AdminPostDetail(
        **to_admin_summary(p, pending).model_dump(exclude={"tags"}),
        tags=[TagOut.model_validate(t) for t in p.tags],
        content_md=p.content_md,
        comments_enabled=p.comments_enabled,
        custom_excerpt=p.excerpt,
    )


def to_comment(c: BlogComment) -> CommentOut:
    name = AUTHOR_NAME if c.is_author else (c.display_name or ANON_NAME)
    return CommentOut(id=c.id, display_name=name, body=c.body, is_author=c.is_author, created_at=c.created_at)


# ---------- loading ----------
async def load_post(db: AsyncSession, post_id: int) -> BlogPost:
    post = (
        await db.execute(
            select(BlogPost).where(BlogPost.id == post_id)
            .options(selectinload(BlogPost.tags)).execution_options(populate_existing=True)
        )
    ).scalars().first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


async def pending_counts(db: AsyncSession, post_ids: Iterable[int]) -> dict[int, int]:
    ids = list(post_ids)
    if not ids:
        return {}
    rows = await db.execute(
        select(BlogComment.post_id, func.count())
        .where(BlogComment.post_id.in_(ids), BlogComment.status == "pending")
        .group_by(BlogComment.post_id)
    )
    return dict(rows.all())


async def related_posts(db: AsyncSession, post: BlogPost, limit: int = 3) -> List[BlogPost]:
    """BLG-13: visible posts sharing the most tags, then newest. Only posts with ≥1 shared tag."""
    tag_ids = [t.id for t in post.tags]
    if not tag_ids:
        return []
    shared = func.count(blog_post_tags.c.tag_id)
    q = (
        select(BlogPost)
        .join(blog_post_tags, blog_post_tags.c.post_id == BlogPost.id)
        .where(visible(), BlogPost.id != post.id, blog_post_tags.c.tag_id.in_(tag_ids))
        .group_by(BlogPost.id)
        .order_by(shared.desc(), BlogPost.published_at.desc())
        .limit(limit)
    )
    return list((await db.execute(q)).scalars().all())


# ---------- writes ----------
async def resolve_tags(db: AsyncSession, slugs: Sequence[str]) -> List[BlogTag]:
    if not slugs:
        return []
    found = {t.slug: t for t in (await db.execute(select(BlogTag).where(BlogTag.slug.in_(slugs)))).scalars()}
    missing = [s for s in slugs if s not in found]
    if missing:
        raise HTTPException(status_code=422, detail=f"Unknown tags: {', '.join(missing)}")
    return [found[s] for s in slugs]


async def _slug_taken(db: AsyncSession, slug: str, exclude_id: Optional[int]) -> bool:
    q = select(BlogPost.id).where(BlogPost.slug == slug)
    if exclude_id is not None:
        q = q.where(BlogPost.id != exclude_id)
    return (await db.execute(q)).first() is not None


async def choose_slug(db: AsyncSession, requested: Optional[str], title: str, exclude_id: Optional[int]) -> str:
    """Explicit slug must be free (409). Auto slug from title gets -2, -3… suffix."""
    if requested:
        if await _slug_taken(db, requested, exclude_id):
            raise HTTPException(status_code=409, detail=f"Slug '{requested}' is already used by another post")
        return requested
    base = slugify(title) or "post"
    slug, n = base, 2
    while await _slug_taken(db, slug, exclude_id):
        suffix = f"-{n}"
        slug = base[: 80 - len(suffix)].rstrip("-") + suffix
        n += 1
    return slug


async def claim_slug(db: AsyncSession, post: BlogPost, new_slug: str) -> None:
    """Assign slug; keep old one as redirect if the post was ever public (BLG-04)."""
    old = post.slug
    if old == new_slug:
        return
    # A slug being (re)claimed must not keep redirecting elsewhere.
    await db.execute(delete(BlogSlugRedirect).where(BlogSlugRedirect.old_slug == new_slug))
    if old and post.published_at is not None:
        await db.merge(BlogSlugRedirect(old_slug=old, post_id=post.id))
    post.slug = new_slug


def ip_hash(ip: str) -> str:
    """BLG-43: keyed hash so raw IPs are never stored and can't be brute-forced without the key."""
    return hmac.new(settings.SECRET_KEY.encode(), ip.encode(), hashlib.sha256).hexdigest()
