#!/bin/bash

# Environment Setup Script for Philippine Market Price Tracker API
# This script helps you set up your .env file with secure keys

set -e

echo "🔧 Setting up environment variables for Philippine Market Price Tracker API..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if .env already exists
if [ -f ".env" ]; then
    print_warning ".env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Setup cancelled. Your existing .env file is preserved."
        exit 0
    fi
fi

# Copy example file
print_status "Creating .env file from template..."
cp env.example .env

# Generate secure keys
print_status "Generating secure API keys..."

# Generate secure keys using openssl
ADMIN_API_KEY=$(openssl rand -hex 32)
API_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# Update .env file with generated keys
print_status "Updating .env file with secure keys..."

# Use sed to replace placeholder values with generated keys
sed -i.bak "s/your-super-secret-admin-api-key-here-minimum-32-characters/$ADMIN_API_KEY/g" .env
sed -i.bak "s/your-super-secret-api-key-here-minimum-32-characters/$API_KEY/g" .env
sed -i.bak "s/your-jwt-secret-key-here-minimum-32-characters/$JWT_SECRET/g" .env
sed -i.bak "s/your-session-secret-here/$SESSION_SECRET/g" .env

# Remove backup file
rm -f .env.bak

print_success "Secure keys generated and saved to .env file!"

# Display generated keys (for reference)
echo ""
print_status "Generated secure keys (save these for reference):"
echo "ADMIN_API_KEY: $ADMIN_API_KEY"
echo "API_KEY: $API_KEY"
echo "JWT_SECRET: $JWT_SECRET"
echo "SESSION_SECRET: $SESSION_SECRET"
echo ""

# Ask for database configuration
print_status "Database configuration..."
echo "Choose your database setup:"
echo "1) Local PostgreSQL (Development)"
echo "2) DigitalOcean Managed Database (Production)"
echo "3) Docker Compose (Internal networking)"
echo "4) Skip for now (edit manually later)"

read -p "Enter your choice (1-4): " db_choice

case $db_choice in
    1)
        print_status "Setting up for local PostgreSQL..."
        read -p "Enter database username (default: postgres): " db_user
        db_user=${db_user:-postgres}
        read -s -p "Enter database password: " db_password
        echo
        read -p "Enter database name (default: ph_price_tracker): " db_name
        db_name=${db_name:-ph_price_tracker}
        
        # Update DATABASE_URL for local PostgreSQL
        sed -i.bak "s|postgresql://postgres:password@localhost:5432/ph_price_tracker|postgresql://$db_user:$db_password@localhost:5432/$db_name|g" .env
        rm -f .env.bak
        print_success "Local PostgreSQL configuration saved!"
        ;;
    2)
        print_status "Setting up for DigitalOcean Managed Database..."
        read -p "Enter database host: " db_host
        read -p "Enter database username: " db_user
        read -s -p "Enter database password: " db_password
        echo
        read -p "Enter database name: " db_name
        
        # Update DATABASE_URL for DigitalOcean
        sed -i.bak "s|postgresql://postgres:password@localhost:5432/ph_price_tracker|postgresql://$db_user:$db_password@$db_host:5432/$db_name?sslmode=require\&ssl=true|g" .env
        rm -f .env.bak
        print_success "DigitalOcean database configuration saved!"
        ;;
    3)
        print_status "Setting up for Docker Compose..."
        read -p "Enter database username (default: postgres): " db_user
        db_user=${db_user:-postgres}
        read -s -p "Enter database password: " db_password
        echo
        read -p "Enter database name (default: ph_price_tracker): " db_name
        db_name=${db_name:-ph_price_tracker}
        
        # Update DATABASE_URL for Docker Compose
        sed -i.bak "s|postgresql://postgres:password@localhost:5432/ph_price_tracker|postgresql://$db_user:$db_password@postgres:5432/$db_name|g" .env
        rm -f .env.bak
        print_success "Docker Compose database configuration saved!"
        ;;
    4)
        print_warning "Database configuration skipped. Please edit .env manually."
        ;;
    *)
        print_error "Invalid choice. Database configuration skipped."
        ;;
esac

# Ask for environment
print_status "Environment configuration..."
echo "Choose your environment:"
echo "1) Development"
echo "2) Production"

read -p "Enter your choice (1-2): " env_choice

case $env_choice in
    1)
        print_status "Setting up for development..."
        sed -i.bak "s/NODE_ENV=production/NODE_ENV=development/g" .env
        rm -f .env.bak
        ;;
    2)
        print_status "Setting up for production..."
        sed -i.bak "s/NODE_ENV=development/NODE_ENV=production/g" .env
        rm -f .env.bak
        ;;
    *)
        print_warning "Invalid choice. Using development environment."
        ;;
esac

# Ask for CORS origins
print_status "CORS configuration..."
read -p "Enter your frontend domain (e.g., https://yourdomain.com): " cors_origin
if [ ! -z "$cors_origin" ]; then
    # Add the new origin to CORS_ORIGINS
    sed -i.bak "s|https://yourdomain.com|$cors_origin|g" .env
    rm -f .env.bak
    print_success "CORS origin updated!"
fi

# Final instructions
echo ""
print_success "🎉 Environment setup completed!"
echo ""
print_status "Next steps:"
echo "1. Review your .env file: nano .env"
echo "2. Test the configuration: npm run test"
echo "3. Start the application: npm run dev"
echo "4. For production: npm run deploy:docker"
echo ""
print_warning "Important security notes:"
echo "- Keep your API keys secure and never commit them to version control"
echo "- Use different keys for development and production"
echo "- Enable SSL/TLS for production database connections"
echo "- Set proper CORS origins for production"
echo ""
print_success "Your Philippine Market Price Tracker API is ready to use!" 