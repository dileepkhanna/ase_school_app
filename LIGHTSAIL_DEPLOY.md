# 🚀 Quick Lightsail Deployment Guide

## Step 1: SSH into your Lightsail server
```bash
# Use your Lightsail SSH key or browser SSH
ssh -i your-key.pem ubuntu@13.205.34.169
```

## Step 2: Install Docker and dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for migrations)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Log out and back in for Docker group changes
exit
```

## Step 3: Clone and deploy your application
```bash
# SSH back in
ssh -i your-key.pem ubuntu@13.205.34.169

# Create app directory
sudo mkdir -p /opt/ase-school-backend
sudo chown ubuntu:ubuntu /opt/ase-school-backend

# Clone your repository
cd /opt/ase-school-backend
git clone https://github.com/dileepkhanna/ase_school_app.git .

# Make scripts executable
chmod +x deploy/*.sh

# Run quick setup (this will generate passwords and deploy)
./deploy/quick-setup.sh
```

## Step 4: Test your deployment
```bash
# Check if services are running
docker-compose ps

# Test API endpoints
curl http://13.205.34.169:3000/health
curl http://13.205.34.169:3000/api/docs

# View logs if needed
docker-compose logs -f app
```

## Your Application URLs:
- **API**: http://13.205.34.169:3000
- **Documentation**: http://13.205.34.169:3000/api/docs
- **Health Check**: http://13.205.34.169:3000/health

## Optional: Setup Nginx reverse proxy
```bash
./deploy/setup-nginx.sh
```

After Nginx setup:
- **API**: http://13.205.34.169
- **Documentation**: http://13.205.34.169/api/docs

## Useful Commands:
```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Update application
git pull
docker-compose build --no-cache
docker-compose up -d

# Backup database
./deploy/backup.sh
```

That's it! Your NestJS application with PostgreSQL should be running on Lightsail.