# n8n 多租户架构 - API端点映射文档

## 概述

本文档记录了n8n多租户架构改造后的API端点设计，说明了新旧两套Controller的关系和使用场景。

## API分层设计哲学

### 平台级API (Platform-Level APIs)
- **控制器**: `PluginsController`, `AdminPluginsController`, `AdminPlatformServicesController`
- **路径前缀**: `/plugins/*`, `/admin/plugins/*`, `/admin/platform-services/*`
- **设计理念**: 基于"服务"概念的全局管理
- **适用场景**:
  - 插件市场浏览和安装
  - 全局插件配置和凭据管理
  - 平台级AI模型和RAG服务管理
  - 插件审核和上架流程

### 工作空间级API (Workspace-Level APIs)
- **控制器**: `CustomNodesController`, `PlatformNodesController`, `PlatformAIProvidersController`
- **路径前缀**: `/workspace/:id/custom-nodes/*`, `/platform-nodes/*`, `/platform-ai-providers/*`
- **设计理念**: 基于"节点"概念的工作空间隔离
- **适用场景**:
  - 工作流编辑器中的节点选择
  - 工作空间自定义节点管理
  - 工作空间范围的AI服务调用

## API端点详细映射

### 1. 插件管理API (Plugins)

#### 1.1 用户端点 - PluginsController

| 端点 | 方法 | 功能 | 前端使用 | Controller文件 |
|------|------|------|----------|----------------|
| `/plugins` | GET | 获取所有插件 | plugins.api.ts | plugins.controller.ts |
| `/plugins/available` | GET | 获取可用插件 | plugins.api.ts | plugins.controller.ts |
| `/plugins/custom` | GET | 获取工作空间自定义插件 | plugins.api.ts | plugins.controller.ts |
| `/plugins/custom` | POST | 上传自定义插件 | plugins.api.ts | plugins.controller.ts |
| `/plugins/:key/submit` | POST | 提交插件审核 | plugins.api.ts | plugins.controller.ts |
| `/plugins/:key/update` | POST | 更新插件 | plugins.api.ts | plugins.controller.ts |
| `/plugins/custom/:key` | DELETE | 删除自定义插件 | plugins.api.ts | plugins.controller.ts |
| `/plugins/:key/credentials` | POST | 配置插件凭据 | plugins.api.ts | plugins.controller.ts |
| `/plugins/:key/credentials` | GET | 获取插件凭据 | plugins.api.ts | plugins.controller.ts |
| `/plugins/:key/credentials` | DELETE | 删除插件凭据 | plugins.api.ts | plugins.controller.ts |

**查询参数:**
- `workspaceId`: 工作空间ID (通过查询参数传递)

#### 1.2 管理员端点 - AdminPluginsController

| 端点 | 方法 | 功能 | 前端使用 | Controller文件 |
|------|------|------|----------|----------------|
| `/admin/plugins/submissions` | GET | 获取待审核插件 | plugins.api.ts | admin-plugins.controller.ts |
| `/admin/plugins/:key/approve` | POST | 批准插件 | plugins.api.ts | admin-plugins.controller.ts |
| `/admin/plugins/:key/reject` | POST | 拒绝插件 | plugins.api.ts | admin-plugins.controller.ts |
| `/admin/plugins/:key` | DELETE | 永久删除插件 | plugins.api.ts | admin-plugins.controller.ts |

**权限要求:**
- 所有端点需要 `global:admin` 权限

### 2. 工作空间自定义节点API (Custom Nodes)

#### 2.1 CustomNodesController

| 端点 | 方法 | 功能 | 前端使用 | Controller文件 |
|------|------|------|----------|----------------|
| `/workspace/:workspaceId/custom-nodes` | GET | 获取工作空间自定义节点 | ❌ 未使用 | custom-nodes.controller.ts |
| `/workspace/:workspaceId/custom-nodes` | POST | 创建自定义节点 | ❌ 未使用 | custom-nodes.controller.ts |
| `/workspace/:workspaceId/custom-nodes/:nodeKey` | GET | 获取节点详情 | ❌ 未使用 | custom-nodes.controller.ts |
| `/workspace/:workspaceId/custom-nodes/:nodeKey` | PATCH | 更新节点 | ❌ 未使用 | custom-nodes.controller.ts |
| `/workspace/:workspaceId/custom-nodes/:nodeKey` | DELETE | 删除节点 | ❌ 未使用 | custom-nodes.controller.ts |
| `/workspace/:workspaceId/custom-nodes/:nodeKey/submit` | POST | 提交审核 | ❌ 未使用 | custom-nodes.controller.ts |

**特点:**
- ✅ 工作空间ID在路径中
- ✅ 完全工作空间隔离
- ⚠️ 前端尚未迁移到这套API

### 3. 平台节点管理API (Platform Nodes)

#### 3.1 PlatformNodesController

