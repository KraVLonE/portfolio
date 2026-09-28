.PHONY: dev migrate upgrade

dev:
	. venv/bin/activate && uvicorn app.main:app --reload

migrate:
	. venv/bin/activate && alembic revision --autogenerate -m "$(m)"

upgrade:
	. venv/bin/activate && alembic upgrade head
