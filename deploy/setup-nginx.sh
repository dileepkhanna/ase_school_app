#!/bin/bash

# Nginx setup script for 13.205.34.169

set -e

echo "🌐 Setting up Nginx reverse proxy for 13.205.34.169..."

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    sudo apt update
    sudo apt install -y nginx
fi

# Copy Nginx configuration
echo "⚙️  Configuring Nginx..."
sudo cp deploy/nginx.conf /etc/nginx/sites-available/ase-school-backend

# Enable the site
sudo ln -sf /etc/nginx/sites-available/ase-school-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

# Start and enable Nginx
echo "🚀 Starting Nginx..."
sudo systemctl enable nginx
sudo systemctl restart nginx

# Check if application is running
echo "🏥 Checking application health..."
sleep 5
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Application is healthy"
else
    echo "⚠️  Application health check failed. Make sure your app is running first."
fi

# Test Nginx proxy
echo "🧪 Testing Nginx proxy..."
if curl -f http://13.205.34.169/health > /dev/null 2>&1; then
    echo "✅ Nginx proxy is working"
else
    echo "⚠️  Nginx proxy test failed"
fi

echo ""
echo "🎉 Nginx setup completed!"
echo ""
echo "Your application is now accessible via:"
echo "🌐 Direct: http://13.205.34.169:3000"
echo "🌐 Nginx:  http://13.205.34.169"
echo ""
echo "Nginx status: sudo systemctl status nginx"
echo "Nginx logs:   sudo tail -f /var/log/nginx/access.log"