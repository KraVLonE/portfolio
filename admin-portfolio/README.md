# Admin Portfolio (Dashboard)

This directory contains the secure backend Admin UI, allowing authorized users to manage the portfolio's content directly from the browser. 

## Features
- **Secure Authentication**: Requires the `ADMIN_SECRET_KEY` (configured in the backend `.env`) to access.
- **Full CRUD Management**: Beautiful glowing editor panels to Add, Edit, and Delete:
  - Profile Information & Social Links
  - Work Experience
  - Featured Projects
  - Tech Skills (with virtual category state management)
  - Achievements & Milestones
- **Custom Tag Builder**: Easily add array-based pointers and tech stacks using the inline tag builder.

## Local Development

If you want to work on the Admin UI locally with hot-reloading:

1. Ensure the backend is running via Docker (`docker compose up db backend -d`).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
4. The dev server runs on `http://localhost:5174` (or whatever Vite assigns) and automatically proxies `/api/*` requests to the local backend on port `8000`.

## Production Architecture
This dashboard is completely isolated from the main website. It runs in its own Docker container and is accessed via the `admin.kravlone.xyz` subdomain. The Traefik edge router automatically forwards traffic to this container's internal Nginx server, which serves the compiled React dashboard securely.
