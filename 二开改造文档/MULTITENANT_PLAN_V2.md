# n8n 多租户改造方案 v2.0 - 基于 Project 架构扩展

> **核心理念：基于 n8n 现有 Project 架构扩展，添加 Team 计费层级**
> **改造策略：最小改动，最大化兼容，快速实现 MVP**

---

## 🎯 设计理念变更

### ❌ ��方案问题
- 试图废弃成熟的 Project 架构
- 重建整个工作区系统
- 删除 SharedWorkflow/SharedCredentials 机制
- 改动过于激进，风险高

### ✅ 新方案优势
- **基于现有架构**：n8n 的 Project 系统已经很成熟
- **最小改动原则**：只添加必要的 Team 和计费功能
- **完全兼容**：不破坏现有功能，易于升级
- **快速实施**：预计 8-10 周完成 MVP

---

## 📦 架构设计

### 核心概念
```
租户 = 用户账号（一个用户 = 一个钱包 = 一个租户）

用户 A（租户 A）
├── 个人空间（Project.type='personal'）
│   ├── Project 1（个人项目）
│   └── Project 2（个人项目）
│       └── 💰 使用用户 A 的余额计费
│
└── 团队空间（Project.type='team'）
    └── 团队 1（由用户 A 创建）
        ├── Team（计费主体）
        │   ├── billing_mode: 'owner_pays'
        ��   └── maxMembers: 10
        ├── Project 3（团队项目）
        ├── Project 4（团队项目）
        └── TeamMember（成员管理）
            ├── 用户 A（team:owner）
            ├── 用户 B（team:admin）
            └── 用户 C（team:member）
```

### 数据库关系图
```
User (用户表)
├── id, email, password
├── tier: 'free' | 'pro' | 'enterprise'
├── max_teams: INT
└── balance: DECIMAL(10,2)

Team (团队表) 🆕
├── name, slug, owner_id
├── billing_mode: 'owner_pays' | 'member_pays'
├── max_members, status
└── created_at, updated_at

TeamMember (团队成员) 🆕
├── team_id, user_id
├── role: 'team:owner' | 'team:admin' | 'team:member' | 'team:viewer'
└── joined_at

Project (项目表) - 扩展现有
├── name, type: 'personal' | 'team'
├── team_id: UUID (新增，NULL 表示个人项目)
└── is_default: BOOLEAN (新增)

ProjectRelation (项目成员) - 保持不变
├── project_id, user_id
└── role: 'project:owner' | 'project:admin' | 'project:member'

SharedWorkflow (工作流共享) - 保持不变
├── project_id, workflow_id
└── role: 'workflow:owner' | 'workflow:editor' | 'workflow:viewer'

WorkflowEntity (工作流实体)
├── project_id (现有)
└── (无需修改)

CredentialsEntity (凭证实体)
├── project_id (现有)
└── (无需修改)
```

---

## 🗂️ 数据库设计变更

### 1. 新增表（3 张）

#### 1.1 团队表 (`team`)
```sql
CREATE TABLE team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,                              -- 子域名标识
  owner_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',          -- 'active' | 'suspended' | 'deleted'
  billing_mode VARCHAR(50) NOT NULL DEFAULT 'owner_pays',-- 'owner_pays' | 'member_pays'
  max_members INT DEFAULT 10,
  icon VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_team_status CHECK (status IN ('active', 'suspended', 'deleted')),
  CONSTRAINT chk_team_billing_mode CHECK (billing_mode IN ('owner_pays', 'member_pays'))
);

CREATE INDEX idx_team_owner ON team(owner_id);
CREATE INDEX idx_team_slug ON team(slug) WHERE slug IS NOT NULL;
```

#### 1.2 团队成员表 (`team_member`)
```sql
CREATE TABLE team_member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'team:member',
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(team_id, user_id),
  CONSTRAINT chk_team_member_role CHECK (role IN ('team:owner', 'team:admin', 'team:member', 'team:viewer'))
);

CREATE INDEX idx_team_member_team ON team_member(team_id);
CREATE INDEX idx_team_member_user ON team_member(user_id);
```

#### 1.3 用户余额表 (`user_balance`)
```sql
CREATE TABLE user_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX idx_user_balance_user ON user_balance(user_id);
```

### 2. 修改现有表（1 张）

#### 2.1 扩展 Project 表
```sql
-- 添加团队关联字段
ALTER TABLE "project"
  ADD COLUMN team_id UUID REFERENCES team(id) ON DELETE CASCADE,
  ADD COLUMN is_default BOOLEAN DEFAULT false;

-- 添加约束：个人项目不能有 team_id，团队项目必须有 team_id
ALTER TABLE "project"
  ADD CONSTRAINT chk_project_team_consistency CHECK (
    (type = 'personal' AND team_id IS NULL) OR
    (type = 'team' AND team_id IS NOT NULL)
  );

-- 添加索引
CREATE INDEX idx_project_team ON project(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_project_owner_default ON project(project_relations_project_id, is_default);
```

### 3. 扩展 User 表
```sql
-- 添加租户相关字段
ALTER TABLE "user"
  ADD COLUMN tier VARCHAR(50) NOT NULL DEFAULT 'free',
  ADD COLUMN max_teams INT DEFAULT 3,
  ADD COLUMN max_storage_mb INT DEFAULT 1024,
  ADD COLUMN tenant_status VARCHAR(50) NOT NULL DEFAULT 'active';

-- 添加约束
ALTER TABLE "user"
  ADD CONSTRAINT chk_user_tier CHECK (tier IN ('free', 'pro', 'enterprise')),
  ADD CONSTRAINT chk_user_tenant_status CHECK (tenant_status IN ('active', 'suspended', 'deleted'));

-- 添加索引
CREATE INDEX idx_user_tier ON "user"(tier);
CREATE INDEX idx_user_tenant_status ON "user"(tenant_status);
```

