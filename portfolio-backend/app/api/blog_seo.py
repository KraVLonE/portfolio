"""Server-rendered blog pages for crawlers/link previews, plus RSS and sitemap (BLG-60–63).

Blog nginx proxies `/` and `/<slug>` here. We fetch the built SPA shell, inject per-page
<head> tags (title, description, canonical, robots, OpenGraph/Twitter, JSON-LD) and a
visually hidden copy of the content into #root. React replaces #root on load.
"""
import json
import time
from datetime import datetime, timezone
from email.utils import format_datetime
from html import escape
from typing import Optional
from xml.sax.saxutils import escape as xml_escape

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.blog import post_detail, post_page, public_tags
from app.api.seo import DESC_RE, ROOT_RE, TITLE_RE
from app.blog import service as svc
from app.blog.text import make_excerpt, render_markdown
from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models.blog import BlogPost, BlogSlugRedirect, BlogTag

router = APIRouter()

CACHE_TTL = 60
_cache: dict[str, tuple[float, tuple[int, dict]]] = {}
_http = httpx.AsyncClient(timeout=2.0)

BLOG_TITLE = "KraVLonE Blog"
BLOG_DESC = "Notes on GenAI, backend engineering and DevOps by B Sai Sannidh Rayalu (KraVLonE)."
AUTHOR = "B Sai Sannidh Rayalu"
SR_ONLY = ('position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;'
           'clip:rect(0,0,0,0);white-space:nowrap;border:0')


def _e(v) -> str:
    return escape(str(v or ""), quote=True)


def _site() -> str:
    return settings.BLOG_SITE_URL.rstrip("/")


def _iso(dt: Optional[datetime]) -> str:
    return dt.astimezone(timezone.utc).isoformat() if dt else ""


def json_ld(data: dict) -> str:
    """JSON for a <script> block. `<` is escaped so content can never close the tag."""
    return json.dumps(data, ensure_ascii=False).replace("<", "\\u003c")


def _head(*, canonical: str, title: str, desc: str, robots: str, og_type: str,
          image: Optional[str], extra: str = "") -> str:
    image = image or f"{settings.SITE_URL.rstrip('/')}/og-image.png"
    return (
        f'<link rel="canonical" href="{_e(canonical)}" />'
        f'<meta name="robots" content="{_e(robots)}" />'
        f'<meta property="og:site_name" content="{_e(BLOG_TITLE)}" />'
        f'<meta property="og:type" content="{_e(og_type)}" />'
        f'<meta property="og:url" content="{_e(canonical)}" />'
        f'<meta property="og:title" content="{_e(title)}" />'
        f'<meta property="og:description" content="{_e(desc)}" />'
        f'<meta property="og:image" content="{_e(image)}" />'
        f'<meta name="twitter:card" content="summary_large_image" />'
        f'<meta name="twitter:title" content="{_e(title)}" />'
        f'<meta name="twitter:description" content="{_e(desc)}" />'
        f'<meta name="twitter:image" content="{_e(image)}" />'
        + extra
    )


def _post_link(p) -> str:  # BlogPost or PostSummary
    return f"{_site()}/{p.slug}"


def initial_data(entries: dict) -> str:
    """Data the SPA reads on boot (keys match web-blog/src/cache.ts) so it renders without a loading flash."""
    return f'<script id="blog-data" type="application/json">{json_ld(entries)}</script>'


