# Base Images

Standardized Docker base images for the e-commerce microservices platform. These images provide consistent, secure, and optimized foundations for all services.

## Available Base Images

### Node.js Base (`ecommerce-node-base`)
- **Base**: `node:20-alpine`
- **Features**:
  - Non-root user (`nodejs:1001`)
  - Security hardened
  - Pre-installed common dependencies
  - Health check template
  - Optimized for microservices

### Java Base (`ecommerce-java-base`)
- **Base**: `eclipse-temurin:17-jre-alpine` 
- **Features**:
  - Multi-stage build (JDK builder + JRE runtime)
  - Maven pre-configured
  - Non-root user (`spring:1001`)
  - JVM optimization
  - Spring Boot ready

### Python Base (`ecommerce-python-base`)
- **Base**: `python:3.11-slim`
- **Features**:
  - FastAPI/Flask ready
  - Non-root user (`python`)
  - Pre-installed common packages
  - Uvicorn server
  - Health check endpoint

### React Base (`ecommerce-react-base`)
- **Base**: Multi-stage `node:20-alpine` + `nginx:alpine`
- **Features**:
  - Optimized production builds
  - Nginx web server
  - Static asset serving
  - Health check endpoint

### Utilities Base (`ecommerce-utils-base`)
- **Base**: `alpine:3.18`
- **Features**:
  - Common CLI tools (curl, jq, yq)
  - Git and bash
  - SSL certificates
  - Non-root user

## Usage

### Building Base Images

```bash
# Build all base images
./build-base-images.sh

# Build with custom registry
DOCKER_REGISTRY=my-registry.com ./build-base-images.sh

# Build for multiple platforms
BUILD_PLATFORM=linux/amd64,linux/arm64 ./build-base-images.sh
```

### Using in Microservices

#### Node.js Service Example
```dockerfile
FROM localhost:5000/ecommerce-node-base:latest

# Copy application files
COPY . .

# Install additional dependencies if needed
RUN npm install

# Override health check for specific service
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Override start command
CMD ["node", "app.js"]
```

#### Java Service Example
```dockerfile
FROM localhost:5000/ecommerce-java-base:latest as builder

# This will use the builder stage from base image
COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src
RUN mvn package -DskipTests

# Runtime will automatically use the runtime stage
```

#### Python Service Example
```dockerfile
FROM localhost:5000/ecommerce-python-base:latest

# Copy requirements and install additional packages
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application
COPY . .

# Override default FastAPI command if needed
CMD ["python", "main.py"]
```

## Local Development

### Start Local Registry
```bash
# Start local Docker registry for base images
docker-compose -f docker-compose.base.yml up registry -d
```

### Build and Test
```bash
# Build base images locally
./build-base-images.sh

# Test all base images
docker-compose -f docker-compose.base.yml --profile test up

# Run security scans
docker-compose -f docker-compose.base.yml --profile security up
```

## Security Features

### Hardening Measures
- **Non-root users**: All images run as non-privileged users
- **Minimal attack surface**: Based on Alpine Linux when possible
- **Security updates**: Automated package updates
- **No secrets**: No hardcoded credentials or keys
- **Read-only filesystem**: Where applicable

### Vulnerability Scanning
```bash
# Scan for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image localhost:5000/ecommerce-node-base:latest

# Generate security report
docker-compose -f docker-compose.base.yml --profile security up
```

## Best Practices

### Dockerfile Guidelines
1. **Multi-stage builds**: Separate build and runtime stages
2. **Layer optimization**: Group RUN commands to reduce layers
3. **Cache efficiency**: Order instructions by change frequency
4. **Security first**: Run as non-root, minimal packages
5. **Health checks**: Include appropriate health checks

### Image Naming Convention
- Format: `ecommerce-{language}-base:{version}`
- Tags: Use semantic versioning + `latest`
- Registry: Consistent registry prefix

### Resource Optimization
- **Size**: Keep images as small as possible
- **Layers**: Minimize number of layers
- **Dependencies**: Only include necessary packages
- **Caching**: Optimize Docker layer caching

## Configuration

### Environment Variables
```bash
# Build configuration
export DOCKER_REGISTRY="localhost:5000"
export IMAGE_VERSION="1.0.0"
export BUILD_PLATFORM="linux/amd64,linux/arm64"

# Registry configuration
export REGISTRY_USERNAME="admin"
export REGISTRY_PASSWORD="password"
```

### Registry Setup
```bash
# Docker Hub
docker login

# Private registry
docker login my-registry.com -u username -p password

# AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
```

## Troubleshooting

### Common Issues

1. **Build failures**
   ```bash
   # Check buildx builder
   docker buildx ls
   
   # Recreate builder
   docker buildx rm ecommerce-builder
   docker buildx create --name ecommerce-builder --use
   ```

2. **Registry connection issues**
   ```bash
   # Check registry status
   curl http://localhost:5000/v2/_catalog
   
   # Test push/pull
   docker pull hello-world
   docker tag hello-world localhost:5000/test
   docker push localhost:5000/test
   ```

3. **Platform issues**
   ```bash
   # Check supported platforms
   docker buildx inspect
   
   # Build for specific platform
   docker buildx build --platform linux/amd64 .
   ```

### Debugging Commands
```bash
# Check image details
docker inspect localhost:5000/ecommerce-node-base:latest

# List image layers
docker history localhost:5000/ecommerce-node-base:latest

# Test image functionality
docker run --rm -it localhost:5000/ecommerce-node-base:latest /bin/sh

# Check security scan
trivy image localhost:5000/ecommerce-node-base:latest
```

## Maintenance

### Regular Updates
- Update base OS images monthly
- Update language runtimes quarterly  
- Security patches as needed
- Dependency updates with testing

### Monitoring
- Image size metrics
- Vulnerability scan results
- Build success/failure rates
- Usage analytics

### Deprecation Policy
- 6-month notice for breaking changes
- Support previous version for 3 months
- Clear migration documentation