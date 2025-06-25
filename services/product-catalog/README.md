# Product Catalog Service

## 概述

Product Catalog Service 是电商微服务系统的核心组件，负责管理所有产品相关的数据和操作，包括产品信息、库存管理、分类管理、搜索集成等功能。

## 功能特性

- ✅ 产品CRUD操作
- ✅ 产品搜索和过滤
- ✅ 库存管理
- ✅ 图片上传和处理
- ✅ 分类和品牌管理
- ✅ 批量操作支持
- ✅ RESTful API设计
- ✅ 数据验证和错误处理
- ✅ 日志记录和监控

## 技术栈

- **框架**: Express.js
- **数据库**: MongoDB (Mongoose ODM)
- **图片处理**: Sharp
- **验证**: express-validator
- **日志**: Winston
- **测试**: Jest + Supertest
- **文档**: OpenAPI/Swagger

## 快速开始

### 环境要求

- Node.js 18.x
- MongoDB 5.0+
- npm 8.x

### 安装依赖

```bash
npm install
```

### 环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置
nano .env
```

### 环境变量说明

```bash
# 服务配置
PORT=3001
NODE_ENV=development

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/ecommerce
MONGODB_TEST_URI=mongodb://localhost:27017/test_ecommerce

# JWT配置（用于权限验证）
JWT_SECRET=your-secret-key

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880  # 5MB

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=combined

# CORS配置
CORS_ORIGIN=http://localhost:3000

# 监控配置
HEALTH_CHECK_INTERVAL=30000
```

### 启动服务

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm start

# 调试模式
npm run debug
```

## API文档

### 健康检查

```bash
# 服务健康状态
GET /health

# 就绪状态检查
GET /ready

# 详细健康信息
GET /health/detailed
```

### 核心API端点

| 方法 | 端点 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/products` | 获取产品列表 | Public |
| GET | `/api/products/:id` | 获取产品详情 | Public |
| POST | `/api/products` | 创建产品 | Admin |
| PUT | `/api/products/:id` | 更新产品 | Admin |
| DELETE | `/api/products/:id` | 删除产品 | Admin |
| GET | `/api/products/search` | 搜索产品 | Public |
| PATCH | `/api/products/bulk/inventory` | 批量更新库存 | Admin |
| POST | `/api/products/:id/images` | 上传产品图片 | Admin |

详细API文档请参考: [API Documentation](../../docs/api/product-catalog-api.md)

## 数据模型

### Product Schema

```javascript
{
  name: String,           // 产品名称 [必需]
  description: String,    // 产品描述
  price: Number,          // 价格 [必需, 最小值: 0]
  category: String,       // 分类 [必需]
  subcategory: String,    // 子分类
  brand: String,          // 品牌
  sku: String,           // SKU编码 [唯一]
  images: [String],      // 图片URL数组 [最多10张]
  thumbnails: [String],  // 缩略图URL数组
  stock: Number,         // 库存 [默认: 0, 最小值: 0]
  isActive: Boolean,     // 是否激活 [默认: true]
  features: [String],    // 特性列表
  specifications: Object, // 规格参数
  ratings: {
    average: Number,     // 平均评分 [默认: 0]
    count: Number        // 评分数量 [默认: 0]
  },
  seo: {
    metaTitle: String,     // SEO标题
    metaDescription: String, // SEO描述
    slug: String           // URL slug
  },
  createdAt: Date,       // 创建时间
  updatedAt: Date        // 更新时间
}
```

### 索引配置

```javascript
// 文本搜索索引
{ name: 'text', description: 'text', brand: 'text' }

// 复合索引
{ category: 1, subcategory: 1 }
{ price: 1, stock: 1 }
{ isActive: 1, createdAt: -1 }

