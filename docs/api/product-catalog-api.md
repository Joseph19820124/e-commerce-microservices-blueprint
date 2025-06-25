# Product Catalog API Documentation

## 概述

Product Catalog Service 提供产品管理的核心功能，包括产品的CRUD操作、搜索、分类管理等。

**Base URL**: `http://localhost:3001/api`  
**Version**: v1  
**Authentication**: JWT Token (部分接口需要管理员权限)

## 认证

大部分读取操作无需认证，创建、更新、删除操作需要管理员权限。

```http
Authorization: Bearer <jwt_token>
```

## 接口列表

### 1. 获取产品列表

**GET** `/products`

获取产品列表，支持分页、过滤和排序。

#### 查询参数

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| page | integer | 否 | 1 | 页码 |
| limit | integer | 否 | 20 | 每页数量 (最大100) |
| category | string | 否 | - | 按分类过滤 |
| subcategory | string | 否 | - | 按子分类过滤 |
| brand | string | 否 | - | 按品牌过滤 |
| minPrice | number | 否 | - | 最低价格 |
| maxPrice | number | 否 | - | 最高价格 |
| inStock | boolean | 否 | - | 是否有库存 |
| isActive | boolean | 否 | true | 是否激活 |
| sort | string | 否 | createdAt:desc | 排序字段:方向 |

#### 排序选项

- `name:asc/desc` - 按名称排序
- `price:asc/desc` - 按价格排序
- `createdAt:asc/desc` - 按创建时间排序
- `stock:asc/desc` - 按库存排序
- `rating:asc/desc` - 按评分排序

#### 请求示例

```http
GET /api/products?page=1&limit=10&category=Electronics&minPrice=100&sort=price:asc
```

#### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "iPhone 13 Pro",
      "description": "最新的iPhone型号",
      "price": 999.99,
      "category": "Electronics",
      "subcategory": "Smartphones",
      "brand": "Apple",
      "sku": "IPHONE13PRO-128GB",
      "images": [
        "https://example.com/images/iphone13pro-1.jpg",
        "https://example.com/images/iphone13pro-2.jpg"
      ],
      "stock": 50,
      "isActive": true,
      "features": ["5G", "Triple Camera", "A15 Bionic"],
      "specifications": {
        "storage": "128GB",
        "color": "Sierra Blue",
        "weight": "204g"
      },
      "ratings": {
        "average": 4.5,
        "count": 128
      },
      "createdAt": "2025-06-25T10:30:00Z",
      "updatedAt": "2025-06-25T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pages": 15,
    "limit": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2. 获取产品详情

**GET** `/products/{id}`

通过ID获取产品详细信息。

#### 路径参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| id | string | 是 | 产品ID |

#### 请求示例

```http
GET /api/products/507f1f77bcf86cd799439011
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "iPhone 13 Pro",
    "description": "最新的iPhone型号，配备A15仿生芯片和专业级摄像头系统",
    "price": 999.99,
    "category": "Electronics",
    "subcategory": "Smartphones",
    "brand": "Apple",
    "sku": "IPHONE13PRO-128GB",
    "images": [
      "https://example.com/images/iphone13pro-1.jpg",
      "https://example.com/images/iphone13pro-2.jpg",
      "https://example.com/images/iphone13pro-3.jpg"
    ],
    "thumbnails": [
      "https://example.com/images/thumbs/iphone13pro-1.jpg"
    ],
    "stock": 50,
    "isActive": true,
    "features": [
      "5G网络支持",
      "三摄像头系统",
      "A15仿生芯片",
      "Face ID",
      "MagSafe兼容"
    ],
    "specifications": {
      "storage": "128GB",
      "color": "Sierra Blue",
      "weight": "204g",
      "dimensions": "146.7 x 71.5 x 7.65 mm",
      "display": "6.1英寸Super Retina XDR",
      "battery": "3095 mAh"
    },
    "ratings": {
      "average": 4.5,
      "count": 128
    },
    "seo": {
      "metaTitle": "iPhone 13 Pro - 128GB Sierra Blue",
      "metaDescription": "购买最新的iPhone 13 Pro，配备专业级摄像头和A15芯片",
      "slug": "iphone-13-pro-128gb-sierra-blue"
    },
    "createdAt": "2025-06-25T10:30:00Z",
    "updatedAt": "2025-06-25T10:30:00Z"
  }
}
```

### 3. 创建产品

**POST** `/products`

创建新产品。需要管理员权限。

#### 请求体

```json
{
  "name": "iPhone 13 Pro",
  "description": "最新的iPhone型号",
  "price": 999.99,
  "category": "Electronics",
  "subcategory": "Smartphones",
  "brand": "Apple",
  "sku": "IPHONE13PRO-128GB",
  "stock": 50,
  "features": ["5G", "Triple Camera", "A15 Bionic"],
  "specifications": {
    "storage": "128GB",
    "color": "Sierra Blue",
    "weight": "204g"
  }
}
```

#### 响应示例

