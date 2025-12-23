#!/bin/bash

# Amazon Linux setup script for ASE School Backend
# For Amazon Linux 2 on Lightsail

set -e

echo "🚀 Setting up ASE School Backend on Amazon Linux..."

# Update system
echo "📦 Updating system packages..."
sudo yum update -y

# Install Docker (Amazon Linux method)
echo "🐳 Installing Docker..."
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
echo "🔧 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (Amazon Linux method)
echo "📦 Installing Node.js..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
nvm alias default 18

# Install Git (if not already installed)
echo "📦 Installing Git..."
sudo yum install -y git

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/ase-school-backend
sudo chown ec2-user:ec2-user /opt/ase-school-backend

# Setup firewall (Amazon Linux uses different commands)
echo "🔥 Configuring firewall..."
# Amazon Linux typically has minimal firewall by default
# Lightsail firewall is managed through the console

echo "✅ Amazon Linux setup complete!"
echo ""
echo "Next steps:"
echo "1. Log out and log back in for Docker group changes to take effect"
echo "2. Clone your repository to /opt/ase-school-backend"
echo "3. Run the deployment script"
echo ""
echo "⚠️  Please log out and log back in for Docker group changes to take effect"