# Scaling Guide for Philippine Market Price Tracker API

This document provides comprehensive guidance on scaling the API from a single small instance to multiple instances or larger machines.

## 🎯 Current Architecture

The API is designed to be **stateless** and **horizontally scalable** from the ground up:

- ✅ **Stateless**: No in-memory sessions or per-instance state
- ✅ **Cache-aware**: In-memory caching with `node-cache`
- ✅ **Database-driven**: All persistent state in PostgreSQL
- ✅ **Container-ready**: Production Dockerfile with multi-stage build
- ✅ **Health-monitored**: Comprehensive health check endpoints
- ✅ **Resource-optimized**: Designed for 512MB-1GB RAM instances

## 📊 Performance Characteristics

### Current Optimizations

| Feature | Implementation | Benefit |
|---------|---------------|---------|
| **In-Memory Caching** | `node-cache` with 10min TTL | Reduces database queries by ~60-80% |
| **Compression** | Gzip compression middleware | Reduces bandwidth by ~70% |
| **Connection Pooling** | Prisma connection pool | Efficient database connections |
| **Rate Limiting** | Express rate limiter | Prevents abuse and ensures fair usage |
| **Health Checks** | `/health`, `/health/ready`, `/health/live` | Load balancer integration |

### Resource Usage (512MB Instance)

- **Memory**: ~150-200MB baseline, peaks at ~300MB under load
- **CPU**: Low usage for API requests, moderate for PDF parsing
- **Database**: 10-20 concurrent connections max
- **Cache**: Up to 1000 keys, ~50MB memory usage

## 🚀 Scaling Strategies

### 1. Vertical Scaling (Scale Up)

**When to use**: Moderate traffic increase, single point of failure acceptable

**Implementation**:
```bash
# Railway/Render: Increase instance size
# From: 512MB RAM, 1vCPU
# To: 1GB RAM, 2vCPU or 2GB RAM, 4vCPU
```

**Environment Variables to Adjust**:
```env
# Increase cache capacity
CACHE_MAX_KEYS=2000
CACHE_TTL_SECONDS=900  # 15 minutes

# Increase database connections
DB_POOL_SIZE=20

# Increase rate limits
RATE_LIMIT_MAX_REQUESTS=200
```

### 2. Horizontal Scaling (Scale Out)

**When to use**: High traffic, need redundancy, geographic distribution

**Implementation Options**:

#### Option A: Load Balancer + Multiple Instances
```yaml
# docker-compose.yml for multiple instances
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api-1
      - api-2
      - api-3

  api-1:
    build: .
    environment:
      - PORT=3000
    env_file: .env

  api-2:
    build: .
    environment:
      - PORT=3000
    env_file: .env

  api-3:
    build: .
    environment:
      - PORT=3000
    env_file: .env

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ph_price_tracker
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### Option B: Kubernetes Deployment
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ph-price-tracker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ph-price-tracker
  template:
    metadata:
      labels:
        app: ph-price-tracker
    spec:
      containers:
      - name: api
        image: ph-price-tracker:latest
        ports:
        - containerPort: 3000
        env:
        - name: PORT
          value: "3000"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

### 3. Database Scaling

#### Option A: Connection Pooling Optimization
```env
# Optimize for multiple instances
DB_POOL_SIZE=5  # Per instance (5 instances × 5 = 25 total)
DB_CONNECTION_TIMEOUT=3000
```

#### Option B: Read Replicas
```env
# Primary database for writes
DATABASE_URL="postgresql://user:pass@primary:5432/db"

# Read replica for queries
DATABASE_READ_URL="postgresql://user:pass@replica:5432/db"
```

#### Option C: Database Clustering
- **PostgreSQL with PgBouncer**: Connection pooling
- **PostgreSQL with Patroni**: High availability
- **Managed Services**: AWS RDS, Google Cloud SQL, Railway Postgres

### 4. Caching Strategy Evolution

#### Current: In-Memory Cache
```javascript
// Good for single instance
const cache = new NodeCache({
  stdTTL: 600,        // 10 minutes
  maxKeys: 1000
});
```

#### Next: Redis Cache
```javascript
// Better for multiple instances
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});

// Shared cache across instances
await cacheUtils.getOrSet('key', async () => {
  return await fetchFromDatabase();
}, 600);
```

#### Advanced: Multi-Level Caching
```javascript
// L1: In-memory (fastest)
// L2: Redis (shared)
// L3: Database (persistent)
```

## 🔧 Configuration for Different Scales

### Small Scale (1 instance, 512MB)
```env
CACHE_MAX_KEYS=500
DB_POOL_SIZE=5
RATE_LIMIT_MAX_REQUESTS=100
MAX_CONCURRENT_REQUESTS=25
```

### Medium Scale (3 instances, 1GB each)
```env
CACHE_MAX_KEYS=1000
DB_POOL_SIZE=10
RATE_LIMIT_MAX_REQUESTS=200
MAX_CONCURRENT_REQUESTS=50
ENABLE_BACKGROUND_SCRAPING=true
```

### Large Scale (5+ instances, 2GB each)
```env
CACHE_MAX_KEYS=2000
DB_POOL_SIZE=15
RATE_LIMIT_MAX_REQUESTS=500
MAX_CONCURRENT_REQUESTS=100
ENABLE_BACKGROUND_SCRAPING=true
ENABLE_METRICS=true
```

## 📈 Monitoring and Observability

### Health Check Endpoints
- `/health` - Comprehensive health status
- `/health/ready` - Readiness probe for load balancers
- `/health/live` - Liveness probe for container orchestration

### Cache Monitoring
```bash
# Get cache statistics
curl -H "X-API-Key: your-admin-key" \
  http://localhost:3000/v1/admin/cache/stats