// 唯一索引
{ sku: 1 }
```

## 开发指南

### 项目结构

```
src/
├── controllers/          # 控制器层
│   ├── productController.js
│   └── imageController.js
├── models/              # 数据模型
│   └── Product.js
├── routes/              # 路由定义
│   └── productRoutes.js
├── middleware/          # 中间件
│   ├── auth.js
│   ├── validation.js
│   └── upload.js
├── utils/               # 工具函数
│   ├── logger.js
│   └── errorHandler.js
├── config/              # 配置文件
│   └── database.js
└── index.js             # 应用入口
```

### 代码规范

```javascript
// 控制器示例
exports.getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, sort } = req.query;
    
    // 构建查询条件
    const query = { isActive: true };
    if (category) query.category = category;
    
    // 执行查询
    const products = await Product.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sort || { createdAt: -1 })
      .exec();
    
    const total = await Product.countDocuments(query);
    
    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching products'
    });
  }
};
```

### 错误处理

```javascript
// 全局错误处理中间件
const errorHandler = (err, req, res, next) => {
  logger.error(err.stack);

  // Mongoose验证错误
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errors
    });
  }

  // MongoDB重复键错误
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Duplicate field value'
    });
  }

  // 默认错误
  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
};
```

## 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 生成覆盖率报告
npm run test:coverage

# 监听模式
npm run test:watch
```

### 测试结构

```
tests/
├── unit/
│   ├── controllers/
│   ├── models/
│   └── utils/
├── integration/
│   └── api/
└── fixtures/
    └── products.json
```

### 测试示例

```javascript
describe('Product Controller', () => {
  describe('getAllProducts', () => {
    it('should return products with pagination', async () => {
      const products = await Product.insertMany(mockProducts);
      
      const response = await request(app)
        .get('/api/products?page=1&limit=10')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination.total).toBe(mockProducts.length);
    });
  });
});
```

## 部署

### Docker部署

```bash
# 构建镜像
docker build -t ecommerce/product-catalog .

# 运行容器
docker run -p 3001:3001 \
  -e MONGODB_URI=mongodb://mongodb:27017/ecommerce \
  ecommerce/product-catalog
```

### Kubernetes部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-catalog
spec:
  replicas: 3
  selector:
    matchLabels:
      app: product-catalog
  template:
    metadata:
      labels:
        app: product-catalog
    spec:
      containers:
      - name: product-catalog
        image: ecommerce/product-catalog:latest
        ports:
        - containerPort: 3001
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: mongodb-uri
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
```

## 监控和日志

### 健康检查端点

- `/health` - 基础健康检查
- `/ready` - 就绪状态检查
- `/health/detailed` - 详细健康信息

### 日志格式

```json
{
  "timestamp": "2025-06-25T10:30:00Z",
  "level": "info",
  "message": "Product created",
  "productId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "requestId": "req-12345",
  "duration": 150
}
```

### 性能指标

- 响应时间: P50 < 50ms, P95 < 200ms
- 错误率: < 1%
- 可用性: > 99.9%
- 内存使用: < 512MB
- CPU使用: < 50%

## 故障排查

### 常见问题

#### 数据库连接失败

```bash
# 检查MongoDB连接
npm run db:check

# 查看数据库状态
npm run db:status
```

#### 图片上传失败

```bash
# 检查上传目录权限
ls -la uploads/

# 查看磁盘空间
df -h

# 检查文件大小限制
grep MAX_FILE_SIZE .env
```

#### 内存泄漏

```bash
# 生成堆快照
npm run heap:snapshot

# 分析内存使用
npm run memory:analyze
```

### 调试技巧

```javascript
// 开启调试日志
DEBUG=product-catalog:* npm run dev

// 使用调试器
node --inspect-brk src/index.js

// 性能分析
node --prof src/index.js
```

## 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/new-feature`)
3. 提交更改 (`git commit -am 'Add new feature'`)
4. 推送分支 (`git push origin feature/new-feature`)
5. 创建Pull Request

### 代码提交规范

```bash
# 功能添加
git commit -m "feat: add product search functionality"

# Bug修复
git commit -m "fix: resolve image upload issue"

# 文档更新
git commit -m "docs: update API documentation"

# 测试添加
git commit -m "test: add unit tests for product controller"
```

## 许可证

MIT License

## 联系方式

- 项目维护者: Development Team
- 邮箱: dev@ecommerce.com
- 文档: [完整文档链接]
- Issue追踪: [GitHub Issues]

---

*版本: v1.0.0 | 最后更新: 2025-06-25*