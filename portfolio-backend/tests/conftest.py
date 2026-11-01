import os
import subprocess
import sys
from pathlib import Path

# Must run before `app` is imported: settings + engine read DATABASE_URL at import time.
TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5433/portfolio_test"
)
if not TEST_DB_URL.rsplit("/", 1)[-1].endswith("_test"):
    raise RuntimeError(f"Refusing to run tests against non-test database: {TEST_DB_URL}")
os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ.setdefault("ADMIN_SECRET_KEY", "test-admin-key")
os.environ["GITHUB_TOKEN"] = ""

import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import AsyncSessionLocal, Base, engine  # noqa: E402
from app.main import app  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parent.parent
ADMIN = {"x-admin-token": settings.ADMIN_SECRET_KEY}


def alembic(*args: str) -> None:
    # Subprocess: alembic's env.py calls asyncio.run(), which can't nest in pytest's loop.
    subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND_DIR, env={**os.environ}, check=True, capture_output=True,
    )


@pytest.fixture(scope="session")
async def migrated_db():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:  # fail loudly, never skip silently
        pytest.fail(
            f"Test DB unreachable ({TEST_DB_URL}): {e}\n"
            "Start it with: docker compose -f docker-compose.test.yml up -d --wait"
        )
    alembic("downgrade", "base")
    alembic("upgrade", "head")
    yield
    await engine.dispose()


@pytest.fixture
async def db(migrated_db):
    """Clean DB per test. Yields a session for arranging test data."""
    tables = ", ".join(f'"{t.name}"' for t in Base.metadata.sorted_tables)
    async with engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    async with AsyncSessionLocal() as session:
        yield session


@pytest.fixture
async def client():
    # ASGITransport doesn't run lifespan, so the GitHub scheduler stays off.
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture
def admin_headers():
    return dict(ADMIN)


@pytest.fixture(autouse=True)
def reset_rate_limits():
    from app.core.rate_limit import limiter
    limiter.reset()