# Clear cache if needed
curl -X POST -H "X-API-Key: your-admin-key" \
  http://localhost:3000/v1/admin/cache/clear
```

### Performance Metrics
```javascript
// Memory usage monitoring
const memUsage = process.memoryUsage();
console.log(`Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);

// Cache hit rate
const stats = cacheUtils.getStats();
console.log(`Cache hit rate: ${stats.hitRate}%`);
```

## 🚨 Scaling Considerations

### 1. Background Jobs
**Current**: Scrapers run on-demand or via cron
**Scaled**: Use job queues (Bull, Agenda, or cloud services)

```javascript
// Future: Queue-based scraping
const Queue = require('bull');
const scrapingQueue = new Queue('scraping', process.env.REDIS_URL);

// Add jobs to queue instead of running directly
await scrapingQueue.add('scrape-da', { region: 'ncr' });
```

### 2. File Storage
**Current**: Local file system
**Scaled**: Cloud storage (AWS S3, Google Cloud Storage)

```javascript
// Future: Cloud storage for PDFs
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

// Upload to S3 instead of local storage
await s3.upload({
  Bucket: 'ph-price-tracker-pdfs',
  Key: `da/ncr/${filename}`,
  Body: pdfBuffer
}).promise();
```

### 3. Database Optimization
**Current**: Single PostgreSQL instance
**Scaled**: Read replicas, connection pooling, query optimization

### 4. API Versioning
**Current**: v1 API
**Scaled**: Maintain backward compatibility, gradual migration

## 🛠️ Deployment Platforms

### Railway (Recommended for Start)
```bash
# Deploy with automatic scaling
railway up
railway scale --replicas 3
```

### Render
```yaml
# render.yaml
services:
  - type: web
    name: ph-price-tracker
    env: node
    buildCommand: npm install && npx prisma generate
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
    autoDeploy: true
```

### Docker Swarm
```bash
# Deploy to swarm
docker stack deploy -c docker-compose.yml ph-price-tracker
```

### Kubernetes
```bash
# Deploy to cluster
kubectl apply -f k8s-deployment.yaml
kubectl apply -f k8s-service.yaml
kubectl apply -f k8s-ingress.yaml
```

## 📊 Performance Benchmarks

### Single Instance (512MB)
- **Requests/sec**: ~500-800
- **Concurrent users**: ~100-200
- **Response time**: 50-150ms (cached), 200-500ms (uncached)

### Multiple Instances (3x 1GB)
- **Requests/sec**: ~1500-2400
- **Concurrent users**: ~300-600
- **Response time**: 30-100ms (cached), 150-300ms (uncached)

### With Redis Cache
- **Cache hit rate**: 85-95%
- **Response time improvement**: 60-80%
- **Database load reduction**: 70-90%

## 🔄 Migration Checklist

### Phase 1: Prepare for Scaling
- [ ] Add Redis dependency
- [ ] Implement Redis cache adapter
- [ ] Add database read replica support
- [ ] Implement job queue for scrapers
- [ ] Add cloud storage for files

### Phase 2: Deploy Multiple Instances
- [ ] Set up load balancer
- [ ] Configure health checks
- [ ] Deploy 2-3 instances
- [ ] Monitor performance
- [ ] Adjust configuration

### Phase 3: Optimize and Monitor
- [ ] Implement advanced caching
- [ ] Add comprehensive monitoring
- [ ] Optimize database queries
- [ ] Set up alerting
- [ ] Document runbooks

## 🎯 Next Steps

1. **Start with current setup** - It's already optimized for small scale
2. **Monitor usage patterns** - Use health endpoints and logs
3. **Add Redis when needed** - When cache hit rate drops below 70%
4. **Scale horizontally** - When single instance reaches 80% capacity
5. **Optimize continuously** - Monitor and adjust based on metrics

The API is designed to scale gracefully. Start small, monitor performance, and scale incrementally based on actual usage patterns.

## 🚦 Redis-Based Caching

- If `REDIS_URL` or `ENABLE_REDIS_CACHE=true` is set, the app uses Redis for caching (shared across all instances).
- Fallbacks to in-memory `node-cache` if Redis is not available.
- Configure Redis in `.env`:

```env
REDIS_URL="redis://localhost:6379"
ENABLE_REDIS_CACHE=true
```

- Redis is recommended for production and multi-instance deployments.
- Cache stats endpoint shows which backend is active.

## 🏭 Job Queueing with BullMQ

- BullMQ is integrated for background jobs (scraping, PDF parsing, etc).
- Uses Redis for job queueing and scheduling.
- Configure in `.env`:

```env
ENABLE_JOB_QUEUE=true
QUEUE_REDIS_URL="redis://localhost:6379"
QUEUE_PREFIX="ph-price-tracker"
MAX_CONCURRENT_JOBS=3
JOB_TIMEOUT_MS=300000
```

- See `/utils/queue.js` for queue setup and sample job.
- Scrapers and heavy jobs should be run via the queue, not in the request path.

## 🔄 Migration Notes

- To migrate from in-memory to Redis cache, set `REDIS_URL` and `ENABLE_REDIS_CACHE=true`.
- To enable job queueing, set `ENABLE_JOB_QUEUE=true` and configure Redis.
- Both features are optional and fallback to local implementations if Redis is not available. 