| 端点 | 方法 | 功能 | 前端使用 | Controller文件 |
|------|------|------|----------|----------------|
| `/platform-nodes` | GET | 获取所有平台节点 | ❌ 未使用 | platform-nodes.controller.ts |
| `/platform-nodes/search` | GET | 搜索节点 | ❌ 未使用 | platform-nodes.controller.ts |
| `/platform-nodes/:nodeKey` | GET | 获取节点详情 | ❌ 未使用 | platform-nodes.controller.ts |
| `/platform-nodes/:nodeKey/approve` | POST | 批准节点（管理员） | ❌ 未使用 | platform-nodes.controller.ts |
| `/platform-nodes/:nodeKey/reject` | POST | 拒绝节点（管理员） | ❌ 未使用 | platform-nodes.controller.ts |
| `/platform-nodes/:nodeKey/toggle` | PATCH | 启用/禁用节点（管理员） | ❌ 未使用 | platform-nodes.controller.ts |
| `/platform-nodes/categories/grouped` | GET | 按分类分组的节点 | ❌ 未使用 | platform-nodes.controller.ts |

**权限要求:**
- 查看端点: 所有登录用户
- 管理端点: `global:admin` 权限

### 4. 平台服务管理API (Platform Services)

#### 4.1 AdminPlatformServicesController

| 端点 | 方法 | 功能 | 前端使用 | Controller文件 |
|------|------|------|----------|----------------|
| `/admin/platform-services/ai-models` | GET | 获取AI模型列表 | platformServices.api.ts | admin-platform-services.controller.ts |
| `/admin/platform-services/ai-models` | POST | 创建AI模型 | platformServices.api.ts | admin-platform-services.controller.ts |
| `/admin/platform-services/ai-models/:key` | PATCH | 更新AI模型 | platformServices.api.ts | admin-platform-services.controller.ts |
| `/admin/platform-services/ai-models/:key` | DELETE | 删除AI模型 | platformServices.api.ts | admin-platform-services.controller.ts |
| `/admin/platform-services/rag` | GET | 获取RAG服务列表 | platformServices.api.ts | admin-platform-services.controller.ts |
| `/admin/platform-services/rag` | POST | 创建RAG服务 | platformServices.api.ts | admin-platform-services.controller.ts |
| `/admin/platform-services/rag/:key` | PATCH | 更新RAG服务 | platformServices.api.ts | admin-platform-services.controller.ts |
| `/admin/platform-services/rag/:key` | DELETE | 删除RAG服务 | platformServices.api.ts | admin-platform-services.controller.ts |

**权限要求:**
- 所有端点需要 `global:admin` 权限

### 5. AI服务提供商API (AI Providers)

#### 5.1 PlatformAIProvidersController

| 端点 | 方法 | 功能 | 前端使用 | Controller文件 |
|------|------|------|----------|----------------|
| `/platform-ai-providers` | GET | 获取AI提供商列表 | ❌ 未使用 | platform-ai-providers.controller.ts |
| `/platform-ai-providers/:providerKey` | GET | 获取提供商详情 | ❌ 未使用 | platform-ai-providers.controller.ts |
| `/platform-ai-providers/:providerKey/models` | GET | 获取提供商模型列表 | ❌ 未使用 | platform-ai-providers.controller.ts |
| `/platform-ai-providers/:providerKey/chat/completions` | POST | 调用AI聊天（自动计费） | ❌ 未使用 | platform-ai-providers.controller.ts |

**特点:**
- ✅ 运行时AI调用接口
- ✅ 自动计费和用量跟踪
- ⚠️ 前端尚未迁移到这套API

## 前端API调用现状

### plugins.api.ts (14个函数)
```typescript
✅ 使用中的API (调用旧Controller):
- getAllPlugins()              → GET /plugins
- getAvailablePlugins()        → GET /plugins/available
- getMyPlugins()               → GET /plugins/custom
- uploadPlugin()               → POST /plugins/custom
- submitPlugin()               → POST /plugins/:key/submit
- updatePlugin()               → POST /plugins/:key/update
- deletePlugin()               → DELETE /plugins/custom/:key
- configurePluginCredentials() → POST /plugins/:key/credentials
- getPluginCredentials()       → GET /plugins/:key/credentials
- deletePluginCredentials()    → DELETE /plugins/:key/credentials
- getPendingPluginSubmissions() → GET /admin/plugins/submissions
- approvePlugin()              → POST /admin/plugins/:key/approve
- rejectPlugin()               → POST /admin/plugins/:key/reject
- deletePluginPermanently()    → DELETE /admin/plugins/:key
```

