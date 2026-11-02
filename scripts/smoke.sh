#!/usr/bin/env bash
# Post-deploy smoke test for the blog (BLG-38/50/60-63) against a RUNNING stack.
#   local:       scripts/smoke.sh
#   production:  scripts/smoke.sh https://blog.kravlone.xyz https://kravlone.xyz
# Read-only: never writes data. Exit code = number of failed checks.
set -uo pipefail
BLOG="${1:-http://localhost:8083}"; BLOG="${BLOG%/}"
SITE="${2:-http://localhost:8082}"; SITE="${SITE%/}"
fail=0
pass() { printf '  \033[32mPASS\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31mFAIL\033[0m %s\n' "$1"; fail=$((fail+1)); }
check() { if eval "$2" >/dev/null 2>&1; then pass "$1"; else bad "$1"; fi; }
status() { curl -s -o /dev/null -w '%{http_code}' "$1"; }
body() { curl -s "$1"; }
headers() { curl -s -D - -o /dev/null "$1"; }

echo "Blog: $BLOG"
check "GET / -> 200"                                "[ \"\$(status $BLOG/)\" = 200 ]"
check "/ is server-rendered (title + canonical)"     "body $BLOG/ | grep -q '<link rel=\"canonical\"'"
check "/ embeds boot data (no loading flash)"        "body $BLOG/ | grep -q 'id=\"blog-data\"'"
check "/?tag=x is noindex, follow"                   "body '$BLOG/?tag=x' | grep -q 'content=\"noindex, follow\"'"
check "unknown post -> 404 + noindex"                "[ \"\$(status $BLOG/__smoke_missing__)\" = 404 ] && body $BLOG/__smoke_missing__ | grep -q 'content=\"noindex\"'"
check "/rss.xml -> 200 rss+xml"                      "headers $BLOG/rss.xml | grep -qi 'content-type: application/rss+xml'"
check "/sitemap.xml -> 200 with <urlset>"            "body $BLOG/sitemap.xml | grep -q '<urlset'"
check "/robots.txt lists the sitemap"                "body $BLOG/robots.txt | grep -q 'Sitemap: '"
check "/api/blog/posts -> JSON"                      "body $BLOG/api/blog/posts | grep -q '\"items\"'"
check "/media/<missing> -> 404"                      "[ \"\$(status $BLOG/media/__smoke__.png)\" = 404 ]"

first_slug=$(body "$BLOG/api/blog/posts?per_page=1" | python3 -c "import json,sys; i=json.load(sys.stdin)['items']; print(i[0]['slug'] if i else '')" 2>/dev/null)
if [ -n "$first_slug" ]; then
  check "post /$first_slug -> 200 article markup"    "body $BLOG/$first_slug | grep -q 'og:type\" content=\"article\"'"
  check "post JSON-LD BlogPosting"                    "body $BLOG/$first_slug | grep -q '\"BlogPosting\"'"
else
  echo "  SKIP post checks (no published posts)"
fi

img=$(body "$BLOG/api/blog/posts?per_page=50" | python3 -c "
import json,sys
for p in json.load(sys.stdin)['items']:
    u=p.get('cover_image_url') or ''
    if '/media/' in u: print('/media/'+u.split('/media/',1)[1]); break" 2>/dev/null)
if [ -n "$img" ]; then
  h=$(headers "$BLOG$img")
  check "media $img -> 200 immutable cache"           "echo \"\$h\" | grep -qi 'cache-control: public, max-age=31536000, immutable'"
  check "media nosniff + sandbox CSP"                 "echo \"\$h\" | grep -qi 'x-content-type-options: nosniff' && echo \"\$h\" | grep -qi 'content-security-policy:.*sandbox'"
else
  echo "  SKIP media header checks (no cover image on a published post)"
fi

echo "Main site: $SITE"
check "GET / -> 200"                                "[ \"\$(status $SITE/)\" = 200 ]"
check "robots.txt points to blog sitemap"            "body $SITE/robots.txt | grep -q 'blog.kravlone.xyz/sitemap.xml'"
if [ -n "$first_slug" ]; then
  check "homepage SSR links latest post"            "body $SITE/ | grep -q \"/$first_slug\\\"\""
fi

echo; [ $fail -eq 0 ] && echo "All smoke checks passed." || echo "$fail check(s) failed."
exit $fail
