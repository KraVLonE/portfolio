# Portfolio — Requirements Document

## 1. Overview

Two synced portfolio properties sharing one centralized backend and database:

1. **npm terminal portfolio package** — already exists; needs centralizing against the shared backend and general improvement.
2. **Web portfolio** — new build, with two modes:
   - **GUI mode** — default landing experience, single-page/scroll-based
   - **CLI mode** — faithful in-browser terminal emulator, route-based navigation

Both properties read from the same API/database, so content (experience, projects, skills, etc.) is entered once and stays in sync everywhere.

**Primary goal:** job search, with technical-depth showcasing as a secondary goal.

**Stack:** React (frontend), FastAPI (backend), PostgreSQL (database).

---

## 2. Site structure

- **GUI mode:** single page, scroll-based, sectioned — Hero → About → Experience → Projects → Skills → Contact.
- **CLI mode:** route-based, filesystem-style (`cd projects`, `ls`, `cat project-name`), so each location is a real URL and shareable/bookmarkable.
- **Mode switch:** persistent toggle, always reachable. GUI is the default for first-time visitors (recruiters); CLI is discoverable, not the default barrier to entry.

---

## 3. Feature requirements

### 3.1 Core content sections
- **Projects** — problem statement, personal role/contribution, tech stack, outcome/metric (if available), links (repo, live demo). Prioritized as the primary selling point.
- **Experience** — company, role, dates, impact-framed summary, tech stack.
- **Skills** — grouped by proficiency/context (e.g. "Daily driver" / "Exploring" / "Familiar"), not a flat tag list.
- **Currently exploring** — signals active learning/growth (e.g. ongoing study, side projects).
- **Resume + contact** — reachable from both GUI and CLI modes.

### 3.2 CLI mode (terminal emulator)
- Real command parsing with flag support (e.g. `ls -la projects`)
- Tab-completion for commands and paths
- Command history (up/down arrows), persisted via `localStorage`
- `help` command, with a first-load hint so new visitors aren't stuck at a blank prompt
- Optional easter-egg commands (e.g. `sudo hire-me`, `whoami`) for engagement

### 3.3 Coding profile cards
- Codeforces and LeetCode stats shown via **pre-rendered external image cards** (already has working URLs — no backend scraping/build required):
  - `codeforces-stat-card.vercel.app` (theme: cyberpunk)
  - `leetcard.jacoblin.cool` (theme: dark)
- Embedded as plain `<img>` elements; URLs stored on the `Profile` record.

### 3.4 GitHub stats
- Contribution heatmap (calendar graph)
- Total commits / PRs / repos as stat tiles
- Top languages by usage (bar or donut)
- Data pulled from GitHub's API on a schedule and cached — not fetched live per page view.
- Deliberately excludes stars/followers (vanity metrics, not useful for a job-search narrative).

### 3.5 AI chatbot agent
- Built with LangChain/LangGraph; answers visitor questions about KraVLonE using his own portfolio data (RAG).
- **Intent classification layer** — routes questions into allowed categories (skills, experience, projects, availability, general/greeting) vs. disallowed (off-topic, prompt-injection/jailbreak attempts); disallowed intents get a canned deflection, never reach the LLM with real context.
- **PII handling** — sensitive values (email, phone, etc.) are masked with placeholder tokens *before* being placed in the LLM's context (not after); the LLM only ever sees and echoes placeholders. A deterministic, non-LLM post-processing step resolves placeholders back to real values in the final response — selectively, i.e. some fields (like phone) may never resolve and instead redirect to the contact form.
- **Guardrail layer** — a final check on the output before it reaches the user, to catch injection attempts that try to get the bot to role-play, leak instructions, or answer off-persona.
- No persisted PII-mapping table — placeholder mapping is generated per-request/session, not stored.

### 3.6 Admin / content management
- A way to edit portfolio data (experience, projects, skills, profile) at any time without redeploying.
- **separate, minimal admin app** (own auth boundary) rather than a hidden route on the public site, to keep the public site free of any admin-only attack surface.
- Single admin user; JWT-based auth is sufficient — no need for full multi-user account management.

### 3.7 Blogging
- **Deferred** — flagged as wanted, but held for a later phase due to effort/scope. Will require its own schema design (rich content, unlike the rest of the flat/structured data model) when picked back up.

### 3.8 Supporting features (confirmed)
- **Command palette** (Cmd/Ctrl+K) in GUI mode — quick navigation, ties GUI mode back to the CLI-native theme.
- **Privacy-friendly analytics** (e.g. Plausible/self-hosted Umami) — avoids Google Analytics; tracks recruiter engagement without invasive tracking.
- **OpenGraph / SEO meta tags** — proper link-preview cards when the portfolio is shared (LinkedIn, Slack, email) during the job search.
- **Contact form** — with spam protection (honeypot field), instead of a bare mailto link.

### 3.9 Open items
- **Resume delivery**: resume is maintained and frequently edited in Overleaf. How to auto-sync the latest compiled PDF into the portfolio (without a manual re-upload step each time) is still undecided — to be revisited.

---

## 4. Non-goals (for now)
- Multi-user / multi-admin support
- Public write API (all content edits go through the authenticated admin path)
- Live (non-cached) third-party API calls on every page view for coding stats or GitHub data
