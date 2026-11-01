"""Blog API tests. Test names reference requirement IDs in docs/blog-requirements.md."""
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.models.blog import BlogComment

pytestmark = pytest.mark.usefixtures("db")

A = "/api/admin/blog"
P = "/api/blog"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
CONTENT = "# Intro\n\nSome **bold** words here.\n\n```py\nprint('hi')\n```\n"


@pytest.fixture
def api(client, admin_headers):
    """Small helper around admin calls that asserts success."""
    class Api:
        async def tag(self, name, **kw):
            r = await client.post(f"{A}/tags", json={"name": name, **kw}, headers=admin_headers)
            assert r.status_code == 201, r.text
            return r.json()

        async def post(self, title="Hello World", publish=False, **kw):
            body = {"title": title, "content_md": CONTENT, **kw}
            r = await client.post(f"{A}/posts", json=body, headers=admin_headers)
            assert r.status_code == 201, r.text
            post = r.json()
            if publish:
                post = await self.publish(post["id"], **({} if publish is True else {"published_at": publish}))
            return post

        async def publish(self, pid, **kw):
            r = await client.post(f"{A}/posts/{pid}/publish", json=kw or None, headers=admin_headers)
            assert r.status_code == 200, r.text
            return r.json()

        async def update(self, post, **changes):
            body = {k: post[k] for k in ("title", "slug", "content_md", "cover_image_url", "comments_enabled")}
            body["tags"] = [t["slug"] for t in post["tags"]]
            body["excerpt"] = post["custom_excerpt"]
            r = await client.put(f"{A}/posts/{post['id']}", json={**body, **changes}, headers=admin_headers)
            return r

        async def comment(self, slug, body="Nice post!", **kw):
            return await client.post(f"{P}/posts/{slug}/comments", json={"body": body, "form_ms": 5000, **kw})

    return Api()


# ---------------- posts: create / slug ----------------
async def test_blg01_02_create_draft_defaults(api):
    post = await api.post("Hello World")
    assert post["status"] == "draft" and post["slug"] == "hello-world"
    assert post["published_at"] is None
    assert post["excerpt"] == "Intro Some bold words here."  # auto excerpt skips code
    assert post["reading_time_min"] == 1 and post["custom_excerpt"] is None


async def test_blg01_custom_excerpt_wins(api):
    post = await api.post(excerpt="My summary")
    assert post["excerpt"] == "My summary" and post["custom_excerpt"] == "My summary"


async def test_blg01_auto_slug_deduplicates(api):
    assert (await api.post("Same Title"))["slug"] == "same-title"
    assert (await api.post("Same Title"))["slug"] == "same-title-2"
    assert (await api.post("Same Title"))["slug"] == "same-title-3"


async def test_blg01_explicit_slug_conflict_and_validation(api, client, admin_headers):
    await api.post(slug="taken")
    r = await client.post(f"{A}/posts", json={"title": "x", "slug": "taken"}, headers=admin_headers)
    assert r.status_code == 409
    r = await client.post(f"{A}/posts", json={"title": "x", "slug": "Bad Slug!"}, headers=admin_headers)
    assert r.status_code == 422


@pytest.mark.parametrize("body", [
    {"title": ""},
    {"title": "   "},
    {"title": "x" * 121},
    {"title": "ok", "content_md": "x" * 100_001},
    {"title": "ok", "tags": ["a", "b", "c", "d", "e", "f"]},
    {"title": "ok", "cover_image_url": "javascript:alert(1)"},
])
async def test_blg01_validation(client, admin_headers, body):
    assert (await client.post(f"{A}/posts", json=body, headers=admin_headers)).status_code == 422


async def test_unknown_tag_rejected(client, admin_headers):
    r = await client.post(f"{A}/posts", json={"title": "x", "tags": ["nope"]}, headers=admin_headers)
    assert r.status_code == 422 and "nope" in r.text


# ---------------- visibility / publish ----------------
async def test_blg03_draft_hidden_publicly(api, client):
    await api.post("Secret")
    assert (await client.get(f"{P}/posts")).json()["items"] == []
    assert (await client.get(f"{P}/posts/secret")).status_code == 404
    assert (await client.get(f"{P}/posts/secret/comments")).status_code == 404


