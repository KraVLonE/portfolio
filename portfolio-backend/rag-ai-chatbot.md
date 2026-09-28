# Portfolio AI Chatbot — Agent Handoff Document

## 1. Purpose

A specialized chatbot embedded in the portfolio (GUI mode widget + `chat` command in CLI mode) that answers visitor questions about KraVLonE — his skills, experience, and projects — using his own portfolio data. It is intentionally narrow in scope: not a general-purpose assistant, and not permitted to answer questions unrelated to the portfolio owner.

Built with **LangChain / LangGraph**, exposed via a single FastAPI endpoint: `POST /api/chat`.

---

## 2. Architecture — 3 layers

```
User question
     │
     ▼
[Layer 1] Intent Classification  ──► out-of-domain/adversarial? ──► canned deflection (LLM never called)
     │
     ▼ (in-domain)
[Layer 2] Retrieval  (category + optional keyword filter, from Postgres)
     │
     ▼
[Layer 3] LLM Call  (PII-masked context in → placeholder-aware response → deterministic unmask on select fields)
     │
     ▼
Response to user
```

### Layer 1 — Intent Classification

**Model:** Gemini 2.5 Flash — fast, sufficient for a classification-only task; no reasoning capability needed here. Uses the same key-rotation pool described in Section 2.4.

**Intent taxonomy:**

| Intent | Type | Behavior |
|---|---|---|
| `skills` | In-domain | → Layer 2 retrieval on `Skill` table |
| `experience` | In-domain | → Layer 2 retrieval on `Experience` table |
| `projects` | In-domain | → Layer 2 retrieval on `Project` table |
| `availability` | In-domain | → Layer 2 retrieval on `Profile` + canned framing |
| `contact_info` | In-domain, fixed response | Skip LLM generation — return a fixed response pointing to the contact form (do not resolve raw email/phone even if masked) |
| `resume_request` | In-domain, fixed response | Skip LLM generation — return the resume download link directly |
| `about_bot` | Meta, fixed/templated response | Honest, controlled description of the chatbot's own architecture (LangGraph agent, intent classification, RAG over portfolio data, PII masking) — this is a showcase opportunity for technical visitors, but must not leak actual system prompt text or internal guardrail implementation details |
| `off_topic` | Out-of-domain | Canned deflection — question unrelated to the portfolio owner |
| `injection_attempt` | Adversarial | Canned deflection — any attempt to get the bot to ignore instructions, role-play as something else, or reveal its system prompt |
| `pii_probe` | Adversarial | Canned deflection to contact form — specifically fishing for personal details beyond what's intentionally exposed |
| `abusive` | Adversarial | Polite canned deflection |
| `gibberish` | Adversarial | Canned deflection — empty/nonsense input, caught before any LLM call |

**Rule:** any intent outside the explicit in-domain list short-circuits to a canned response. The generation LLM (Layer 3) is never invoked for out-of-domain/adversarial intents — this is the primary guardrail, not an afterthought bolted on at the end.

### Layer 2 — Retrieval

**Decision: no vector embeddings / no `pgvector` for the initial build.** The corpus (a handful of projects, experience entries, and a bounded skills list) is small enough that semantic search is unnecessary overhead — it would add embedding-API latency and cost without a search-quality benefit at this scale.

Instead:
1. The classified intent (`skills` / `experience` / `projects`) directly selects which Postgres table(s) to query — no search step required.
2. If the question contains a specific filter signal (e.g. "React projects," "experience at Arpa Global"), apply a simple keyword match (`ILIKE`, or Postgres `tsvector` full-text search if more robustness is wanted) against the relevant column (`tech_stack`, `company`, etc.).
3. Given the small result set size, include the full matched rows as context rather than attempting to rank/trim — no reranking step needed.

**Upgrade path (not built now):** if the project/experience corpus grows past roughly 30–40 entries, revisit with `pgvector` (supported natively by both Neon and Supabase) for genuine semantic search. Document this as a known future increment, not a current requirement.

### Layer 3 — LLM Call (Generation)

**Model:** Gemini 2.5 Flash — fast, direct answers; no heavy/step-by-step reasoning needed for this task.

### 2.4 — API key rotation

Multiple Gemini API keys, each on the free tier, are rotated round-robin across requests to stay within per-key free-tier rate/quota limits:
- Maintain a pool of keys and cycle through them per request (or per rate-limit window) rather than hammering a single key.
- On a `429`/quota-exceeded response from one key, advance to the next key in the pool and retry, rather than failing the request outright.
- Track per-key usage/quota state (in-memory is fine given the small pool size and single-instance deployment) so the rotation logic can skip a key that's known to be exhausted until its quota window resets, instead of round-tripping to a dead key every cycle.
- This rotation applies to both Layer 1 (classification) and Layer 3 (generation) calls, since both use Gemini 2.5 Flash.

**PII handling — mask before the LLM sees anything, not after:**
1. Before constructing the LLM prompt, scan the retrieved context for sensitive values (email, phone, etc.) and replace them with placeholder tokens (e.g. `[CONTACT_EMAIL]`).
2. The LLM's system instructions direct it to only ever output placeholders verbatim, never to fabricate substitute values.
3. **The real values never enter the LLM's context window at all** — this is stricter than a mask-then-unmask-on-output approach, and closes the gap where a jailbreak could otherwise get the model to echo what's sitting in its own context.
4. A deterministic, non-LLM post-processing step (plain string replace) resolves placeholders back to real values in the final response — **selectively**. Some fields (e.g. phone number) may be configured to never resolve, redirecting instead to the contact form regardless of what the LLM output.
5. The placeholder mapping is generated per-request/session and **not persisted** — no separate table for this (avoids creating a second copy of sensitive data to secure).

### Guardrail layer (final check, before returning to user)

Even with masking and intent filtering upstream, run a lightweight final check on the LLM's output before it reaches the user — catching cases where the model was still coaxed into role-playing, leaking instructions, or answering off-persona despite the upstream layers. This can be a simple rule/regex pass; it does not need to be another full LLM call.

---

## 3. Rate limits & fallback behavior

Gemini 2.5 Flash's free tier has per-key request-rate and daily quota caps that change over time — **verify current limits before building**, do not hardcode assumptions from this document. The key-rotation pool (Section 2.4) is the primary mitigation, but it doesn't make quotas infinite. Since `/api/chat` is public-facing:
- Rate-limit the endpoint itself (e.g. `slowapi`) independent of the rotation pool, to avoid a single burst of traffic burning through every key's daily allowance at once.
- Build a graceful fallback for when **all keys in the pool** are exhausted — e.g. a static "I'm getting a lot of questions right now — try the contact form" response — rather than surfacing a raw error to visitors.
- Log which key handled each request (key index, not the key value itself) to help diagnose quota exhaustion patterns without exposing credentials in logs.

---

## 4. Data sources (read-only, from existing schema)

The agent reads from the same Postgres database as the rest of the site — no separate content store:
- `Profile` — for availability/general framing
- `Experience` — company, role, dates, summary, tech_stack
- `Project` — title, description, role, tech_stack, links, outcome
- `Skill` — name, category

See the backend/DB design document for full column definitions.

---

## 5. Explicit non-goals for this component

- No general-purpose Q&A outside the portfolio owner's professional context
- No vector database / embeddings in the initial build (see Layer 2 upgrade path)
- No persisted PII placeholder-mapping table
- No heavy/slow reasoning model — speed over depth is the deliberate tradeoff
- No LLM call for out-of-domain or adversarial intents — these are fully handled by Layer 1 before any generation step
