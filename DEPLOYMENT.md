# 🚀 Quick Deployment Guide

## **DigitalOcean (Recommended - Most Cost-Effective)**

### **Cost: $6-27/month**
- Droplet: $6-12/month
- Managed Database: $15/month
- Total: $21-27/month

### **Quick Start (5 minutes)**
```bash
# 1. Create DigitalOcean account & droplet
# 2. SSH into droplet
ssh root@your-droplet-ip

# 3. Run automated deployment
git clone https://github.com/yourusername/ph-price-tracker-api.git
cd ph-price-tracker-api
chmod +x scripts/deploy-digitalocean.sh
./scripts/deploy-digitalocean.sh
```

### **Manual Steps**
1. Edit `.env` with production values
2. Add your domain to Nginx config
3. Get SSL certificate: `sudo certbot --nginx -d yourdomain.com`

---

## **Docker Deployment (Alternative)**

### **One Command Deployment**
```bash
# Build and deploy with Docker Compose
npm run deploy:docker

# View logs
npm run deploy:docker:logs

# Stop deployment
npm run deploy:docker:down
```

---

## **Other Platforms**

### **Railway (Easiest)**
```bash
npm install -g @railway/cli
railway login
railway up
```
**Cost:** $5-20/month

### **Render (Good Free Tier)**
```bash
# Connect GitHub repo to Render
# Auto-deploys on push
```
**Cost:** $7-25/month

### **Heroku (Traditional)**
```bash
heroku create ph-price-tracker-api
git push heroku main
```
**Cost:** $7-25/month

---

## **Environment Variables (Production)**

```env
# Required
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
NODE_ENV=production
ADMIN_API_KEY="your-super-secret-admin-key"
API_KEY="your-super-secret-api-key"

# Optional (for scaling)
REDIS_URL="redis://localhost:6379"
ENABLE_REDIS_CACHE=true
ENABLE_JOB_QUEUE=true

# Security
CORS_ORIGINS="https://yourdomain.com"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## **Monitoring Commands**

```bash
# Check application status
pm2 status
pm2 logs ph-price-tracker

# Check system resources
htop
df -h

# Test API health
curl https://yourdomain.com/health

# Monitor Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/access.log
```

---

## **Scaling Options**

### **Vertical Scaling (Scale Up)**
- Upgrade droplet to 2GB RAM ($12/month)
- Add more CPU cores

### **Horizontal Scaling (Scale Out)**
- Load balancer ($12/month)
- Multiple droplets
- Redis cluster

---

## **Security Checklist**

- [ ] Change default SSH port
- [ ] Use SSH keys only
- [ ] Configure firewall (UFW)
- [ ] Enable SSL/TLS
- [ ] Set secure environment variables
- [ ] Regular security updates
- [ ] Database backups
- [ ] Monitor logs

---

## **Backup & Recovery**

```bash
# Database backup
npm run backup:db

# Restore database
npm run restore:db

# Application backup
tar -czf app_backup_$(date +%Y%m%d).tar.gz /home/user/ph-price-tracker-api
```

---

## **Troubleshooting**

### **Common Issues**
1. **Port 3000 in use**: `sudo lsof -i :3000`
2. **Database connection**: Check DATABASE_URL in .env
3. **Permission denied**: `sudo chown -R user:user /app`
4. **SSL issues**: `sudo certbot renew --dry-run`

### **Logs Location**
- Application: `pm2 logs ph-price-tracker`
- Nginx: `/var/log/nginx/`
- System: `journalctl -u nginx`

---

## **Performance Tips**

1. **Enable Redis caching** for better performance
2. **Use CDN** for static assets
3. **Database indexing** for faster queries
4. **Gzip compression** (already enabled in Nginx)
5. **Connection pooling** for database

---

**🎯 DigitalOcean is the most cost-effective choice! Start with $6/month and scale as needed.** 