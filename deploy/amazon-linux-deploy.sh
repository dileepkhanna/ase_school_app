#!/bin/bash

# Amazon Linux deployment script for ASE School Backend
# Run this script to deploy your application on Amazon Linux

set -e

APP_DIR="/opt/ase-school-backend"
BACKUP_DIR="/opt/backups"

echo "🚀 Starting deployment of ASE School Backend on Amazon Linux..."

# Create backup directory
sudo mkdir -p $BACKUP_DIR
sudo chown ec2-user:ec2-user $BACKUP_DIR

# Navigate to application directory
cd $APP_DIR

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with your production configuration"
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down || true

# Backup database (if exists)
if docker ps -a | grep -q postgres; then
    echo "💾 Creating database backup..."
    BACKUP_FILE="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"
    docker-compose exec -T postgres pg_dump -U postgres ase_school > $BACKUP_FILE || true
    echo "Database backup saved to: $BACKUP_FILE"
fi

# Pull latest images and build
echo "🔄 Building application..."
docker-compose build --no-cache

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 30

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose exec app npm run migration:run || echo "⚠️  Migration failed or no migrations to run"

# Check service health
echo "🏥 Checking service health..."
sleep 10

if docker-compose ps | grep -q "Up"; then
    echo "✅ Deployment successful!"
    echo ""
    echo "Services status:"
    docker-compose ps
    echo ""
    echo "Application is running at: http://13.205.34.169:3000"
    echo "API Documentation: http://13.205.34.169:3000/api/docs"
else
    echo "❌ Deployment failed!"
    echo "Checking logs..."
    docker-compose logs --tail=50
    exit 1
fi

echo "🎉 Deployment completed successfully!"