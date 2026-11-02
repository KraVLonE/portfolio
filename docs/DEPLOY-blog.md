# Deploying the blog to EC2 — checklist

Branch `feat/blog`. Everything runs from the existing compose setup; no new secrets are required.

## 0. Before you start (one-time)

- [ ] **DNS:** add an `A` record `blog` → your EC2 public IP (same IP as `kravlone.xyz`). Check: `dig +short blog.kravlone.xyz`
- [ ] **Merge** `feat/blog` into `main` (or deploy the branch directly).
- [ ] **Back up the database first** (the deploy runs a migration that *adds* blog tables; nothing is dropped, but back up anyway):
  ```bash
  docker compose exec -T db pg_dump -U postgres portfolio | gzip > ~/backups/portfolio-$(date +%F).sql.gz
  ```

## 1. Deploy

```bash
cd ~/portfolio && git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
docker compose logs backend | grep -i alembic      # expect: "Running upgrade c13d18fac144 -> 9f98b892dfe8, add blog tables"
```

What changes:
- New container **`blog`** (nginx) — Traefik routes `blog.kravlone.xyz` to it and issues the TLS cert automatically (first request may take ~30 s).
- New volume **`portfolio_blog_media`** for uploaded images (backend writes, blog nginx reads).
- Frontend images now build from the repo root (npm workspaces) — handled by the compose files.
- **Security fix from phase 1 goes live** (unauthenticated `/api/admin/*` routes removed).

Optional env (defaults are already correct for production, set only if your domain differs):
`BLOG_SITE_URL`, `BLOG_MEDIA_BASE_URL`, `SITE_URL` in `portfolio-backend/.env`.

## 2. Verify (2 minutes)

```bash
scripts/smoke.sh https://blog.kravlone.xyz https://kravlone.xyz
```
Expect `All smoke checks passed.` (Post/media checks are skipped until you publish a post with a cover image — run it again after the first post.)

Manual spot checks:
- [ ] `https://admin.kravlone.xyz` → sidebar shows **// CONTENT → Blog, Tags, Comments, Media**
- [ ] Create a tag, write a post with an uploaded image, **Publish** → it appears on `https://blog.kravlone.xyz` and in **Latest Posts** on `https://kravlone.xyz` (≤ 60 s, SEO cache)
- [ ] Leave a comment on the post as a visitor → shows in admin **Comments** (pending) → approve → visible on the post
- [ ] Paste the post URL into https://www.opengraph.xyz → title, description and image preview look right
- [ ] CLI mode on the main site: `ls blog`, `cat blog/<slug>.md`, `open <slug>`

## 3. Search engines

- [ ] Google Search Console → add property `https://blog.kravlone.xyz` (DNS or HTML-tag verification) → **Sitemaps** → submit `sitemap.xml`
- [ ] (Optional) Bing Webmaster Tools → import from Search Console

## 4. Backups (cron on the EC2 host)

```bash
crontab -e
# daily 03:00 — blog images + database, keep 14 days
0 3 * * * docker run --rm -v portfolio_blog_media:/media:ro -v $HOME/backups:/out alpine tar czf /out/blog-media-$(date +\%F).tgz -C /media . && docker compose -f $HOME/portfolio/docker-compose.yml exec -T db pg_dump -U postgres portfolio | gzip > $HOME/backups/portfolio-$(date +\%F).sql.gz && find $HOME/backups -mtime +14 -delete
```
Restore commands: see README → *Backups*.

## Rollback

Code-only rollback is safe: older code simply ignores the blog tables.
```bash
git checkout <previous-commit> && docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop blog
```
**Do not** run `alembic downgrade` unless you intend to delete all blog posts, comments and image records.

## Known limits (by design, see requirements §2)

- Rate limiter is in-memory: limits reset when the backend restarts and are per-container.
- SEO pages are cached 60 s; edits appear to crawlers/link previews within a minute (the SPA shows them immediately).
- No full-text search yet (revisit at > 30 posts).
