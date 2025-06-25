# 部署指南

## 概述

本文档提供电商微服务系统的完整部署指南，包括本地开发环境、测试环境和生产环境的部署步骤。

## 系统要求

### 最低硬件要求

#### 开发环境
- CPU: 4核心
- 内存: 8GB RAM
- 磁盘: 50GB 可用空间
- 网络: 宽带连接

#### 生产环境
- CPU: 16核心
- 内存: 32GB RAM
- 磁盘: 500GB SSD
- 网络: 1Gbps

### 软件依赖

```bash
# 必需软件
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18.x
- npm 8.x
- Git 2.30+

# 可选软件（生产环境推荐）
- Kubernetes 1.24+
- Helm 3.8+
- Terraform 1.0+
```

## 快速开始

### 1. 克隆代码库

```bash
git clone https://github.com/Joseph19820124/e-commerce-microservices-blueprint.git
cd e-commerce-microservices-blueprint
```

### 2. 环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

### 3. 一键启动开发环境

```bash
# 安装依赖并启动所有服务
npm run setup:dev
npm run start:dev
```

## 详细部署步骤

### 本地开发环境

#### 步骤 1: 环境准备

```bash
# 安装依赖
npm install

# 安装各服务依赖
npm run install:all

# 设置Git hooks
npm run setup:hooks
```

#### 步骤 2: 数据库启动

```bash
# 启动数据库服务
docker-compose -f infrastructure/docker/docker-compose.yml up -d mongodb redis elasticsearch postgres

# 等待服务就绪
npm run wait:databases

# 初始化数据库
npm run db:init
```

#### 步骤 3: 微服务启动

```bash
# 启动所有微服务
npm run start:services

# 或者单独启动每个服务
npm run start:product-catalog
npm run start:user-profile
npm run start:shopping-cart
npm run start:search
```

#### 步骤 4: 前端启动

```bash
# 启动前端应用
npm run start:frontend
```

#### 步骤 5: API网关启动

```bash
# 启动Kong API网关
npm run start:gateway
```

### Docker Compose部署

#### 完整环境部署

```bash
# 构建所有镜像
docker-compose build

# 启动完整环境
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 分步骤部署

```bash
# 1. 启动基础设施
docker-compose up -d mongodb redis elasticsearch postgres

# 2. 等待数据库就绪
./scripts/wait-for-databases.sh

# 3. 启动微服务
docker-compose up -d product-catalog user-profile shopping-cart search

# 4. 启动网关和前端
docker-compose up -d api-gateway frontend

# 5. 启动监控服务
docker-compose up -d prometheus grafana elasticsearch logstash kibana
```

### Kubernetes部署

#### 前置条件

```bash
# 启动Minikube（本地测试）
minikube start --memory=8192 --cpus=4

# 或连接到生产Kubernetes集群
kubectl config use-context production
```

#### 部署步骤

```bash
# 1. 创建命名空间
kubectl apply -f infrastructure/kubernetes/namespaces/

# 2. 创建密钥
kubectl apply -f infrastructure/kubernetes/secrets/

# 3. 部署数据库
kubectl apply -f infrastructure/kubernetes/databases/

# 4. 等待数据库就绪
kubectl wait --for=condition=ready pod -l app=mongodb --timeout=300s

# 5. 部署微服务
kubectl apply -f infrastructure/kubernetes/services/

# 6. 部署网关
kubectl apply -f infrastructure/kubernetes/gateway/

# 7. 部署前端
kubectl apply -f infrastructure/kubernetes/frontend/

# 8. 部署监控
kubectl apply -f infrastructure/kubernetes/monitoring/
```

#### 使用Helm部署

```bash
# 添加Helm仓库
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# 部署数据库（使用Helm Charts）
helm install mongodb bitnami/mongodb -f infrastructure/helm/values/mongodb.yaml
helm install redis bitnami/redis -f infrastructure/helm/values/redis.yaml

# 部署应用
helm install ecommerce-app infrastructure/helm/umbrella-chart/
```

## 生产环境部署

### 云平台部署

#### AWS EKS

```bash
# 1. 创建EKS集群
eksctl create cluster --config-file=infrastructure/aws/eks-cluster.yaml

