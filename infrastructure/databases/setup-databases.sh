#!/bin/bash

# Database Infrastructure Setup Script
# Sets up all databases for the e-commerce platform

set -e

echo "🗄️  Setting up E-commerce Database Infrastructure"

# Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template"
    cp .env.example .env
    echo "⚠️  Please update the .env file with your configurations"
fi

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose exec -T $service_name timeout 1 bash -c "cat < /dev/null > /dev/tcp/localhost/$port" 2>/dev/null; then
            echo "✅ $service_name is ready"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts - $service_name not ready yet..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name failed to start after $max_attempts attempts"
    return 1
}

# Start MongoDB cluster
echo "🍃 Starting MongoDB cluster..."
cd mongodb
docker-compose -f docker-compose.mongodb.yml up -d
wait_for_service mongodb-primary 27017
cd ..

# Start Redis cluster  
echo "🔴 Starting Redis cluster..."
cd redis
docker-compose -f docker-compose.redis.yml up -d
wait_for_service redis-master 6379
cd ..

# Start PostgreSQL cluster
echo "🐘 Starting PostgreSQL cluster..."
cd postgresql
docker-compose -f docker-compose.postgresql.yml up -d
wait_for_service postgres-master 5432
cd ..

# Start Elasticsearch cluster
echo "🔍 Starting Elasticsearch cluster..."
cd elasticsearch
docker-compose -f docker-compose.elasticsearch.yml up -d
wait_for_service elasticsearch-master 9200
cd ..

echo "✅ All database services started successfully!"
echo ""
echo "📋 Service Status:"
docker-compose ps

echo ""
echo "🌐 Access Information:"
echo "  MongoDB: localhost:27017 (admin/mongodb_admin_password)"
echo "  MongoDB Admin: http://localhost:8081"
echo "  Redis: localhost:6379"
echo "  PostgreSQL: localhost:5432 (postgres/postgres_password)"
echo "  Elasticsearch: http://localhost:9200"
echo "  Kibana: http://localhost:5601"
echo ""
echo "🔧 Management Commands:"
echo "  View logs: docker-compose logs -f [service-name]"
echo "  Stop all: docker-compose down"
echo "  Backup: docker-compose --profile backup up mongodb-backup"