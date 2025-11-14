# SASA Platform 与原版 n8n 的区别

本文档详细说明 SASA Platform 相对于原版 n8n 的所有改造和定制内容。

## 📊 概览对比

| 特性 | 原版 n8n | SASA Platform |
|------|----------|---------------|
| **架构模式** | 单租户 | 多租户 SaaS |
| **节点管理** | 统一节点库 | 三层节点架构 |
| **许可证** | 企业版需要许可证 | 移除许可证验证 |
| **计费系统** | 无内置计费 | 内置多维度计费 |
| **租户隔离** | 不支持 | 完整数据隔离 |
| **管理面板** | 单一管理界面 | 独立管理面板 |

---

## 🏗️ 核心架构改造

### 1. 多租户架构

**原版 n8n**: 单租户设计，所有用户共享同一个工作空间。

**SASA Platform**: 完整的多租户 SaaS 架构
- ✅ 租户级别数据完全隔离
- ✅ 每个租户独立的工作空间和配置
- ✅ 租户级别的资源配额管理
- ✅ 跨租户数据访问控制

#### 数据库层改造

```typescript
// 新增租户表
@Entity('tenant')
export class Tenant {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  plan: 'free' | 'basic' | 'pro' | 'enterprise';

  @Column({ type: 'json' })
  quotas: TenantQuotas;  // 配额限制
}

// 所有核心表新增 tenantId 字段
@Entity('workflow')
export class Workflow {
  @Column()
  tenantId: string;  // 新增：租户隔离

  // ... 原有字段
}
```

#### API 层改造

- 所有 API 自动注入 `tenantId`
- 查询自动添加租户过滤条件
- 跨租户操作严格拦截

---

### 2. 三层节点架构

**原版 n8n**: 所有节点统一管理在 `nodes-base` 包中。

**SASA Platform**: 三层节点管理体系

#### 第一层：内置节点 (Built-in Nodes)
- 位置: `packages/nodes-base/`
- 来源: n8n 官方 400+ 节点
- 特点: 所有租户共享，由平台统一维护

#### 第二层：平台节点 (Platform Nodes)
- 位置: `packages/nodes-platform/` (新增包)
- 来源: SASA 平台开发的通用节点
- 特点:
  - 所有租户可用
  - 针对特定业务场景定制
  - 由平台团队统一维护和更新

#### 第三层：租户节点 (Tenant Nodes)
- 位置: 数据库存储，动态加载
- 来源: 各租户自行开发
- 特点:
  - 仅对特定租户可见
  - 支持在线编辑和发布
  - 租户完全自主管理

```typescript
// 节点加载逻辑改造
export class NodeLoader {
  async loadNodesForTenant(tenantId: string) {
    const nodes = [
      ...await this.loadBuiltInNodes(),      // 内置节点
      ...await this.loadPlatformNodes(),     // 平台节点
      ...await this.loadTenantNodes(tenantId) // 租户节点
    ];
    return nodes;
  }
}
```

---

### 3. 许可证系统移除

**原版 n8n**: 企业功能需要有效的许可证。

**SASA Platform**: 完全移除许可证验证
- ✅ 删除所有许可证检查代码
- ✅ 企业功能默认全部启用
- ✅ 移除与 license.n8n.io 的所有通信
- ✅ 移除配额限制逻辑

#### 受影响的功能（现已全部启用）

```typescript
// 原版：需要许可证
@Licensed('feat:ldap')
export class LdapService { }

// SASA：直接启用，移除装饰器
export class LdapService { }
```

启用的企业功能：
- LDAP 登录
- SAML SSO
- OIDC SSO
- 高级权限
- Source Control (Git 集成)
- 工作流历史
- 环境变量
- 外部密钥
- API 密钥管理
- Provisioning
- 日志流

---

### 4. 计费系统集成

**原版 n8n**: 无内置计费功能。

**SASA Platform**: 完整的计费管理系统

#### 新增组件

```typescript
// 计费服务
@Service()
export class BillingService {
  // 计算使用量
  async calculateUsage(tenantId: string, period: BillingPeriod) {
    return {
      workflowExecutions: number;
      aiTokens: number;
      storage: number;
      activeUsers: number;
    };
  }

  // 检查配额
  async checkQuota(tenantId: string, resource: ResourceType) {
    // 实时配额检查
  }

  // 生成账单
  async generateInvoice(tenantId: string, period: BillingPeriod) {
    // 生成详细账单
  }
}
```

