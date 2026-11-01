"""BLG-60–63: server-rendered blog pages, RSS, sitemap."""
import json
import re
import xml.etree.ElementTree as ET

import httpx
import pytest

from app.api import blog_seo, seo
from app.core.config import settings

pytestmark = pytest.mark.usefixtures("db")

A = "/api/admin/blog"
SHELL = ('<html><head><title>x</title><meta name="description" content="d"></head>'
         '<body><div id="root"></div></body></html>')


class FakeResp:
    text = SHELL
    def raise_for_status(self): pass


@pytest.fixture(autouse=True)
def fake_shell(monkeypatch):
    blog_seo._cache.clear()
    seo._cache.clear()
    async def get(url): return FakeResp()
    monkeypatch.setattr(blog_seo._http, "get", get)
    monkeypatch.setattr(seo._http, "get", get)
    monkeypatch.setattr(settings, "BLOG_SITE_URL", "https://blog.test")


@pytest.fixture
def mk(client, admin_headers):
    async def make(title, content="## Hi\n\nBody **text**.", tags=(), publish="2026-01-01T00:00:00Z", **kw):
        r = await client.post(f"{A}/posts", json={"title": title, "content_md": content, "tags": list(tags), **kw},
                              headers=admin_headers)
        assert r.status_code == 201, r.text
        p = r.json()
        if publish:
            p = (await client.post(f"{A}/posts/{p['id']}/publish", json={"published_at": publish},
                                   headers=admin_headers)).json()
        return p
    return make


def boot(html: str) -> dict:
    return json.loads(re.search(r'<script id="blog-data" type="application/json">(.*?)</script>', html, re.S).group(1))


def ld(html: str) -> dict:
    return json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S).group(1))


async def test_blg60_index(client, mk):
    await mk("Visible One")
    await mk("Secret Draft", publish=None)
    r = await client.get("/api/seo/blog?path=/")
    html = r.text
    assert r.status_code == 200
    assert "<title>KraVLonE Blog</title>" in html
    assert '<link rel="canonical" href="https://blog.test/" />' in html
    assert 'content="index, follow' in html
    assert 'href="https://blog.test/visible-one"' in html
    assert "Secret Draft" not in html
    assert ld(html)["@type"] == "Blog"


async def test_blg63_tag_pages_noindex(client, admin_headers, mk):
    await client.post(f"{A}/tags", json={"name": "GenAI"}, headers=admin_headers)
    await mk("Tagged", tags=["genai"])
    html = (await client.get("/api/seo/blog?path=/&tag=genai")).text
    assert '<meta name="robots" content="noindex, follow" />' in html
    assert "<title>#genai posts | KraVLonE Blog</title>" in html


async def test_blg60_post_page(client, admin_headers, mk):
    await client.post(f"{A}/tags", json={"name": "GenAI"}, headers=admin_headers)
    await mk("RAG & Agents", content="## Setup\n\nUse **LangGraph**.", tags=["genai"],
             cover_image_url="https://blog.test/media/c.png")
    r = await client.get("/api/seo/blog?path=/rag-agents")
    html = r.text
    assert r.status_code == 200
    assert "<title>RAG &amp; Agents | KraVLonE Blog</title>" in html
    assert '<link rel="canonical" href="https://blog.test/rag-agents" />' in html
    assert '<meta property="og:type" content="article" />' in html
    assert '<meta property="og:image" content="https://blog.test/media/c.png" />' in html
    assert '<meta property="article:tag" content="GenAI" />' in html
    assert '<h2>Setup</h2>' in html and "<strong>LangGraph</strong>" in html
    data = ld(html)
    assert data["@type"] == "BlogPosting" and data["headline"] == "RAG & Agents"
    assert data["datePublished"].startswith("2026-01-01")


async def test_blg60_json_ld_cannot_break_out_of_script(client, mk):
    await mk("Evil </script><script>alert(1)</script>", excerpt="x </script> y")
    html = (await client.get("/api/seo/blog?path=/evil-script-script-alert-1-script")).text
    # Only our two data blocks (JSON-LD + boot data); the title can't open or close a script.
    assert re.findall(r"<script\b[^>]*>", html) == [
        '<script type="application/ld+json">', '<script id="blog-data" type="application/json">']
    assert html.count("</script>") == 2
    assert ld(html)["headline"].startswith("Evil </script>")  # survives as data
    assert boot(html)["post|evil-script-script-alert-1-script"]["title"].startswith("Evil </script>")


