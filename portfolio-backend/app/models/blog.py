"""Blog tables (docs/blog-requirements.md §4, §6). Timestamps are timezone-aware UTC (A8)."""
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean, CheckConstraint, Column, ForeignKey, Index, Integer, String, Table, Text, TIMESTAMP, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

POST_STATUSES = ("draft", "published")
COMMENT_STATUSES = ("pending", "approved", "rejected")

blog_post_tags = Table(
    "blog_post_tags",
    Base.metadata,
    Column("post_id", ForeignKey("blog_posts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("blog_tags.id", ondelete="CASCADE"), primary_key=True),
)


class BlogTag(Base):
    __tablename__ = "blog_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(40), nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())


class BlogPost(Base):
    __tablename__ = "blog_posts"
    __table_args__ = (
        CheckConstraint(f"status IN {POST_STATUSES}", name="ck_blog_posts_status"),
        Index("ix_blog_posts_visible", "status", "published_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    excerpt: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    content_md: Mapped[str] = mapped_column(Text, nullable=False, default="")
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="draft", server_default="draft")
    comments_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    published_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    tags: Mapped[List[BlogTag]] = relationship(secondary=blog_post_tags, lazy="selectin", order_by=BlogTag.name)


class BlogSlugRedirect(Base):
    """Old slug of a once-published post -> post (BLG-04)."""
    __tablename__ = "blog_slug_redirects"

    old_slug: Mapped[str] = mapped_column(String(80), primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("blog_posts.id", ondelete="CASCADE"), nullable=False)


class BlogComment(Base):
    __tablename__ = "blog_comments"
    __table_args__ = (
        CheckConstraint(f"status IN {COMMENT_STATUSES}", name="ck_blog_comments_status"),
        Index("ix_blog_comments_post_status", "post_id", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("blog_posts.id", ondelete="CASCADE"), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="pending", server_default="pending")
    is_author: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    ip_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # HMAC-SHA256, never raw IP (BLG-43)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    post: Mapped[BlogPost] = relationship(lazy="joined")


class BlogImage(Base):
    __tablename__ = "blog_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    filename: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)  # <uuid>.<ext> (BLG-37)
    content_type: Mapped[str] = mapped_column(String(20), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
