from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.blog.text import SLUG_RE

MAX_CONTENT_CHARS = 100_000  # BLG-01: ≤100 KB
MAX_TAGS = 5


def _clean_slug(v: Optional[str]) -> Optional[str]:
    if v is None or v.strip() == "":
        return None
    v = v.strip().lower()
    if not SLUG_RE.match(v):
        raise ValueError("slug must be lowercase letters/digits separated by single hyphens")
    return v


# ---------- tags ----------
class TagIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    slug: Optional[str] = Field(default=None, max_length=40)

    @field_validator("name")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name must not be blank")
        return v

    _slug = field_validator("slug")(classmethod(lambda cls, v: _clean_slug(v)))


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    slug: str
    name: str


class TagWithCount(TagOut):
    id: int
    post_count: int


# ---------- posts ----------
class PostIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    slug: Optional[str] = Field(default=None, max_length=80)
    excerpt: Optional[str] = Field(default=None, max_length=300)
    content_md: str = Field(default="", max_length=MAX_CONTENT_CHARS)
    cover_image_url: Optional[str] = Field(default=None, max_length=500)
    tags: List[str] = Field(default_factory=list, max_length=MAX_TAGS)  # tag slugs
    comments_enabled: bool = True

    @field_validator("title")
    @classmethod
    def _title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title must not be blank")
        return v

    @field_validator("excerpt", "cover_image_url")
    @classmethod
    def _blank_to_none(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() or None if v is not None else None

    @field_validator("cover_image_url")
    @classmethod
    def _http_only(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.startswith(("https://", "http://")):
            raise ValueError("cover_image_url must be an http(s) URL")
        return v

    @field_validator("tags")
    @classmethod
    def _dedupe(cls, v: List[str]) -> List[str]:
        return list(dict.fromkeys(t.strip().lower() for t in v if t.strip()))

    _slug = field_validator("slug")(classmethod(lambda cls, v: _clean_slug(v)))


class PublishIn(BaseModel):
    """Optional scheduled time; omitted = now (or keep the original first-publish time)."""
    published_at: Optional[datetime] = None


class PostSummary(BaseModel):
    id: int
    title: str
    slug: str
    excerpt: str
    cover_image_url: Optional[str]
    tags: List[TagOut]
    published_at: Optional[datetime]
    updated_at: datetime
    reading_time_min: int


class PostDetail(PostSummary):
    content_md: str
    comments_enabled: bool
    related: List[PostSummary] = []


class AdminPostSummary(PostSummary):
    status: Literal["draft", "published"]
    created_at: datetime
    pending_comments: int = 0


class AdminPostDetail(AdminPostSummary):
    content_md: str
    comments_enabled: bool
    custom_excerpt: Optional[str]  # what the admin typed; `excerpt` is the effective one


class PostPage(BaseModel):
    items: List[PostSummary]
    page: int
    per_page: int
    total: int
    pages: int


# ---------- comments ----------
class CommentIn(BaseModel):
    body: str = Field(max_length=2000)
    display_name: Optional[str] = Field(default=None, max_length=40)
    website: Optional[str] = None  # honeypot: humans never see/fill it (BLG-42)
    form_ms: Optional[int] = None  # ms between form render and submit (BLG-42)

    @field_validator("body")
    @classmethod
    def _body(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("comment must be at least 2 characters")
        return v

    @field_validator("display_name")
    @classmethod
    def _name(cls, v: Optional[str]) -> Optional[str]:
        v = (v or "").strip()
        return v or None


class AuthorCommentIn(BaseModel):
    body: str = Field(min_length=2, max_length=2000)


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    display_name: str
    body: str
    is_author: bool
    created_at: datetime


class AdminCommentOut(CommentOut):
    status: Literal["pending", "approved", "rejected"]
    post_id: int
    post_title: str
    post_slug: str


class CommentStatusIn(BaseModel):
    status: Literal["pending", "approved", "rejected"]


# ---------- images ----------
class ImageOut(BaseModel):
    id: int
    filename: str
    url: str
    content_type: str
    size_bytes: int
    created_at: datetime
    used_in: List[str] = []  # post slugs referencing it
