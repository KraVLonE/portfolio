"""Characterization tests: pin current behaviour of the existing API so new work can't silently break it."""
import pytest
from sqlalchemy import select

from app.models.domain import ChatLog, ContactSubmission, GithubStatsCache
from tests import factories as f

pytestmark = pytest.mark.usefixtures("db")

CRUD = [
    ("experience", f.experience, {"role": "Senior Dev"}),
    ("projects", f.project, {"title": "Renamed"}),
    ("skills", f.skill, {"name": "Rust"}),
    ("achievements", f.achievement, {"title": "Won again"}),
]


@pytest.mark.parametrize("path", ["/api/experience", "/api/projects", "/api/skills", "/api/achievements"])
async def test_lists_empty(client, path):
    r = await client.get(path)
    assert r.status_code == 200 and r.json() == []


@pytest.mark.parametrize("path", ["/api/profile", "/api/github-stats"])
async def test_singletons_404_when_missing(client, path):
    assert (await client.get(path)).status_code == 404


@pytest.mark.parametrize("resource,make,change", CRUD)
async def test_crud_roundtrip(client, admin_headers, resource, make, change):
    r = await client.post(f"/api/{resource}", json=make(), headers=admin_headers)
    assert r.status_code == 200, r.text
    item = r.json()
    assert (await client.get(f"/api/{resource}")).json() == [item]

    r = await client.put(f"/api/{resource}/{item['id']}", json=make(**change), headers=admin_headers)
    assert r.status_code == 200 and all(r.json()[k] == v for k, v in change.items())

    r = await client.delete(f"/api/{resource}/{item['id']}", headers=admin_headers)
    assert r.json() == {"status": "deleted"}
    assert (await client.get(f"/api/{resource}")).json() == []


@pytest.mark.parametrize("resource,make,_", CRUD)
async def test_update_delete_missing_404(client, admin_headers, resource, make, _):
    assert (await client.put(f"/api/{resource}/999", json=make(), headers=admin_headers)).status_code == 404
    assert (await client.delete(f"/api/{resource}/999", headers=admin_headers)).status_code == 404


@pytest.mark.parametrize("resource,make,_", CRUD)
async def test_create_requires_token(client, resource, make, _):
    r = await client.post(f"/api/{resource}", json=make(), headers={"x-admin-token": "nope"})
    assert r.status_code == 401
    assert (await client.get(f"/api/{resource}")).json() == []


async def test_profile_upsert_with_ui_payload(client, admin_headers):
    r = await client.put("/api/profile", json={**f.PROFILE, "id": 1, "updated_at": "2025-01-01T00:00:00"},
                         headers=admin_headers)
    assert r.status_code == 200, r.text
    got = (await client.get("/api/profile")).json()
    assert got["name"] == "Test User" and got["id"] == 1
    # editing again updates in place (still a single row)
    await client.put("/api/profile", json={**got, "name": "New Name"}, headers=admin_headers)
    assert (await client.get("/api/profile")).json()["name"] == "New Name"


async def test_ordering_and_featured_filter(client, admin_headers):
    for title, order, featured in [("B", 2, False), ("A", 1, True), ("C", 3, True)]:
        await client.post("/api/projects", json=f.project(title=title, order=order, featured=featured),
                          headers=admin_headers)
    assert [p["title"] for p in (await client.get("/api/projects")).json()] == ["A", "B", "C"]
    assert [p["title"] for p in (await client.get("/api/projects?featured=true")).json()] == ["A", "C"]

    await client.post("/api/experience", json=f.experience(company="Old", start_date="2020-01-01"), headers=admin_headers)
    await client.post("/api/experience", json=f.experience(company="New", start_date="2024-01-01"), headers=admin_headers)
    assert [e["company"] for e in (await client.get("/api/experience")).json()] == ["New", "Old"]


async def test_github_stats_returned_when_cached(client, db):
    db.add(GithubStatsCache(id=1, total_commits=5, total_prs=1, total_repos=2,
                            contribution_calendar={}, top_languages=[]))
    await db.commit()
    r = await client.get("/api/github-stats")
    assert r.status_code == 200 and r.json()["total_commits"] == 5


async def test_contact_saved(client, db):
    r = await client.post("/api/contact", json={"name": "A", "email": "a@b.c", "message": "hi"})
    assert r.json()["status"] == "success"
    rows = (await db.execute(select(ContactSubmission))).scalars().all()
    assert [(c.name, c.status) for c in rows] == [("A", "new")]


async def test_chat_logs_admin_only_and_filterable(client, db, admin_headers):
    assert (await client.get("/api/chat-logs")).status_code == 422  # header missing
    db.add_all([
        ChatLog(user_query="hello", bot_response="hi", intent="greeting", latency_ms=1, total_tokens=1, retries=0, api_key_used="k"),
        ChatLog(user_query="projects?", bot_response="list", intent="portfolio", latency_ms=1, total_tokens=1, retries=0, api_key_used="k"),
    ])
    await db.commit()
    r = await client.get("/api/chat-logs?intent=greeting", headers=admin_headers)
    assert [c["user_query"] for c in r.json()] == ["hello"]
    r = await client.get("/api/chat-logs/intents", headers=admin_headers)
    assert r.json() == ["greeting", "portfolio"]


async def test_chat_persists_log(client, db, monkeypatch):
    from app.api import endpoints

    async def fake_invoke(state):
        return {"final_response": "pong", "intent": "test", "latency_ms": 3, "total_tokens": 7}
    monkeypatch.setattr(endpoints.agent, "ainvoke", fake_invoke)

    r = await client.post("/api/chat", json={"message": "ping"})
    assert r.json() == {"reply": "pong"}
    log = (await db.execute(select(ChatLog))).scalars().one()
    assert (log.user_query, log.intent, log.total_tokens) == ("ping", "test", 7)
