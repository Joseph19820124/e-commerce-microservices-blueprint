# 技术栈详细说明

## 前端技术栈

### 核心框架
- **React 18+**: 现代化UI框架，支持Hooks和并发特性
- **TypeScript**: 类型安全，提高代码质量和开发效率
- **Material-UI (MUI)**: 成熟的React组件库，符合Material Design

### 状态管理
- **Redux Toolkit**: 简化的Redux状态管理
- **React Query**: 服务端状态管理和缓存

### 路由和导航
- **React Router**: 客户端路由管理

### 构建工具
- **Vite**: 快速的构建工具和开发服务器
- **ESLint + Prettier**: 代码规范和格式化

## 后端技术栈

### Product Catalog Service (Node.js)
```javascript
// 技术栈
- Node.js 18+
- Express.js 4.x
- MongoDB 6.x
- Mongoose ODM
- Multer (文件上传)
- Joi (数据验证)
- Winston (日志)
```

### User Profile Service (Python)
```python
# 技术栈
- Python 3.11+
- FastAPI 0.100+
- SQLAlchemy 2.0
- Alembic (数据库迁移)
- PostgreSQL 15+
- PyJWT (JWT认证)
- Pydantic (数据验证)
```

### Shopping Cart Service (Java)
```java
// 技术栈
- Java 17+
- Spring Boot 3.x
- Spring Security
- Spring Data Redis
- Redis 7.x
- Gradle 8.x
- Micrometer (监控)
```

### Search Service (Node.js)
```javascript
// 技术栈
- Node.js 18+
- Express.js 4.x
- ElasticSearch 8.x
- @elastic/elasticsearch客户端
```

## 数据存储

### 数据库选择原则
| 服务 | 数据库 | 选择理由 |
|------|--------|----------|
| Product Catalog | MongoDB | 文档结构灵活，适合商品多样化属性 |
| User Profile | PostgreSQL | ACID特性，用户数据一致性要求高 |
| Shopping Cart | Redis | 高性能内存存储，支持TTL过期 |
| Search | ElasticSearch | 专业搜索引擎，支持全文检索 |

### 数据模型设计

#### 商品数据模型（MongoDB）
```javascript
{
  "_id": "ObjectId",
  "name": "商品名称",
  "description": "商品描述",
  "price": 99.99,
  "currency": "USD",
  "category": "电子产品",
  "attributes": {
    "color": "黑色",
    "size": "L",
    "weight": "1.2kg"
  },
  "images": [
    "https://example.com/image1.jpg"
  ],
  "inventory": 100,
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

#### 用户数据模型（PostgreSQL）
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE
);
```

#### 购物车数据模型（Redis）
```json
{
  "cart:user123": {
    "items": [
      {
        "productId": "prod123",
        "quantity": 2,
        "price": 99.99,
        "addedAt": "2024-01-01T10:00:00Z"
      }
    ],
    "totalAmount": 199.98,
    "currency": "USD",
    "lastUpdated": "2024-01-01T10:00:00Z"
  }
}
```

## 基础设施

### 容器化
- **Docker**: 应用容器化
- **Docker Compose**: 本地开发环境编排
- **Multi-stage builds**: 优化镜像大小

### 编排和部署
- **Kubernetes**: 容器编排平台
- **Helm**: Kubernetes包管理
- **Kustomize**: 配置管理

### 云服务（AWS）
- **EKS**: 托管Kubernetes服务
- **RDS**: 托管PostgreSQL
- **ElastiCache**: 托管Redis
- **OpenSearch**: 托管ElasticSearch
- **S3**: 对象存储
- **CloudFront**: CDN服务
- **ALB**: 应用负载均衡器

## DevOps工具链

### CI/CD
- **GitHub Actions**: 持续集成和部署
- **Docker Hub**: 镜像仓库
- **AWS ECR**: 私有镜像仓库

### 监控和日志
- **Prometheus**: 指标收集
- **Grafana**: 监控可视化
- **ELK Stack**: 日志聚合和分析
  - Elasticsearch: 日志存储和搜索
  - Logstash: 日志处理
  - Kibana: 日志可视化
- **Jaeger**: 分布式链路追踪

### 安全工具
- **Vault**: 密钥管理
- **OWASP ZAP**: 安全测试
- **Trivy**: 容器安全扫描

## API设计标准

### RESTful API规范
```
GET    /api/v1/products          # 获取商品列表
GET    /api/v1/products/{id}     # 获取单个商品
POST   /api/v1/products          # 创建商品
PUT    /api/v1/products/{id}     # 更新商品
DELETE /api/v1/products/{id}     # 删除商品

GET    /api/v1/users/profile     # 获取用户信息
PUT    /api/v1/users/profile     # 更新用户信息

GET    /api/v1/cart              # 获取购物车
POST   /api/v1/cart/items        # 添加商品到购物车
PUT    /api/v1/cart/items/{id}   # 更新购物车商品
DELETE /api/v1/cart/items/{id}   # 从购物车删除商品

GET    /api/v1/search            # 搜索商品
```

### API响应格式
```json
{
  "success": true,
  "data": {
    // 实际数据
  },
  "message": "操作成功",
  "timestamp": "2024-01-01T10:00:00Z",
  "requestId": "req123"
}
```

### 错误处理
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "商品不存在",
    "details": {
      "productId": "prod123"
    }
  },
  "timestamp": "2024-01-01T10:00:00Z",
  "requestId": "req123"
}
```

## 性能要求

### 响应时间目标
- API响应时间: < 200ms (P95)
- 页面加载时间: < 3s
- 搜索响应时间: < 100ms

### 并发性能
- 支持1000+ 并发用户
- 99.9% 可用性
- 水平扩展能力

### 存储性能
- MongoDB: 读取 < 10ms, 写入 < 50ms
- Redis: 操作 < 1ms
- PostgreSQL: 查询 < 20ms
- ElasticSearch: 搜索 < 50ms