async def _build_index(db: AsyncSession, tag: Optional[str], page: int) -> tuple[int, dict]:
    tag_obj = None
    if tag:
        tag_obj = (await db.execute(select(BlogTag).where(BlogTag.slug == tag.lower()))).scalars().first()
    data = await post_page(db, tag, page)
    tags = await public_tags(db)
    posts = data.items

    title = f"#{tag_obj.slug} posts | {BLOG_TITLE}" if tag_obj else (BLOG_TITLE if page == 1 else f"Page {page} | {BLOG_TITLE}")
    canonical = f"{_site()}/" + (f"?page={page}" if page > 1 and not tag else "")
    # BLG-63: tag-filtered lists duplicate the main list -> keep out of the index, but follow links.
    robots = "noindex, follow" if tag else "index, follow, max-image-preview:large"
    items = "".join(
        f'<li><article><h2><a href="{_e(_post_link(p))}">{_e(p.title)}</a></h2>'
        f'<p><time datetime="{_iso(p.published_at)}">{p.published_at:%b %d, %Y}</time></p>'
        f"<p>{_e(p.excerpt)}</p></article></li>"
        for p in posts
    )
    body = f'<main style="{SR_ONLY}"><h1>{_e(BLOG_TITLE)}</h1><p>{_e(BLOG_DESC)}</p><ul>{items}</ul></main>'
    ld = {
        "@context": "https://schema.org", "@type": "Blog", "@id": f"{_site()}/#blog", "url": f"{_site()}/",
        "name": BLOG_TITLE, "description": BLOG_DESC,
        "author": {"@type": "Person", "name": AUTHOR, "url": settings.SITE_URL},
    }
    boot = initial_data({f"posts|{page}|{tag or ''}": data.model_dump(mode="json"), "tags": tags})
    head = _head(canonical=canonical, title=title, desc=BLOG_DESC, robots=robots, og_type="website", image=None,
                 extra=f'<script type="application/ld+json">{json_ld(ld)}</script>{boot}')
    return 200, {"title": title, "description": BLOG_DESC, "head": head, "body": body}


def _not_found() -> tuple[int, dict]:
    title = f"Post not found | {BLOG_TITLE}"
    head = '<meta name="robots" content="noindex" />'
    return 404, {"title": title, "description": BLOG_DESC, "head": head, "body": ""}


async def _build_post(db: AsyncSession, slug: str) -> tuple[int, dict] | RedirectResponse:
    post = (await db.execute(svc.visible_posts().where(BlogPost.slug == slug))).scalars().first()
    if not post:
        target = (await db.execute(
            select(BlogPost.slug).join(BlogSlugRedirect, BlogSlugRedirect.post_id == BlogPost.id)
            .where(BlogSlugRedirect.old_slug == slug, svc.visible())
        )).scalar_one_or_none()
        if target:
            return RedirectResponse(f"/{target}", status_code=301)  # BLG-04
        return _not_found()  # drafts too (BLG-03)

    desc = post.excerpt or make_excerpt(post.content_md)
    url = _post_link(post)
    title = f"{post.title} | {BLOG_TITLE}"
    ld = {
        "@context": "https://schema.org", "@type": "BlogPosting",
        "mainEntityOfPage": {"@type": "WebPage", "@id": url}, "url": url,
        "headline": post.title, "description": desc,
        "datePublished": _iso(post.published_at), "dateModified": _iso(post.updated_at),
        "keywords": [t.name for t in post.tags],
        "author": {"@type": "Person", "name": AUTHOR, "url": settings.SITE_URL},
        "isPartOf": {"@id": f"{_site()}/#blog"},
        **({"image": post.cover_image_url} if post.cover_image_url else {}),
    }
    extra = (
        f'<meta property="article:published_time" content="{_iso(post.published_at)}" />'
        f'<meta property="article:modified_time" content="{_iso(post.updated_at)}" />'
        + "".join(f'<meta property="article:tag" content="{_e(t.name)}" />' for t in post.tags)
        + f'<script type="application/ld+json">{json_ld(ld)}</script>'
        + initial_data({f"post|{post.slug}": (await post_detail(db, post)).model_dump(mode="json")})
    )
    head = _head(canonical=url, title=title, desc=desc, robots="index, follow, max-image-preview:large",
                 og_type="article", image=post.cover_image_url, extra=extra)
    body = (
        f'<main style="{SR_ONLY}"><article><h1>{_e(post.title)}</h1>'
        f'<p><time datetime="{_iso(post.published_at)}">{post.published_at:%b %d, %Y}</time> · {_e(AUTHOR)}</p>'
        f"{render_markdown(post.content_md)}</article></main>"
    )
    return 200, {"title": title, "description": desc, "head": head, "body": body}


