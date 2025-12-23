# ASE School Backend - Lightsail Deployment Guide

This guide will help you deploy the ASE School Backend to Amazon Lightsail with PostgreSQL.

## Prerequisites

1. **Amazon Lightsail Instance**
   - Ubuntu 20.04 LTS or newer
   - At least 2GB RAM (4GB recommended)
   - 40GB+ storage
   - Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (API)

2. **Domain Name** (optional but recommended)
   - Point your domain to your Lightsail instance IP

## Step 1: Create Lightsail Instance

1. Go to [Amazon Lightsail Console](https://lightsail.aws.amazon.com/)
2. Click "Create instance"
3. Choose "Linux/Unix" platform
4. Select "Ubuntu 20.04 LTS"
5. Choose instance plan (2GB+ recommended)
6. Name your instance (e.g., "ase-school-backend")
7. Click "Create instance"

## Step 2: Configure Networking

1. In Lightsail console, go to your instance
2. Click "Networking" tab
3. Add firewall rules:
   - HTTP (port 80)
   - HTTPS (port 443)
   - Custom (port 3000) - for direct API access

## Step 3: Connect and Setup Server

1. **Connect to your instance:**
   ```bash
   # Use Lightsail browser SSH or:
   ssh -i your-key.pem ubuntu@YOUR_INSTANCE_IP
   ```

2. **Run the setup script:**
   ```bash
   # Copy the setup script to your server
   wget https://raw.githubusercontent.com/your-repo/deploy/lightsail-setup.sh
   chmod +x lightsail-setup.sh
   ./lightsail-setup.sh
   ```

3. **Log out and back in** (for Docker group changes)

## Step 4: Deploy Your Application

1. **Copy your application files:**
   ```bash
   # Option A: Using git (recommended)
   cd /opt/ase-school-backend
   git clone https://github.com/your-username/your-repo.git .

   # Option B: Using SCP
   scp -r -i your-key.pem ./ase-school-backend ubuntu@YOUR_INSTANCE_IP:/opt/
   ```

2. **Create production environment file:**
   ```bash
   cd /opt/ase-school-backend
   cp .env.production .env
   
   # Edit the .env file with your production values
   nano .env
   ```

3. **Update critical environment variables:**
   ```bash
   # Required changes in .env:
   - JWT_ACCESS_SECRET (use a long random string)
   - JWT_REFRESH_SECRET (use a different long random string)
   - DB_PASSWORD (strong database password)
   - REDIS_PASSWORD (Redis password)
   - APP_URL (your domain or IP)
   - All email/SMTP settings
   - All R2/Cloudflare settings
   ```

4. **Deploy the application:**
   ```bash
   chmod +x deploy/deploy.sh
   ./deploy/deploy.sh
   ```

## Step 5: Configure Nginx (Optional but Recommended)

1. **Setup Nginx reverse proxy:**
   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/ase-school-backend
   
   # Edit the server_name in the config
   sudo nano /etc/nginx/sites-available/ase-school-backend
   
   # Enable the site
   sudo ln -s /etc/nginx/sites-available/ase-school-backend /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   
   # Test and restart Nginx
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## Step 6: Setup SSL Certificate (Recommended)

1. **Install Certbot:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Get SSL certificate:**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

## Step 7: Setup Monitoring and Backups

1. **Setup automatic backups:**
   ```bash
   # Add to crontab
   sudo crontab -e
   
   # Add this line for daily backups at 2 AM
   0 2 * * * /opt/ase-school-backend/deploy/backup.sh
   ```

2. **Monitor logs:**
   ```bash
   # View application logs
   docker-compose logs -f app
   
   # View all services
   docker-compose logs -f
   ```

## Useful Commands

```bash
# Check service status
docker-compose ps

# Restart services
docker-compose restart

# Update application
git pull
docker-compose build --no-cache
docker-compose up -d

# View logs
docker-compose logs -f app

# Database backup
docker-compose exec postgres pg_dump -U postgres ase_school > backup.sql

# Database restore
docker-compose exec -T postgres psql -U postgres ase_school < backup.sql

# Run migrations
docker-compose exec app npm run migration:run
```

## Troubleshooting

### Application won't start
```bash
# Check logs
docker-compose logs app

# Check environment variables
docker-compose exec app env | grep DB_

# Restart services
docker-compose down && docker-compose up -d
```

### Database connection issues
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U postgres -d ase_school -c "SELECT 1;"
```

### Performance optimization
```bash
# Monitor resource usage
docker stats

# Check disk space
df -h

# Monitor memory
free -h
```

## Security Checklist

- [ ] Changed all default passwords
- [ ] Updated JWT secrets
- [ ] Configured firewall properly
- [ ] Setup SSL certificate
- [ ] Regular security updates
- [ ] Database backups configured
- [ ] Log monitoring setup

## Support

For issues and questions:
1. Check the application logs
2. Review this deployment guide
3. Check the main project README
4. Contact the development team

---

**Important**: Always test deployments in a staging environment first!