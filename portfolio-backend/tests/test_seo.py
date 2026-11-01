import pytest

from app.api import seo
from tests import factories as f

pytestmark = pytest.mark.usefixtures("db")

SHELL = ('<html><head><title>x</title><meta name="description" content="d"></head>'
         '<body><div id="root"></div></body></html>')


class FakeResp:
    text = SHELL
    def raise_for_status(self): pass


@pytest.fixture(autouse=True)
def fake_shell(monkeypatch):
    seo._cache.clear()
    async def get(url): return FakeResp()
    monkeypatch.setattr(seo._http, "get", get)


async def test_render_404_without_profile(client):
    assert (await client.get("/api/seo/render?path=/")).status_code == 404


async def test_render_injects_escaped_content(client, admin_headers):
    await client.put("/api/profile", json={**f.PROFILE, "id": 1, "updated_at": "2025-01-01T00:00:00",
                                           "tagline": "<script>x</script>"}, headers=admin_headers)
    await client.post("/api/projects", json=f.project(title="Cool & New"), headers=admin_headers)
    html = (await client.get("/api/seo/render?path=/")).text
    assert "<title>Test User (KraVLonE) | Engineer</title>" in html
    assert "<script>x</script>" not in html and "&lt;script&gt;" in html
    assert "<h3>Cool &amp; New</h3>" in html


async def test_render_unknown_path_404(client):
    assert (await client.get("/api/seo/render?path=/nope")).status_code == 404


async def test_blg50_home_links_latest_blog_posts(client, admin_headers, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "BLOG_SITE_URL", "https://blog.test")
    await client.put("/api/profile", json={**f.PROFILE, "id": 1, "updated_at": "2025-01-01T00:00:00"}, headers=admin_headers)
    html = (await client.get("/api/seo/render?path=/")).text
    assert 'id="blog"' not in html  # no posts -> no section
    seo._cache.clear()
    p = (await client.post("/api/admin/blog/posts", json={"title": "First Post", "content_md": "x"}, headers=admin_headers)).json()
    await client.post(f"/api/admin/blog/posts/{p['id']}/publish", headers=admin_headers)
    await client.post("/api/admin/blog/posts", json={"title": "Draft", "content_md": "x"}, headers=admin_headers)
    html = (await client.get("/api/seo/render?path=/")).text
    assert '<a href="https://blog.test/first-post">First Post</a>' in html and "Draft" not in html
