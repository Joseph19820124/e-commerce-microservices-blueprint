#!/bin/bash

# E-commerce Microservices Development Environment Setup Script
# This script sets up the complete development environment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# Script start
log_info "Starting E-commerce Microservices Development Environment Setup..."

# Check prerequisites
log_info "Checking prerequisites..."
check_command "node"
check_command "npm"
check_command "docker"
check_command "docker-compose"
check_command "git"

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js version 18 or higher is required. Current version: $(node --version)"
    exit 1
fi

log_success "Prerequisites check passed"

# Create necessary directories
log_info "Creating necessary directories..."
mkdir -p {logs,uploads,backups,tmp}
mkdir -p data/seeds
log_success "Directories created"

# Install root dependencies
log_info "Installing root dependencies..."
npm install
log_success "Root dependencies installed"

# Install service dependencies
log_info "Installing service dependencies..."
services=("product-catalog" "user-profile" "shopping-cart" "search")

for service in "${services[@]}"; do
    if [ -d "services/$service" ]; then
        log_info "Installing dependencies for $service..."
        cd "services/$service"
        npm install
        cd ../..
        log_success "$service dependencies installed"
    else
        log_warning "Service directory $service not found, skipping..."
    fi
done

# Install frontend dependencies
if [ -d "frontend/react-store-ui" ]; then
    log_info "Installing frontend dependencies..."
    cd frontend/react-store-ui
    npm install
    cd ../..
    log_success "Frontend dependencies installed"
fi

# Copy environment files
log_info "Setting up environment files..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_success ".env file created from template"
    else
        log_warning ".env.example not found, creating basic .env file"
        cat > .env << EOF
# Environment
NODE_ENV=development

# Database URLs
MONGODB_URI=mongodb://localhost:27017/ecommerce_dev
REDIS_URL=redis://localhost:6379
POSTGRES_URI=postgresql://localhost:5432/ecommerce_dev
ELASTICSEARCH_URL=http://localhost:9200

# Service Ports
PRODUCT_CATALOG_PORT=3001
USER_PROFILE_PORT=3002
SHOPPING_CART_PORT=3003
SEARCH_SERVICE_PORT=3004
FRONTEND_PORT=3000
API_GATEWAY_PORT=8080

# JWT Configuration
JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined
EOF
    fi
else
    log_info ".env file already exists, skipping..."
fi

# Create environment files for services
for service in "${services[@]}"; do
    if [ -d "services/$service" ]; then
        if [ ! -f "services/$service/.env" ]; then
            if [ -f "services/$service/.env.example" ]; then
                cp "services/$service/.env.example" "services/$service/.env"
                log_success "$service .env file created"
            fi
        fi
    fi
done

# Setup Git hooks
log_info "Setting up Git hooks..."
if [ -d ".git" ]; then
    # Pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Running pre-commit checks..."

# Run linting
npm run lint:check
if [ $? -ne 0 ]; then
    echo "Linting failed. Please fix the issues before committing."
    exit 1
fi

# Run tests
npm run test:quick
if [ $? -ne 0 ]; then
    echo "Tests failed. Please fix the issues before committing."
    exit 1
fi

echo "Pre-commit checks passed!"
EOF

    chmod +x .git/hooks/pre-commit
    log_success "Git hooks setup completed"
else
    log_warning "Not a git repository, skipping Git hooks setup"
fi

# Start databases
log_info "Starting database services..."
if docker-compose -f infrastructure/docker/docker-compose.yml ps | grep -q "Up"; then
    log_info "Some services are already running"
else
    docker-compose -f infrastructure/docker/docker-compose.yml up -d mongodb redis elasticsearch postgres
    log_success "Database services started"
fi

# Wait for databases to be ready
log_info "Waiting for databases to be ready..."
./scripts/utils/wait-for-databases.sh

# Initialize databases
log_info "Initializing databases..."
./scripts/setup/init-databases.sh

# Create initial data
log_info "Creating initial seed data..."
./scripts/setup/seed-data.sh

# Setup monitoring (optional)
if command -v docker-compose &> /dev/null; then
    read -p "Do you want to setup monitoring stack (Prometheus, Grafana)? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Starting monitoring stack..."
        docker-compose -f infrastructure/monitoring/docker-compose.monitoring.yml up -d
        log_success "Monitoring stack started"
        log_info "Grafana: http://localhost:3000 (admin/admin)"
        log_info "Prometheus: http://localhost:9090"
    fi
fi

# Verify installation
log_info "Verifying installation..."

# Check if services can start
log_info "Testing service startup..."
npm run test:services:health

if [ $? -eq 0 ]; then
    log_success "All services are healthy!"
else
    log_warning "Some services may have issues. Check the logs for details."
fi

# Final instructions
log_success "Development environment setup completed!"
echo
log_info "Next steps:"
echo "1. Review and update .env files if needed"
echo "2. Start the development servers:"
echo "   npm run dev"
echo "3. Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   API Gateway: http://localhost:8080"
echo "   Product Catalog: http://localhost:3001"
echo "   User Profile: http://localhost:3002"
echo "   Shopping Cart: http://localhost:3003"
echo "   Search Service: http://localhost:3004"
echo
log_info "For troubleshooting, check the documentation in docs/troubleshooting.md"
log_info "Happy coding! 🚀"