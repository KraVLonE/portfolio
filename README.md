# B Sai Sannidh - Full Stack AI Portfolio

A modern, containerized full-stack portfolio built with **React (Vite)**, **FastAPI**, **PostgreSQL**, and a **LangGraph-powered AI Chatbot**.

---

## 🏗️ Architecture
- **Frontend**: React (Vite, TypeScript), TailwindCSS, served by Nginx.
- **Backend**: FastAPI (Python 3.12), SQLAlchemy (Async), Uvicorn.
- **Database**: PostgreSQL 15 (Alpine).
- **AI Agent**: LangGraph with Gemini 3.8 Flash, featuring PII masking, RAG over the portfolio database, strict intent classification, and API key rotation.
- **Deployment**: Docker Compose for seamless orchestration across local and production environments.

---

## 💻 Local Setup & Development

### 1. Prerequisites
- [Docker](https://www.docker.com/products/docker-desktop/) and Docker Compose installed.
- Git installed.

### 2. Environment Variables
In the `portfolio-backend` folder, copy the example environment file:
```bash
cp portfolio-backend/.env.example portfolio-backend/.env
```
Edit `portfolio-backend/.env` and add your Gemini API keys (comma-separated if you have multiple for rotation).

### 3. Start the Application
Run Docker Compose from the root repository folder to build and start the containers:
```bash
docker compose up --build -d
```
*(Docker will automatically run database migrations on startup).*

### 4. Seed the Database
Because it's a fresh database, you need to populate it with your profile data. Run the seed script **inside** the running backend container:
```bash
docker exec -it portfolio-backend-1 python seed_db.py
```
*(You only need to do this once. The database is stored in a persistent Docker volume and survives container restarts).*

### 5. Access the App
- **Website:** [http://localhost:8080](http://localhost:8080)
- **API Docs:** [http://localhost:8080/api/docs](http://localhost:8080/api/docs)

---

## 🚀 Production Deployment (AWS EC2)

The production setup uses a slightly modified configuration (`docker-compose.prod.yml`) that overrides the local setup to handle **HTTPS/SSL certificates** automatically.

### 1. Clone the Repository on EC2
SSH into your EC2 instance and clone the repository:
```bash
git clone <your-github-repo-url>
cd portfolio
```
*(Don't forget to create and configure `portfolio-backend/.env` just like you did locally).*

### 2. Generate SSL Certificates (Certbot)
We use Let's Encrypt to generate free HTTPS certificates. Make sure no other web servers (like Nginx or older Docker containers) are occupying port 80.
```bash
# Stop containers if they are running
docker compose down

# Install Certbot
sudo apt update
sudo apt install certbot

# Generate Certificates (Stand-alone mode)
sudo certbot certonly --standalone -d kravlone.xyz -d www.kravlone.xyz
```

### 3. Start Production Containers
Start the application using both compose files. The `.prod.yml` file overrides the frontend to listen on port 443 and maps the newly created Let's Encrypt certificates into the Nginx container.
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

### 4. Seed the Production Database
Just like local development, seed your production database once:
```bash
docker exec -it portfolio-backend-1 python seed_db.py
```

Your portfolio is now live, secure, and fully functional at `https://kravlone.xyz`!

---

## 🧹 Useful Maintenance Commands

- **View Live Logs:** 
  `docker compose logs -f`
- **Stop Containers:** 
  `docker compose down`
- **Clean up old dangling images (frees up disk space after rebuilds):** 
  `docker image prune -f`
- **Renew SSL Certificates (Run every ~90 days on host):** 
  `docker compose down && sudo certbot renew && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
