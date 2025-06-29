#!/bin/bash

# Docker Deployment Script for Philippine Market Price Tracker API
# This script handles all the missing pieces and potential deployment issues

set -e  # Exit on any error

echo "🐳 Starting Docker deployment for Philippine Market Price Tracker API..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from example..."
    cp env.example .env
    print_warning "Please edit .env file with your production values before continuing"
    print_warning "Run: nano .env"
    read -p "Press Enter after editing .env file..."
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs uploads ssl

# Set proper permissions
chmod 755 logs uploads ssl

# Check if database initialization file exists
if [ ! -f "db/init.sql" ]; then
    print_warning "Database initialization file not found. Creating..."
    mkdir -p db
    cat > db/init.sql << 'EOF'
-- Database initialization script for Philippine Market Price Tracker
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Tables will be created by Prisma migrations
-- This file is mainly for any custom initialization needed
EOF
fi

# Set default environment variables if not set
print_status "Setting up environment variables..."

# Check if required environment variables are set
if [ -z "$DB_USER" ]; then
    export DB_USER=postgres
    print_warning "DB_USER not set, using default: postgres"
fi

if [ -z "$DB_PASSWORD" ]; then
    export DB_PASSWORD=password
    print_warning "DB_PASSWORD not set, using default: password"
fi

if [ -z "$DB_NAME" ]; then
    export DB_NAME=ph_price_tracker
    print_warning "DB_NAME not set, using default: ph_price_tracker"
fi

# Stop any existing containers
print_status "Stopping any existing containers..."
docker-compose -f docker-compose.production.yml down --remove-orphans 2>/dev/null || true

# Remove old images to ensure fresh build
print_status "Removing old images..."
docker rmi ph-price-tracker-api:latest 2>/dev/null || true

# Build the application
print_status "Building Docker images..."
docker-compose -f docker-compose.production.yml build --no-cache

# Start the services
print_status "Starting services..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 10

# Check if services are running
print_status "Checking service status..."
docker-compose -f docker-compose.production.yml ps

# Wait for database to be ready
print_status "Waiting for database to be ready..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U $DB_USER > /dev/null 2>&1; then
        print_success "Database is ready!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "Database failed to start within expected time"
        docker-compose -f docker-compose.production.yml logs postgres
        exit 1
    fi
    
    print_status "Waiting for database... (attempt $attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

# Run database migrations
print_status "Running database migrations..."
docker-compose -f docker-compose.production.yml exec -T api npx prisma generate
docker-compose -f docker-compose.production.yml exec -T api npx prisma db push

# Seed the database
print_status "Seeding the database..."
docker-compose -f docker-compose.production.yml exec -T api npm run db:seed

# Check if API is responding
print_status "Checking API health..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        print_success "API is healthy!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "API failed to start within expected time"
        docker-compose -f docker-compose.production.yml logs api
        exit 1
    fi
    
    print_status "Waiting for API... (attempt $attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

# Check if Nginx is responding
print_status "Checking Nginx..."
max_attempts=10
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost/health > /dev/null 2>&1; then
        print_success "Nginx is working!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        print_warning "Nginx health check failed, but continuing..."
        break
    fi
    
    print_status "Waiting for Nginx... (attempt $attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

# Display final status
echo ""
print_success "🎉 Docker deployment completed successfully!"
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.production.yml ps
echo ""
echo "🔗 Your API is now accessible at:"
echo "   HTTP:  http://localhost"
echo "   API:   http://localhost/v1/commodities"
echo "   Health: http://localhost/health"
echo "   Docs:  http://localhost/api-docs"
echo ""
echo "📝 Useful commands:"
echo "   - View logs: npm run deploy:docker:logs"
echo "   - Stop services: npm run deploy:docker:down"
echo "   - Restart: npm run deploy:docker:restart"
echo "   - Check status: docker-compose -f docker-compose.production.yml ps"
echo ""
echo "🔒 Security Notes:"
echo "   - Change default database passwords in .env"
echo "   - Add SSL certificates to ./ssl/ directory"
echo "   - Configure firewall rules"
echo "   - Set up proper domain names"
echo ""
print_success "🚀 Your Philippine Market Price Tracker API is now running in Docker!" 