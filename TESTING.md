# 测试指南

本文档描述了如何为电商微服务平台运行测试。

## 快速开始

### 安装所有依赖

```bash
# 安装根项目依赖
npm install

# 安装所有服务和前端依赖
npm run install:all
```

### 运行所有测试

```bash
# 运行所有服务和前端测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage
```

## 分服务测试

### 后端微服务测试

每个微服务都配置了完整的Jest测试框架：

#### Product Catalog Service
```bash
cd services/product-catalog
npm test                    # 运行所有测试
npm run test:watch         # 监视模式
npm run test:coverage      # 生成覆盖率报告
npm run test:unit         # 仅运行单元测试
npm run test:integration  # 仅运行集成测试
```

#### User Profile Service
```bash
cd services/user-profile
npm test                    # 运行所有测试
npm run test:watch         # 监视模式
npm run test:coverage      # 生成覆盖率报告
npm run test:unit         # 仅运行单元测试
npm run test:integration  # 仅运行集成测试
```

#### Shopping Cart Service
```bash
cd services/shopping-cart
npm test                    # 运行所有测试
npm run test:watch         # 监视模式
npm run test:coverage      # 生成覆盖率报告
npm run test:unit         # 仅运行单元测试
npm run test:integration  # 仅运行集成测试
```

#### Search Service
```bash
cd services/search
npm test                    # 运行所有测试
npm run test:watch         # 监视模式
npm run test:coverage      # 生成覆盖率报告
npm run test:unit         # 仅运行单元测试
npm run test:integration  # 仅运行集成测试
```

### 前端测试

React前端应用使用React Testing Library和Jest：

```bash
cd frontend/react-store-ui
npm test                    # 交互模式
npm test -- --watchAll=false  # 运行一次
npm run test:coverage      # 生成覆盖率报告
```

## 测试框架和工具

### 后端微服务 (Node.js)

每个微服务都包含以下测试依赖：

- **jest**: 测试框架
- **@types/jest**: Jest TypeScript 类型定义
- **supertest**: HTTP断言库，用于API测试
- **@types/supertest**: Supertest TypeScript 类型定义
- **mongodb-memory-server**: 内存MongoDB实例（用于MongoDB服务）
- **redis-mock**: Redis模拟器（用于Redis服务）
- **nock**: HTTP请求模拟库

### 前端 (React TypeScript)

前端应用包含以下测试依赖：

- **@testing-library/react**: React组件测试工具
- **@testing-library/jest-dom**: 额外的Jest DOM匹配器
- **@testing-library/user-event**: 用户交互模拟
- **@types/jest**: Jest TypeScript 类型定义

## 测试配置

### Jest配置

每个服务都有自己的Jest配置：

```javascript
{
  "testEnvironment": "node",
  "coverageDirectory": "coverage",
  "collectCoverageFrom": [
    "src/**/*.js",
    "!src/index.js"
  ],
  "testMatch": [
    "**/__tests__/**/*.js",
    "**/?(*.)+(spec|test).js"
  ],
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"]
}
```

### 测试环境设置

每个服务都有一个 `jest.setup.js` 文件，用于：

- 设置测试环境变量
- 模拟外部服务（数据库、Redis、Elasticsearch等）
- 提供测试实用工具
- 配置全局测试钩子

### 前端测试设置

前端使用以下文件进行测试配置：

- `src/setupTests.ts`: 全局测试设置
- `src/testUtils.tsx`: 测试实用工具和模拟数据工厂

## 测试类型

### 单元测试
- 测试单个函数/模块的功能
- 文件命名：`*.unit.test.js` 或放在 `__tests__/unit/` 目录

### 集成测试
- 测试多个模块间的交互
- 文件命名：`*.integration.test.js` 或放在 `__tests__/integration/` 目录

### API测试
- 测试REST API端点
- 使用supertest进行HTTP请求测试

### 组件测试（前端）
- 测试React组件的渲染和交互
- 使用React Testing Library

## 覆盖率要求

### 后端服务
- 每个服务的最低覆盖率目标：80%
- 排除文件：入口文件（index.js）

### 前端应用
- 最低覆盖率要求：
  - 分支覆盖率：80%
  - 函数覆盖率：80%
  - 行覆盖率：80%
  - 语句覆盖率：80%

## 测试数据和Mock

### 后端Mock
- 数据库连接使用内存数据库或Mock
- 外部API调用使用nock进行拦截
- Redis使用redis-mock

### 前端Mock
- API调用通过测试实用工具进行Mock
- Redux store使用configureStore创建测试store
- DOM API（ResizeObserver、IntersectionObserver等）已Mock

## 持续集成

测试可以在CI/CD管道中运行：

```yaml
# 示例GitHub Actions配置
- name: Run tests
  run: |
    npm run install:all
    npm run test:coverage
```

## 故障排除

### 常见问题

1. **MongoDB连接错误**: 确保mongodb-memory-server正确安装
2. **Redis连接错误**: 使用redis-mock，无需实际Redis实例
3. **Elasticsearch连接错误**: 使用Mock，无需实际Elasticsearch实例
4. **前端测试超时**: 增加Jest超时时间或检查异步操作

### 调试测试

```bash
# 运行特定测试文件
npm test -- --testPathPattern=productController

# 启用详细输出
npm test -- --verbose

# 调试模式
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 最佳实践

1. **测试隔离**: 每个测试应该独立运行
2. **清理资源**: 在测试后清理数据库/缓存
3. **描述性测试名**: 使用清楚的测试描述
4. **AAA模式**: Arrange-Act-Assert
5. **Mock外部依赖**: 避免依赖外部服务
6. **覆盖率不是万能的**: 关注测试质量而非仅仅数量