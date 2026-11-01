"""Security: no write route may be reachable without a valid admin token."""
import pytest

from app.main import app

# Public write endpoints that intentionally need no admin token.
PUBLIC_WRITES = {"/api/contact", "/api/chat", "/api/admin/login", "/api/blog/posts/{slug}/comments"}
WRITE_METHODS = {"post", "put", "patch", "delete"}


def _requires_admin_header(op: dict) -> bool:
    return any(
        p.get("in") == "header" and p.get("name") == "x-admin-token" and p.get("required")
        for p in op.get("parameters", [])
    )


def test_openapi_sees_routes():
    # Guard against the check below silently inspecting nothing.
    assert len(app.openapi()["paths"]) > 10


def test_every_write_route_requires_admin_token():
    unprotected = [
        f"{method.upper()} {path}"
        for path, ops in app.openapi()["paths"].items()
        for method, op in ops.items()
        if method in WRITE_METHODS and path not in PUBLIC_WRITES and not _requires_admin_header(op)
    ]
    assert unprotected == []


@pytest.mark.parametrize(
    "method,path",
    [
        ("PUT", "/api/admin/profile"),
        ("POST", "/api/admin/experience"),
        ("DELETE", "/api/admin/projects/1"),
        ("POST", "/api/admin/skills"),
    ],
)
async def test_legacy_admin_routes_not_reachable(client, method, path):
    r = await client.request(method, path, json={}, headers={"Authorization": "Bearer x"})
    assert r.status_code in (404, 405)


@pytest.mark.parametrize("token", [None, "", "wrong"])
async def test_admin_write_rejects_bad_token(client, token):
    headers = {} if token is None else {"x-admin-token": token}
    r = await client.delete("/api/skills/1", headers=headers)
    assert r.status_code in (401, 422)


@pytest.mark.parametrize("body", [{}, {"key": ""}, {"key": "wrong"}, {"key": 123}])
async def test_admin_login_rejects_bad_key(client, body):
    r = await client.post("/api/admin/login", json=body)
    assert r.status_code == 401


async def test_admin_login_accepts_correct_key(client):
    from app.core.config import settings
    r = await client.post("/api/admin/login", json={"key": settings.ADMIN_SECRET_KEY})
    assert r.status_code == 200 and r.json() == {"authenticated": True}


async def test_admin_login_rate_limited(client):
    codes = [(await client.post("/api/admin/login", json={"key": "x"})).status_code for _ in range(4)]
    assert codes == [401, 401, 401, 429]