# 2. 配置ALB Ingress Controller
kubectl apply -f infrastructure/aws/alb-ingress-controller.yaml

# 3. 部署应用
helm install ecommerce-prod infrastructure/helm/umbrella-chart/ \
  --values infrastructure/helm/values/production.yaml \
  --namespace production
```

#### Google GKE

```bash
# 1. 创建GKE集群
gcloud container clusters create ecommerce-cluster \
  --zone=us-central1-a \
  --num-nodes=3 \
  --machine-type=n1-standard-4

# 2. 获取认证
gcloud container clusters get-credentials ecommerce-cluster --zone=us-central1-a

# 3. 部署应用
helm install ecommerce-prod infrastructure/helm/umbrella-chart/ \
  --values infrastructure/helm/values/production.yaml
```

#### Azure AKS

```bash
# 1. 创建资源组
az group create --name ecommerce-rg --location eastus

# 2. 创建AKS集群
az aks create \
  --resource-group ecommerce-rg \
  --name ecommerce-cluster \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-addons monitoring

# 3. 获取认证
az aks get-credentials --resource-group ecommerce-rg --name ecommerce-cluster

# 4. 部署应用
helm install ecommerce-prod infrastructure/helm/umbrella-chart/ \
  --values infrastructure/helm/values/production.yaml
```

### 高可用配置

#### 数据库高可用

```yaml
# MongoDB副本集
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
spec:
  replicas: 3
  serviceName: mongodb
  template:
    spec:
      containers:
      - name: mongodb
        image: mongo:5.0
        command:
          - mongod
          - --replSet=rs0
          - --bind_ip_all
```

#### 微服务高可用

```yaml
# 产品服务高可用配置
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-catalog
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: product-catalog
        image: ecommerce/product-catalog:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

## 配置管理

### 环境变量

#### 开发环境 (.env.development)

```bash
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/ecommerce_dev
REDIS_URL=redis://localhost:6379
POSTGRES_URI=postgresql://localhost:5432/ecommerce_dev
ELASTICSEARCH_URL=http://localhost:9200

# 服务端口
PRODUCT_CATALOG_PORT=3001
USER_PROFILE_PORT=3002
SHOPPING_CART_PORT=3003
SEARCH_SERVICE_PORT=3004

# JWT配置
JWT_SECRET=dev-secret-key
JWT_REFRESH_SECRET=dev-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 文件上传
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5MB

# 外部服务
PAYMENT_GATEWAY_URL=https://sandbox.payment.com
EMAIL_SERVICE_URL=https://api.mailgun.net
```

#### 生产环境 (Kubernetes Secrets)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  mongodb-uri: <base64-encoded-value>
  jwt-secret: <base64-encoded-value>
  payment-api-key: <base64-encoded-value>
```

### ConfigMap配置

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database.conf: |
    pool_size=10
    timeout=30
  logging.conf: |
    level=info
    format=json
```

## 监控和日志

### Prometheus监控

```bash
# 部署Prometheus
kubectl apply -f infrastructure/monitoring/prometheus/

# 访问Prometheus UI
kubectl port-forward svc/prometheus 9090:9090
```

### Grafana仪表板

```bash
# 部署Grafana
kubectl apply -f infrastructure/monitoring/grafana/

# 获取admin密码
kubectl get secret grafana-admin-secret -o jsonpath="{.data.password}" | base64 -d

# 访问Grafana
kubectl port-forward svc/grafana 3000:3000
```

### ELK日志堆栈

```bash
# 部署Elasticsearch
kubectl apply -f infrastructure/logging/elasticsearch/

# 部署Logstash
kubectl apply -f infrastructure/logging/logstash/

# 部署Kibana
kubectl apply -f infrastructure/logging/kibana/

# 访问Kibana
kubectl port-forward svc/kibana 5601:5601
```

## 数据备份

### MongoDB备份

```bash
# 创建备份
mongodump --uri="mongodb://localhost:27017/ecommerce" --out=/backup/$(date +%Y%m%d_%H%M%S)

# 恢复备份
mongorestore --uri="mongodb://localhost:27017/ecommerce" /backup/20250625_103000/ecommerce
```

