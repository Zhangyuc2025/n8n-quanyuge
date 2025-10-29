# n8n 多租户改造方案 v2.0 - 基于 Project 架构扩展

> **核心理念：基于 n8n 现有 Project 架构扩展，添加 Team 计费层级**
> **改造策略：最小改动，最大化兼容，快速实现 MVP**
> **预计工期：10-11周**（含完整计费系统）
> **最后更新：2025-10-29** - 补充完整计费系统设计

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
- **完整计费系统**⭐：补充了用户余额、消费记录、充值管理等核心功能
- **快速实施**：预计 10-11 周完成 MVP（包含完整计费）

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

### 1. 新增表（6 张）

> **说明：** Phase 1-2 实现团队管理（表1-2），Phase 5 实现计费系统（表3-6）

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

#### 1.3 用户余额表 (`user_balance`) - Phase 5

```sql
CREATE TABLE user_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(user_id),
  CONSTRAINT chk_user_balance_positive CHECK (balance >= 0)
);

CREATE INDEX idx_user_balance_user ON user_balance(user_id);
```

#### 1.4 消费记录表 (`usage_record`) - Phase 5

```sql
CREATE TABLE usage_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 用户信息
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  billing_user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,  -- 实际付费的用户

  -- 资源信息
  resource_type VARCHAR(50) NOT NULL,  -- 'workflow_execution' | 'ai_token' | 'storage'
  resource_id UUID,                    -- execution_id, workflow_id 等

  -- 计费信息
  amount DECIMAL(10,4) NOT NULL,       -- 消费金额
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  quantity DECIMAL(10,2),              -- 使用量（如 AI tokens 数量）
  unit_price DECIMAL(10,4),            -- 单价

  -- 元数据
  metadata JSONB,                      -- 额外信息（如 AI 模型名称、token 详情等）
  description TEXT,

  -- 时间
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_usage_amount_positive CHECK (amount >= 0)
);

-- 索引
CREATE INDEX idx_usage_record_user ON usage_record(user_id, created_at DESC);
CREATE INDEX idx_usage_record_billing_user ON usage_record(billing_user_id, created_at DESC);
CREATE INDEX idx_usage_record_resource ON usage_record(resource_type, resource_id);
CREATE INDEX idx_usage_record_created_at ON usage_record(created_at DESC);  -- 用于分区和清理
```

#### 1.5 充值记录表 (`recharge_record`) - Phase 5

```sql
CREATE TABLE recharge_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 用户信息
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

  -- 充值信息
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',

  -- 支付信息
  payment_method VARCHAR(50),          -- 'alipay' | 'wechat' | 'stripe' | 'manual'
  transaction_id VARCHAR(255),         -- 第三方支付流水号
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending' | 'completed' | 'failed' | 'refunded'

  -- 元数据
  metadata JSONB,
  notes TEXT,

  -- 时间
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,

  CONSTRAINT chk_recharge_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_recharge_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
);

-- 索引
CREATE INDEX idx_recharge_record_user ON recharge_record(user_id, created_at DESC);
CREATE INDEX idx_recharge_record_status ON recharge_record(status);
CREATE INDEX idx_recharge_record_transaction ON recharge_record(transaction_id);
```

#### 1.6 团队邀请表 (`team_invitation`) - 可选，后续迭代

```sql
CREATE TABLE team_invitation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 团队和邀请人
  team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

  -- 被邀请人
  invitee_email VARCHAR(255) NOT NULL,
  invitee_id UUID REFERENCES "user"(id) ON DELETE SET NULL,  -- 接受邀请后填充

  -- 邀请信息
  role VARCHAR(50) NOT NULL DEFAULT 'team:member',
  token VARCHAR(255) NOT NULL UNIQUE,  -- 邀请令牌
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'rejected' | 'expired'

  -- 时间
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,

  CONSTRAINT chk_invitation_role CHECK (role IN ('team:admin', 'team:member', 'team:viewer')),
  CONSTRAINT chk_invitation_status CHECK (status IN ('pending', 'accepted', 'rejected', 'expired'))
);

-- 索引
CREATE INDEX idx_team_invitation_team ON team_invitation(team_id);
CREATE INDEX idx_team_invitation_email ON team_invitation(invitee_email);
CREATE INDEX idx_team_invitation_token ON team_invitation(token);
CREATE INDEX idx_team_invitation_expires ON team_invitation(expires_at) WHERE status = 'pending';
```

### 2. 修改现有表（3 张）

#### 2.1 扩展 Project 表 - Phase 1
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

#### 2.2 扩展 User 表 - Phase 1
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

