#!/bin/bash

# DigitalOcean Deployment Script for Philippine Market Price Tracker API
# Run this script on your DigitalOcean droplet after creating it

set -e  # Exit on any error

echo "🚀 Starting DigitalOcean deployment for Philippine Market Price Tracker API..."

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
print_status "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_success "Node.js $NODE_VERSION and npm $NPM_VERSION installed"

# Install PM2 globally
print_status "Installing PM2 process manager..."
sudo npm install -g pm2

# Install Docker (for Redis)
print_status "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER
print_success "Docker installed"

# Install Nginx
print_status "Installing Nginx..."
sudo apt install nginx -y

# Install Certbot for SSL
print_status "Installing Certbot for SSL certificates..."
sudo apt install certbot python3-certbot-nginx -y

# Create application directory
APP_DIR="/home/$USER/ph-price-tracker-api"
print_status "Setting up application directory: $APP_DIR"

if [ -d "$APP_DIR" ]; then
    print_warning "Application directory already exists. Updating..."
    cd "$APP_DIR"
    git pull origin main
else
    print_status "Cloning repository..."
    git clone https://github.com/yourusername/ph-price-tracker-api.git "$APP_DIR"
    cd "$APP_DIR"
fi

# Install dependencies
print_status "Installing Node.js dependencies..."
npm install

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate

# Setup environment file
if [ ! -f ".env" ]; then
    print_status "Creating environment file..."
    cp env.example .env
    print_warning "Please edit .env file with your production values before continuing"
    print_warning "Run: nano .env"
    read -p "Press Enter after editing .env file..."
else
    print_success "Environment file already exists"
fi

# Setup database
print_status "Setting up database..."
read -p "Do you want to set up the database now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx prisma db push
    npx prisma db seed
    print_success "Database setup completed"
fi

# Start Redis with Docker (if enabled)
if grep -q "ENABLE_REDIS_CACHE=true" .env; then
    print_status "Starting Redis with Docker..."
    docker run -d --name redis-cache -p 6379:6379 redis:alpine
    print_success "Redis started on port 6379"
fi

# Start application with PM2
print_status "Starting application with PM2..."
pm2 start index.js --name "ph-price-tracker" --env production

# Save PM2 configuration
pm2 save
pm2 startup

print_success "Application started with PM2"

# Setup Nginx configuration
print_status "Setting up Nginx configuration..."
sudo tee /etc/nginx/sites-available/ph-price-tracker > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/ph-price-tracker /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

print_success "Nginx configured and started"

# Setup firewall
print_status "Setting up firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

print_success "Firewall configured"

# Display status
echo ""
print_success "🎉 Deployment completed successfully!"
echo ""
echo "📊 Application Status:"
pm2 status
echo ""
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager -l
echo ""
echo "🔗 Your API is now accessible at:"
echo "   HTTP:  http://$(curl -s ifconfig.me)"
echo "   (Add your domain and SSL certificate for HTTPS)"
echo ""
echo "📝 Next steps:"
echo "   1. Add your domain to Nginx configuration"
echo "   2. Get SSL certificate: sudo certbot --nginx -d yourdomain.com"
echo "   3. Monitor logs: pm2 logs ph-price-tracker"
echo "   4. Check health: curl http://localhost:3000/health"
echo ""
echo "📚 Useful commands:"
echo "   - View logs: pm2 logs ph-price-tracker"
echo "   - Restart app: pm2 restart ph-price-tracker"
echo "   - Monitor: pm2 monit"
echo "   - Check status: pm2 status"
echo ""
print_success "🚀 Your Philippine Market Price Tracker API is now live!" 