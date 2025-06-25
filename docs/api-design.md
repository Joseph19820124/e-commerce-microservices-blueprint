# API Design Specification

## 概述

本文档定义了电商微服务系统的API设计规范，包括统一的接口标准、认证机制、错误处理、数据格式等。

## API设计原则

### 1. RESTful设计
- 使用HTTP动词表示操作：GET（查询）、POST（创建）、PUT（更新）、DELETE（删除）
- 资源名词使用复数形式
- URL层级不超过3层
- 使用名词而非动词描述资源

### 2. 统一响应格式
```json
{
  "success": true,
  "message": "操作成功",
  "data": {},
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 10,
    "limit": 10
  },
  "meta": {
    "timestamp": "2025-06-25T10:30:00Z",
    "version": "v1",
    "requestId": "req-12345"
  }
}
```

### 3. 错误响应格式
```json
{
  "success": false,
  "error": "错误描述",
  "errorCode": "PRODUCT_NOT_FOUND",
  "details": {
    "field": "productId",
    "value": "invalid-id",
    "constraint": "必须是有效的MongoDB ObjectId"
  },
  "meta": {
    "timestamp": "2025-06-25T10:30:00Z",
    "requestId": "req-12345"
  }
}
```

## HTTP状态码规范

| 状态码 | 说明 | 使用场景 |
|--------|------|----------|
| 200 | OK | 成功获取资源 |
| 201 | Created | 成功创建资源 |
| 204 | No Content | 成功删除资源 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突 |
| 422 | Unprocessable Entity | 数据验证失败 |
| 429 | Too Many Requests | 请求过于频繁 |
| 500 | Internal Server Error | 服务器内部错误 |

## 认证与授权

### 1. JWT Token认证
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Token结构
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "role": "customer",
    "permissions": ["read:products", "write:cart"],
    "iat": 1640995200,
    "exp": 1640998800
  }
}
```

### 3. 权限级别
- **Public**: 无需认证的公开接口
- **Customer**: 需要用户登录
- **Admin**: 需要管理员权限
- **System**: 服务间内部调用

## API版本控制

### 1. URL路径版本控制
```
GET /api/v1/products
GET /api/v2/products
```

### 2. 版本兼容性
- v1: 当前生产版本
- v2: 下一版本（向后兼容）
- 废弃版本需提前3个月通知

## 分页规范

### 1. 查询参数
```
GET /api/products?page=1&limit=20&sort=createdAt:desc
```

### 2. 响应格式
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "pages": 8,
    "limit": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 过滤和搜索

### 1. 基础过滤
```
GET /api/products?category=electronics&brand=apple&minPrice=100&maxPrice=1000
```

### 2. 高级搜索
```
GET /api/products/search?q=iphone&filters[category]=electronics&filters[inStock]=true
```

### 3. 排序
```
GET /api/products?sort=price:asc,createdAt:desc
```

## 数据验证

### 1. 请求验证
- 必填字段验证
- 数据类型验证
- 格式验证（邮箱、电话等）
- 业务规则验证

### 2. 验证错误响应
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "email": ["必须是有效的邮箱地址"],
    "password": ["密码长度至少6位", "必须包含字母和数字"],
    "age": ["必须是18-100之间的数字"]
  }
}
```

## 限流规则

### 1. 速率限制
- 普通用户：100 请求/分钟
- 认证用户：1000 请求/分钟
- 管理员：无限制

### 2. 限流响应头
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640998800
```

## 缓存策略

### 1. HTTP缓存头
```http
Cache-Control: public, max-age=3600
ETag: "abc123"
Last-Modified: Wed, 25 Jun 2025 10:30:00 GMT
```

### 2. 缓存规则
- 产品列表：缓存5分钟
- 产品详情：缓存1小时
- 用户信息：不缓存
- 购物车：不缓存

## API文档标准

### 1. OpenAPI规范
使用OpenAPI 3.0规范描述所有API端点

### 2. 文档必须包含
- 接口描述
- 请求参数说明
- 响应示例
- 错误码说明
- 认证要求

### 3. 示例接口文档
```yaml
paths:
  /api/products:
    get:
      summary: 获取产品列表
      description: 分页获取产品列表，支持过滤和排序
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
          description: 页码
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
          description: 每页数量
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductListResponse'
```

## 监控和日志

### 1. 请求日志格式
```json
{
  "timestamp": "2025-06-25T10:30:00Z",
  "method": "GET",
  "url": "/api/products",
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.100",
  "userId": "507f1f77bcf86cd799439011",
  "requestId": "req-12345",
  "duration": 150,
  "status": 200,
  "contentLength": 1024
}
```

### 2. 性能指标
- 响应时间：P50 < 100ms, P95 < 500ms
- 错误率：< 1%
- 可用性：> 99.9%

## 安全要求

### 1. 输入安全
- 所有输入必须验证和净化
- 防止SQL注入、XSS攻击
- 文件上传类型和大小限制

### 2. 数据保护
- 敏感数据加密存储
- 密码使用bcrypt哈希
- 个人信息脱敏处理

### 3. HTTPS要求
- 生产环境强制HTTPS
- 安全头设置（HSTS、CSP等）

## 国际化支持

### 1. 多语言响应
```http
Accept-Language: zh-CN,en-US;q=0.9
```

### 2. 时区处理
- 所有时间使用UTC格式
- 支持客户端时区转换

## 向后兼容性

### 1. 兼容性原则
- 新增字段不影响现有客户端
- 修改字段需要版本升级
- 删除字段需要废弃流程

### 2. 废弃流程
1. 标记为废弃（Deprecated）
2. 3个月通知期
3. 新版本发布
4. 旧版本下线

---

*此文档遵循OpenAPI 3.0规范，定期更新维护*