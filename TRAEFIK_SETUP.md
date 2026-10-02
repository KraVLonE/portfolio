# Global Traefik Setup on EC2

To achieve the decoupled routing architecture, you need to set up Traefik as a global reverse proxy on your EC2 instance. This allows you to host multiple isolated projects on the same server effortlessly.

### 1. Initialize the Proxy Directory
SSH into your EC2 instance and create a new directory for the global proxy:
```bash
cd ~
mkdir global-proxy
cd global-proxy
```

### 2. Prepare the SSL Storage
Create an empty file to securely store your Let's Encrypt SSL certificates. Traefik requires this file to have strict permissions:
```bash
touch acme.json
chmod 600 acme.json
```

### 3. Create the Global Docker Network
Create an external Docker network. All your future projects (portfolio, blog, tools) will connect to this network so Traefik can route traffic to them.
```bash
docker network create traefik-public
```

### 4. Create the Traefik `docker-compose.yml`
Create a `docker-compose.yml` file in the `global-proxy` directory and paste this exact configuration:
```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    container_name: traefik
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./acme.json:/acme.json
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      # Auto-redirect HTTP to HTTPS
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
      - "--entrypoints.web.http.redirections.entryPoint.scheme=https"
      - "--entrypoints.websecure.address=:443"
      # Let's Encrypt Configuration
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      # IMPORTANT: Change this to your actual email!
      - "--certificatesresolvers.letsencrypt.acme.email=your-email@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/acme.json"
    networks:
      - traefik-public

networks:
  traefik-public:
    external: true
```
> **Note**: Don't forget to update `your-email@example.com` in the command list! Let's Encrypt requires this for certificate expiration notices.

### 5. Start the Edge Router
```bash
docker compose up -d
```
Traefik is now running 24/7 on your server, listening on ports 80 and 443!

---

## Deploying Your Portfolio

The codebase has already been updated to support this new architecture. Nginx inside the portfolio containers has been stripped down to *just* serve React files, and the ports have been locked down.

Go to your portfolio directory on the server, pull the latest code, and deploy:
```bash
cd ~/your-portfolio-repo
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### What happens next?
1. The portfolio containers start up and join the `traefik-public` network.
2. Traefik detects them instantly via the Docker socket.
3. Traefik reads the labels in `docker-compose.prod.yml` mapping `kravlone.xyz` and `admin.kravlone.xyz`.
4. Traefik reaches out to Let's Encrypt in the background to grab SSL certificates.
5. Your site is live and securely routed!
