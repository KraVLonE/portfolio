"""Server-side HTML injection for SEO.

nginx proxies `/` here. We fetch the built SPA shell (index.html) from the
frontend container, inject DB content into <div id="root"> plus per-page
title/description, and return it. React's createRoot() replaces the injected
markup on load, so users see the normal app; crawlers see real content.

DB-derived markup is cached for CACHE_TTL seconds, so admin edits show up
within that window with no rebuild. The shell is fetched on every request so
a frontend redeploy (new asset hashes) is picked up immediately.
"""
import re
import time
from html import escape
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models.domain import Achievement, Experience, Profile, Project, Skill

router = APIRouter()

CACHE_TTL = 60
_cache: dict[str, tuple[float, dict]] = {}
_http = httpx.AsyncClient(timeout=2.0)

ROOT_RE = re.compile(r'<div id="root">\s*</div>')
TITLE_RE = re.compile(r"<title>.*?</title>", re.S)
DESC_RE = re.compile(r'(<meta name="description" content=")[^"]*(")')


def _e(v) -> str:
    return escape(str(v or ""), quote=True)


def _url(v) -> Optional[str]:
    return v if isinstance(v, str) and v.startswith(("https://", "http://")) else None


def _a(href, text) -> str:
    u = _url(href)
    return f'<a href="{_e(u)}" rel="noopener">{_e(text)}</a>' if u else ""


def _ul(items) -> str:
    items = [i for i in (items or []) if i]
    return "<ul>" + "".join(f"<li>{_e(i)}</li>" for i in items) + "</ul>" if items else ""


def _period(start, end) -> str:
    fmt = lambda d: d.strftime("%b %Y") if d else ""
    return f"{fmt(start)} – {fmt(end) if end else 'Present'}" if start else ""


async def _build_home(db: AsyncSession) -> dict:
    profile = (await db.execute(select(Profile).where(Profile.id == 1))).scalars().first()
    if not profile:
        raise HTTPException(status_code=404)
    exps = (await db.execute(select(Experience).order_by(Experience.order.asc(), Experience.start_date.desc()))).scalars().all()
    projs = (await db.execute(select(Project).order_by(Project.order.asc()))).scalars().all()
    skills = (await db.execute(select(Skill).order_by(Skill.category, Skill.order.asc()))).scalars().all()
    achs = (await db.execute(select(Achievement).order_by(Achievement.order.asc()))).scalars().all()

    p = profile
    parts = [
        # Visually hidden (sr-only pattern): readable by crawlers/screen readers, never painted,
        # so there's no flash before React replaces #root with the real UI.
        '<main style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">',
        f"<header><h1>{_e(p.name)}</h1><p><strong>{_e(p.title)}</strong> · {_e(p.location)}</p>",
        f"<p>{_e(p.tagline)}</p><p>{_e(p.bio_short)}</p>",
        "<p>" + " · ".join(x for x in [_a(p.github_url, "GitHub"), _a(p.linkedin_url, "LinkedIn"), _a(p.resume_url, "Resume")] if x) + "</p></header>",
    ]

    if exps:
        parts.append('<section id="experience"><h2>Experience</h2>')
        for x in exps:
            parts.append(
                f"<article><h3>{_e(x.role)} — {_e(x.company)}</h3>"
                f"<p>{_e(_period(x.start_date, x.end_date))}{' · ' + _e(x.location) if x.location else ''}</p>"
                f"{_ul(x.pointers)}<p>{_e(', '.join(x.tech_stack or []))}</p></article>"
            )
        parts.append("</section>")

    if projs:
        parts.append('<section id="projects"><h2>Projects</h2>')
        for x in projs:
            links = x.links or {}
            link_html = " · ".join(l for l in [_a(links.get("repo"), "Source"), _a(links.get("live_demo"), "Live demo")] if l)
            parts.append(
                f"<article><h3>{_e(x.title)}</h3><p>{_e(x.one_liner)}</p>{_ul(x.pointers)}"
                f"{'<p>' + _e(x.outcome) + '</p>' if x.outcome else ''}"
                f"<p>{_e(', '.join(x.tech_stack or []))}</p>{'<p>' + link_html + '</p>' if link_html else ''}</article>"
            )
        parts.append("</section>")

    if skills:
        by_cat: dict[str, list[str]] = {}
        for s in skills:
            by_cat.setdefault(s.category, []).append(s.name)
        parts.append('<section id="skills"><h2>Skills</h2>')
        parts += [f"<h3>{_e(c)}</h3><p>{_e(', '.join(n))}</p>" for c, n in by_cat.items()]
        parts.append("</section>")

    if achs:
        parts.append('<section id="achievements"><h2>Achievements</h2><ul>')
        parts += [f"<li><strong>{_e(a.title)}</strong> — {_e(a.description)}</li>" for a in achs]
        parts.append("</ul></section>")

    parts.append("</main>")
    return {
        "title": f"{p.name} (KraVLonE) | {p.title}",
        "description": p.tagline,
        "body": "".join(parts),
    }


PAGES = {"/": _build_home}


@router.get("/seo/render", response_class=HTMLResponse, include_in_schema=False)
@limiter.exempt  # serves the homepage; crawlers must never get a 429 (output is cached anyway)
async def render(request: Request, path: str = "/", db: AsyncSession = Depends(get_db)):
    builder = PAGES.get(path)
    if not builder:
        raise HTTPException(status_code=404)

    hit = _cache.get(path)
    if hit and hit[0] > time.monotonic():
        page = hit[1]
    else:
        page = await builder(db)
        _cache[path] = (time.monotonic() + CACHE_TTL, page)

    try:
        r = await _http.get(settings.SPA_TEMPLATE_URL)
        r.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(status_code=502)  # nginx falls back to static index.html
    shell = r.text

    html = ROOT_RE.sub(lambda _: f'<div id="root">{page["body"]}</div>', shell, count=1)
    html = TITLE_RE.sub(lambda _: f"<title>{_e(page['title'])}</title>", html, count=1)
    html = DESC_RE.sub(lambda m: f"{m.group(1)}{_e(page['description'])}{m.group(2)}", html, count=1)
    return HTMLResponse(html, headers={"Cache-Control": "no-cache"})