```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "iPhone 13 Pro",
    // ... 完整产品信息
  }
}
```

### 4. 更新产品

**PUT** `/products/{id}`

更新现有产品。需要管理员权限。

#### 路径参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| id | string | 是 | 产品ID |

#### 请求体

```json
{
  "name": "iPhone 13 Pro (Updated)",
  "price": 899.99,
  "stock": 75
}
```

#### 响应示例

```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    // ... 更新后的产品信息
  }
}
```

### 5. 删除产品

**DELETE** `/products/{id}`

删除产品。需要管理员权限。

#### 路径参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| id | string | 是 | 产品ID |

#### 响应示例

```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

### 6. 产品搜索

**GET** `/products/search`

全文搜索产品。

#### 查询参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| q | string | 是 | 搜索关键词 |
| page | integer | 否 | 页码 |
| limit | integer | 否 | 每页数量 |
| category | string | 否 | 分类过滤 |
| minPrice | number | 否 | 最低价格 |
| maxPrice | number | 否 | 最高价格 |

#### 请求示例

```http
GET /api/products/search?q=iPhone&category=Electronics&minPrice=500
```

#### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "iPhone 13 Pro",
      "description": "最新的iPhone型号",
      "price": 999.99,
      "score": 0.95,
      "highlights": {
        "name": ["<em>iPhone</em> 13 Pro"],
        "description": ["最新的<em>iPhone</em>型号"]
      }
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "pages": 1,
    "limit": 20
  },
  "suggestions": ["iPhone 12", "iPhone 13", "iPhone SE"]
}
```

### 7. 批量更新库存

**PATCH** `/products/bulk/inventory`

批量更新产品库存。需要管理员权限。

#### 请求体

```json
{
  "updates": [
    {
      "productId": "507f1f77bcf86cd799439011",
      "quantity": -5
    },
    {
      "productId": "507f1f77bcf86cd799439012",
      "quantity": 10
    }
  ]
}
```

#### 响应示例

```json
{
  "success": true,
  "message": "Inventory updated successfully",
  "data": {
    "updated": 2,
    "failed": 0,
    "details": [
      {
        "productId": "507f1f77bcf86cd799439011",
        "oldStock": 50,
        "newStock": 45,
        "status": "success"
      }
    ]
  }
}
```

### 8. 图片上传

**POST** `/products/{id}/images`

为产品上传图片。需要管理员权限。

#### 请求体 (multipart/form-data)

| 字段 | 类型 | 必需 | 描述 |
|------|------|------|------|
| images | file[] | 是 | 图片文件 (最多5张) |
| generateThumbnails | boolean | 否 | 是否生成缩略图 |

#### 响应示例

```json
{
  "success": true,
  "message": "Images uploaded successfully",
  "data": {
    "uploaded": 3,
    "images": [
      {
        "original": "https://example.com/images/product-1.jpg",
        "thumbnail": "https://example.com/images/thumbs/product-1.jpg"
      }
    ]
  }
}
```

### 9. 获取产品分类

**GET** `/categories`

获取所有产品分类。

#### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "name": "Electronics",
      "subcategories": [
        "Smartphones",
        "Laptops", 
        "Tablets",
        "Accessories"
      ],
      "count": 150
    },
    {
      "name": "Books",
      "subcategories": [
        "Fiction",
        "Non-fiction",
        "Technical"
      ],
      "count": 89
    }
  ]
}
```

### 10. 获取产品品牌

**GET** `/brands`

获取所有产品品牌。

#### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "name": "Apple",
      "count": 25,
      "logo": "https://example.com/logos/apple.png"
    },
    {
      "name": "Samsung",
      "count": 18,
      "logo": "https://example.com/logos/samsung.png"
    }
  ]
}
```

## 错误码

| 错误码 | HTTP状态 | 描述 |
|--------|----------|------|
| PRODUCT_NOT_FOUND | 404 | 产品不存在 |
| INVALID_PRODUCT_ID | 400 | 无效的产品ID |
| DUPLICATE_SKU | 409 | SKU已存在 |
| INSUFFICIENT_STOCK | 400 | 库存不足 |
| INVALID_CATEGORY | 400 | 无效的分类 |
| IMAGE_UPLOAD_FAILED | 500 | 图片上传失败 |
| VALIDATION_FAILED | 422 | 数据验证失败 |

## 数据模型

### Product Schema

```typescript
interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  subcategory?: string;
  brand?: string;
  sku: string;
  images: string[];
  thumbnails: string[];
  stock: number;
  isActive: boolean;
  features: string[];
  specifications: Record<string, any>;
  ratings: {
    average: number;
    count: number;
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    slug?: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

## 性能指标

- 产品列表查询：< 100ms
- 产品详情查询：< 50ms
- 搜索查询：< 200ms
- 图片上传：< 2s

## 限流

- 匿名用户：100 请求/分钟
- 认证用户：1000 请求/分钟
- 搜索接口：50 请求/分钟

---

*API Version: v1.0.0 | Last Updated: 2025-06-25*