async def test_blg03_publish_unpublish(api, client, admin_headers):
    post = await api.post("Live", publish=True)
    assert post["status"] == "published" and post["published_at"]
    assert (await client.get(f"{P}/posts/live")).status_code == 200
    await client.post(f"{A}/posts/{post['id']}/unpublish", headers=admin_headers)
    assert (await client.get(f"{P}/posts/live")).status_code == 404


async def test_blg03_scheduled_post_hidden_until_due(api, client):
    future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    await api.post("Later", publish=future)
    assert (await client.get(f"{P}/posts/later")).status_code == 404


async def test_blg05_republish_keeps_first_date(api, client, admin_headers):
    post = await api.post(publish=True)
    first = post["published_at"]
    await client.post(f"{A}/posts/{post['id']}/unpublish", headers=admin_headers)
    assert (await api.publish(post["id"]))["published_at"] == first


async def test_cannot_publish_empty(client, admin_headers):
    pid = (await client.post(f"{A}/posts", json={"title": "Empty"}, headers=admin_headers)).json()["id"]
    assert (await client.post(f"{A}/posts/{pid}/publish", headers=admin_headers)).status_code == 422


async def test_blg05_updated_at_bumps_on_tag_only_edit(api):
    await api.tag("GenAI")
    post = await api.post()
    r = await api.update(post, tags=["genai"])
    assert r.status_code == 200 and r.json()["updated_at"] > post["updated_at"]


# ---------------- slug redirects ----------------
async def test_blg04_published_slug_change_redirects(api, client):
    post = await api.post("Old Name", publish=True)
    post = (await client.get(f"{A}/posts/{post['id']}", headers=api_headers())).json()
    assert (await api.update(post, slug="new-name")).status_code == 200
    r = await client.get(f"{P}/posts/old-name", follow_redirects=False)
    assert r.status_code == 301 and r.headers["location"] == "/api/blog/posts/new-name"
    assert (await client.get(f"{P}/posts/old-name", follow_redirects=True)).json()["slug"] == "new-name"


async def test_blg04_draft_slug_change_no_redirect(api, client):
    post = await api.post("Draft Name")
    post = (await client.get(f"{A}/posts/{post['id']}", headers=api_headers())).json()
    await api.update(post, slug="renamed")
    await api.publish(post["id"])
    assert (await client.get(f"{P}/posts/draft-name", follow_redirects=False)).status_code == 404


async def test_blg04_reclaimed_slug_serves_new_post(api, client):
    a = await api.post("Alpha", publish=True)
    a = (await client.get(f"{A}/posts/{a['id']}", headers=api_headers())).json()
    await api.update(a, slug="alpha-v2")
    await api.post("Other", slug="alpha", publish=True)
    r = await client.get(f"{P}/posts/alpha", follow_redirects=False)
    assert r.status_code == 200 and r.json()["title"] == "Other"


def api_headers():
    return {"x-admin-token": settings.ADMIN_SECRET_KEY}


# ---------------- listing / tags / related ----------------
async def test_blg11_list_pagination_order_and_tag_filter(api, client):
    await api.tag("GenAI")
    base = datetime(2025, 1, 1, tzinfo=timezone.utc)
    for i in range(12):
        await api.post(f"Post {i}", publish=(base + timedelta(days=i)).isoformat(),
                       tags=["genai"] if i % 3 == 0 else [])
    page1 = (await client.get(f"{P}/posts?per_page=5")).json()
    assert page1["total"] == 12 and page1["pages"] == 3
    assert [p["title"] for p in page1["items"]] == ["Post 11", "Post 10", "Post 9", "Post 8", "Post 7"]
    page3 = (await client.get(f"{P}/posts?per_page=5&page=3")).json()
    assert [p["title"] for p in page3["items"]] == ["Post 1", "Post 0"]
    tagged = (await client.get(f"{P}/posts?tag=GenAI")).json()
    assert [p["title"] for p in tagged["items"]] == ["Post 9", "Post 6", "Post 3", "Post 0"]
    assert (await client.get(f"{P}/posts?tag=missing")).json()["items"] == []
    assert (await client.get(f"{P}/posts?per_page=51")).status_code == 422


async def test_blg10_public_tags_only_count_visible(api, client):
    await api.tag("GenAI")
    await api.tag("DevOps")
    await api.tag("Unused")
    await api.post("a", publish=True, tags=["genai", "devops"])
    await api.post("b", publish=True, tags=["genai"])
    await api.post("c", tags=["devops"])  # draft: not counted
    assert (await client.get(f"{P}/tags")).json() == [
        {"slug": "genai", "name": "GenAI", "post_count": 2},
        {"slug": "devops", "name": "DevOps", "post_count": 1},
    ]


