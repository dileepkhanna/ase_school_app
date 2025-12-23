# 🚀 Amazon Linux Lightsail Deployment Guide

## Important Notes:
- Your Lightsail instance is running **Amazon Linux** (not Ubuntu)
- Username is `ec2-user` (not ubuntu)
- You need your Lightsail SSH key (.pem file)

## Step 1: Get your SSH key
1. Go to [Lightsail Console](https://lightsail.aws.amazon.com/)
2. Click "Account" → "SSH Keys"
3. Download your default key (e.g., `LightsailDefaultKey-us-east-1.pem`)
4. Save it to a secure location on your computer

## Step 2: SSH into your server
```bash
# Replace with your actual key path
ssh -i path/to/LightsailDefaultKey-us-east-1.pem ec2-user@13.205.34.169
```

## Step 3: Install Docker and dependencies (Amazon Linux)
```bash
# Update system
sudo yum update -y

# Install Docker (Amazon Linux method)
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js using NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Install Git
sudo yum install -y git

# Log out and back in for Docker group changes
exit
```

## Step 4: Clone and deploy
```bash
# SSH back in
ssh -i path/to/LightsailDefaultKey-us-east-1.pem ec2-user@13.205.34.169

# Create app directory
sudo mkdir -p /opt/ase-school-backend
sudo chown ec2-user:ec2-user /opt/ase-school-backend

# Clone repository
cd /opt/ase-school-backend
git clone https://github.com/dileepkhanna/ase_school_app.git .

# Setup environment
cp .env.production .env

# Generate secure passwords
JWT_ACCESS=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH=$(openssl rand -base64 64 | tr -d '\n')
DB_PASS=$(openssl rand -base64 32 | tr -d '\n')
REDIS_PASS=$(openssl rand -base64 32 | tr -d '\n')

# Update .env file
sed -i "s/CHANGE_ME_TO_VERY_LONG_RANDOM_STRING_access_secret/$JWT_ACCESS/g" .env
sed -i "s/CHANGE_ME_TO_VERY_LONG_RANDOM_STRING_refresh_secret/$JWT_REFRESH/g" .env
sed -i "s/CHANGE_ME_STRONG_DB_PASSWORD/$DB_PASS/g" .env
sed -i "s/CHANGE_ME_REDIS_PASSWORD/$REDIS_PASS/g" .env

# Make scripts executable
chmod +x deploy/*.sh

# Deploy
./deploy/amazon-linux-deploy.sh
```

## Step 5: Test your deployment
```bash
# Check services
docker-compose ps

# Test endpoints
curl http://13.205.34.169:3000/health
curl http://13.205.34.169:3000/api/docs

# View logs
docker-compose logs -f app
```

## Your Application URLs:
- **API**: http://13.205.34.169:3000
- **Documentation**: http://13.205.34.169:3000/api/docs
- **Health Check**: http://13.205.34.169:3000/health

## Troubleshooting:

### If SSH still fails:
1. Make sure your .pem file has correct permissions:
   ```bash
   chmod 400 path/to/your-key.pem
   ```

2. Try using Lightsail browser SSH:
   - Go to Lightsail Console
   - Click your instance
   - Click "Connect using SSH"

### If Docker fails:
```bash
# Check Docker status
sudo systemctl status docker

# Start Docker if stopped
sudo systemctl start docker

# Check if user is in docker group
groups
```

### Common Amazon Linux Commands:
```bash
# Package management
sudo yum install package-name
sudo yum update

# Service management
sudo systemctl start service-name
sudo systemctl enable service-name
sudo systemctl status service-name
```