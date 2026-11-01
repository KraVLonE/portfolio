# Blog System — Requirements (v0.2)

Status: **approved** (v0.2: images hosted on EC2, blog on `blog.kravlone.xyz`) · Owner: kravlone · Date: 2026-11-02

Requirement IDs (`BLG-xx`) are referenced by tests and commits. **Nothing outside this doc gets built without updating the doc first.**

---

## 1. Goal

Let the owner write Markdown blog posts in the admin panel and publish them on `blog.kravlone.xyz`, in the existing cyberpunk theme, discoverable by search engines, with lightweight reader comments.

## 2. Scope

| In scope (v1) | Out of scope (v1) |
|---|---|
| Post CRUD in admin (draft/publish) | Image editing/resizing/CDN |
| Image upload, stored on the EC2 host | |
| Markdown authoring + live preview | WYSIWYG editor |
| Public blog list + post page | Multi-author, user accounts |
| Topic tags + filtering | Full-text search (revisit at >30 posts) |
| Comments with moderation | Comment replies/threads, reactions, likes |
| SEO (server-rendered HTML, sitemap, OG tags), RSS | Newsletter / email notifications |
| CLI-mode `~/blog` directory | Analytics/view counts |
| Test suite + shared design tokens | Redesign of existing sections |

## 3. Users

- **Owner (admin)** — writes/edits posts, moderates comments. Authenticated via existing `x-admin-token` mechanism.
- **Visitor** — reads posts, filters by tag, leaves a comment. Unauthenticated.
- **Crawler / link preview bot** — needs real HTML + meta tags.

## 4. Functional requirements

### 4.1 Posts (data)

