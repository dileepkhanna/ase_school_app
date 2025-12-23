# Environment Configuration for Lightsail

## Required Environment Variables

Copy `.env.production` to `.env` and update these critical values:

### Security (MUST CHANGE)
```bash
# Generate strong secrets (use a password generator)
JWT_ACCESS_SECRET=your_very_long_random_string_here_at_least_64_chars
JWT_REFRESH_SECRET=different_very_long_random_string_here_at_least_64_chars

# Database password
DB_PASSWORD=your_strong_database_password

# Redis password
REDIS_PASSWORD=your_redis_password
```

### Application URLs
```bash
# Your Lightsail static IP
APP_URL=http://13.205.34.169:3000
```

### Database Configuration
```bash
# These should work with Docker Compose
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_NAME=ase_school
```

### Email Configuration (Required for OTP)
```bash
# Use your email provider settings
MAIL_FROM_NAME=ASE School
MAIL_FROM_EMAIL=no-reply@your-domain.com
SMTP_HOST=smtp.gmail.com  # or your provider
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=true
```

### Cloudflare R2 (Optional - for file uploads)
```bash
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET=your-bucket-name
R2_PUBLIC_BASE_URL=https://your-r2-domain.com
```

### Firebase (Optional - for push notifications)
```bash
# Place your firebase service account JSON in secrets/
FIREBASE_SERVICE_ACCOUNT_PATH=./secrets/firebase-service-account.json
```

## Quick Setup Script

```bash
#!/bin/bash
# Save as setup-env.sh and run after copying .env.production to .env

echo "Setting up environment variables..."

# Generate JWT secrets
JWT_ACCESS=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH=$(openssl rand -base64 64 | tr -d '\n')

# Generate database password
DB_PASS=$(openssl rand -base64 32 | tr -d '\n')

# Generate Redis password
REDIS_PASS=$(openssl rand -base64 32 | tr -d '\n')

# Update .env file
sed -i "s/CHANGE_ME_TO_VERY_LONG_RANDOM_STRING_access_secret/$JWT_ACCESS/g" .env
sed -i "s/CHANGE_ME_TO_VERY_LONG_RANDOM_STRING_refresh_secret/$JWT_REFRESH/g" .env
sed -i "s/CHANGE_ME_STRONG_DB_PASSWORD/$DB_PASS/g" .env
sed -i "s/CHANGE_ME_REDIS_PASSWORD/$REDIS_PASS/g" .env

echo "✅ Generated secure passwords and JWT secrets"
echo "⚠️  Please update the following manually in .env:"
echo "   - APP_URL (your domain or IP)"
echo "   - Email/SMTP settings"
echo "   - R2/Cloudflare settings (if using)"
echo "   - Firebase settings (if using)"
```

## Validation Checklist

Before deploying, ensure:

- [ ] JWT secrets are long and unique
- [ ] Database password is strong
- [ ] APP_URL matches your domain/IP
- [ ] Email settings are correct (test with a simple email)
- [ ] All CHANGE_ME values are updated
- [ ] Firebase service account file exists (if using)
- [ ] R2 credentials are correct (if using file uploads)

## Testing Configuration

```bash
# Test database connection
docker-compose exec postgres psql -U postgres -d ase_school -c "SELECT 1;"

# Test Redis connection
docker-compose exec redis redis-cli ping

# Test application health
curl http://localhost:3000/health

# Test API documentation
curl http://localhost:3000/api/docs
```