#!/bin/bash

# Quick setup script for ASE School Backend on Lightsail
# IP: 13.205.34.169

set -e

echo "🚀 Quick setup for ASE School Backend on 13.205.34.169"

# Check if running on the correct server
CURRENT_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")
if [ "$CURRENT_IP" != "13.205.34.169" ]; then
    echo "⚠️  Warning: Current IP ($CURRENT_IP) doesn't match expected IP (13.205.34.169)"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/ase-school-backend
sudo chown $USER:$USER /opt/ase-school-backend

# Navigate to app directory
cd /opt/ase-school-backend

# Copy environment file
echo "⚙️  Setting up environment..."
if [ -f .env.production ]; then
    cp .env.production .env
    echo "✅ Environment file created from .env.production"
else
    echo "❌ .env.production not found. Please upload your project files first."
    exit 1
fi

# Generate secure passwords
echo "🔐 Generating secure passwords..."
JWT_ACCESS=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH=$(openssl rand -base64 64 | tr -d '\n')
DB_PASS=$(openssl rand -base64 32 | tr -d '\n')
REDIS_PASS=$(openssl rand -base64 32 | tr -d '\n')

# Update .env file
sed -i "s/CHANGE_ME_TO_VERY_LONG_RANDOM_STRING_access_secret/$JWT_ACCESS/g" .env
sed -i "s/CHANGE_ME_TO_VERY_LONG_RANDOM_STRING_refresh_secret/$JWT_REFRESH/g" .env
sed -i "s/CHANGE_ME_STRONG_DB_PASSWORD/$DB_PASS/g" .env
sed -i "s/CHANGE_ME_REDIS_PASSWORD/$REDIS_PASS/g" .env

echo "✅ Generated secure passwords and JWT secrets"

# Make scripts executable
chmod +x deploy/*.sh

# Deploy the application
echo "🚀 Deploying application..."
./deploy/deploy.sh

echo ""
echo "🎉 Quick setup completed!"
echo ""
echo "Your application is now running at:"
echo "🌐 API: http://13.205.34.169:3000"
echo "📚 Docs: http://13.205.34.169:3000/api/docs"
echo "❤️  Health: http://13.205.34.169:3000/health"
echo ""
echo "Next steps:"
echo "1. Test the API endpoints"
echo "2. Configure email settings in .env if needed"
echo "3. Setup Nginx reverse proxy (optional): sudo ./deploy/setup-nginx.sh"
echo "4. Setup SSL certificate if you have a domain"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To restart: docker-compose restart"