---

## 🎨 前端设计

### 1. 组件结构
```
MainSidebar
├── WorkspaceSwitcher → ProjectSwitcher
│   ├── 个人项目列表（type='personal'）
│   └── 团队项目列表（type='team'）
│       └── 团队 A
│           ├── 项目 1
│           └── 项目 2
└── BalanceDisplay（余额显示）
```

### 2. 页面设计
- **项目切换器**：显示个人项目 + 团队项目
- **团队管理**：创建团队、邀请成员、设置计费模式
- **余额页面**：查看余额、充值、消费明细
- **项目设置**：项目名称、描述、成员管理

### 3. 用户体验
- **简洁明了**：个人项目 vs 团队项目
- **计费透明**：明确显示计费模式
- **权限清晰**：角色权限一目了然

---

## 🛠️ 实施计划

### Phase 1: 数据库层（Week 1-2）
- [ ] 创建 3 张新表：team, team_member, user_balance
- [ ] 扩展 Project 表（添加 team_id, is_default）
- [ ] 扩展 User 表（添加 tier, max_teams 等）
- [ ] 创建数据库 Migration
- [ ] 编写实体类和 Repository

### Phase 2: 服务层（Week 3-4）
- [ ] TeamService（团队 CRUD、成员管理、权限检查）
- [ ] TeamMemberService（成员邀请、角色管理）
- [ ] BalanceService（余额管理、充值、扣费）
- [ ] ProjectService 扩展（支持团队项目）

### Phase 3: API 层（Week 5-6）
- [ ] TeamController（团队 API）
- [ ] TeamMemberController（成员管理 API）
- [ ] BalanceController（余额充值、消费 API）
- [ ] ProjectController 扩展（支持团队项目切换）

### Phase 4: 前端实现（Week 7-8）
- [ ] ProjectSwitcher 组件（替代 WorkspaceSwitcher）
- [ ] CreateTeamDialog 组件
- [ ] TeamManagementPage 团队管理页面
- [ ] BalancePage 余额页面
- [ ] 适配所有现有页面使用 Project

### Phase 5: 计费集成（Week 9-10）
- [ ] 工作流执行计费
- [ ] AI Token 计量
- [ ] 实时扣费逻辑
- [ ] 消费明细追踪

---

## 📊 技术优势

### ✅ 保留现有优势
- **成熟架构**：n8n 的 Project 系统已经过充分测试
- **完整权限**：ProjectRelation + SharedWorkflow 权限系统
- **代码稳定**：不破坏现有 889+ 处引用

### ✅ 新增功能
- **团队管理**：完整的团队创建、成员管理
- **灵活计费**：创建者付费 vs 使用者付费
- **租户隔离**：每个用户独立的钱包和余额
- **扩展性强**：支持未来企业功能

### ✅ 开发效率
- **改动最小**：只新增必要的代码
- **易于测试**：可以分阶段验证功能
- **风险可控**：现有功能不受影响

---

## 🎯 MVP 功能范围

### ✅ 包含功能
1. **用户注册**：自动创建个人项目和用户余额
2. **团队创建**：支持创建团队，设置计费模式
3. **成员管理**：邀请成员，分配角色
4. **项目切换**：在个人项目和团队项目间切换
5. **基础计费**：简单的余额管理和扣费

### ❌ 暂不包含
1. **复杂计费**：按资源类型差异化定价
2. **企业功能**：SSO、LDAP、企业权限
3. **高级统计**：详细的使用报表
4. **API 限流**：基于用户的 API 调用限制

---

## 🚀 部署策略

### 1. 数据库迁移
```bash
# 创建 Migration
pnpm migration:generate AddMultiTenantTables

# 执行迁移
pnpm migration:run
```

### 2. 现有数据处理
- **无需迁移**：基于干净的 n8n 上游开始
- **自动创建**：新用户注册时自动创建默认个人项目和余额

### 3. 兼容性保证
- **向后兼容**：现有用户不受影响
- **渐进式升级**：可以逐步启用新功能

---

## 💡 风险控制

### 🛡️ 技术风险
- **数据库冲突**：新增表不影响现有表
- **性能影响**：添加必要的索引保证查询性能
- **权限混乱**：基于现有 Project 权限系统扩展

### 🛡️ 业务风险
- **功能缺失**：保留所有现有功能
- **用户体验**：新功能不破坏现有操作流程
- **数据安全**：严格的权限验证和数据隔离

---

## 📈 预期收益

### 🎯 用户价值
- **团队协作**：支持多人协作开发
- **费用透明**：清晰的计费模式
- **权限管理**：灵活的团队权限控制

### 🎯 商业价值
- **收入增长**：按量计费模式
- **用户增长**：团队协作功能吸引企业用户
- **产品竞争力**：优于原生 n8n 的多租户能力

### 🎯 技术价值
- **架构���晰**：租户隔离，易于维护
- **扩展性强**：支持未来功能扩展
- **稳定可靠**：基于成熟的 Project 架构

---

**文档版本：** v2.0
**更新时间：** 2025-10-29
**负责人：** 老王
**预计工期：** 8-10 周
**风险评估：** 低（基于现有架构，改动最小）