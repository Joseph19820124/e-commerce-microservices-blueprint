# Docker Infrastructure

This directory contains all Docker-related configurations for the e-commerce microservices platform.

## Directory Structure

```
docker/
├── docker-compose.yml          # Development environment configuration
├── docker-compose.prod.yml     # Production environment configuration
├── .env.example               # Environment variables template
├── nginx/                     # Nginx API Gateway configurations
│   ├── nginx.conf            # Main Nginx configuration
│   └── conf.d/               # Additional Nginx configurations
│       └── default.conf      # Default server configuration
└── base-images/              # Base Docker images for services
    ├── node-base.Dockerfile  # Base image for Node.js services
    ├── java-base.Dockerfile  # Base image for Java services
    └── python-base.Dockerfile # Base image for Python services
```

## Quick Start

### Prerequisites
- Docker Desktop (includes Docker Engine and Docker Compose)
- At least 8GB of available RAM
- 20GB of free disk space

### Development Environment Setup

1. **Copy environment variables**
   ```bash
   cp .env.example .env
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Check service health**
   ```bash
   docker-compose ps
   ```

4. **View logs**
   ```bash
   docker-compose logs -f [service-name]
   ```

5. **Stop all services**
   ```bash
   docker-compose down
   ```

## Services Overview

### Infrastructure Services
- **MongoDB**: NoSQL database for product catalog (Port: 27017)
- **PostgreSQL**: Relational database for user profiles (Port: 5432)
- **Redis**: In-memory cache for shopping cart (Port: 6379)
- **Elasticsearch**: Search engine for product search (Port: 9200)
- **Kibana**: Elasticsearch visualization (Port: 5601)
- **Nginx**: API Gateway and load balancer (Port: 80)

### Application Services
- **Product Service**: Node.js/Express (Port: 3001)
- **Cart Service**: Spring Boot/Java (Port: 8081)
- **User Service**: Python/FastAPI (Port: 8001)
- **Search Service**: Node.js (Port: 3002)
- **Frontend**: React application (Port: 3000)

## Network Architecture

All services communicate through a custom bridge network `ecommerce-network` with subnet `172.20.0.0/16`.

### API Routes (via Nginx)
- `/` - Frontend application
- `/api/products` - Product catalog service
- `/api/cart` - Shopping cart service
- `/api/users` - User profile service
- `/api/search` - Search service

## Data Persistence

Data is persisted using named volumes:
- `mongodb_data` - MongoDB data
- `postgres_data` - PostgreSQL data
- `redis_data` - Redis persistence
- `elasticsearch_data` - Elasticsearch indices

## Health Checks

All services include health check configurations:
- Databases: Connection tests
- Applications: HTTP endpoint checks
- Intervals: 10-30 seconds depending on service

## Production Deployment

The `docker-compose.prod.yml` file includes:
- Multi-replica deployments
- Resource limits
- Security configurations
- Cluster setups for databases
- SSL/TLS support

### Production Environment Variables
Create a `.env.prod` file with production values:
```bash
DOCKER_REGISTRY=your-registry.com
VERSION=1.0.0
DOMAIN_NAME=your-domain.com
# ... other production configs
```

### Deploy to Production
```bash
docker stack deploy -c docker-compose.prod.yml ecommerce
```

## Troubleshooting

### Common Issues

1. **Port conflicts**
   - Check if ports are already in use: `lsof -i :PORT`
   - Modify port mappings in docker-compose.yml if needed

2. **Memory issues**
   - Increase Docker Desktop memory allocation
   - Reduce Elasticsearch heap size in environment variables

3. **Network connectivity**
   - Ensure all services are on the same network
   - Check service names match in configuration files

### Useful Commands

```bash
# View service logs
docker-compose logs -f [service-name]

# Execute commands in containers
docker-compose exec [service-name] [command]

# Rebuild specific service
docker-compose build [service-name]

# Remove all data volumes (WARNING: deletes all data)
docker-compose down -v

# Check resource usage
docker stats
```

## Security Notes

- Default passwords are for development only
- Use strong passwords in production
- Enable SSL/TLS for all services in production
- Implement proper firewall rules
- Use secrets management for sensitive data