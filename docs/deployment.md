# Deployment Guide - Philippine Market Price Tracker API

This guide covers deploying the API to various platforms, with a focus on DigitalOcean as the most cost-effective option.

## 🎯 **Recommended: DigitalOcean (Most Cost-Effective)**

### **Cost Breakdown:**
- **Droplet**: $6-12/month (1GB-2GB RAM)
- **Database**: $15/month (Managed PostgreSQL)
- **Total**: ~$21-27/month for production-ready setup

### **Step 1: Create DigitalOcean Account**
1. Sign up at [digitalocean.com](https://digitalocean.com)
2. Add payment method
3. Get $200 free credits (new users)

### **Step 2: Create Droplet**
```bash
# Choose Ubuntu 22.04 LTS
# Plan: Basic
# Size: 1GB RAM / 1 vCPU / 25GB SSD ($6/month)
# Datacenter: Choose closest to your users
# Authentication: SSH key (recommended) or Password
```

### **Step 3: Connect to Droplet**
```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y
```

### **Step 4: Install Dependencies**
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Install Docker (optional, for Redis)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### **Step 5: Clone and Setup Application**
```bash
# Clone your repository
git clone https://github.com/yourusername/ph-price-tracker-api.git
cd ph-price-tracker-api

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate
```

### **Step 6: Environment Configuration**
```bash
# Copy environment file
cp env.example .env

# Edit environment variables
nano .env
```

**Production `.env` configuration:**
```env
# Database (DigitalOcean Managed Database)
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"

# Server
PORT=3000
NODE_ENV=production

# Security (generate secure keys)
ADMIN_API_KEY="your-super-secret-admin-api-key-here"
API_KEY="your-super-secret-api-key-here"

# Redis (optional, for scaling)
REDIS_URL="redis://localhost:6379"
ENABLE_REDIS_CACHE=true
ENABLE_JOB_QUEUE=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# Performance
ENABLE_COMPRESSION=true
ENABLE_CACHE=true
CACHE_TTL_SECONDS=600
```

### **Step 7: Database Setup**
```bash
# Option A: DigitalOcean Managed Database (Recommended)
# Create in DigitalOcean dashboard, then run:
npx prisma db push
npx prisma db seed

# Option B: Local PostgreSQL
# apt install postgresql postgresql-contrib
# sudo -u postgres createdb ph_price_tracker
# npx prisma db push
```

### **Step 8: Start Application**
```bash
# Build the application
npm run build

# Start with PM2
pm2 start index.js --name "ph-price-tracker"

# Save PM2 configuration
pm2 save
pm2 startup

# Check status
pm2 status
pm2 logs ph-price-tracker
```

### **Step 9: Setup Nginx (Reverse Proxy)**
```bash
# Install Nginx
apt install nginx

# Create Nginx configuration
nano /etc/nginx/sites-available/ph-price-tracker
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/ph-price-tracker /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### **Step 10: SSL Certificate (Let's Encrypt)**
```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **Step 11: Firewall Setup**
```bash
# Configure UFW firewall
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable
```

## 🔄 **Alternative Deployment Options**

### **Railway (Easiest)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Cost:** $5-20/month, very easy setup

### **Render (Good Free Tier)**
```yaml
# render.yaml (already in your project)
services:
  - type: web
    name: ph-price-tracker
    env: node
    buildCommand: npm install && npx prisma generate
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

**Cost:** $7-25/month, easy deployment

### **Heroku (Traditional)**
```bash
# Install Heroku CLI
# Create app and deploy
heroku create ph-price-tracker-api
git push heroku main
```

**Cost:** $7-25/month, great ecosystem

### **AWS (Most Scalable)**
```bash
# Use AWS Elastic Beanstalk or ECS
# More complex but very scalable
```

**Cost:** $5-50/month, most flexible

## 📊 **Performance Monitoring**

### **DigitalOcean Monitoring**
```bash
# Install monitoring tools
apt install htop iotop

# Monitor application
pm2 monit
htop
```

### **Application Health Checks**
```bash
# Test health endpoint
curl https://your-domain.com/health

# Test API endpoints
curl https://your-domain.com/v1/commodities
```

## 🔧 **Scaling on DigitalOcean**

### **Vertical Scaling (Scale Up)**
- Upgrade droplet to 2GB RAM ($12/month)
- Add more CPU cores as needed

### **Horizontal Scaling (Scale Out)**
- Use DigitalOcean Load Balancer ($12/month)
- Deploy multiple droplets
- Use Redis for shared cache

### **Database Scaling**
- Upgrade to managed database with read replicas
- Use connection pooling

## 💰 **Cost Optimization**

### **Development/Testing**
- Use $6/month droplet
- No managed database (use local PostgreSQL)

### **Production**
- Use $12/month droplet (2GB RAM)
- Managed database ($15/month)
- Total: ~$27/month

### **High Traffic**
- Load balancer ($12/month)
- Multiple droplets
- Redis cluster

## 🚨 **Security Checklist**

- [ ] Change default SSH port
- [ ] Use SSH keys only
- [ ] Configure firewall
- [ ] Enable SSL/TLS
- [ ] Set secure environment variables
- [ ] Regular security updates
- [ ] Database backups
- [ ] Monitor logs

## 📈 **Monitoring & Maintenance**

### **Daily**
- Check application logs: `pm2 logs`
- Monitor health endpoint
- Check disk space: `df -h`

### **Weekly**
- Update system packages
- Review application performance
- Check database backups

### **Monthly**
- Review costs and usage
- Update dependencies
- Security audit

## 🎯 **Quick Start Commands**

```bash
# Complete DigitalOcean setup (run on droplet)
git clone https://github.com/yourusername/ph-price-tracker-api.git
cd ph-price-tracker-api
npm install
npx prisma generate
cp env.example .env
# Edit .env with your production values
npx prisma db push
pm2 start index.js --name "ph-price-tracker"
pm2 save
pm2 startup
```

**Your API will be live at:** `https://your-domain.com`

## 📞 **Support**

- **DigitalOcean Docs**: [docs.digitalocean.com](https://docs.digitalocean.com)
- **PM2 Docs**: [pm2.keymetrics.io](https://pm2.keymetrics.io)
- **Nginx Docs**: [nginx.org](https://nginx.org)

---

**DigitalOcean is the most cost-effective choice for your API!** Start with the $6/month droplet and scale as needed. 