### platformServices.api.ts (11个函数)
```typescript
✅ 使用中的API (调用旧Controller):
- getAllAiModels()      → GET /admin/platform-services/ai-models
- createAiModel()       → POST /admin/platform-services/ai-models
- updateAiModel()       → PATCH /admin/platform-services/ai-models/:key
- deleteAiModel()       → DELETE /admin/platform-services/ai-models/:key
- getAllRagServices()   → GET /admin/platform-services/rag
- createRagService()    → POST /admin/platform-services/rag
- updateRagService()    → PATCH /admin/platform-services/rag/:key
- deleteRagService()    → DELETE /admin/platform-services/rag/:key

❓ 未实现的API (前端定义但后端未实现):
- getAllPlatformServices()    → GET /platform-services
- getAvailableServices()      → GET /platform-services/available
- getPlatformService()        → GET /platform-services/:serviceKey
- getServiceUsageStats()      → GET /platform-services/:serviceKey/usage
```

## Controller文件信息

| Controller | 路径 | 大小 | 行数 | 状态 |
|-----------|------|------|------|------|
| PluginsController | packages/cli/src/controllers/plugins.controller.ts | 10KB | 368行 | ✅ 使用中 |
| AdminPluginsController | packages/cli/src/controllers/admin/admin-plugins.controller.ts | 9.2KB | 342行 | ✅ 使用中 |
| AdminPlatformServicesController | packages/cli/src/controllers/admin/admin-platform-services.controller.ts | 14KB | 526行 | ✅ 使用中 |
| CustomNodesController | packages/cli/src/controllers/custom-nodes.controller.ts | 7.2KB | - | ⚠️ 未使用 |
| PlatformNodesController | packages/cli/src/controllers/platform-nodes.controller.ts | 5.1KB | - | ⚠️ 未使用 |
| PlatformAIProvidersController | packages/cli/src/controllers/platform-ai-providers.controller.ts | 3.9KB | - | ⚠️ 未使用 |

## 数据层依赖

### 旧Controller使用的Repository
```typescript
// PluginsController
- PlatformServiceRepository ✅
- WorkspacePluginCredentialsRepository ✅
- PluginValidatorService ✅

// AdminPluginsController
- PlatformServiceRepository ✅

// AdminPlatformServicesController
- PlatformServiceRepository ✅
- PlatformRagServiceRepository ✅
```

### 新Controller使用的Service
```typescript
// CustomNodesController
- CustomNodeService ✅

// PlatformNodesController
- PlatformNodeService ✅

// PlatformAIProvidersController
- PlatformAIProviderService ✅
```

**结论**: 新旧Controller都使用正确的新架构Repository/Service，不存在数据层错误。

## 迁移路径建议

### 阶段1: 评估和规划 (当前阶段)
- ✅ 完成API端点映射
- ✅ 识别前端依赖
- ✅ 评估迁移风险
- ⏳ 决定迁移策略

### 阶段2: 前端API迁移 (可选)
如果决定迁移到新Controller:

1. **创建新的前端API文件**
   ```typescript
   // customNodes.api.ts - 对应 CustomNodesController
   // platformNodes.api.ts - 对应 PlatformNodesController
   // aiProviders.api.ts - 对应 PlatformAIProvidersController
   ```

2. **实现功能对等的API函数**
   - 调整路径从 `/plugins/*` 到 `/workspace/:id/custom-nodes/*`
   - 调整参数从查询参数到路径参数

3. **使用Feature Flag控制切换**
   ```typescript
   const useNewApi = useFeatureFlag('use-new-node-api');
   const api = useNewApi ? newCustomNodesApi : oldPluginsApi;
   ```

4. **渐进式迁移前端组件**
   - 一次迁移一个功能模块
   - 保持向后兼容

### 阶段3: 删除旧Controller (可选)
只有在前端完全迁移后才考虑:

1. 确认前端无引用
2. 删除Controller文件
3. 更新文档

## 当前建议

### 🎯 推荐方案：保持现状，两套API共存

**理由:**
1. ✅ 旧Controller功能完整，运行稳定
2. ✅ 前端大量依赖，迁移成本高
3. ✅ 新旧Controller解决不同层面的问题
4. ✅ 可以根据业务需求选择合适的API

**行动项:**
- ✅ 保留所有Controller
- ✅ 文档化两套API的使用场景
- ✅ 继续维护两套API
- ✅ 根据实际需求决定是否迁移

### ⚠️ 不推荐：立即删除旧Controller

**风险:**
- ❌ 前端功能完全失效
- ❌ 需要大量前端重构
- ❌ 可能引入新bug
- ❌ 影响用户使用

## 使用场景指南

### 何时使用平台级API (旧Controller)
- 插件市场功能
- 全局插件配置
- 插件凭据管理
- 平台服务管理（AI模型、RAG）
- 插件审核流程

### 何时使用工作空间级API (新Controller)
- 工作流编辑器节点选择
- 工作空间隔离的自定义节点
- 工作空间级AI服务调用
- 新的前端功能开发

## 总结

当前系统中存在两套API设计，它们：
- ✅ 都基于正确的数据层架构
- ✅ 服务不同的业务场景
- ✅ 可以并存互补
- ⚠️ 前端主要使用旧API
- ⚠️ 新API等待前端迁移

**建议**: 不要删除旧Controller，保持两套API共存，根据实际业务需求选择使用。
