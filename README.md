Full Stack Portfolio

A modern, containerized full-stack portfolio built with **React**, **FastAPI**, **PostgreSQL**, and a **LangGraph-powered AI Chatbot**.

---

## 🏗️ Architecture
- **Frontend (`web-portfolio`)**: React (Vite, TypeScript), TailwindCSS, Cyberpunk theme.
- **Admin Panel (`admin-portfolio`)**: Secure, authenticated React dashboard for managing portfolio content (Experience, Projects, Skills, Achievements).
- **Backend (`portfolio-backend`)**: FastAPI (Python 3.12), SQLAlchemy (Async), Uvicorn.
- **Database (`db`)**: PostgreSQL 15 (Alpine).
- **AI Agent**: LangGraph with Gemini Flash, featuring PII masking, RAG over the portfolio database, strict intent classification, and API key rotation.
- **Global Proxy / Edge Router**: Traefik (handles dynamic routing and Let's Encrypt SSL certificates automatically).

---

## 💻 Local Setup & Development

### 1. Prerequisites
- [Docker](https://www.docker.com/products/docker-desktop/) and Docker Compose installed.
- Node.js (for local Vite dev servers, optional).

### 2. Environment Variables
In the `portfolio-backend` folder, copy the example environment file:
```bash
cp portfolio-backend/.env.example portfolio-backend/.env
```
Edit `portfolio-backend/.env` and add:
- Your `ADMIN_SECRET_KEY` (used to log into the Admin panel).
- Your `GEMINI_TOKENS` (comma-separated for rotation).

### 3. Start the Application Locally
Run Docker Compose from the root repository folder. Local development uses `docker-compose.override.yml` to automatically map internal ports to your host machine:
```bash
docker compose up --build -d
```
*(Docker will automatically run database migrations on startup).*

### 4. Seed the Database
Because it's a fresh database, you need to populate it with your profile data. Run the seed script **inside** the running backend container:
```bash
docker exec -it portfolio-backend-1 python seed_db.py
```

### 5. Access the App Locally
- **Portfolio Frontend:** [http://localhost:8082](http://localhost:8082)
- **Admin Panel:** [http://localhost:8081](http://localhost:8081)
- **Backend API & Docs:** [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

---

## 🚀 Production Deployment (AWS EC2)

The production setup uses a strictly decoupled, highly scalable architecture. Nginx containers strictly serve React files, while a global **Traefik** proxy handles internet traffic, SSL, and routing.

### 1. Set up the Global Proxy
Before deploying this repository, you must start the global Traefik edge router on your EC2 instance. 
👉 **Read the full setup guide here: [TRAEFIK_SETUP.md](./TRAEFIK_SETUP.md)**.

### 2. Start Production Containers
Once Traefik is running, clone this repo on your EC2 instance, configure your `.env`, and deploy:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```
Traefik will instantly detect your containers, fetch SSL certificates, and route `kravlone.xyz` to your portfolio and `admin.kravlone.xyz` to your admin panel!

### 3. Seed the Production Database
Seed your production database once:
```bash
docker exec -it portfolio-backend-1 python seed_db.py
```

---

## 🧹 Useful Maintenance Commands

- **View Live Logs:** 
  `docker compose logs -f`
- **Stop Containers:** 
  `docker compose down`
- **Clean up old dangling images (frees up disk space):** 
  `docker image prune -f`
