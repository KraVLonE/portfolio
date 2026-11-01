# Run before every commit: backend tests + shared UI tests + frontend typecheck/lint/build.
# First time: `npm install` at repo root (npm workspaces).
.PHONY: test test-backend test-shared test-web test-admin

test: test-backend test-shared test-web test-admin

test-backend:
	$(MAKE) -C portfolio-backend test

test-shared:
	npm run typecheck -w @kravlone/shared && npm test -w @kravlone/shared

test-web:
	cd web-portfolio && npx tsc -b && npm run lint && npm run build

test-admin:
	cd admin-portfolio && npx tsc -b && npm run lint && npm run build
