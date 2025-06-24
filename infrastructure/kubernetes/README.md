# Kubernetes Infrastructure

This directory contains Kubernetes manifests and scripts for deploying the e-commerce microservices platform.

## Directory Structure

```
kubernetes/
├── namespaces/           # Namespace definitions
├── secrets/             # Secret configurations
├── configmaps/          # ConfigMap definitions
├── databases/           # Database deployments
├── services/            # Microservice deployments
├── ingress/             # Ingress configurations
├── setup-minikube.sh    # Minikube setup script
└── README.md           # This file
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)

### macOS Installation
```bash
# Install via Homebrew
brew install minikube kubectl

# Or download directly
curl -LO "https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-amd64"
sudo install minikube-darwin-amd64 /usr/local/bin/minikube
```

### System Requirements
- **CPU**: 4+ cores recommended
- **Memory**: 8GB+ RAM
- **Disk**: 50GB+ free space
- **Docker**: Must be running

## Quick Start

### 1. Setup Local Kubernetes Cluster
```bash
# Run the setup script
./setup-minikube.sh
```

This script will:
- Start minikube with optimized settings
- Enable required addons (ingress, dashboard, metrics-server)
- Create namespaces and secrets
- Deploy all database services
- Wait for services to be ready

### 2. Verify Installation
```bash
# Check cluster status
kubectl cluster-info

# Check all pods
kubectl get pods -n ecommerce

# Check services
kubectl get services -n ecommerce

# View dashboard
minikube dashboard
```

### 3. Access Services
```bash
# Get minikube IP
minikube ip

# Access services via NodePort or port-forward
kubectl port-forward service/mongodb 27017:27017 -n ecommerce
kubectl port-forward service/postgres 5432:5432 -n ecommerce
kubectl port-forward service/redis 6379:6379 -n ecommerce
kubectl port-forward service/elasticsearch 9200:9200 -n ecommerce
kubectl port-forward service/kibana 5601:5601 -n ecommerce
```

## Deployed Services

### Infrastructure Services
- **MongoDB**: Document database for product catalog
- **PostgreSQL**: Relational database for user profiles
- **Redis**: In-memory cache for shopping cart
- **Elasticsearch**: Search engine for product search
- **Kibana**: Elasticsearch visualization dashboard

### Service Specifications
| Service | CPU Request | Memory Request | CPU Limit | Memory Limit | Storage |
|---------|-------------|----------------|-----------|--------------|---------|
| MongoDB | 250m | 512Mi | 500m | 1Gi | 10Gi |
| PostgreSQL | 250m | 256Mi | 500m | 512Mi | 5Gi |
| Redis | 100m | 128Mi | 200m | 256Mi | 2Gi |
| Elasticsearch | 500m | 1Gi | 1000m | 2Gi | 10Gi |
| Kibana | 250m | 512Mi | 500m | 1Gi | - |

## Configuration Management

### Secrets
Database credentials and sensitive configuration are stored in Kubernetes secrets:
- `mongodb-secret`: MongoDB admin credentials
- `postgres-secret`: PostgreSQL user credentials
- `redis-secret`: Redis authentication password
- `elasticsearch-secret`: Elasticsearch credentials
- `jwt-secret`: JWT signing key

### ConfigMaps
Application configuration stored in ConfigMaps:
- Service-specific configurations
- Environment-specific settings
- Feature flags

## Networking

### Service Communication
All services communicate within the `ecommerce` namespace using Kubernetes DNS:
- MongoDB: `mongodb.ecommerce.svc.cluster.local:27017`
- PostgreSQL: `postgres.ecommerce.svc.cluster.local:5432`
- Redis: `redis.ecommerce.svc.cluster.local:6379`
- Elasticsearch: `elasticsearch.ecommerce.svc.cluster.local:9200`

### External Access
External access is configured through:
- **NodePort**: Direct port access via minikube IP
- **Port-forward**: Local port forwarding for development
- **Ingress**: HTTP/HTTPS routing (for microservices)

## Persistent Storage

### Storage Classes
- **Default**: Uses minikube's default storage class
- **SSD**: High-performance storage for databases
- **Backup**: Network-attached storage for backups

### Volume Claims
- MongoDB: 10Gi for document storage
- PostgreSQL: 5Gi for relational data
- Redis: 2Gi for cache persistence
- Elasticsearch: 10Gi for search indices

## Monitoring and Observability

### Health Checks
All services include:
- **Readiness Probes**: Service ready to accept traffic
- **Liveness Probes**: Service health monitoring
- **Startup Probes**: Slow-starting service detection

### Metrics
Enabled through metrics-server addon:
```bash
# View resource usage
kubectl top pods -n ecommerce
kubectl top nodes
```

### Logging
Access logs using kubectl:
```bash
# View logs
kubectl logs -f deployment/mongodb -n ecommerce
kubectl logs -f deployment/postgres -n ecommerce

# Stream logs from all pods
kubectl logs -f -l app=elasticsearch -n ecommerce
```

## Troubleshooting

### Common Issues

1. **Minikube won't start**
   ```bash
   # Reset minikube
   minikube delete
   minikube start --driver=docker
   ```

2. **Pods stuck in Pending**
   ```bash
   # Check resource usage
   kubectl describe pod <pod-name> -n ecommerce
   kubectl top nodes
   ```

3. **Services not accessible**
   ```bash
   # Check service endpoints
   kubectl get endpoints -n ecommerce
   kubectl describe service <service-name> -n ecommerce
   ```

4. **Storage issues**
   ```bash
   # Check persistent volumes
   kubectl get pv
   kubectl get pvc -n ecommerce
   ```

### Useful Commands

```bash
# Cluster management
minikube status
minikube stop
minikube start
minikube delete

# Resource inspection
kubectl get all -n ecommerce
kubectl describe pod <pod-name> -n ecommerce
kubectl exec -it <pod-name> -n ecommerce -- /bin/bash

# Configuration
kubectl get secrets -n ecommerce
kubectl get configmaps -n ecommerce

# Networking
kubectl get ingress -n ecommerce
minikube tunnel  # For LoadBalancer services
```

## Security Considerations

### Development Environment
- Default passwords for databases (change for production)
- Disabled authentication on some services
- Open network policies

### Production Recommendations
- Use strong, unique passwords
- Enable TLS/SSL for all services
- Implement network policies
- Use external secret management
- Enable RBAC
- Regular security updates

## Next Steps

1. **Deploy Microservices**: Add application deployments in `services/`
2. **Configure Ingress**: Set up HTTP routing in `ingress/`
3. **Add Monitoring**: Implement Prometheus and Grafana
4. **CI/CD Integration**: Connect with GitHub Actions
5. **Production Setup**: Migrate to managed Kubernetes service