async def test_blg13_related_posts(api, client):
    for t in ("A", "B", "C"):
        await api.tag(t)
    await api.post("Main", publish=True, tags=["a", "b"])
    await api.post("Two shared", publish=True, tags=["a", "b", "c"])
    await api.post("One shared", publish=True, tags=["b"])
    await api.post("No shared", publish=True, tags=["c"])
    await api.post("Draft shared", tags=["a", "b"])
    rel = (await client.get(f"{P}/posts/main")).json()["related"]
    assert [r["title"] for r in rel] == ["Two shared", "One shared"]


# ---------------- tags admin ----------------
async def test_blg34_tag_crud(api, client, admin_headers):
    tag = await api.tag("Gen AI")
    assert tag["slug"] == "gen-ai"
    assert (await client.post(f"{A}/tags", json={"name": "gen ai"}, headers=admin_headers)).status_code == 409
    r = await client.put(f"{A}/tags/{tag['id']}", json={"name": "GenAI", "slug": "genai"}, headers=admin_headers)
    assert r.json()["slug"] == "genai"
    await api.post(tags=["genai"])
    r = await client.delete(f"{A}/tags/{tag['id']}", headers=admin_headers)
    assert r.status_code == 409
    r = await client.delete(f"{A}/tags/{tag['id']}?force=true", headers=admin_headers)
    assert r.json() == {"status": "deleted", "detached_from": 1}
    posts = (await client.get(f"{A}/posts", headers=admin_headers)).json()
    assert posts[0]["tags"] == []


# ---------------- comments ----------------
async def test_blg41_44_moderation_flow(api, client, admin_headers):
    await api.post("Talk", publish=True)
    r = await api.comment("talk", "First!", display_name="  Ana  ")
    assert r.status_code == 202 and r.json()["status"] == "pending"
    await api.comment("talk", "Second")
    assert (await client.get(f"{P}/posts/talk/comments")).json() == []  # pre-moderated

    pending = (await client.get(f"{A}/comments", headers=admin_headers)).json()
    assert [c["body"] for c in pending] == ["Second", "First!"]
    assert (await client.get(f"{A}/comments/pending-count", headers=admin_headers)).json() == {"count": 2}
    assert (await client.get(f"{A}/posts", headers=admin_headers)).json()[0]["pending_comments"] == 2

    for c in pending:
        r = await client.patch(f"{A}/comments/{c['id']}", json={"status": "approved"}, headers=admin_headers)
        assert r.json()["status"] == "approved"
    public = (await client.get(f"{P}/posts/talk/comments")).json()
    assert [(c["display_name"], c["body"]) for c in public] == [("Ana", "First!"), ("anonymous", "Second")]
    assert "status" not in public[0] and "ip_hash" not in public[0]


async def test_blg42_bots_silently_dropped(api, client, db):
    await api.post("Bots", publish=True)
    assert (await api.comment("bots", website="http://spam")).status_code == 202
    assert (await api.comment("bots", form_ms=500)).status_code == 202
    assert (await db.execute(select(BlogComment))).scalars().all() == []


@pytest.mark.parametrize("kw,code", [
    ({"body": "x"}, 422),
    ({"body": "y" * 2001}, 422),
    ({"body": "a https://1.com b https://2.com c www.3.com"}, 422),
    ({"display_name": "KraVLonE"}, 422),
    ({"display_name": "n" * 41}, 422),
])
async def test_blg40_42_comment_validation(api, kw, code):
    await api.post("V", publish=True)
    r = await api.comment("v", **{"body": "Valid body", **kw})
    assert r.status_code == code


async def test_blg42_rate_limit(api):
    await api.post("Rl", publish=True)
    codes = [(await api.comment("rl")).status_code for _ in range(4)]
    assert codes == [202, 202, 202, 429]


async def test_blg43_ip_stored_hashed(api, client, db):
    await api.post("Ip", publish=True)
    await client.post(f"{P}/posts/ip/comments", json={"body": "hey", "form_ms": 5000},
                      headers={"X-Forwarded-For": "203.0.113.9"})
    c = (await db.execute(select(BlogComment))).scalars().one()
    assert len(c.ip_hash) == 64 and "203.0.113.9" not in c.ip_hash


async def test_blg45_comments_disabled(api, client):
    await api.post("Closed", publish=True, comments_enabled=False)
    assert (await api.comment("closed")).status_code == 403


