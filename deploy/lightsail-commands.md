# Lightsail Deployment Commands

Quick reference for deploying to Amazon Lightsail.

## Initial Setup Commands

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 3. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 5. Create app directory
sudo mkdir -p /opt/ase-school-backend
sudo chown $USER:$USER /opt/ase-school-backend
```

## Deployment Commands

```bash
# Navigate to app directory
cd /opt/ase-school-backend

# Clone or update code
git clone https://github.com/your-username/ase-school-backend.git .
# OR
git pull origin main

# Copy environment file
cp .env.production .env

# Edit environment variables
nano .env

# Deploy
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Run migrations
docker-compose exec app npm run migration:run

# Check status
docker-compose ps
docker-compose logs -f
```

## Nginx Setup

```bash
# Install Nginx
sudo apt install -y nginx

# Copy config
sudo cp deploy/nginx.conf /etc/nginx/sites-available/ase-school-backend

# Edit server name
sudo nano /etc/nginx/sites-available/ase-school-backend

# Enable site
sudo ln -s /etc/nginx/sites-available/ase-school-backend /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

## SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (already setup by certbot)
sudo crontab -l | grep certbot
```

## Monitoring Commands

```bash
# View logs
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f redis

# Check resource usage
docker stats
htop
df -h

# Database operations
docker-compose exec postgres psql -U postgres -d ase_school

# Backup
./deploy/backup.sh

# Restore database
docker-compose exec -T postgres psql -U postgres ase_school < backup.sql
```

## Troubleshooting

```bash
# Restart services
docker-compose restart

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check environment
docker-compose exec app env | grep DB_

# Check network
docker network ls
docker-compose exec app ping postgres

# Check disk space
df -h
docker system df
docker system prune -f
```