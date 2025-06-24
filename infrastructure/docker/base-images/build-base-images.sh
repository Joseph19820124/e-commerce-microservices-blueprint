#!/bin/bash

# Base Images Build Script
# This script builds all standardized base images for the e-commerce microservices platform

set -e

# Configuration
REGISTRY=${DOCKER_REGISTRY:-"localhost:5000"}
VERSION=${IMAGE_VERSION:-"latest"}
PLATFORM=${BUILD_PLATFORM:-"linux/amd64,linux/arm64"}

echo "🏗️  Building E-commerce Base Images"
echo "Registry: $REGISTRY"
echo "Version: $VERSION"
echo "Platform: $PLATFORM"

# Function to build and tag images
build_image() {
    local image_name=$1
    local dockerfile=$2
    local context=${3:-"."}
    
    echo "📦 Building $image_name..."
    
    # Build multi-platform image
    docker buildx build \
        --platform $PLATFORM \
        --file $dockerfile \
        --tag $REGISTRY/ecommerce-$image_name:$VERSION \
        --tag $REGISTRY/ecommerce-$image_name:latest \
        --push \
        $context
    
    echo "✅ Successfully built $image_name"
}

# Create buildx builder if it doesn't exist
if ! docker buildx ls | grep -q "ecommerce-builder"; then
    echo "🔧 Creating buildx builder..."
    docker buildx create --name ecommerce-builder --use
fi

# Build Node.js base image
build_image "node-base" "node-base.Dockerfile"

# Build Java base image  
build_image "java-base" "java-base.Dockerfile"

# Build Python base image
build_image "python-base" "python-base.Dockerfile"

# Build React base image
cat > react-base.Dockerfile << 'EOF'
# Multi-stage build for React applications
FROM node:20-alpine as builder

# Install build dependencies
RUN apk add --no-cache \
    curl \
    git \
    ca-certificates

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    ca-certificates

# Copy built app
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create nginx user
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF

build_image "react-base" "react-base.Dockerfile"

# Build common utilities image
cat > utils-base.Dockerfile << 'EOF'
FROM alpine:3.18

# Install common utilities
RUN apk add --no-cache \
    curl \
    wget \
    git \
    bash \
    jq \
    yq \
    ca-certificates \
    openssl \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 -G appuser

# Set working directory
WORKDIR /app

# Switch to app user
USER appuser

CMD ["/bin/bash"]
EOF

build_image "utils-base" "utils-base.Dockerfile"

# Create image scanning and security baseline
cat > security-scan.Dockerfile << 'EOF'
FROM aquasec/trivy:latest

# Copy scanning scripts
COPY --from=docker:dind /usr/local/bin/docker /usr/local/bin/

# Install additional security tools
RUN apk add --no-cache \
    bash \
    jq \
    curl

WORKDIR /workspace

# Default scan command
CMD ["trivy", "--help"]
EOF

build_image "security-scanner" "security-scan.Dockerfile"

# Create database migration base image
cat > migration-base.Dockerfile << 'EOF'
FROM golang:1.21-alpine as builder

RUN apk add --no-cache git ca-certificates

# Install migrate tool
RUN go install -tags 'postgres mysql mongodb' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

FROM alpine:3.18

RUN apk add --no-cache \
    postgresql-client \
    mysql-client \
    mongodb-tools \
    ca-certificates

# Copy migrate tool
COPY --from=builder /go/bin/migrate /usr/local/bin/migrate

# Create migration user
RUN addgroup -g 1001 -S migrate && \
    adduser -S migrate -u 1001 -G migrate

WORKDIR /migrations

USER migrate

CMD ["migrate", "--help"]
EOF

build_image "migration-base" "migration-base.Dockerfile"

# Cleanup temporary files
rm -f react-base.Dockerfile utils-base.Dockerfile security-scan.Dockerfile migration-base.Dockerfile

echo "🎉 All base images built successfully!"
echo ""
echo "📋 Built Images:"
echo "  $REGISTRY/ecommerce-node-base:$VERSION"
echo "  $REGISTRY/ecommerce-java-base:$VERSION" 
echo "  $REGISTRY/ecommerce-python-base:$VERSION"
echo "  $REGISTRY/ecommerce-react-base:$VERSION"
echo "  $REGISTRY/ecommerce-utils-base:$VERSION"
echo "  $REGISTRY/ecommerce-security-scanner:$VERSION"
echo "  $REGISTRY/ecommerce-migration-base:$VERSION"
echo ""
echo "🔧 Usage:"
echo "  FROM $REGISTRY/ecommerce-node-base:$VERSION"
echo ""
echo "🧪 Test images:"
echo "  docker run --rm $REGISTRY/ecommerce-node-base:$VERSION node --version"
echo "  docker run --rm $REGISTRY/ecommerce-java-base:$VERSION java --version"
echo "  docker run --rm $REGISTRY/ecommerce-python-base:$VERSION python --version"