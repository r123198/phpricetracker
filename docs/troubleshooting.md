# Troubleshooting Guide - Philippine Market Price Tracker API

This guide covers common deployment issues and their solutions.

## 🚨 **Common Docker Deployment Issues**

### **1. "No such file or directory: db/init.sql"**
**Error:** Docker can't find the database initialization file.

**Solution:**
```bash
# Create the missing file
mkdir -p db
cat > db/init.sql << 'EOF'
-- Database initialization script
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF
```

### **2. "Permission denied" errors**
**Error:** Container can't write to mounted volumes.

**Solution:**
```bash
# Fix permissions
chmod 755 logs uploads ssl
chown -R $USER:$USER logs uploads ssl
```

### **3. "Connection refused" to database**
**Error:** API can't connect to PostgreSQL.

**Solution:**
```bash
# Check if database is running
docker-compose -f docker-compose.production.yml ps

# Check database logs
docker-compose -f docker-compose.production.yml logs postgres

# Wait for database to be ready
docker-compose -f docker-compose.production.yml exec postgres pg_isready -U postgres
```

### **4. "Port already in use"**
**Error:** Port 80, 3000, or 5432 is already occupied.

**Solution:**
```bash
# Check what's using the port
sudo lsof -i :3000
sudo lsof -i :80
sudo lsof -i :5432

# Stop conflicting services
sudo systemctl stop nginx  # if using system nginx
sudo systemctl stop postgresql  # if using system postgres
```

### **5. "Environment variable not set"**
**Error:** Missing required environment variables.

**Solution:**
```bash
# Check your .env file
cat .env

# Set required variables
export DB_USER=postgres
export DB_PASSWORD=your_secure_password
export DB_NAME=ph_price_tracker
```

### **6. "Prisma client not generated"**
**Error:** Prisma client is missing or outdated.

**Solution:**
```bash
# Generate Prisma client
docker-compose -f docker-compose.production.yml exec api npx prisma generate

# Or rebuild the container
docker-compose -f docker-compose.production.yml build --no-cache api
```

## 🚨 **Common DigitalOcean Deployment Issues**

### **1. "SSH connection refused"**
**Error:** Can't connect to your droplet.

**Solution:**
- Check if droplet is running in DigitalOcean dashboard
- Verify SSH key is added to droplet
- Try connecting with password if SSH key fails

### **2. "Node.js not found"**
**Error:** Node.js installation failed.

**Solution:**
```bash
# Reinstall Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### **3. "PM2 not found"**
**Error:** PM2 process manager not installed.

**Solution:**
```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### **4. "Database connection failed"**
**Error:** Can't connect to managed database.

**Solution:**
- Check DATABASE_URL in .env
- Verify database is running in DigitalOcean dashboard
- Check firewall rules allow connection
- Test connection: `psql $DATABASE_URL`

### **5. "Nginx configuration error"**
**Error:** Nginx fails to start.

**Solution:**
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### **6. "SSL certificate issues"**
**Error:** Let's Encrypt certificate generation fails.

**Solution:**
```bash
# Check domain DNS settings
nslookup yourdomain.com

# Test certificate generation
sudo certbot --nginx -d yourdomain.com --dry-run

# Renew certificates
sudo certbot renew --dry-run
```

## 🚨 **Common API Issues**

### **1. "API key authentication failed"**
**Error:** Invalid or missing API key.

**Solution:**
```bash
# Check API key in request headers
curl -H "X-API-Key: your-api-key" http://localhost/v1/commodities

# Verify API key in .env file
grep API_KEY .env
```

### **2. "Rate limit exceeded"**
**Error:** Too many requests.

**Solution:**
- Wait for rate limit window to reset
- Use admin API key for higher limits
- Check rate limit configuration in .env

### **3. "CORS errors"**
**Error:** Frontend can't access API.

**Solution:**
```bash
# Check CORS configuration in .env
grep CORS_ORIGINS .env

# Add your frontend domain to CORS_ORIGINS
CORS_ORIGINS="https://yourdomain.com,http://localhost:3000"
```

### **4. "Health check failing"**
**Error:** Health endpoint returns error.

**Solution:**
```bash
# Check application logs
pm2 logs ph-price-tracker

# Test health endpoint directly
curl http://localhost:3000/health

# Check if all services are running
pm2 status
```

## 🔧 **Debugging Commands**

### **Docker Debugging**
```bash
# Check container status
docker-compose -f docker-compose.production.yml ps

# View logs for specific service
docker-compose -f docker-compose.production.yml logs api
docker-compose -f docker-compose.production.yml logs postgres
docker-compose -f docker-compose.production.yml logs nginx

# Enter container for debugging
docker-compose -f docker-compose.production.yml exec api sh
docker-compose -f docker-compose.production.yml exec postgres psql -U postgres

# Check container resources
docker stats
```

### **DigitalOcean Debugging**
```bash
# Check system resources
htop
df -h
free -h

# Check service status
sudo systemctl status nginx
sudo systemctl status postgresql
pm2 status

# Check network connectivity
netstat -tlnp
ss -tlnp

# Check firewall rules
sudo ufw status
```

### **Database Debugging**
```bash
# Connect to database
psql $DATABASE_URL

# Check tables
\dt

# Check connections
SELECT * FROM pg_stat_activity;

# Check database size
SELECT pg_size_pretty(pg_database_size('ph_price_tracker'));
```

## 📊 **Performance Issues**

### **1. "API is slow"**
**Solutions:**
- Enable Redis caching
- Add database indexes
- Optimize queries
- Increase server resources

### **2. "High memory usage"**
**Solutions:**
- Check for memory leaks
- Optimize Node.js memory settings
- Increase server RAM
- Use PM2 cluster mode

### **3. "Database connection pool exhausted"**
**Solutions:**
- Increase connection pool size
- Optimize database queries
- Add read replicas
- Use connection pooling

## 🔒 **Security Issues**

### **1. "Unauthorized access"**
**Solutions:**
- Verify API keys are secure
- Check firewall rules
- Enable SSL/TLS
- Review access logs

### **2. "SQL injection attempts"**
**Solutions:**
- Verify input validation
- Use parameterized queries
- Enable security headers
- Monitor logs for attacks

## 📞 **Getting Help**

### **Log Locations**
- **Application logs**: `pm2 logs ph-price-tracker`
- **Nginx logs**: `/var/log/nginx/`
- **System logs**: `journalctl -u nginx`
- **Docker logs**: `docker-compose logs`

### **Useful Commands**
```bash
# Quick health check
curl -f http://localhost/health

# Test API endpoint
curl -H "X-API-Key: your-key" http://localhost/v1/commodities

# Check all services
docker-compose -f docker-compose.production.yml ps
pm2 status
sudo systemctl status nginx
```

### **Emergency Recovery**
```bash
# Restart all services
pm2 restart all
sudo systemctl restart nginx

# Rebuild Docker containers
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build

# Reset database (WARNING: loses data)
docker-compose -f docker-compose.production.yml down -v
docker-compose -f docker-compose.production.yml up -d
```

---

**💡 Pro Tip:** Always check logs first when troubleshooting. Most issues can be identified from error messages in the logs. 