#### 2.3 扩展 Execution 表 - Phase 5
```sql
-- 添加计费用户追踪字段
ALTER TABLE "execution_entity"
  ADD COLUMN billing_user_id UUID REFERENCES "user"(id) ON DELETE SET NULL;

-- 添加索引（用于查询用户的消费记录）
CREATE INDEX idx_execution_billing_user ON execution_entity(billing_user_id, finished_at DESC);

-- billing_user_id 说明：
-- 1. owner_pays 模式：billing_user_id = team.owner_id
-- 2. member_pays 模式：billing_user_id = execution.user_id
-- 3. 个人项目：billing_user_id = execution.user_id
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

### Phase 3.5: 注册登录改造（Week 6.5）⭐ 新增

> **重要：** 多租户SaaS必须调整注册登录流程，在Phase 4前端开发之前完成

#### 3.5.1 后端改造（1-2天）
- [ ] **扩展 UserService.registerTenant()**
  - 自动创建用户账号（设置 tier/tenantStatus 等字段）
  - 自动创建默认个人工作区（Personal Project，isDefault=true）
  - 自动创建 ProjectRelation（用户是 admin）
  - 记录注册事件到 EventService
  - **简化版：** firstName = username，lastName = ''（开发期间）

- [ ] **扩展 AuthController 登录响应**
  - POST /auth/register - 简化的注册API（邮箱+用户名+密码）
  - POST /auth/login - 返回用户信息+工作区列表
  - 返回数据结构：
    ```typescript
    {
      token: string,
      user: {
        id: string,
        email: string,
        username: string,
        tier: 'free' | 'pro' | 'enterprise',
        tenantStatus: 'active' | 'suspended'
      },
      workspaces: Array<{
        id: string,
        name: string,
        type: 'personal' | 'team',
        isDefault: boolean,
        teamId?: string,
        icon?: string
      }>,
      defaultWorkspace: string  // 默认工作区ID
    }
    ```

- [ ] **简化验证规则**（开发期间）
  - 邮箱：基本格式验证
  - 用户名：至少2个字符
  - 密码：至少6位（无复杂度要求）
  - 暂不做邮箱验证

#### 3.5.2 前端改造（2-3天）
- [ ] **侧边栏首页入口**
  - 在 MainSidebar 添加"首页"菜单项
  - 未登录用户可访问首页
  - 首页展示产品介绍、功能特性、价格方案

- [ ] **AuthDialog 组件（登录/注册弹窗）**
  - Tab切换：密码登录 / 账号注册
  - 点击侧边栏功能按钮时弹出（未登录用户）
  - 弹窗样式参考 DeepSeek（清爽简洁）

- [ ] **LoginForm 组件（登录表单）**
  - 邮箱或用户名输入
  - 密码输入（显示/隐藏切换）
  - 记住我 checkbox
  - 忘记密码占位符（disabled）

- [ ] **RegisterForm 组件（注册表单）**
  - 邮箱输入
  - 用户名输入
  - 密码输入（至少6位）
  - 提示：未注册的邮箱将自动创建账号

- [ ] **第三方登录占位符**
  - 微信登录按钮（disabled，显示"即将开放"）
  - 手机验证码登录按钮（disabled，显示"即将开放"）
  - 预留扩展接口

- [ ] **用户协议和隐私��策**
  - 底部显示协议链接
  - 注册登录即表示同意

- [ ] **AuthStore（认证状态管理）**
  - login() / register() 方法
  - 保存 token 和用户信息到 localStorage
  - 保存工作区列表到 Pinia Store
  - 自动选择默认工作区

- [ ] **路由守卫调整**
  - 未登录访问功能页面 → 弹出登录弹窗
  - 登录成功后跳转到工作台或返回原页面

#### 3.5.3 测试验证（0.5天）
- [ ] 新用户注册 → 自动创建默认工作区
- [ ] 登录后 → 正确加载工作区列表
- [ ] 默认工作区 → 正确标记和选择
- [ ] 未登录访问功能 → 正确弹出登录弹窗
- [ ] 工作区切换 → 前端状态正确更新

**预计工期：** 3-4天
**依赖关系：** Phase 3 完成后开始，Phase 4 依赖此阶段

### Phase 4: 前端实现（Week 7-8）
- [ ] ProjectSwitcher 组件（替代 WorkspaceSwitcher）
- [ ] CreateTeamDialog 组件
- [ ] TeamManagementPage 团队管理页面
- [ ] BalancePage 余额页面
- [ ] 适配所有现有页面使用 Project

### Phase 5: 计费系统（Week 9-11）⭐ 扩展

> **重要：** 计费系统是多租户的核心价值，必须完整实现！

#### 5.1 数据库层（Week 9）
- [ ] 创建 `usage_record` 表（消费记录）
- [ ] 创建 `recharge_record` 表（充值记录）
- [ ] 扩展 `execution_entity` 表（添加 `billing_user_id`）
- [ ] 编写 Migration 脚本

#### 5.2 服务层（Week 9-10）
- [ ] **UserBalanceService**（用户余额管理）
  - `getBalance(userId)` - 获取用户余额
  - `addBalance(userId, amount)` - 增加余额（充值）
  - `deductBalance(userId, amount)` - 扣减余额（消费）
  - `hasSufficientBalance(userId, amount)` - 检查余额是否充足
  - 使用事务确保余额操作的原子性

- [ ] **UsageRecordService**（消费记录管理）
  - `createRecord(data)` - 创建消费记录
  - `getUserRecords(userId, filters)` - 查询用户消费记录
  - `getTeamRecords(teamId, filters)` - 查询团队消费记录
  - 支持分页和时间范围筛选

- [ ] **RechargeService**（充值管理）
  - `createRecharge(userId, amount, paymentMethod)` - 创建充值记录
  - `completeRecharge(rechargeId)` - 完成充值（更新余额）
  - `failRecharge(rechargeId, reason)` - 充值失败处理
  - 支持支付宝、微信、Stripe等支付渠道

- [ ] **BillingService**（计费逻辑核心）
  - `calculateExecutionCost(execution)` - 计算工作流执行费用
  - `calculateAiTokenCost(tokens, model)` - 计算AI Token费用
  - `getBillingUser(execution)` - 确定付费用户（owner_pays/member_pays）
  - `chargeExecution(execution)` - 执行计费（扣费+记录）
  - 集成余额检查和扣费逻辑

#### 5.3 业务集成（Week 10）
- [ ] **工作流执行计费**
  - 在 `WorkflowRunner` 执行前检查余额
  - 执行完成后自动扣费
  - 余额不足时中断执行并提示用户

- [ ] **AI Token计量**
  - 集成 AI 节点的 token 统计
  - 按模型计算费用（GPT-4、Claude等不同单价）
  - 实时扣费和记录

- [ ] **计费用户确定逻辑**
  - 获取 execution.projectId → project.teamId
  - 如果是团队项目，读取 team.billing_mode
  - owner_pays：从 team.ownerId 扣费
  - member_pays：从 execution.userId 扣费
  - 个人项目：从 execution.userId 扣费

#### 5.4 API层（Week 10）
- [ ] **BalanceController**
  - `GET /balance` - 获取当前用户余额
  - `POST /balance/recharge` - 创建充值订单
  - `GET /balance/records` - 查询充值记录

- [ ] **UsageController**
  - `GET /usage/records` - 查询消费记录
  - `GET /usage/stats` - 消费统计（按天/周/月）
  - `GET /usage/team/:teamId/records` - 查询团队消费

#### 5.5 前端实现（Week 11）
- [ ] **BalanceDisplay 组件**（顶部导航栏余额显示）
  - 实时显示用户余额
  - 余额不足时高亮提示
  - 点击跳转充值页面

- [ ] **RechargeDialog 组件**（充值对话框）
  - 选择充值金额（预设+自定义）
  - 选择支付方式（支付宝/微信/Stripe）
  - 支付二维码展示

- [ ] **UsageRecordsPage 页面**（消费记录查询）
  - 消费记录列表（时间、类型、金额）
  - 筛选和分页
  - 导出功能（CSV）

- [ ] **余额不足提示**
  - 工作流执行前检查余额
  - 余额不足时弹窗提示充值
  - 引导用户到充值页面

#### 5.6 测试验证（Week 11）
- [ ] 单元测试（服务层）
- [ ] 集成测试（计费流程）
- [ ] 端到端测试（用户充值→执行工作流→扣费）

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

## 🎯 MVP 功能范围（调整后）

### ✅ 包含功能（核心价值）
1. **用户管理**
   - 用户注册自动创建个人项目
   - 用户注册自动创建余额账户（初始余额可配置）
   - 用户tier管理（free/pro/enterprise）

2. **团队管理**
   - 创建团队，设置计费模式（owner_pays/member_pays）
   - 成员管理（添加、移除、角色变更）
   - 团队项目创建和管理

3. **项目切换**
   - ProjectSwitcher 组件（个人/团队项目切换）
   - 项目列表展示
   - 默认项目设置

4. **完整计费系统**⭐ **新增**
   - 用户余额管理（查询、充值、扣费）
   - 工作流执行计费（按执行次数或时长）
   - AI Token计量和扣费（按模型差异化定价）
   - 消费记录查询和统计
   - 充值记录管理
   - 余额不足提示和中断机制
   - 前端余额显示和充值入口

5. **计费模式支持**
   - 个人项目：用户自己付费
   - 团队项目（owner_pays）：创建者统一付费
   - 团队项目（member_pays）：使用者各自付费

### ❌ 暂不包含（后续迭代）
1. **团队邀请系统**
   - 邀请链接生成和管理
   - 邀请过期机制
   - 邮件通知
   - ⚠️ Phase 1-5 暂时通过直接添加成员实现

2. **高级计费功能**
   - 按资源类型差异化定价配置
   - 定价策略表（pricing_config）
   - 套餐和订阅管理

3. **企业功能**
   - SSO、LDAP集成
   - 企业权限管理
   - 审计日志

4. **高级统计**
   - 详细的使用报表
   - API调用限流
   - 资源使用趋势分析

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

**文档版本：** v2.2
**更新时间：** 2025-10-29
**负责人：** 老王
**预计工期：** 10-11 周
**风险评估：** 低（基于现有架构，改动最小）

---

## 📝 更新日志

### v2.2 - 2025-10-29：新增注册登录改造（Phase 3.5）

**背景：** 多租户SaaS平台必须调整注册登录流程，确保每个新用户自动成为一个租户并拥有默认工作区

**新增内容：**

1. **Phase 3.5：注册登录改造（Week 6.5，3-4天）**
   - 后端：扩展 UserService.registerTenant()，自动创建默认工作区
   - 后端：扩展 AuthController，登录响应返回工作区列表
   - 前端：侧边栏添加首页入口（产品介绍、功能特性、价格方案）
   - 前端：AuthDialog 弹窗组件（Tab切换：密码登录/账号注册）
   - 前端：LoginForm / RegisterForm 组件（简化验证规则）
   - 前端：第三方登录占位符（微信/手机验证码，disabled）
   - 前端：AuthStore / WorkspaceStore（认证和工作区状态管理）
   - 前端：路由守卫调整（未登录弹窗，不跳转页面）

2. **设计理念：**
   - ✅ 侧边栏首页入口（不是独立公开页面）
   - ✅ 弹窗式登录/注册（参考DeepSeek设计）
   - ✅ 简化验证规则（开发期间：邮箱格式+用户名2字符+密码6位）
   - ✅ 占位符设计（为微信/手机登录预留扩展空间）
   - ✅ 多租户核心：User = Tenant，注册即创建独立工作区

3. **关键决策：**
   - 注册时自动创建默认工作区（isDefault=true）
   - 登录响应包含工作区列表（个人+团队）
   - 前端自动选择默认工作区
   - 未登录访问功能时弹出登录弹窗（不跳转）

4. **依赖关系：**
   - Phase 3.5 必须在 Phase 4 之前完成
   - Phase 4（前端工作区组件）依赖 Phase 3.5 的工作区数据结构

**对整体方案的影响：**
- ✅ 确保多租户架构的完整性（每个用户=独立租户）
- ✅ 为 Phase 4 前端开发提供必需的数据结构
- ✅ 提升用户体验（现代SaaS产品标准）
- ⚠️ 工期不变（3-4天插入到 Week 6.5，不影响总工期）

---

### v2.1 - 2025-10-29：补充完整计费系统

**背景：** 对比旧版方案后发现新版v2.0缺少完整的计费系统，这是多租户SaaS的核心价值！

**新增内容：**

1. **数据库设计扩展**
   - 新增 `usage_record` 表（消费记录）
   - 新增 `recharge_record` 表（充值记录）
   - 新增 `team_invitation` 表（团队邀请，可选）
   - 扩展 `execution_entity` 表（添加 `billing_user_id` 字段）

2. **Phase 5 大幅扩展**（从简单的4个任务扩展为6个子阶段）
   - 5.1 数据库层：创建计费相关表
   - 5.2 服务层：UserBalanceService, UsageRecordService, RechargeService, BillingService
   - 5.3 业务集成：工作流执行计费、AI Token计量、计费用户确定逻辑
   - 5.4 API层：BalanceController, UsageController
   - 5.5 前端实现：BalanceDisplay, RechargeDialog, UsageRecordsPage, 余额不足提示
   - 5.6 测试验证：单元测试、集成测试、端到端测试

3. **MVP功能范围调整**
   - ✅ 新增：完整计费系统（余额管理、充值、消费记录、余额检查）
   - ✅ 新增：前端余额显示和充值入口
   - ❌ 暂缓：团队邀请系统（可后续迭代）
   - ❌ 暂缓：定价配置表（初期硬编码）

4. **工期调整**
   - 从 8-10周 调整为 **10-11周**（增加1周用于完整计费系统）

**核心价值：**
- ✅ 保持了v2.0基于Project扩展的架构优势
- ✅ 补齐了SaaS多租户的核心计费功能
- ✅ 确保方案与实际代码开发保持一致
- ✅ MVP交付时具备完整的商业价值

**对比旧版方案：**
- ✅ 架构更简洁（无需废弃Project）
- ✅ 兼容性更好（不破坏现有功能）
- ✅ 计费功能完整（与旧版相当）
- ✅ 总工期更短（10-11周 vs 14-16周）

---

**维护者：** 老王
**文档版本：** v2.1