async def test_blg03_draft_and_unknown_are_404_noindex(client, mk):
    await mk("Draft Post", publish=None)
    for path in ("/draft-post", "/nope", "/a/b"):
        r = await client.get(f"/api/seo/blog?path={path}")
        assert r.status_code == 404 and '<meta name="robots" content="noindex" />' in r.text
        assert "Draft Post" not in r.text


async def test_blg04_old_slug_301(client, admin_headers, mk):
    p = await mk("Old Name")
    full = (await client.get(f"{A}/posts/{p['id']}", headers=admin_headers)).json()
    await client.put(f"{A}/posts/{p['id']}", headers=admin_headers, json={
        "title": full["title"], "slug": "new-name", "content_md": full["content_md"], "tags": []})
    r = await client.get("/api/seo/blog?path=/old-name", follow_redirects=False)
    assert r.status_code == 301 and r.headers["location"] == "/new-name"


async def test_shell_unavailable_502(client, monkeypatch):
    async def boom(url): raise httpx.ConnectError("down")
    monkeypatch.setattr(blog_seo._http, "get", boom)
    assert (await client.get("/api/seo/blog?path=/")).status_code == 502


async def test_blg62_rss(client, mk):
    await mk("Older", publish="2025-05-01T10:00:00Z")
    await mk("Tom & Jerry <3", excerpt="Cats & mice", publish="2026-02-01T10:00:00Z")
    await mk("Hidden", publish=None)
    r = await client.get("/api/blog/rss.xml")
    assert r.headers["content-type"].startswith("application/rss+xml")
    channel = ET.fromstring(r.content).find("channel")
    items = channel.findall("item")
    assert [i.findtext("title") for i in items] == ["Tom & Jerry <3", "Older"]
    assert items[0].findtext("link") == "https://blog.test/tom-jerry-3"
    assert items[0].findtext("description") == "Cats & mice"
    assert items[0].findtext("pubDate") == "Sun, 01 Feb 2026 10:00:00 GMT"


async def test_blg62_rss_empty_is_valid(client):
    channel = ET.fromstring((await client.get("/api/blog/rss.xml")).content).find("channel")
    assert channel.findtext("title") == "KraVLonE Blog" and channel.findall("item") == []


async def test_blg61_sitemap(client, mk):
    await mk("Post A")
    await mk("Draft B", publish=None)
    root = ET.fromstring((await client.get("/api/blog/sitemap.xml")).content)
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [u.findtext("s:loc", namespaces=ns) for u in root.findall("s:url", ns)]
    assert locs == ["https://blog.test/", "https://blog.test/post-a"]
    assert all(u.find("s:lastmod", ns) is not None for u in root.findall("s:url", ns))


async def test_seo_cache_serves_stale_within_ttl(client, admin_headers, mk):
    p = await mk("Cached")
    assert (await client.get("/api/seo/blog?path=/cached")).status_code == 200
    await client.post(f"{A}/posts/{p['id']}/unpublish", headers=admin_headers)
    assert (await client.get("/api/seo/blog?path=/cached")).status_code == 200  # cached
    blog_seo._cache.clear()
    assert (await client.get("/api/seo/blog?path=/cached")).status_code == 404


async def test_boot_data_matches_public_api(client, admin_headers, mk):
    """SPA starts from embedded data (no loading flash) - it must be exactly what the API returns."""
    await client.post(f"{A}/tags", json={"name": "GenAI"}, headers=admin_headers)
    await mk("Boot Post", tags=["genai"], cover_image_url="https://blog.test/media/c.png")
    index = boot((await client.get("/api/seo/blog?path=/")).text)
    assert index["posts|1|"] == (await client.get("/api/blog/posts?page=1&per_page=10")).json()
    assert index["tags"] == (await client.get("/api/blog/tags")).json()
    tagged = boot((await client.get("/api/seo/blog?path=/&tag=genai&page=1")).text)
    assert tagged["posts|1|genai"]["items"][0]["slug"] == "boot-post"
    post = boot((await client.get("/api/seo/blog?path=/boot-post")).text)
    assert post["post|boot-post"] == (await client.get("/api/blog/posts/boot-post")).json()


async def test_404_has_no_boot_data(client):
    assert 'id="blog-data"' not in (await client.get("/api/seo/blog?path=/nope")).text
