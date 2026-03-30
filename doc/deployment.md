# NewsFeed Deployment Guide

This guide covers the complete deployment process for NewsFeed using Docker Compose on a VPS.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Files to Create](#3-files-to-create)
4. [Server Setup](#4-server-setup)
5. [Application Deployment](#5-application-deployment)
6. [SSL Certificate Configuration](#6-ssl-certificate-configuration)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Database Management](#8-database-management)
9. [Monitoring and Logging](#9-monitoring-and-logging)
10. [Update Procedures](#10-update-procedures)
11. [Troubleshooting Guide](#11-troubleshooting-guide)
12. [Architecture Overview](#12-architecture-overview)

---

## 1. Overview

### Application Components

| Component  | Technology   | Description                                    |
|:-----------|:-------------|:-----------------------------------------------|
| Frontend   | React + Vite | Virtualized news feed UI with infinite scroll |
| Backend    | NestJS       | REST API with cursor-based pagination          |
| Database   | PostgreSQL   | Persistent storage for posts                   |
| Nginx      | Nginx        | Serves frontend, reverse proxy to backend, SSL termination |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS/Cloud VM                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Docker Network                      │   │
│  │                (newsfeed-network)                    │   │
│  │                                                      │   │
│  │   ┌──────────────────────┐    ┌─────────────┐       │   │
│  │   │     nginx            │    │  postgres   │       │   │
│  │   │  (frontend + proxy)  │───▶│    :5432    │       │   │
│  │   │      :80/443         │    └─────────────┘       │   │
│  │   │        │             │                          │   │
│  │   │   ┌────┴────┐        │                          │   │
│  │   │   │ backend │        │                          │   │
│  │   │   │  :3000  │        │                          │   │
│  │   │   └─────────┘        │                          │   │
│  │   └──────────────────────┘                          │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│           │                                                  │
│           ▼                                                  │
│   ┌───────────────────────────────┐                        │
│   │        Docker Volumes         │                        │
│   │  • postgres_data (database)   │                        │
│   └───────────────────────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow

1. **User Request** → Nginx (port 80/443)
2. **Static Files** → Served directly from nginx (frontend bundle)
3. **API Requests** → Proxied to backend (port 3000 internal)
4. **Database Queries** → Backend connects to postgres (port 5432 internal)

---

## 2. Prerequisites

### VPS Requirements

| Resource | Minimum          | Recommended      |
|:---------|:-----------------|:-----------------|
| RAM      | 2 GB             | 4 GB             |
| CPU      | 1 vCPU           | 2 vCPU           |
| Storage  | 20 GB SSD        | 40 GB SSD        |
| OS       | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Required Software

- Docker Engine 24.0+
- Docker Compose v2.0+

### Domain Name (Optional)

A domain name is optional for initial deployment. You can deploy using just the server IP address with self-signed certificates. For production use with proper SSL, configure a domain name pointing to your server IP.

---

## 3. Files to Create

The following files need to be created in the project root directory before deployment:

### 3.1 Backend Files

#### [`backend/Dockerfile`](../backend/Dockerfile)

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application (includes migrations)
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S -u 1001 -G appgroup appuser

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Change ownership to app user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### 3.2 Nginx + Frontend Container

The nginx container serves the frontend static files and acts as a reverse proxy to the backend.

#### [`nginx/Dockerfile`](../nginx/Dockerfile)

```dockerfile
# Build stage for frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build argument for API URL
ARG VITE_API_URL

# Set environment variable for build
ENV VITE_API_URL=$VITE_API_URL

# Build the frontend
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS production

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Expose ports
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

#### [`nginx/nginx.conf`](../nginx/nginx.conf)

```nginx
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss;

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    # Upstream for backend
    upstream backend {
        server backend:3000;
    }

    # HTTP server - redirect to HTTPS
    server {
        listen 80;
        server_name _;

        # Allow Let's Encrypt challenges
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # Redirect all other requests to HTTPS
        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name _;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;

        # Modern SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;

        # HSTS
        add_header Strict-Transport-Security "max-age=63072000" always;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        root /usr/share/nginx/html;
        index index.html;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "ok";
            add_header Content-Type text/plain;
        }

        # API requests - proxy to backend
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 90s;
        }

        # Cache static assets with hash in filename (immutable)
        location ~* \.(?:css|js|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|ico|webp)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        # All other requests - serve frontend SPA
        location / {
            expires -1;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
            try_files $uri $uri/ /index.html;
        }
    }
}
```

### 3.3 Docker Compose Production Configuration

#### [`docker-compose.prod.yml`](../docker-compose.prod.yml)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: news_feed_postgres
    restart: always
    environment:
      POSTGRES_USER: ${DB_USERNAME:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD is required}
      POSTGRES_DB: ${DB_DATABASE:-news_feed_db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME:-postgres} -d ${DB_DATABASE:-news_feed_db}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - newsfeed-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: news_feed_backend
    restart: always
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: ${DB_USERNAME:-postgres}
      DB_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD is required}
      DB_DATABASE: ${DB_DATABASE:-news_feed_db}
      PORT: 3000
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/docs"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - newsfeed-network

  nginx:
    build:
      context: .
      dockerfile: nginx/Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL:-}
    container_name: news_feed_nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - newsfeed-network

volumes:
  postgres_data:

networks:
  newsfeed-network:
    driver: bridge
```

### 3.4 Utility Scripts

#### [`scripts/generate-dev-certs.sh`](../scripts/generate-dev-certs.sh)

```bash
#!/bin/bash

# Generate self-signed SSL certificates for development/testing
# Usage: ./scripts/generate-dev-certs.sh

SSL_DIR="./nginx/ssl"

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$SSL_DIR/key.pem" \
  -out "$SSL_DIR/cert.pem" \
  -subj "/C=RU/ST=Moscow/L=Moscow/O=NewsFeed/OU=Development/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Set permissions
chmod 644 "$SSL_DIR/cert.pem"
chmod 600 "$SSL_DIR/key.pem"

echo "✅ Self-signed certificates generated in $SSL_DIR"
echo "   Certificate: $SSL_DIR/cert.pem"
echo "   Private key: $SSL_DIR/key.pem"
```

### 3.5 Environment Files

> **Note:** Only one `.env.production` file in the root directory is required for Docker deployment. Docker Compose passes environment variables directly to containers via the `environment:` section in [`docker-compose.prod.yml`](../docker-compose.prod.yml). A separate `backend/.env.production` file is not needed.

#### [`.env.production.example`](../.env.production.example) (root directory)

```env
# Database Configuration
DB_USERNAME=postgres
DB_PASSWORD=<your-secure-password>
DB_DATABASE=news_feed_db

# Frontend Configuration
VITE_API_URL=
```

Create production environment file:

1. Copy `.env.production.example` to `.env.production` in the root directory
2. Update values with secure passwords and configuration

---

## 4. Server Setup

### Initial Server Security

#### SSH Key Authentication

1. Generate SSH keys on your local machine:

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

2. Copy the public key to your server:

```bash
ssh-copy-id root@your_server_ip
```

3. Test SSH key login:

```bash
ssh root@your_server_ip
```

4. Disable password authentication by editing `/etc/ssh/sshd_config`:

```bash
# Set these options
PasswordAuthentication no
PubkeyAuthentication yes
```

5. Restart SSH service:

```bash
sudo systemctl restart sshd
```

#### Firewall Setup

1. Update package lists:

```bash
sudo apt update
```

2. Install UFW (Uncomplicated Firewall):

```bash
sudo apt install ufw
```

3. Allow necessary ports:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

4. Enable the firewall:

```bash
sudo ufw enable
```

5. Verify status:

```bash
sudo ufw status
```

### Docker Installation

1. Install required packages:

```bash
sudo apt install -y ca-certificates curl gnupg
```

2. Add Docker's official GPG key:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

3. Set up the Docker repository:

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

4. Install Docker Engine:

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

5. Start and enable Docker:

```bash
sudo systemctl start docker
sudo systemctl enable docker
```

6. Add your user to the docker group (optional, for non-root access):

> **Note:** Skip this step if you're logged in as `root`. Root already has full Docker access.

```bash
sudo usermod -aG docker $USER
newgrp docker
```

7. Verify Docker installation:

```bash
docker --version
docker compose version
```

---

## 5. Application Deployment

### Deployment User

You can deploy NewsFeed as `root` or as a non-root user with sudo privileges.

**Using root (simpler, acceptable for personal projects):**
- All commands will work directly without `sudo` prefix
- Docker containers still provide isolation and security
- Acceptable for personal VPS or development environments

**Using a non-root user (recommended for production):**
- Create a dedicated user: `adduser deploy && usermod -aG sudo deploy`
- Switch to that user: `su - deploy`
- Add to docker group to run Docker without `sudo`
- More secure for multi-user or production environments

### Clone Repository

1. Clone the NewsFeed repository:

```bash
git clone <your-repository-url> newsfeed
cd newsfeed
```

### Environment Configuration

1. Copy the environment template:

```bash
cp .env.production.example .env.production
```

2. Edit `.env.production` with your values:

```bash
nano .env.production
```

3. Set a secure database password:

```bash
# Generate a strong password
openssl rand -base64 32
```

4. Update the `.env.production` file:

```env
DB_USERNAME=postgres
DB_PASSWORD=<your-generated-password>
DB_DATABASE=news_feed_db
VITE_API_URL=
```

### SSL Certificate Setup

For initial deployment or testing, use self-signed certificates:

```bash
chmod +x scripts/generate-dev-certs.sh
./scripts/generate-dev-certs.sh
```

For production with a domain name, see [SSL Certificate Configuration](#6-ssl-certificate-configuration).

### Build and Start Containers

1. Build and start all services:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

2. Wait for all services to become healthy:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

All services should show `healthy` in the status column.

### Verify Deployment

1. Check container logs:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f
```

2. Test the health endpoint:

```bash
# HTTP test (should redirect to HTTPS)
curl -I http://your_server_ip/health

# HTTPS test (use -k for self-signed certificates)
curl -k https://your_server_ip/health
```

3. Access the application:
   - Open `https://your_server_ip` in your browser
   - Accept the security warning for self-signed certificates
   - Verify the frontend loads correctly
   - Test API endpoints at `https://your_server_ip/api/docs`

---

## 6. SSL Certificate Configuration

### Self-Signed Certificates (Development/Testing)

Self-signed certificates are suitable for development and testing. Browsers will show security warnings.

Use the provided script to generate certificates:

```bash
chmod +x scripts/generate-dev-certs.sh
./scripts/generate-dev-certs.sh
```

This script:
- Creates the `nginx/ssl/` directory if it doesn't exist
- Generates a self-signed certificate valid for 365 days
- Sets appropriate file permissions (644 for cert, 600 for key)
- Creates certificates for `localhost` and `127.0.0.1`

**Certificate locations:**
- Certificate: `nginx/ssl/cert.pem`
- Private key: `nginx/ssl/key.pem`

### Let's Encrypt Certificates (Production)

For production deployments with a domain name, use Let's Encrypt for trusted SSL certificates.

#### Prerequisites

- A valid domain name pointing to your server IP
- Port 80 and 443 accessible from the internet
- Nginx container stopped (to free port 80)

#### Install Certbot

```bash
sudo apt update
sudo apt install certbot
```

#### Generate Certificates

1. Stop the nginx container temporarily:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production stop nginx
```

2. Generate certificates using certbot standalone mode:

```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

3. Follow the prompts to complete certificate generation.

4. Copy certificates to the project:

```bash
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
sudo chown -R $USER:$USER nginx/ssl
```

5. Restart the nginx container:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production start nginx
```

#### Auto-Renewal Setup

Let's Encrypt certificates are valid for 90 days. Set up automatic renewal.

1. Create a renewal script:

```bash
cat > scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
set -e

PROJECT_DIR="/path/to/newsfeed"
DOMAIN="yourdomain.com"

# Renew certificates
certbot renew --quiet

# Copy renewed certificates
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $PROJECT_DIR/nginx/ssl/cert.pem
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $PROJECT_DIR/nginx/ssl/key.pem

# Reload nginx
docker compose -f $PROJECT_DIR/docker-compose.prod.yml exec nginx nginx -s reload
EOF

chmod +x scripts/renew-ssl.sh
```

2. Add to crontab (runs weekly):

```bash
(crontab -l 2>/dev/null; echo "0 3 * * 0 /path/to/newsfeed/scripts/renew-ssl.sh") | crontab -
```

---

## 7. Environment Variables Reference

| Variable        | Required | Default          | Description                                       |
|:---------------|:---------|:-----------------|:--------------------------------------------------|
| `DB_USERNAME`  | No       | `postgres`       | PostgreSQL database username                      |
| `DB_PASSWORD`  | **Yes**  | -                | PostgreSQL database password (required)           |
| `DB_DATABASE`  | No       | `news_feed_db`   | PostgreSQL database name                          |
| `VITE_API_URL` | No       | ``               | API URL for frontend (use empty string for same-origin) |

### Configuration Examples

#### Same-Origin Deployment (Recommended)

Frontend and backend served from the same domain:

```env
VITE_API_URL=
```

#### Cross-Origin Deployment

Frontend and backend on different domains:

```env
VITE_API_URL=https://api.yourdomain.com
```

---

## 8. Database Management

### Database Migrations

Migrations should be run manually after deployment. The application is configured with `migrationsRun: false` to give explicit control over migration execution.

#### Running Migrations

Run migrations inside the backend container:

```bash
# Run pending migrations
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend npm run migration:run:prod
```

#### Checking Migration Status

```bash
# Show migration status
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend npm run migration:show:prod
```

#### Reverting Migrations

If you need to revert the last migration:

```bash
# Revert the last applied migration
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend npm run migration:revert:prod
```

**Note:** Production migration scripts use compiled JavaScript, not TypeScript. The build process consists of two steps:

1. `nest build` - compiles main application code
2. `npm run build:migrations` - compiles TypeORM migrations separately

Both are combined in the main `build` command (`npm run build`), which runs automatically during Docker image build.

### Seeding Test Data

Seed data is for testing/demo purposes only. Run it inside the backend container.

The seed script generates 10,000 posts with random content.

```bash
# Run seed inside the backend container
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend npm run db:seed:prod
```

**Warning:** The seed script clears all existing posts before inserting new data. Do not run on a production database with real data.

### Backup Considerations

Automated backup scripts are not included in this phase. For manual backups:

```bash
# Create a backup
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres pg_dump -U postgres news_feed_db > backup_$(date +%Y%m%d).sql

# Restore from backup
cat backup_20260320.sql | docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres psql -U postgres news_feed_db
```

**Important:** Implement regular backup procedures before deploying to production.

---

## 9. Monitoring and Logging

### Viewing Container Logs

View all service logs:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f
```

View logs for a specific service:

```bash
# Nginx logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f nginx

# Backend logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f backend

# Postgres logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f postgres
```

View last 100 lines:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=100 backend
```

### Health Check Endpoints

| Service  | Endpoint    | Description                        |
|:---------|:------------|:-----------------------------------|
| Nginx    | `/health`   | Returns `ok` if nginx is running   |
| Backend  | `/api/docs` | Swagger UI for API documentation   |

Test health endpoints:

```bash
# Nginx health
curl -k https://your_server_ip/health

# API documentation
curl -k https://your_server_ip/api/docs
```

### Container Status

Check container health status:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

Expected output shows all services as `healthy`:

```
NAME                 STATUS
news_feed_nginx      Up 2 minutes (healthy)
news_feed_backend    Up 2 minutes (healthy)
news_feed_postgres   Up 2 minutes (healthy)
```

### Resource Usage

Monitor container resource usage:

```bash
docker stats
```

---

## 10. Update Procedures

### Standard Update

1. SSH into your server:

```bash
ssh user@your_server_ip
cd newsfeed
```

2. Pull the latest changes:

```bash
git pull origin master
```

3. Rebuild and restart containers:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

4. Verify the update:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f --tail=50
```

### Quick Restart (No Code Changes)

If you only changed environment variables:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### Rollback Procedure

If an update causes issues:

1. Stop the current containers:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down
```

2. Checkout the previous version:

```bash
git log --oneline -5  # Find the previous commit
git checkout <previous-commit-hash>
```

3. Rebuild and start:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

4. After verifying, return to the latest commit and fix issues:

```bash
git checkout main
```

---

## 11. Troubleshooting Guide

### Container Won't Start

**Symptoms:** Container exits immediately or keeps restarting.

**Diagnosis:**

```bash
# Check container status
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# View container logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs backend
```

**Common Causes:**

1. Missing environment variables:

```bash
# Verify .env.production exists
cat .env.production
```

2. Port conflicts:

```bash
# Check if ports are in use
sudo lsof -i :80
sudo lsof -i :443
```

3. Docker resource limits exceeded:

```bash
# Check Docker disk usage
docker system df
```

### Database Connection Issues

**Symptoms:** Backend logs show "Connection refused" or "ECONNREFUSED".

**Diagnosis:**

```bash
# Check if postgres is healthy
docker compose -f docker-compose.prod.yml --env-file .env.production ps postgres

# Check postgres logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs postgres
```

**Solutions:**

1. Verify database credentials in `.env.production`:

```bash
cat .env.production | grep DB_
```

2. Ensure postgres container is running:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production restart postgres
```

3. Test database connection from backend:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend sh
wget -qO- http://postgres:5432 || echo "Cannot reach postgres"
```

### SSL Certificate Problems

**Symptoms:** Browser shows SSL errors or warnings.

**For self-signed certificates:**

- This is expected behavior
- Click "Advanced" and "Proceed anyway" in your browser
- For API testing, use `-k` flag with curl:

```bash
curl -k https://your_server_ip/health
```

**For Let's Encrypt certificates:**

1. Verify certificate files exist:

```bash
ls -la nginx/ssl/
```

2. Check certificate validity:

```bash
openssl x509 -in nginx/ssl/cert.pem -text -noout
```

3. Verify certificate matches domain:

```bash
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Nginx Configuration Errors

**Symptoms:** Nginx container fails health check or won't start.

**Diagnosis:**

```bash
# Test nginx configuration
docker compose -f docker-compose.prod.yml --env-file .env.production exec nginx nginx -t
```

**Common Issues:**

1. Missing SSL certificates:

```bash
# Check if certificates exist
ls -la nginx/ssl/
```

2. Configuration syntax error:

```bash
# Validate configuration
docker compose -f docker-compose.prod.yml --env-file .env.production exec nginx nginx -t
```

---

## 12. Architecture Overview

### Container Responsibilities

| Container  | Image                 | Purpose                                                                 |
|:-----------|:----------------------|:------------------------------------------------------------------------|
| `nginx`    | Custom (nginx-alpine) | Serves frontend static files, reverse proxy to backend, SSL termination |
| `backend`  | Custom (node-alpine)  | NestJS API server with cursor-based pagination                          |
| `postgres` | postgres:15-alpine    | PostgreSQL database                                                     |

### Container Security Model

All containers in NewsFeed follow security best practices:

**Non-root User Execution:**
- The backend container runs as `appuser` (UID 1001), not as root
- This user is created automatically during Docker image build (see [`backend/Dockerfile`](../backend/Dockerfile))
- No manual user creation is required on your VPS
- This reduces security risk if the container is compromised

**What This Means for Deployment:**
- When you run `docker compose up --build`, Docker automatically creates the `appuser` inside the image
- Files and directories inside the container are owned by this user
- You don't need to create this user on your host system
- If you need to access files in Docker volumes, you may need to use `docker compose exec` commands

### Network Configuration

All containers communicate through the `newsfeed-network` bridge network. Only the nginx container exposes ports to the host.

### Volume Configuration

| Volume          | Purpose                       | Persistence                           |
|:----------------|:------------------------------|:--------------------------------------|
| `postgres_data` | PostgreSQL data files         | Persists database across restarts     |

### Static File Caching Strategy

| Asset Type             | Cache Duration | Cache-Control Header                  |
|:-----------------------|:---------------|:--------------------------------------|
| JS/CSS with hash       | 1 year         | `public, immutable`                   |
| Images (PNG, JPG, SVG) | 1 year         | `public, immutable`                   |
| Fonts (WOFF, WOFF2)    | 1 year         | `public, immutable`                   |
| index.html             | No cache       | `no-store, no-cache, must-revalidate` |

### Rate Limiting

| Endpoint              | Rate Limit | Burst |
|:----------------------|:-----------|:------|
| API endpoints (`/api/*`) | 10 req/s   | 20    |

---

## Quick Reference

### Common Commands

```bash
# Start all services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Stop all services
docker compose -f docker-compose.prod.yml --env-file .env.production down

# Rebuild and restart
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# View logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Check status
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# Restart a single service
docker compose -f docker-compose.prod.yml --env-file .env.production restart nginx
```

### File Locations

| File                                          | Purpose                                 |
|:----------------------------------------------|:----------------------------------------|
| [`docker-compose.prod.yml`](../docker-compose.prod.yml) | Production Docker Compose configuration |
| [`.env.production`](../.env.production)       | Production environment variables        |
| [`nginx/Dockerfile`](../nginx/Dockerfile)     | Nginx + frontend container definition   |
| [`nginx/nginx.conf`](../nginx/nginx.conf)     | Nginx configuration                     |
| [`nginx/ssl/`](../nginx/ssl/)                 | SSL certificates directory              |
| [`scripts/generate-dev-certs.sh`](../scripts/generate-dev-certs.sh) | Self-signed certificate generation |
| [`backend/Dockerfile`](../backend/Dockerfile) | Backend container definition            |