#### 支持的计费维度

- 工作流执行次数
- AI Token 使用量
- 存储空间
- 活跃用户数
- API 调用次数
- 自定义节点数量

---

### 5. 管理面板增强

**原版 n8n**: 统一的管理界面。

**SASA Platform**: 独立的多租户管理面板

#### 新增管理面板 (`packages/frontend/admin-panel`)

**功能模块**:

1. **租户管理**
   - 租户列表和详情
   - 创建/编辑/禁用租户
   - 租户配额设置

2. **计费管理**
   - 使用量统计和报表
   - 账单生成和管理
   - 套餐和定价管理

3. **平台节点管理**
   - 平台节点列表
   - 节点发布和版本管理
   - 节点权限控制

4. **系统监控**
   - 平台整体健康状态
   - 资源使用监控
   - 性能指标看板

**访问地址**: `http://localhost:5679` (开发模式)

---

## 🔧 技术实现改造

### 数据库 Schema 变更

#### 新增表

```sql
-- 租户表
CREATE TABLE tenant (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  plan VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  quotas JSON,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 租户配额表
CREATE TABLE tenant_quota (
  tenant_id VARCHAR(36) PRIMARY KEY,
  max_workflows INT,
  max_executions_per_month INT,
  max_ai_tokens_per_month BIGINT,
  max_storage_mb INT,
  max_users INT,
  FOREIGN KEY (tenant_id) REFERENCES tenant(id)
);

-- 租户使用量表
CREATE TABLE tenant_usage (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36),
  period_start DATE,
  period_end DATE,
  workflow_executions INT,
  ai_tokens_used BIGINT,
  storage_used_mb INT,
  active_users INT,
  FOREIGN KEY (tenant_id) REFERENCES tenant(id)
);

-- 平台节点表
CREATE TABLE platform_node (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(20) NOT NULL,
  code TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 租户节点表
CREATE TABLE tenant_node (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(20) NOT NULL,
  code TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (tenant_id) REFERENCES tenant(id)
);
```

#### 修改的核心表

所有核心表新增 `tenant_id` 字段：
- `workflow` - 工作流
- `credentials` - 凭证
- `execution` - 执行记录
- `tag` - 标签
- `variables` - 变量
- `webhook` - Webhook
- `workflow_statistics` - 统计数据

### API 层改造

#### 中间件增强

```typescript
// 租户上下文中间件
export const tenantContextMiddleware: RequestHandler = (req, res, next) => {
  // 从 JWT 或 Header 中提取 tenantId
  const tenantId = extractTenantId(req);

  // 注入到请求上下文
  req.tenantId = tenantId;

  // 验证租户状态
  await validateTenantStatus(tenantId);

  next();
};

// 配额检查中间件
export const quotaCheckMiddleware = (resource: ResourceType) => {
  return async (req, res, next) => {
    const tenantId = req.tenantId;
    const hasQuota = await billingService.checkQuota(tenantId, resource);

    if (!hasQuota) {
      throw new QuotaExceededError();
    }

    next();
  };
};
```

#### Repository 层改造

```typescript
// 自动注入租户过滤
export class WorkflowRepository extends Repository<Workflow> {
  findByTenant(tenantId: string) {
    return this.find({
      where: { tenantId }  // 自动添加租户过滤
    });
  }

  // 防止跨租户访问
  async findOne(id: string, tenantId: string) {
    const workflow = await super.findOne({
      where: { id, tenantId }  // 强制租户检查
    });

    if (!workflow) {
      throw new NotFoundError();
    }

    return workflow;
  }
}
```

### 前端改造

#### 租户选择器

```vue
<!-- packages/frontend/editor-ui/src/components/TenantSelector.vue -->
<template>
  <n8n-select v-model="selectedTenant" @change="onTenantChange">
    <n8n-option
      v-for="tenant in tenants"
      :key="tenant.id"
      :value="tenant.id"
      :label="tenant.name"
    />
  </n8n-select>
</template>
```

#### 配额显示

```vue
<!-- 在导航栏显示当前配额使用情况 -->
<div class="quota-indicator">
  <span>执行次数: {{ usage.executions }} / {{ quota.maxExecutions }}</span>
  <n8n-progress-bar :percentage="usagePercentage" />
</div>
```

---

## 📦 新增包和模块

### 后端新增

1. **`packages/@n8n/billing`** (新增)
   - 计费逻辑
   - 配额管理
   - 使用量统计

