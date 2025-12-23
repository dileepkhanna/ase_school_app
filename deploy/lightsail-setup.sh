#!/bin/bash

# Amazon Lightsail Deployment Setup Script
# Run this script on your Lightsail instance

set -e

echo "🚀 Setting up ASE School Backend on Amazon Lightsail..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
echo "🔧 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add current user to docker group
sudo usermod -aG docker $USER

# Install Node.js (for running migrations)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
echo "⚡ Installing PM2..."
sudo npm install -g pm2

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/ase-school-backend
sudo chown $USER:$USER /opt/ase-school-backend

# Setup firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw --force enable

# Install Nginx (optional, for reverse proxy)
echo "🌐 Installing Nginx..."
sudo apt install -y nginx

echo "✅ Lightsail setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy your application files to /opt/ase-school-backend"
echo "2. Create your .env file with production settings"
echo "3. Run the deployment script: ./deploy.sh"
echo ""
echo "⚠️  Please log out and log back in for Docker group changes to take effect"