# Web Portfolio (Frontend)

This directory contains the main user-facing React application for the portfolio. It is built using **Vite**, **TypeScript**, and **TailwindCSS**, and features a highly immersive, interactive Cyberpunk theme.

## Features
- **3D Interactive AI Terminal**: Users can chat with the LangGraph backend.
- **Dynamic Content**: All Projects, Experience, and Skills are fetched dynamically from the PostgreSQL database via the FastAPI backend.
- **Cyberpunk UI**: Glowing neon borders, scanlines, matrix rain effects, and terminal-style aesthetics.

## Local Development

If you want to run the frontend independently of Docker for fast hot-reloading:

1. Ensure the backend is running via Docker (`docker compose up db backend -d`).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
4. The dev server runs on `http://localhost:5173` and automatically proxies `/api/*` requests to the local backend running on port `8000`.

## Production Docker Build
In production, this app is compiled via `npm run build` inside a Docker multi-stage build. The resulting static HTML/JS/CSS files are served by a lightweight **Nginx** container. 
*Note: In production, this Nginx container does not handle SSL or edge routing—it strictly serves files and proxies its own `/api/` calls to the backend, sitting safely behind the global Traefik proxy.*