async def test_comment_on_draft_404(api):
    await api.post("Hidden")
    assert (await api.comment("hidden")).status_code == 404


async def test_blg46_author_reply(api, client, admin_headers):
    post = await api.post("Reply", publish=True)
    r = await client.post(f"{A}/posts/{post['id']}/comments", json={"body": "Thanks!"}, headers=admin_headers)
    assert r.status_code == 201
    public = (await client.get(f"{P}/posts/reply/comments")).json()
    assert [(c["display_name"], c["is_author"]) for c in public] == [("kravlone", True)]


async def test_delete_post_cascades_comments(api, client, admin_headers, db):
    post = await api.post("Gone", publish=True)
    await api.comment("gone")
    await client.delete(f"{A}/posts/{post['id']}", headers=admin_headers)
    assert (await db.execute(select(BlogComment))).scalars().all() == []


async def test_delete_comment(api, client, admin_headers):
    await api.post("Del", publish=True)
    await api.comment("del")
    cid = (await client.get(f"{A}/comments", headers=admin_headers)).json()[0]["id"]
    assert (await client.delete(f"{A}/comments/{cid}", headers=admin_headers)).json() == {"status": "deleted"}
    assert (await client.delete(f"{A}/comments/{cid}", headers=admin_headers)).status_code == 404


# ---------------- images ----------------
@pytest.fixture
def media(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "BLOG_MEDIA_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "BLOG_MEDIA_BASE_URL", "https://blog.test/media")
    return tmp_path


async def _upload(client, admin_headers, data, name="x.png", ctype="image/png"):
    return await client.post(f"{A}/images", files={"file": (name, data, ctype)}, headers=admin_headers)


async def test_blg36_37_upload_png(client, admin_headers, media):
    r = await _upload(client, admin_headers, PNG, name="../../etc/passwd.png")
    assert r.status_code == 201, r.text
    img = r.json()
    assert img["content_type"] == "image/png" and img["url"] == f"https://blog.test/media/{img['filename']}"
    assert img["filename"].endswith(".png") and "passwd" not in img["filename"]
    assert (media / img["filename"]).read_bytes() == PNG


@pytest.mark.parametrize("data,name,ctype", [
    (b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', "a.svg", "image/svg+xml"),
    (b"<html>not an image</html>", "fake.png", "image/png"),
    (b"", "empty.png", "image/png"),
])
async def test_blg37_rejects_non_images(client, admin_headers, media, data, name, ctype):
    assert (await _upload(client, admin_headers, data, name, ctype)).status_code == 415
    assert list(media.iterdir()) == []


@pytest.mark.parametrize("data,ctype", [
    (b"\xff\xd8\xff\xe0" + b"\x00" * 20, "image/jpeg"),
    (b"GIF89a" + b"\x00" * 20, "image/gif"),
    (b"RIFF\x00\x00\x00\x00WEBPVP8 " + b"\x00" * 20, "image/webp"),
])
async def test_blg37_accepts_other_formats(client, admin_headers, media, data, ctype):
    r = await _upload(client, admin_headers, data, "whatever.bin", "application/octet-stream")
    assert r.status_code == 201 and r.json()["content_type"] == ctype


async def test_blg37_size_limit(client, admin_headers, media, monkeypatch):
    monkeypatch.setattr(settings, "BLOG_MAX_IMAGE_BYTES", 32)
    assert (await _upload(client, admin_headers, PNG)).status_code == 413


async def test_blg36_usage_and_delete(api, client, admin_headers, media):
    img = (await _upload(client, admin_headers, PNG)).json()
    await api.post("Pics", content_md=f"![alt]({img['url']})")
    listed = (await client.get(f"{A}/images", headers=admin_headers)).json()
    assert listed[0]["used_in"] == ["pics"]
    assert (await client.delete(f"{A}/images/{img['id']}", headers=admin_headers)).status_code == 409
    r = await client.delete(f"{A}/images/{img['id']}?force=true", headers=admin_headers)
    assert r.json() == {"status": "deleted"} and not (media / img["filename"]).exists()
    assert (await client.get(f"{A}/images", headers=admin_headers)).json() == []


async def test_image_upload_requires_admin(client, media):
    r = await client.post(f"{A}/images", files={"file": ("x.png", PNG, "image/png")})
    assert r.status_code == 422  # missing header
    assert list(media.iterdir()) == []
