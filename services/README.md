# E-Commerce Microservices

这个目录包含了电商平台的4个核心微服务：

## 服务列表

### 1. Product Catalog Service (端口: 3001)
**功能**: 商品目录管理
- 商品CRUD操作
- 图片上传和管理
- 商品搜索和筛选
- 库存管理
- MongoDB数据存储

**主要API端点**:
- `GET /api/products` - 获取商品列表
- `POST /api/products` - 创建新商品
- `GET /api/products/:id` - 获取单个商品
- `PUT /api/products/:id` - 更新商品
- `DELETE /api/products/:id` - 删除商品
- `POST /api/products/:productId/images` - 上传商品图片

### 2. User Profile Service (端口: 3002)
**功能**: 用户管理和认证
- 用户注册/登录
- JWT认证体系
- 用户信息管理
- 地址管理
- 权限管理系统

**主要API端点**:
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/profile` - 获取用户资料
- `PUT /api/auth/profile` - 更新用户资料
- `POST /api/users/addresses` - 添加地址

### 3. Shopping Cart Service (端口: 3003)
**功能**: 购物车管理
- 购物车状态管理
- Redis会话存储
- 商品验证
- 购物车合并
- 实时库存检查

**主要API端点**:
- `GET /api/cart` - 获取购物车
- `POST /api/cart/items` - 添加商品到购物车
- `PUT /api/cart/items/:itemId` - 更新购物车商品
- `DELETE /api/cart/items/:itemId` - 删除购物车商品
- `POST /api/cart/merge` - 合并购物车

### 4. Search Service (端口: 3004)
**功能**: 搜索服务
- ElasticSearch集成
- 全文搜索
- 分面搜索
- 自动完成功能
- 商品索引管理

**主要API端点**:
- `GET /api/search` - 搜索商品
- `GET /api/search/autocomplete` - 自动完成
- `GET /api/search/aggregations` - 获取聚合数据
- `POST /api/search/reindex` - 重建索引

## 快速启动

### 使用Docker Compose
```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f [service-name]

# 停止所有服务
docker-compose down
```

### 本地开发
每个服务都可以独立运行：

```bash
# 进入服务目录
cd services/[service-name]

# 安装依赖
npm install

# 复制环境变量
cp .env.example .env

# 启动服务
npm run dev
```

## 服务间通信

服务间通过HTTP API进行通信：
- Shopping Cart ↔ Product Catalog: 验证商品和库存
- Shopping Cart ↔ User Profile: 用户认证
- Search ↔ Product Catalog: 商品数据同步

## 数据库

- **MongoDB**: Product Catalog, User Profile
- **Redis**: Shopping Cart (会话存储)
- **ElasticSearch**: Search Service (搜索索引)

## 认证

使用JWT Bearer token进行用户认证：
```
Authorization: Bearer <token>
```

## 健康检查

每个服务都提供健康检查端点：
- `GET /health`

## 环境变量

查看各服务目录下的 `.env.example` 文件了解所需的环境变量配置。

## 开发规范

- 使用Winston进行日志记录
- 使用express-validator进行输入验证
- 统一的错误处理和响应格式
- 使用Helmet增强安全性
- 支持CORS跨域请求