def _inject(shell: str, page: dict) -> str:
    html = ROOT_RE.sub(lambda _: f'<div id="root">{page["body"]}</div>', shell, count=1)
    html = TITLE_RE.sub(lambda _: f"<title>{_e(page['title'])}</title>", html, count=1)
    html = DESC_RE.sub(lambda m: f"{m.group(1)}{_e(page['description'])}{m.group(2)}", html, count=1)
    return html.replace("</head>", page["head"] + "</head>", 1)


@router.get("/seo/blog", response_class=HTMLResponse, include_in_schema=False)
@limiter.exempt  # crawlers must never get a 429; output is cached
async def render_blog(
    request: Request,
    path: str = "/",
    tag: Optional[str] = None,
    page: int = Query(1, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    slug = path.strip("/")
    if "/" in slug or len(slug) > 80:
        status, data = _not_found()
    else:
        key = f"{slug}|{tag}|{page}"
        hit = _cache.get(key)
        if hit and hit[0] > time.monotonic():
            status, data = hit[1]
        else:
            built = await (_build_post(db, slug) if slug else _build_index(db, tag, page))
            if isinstance(built, RedirectResponse):
                return built
            status, data = built
            _cache[key] = (time.monotonic() + CACHE_TTL, (status, data))

    try:
        r = await _http.get(settings.BLOG_SPA_TEMPLATE_URL)
        r.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(status_code=502)  # nginx falls back to the static shell
    return HTMLResponse(_inject(r.text, data), status_code=status, headers={"Cache-Control": "no-cache"})


# ---------------- feeds ----------------
def _rfc822(dt: datetime) -> str:
    return format_datetime(dt.astimezone(timezone.utc), usegmt=True)


@router.get("/blog/rss.xml", include_in_schema=False)
@limiter.exempt
async def rss(db: AsyncSession = Depends(get_db)):
    """BLG-62: RSS 2.0, latest 20 posts, excerpt only."""
    posts = (await db.execute(
        svc.visible_posts().order_by(BlogPost.published_at.desc(), BlogPost.id.desc()).limit(20)
    )).scalars().all()
    site = _site()
    items = "".join(
        "<item>"
        f"<title>{xml_escape(p.title)}</title>"
        f"<link>{xml_escape(_post_link(p))}</link>"
        f'<guid isPermaLink="true">{xml_escape(_post_link(p))}</guid>'
        f"<pubDate>{_rfc822(p.published_at)}</pubDate>"
        f"<description>{xml_escape(p.excerpt or make_excerpt(p.content_md))}</description>"
        + "".join(f"<category>{xml_escape(t.name)}</category>" for t in p.tags)
        + "</item>"
        for p in posts
    )
    last = f"<lastBuildDate>{_rfc822(posts[0].published_at)}</lastBuildDate>" if posts else ""
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>'
        f"<title>{xml_escape(BLOG_TITLE)}</title><link>{site}/</link>"
        f"<description>{xml_escape(BLOG_DESC)}</description><language>en</language>"
        f'<atom:link href="{site}/rss.xml" rel="self" type="application/rss+xml" />'
        f"{last}{items}</channel></rss>"
    )
    return Response(xml, media_type="application/rss+xml; charset=utf-8", headers={"Cache-Control": "public, max-age=600"})


@router.get("/blog/sitemap.xml", include_in_schema=False)
@limiter.exempt
async def sitemap(db: AsyncSession = Depends(get_db)):
    """BLG-61: blog index + every visible post with lastmod."""
    posts = (await db.execute(svc.visible_posts().order_by(BlogPost.published_at.desc()))).scalars().all()
    site = _site()
    newest = max((p.updated_at for p in posts), default=None)
    urls = [(f"{site}/", newest)] + [(_post_link(p), p.updated_at) for p in posts]
    body = "".join(
        f"<url><loc>{xml_escape(loc)}</loc>" + (f"<lastmod>{mod.date().isoformat()}</lastmod>" if mod else "") + "</url>"
        for loc, mod in urls
    )
    xml = ('<?xml version="1.0" encoding="UTF-8"?>'
           f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}</urlset>')
    return Response(xml, media_type="application/xml", headers={"Cache-Control": "public, max-age=600"})
