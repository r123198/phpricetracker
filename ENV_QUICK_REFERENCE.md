# 🚀 Environment Variables Quick Reference

## 🔐 **CRITICAL (Required for Production)**

| Variable | Example | Description |
|----------|---------|-------------|
| `ADMIN_API_KEY` | `openssl rand -hex 32` | Admin API key (32+ chars) |
| `API_KEY` | `openssl rand -hex 32` | Regular API key (32+ chars) |
| `JWT_SECRET` | `openssl rand -hex 32` | JWT signing secret |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db?sslmode=require` | Database connection |
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `3000` | Server port |

## 🌐 **SECURITY & CORS**

| Variable | Example | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `https://yourdomain.com` | Allowed frontend domains |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |

## 🗄️ **DATABASE CONFIGURATIONS**

### **DigitalOcean Managed Database**
```env
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require&ssl=true"
```

### **Local PostgreSQL**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/ph_price_tracker"
```

### **Docker Compose**
```env
DATABASE_URL="postgresql://postgres:password@postgres:5432/ph_price_tracker"
```

## 🚀 **SCALABILITY (Optional but Recommended)**

| Variable | Example | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `ENABLE_REDIS_CACHE` | `true` | Enable Redis caching |
| `ENABLE_JOB_QUEUE` | `true` | Enable background jobs |
| `CACHE_TTL_SECONDS` | `600` | Cache timeout (10 min) |

## 📊 **PERFORMANCE**

| Variable | Example | Description |
|----------|---------|-------------|
| `ENABLE_COMPRESSION` | `true` | Enable gzip compression |
| `ENABLE_HEALTH_CHECKS` | `true` | Enable health endpoints |
| `MAX_CONCURRENT_REQUESTS` | `50` | Request concurrency limit |
| `REQUEST_TIMEOUT_MS` | `30000` | Request timeout (30s) |

## 🎯 **Quick Setup Commands**

### **1. Generate Secure Keys**
```bash
# Generate all secure keys at once
openssl rand -hex 32  # Run this 4 times for all keys
```

### **2. Interactive Setup**
```bash
# Run the interactive setup script
npm run setup:env
```

### **3. Manual Setup**
```bash
# Copy template
cp env.example .env

# Edit with your values
nano .env
```

### **4. Test Configuration**
```bash
# Test your setup
npm run test
```

## 🔧 **Platform-Specific Variables**

### **DigitalOcean**
```env
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

### **Railway**
```env
RAILWAY_TOKEN=your_railway_token
```

### **Render**
```env
RENDER_TOKEN=your_render_token
```

### **Heroku**
```env
HEROKU_APP_NAME=your-app-name
```

## 🚨 **Security Checklist**

- [ ] Generate unique keys for each environment
- [ ] Use SSL/TLS for production database
- [ ] Set proper CORS origins (no wildcards)
- [ ] Enable rate limiting
- [ ] Use managed database when possible
- [ ] Never commit `.env` to version control

## 💡 **Pro Tips**

1. **Use different keys** for development and production
2. **Enable Redis** for better performance
3. **Set up health checks** for monitoring
4. **Use managed databases** for production
5. **Enable compression** for faster responses

---

**📖 Full documentation**: [env.example](env.example)  
**🔧 Interactive setup**: `npm run setup:env`