### 自动化备份脚本

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# 创建备份
mkdir -p ${BACKUP_DIR}/${TIMESTAMP}

# MongoDB备份
mongodump --uri="${MONGODB_URI}" --out=${BACKUP_DIR}/${TIMESTAMP}/mongodb

# Redis备份
redis-cli --rdb ${BACKUP_DIR}/${TIMESTAMP}/redis.rdb

# 清理旧备份
find ${BACKUP_DIR} -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} +

# 上传到S3
aws s3 sync ${BACKUP_DIR}/${TIMESTAMP} s3://ecommerce-backups/${TIMESTAMP}/
```

## 扩容策略

### 水平扩容

```bash
# 扩容微服务
kubectl scale deployment product-catalog --replicas=5

# 自动扩容配置
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: product-catalog-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: product-catalog
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
EOF
```

### 垂直扩容

```bash
# 增加资源限制
kubectl patch deployment product-catalog -p '{"spec":{"template":{"spec":{"containers":[{"name":"product-catalog","resources":{"limits":{"memory":"1Gi","cpu":"1"}}}]}}}}'
```

## 安全配置

### TLS/SSL配置

```yaml
# Ingress TLS配置
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ecommerce-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.ecommerce.com
    secretName: ecommerce-tls
  rules:
  - host: api.ecommerce.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
```

### 网络策略

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-api
spec:
  podSelector:
    matchLabels:
      app: api-gateway
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 3000
```

## 故障排查

### 常见问题

#### 服务启动失败

```bash
# 查看Pod状态
kubectl get pods

# 查看详细信息
kubectl describe pod <pod-name>

# 查看日志
kubectl logs <pod-name> -f

# 进入容器调试
kubectl exec -it <pod-name> -- /bin/bash
```

#### 数据库连接失败

```bash
# 测试数据库连接
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
nslookup mongodb
telnet mongodb 27017

# 检查密钥配置
kubectl get secret app-secrets -o yaml
```

#### 性能问题

```bash
# 查看资源使用情况
kubectl top pods
kubectl top nodes

# 查看HPA状态
kubectl get hpa

# 查看事件
kubectl get events --sort-by=.metadata.creationTimestamp
```

## 维护操作

### 滚动更新

```bash
# 更新镜像
kubectl set image deployment/product-catalog product-catalog=ecommerce/product-catalog:v2.0.0

# 查看更新状态
kubectl rollout status deployment/product-catalog

# 回滚更新
kubectl rollout undo deployment/product-catalog
```

### 配置更新

```bash
# 更新ConfigMap
kubectl patch configmap app-config --patch '{"data":{"new-config":"value"}}'

# 重启Pod以应用新配置
kubectl rollout restart deployment/product-catalog
```

### 数据迁移

```bash
# 创建数据迁移Job
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: data-migration
spec:
  template:
    spec:
      containers:
      - name: migration
        image: ecommerce/migration:latest
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: mongodb-uri
      restartPolicy: Never
EOF
```

## 性能优化

### 缓存策略

```bash
# Redis集群配置
redis-cli --cluster create \
  redis-node1:6379 \
  redis-node2:6379 \
  redis-node3:6379 \
  --cluster-replicas 1
```

### 数据库优化

```javascript
// MongoDB索引优化
db.products.createIndex({ "category": 1, "price": 1 })
db.products.createIndex({ "name": "text", "description": "text" })
db.users.createIndex({ "email": 1 }, { unique: true })
```

### CDN配置

```yaml
# CloudFront配置示例
apiVersion: v1
kind: ConfigMap
metadata:
  name: cdn-config
data:
  cloudfront.conf: |
    distribution_config:
      origins:
        - domain_name: api.ecommerce.com
          origin_path: /static
      cache_behaviors:
        - path_pattern: "*.jpg"
          ttl: 86400
        - path_pattern: "*.css"
          ttl: 3600
```

---

*本文档定期更新，确保部署步骤的准确性和时效性。如有问题请参考故障排查章节或联系运维团队。*