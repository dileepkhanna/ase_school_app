#!/bin/bash

# Backup script for ASE School Backend
# Run this script regularly to backup your database and application data

set -e

APP_DIR="/opt/ase-school-backend"
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

echo "🗄️  Starting backup process..."

# Create backup directory
sudo mkdir -p $BACKUP_DIR

# Navigate to application directory
cd $APP_DIR

# Database backup
echo "💾 Creating database backup..."
DB_BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql"
docker-compose exec -T postgres pg_dump -U postgres ase_school > $DB_BACKUP_FILE

# Compress database backup
gzip $DB_BACKUP_FILE
echo "Database backup created: ${DB_BACKUP_FILE}.gz"

# Application files backup (excluding node_modules and logs)
echo "📁 Creating application files backup..."
APP_BACKUP_FILE="$BACKUP_DIR/app_backup_$DATE.tar.gz"
tar -czf $APP_BACKUP_FILE \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='logs' \
    --exclude='.git' \
    -C /opt ase-school-backend

echo "Application backup created: $APP_BACKUP_FILE"

# Environment backup
echo "⚙️  Creating environment backup..."
ENV_BACKUP_FILE="$BACKUP_DIR/env_backup_$DATE.tar.gz"
tar -czf $ENV_BACKUP_FILE -C $APP_DIR .env secrets/ 2>/dev/null || true
echo "Environment backup created: $ENV_BACKUP_FILE"

# Clean old backups
echo "🧹 Cleaning old backups (older than $RETENTION_DAYS days)..."
find $BACKUP_DIR -name "*.gz" -type f -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

# Show backup summary
echo "📊 Backup summary:"
ls -lh $BACKUP_DIR/*$DATE*

# Calculate total backup size
TOTAL_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
echo "Total backup directory size: $TOTAL_SIZE"

echo "✅ Backup process completed successfully!"

# Optional: Upload to S3 or other cloud storage
# Uncomment and configure if you want to upload backups to cloud storage
# aws s3 cp $BACKUP_DIR/ s3://your-backup-bucket/ase-school-backend/ --recursive --exclude "*" --include "*$DATE*"