2. **`packages/@n8n/multi-tenant`** (新增)
   - 租户管理服务
   - 租户隔离中间件
   - 跨租户访问控制

3. **`packages/nodes-platform`** (新增)
   - 平台自定义节点
   - 节点动态加载
   - 节点版本管理

### 前端新增

1. **`packages/frontend/admin-panel`** (新增)
   - 管理员面板应用
   - 租户管理界面
   - 计费和监控界面

2. **`packages/frontend/@n8n/multi-tenant-ui`** (新增)
   - 租户选择组件
   - 配额显示组件
   - 多租户相关 UI 组件

---

## 🔐 安全性增强

### 租户隔离

1. **数据库级隔离**
   ```typescript
   // 所有查询自动添加租户过滤
   const workflows = await workflowRepository.find({
     where: { tenantId: currentTenantId }
   });
   ```

2. **API 级隔离**
   ```typescript
   // 中间件自动验证租户权限
   router.use(tenantContextMiddleware);
   router.use(validateTenantAccess);
   ```

3. **前端级隔离**
   ```typescript
   // Store 自动过滤租户数据
   const workflows = computed(() =>
     allWorkflows.filter(w => w.tenantId === currentTenantId)
   );
   ```

### 访问控制增强

- 细粒度的 RBAC
- 租户级别的权限组
- 资源级别的权限控制

---

## 📊 监控和分析增强

### 租户级监控

```typescript
// 租户维度的监控指标
interface TenantMetrics {
  activeUsers: number;
  workflowExecutions: number;
  errorRate: number;
  avgExecutionTime: number;
  storageUsed: number;
  aiTokensUsed: number;
}
```

### 平台级监控

- 所有租户的聚合统计
- 资源使用趋势分析
- 异常租户检测
- 性能瓶颈识别

---

## 🔄 与上游同步策略

### 保持同步的部分

- 核心工作流引擎
- 基础节点实现
- UI 组件库
- 安全更新

### 定制化的部分（不同步）

- 多租户架构代码
- 计费系统
- 管理面板
- 租户隔离逻辑
- 三层节点架构

### 同步流程

```bash
# 1. 拉取上游更新
git fetch upstream
git merge upstream/master

# 2. 解决冲突（保留定制化部分）
# 手动检查以下目录的冲突:
# - packages/@n8n/billing/
# - packages/@n8n/multi-tenant/
# - packages/nodes-platform/
# - packages/frontend/admin-panel/

# 3. 重新应用多租户补丁
npm run apply-tenant-patches

# 4. 测试
pnpm test
pnpm typecheck
```

---

## 📈 性能优化

### 租户级缓存

```typescript
// Redis 缓存按租户分组
const cacheKey = `tenant:${tenantId}:workflows`;
await redis.set(cacheKey, workflows, 'EX', 300);
```

### 查询优化

```sql
-- 添加租户相关索引
CREATE INDEX idx_workflow_tenant ON workflow(tenant_id, created_at);
CREATE INDEX idx_execution_tenant ON execution(tenant_id, finished_at);
```

---

## 🎯 未来规划

### 短期（1-3 个月）

- [ ] 租户级别的自定义主题
- [ ] 更细粒度的资源配额
- [ ] 租户数据导出/导入
- [ ] 多地域部署支持

### 中期（3-6 个月）

- [ ] 租户间工作流市场
- [ ] 自动扩缩容支持
- [ ] 高级分析和 BI 集成
- [ ] 白标定制能力

### 长期（6-12 个月）

- [ ] AI 驱动的工作流推荐
- [ ] 边缘计算支持
- [ ] 区块链集成
- [ ] 行业垂直解决方案

---

## 📝 总结

SASA Platform 在保留 n8n 核心优势的基础上，进行了深度的企业级改造：

**核心变化**:
- ✅ 从单租户到多租户 SaaS 架构
- ✅ 从统一节点库到三层节点架构
- ✅ 从基础功能到企业级完整解决方案
- ✅ 移除许可证限制，所有功能开箱即用

**优势**:
- 🚀 完整的多租户隔离和管理
- 💰 内置计费和配额系统
- 🔧 灵活的三层节点扩展体系
- 📊 强大的管理和监控能力
- 🔐 企业级安全和访问控制

---

**维护者**: SASA Platform Team
**最后更新**: 2025-11-14
**基于**: n8n v1.119.0
