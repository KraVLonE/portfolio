# Build context is the repo root (npm workspaces: needs shared/ + root lockfile).
# Build stage
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY web-portfolio/package.json web-portfolio/
COPY admin-portfolio/package.json admin-portfolio/
RUN npm ci --workspace=admin-portfolio --workspace=@kravlone/shared --no-audit --no-fund

COPY shared shared
COPY admin-portfolio admin-portfolio

# Build the Vite app. The .env variables (if any) need to be present here or Vite will build with defaults.
RUN npm run build --workspace=admin-portfolio

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/admin-portfolio/dist /usr/share/nginx/html

# Copy custom nginx config
COPY admin-portfolio/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
