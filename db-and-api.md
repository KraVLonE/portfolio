# Portfolio — Backend & Database Design

## 1. Stack & tooling

- **Database:** PostgreSQL, hosted on a free-tier managed provider (Neon or Supabase recommended — scale-to-zero pricing fits a low/spiky-traffic portfolio).
- **Backend:** FastAPI + SQLAlchemy (or SQLModel), async via `asyncpg`.
- **Migrations:** Alembic, from day one.
- **Auth (admin only):** JWT — short-lived access token + refresh token.
- **Scheduled jobs:** `APScheduler` inside the FastAPI app (or an external cron script) for GitHub stats refresh.
- **Rate limiting:** `slowapi` (or equivalent) on `/api/contact` and `/api/chat` — both are public write/compute endpoints.

### Data modeling principle
Fields are **flat/typed columns by default**. JSON is used only where a field's shape or cardinality genuinely varies per row (e.g. a project's tech stack, which differs in length per project). Fields with a small, fixed, known set of attributes (like `Profile`) are flat columns — better for admin-form simplicity, validation, and avoiding JSON-key typos.

---

## 2. Database schema

### `Profile` (singleton, id = 1)
| Column | Type | Notes |
|---|---|---|
| `id` | `SMALLINT PRIMARY KEY` | Always `1` |
| `name` | `VARCHAR` | |
| `title` | `VARCHAR` | |
| `tagline` | `VARCHAR` | |
| `bio_short` | `TEXT` | |
| `email` | `VARCHAR` | |
| `location` | `VARCHAR` | |
| `resume_url` | `VARCHAR` (nullable) | Pending Overleaf-sync decision |
| `github_url` | `VARCHAR` | |
| `linkedin_url` | `VARCHAR` | |
| `twitter_url` | `VARCHAR` (nullable) | |
| `codeforces_card_url` | `VARCHAR` | Pre-rendered external image URL |
| `leetcode_card_url` | `VARCHAR` | Pre-rendered external image URL |
| `updated_at` | `TIMESTAMP` | Auto-updated on save |

### `Experience`
| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `company` | `VARCHAR` | |
| `role` | `VARCHAR` | |
| `start_date` | `DATE` | |
| `end_date` | `DATE` (nullable) | `NULL` → "Present" |
| `pointers` | `JSON` (array of strings) |  |
| `tech_stack` | `JSON` (array of strings) | Denormalized by design |
| `order` | `INTEGER` | Manual sort control |

### `Project`
| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `title` | `VARCHAR` | |
| `one_liner` | `VARCHAR` | |
| `pointers` | `JSON` (array of strings) | |
| `role` | `VARCHAR` | Your specific contribution |
| `tech_stack` | `JSON` (array of strings) | Denormalized |
| `links` | `JSON` (object: `{repo, live_demo}`) | Denormalized — shape varies per project |
| `outcome` | `VARCHAR` (nullable) | Optional metric/one-liner |
| `featured` | `BOOLEAN` | Controls what surfaces first |
| `order` | `INTEGER` | Manual sort control |

### `Skill`
| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `name` | `VARCHAR` | |
| `category` | `VARCHAR` | e.g. "Daily driver" / "Exploring" / "Familiar" |
| `order` | `INTEGER` | Manual sort control |

### `GithubStatsCache`
| Column | Type | Notes |
|---|---|---|
| `id` | `SMALLINT PRIMARY KEY` | Singleton, or keyed by date if history is wanted later |
| `total_commits` | `INTEGER` | |
| `total_prs` | `INTEGER` | |
| `total_repos` | `INTEGER` | |
| `contribution_calendar` | `JSON` | Daily contribution counts |
| `top_languages` | `JSON` (array of `{name, pct}`) | |
| `last_synced_at` | `TIMESTAMP` | |

### `ContactSubmission`
| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `name` | `VARCHAR` | |
| `email` | `VARCHAR` | |
| `message` | `TEXT` | |
| `created_at` | `TIMESTAMP` | |
| `status` | `VARCHAR` | `new` / `read` / `replied` — simple triage |

### `AdminUser`
| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `username` | `VARCHAR` | |
| `hashed_password` | `VARCHAR` | |
| `created_at` | `TIMESTAMP` | |

**Not in the schema:**
- Codeforces/LeetCode data — external pre-rendered image embeds, no DB involvement.
- Blog — deferred; will need its own table(s) with genuine rich-content storage when designed.
- Chatbot PII placeholder mapping — generated per-request/session, intentionally not persisted (avoids creating a second copy of sensitive data to secure).

---

## 3. API surface

### Public, read-only
```
GET  /api/profile
GET  /api/experience
GET  /api/projects            (?featured=true)
GET  /api/skills
GET  /api/github-stats
```

### Public, write (rate-limited)
```
POST /api/contact             — writes ContactSubmission, sends notification email; honeypot field for spam
POST /api/chat                — LangGraph chatbot agent endpoint
```

### Admin-only (JWT-protected)
```
POST   /api/auth/login
PUT    /api/admin/profile
POST/PUT/DELETE /api/admin/experience/{id}
POST/PUT/DELETE /api/admin/projects/{id}
POST/PUT/DELETE /api/admin/skills/{id}
GET    /api/admin/contact-submissions
```

No public write API exists beyond `/api/contact` and `/api/chat` — all content management goes through the authenticated admin path.

---

## 4. Chatbot agent architecture (LangGraph)

1. **Intent classification node** — classifies the incoming question (skills / experience / projects / availability / general vs. off-topic / injection attempt). Disallowed intents short-circuit to a canned deflection and never reach the LLM with real context.
2. **RAG retrieval node** — pulls relevant chunks from the portfolio's own Postgres data (same source of truth as the rest of the site — no separate content store).
3. **PII masking** — sensitive values are replaced with placeholder tokens (e.g. `[CONTACT_EMAIL]`) *before* being placed in the LLM's context; the LLM is instructed to only ever output placeholders. Real values never enter the LLM's context window.
4. **Deterministic output resolution** — a plain string-replace step (no LLM involved) swaps placeholders back to real values in the final response, selectively — some fields may be configured to never resolve (e.g. phone number redirects to the contact form instead).
5. **Guardrail node** — a final check on the output before returning to the user, to catch injection attempts that try to make the bot role-play, leak system instructions, or answer off-persona.

---

## 5. Deployment notes

- Coding-profile cards (Codeforces/LeetCode) and GitHub stats are both designed around **caching, not live third-party calls per page view** — keeps page loads fast and avoids third-party rate limits.
- Resume delivery: open item, pending a decision on syncing from Overleaf without manual re-upload.
