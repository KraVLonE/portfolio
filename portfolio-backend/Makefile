.PHONY: dev migrate upgrade test test-db

dev:
	. venv/bin/activate && uvicorn app.main:app --reload

migrate:
	. venv/bin/activate && alembic revision --autogenerate -m "$(m)"

upgrade:
	. venv/bin/activate && alembic upgrade head

test-db:
	docker compose -f ../docker-compose.test.yml up -d --wait

test: test-db
	venv/bin/pytest -q $(args)