| ID | Requirement |
|---|---|
| BLG-01 | A post has: `title` (≤120), `slug` (unique, URL-safe, auto-generated from title, editable), `excerpt` (≤300, optional; auto = first ~160 chars of plain text), `content_md` (Markdown, ≤100 KB), `cover_image_url` (optional), `tags` (0–5), `status` (`draft` \| `published`), `published_at`, `created_at`, `updated_at`. |
| BLG-02 | `reading_time_min` is computed (words / 200, min 1), not stored by hand. |
| BLG-03 | Only `published` posts with `published_at ≤ now` are visible publicly. Drafts are admin-only (404 publicly, not 403 — don't leak existence). |
| BLG-04 | Changing a published post's slug keeps the old slug as a redirect (301) so shared links don't break. |
| BLG-05 | `published_at` is set on first publish; editing later updates `updated_at` only ("Updated on …" shown if they differ by >1 day). |

### 4.2 Categorization (decision: **topic tags, chronological order**)

| ID | Requirement |
|---|---|
| BLG-10 | Posts are categorized by **topic tags** (e.g. `genai`, `backend`, `devops`, `dsa`, `gate`). Tags are a managed list (admin creates them) to avoid `GenAI` / `gen-ai` / `genAI` duplicates. |
| BLG-11 | `/blog` lists posts newest-first, with a tag filter bar (chips). Selecting a tag → `/blog?tag=genai` (shareable URL). |
| BLG-12 | Post list shows year as a subtle divider when the year changes (gives the "yearly" view for free without a separate archive page). |
| BLG-13 | Each post page shows its tags (clickable → filtered list) and up to 3 related posts (most shared tags, then newest). |

**Why tags over yearly:** visitors (recruiters, engineers) arrive asking "what does this person know about X?", not "what did they write in 2025?". With few posts, year pages would be near-empty. Year dividers (BLG-12) cover the timeline need.

### 4.3 Markdown

| ID | Requirement |
|---|---|
| BLG-20 | Support CommonMark + GFM: headings, lists, links, images, tables, task lists, strikethrough, blockquotes, fenced code. |
| BLG-21 | Fenced code blocks get syntax highlighting (theme matched to cyberpunk palette) and a copy button. |
| BLG-22 | **Raw HTML in Markdown is not rendered** (escaped). All output is sanitized — no `<script>`, `javascript:` URLs, event handlers. This applies to post content *and* comments. |
| BLG-23 | Headings get anchor IDs; posts with ≥3 `##` headings show a table of contents. |
| BLG-24 | External links open in a new tab with `rel="noopener noreferrer"`. |
| BLG-25 | The **same renderer component** is used for admin preview and the public site, so preview = production. |

### 4.4 Admin panel

| ID | Requirement |
|---|---|
| BLG-30 | New sidebar module `// CONTENT → Blog` listing all posts (title, status, tags, published/updated date) with filter by status. |
| BLG-31 | Editor: metadata form + split view (Markdown textarea | live preview). Toggle to full-width edit or preview on small screens. |
| BLG-32 | Actions: Save draft, Publish, Unpublish, Delete (uses existing `ConfirmModal`). |
| BLG-33 | Unsaved-changes guard: warn on navigating away; autosave draft to `localStorage` every 10 s (restore prompt on reopen). |
| BLG-34 | Tag manager: create / rename / delete tags (delete blocked if in use, or detaches with confirmation). |
| BLG-36 | Image upload from the editor (button + drag-and-drop + paste): inserts `![alt](url)` at the cursor. Media library view lists uploaded images (copy URL, delete if unused). |
| BLG-37 | Allowed: JPEG, PNG, WebP, GIF, ≤ 5 MB. Type verified by file signature (magic bytes), not extension. **SVG rejected** (can carry scripts). Stored as `<uuid>.<ext>`; original filename never used in the path. |
| BLG-38 | Images stored on a Docker named volume on the EC2 host and served by nginx at `blog.kravlone.xyz/media/…` with long cache headers and `X-Content-Type-Options: nosniff`. |
| BLG-35 | Comment moderation screen: pending / approved / rejected tabs, approve / reject / delete, pending count badge in sidebar. |

### 4.5 Comments (see decision D1)

| ID | Requirement |
|---|---|
| BLG-40 | Fields: `body` (plain text + limited Markdown: bold, italic, inline code, links; 2–2000 chars) and optional `display_name` (≤40, defaults to "anonymous"). **No email.** |
| BLG-41 | **Pre-moderation:** new comments are `pending` and invisible until approved. Visitor sees "Comment submitted — visible after review." |
| BLG-42 | Anti-spam: honeypot field, rate limit 3/min & 20/day per IP, max 2 links per comment, reject if submitted <3 s after page load. |
| BLG-43 | IP is stored only as a salted SHA-256 hash (for rate-limit/abuse blocking), never raw. |
| BLG-44 | Approved comments show display name, relative date, rendered body. Oldest first. |
| BLG-45 | Admin can disable comments per post (`comments_enabled`, default true). |
| BLG-46 | Owner's own replies: admin can post a comment as "kravlone" with an "author" badge (auto-approved). |

### 4.6 Public site

| ID | Requirement |
|---|---|
| BLG-50 | Routes on `blog.kravlone.xyz`: `/`, `/?tag=x`, `/:slug`. Blog has its own header (name → links back to `kravlone.xyz`). Main site gets a "Blog" nav link and a "Latest posts" section (3 newest) linking to the subdomain. |
| BLG-51 | Post page: title, date, reading time, tags, cover (if any), TOC, content, related posts, comments. |
| BLG-52 | Loading skeletons and empty states ("No posts yet" / "No posts tagged x"). Unknown slug → themed 404. |
| BLG-53 | Responsive down to 360 px; long code blocks scroll horizontally inside the block, not the page. |
| BLG-54 | CLI mode: `~/blog/` directory; each published post is `<slug>.md`; `cat` prints the Markdown; `ls blog` shows date + title; `open <slug>` opens it on the subdomain. |

### 4.7 SEO & feeds

| ID | Requirement |
|---|---|
| BLG-60 | Blog `/` and `/:slug` are server-rendered by the existing `seo.py` mechanism (extended for the blog shell) (nginx → backend inject), with per-page `<title>`, description, canonical, OpenGraph/Twitter tags, and `BlogPosting` JSON-LD. |
| BLG-61 | `blog.kravlone.xyz` serves its own dynamic `sitemap.xml` (posts + `lastmod`) and `robots.txt`; main site `robots.txt` references it. |
| BLG-62 | RSS 2.0 feed at `blog.kravlone.xyz/rss.xml` (latest 20 posts, excerpt only). |
| BLG-63 | Drafts and `?tag=` pages are `noindex` (tag pages: `noindex, follow`). |

## 5. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-01 | **Design consistency:** all new UI uses shared design tokens + primitives (§7). No hard-coded hex colors in components. |
| NFR-02 | **Testing:** every BLG requirement with logic has at least one automated test; full suite + typecheck + lint + build must pass before any commit (§8). |
| NFR-03 | **Security:** blog admin endpoints use `verify_admin_token`; sanitization tests include known XSS payloads; comment endpoint rate-limited. |
| NFR-04 | **Performance:** list endpoint paginated (10/page); markdown libs lazy-loaded only on blog routes (homepage bundle must not grow >15 KB gz). |
| NFR-05 | **Accessibility:** keyboard-navigable, labelled form fields, contrast ≥ 4.5:1 (consistent with recent a11y commit). |
| NFR-06 | **Migrations:** schema changes via Alembic only; migration is reversible (`downgrade` works). |

## 6. Technical design (proposed)

**Backend (FastAPI)**
- Tables: `blog_posts`, `blog_tags`, `blog_post_tags` (M2M), `blog_slug_redirects`, `blog_comments` (`post_id`, `display_name`, `body`, `status`, `ip_hash`, `is_author`, `created_at`).
- Public: `GET /api/blog/posts?tag=&page=`, `GET /api/blog/posts/{slug}`, `GET /api/blog/tags`, `GET /api/blog/posts/{slug}/comments`, `POST /api/blog/posts/{slug}/comments`, `GET /api/blog/rss.xml`, `GET /api/blog/sitemap.xml`.
- Admin (`x-admin-token`): CRUD under `/api/admin/blog/...` for posts, tags, comments, images (`POST /api/admin/blog/images`, multipart).
- `media` named volume: mounted read-write in backend (`/app/media`), read-only in the blog nginx (`/usr/share/nginx/media`).
- CORS: add `https://blog.kravlone.xyz` and its local dev port.
- Server-side Markdown → HTML for SEO/RSS: `markdown-it-py` with HTML disabled.

**Frontend**
- `react-markdown` + `remark-gfm` + `rehype-slug` + `rehype-highlight` (sanitized; `skipHtml`).
- **New app `web-blog/`** (Vite + React + Tailwind, same stack) with its own Dockerfile, nginx config and Traefik router for `blog.kravlone.xyz`. Keeps the main site bundle untouched (NFR-04 for free) and lets blog nginx own `/media`, `/rss.xml`, `/sitemap.xml`.
- Main site changes limited to: Blog nav link, Latest posts section, CLI `~/blog`.
- Shared `shared/` folder at repo root: design tokens CSS, `MarkdownRenderer`, UI primitives — imported by `web-portfolio`, `web-blog` and `admin-portfolio` via Vite alias.

**New dependencies (approved):** backend `markdown-it-py`, `pytest`, `pytest-asyncio`, `python-multipart` (already present); frontend `react-markdown`, `remark-gfm`, `rehype-slug`, `rehype-highlight`, `vitest`, `@testing-library/react`, `jsdom`.

## 7. Design system plan

Current state: Tailwind config is empty, colors are hard-coded per component (`cyan-400`, `pink-500`, `slate-950`…), and the two apps already differ (`slate-900` vs `slate-950` body).

1. `shared/theme.css` — Tailwind v4 `@theme` tokens: `--color-bg`, `--color-surface`, `--color-border`, `--color-neon` (cyan), `--color-accent` (pink), `--color-text`, `--color-muted`, fonts, glow shadows, radii.
2. Primitives: `Card`, `Button` (primary/ghost/danger), `Tag`, `SectionHeading` (`// LABEL` mono style), `Input`/`Textarea`.
3. `docs/DESIGN.md` — tokens, primitives, do/don't. Read before any UI change.
4. Guard: a test that greps new/blog component files for raw hex or `#…`/`rgba(` color literals and fails.
5. Existing components are **not** migrated in this task (no unrequested refactor) — only blog code uses tokens. Migration can be a later task.

## 8. Testing strategy

There are currently **zero tests**. Plan:

| Layer | Tool | What |
|---|---|---|
| Backend API | pytest + httpx `AsyncClient` against a throwaway **Postgres** test DB (docker) | Blog endpoints: CRUD, auth required, draft hidden, slug redirect, pagination, comment moderation flow, rate limit, honeypot |
| Backend smoke (characterization) | same | Existing public GETs (`/profile`, `/projects`, …) return 200 + expected shape — safety net so blog work can't silently break them |
| Frontend unit | Vitest + Testing Library | MarkdownRenderer (GFM, **XSS payloads stripped**, code highlighting, external links), slug generator, reading time, tag filter, comment form validation |
| Static | `tsc --noEmit`, `oxlint`, `vite build` | Every change |
| Manual/visual | run app locally, check pages at 360 px & desktop | UI changes (unit tests don't catch "looks wrong") |

One entry point: `make test` at repo root runs everything. Optional later: Playwright E2E + GitHub Actions CI.

## 9. Assumptions

- A1. Single author (owner). No author profiles.
- A2. Images live on the EC2 host (Docker volume). Backups of that volume (EBS snapshot or cron `tar` to S3) are the owner's responsibility; a backup command will be documented.
- A3. Existing `x-admin-token` auth is reused; no new auth system.
- A4. Expected volume: tens of posts, low comment traffic → Postgres + in-memory rate limiter is enough.
- A5. Blog lives on `blog.kravlone.xyz`. DNS A record for `blog` → EC2 IP must be added by the owner; Traefik issues the TLS cert automatically.
- A6. Docker build context for the three frontends changes to repo root so they can import `shared/` (Dockerfile paths updated accordingly).
- A9. Admin stays on `admin.kravlone.xyz`; blog admin is a module there, not on the blog subdomain.
- A7. English only; no i18n.
- A8. Timestamps stored UTC, displayed in viewer's local time.

## 10. Decisions (all approved 2026-11-02)

- **D1 — Comments identity.** Recommended: *optional name, no email, pre-moderated* (BLG-40/41).
  - Fully anonymous: least friction, but comments read as faceless and spam is harder to judge.
  - Name + email: email is unverified (people type fake ones), makes you store PII (privacy-policy burden), and you won't email commenters anyway. Not worth it.
  - Optional name: low friction + some identity. Pre-moderation keeps a recruiter-facing site clean.
- **D2 — Approve design-system approach in §7** (shared folder + build-context change, A6).
- **D3 — Approve new dependencies in §6.**

## 10a. Decision log (made during development)

| # | Date | Decision | Why |
|---|---|---|---|
| L1 | 2026-11-02 | Removed unused `admin_endpoints.py` instead of patching its auth | Admin UI never called it; dead code with a security hole |
| L2 | 2026-11-02 | Tests run against a dedicated Postgres container (`docker-compose.test.yml`, port 5433, tmpfs); conftest refuses any DB name not ending in `_test` | Same dialect as prod (JSON, ilike); can never touch dev/prod data |
| L3 | 2026-11-02 | Test session runs `alembic downgrade base` → `upgrade head` | Every run proves migrations are reversible (NFR-06) |
| L4 | 2026-11-02 | Fixed 12 pre-existing TypeScript errors in `web-portfolio` (unused imports, type-only imports, literal types) | `build` never type-checked; a permanently red check is useless. Type-only, no behaviour change |
| L5 | 2026-11-02 | `shared/` is an npm workspace package `@kravlone/shared`; single root `package-lock.json` replaces per-app lockfiles; admin package renamed `admin-portfolio` (was a duplicate `web-portfolio`) | Only reliable way for shared React components to resolve `react` from one place |
| L6 | 2026-11-02 | Tokens map onto the existing palette (no visual change to current pages); guard test also bans raw Tailwind palette classes in new code | Consistency without a redesign |
| L7 | 2026-11-02 | Honeypot / too-fast (<3 s) comments get the same `202` as real ones but are not stored | Bots can't tell they were caught, so they don't adapt |
| L8 | 2026-11-02 | Display names `kravlone`, `admin`, `author`, `moderator` are reserved (422) | Stops visitors impersonating the author badge (BLG-46) |
| L9 | 2026-11-02 | Related posts (BLG-13) only include posts sharing ≥1 tag; no "newest" filler | A post with nothing in common isn't "related" |
| L10 | 2026-11-02 | Publish accepts optional `published_at` (scheduling); unpublish keeps the original date | BLG-03 already implies `published_at ≤ now`; BLG-05 keeps first-publish date |
| L11 | 2026-11-02 | Image "in use" = its filename appears in any post's Markdown or cover URL | No join table to keep in sync; filenames are UUIDs so no false matches |
| L12 | 2026-11-02 | Image URLs stored absolute (`BLOG_MEDIA_BASE_URL`); local dev blog app will run on port 8083 | Works in admin preview (different origin) and RSS |
| L13 | 2026-11-02 | IP hash = HMAC-SHA256 keyed with `SECRET_KEY` | Plain SHA-256 of an IPv4 is brute-forceable in minutes |
| L14 | 2026-11-02 | Admin sidebar collapses behind a menu button below `md` (layout-only change to `App.tsx`) | Fixed 256 px sidebar left ~130 px on phones; BLG-31 requires a usable editor on small screens |
| L15 | 2026-11-02 | Comments render through `CommentBody` (bold/italic/code/links only; links get `rel="nofollow ugc noopener noreferrer"`); bare URLs are not auto-linked | BLG-40 + no SEO value for spam links |
| L16 | 2026-11-02 | Images whose URL is stripped as unsafe render `[image: alt]` instead of `<img src="">` | Empty `src` makes browsers re-request the page |
| L17 | 2026-11-02 | Unsaved-changes guard = local autosave + confirm on in-app link clicks + `beforeunload` (no router migration) | `useBlocker` needs a data router; migrating the admin router would be an unrequested refactor |
