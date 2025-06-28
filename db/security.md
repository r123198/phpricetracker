# Database Security Documentation

## 🔐 Database User Privileges

### Production Database User
The database user specified in `DATABASE_URL` should have **minimal privileges**:

```sql
-- Create a dedicated user for the application
CREATE USER price_tracker_app WITH PASSWORD 'secure_password';

-- Grant only necessary privileges
GRANT CONNECT ON DATABASE price_tracker TO price_tracker_app;
GRANT USAGE ON SCHEMA public TO price_tracker_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO price_tracker_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO price_tracker_app;

-- Grant privileges on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO price_tracker_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO price_tracker_app;
```

### Security Checklist
- [ ] **No superuser privileges**
- [ ] **No admin roles**
- [ ] **Only access to needed schemas**
- [ ] **Only necessary table operations (SELECT, INSERT, UPDATE, DELETE)**
- [ ] **No DDL privileges (CREATE, ALTER, DROP)**

## 🔒 SSL Connection

### Production SSL Connection String
```bash
# Example production DATABASE_URL with SSL
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require&ssl=true"
```

### SSL Modes
- `sslmode=require`: Enforce SSL (recommended for production)
- `sslmode=prefer`: Use SSL if available
- `sslmode=disable`: No SSL (development only)

## 🏗️ Prisma Schema Constraints

### Current Schema with Security Constraints
```prisma
model Commodity {
  id          String   @id @default(cuid())
  name        String   @unique // Prevent duplicate commodities
  category    String   @db.VarChar(100) // Limit length
  slug        String   @unique // URL-safe identifier
  description String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relationship with prices
  prices Price[]

  @@map("commodities")
}

model Price {
  id          String    @id @default(cuid())
  commodityId String    // Foreign key
  price       Decimal   @db.Decimal(10, 2) // Precision for currency
  unit        String    @db.VarChar(50)
  region      String    @db.VarChar(100)
  source      String    @db.VarChar(50)
  date        DateTime  @db.Date
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Foreign key relationship
  commodity Commodity @relation(fields: [commodityId], references: [id], onDelete: Cascade)

  // Composite unique constraint to prevent duplicate price entries
  @@unique([commodityId, region, date, source], name: "unique_price_entry")
  @@map("prices")
}
```

### Security Constraints Added
1. **NOT NULL Constraints**: All required fields are non-nullable
2. **UNIQUE Constraints**: 
   - `commodity.name`: Prevent duplicate commodity names
   - `commodity.slug`: Ensure unique URL identifiers
   - `price` composite: Prevent duplicate price entries for same commodity/region/date/source
3. **Foreign Key Constraints**: `price.commodityId` references `commodity.id`
4. **Data Type Constraints**: 
   - `price.price`: Decimal with precision for currency
   - String fields: Limited length with `@db.VarChar()`
5. **Cascade Delete**: When commodity is deleted, related prices are deleted

## 📊 Database Indexes for Performance & Security

### Recommended Indexes
```sql
-- Index on frequently queried fields
CREATE INDEX idx_prices_region_date ON prices(region, date);
CREATE INDEX idx_prices_source_date ON prices(source, date);
CREATE INDEX idx_prices_commodity_date ON prices(commodity_id, date);

-- Partial index for recent prices
CREATE INDEX idx_prices_recent ON prices(date) WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- Index on commodity name for fast lookups
CREATE INDEX idx_commodities_name ON commodities(name);
CREATE INDEX idx_commodities_category ON commodities(category);
```

## 🛡️ SQL Injection Protection

### Prisma Query Builder (Recommended)
```javascript
// ✅ Safe - Parameterized queries
const prices = await prisma.price.findMany({
  where: {
    region: region,
    date: {
      gte: startDate,
      lte: endDate
    }
  }
});

// ✅ Safe - Input validation before query
const { validate } = require('../middleware/security/inputValidator');
const validatedRegion = validate.region(region);
```

### Raw SQL (Avoid unless necessary)
```javascript
// ❌ Dangerous - SQL injection vulnerable
const query = `SELECT * FROM prices WHERE region = '${region}'`;

// ✅ Safe - Parameterized raw query
const prices = await prisma.$queryRaw`
  SELECT * FROM prices 
  WHERE region = ${region} 
  AND date >= ${startDate}
`;
```

## 📝 Logging & Auditing

### Database Error Logging
```javascript
// Log database connection errors
prisma.$connect()
  .then(() => console.log('Database connected'))
  .catch(err => {
    console.error('Database connection failed:', err);
    // Alert monitoring system
  });

// Log query errors
try {
  const result = await prisma.price.findMany({ where: { region } });
} catch (error) {
  console.error('Database query failed:', {
    error: error.message,
    query: 'price.findMany',
    params: { region },
    timestamp: new Date().toISOString()
  });
  throw error;
}
```

### Audit Trail (Future Enhancement)
```sql
-- Create audit table for sensitive operations
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  operation VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
  record_id VARCHAR(50),
  old_values JSONB,
  new_values JSONB,
  user_id VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create trigger for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, operation, record_id, old_values, new_values)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

## 🔧 Environment Configuration

### Required Environment Variables
```bash
# Database
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"

# Security
NODE_ENV="production"
ADMIN_API_KEY="your-secure-admin-api-key"
API_KEY="your-secure-api-key"

# CORS
CORS_ORIGINS="https://yourdomain.com,https://api.yourdomain.com"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"
```

## 🚨 Security Checklist

### Database Security
- [ ] Use dedicated database user with minimal privileges
- [ ] Enable SSL connections in production
- [ ] Implement proper constraints (NOT NULL, UNIQUE, Foreign Keys)
- [ ] Use parameterized queries (Prisma Query Builder)
- [ ] Log database errors and suspicious activities
- [ ] Regular database backups
- [ ] Monitor database access logs

### Application Security
- [ ] Validate all inputs before database operations
- [ ] Use environment variables for sensitive data
- [ ] Implement proper error handling
- [ ] Log security events
- [ ] Regular security audits
- [ ] Keep dependencies updated

### Network Security
- [ ] Use HTTPS in production
- [ ] Implement proper CORS policies
- [ ] Use rate limiting
- [ ] Monitor for suspicious traffic patterns
- [ ] Regular penetration testing 