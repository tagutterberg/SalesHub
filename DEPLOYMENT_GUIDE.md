# Deployment Guide - Bunker Order Management System

Complete guide for deploying the Bunker Order Management System to production.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Deployment](#backend-deployment)
3. [Frontend Deployment](#frontend-deployment)
4. [Database Setup](#database-setup)
5. [Email Configuration](#email-configuration)
6. [Security Checklist](#security-checklist)
7. [Monitoring](#monitoring)

## Prerequisites

### Server Requirements
- Ubuntu 20.04 LTS or higher (or equivalent Linux distribution)
- Node.js 18+ installed
- PostgreSQL 14+ installed
- Nginx (for reverse proxy)
- PM2 (for process management)
- SSL certificate (Let's Encrypt recommended)
- Minimum 2GB RAM, 20GB disk space

### Domain Setup
- Domain name pointing to server IP
- SSL certificate configured
- Firewall rules configured (ports 80, 443, 5432)

## Backend Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 14
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Install Chromium for PDF generation
sudo apt install -y chromium-browser chromium-chromedriver
```

### 2. Application Setup

```bash
# Create application user
sudo useradd -m -s /bin/bash bunkerapp
sudo su - bunkerapp

# Clone repository
git clone <your-repo-url> /home/bunkerapp/bunker-system
cd /home/bunkerapp/bunker-system/backend

# Install dependencies
npm install --production

# Create directories
mkdir -p uploads/logos uploads/documents
chmod 755 uploads/
```

### 3. Environment Configuration

```bash
# Create production .env
cat > .env << 'EOF'
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bunker_production
DB_USER=bunker_user
DB_PASSWORD=<strong-password-here>

# Server
PORT=5000
NODE_ENV=production

# CORS
CORS_ORIGIN=https://yourdomain.com

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Or use SendGrid
USE_SENDGRID=true
SENDGRID_API_KEY=SG.your-api-key-here

# Cron Jobs
ENABLE_CRON=true

# Security
SESSION_SECRET=<generate-random-string-here>
JWT_SECRET=<generate-random-string-here>
EOF

# Secure the file
chmod 600 .env
```

### 4. Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL console:
CREATE DATABASE bunker_production;
CREATE USER bunker_user WITH ENCRYPTED PASSWORD '<strong-password>';
GRANT ALL PRIVILEGES ON DATABASE bunker_production TO bunker_user;
\q

# Test connection
psql -h localhost -U bunker_user -d bunker_production
```

### 5. Start Backend with PM2

```bash
# Start application
cd /home/bunkerapp/bunker-system/backend
pm2 start src/index.js --name bunker-api

# Configure PM2 to start on boot
pm2 startup systemd
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u bunkerapp --hp /home/bunkerapp

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs bunker-api
```

### 6. Nginx Configuration

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/bunker-system

# Add the following:
server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Logging
    access_log /var/log/nginx/bunker-api-access.log;
    error_log /var/log/nginx/bunker-api-error.log;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    limit_req zone=api_limit burst=20 nodelay;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Serve uploaded files
    location /uploads {
        alias /home/bunkerapp/bunker-system/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # File size limits
    client_max_body_size 25M;
}

# Enable the site
sudo ln -s /etc/nginx/sites-available/bunker-system /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Frontend Deployment

### Option 1: Static Hosting (Netlify/Vercel)

```bash
# Build frontend
cd frontend
npm install
npm run build

# Deploy dist/ folder to:
# - Netlify: drag & drop or CLI
# - Vercel: vercel deploy
# - AWS S3 + CloudFront
```

**Netlify Configuration (_redirects file):**
```
/*    /index.html   200
```

**Environment Variables:**
```
VITE_API_URL=https://api.yourdomain.com
```

### Option 2: Self-Hosted with Nginx

```bash
# Build frontend
cd /home/bunkerapp/bunker-system/frontend
npm install
npm run build

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/bunker-frontend

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    root /home/bunkerapp/bunker-system/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}

# Enable and reload
sudo ln -s /etc/nginx/sites-available/bunker-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Database Setup

### Backup Strategy

```bash
# Create backup script
cat > /home/bunkerapp/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/bunkerapp/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U bunker_user bunker_production | gzip > $BACKUP_DIR/bunker_backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "bunker_backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /home/bunkerapp/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/bunkerapp/backup-db.sh
```

### Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX idx_orders_vessel_id ON orders(vessel_id);
CREATE INDEX idx_orders_voyage_id ON orders(voyage_id);
CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at);

-- Vacuum and analyze
VACUUM ANALYZE;
```

## Email Configuration

### Gmail Setup

1. Enable 2-factor authentication on Google account
2. Generate app password: https://myaccount.google.com/apppasswords
3. Use app password in SMTP_PASS environment variable

### SendGrid Setup

1. Create SendGrid account: https://sendgrid.com
2. Verify sender email/domain
3. Generate API key with Mail Send permissions
4. Add to SENDGRID_API_KEY environment variable

### Email Testing

```bash
# Test email configuration
curl -X POST https://api.yourdomain.com/api/email-settings/test \
  -H "Content-Type: application/json" \
  -d '{"test_email":"your-email@example.com"}'
```

## Security Checklist

- [ ] SSL certificates installed and configured
- [ ] Firewall configured (ufw or iptables)
- [ ] PostgreSQL only accessible from localhost
- [ ] Strong database passwords (20+ characters)
- [ ] Environment variables secured (chmod 600)
- [ ] File upload directory permissions set correctly
- [ ] Rate limiting enabled on Nginx
- [ ] Security headers configured
- [ ] Regular system updates scheduled
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] SSH key-only authentication
- [ ] Fail2ban installed and configured

```bash
# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Install fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Monitoring

### PM2 Monitoring

```bash
# Install PM2 Plus (optional)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Monitor application
pm2 monit
pm2 status
pm2 logs bunker-api --lines 100
```

### System Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Check system resources
htop
df -h
free -m
```

### Application Health Checks

```bash
# Create health check endpoint
# GET /api/health returns 200 OK

# Add to monitoring service (UptimeRobot, Pingdom, etc.)
# Monitor: https://api.yourdomain.com/api/health
```

### Log Rotation

```bash
# Configure logrotate for application logs
sudo nano /etc/logrotate.d/bunker-system

/home/bunkerapp/bunker-system/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 bunkerapp bunkerapp
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Maintenance

### Update Application

```bash
# Pull latest code
cd /home/bunkerapp/bunker-system
git pull origin main

# Backend updates
cd backend
npm install --production
pm2 restart bunker-api

# Frontend updates
cd ../frontend
npm install
npm run build
# Deploy new build
```

### Database Migrations

```bash
# If using migrations tool
cd backend
npm run migrate

# Or manually apply SQL scripts
psql -U bunker_user -d bunker_production -f migration.sql
```

## Troubleshooting

### Backend Not Starting
```bash
pm2 logs bunker-api --err
pm2 restart bunker-api
```

### Database Connection Issues
```bash
# Test connection
psql -h localhost -U bunker_user -d bunker_production

# Check PostgreSQL is running
sudo systemctl status postgresql
```

### Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### Email Not Sending
```bash
# Check email logs in database
# Check SMTP credentials
# Verify firewall allows outbound port 587
```

---

**Support**: For production issues, review logs and monitoring dashboards first.
