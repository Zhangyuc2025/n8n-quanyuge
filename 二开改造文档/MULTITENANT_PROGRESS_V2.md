# n8n 多租户改造进度跟踪 - v2.0 版本

> **更新时间:** 2025-10-29
> **当前状态:** ✅ Phase 3.5 完成 - 注册登录改造完成 + Team API测试（14/17通过）
> **当前方案:** 基于 Project 架构扩展（最小改动策略）+ 完整计费系统
> **预计总工期:** 10-11 周（已调整，含完整计费）
> **当前版本:** n8n@1.117.0 (满血版)
> **下一步:** Phase 4 - 前端组件实现（工作区切换、团队管理）
> **方案版本:** v2.3（2025-10-29完成Phase 3.5，发现suspend/activate bug）

---

## 📝 文档更新规范

### ✅ 必须更新的部分（动态信息）

每次完成一个阶段或重要里程碑时，必须更新：

1. **文档头部信息**（第3-6行）
   - `更新时间` - 更新为当前日期
   - `当前状态` - 更新为最新完成的阶段
   - `下一步` - 明确下一步要做的工作

2. **整体进度概览表格**
   - 将已完成阶段的"状态"改为 ✅ 完成
   - 填写"完成时间"和"代码量"
   - 将正在进行的阶段标记为 ⏳ 进行中

3. **已完成工作章节**
   - 添加新完成阶段的简要描述
   - 列出关键文件和核心功能
   - 保持精简，避免过度细节

### ❌ 禁止操作
1. **禁止简单追加** - 不要在文档末尾无限追加新内容
2. **禁止过度细节** - 不要粘贴大段代码示例
3. **禁止重复章节** - 应该在"已完成工作"章节中更新

### 📏 保持简洁的原则
- **一个阶段 ≤ 10行**：每个已完成阶段的描述不超过10行
- **关键信息优先**：只保留文件路径、核心功能、代码量
- **使用表格呈现**：进度、统计数据用表格，清晰易读

---

## 📊 整体进度概览

| 阶段 | 任务 | 状态 | 完成时间 | 代码量 |
|------|------|------|----------|--------|
| **准备阶段** | 备份和切换到干净上游 | ✅ 完成 | 2025-10-29 | - |
| **License 解除** | 满血版功能解锁 | ✅ 完成 | 2025-10-29 | ~300行 |
| **License 架构优化** | 反向逻辑配置化（DRY） | ✅ 完成 | 2025-10-29 | ~40行 |
| **构建环境修复** | 依赖冲突和TS类型错误 | ✅ 完成 | 2025-10-29 | ~20行 |
| **Phase 1** | 数据库层改造（团队管理） | ✅ 完成 | 2025-10-29 | ~630行 |
| **Phase 2** | 服务层实现（团队服务） | ✅ 完成 | 2025-10-29 | ~704行 |
| **Phase 3** | API 层实现（团队API） | ✅ 完成 | 2025-10-29 | ~534行 |
| **Phase 3.5** | 注册登录改造 + API测试 ⭐ | ✅ 完成 | 2025-10-29 | ~180行 |
| **Phase 4** | 前端组件实现 | 📋 待开始 | - | - |
| **Phase 5** | 完整计费系统 ⭐扩展 | 📋 待开始 | - | - |

---

## 🎯 已完成工作

### ✅ 准备阶段：方案设计和上游切换（2025-10-29）

**完成的工作：**
- 分析了之前 Workspace 方案的架构冲突问题
- 制定了基于 Project 架构扩展的新方案（v2.0）
- 创建了新的技术方案文档 `MULTITENANT_PLAN_V2.md`
- 创建了新的进度跟踪文档 `MULTITENANT_PROGRESS_V2.md`
- 准备切换到干净的上游版本重新开始

**关键决策：**
- ✅ 采用最小改动策略：基于现有 Project 架构扩展
- ✅ 保留 SharedWorkflow/SharedCredentials 机制
- ✅ 新增 Team 层级处理团队管理和计费
- ✅ 扩展 Project 表添加 teamId 字段

**核心设计变更：**
```
之前方案（有问题）：
User → Workspace → 新架构
同时保留 Project → 旧架构
→ 两套系统并行，功能冲突

新方案（正确）：
User → Project → 扩展现有架构
    └── Team → 新增团队管理层级
→ 单一架构，最小改动
```

---

### ✅ Phase 1：数据库层改造（2025-10-29）

**核心文件：** `packages/@n8n/db/src/migrations/mysqldb/1761701813576-AddMultiTenantTables.ts`

**完成内容：**
- ✅ 创建 Team 表（团队管理）和 TeamMember 表（成员关系）
- ✅ 扩展 User 表（tier, maxTeams, maxStorageMb, tenantStatus）
- ✅ 扩展 Project 表（teamId, isDefault）
- ✅ 创建所有索引和外键约束（4个外键，9个索引）

**关键Bug修复：**
1. **索引表引用错误**：修复 `project_relation` → `project` (line 66)
2. **排序规则冲突**：移除显式 `COLLATE utf8mb4_unicode_ci`，继承数据库默认 `utf8mb4_0900_ai_ci`

**数据库验证结果：** 2个新表 + 6个扩展字段 + 4个外键 + 9个索引 = 全部创建成功 ✅

---

### ✅ 方案调整：补充完整计费系统（2025-10-29）

**调整原因：**
- 对比旧版 develop 分支的多租户方案，发现新版 v2.0 缺少完整的计费系统
- 计费系统是 SaaS 多租户的核心价值，必须在 MVP 中实现

**新增数据库表（Phase 5 待实施）：**
- ⏳ `usage_record` - 消费记录表（tracking 用户消费）
- ⏳ `recharge_record` - 充值记录表（管理用户充值）
- ⏳ `team_invitation` - 团队邀请表（可选，后续迭代）
- ⏳ `execution_entity.billing_user_id` - 计费用户追踪字段

**Phase 5 扩展内容：**
1. **服务层**：UserBalanceService, UsageRecordService, RechargeService, BillingService
2. **API层**：BalanceController, UsageController
3. **前端**：BalanceDisplay, RechargeDialog, UsageRecordsPage
4. **业务集成**：工作流执行计费、AI Token 计量、余额检查

**工期调整：**
- 从 8-10周 调整为 **10-11周**（增加1周完成计费系统）

**核心价值：**
- ✅ 保持 v2.0 基于 Project 的架构优势
- ✅ 补齐 SaaS 核心的计费功能
- ✅ 总工期仍比旧版短（10-11周 vs 14-16周）

**详细设计：** 参见 `MULTITENANT_PLAN_V2.md` v2.1 更新

---

### ✅ License 解除：满血版功能解锁（2025-10-29）

**核心文件：** `packages/cli/src/license/self-hosted-license-provider.ts`（新建）

**实施内容：**
- ✅ 创建 `SelfHostedLicenseProvider` 类，实现完整 LicenseProvider 接口
- ✅ 修改 `License` 类，在代码中硬编码启用满血模式（`if (true)`）
- ✅ 移除 `@n8n_io/license-sdk` 依赖，减少 ~52个间接依赖
- ✅ 定义本地类型替代 SDK 类型，保持接口兼容性

**解锁功能：**
- ✅ 所有企业功能：LDAP/SAML、Variables、Workflow History、AI Assistant 等
- ✅ AI学分：设置为 999999（无限制）
- ✅ 配额限制：用户/触发器/团队项目全部无限制
- ✅ 计费模式：owner_pays/member_pays 灵活支持

**技术实现：**
- 采用方案4（Mock LicenseProvider）+ 方案2（移除SDK）组合
- 完全消除 TypeScript 编译错误
- 保持与上游 n8n 完全兼容

---

### ✅ License 架构优化：反向逻辑配置化（2025-10-29）

**核心文件：**
- `packages/@n8n/constants/src/index.ts` - 新增配置和工具函数
- `packages/cli/src/license.ts` - 使用工具函数
- `packages/cli/src/license/self-hosted-license-provider.ts` - 使用工具函数

**完成内容：**
- ✅ 创建 `REVERSE_LOGIC_FEATURES` 配置列表（SHOW_NON_PROD_BANNER、API_DISABLED）
- ✅ 实现 `isReverseLicenseFeature()` 工具函数，统一判断反向逻辑功能
- ✅ 重构 `License.isLicensed()` 和 `SelfHostedLicenseProvider.isLicensed()`
- ✅ 消除重复代码，符合 DRY、KISS、开闭原则

**架构优化效果：**
- 代码行数：从 14行 减少到 4行（减少 71%）
- 维护成本：新增反向逻辑功能只需修改配置（单一数据源）
- 可读性：逻辑清晰，易于理解和维护

**验证结果：**
- ✅ `showNonProdBanner: false` - Banner不显示（满血版）
- ✅ `planName: "Self-Hosted Enterprise"` - 企业版标识
- ✅ 编译零错误，开发服务器正常启动

---

### ✅ 开发环境优化：智能启动和配置（2025-10-29）

**核心文件：** `scripts/start-dev.sh`（新建）

**完成内容：**
- ✅ 创建智能启动脚本，自动检测和关闭端口冲突
- ✅ 配置平台级加密密钥：`EIRktOcP0igRhy/MYGZJKv1anjVI6Er4oWGtxfX06hE=`
- ✅ 添加开发环境别名：`sasa-dev`（智能启动）和 `n8n-clean`（清理进程）
- ✅ 优化 TypeScript 配置，消除未使用变量警告

**用户体验：**
- ✅ 一键启动：自动处理端口冲突和环境检查
- ✅ 彩色日志：清晰的状态反馈和错误提示
- ✅ 智能清理：优雅关闭 + 强制终止的双重策略

---

### ✅ 构建环境修复：依赖冲突和TypeScript类型错误（2025-10-29）

**修复文件：**
- `package.json` - 依赖版本锁定
- `packages/@n8n/backend-common/src/logging/logger.ts` - Winston类型修复
- `packages/@n8n/node-cli/src/configs/eslint.ts` - ESLint类型注解
- `packages/cli/tsconfig.build.json` - 添加skipLibCheck
- `packages/cli/src/modules/chat-hub/*.repository.ts` - TypeORM类型断言

**解决的问题：**
1. **依赖版本冲突**：ts-essentials 10.0.2 vs 10.1.1 类型不兼容
2. **Winston日志类型错误**：TransformableInfo的message类型从string改为unknown
3. **ESLint配置类型推断失败**：需要显式ConfigArray类型注解
4. **TypeORM深度类型实例化**：TS2589错误，QueryDeepPartialEntity递归类型超出编译器限制

**技术方案：**
- ✅ 锁定依赖版本：通过pnpm overrides固定关键依赖（ts-essentials, @types/psl等）
- ✅ 类型安全修复：winston logger使用String()转换，确保类型安全
- ✅ 最小化类型断言：仅在TypeORM insert()调用处使用`as any`绕过编译器限制
- ✅ 运行时行为不变：所有修复仅影响编译时，运行时完全一致

**构建验证：** ✅ 41/41 任务成功，零错误，完整构建通过

---

## 🔧 技术要点

### 核心设计原则
1. **最小改动原则**：基于 n8n 现有成熟架构，只添加必要的功能
2. **完全兼容原则**：不破坏现有功能，易于上游升级
3. **租户隔离原则**：每个用户独立的钱包和余额管理
4. **团队协作原则**：支持灵活的团队创建和成员管理

### 架构对比

| 特性 | 旧 n8n 架构 | 新多租户架构 |
|------|-------------|-------------|
| **工作区** | Project（个人/团队） | Project（扩展团队功能） |
| **权限管理** | ProjectRelation | ProjectRelation + TeamMember |
| **工作流共享** | SharedWorkflow | 保持不变 |
| **凭证共享** | SharedCredentials | 保持不变 |
| **计费系统** | ❌ 无 | ✅ 用户余额 + 团队计费 |
| **团队管理** | ❌ 基础 | ✅ 完整团队管理 |

### 新增实体关系
```
User (用户/租户)
├── ProjectRelation (项目关系)
├── UserBalance (用户余额) 🆕
└── Team (团队 - 如果创建了团队)
    ├── TeamMember (团队成员) 🆕
    └── Project (团队项目)
```

---

## 🚀 下一步任务

### ✅ Phase 1: 数据库层改造（Week 1-2）- 已完成

**任务清单：**
1. **创建新表实体**
   - [x] Team 实体（团队表）✅ 完整实现（68行）
   - [x] TeamMember 实体（团队成员表）✅ 完整实现（45行）
   - [ ] UserBalance 实体（用户余额表）⏸️ 延后到 Phase 5

2. **扩展现有实体**
   - [x] 扩展 Project 实体（添加 teamId, isDefault 字段）
   - [x] 扩展 User 实体（添加 tier, maxTeams, tenantStatus 字段）

3. **创建 Repository 层**
   - [x] TeamRepository（团队数据访问）✅ 完整实现（253行）
   - [x] TeamMemberRepository（成员管理数据访问）✅ 完整实现（376行）
   - [x] Repository 导出（index.ts）✅ 已添加导出
   - [ ] UserBalanceRepository（余额管理数据访问）⏸️ 延后到 Phase 5

4. **创建数据库 Migration**
   - [x] 多租户表创建 Migration ✅ AddMultiTenantTables1761701813576（164行）
   - [x] 现有表扩展 Migration ✅ 包含在同一个 Migration 中

---

### ✅ Phase 2: 服务层实现（2025-10-29）

**核心文件：**
- `packages/cli/src/services/team.service.ts` - 团队业务逻辑（344行）
- `packages/cli/src/services/team-member.service.ts` - 成员管理逻辑（360行）

**完成内容：**
- ✅ TeamService 完整实现（13个方法）
  - 创建团队（createTeam）
  - 查询团队（getTeamById, getTeamBySlug, getUserTeams, getUserMemberTeams）
  - 更新团队（updateTeam）
  - 删除团队（deleteTeam, suspendTeam, activateTeam）
  - 权限验证（validateTeamOwnership）
  - 统计信息（hasReachedMemberLimit, getTeamStats）

- ✅ TeamMemberService 完整实现（12个方法）
  - 成员管理（addMember, addMembers, removeMember）
  - 角色管理（updateMemberRole, getUserRole）
  - 权限验证（isMember, hasRoleOrHigher, validateOperatorPermission）
  - 成员查询（getTeamMembers, getMemberStats）

**技术特点：**
- 完全符合 n8n Service 层代码规范
- 使用 @Service() 装饰器和依赖注入
- 完整的错误处理（NotFoundError, BadRequestError, UnexpectedError）
- EventService 集成，记录所有关键操作
- Logger 记录详细日志
- 业务逻辑验证完整（权限、配额、数据一致性）

---

### ✅ Phase 3: API 层实现（2025-10-29）

**核心文件：**
- `packages/@n8n/api-types/src/schemas/team.schema.ts` - 团队 Schema 定义（21行）
- `packages/@n8n/api-types/src/dto/team/` - 团队 DTO 类型（4个文件，~70行）
  - create-team.dto.ts - 创建团队DTO
  - update-team.dto.ts - 更新团队DTO
  - add-members-to-team.dto.ts - 添加成员DTO
  - update-member-role.dto.ts - 更新角色DTO
- `packages/@n8n/api-types/src/dto/index.ts` - DTO 导出（已添加4个团队DTO）
- `packages/cli/src/controllers/team.controller.ts` - 团队API控制器（236行）
- `packages/cli/src/controllers/team-member.controller.ts` - 成员API控制器（207行）
- `packages/cli/src/server.ts` - 路由注册（已添加导入）

**完成内容：**
- ✅ Team Schema 定义（8个schema）
  - teamNameSchema, teamSlugSchema, teamDescriptionSchema
  - teamIconSchema, teamBillingModeSchema, teamStatusSchema
  - teamMemberRoleSchema

- ✅ Team DTO 完整实现（4个DTO类）
  - CreateTeamDto - 创建团队（6个字段）
  - UpdateTeamDto - 更新团队（6个可选字段）
  - AddMembersToTeamDto, AddMemberToTeamDto - 添加成员
  - UpdateMemberRoleDto - 更新成员角色

- ✅ TeamController API端点（11个端点）
  - GET /teams - 获取用户团队
  - GET /teams/member - 获取成员团队
  - GET /teams/:id - 获取团队详情
  - GET /teams/:id/stats - 团队统计
  - GET /teams/slug/:slug - 根据slug获取
  - POST /teams - 创建团队
  - PATCH /teams/:id - 更新团队
  - DELETE /teams/:id - 删除团队
  - POST /teams/:id/suspend - 暂停团队
  - POST /teams/:id/activate - 激活团队

- ✅ TeamMemberController API端点（8个端点）
  - GET /teams/:teamId/members - 获取成员列表
  - GET /teams/:teamId/members/stats - 成员统计
  - GET /teams/:teamId/members/:userId/role - 获取角色
  - POST /teams/:teamId/members - 添加单个成员
  - POST /teams/:teamId/members/batch - 批量添加成员
  - PATCH /teams/:teamId/members/:userId/role - 更新角色
  - DELETE /teams/:teamId/members/:userId - 移除成员

- ✅ 路由注册（server.ts）
  - 添加 team.controller 和 team-member.controller 导入
  - 自动注册到 REST API 路由系统（/rest/teams）

**总计：** 19个API端点 = 11个团队管理端点 + 8个成员管理端点

**技术特点：**
- 完全符合 n8n API 层代码规范
- 使用 Zod + Zod-class 进行数据验证
- REST风格的API设计
- 完整的权限验证（通过 Service 层）
- EventService 集成，记录所有关键操作
- 统一的错误处理（NotFoundError, BadRequestError）

---

### ✅ Phase 3.5: 注册登录改造 + API测试（2025-10-29）

**核心文件：**
- `packages/@n8n/api-types/src/dto/auth/register-request.dto.ts` - 注册DTO（31行）
- `packages/cli/src/services/user.service.ts` - registerTenant方法（55行）
- `packages/cli/src/controllers/auth.controller.ts` - register端点（44行）
- `packages/cli/src/auth/methods/email.ts` - 双登录支持（58行）

**完成内容：**

1. **后端注册API实现**
   - ✅ 创建 RegisterRequestDto（email, password, username）
   - ✅ 扩展 UserService.registerTenant() 方法
     - 自动创建用户（tier='free', tenantStatus='active'）
     - 自动创建默认个人工作区（isDefault=true）
     - 自动创建ProjectRelation（用户是project:admin）
     - 自动登录（issueCookie）
   - ✅ 添加 AuthController.register() API端点（POST /rest/register）
   - ✅ 邮箱验证：基本格式检查（.minLength(3).email()）
   - ✅ 密码验证：至少6位（.minLength(6)）
   - ✅ 用户名验证：至少2个字符（.minLength(2)）

2. **登录逻辑改造**
   - ✅ 扩展 handleEmailLogin() 支持双登录
     - 使用 isEmail() 判断登录类型
     - 支持邮箱登录：查询 email 字段
     - 支持用户名登录：查询 firstName 字段
   - ✅ AuthController.login() 支持 emailOrLdapLoginId 参数
   - ✅ 中文用户名支持：测试通过（firstName字段支持Unicode）

3. **Team API完整测试**
   - ✅ **团队基础操作（7个端点）**
     - ✅ POST /rest/teams - 创建团队（移除GlobalScope权限限制）
     - ✅ GET /rest/teams - 获取用户拥有的团队
     - ✅ GET /rest/teams/:id - 获取团队详情
     - ✅ GET /rest/teams/:id/stats - 获取团队统计
     - ✅ GET /rest/teams/slug/:slug - 根据slug获取团队
     - ✅ GET /rest/teams/member - 获取用户参与的团队
     - ✅ PATCH /rest/teams/:id - 更新团队信息

   - ✅ **团队成员管理（7个端点）**
     - ✅ GET /rest/teams/:teamId/members - 获取团队成员列表
     - ✅ GET /rest/teams/:teamId/members/stats - 获取成员统计
     - ✅ POST /rest/teams/:teamId/members - 添加单个成员
     - ✅ POST /rest/teams/:teamId/members/batch - 批量添加成员（测试2个用户）
     - ✅ PATCH /rest/teams/:teamId/members/:userId/role - 更新成员角色（member→admin）
     - ✅ DELETE /rest/teams/:teamId/members/:userId - 移除成员
     - ✅ GET /rest/teams/:teamId/members/:userId/role - 获取用户角色

   - ⚠️ **发现的Bug（3个端点）**
     - ⚠️ POST /rest/teams/:id/suspend - 暂停后团队从列表消失
     - ⚠️ POST /rest/teams/:id/activate - 无法激活（找不到团队）
     - ❓ DELETE /rest/teams/:id - 未测试（因suspend问题）

**Bug分析：**
- **问题根因**：TeamRepository.findByOwner() 和 isOwner() 只查询 status='active' 的团队
- **尝试修复**：修改为 status: In(['active', 'suspended'])，但问题依然存在
- **后续工作**：需要深入调试Controller和Service的过滤逻辑，可能还有其他地方过滤了suspended状态

**测试结果统计：**
- ✅ 成功测试：14个API端点（82%通过率）
- ⚠️ 已知Bug：3个API端点（suspend/activate/delete相关）
- 📊 测试覆盖：4个测试用户，1个团队，成员角色变更，批量操作

**技术亮点：**
- 简化的注册流程：邮箱+用户名+密码，无需额外验证
- 灵活的登录方式：邮箱或用户名都可登录
- 自动化的租户初始化：注册即创建完整租户环境
- Unicode支持：中文用户名和团队名正常工作

---

### 📋 Phase 3.5: 注册登录改造（Week 6.5）⭐ 已完成 - 前端部分待实施

> **重要：** 多租户SaaS必须调整注册登录流程，确保新用户注册时自动创建默认工作区

**任务清单：**

#### 1. 后端改造（1-2天）✅ 已完成
- [x] **扩展 UserService.registerTenant() 方法**
  - [x] 创建用户时自动设置 tier='free', tenantStatus='active'
  - [x] 自动创建默认个人工作区（type='personal', isDefault=true）
  - [x] 自动创建 ProjectRelation（用户是 project:admin）
  - [x] 记录注册事件到 EventService
  - [x] 简化版：firstName = username, lastName = ''

- [x] **扩展 AuthController 登录响应**
  - [x] POST /rest/register - 简化注册API（邮箱+用户名+密码）
  - [x] POST /rest/login - 支持邮箱或用户名登录
  - [x] handleEmailLogin() - 实现双登录逻辑
  - [x] 邮箱验证：基本格式即可
  - [x] 用户名验证：至少2个字符
  - [x] 密码验证：至少6位（无复杂度要求）

#### 2. 前端改造（2-3天）
- [ ] **侧边栏首页入口**
  - [ ] 在 MainSidebar 组件添加"首页"菜单项
  - [ ] 创建 HomePage.vue 页面
  - [ ] 首页内容：产品介绍、功能特性、价格方案
  - [ ] 未登录用户可访问首页

- [ ] **AuthDialog 组件（登录/注册弹窗）**
  - [ ] 创建 packages/editor-ui/src/components/AuthDialog.vue
  - [ ] Tab切换实现（el-tabs: "密码登录" / "账号注册"）
  - [ ] 弹窗样式：参考 DeepSeek（清爽简洁）
  - [ ] 未登录点击功能按钮时自动弹出
  - [ ] 用户协议和隐私政策链接

- [ ] **LoginForm 组件（登录表单）**
  - [ ] 创建 packages/editor-ui/src/components/LoginForm.vue
  - [ ] 邮箱或用户名输入框
  - [ ] 密码输入框（显示/隐藏切换）
  - [ ] "记住我" checkbox
  - [ ] "忘记密码"链接占位符（disabled）
  - [ ] 登录按钮（loading状态）

- [ ] **RegisterForm 组件（注册表单）**
  - [ ] 创建 packages/editor-ui/src/components/RegisterForm.vue
  - [ ] 邮箱输入框（格式验证）
  - [ ] 用户名输入框（至少2个字符）
  - [ ] 密码输入框（至少6位，显示/隐藏切换）
  - [ ] 提示文案："未注册的邮箱将自动创建账号"
  - [ ] 注册按钮（loading状态）

- [ ] **第三方登录占位符**
  - [ ] 微信登录按钮（disabled，文案"即将开放"）
  - [ ] 手机验证码登录按钮（disabled，文案"即将开放"）
  - [ ] 预留扩展接口

- [ ] **AuthStore（认证状态管理）**
  - [ ] 创建或扩展 packages/editor-ui/src/stores/auth.store.ts
  - [ ] login() 方法：调用API并保存token、用户信息
  - [ ] register() 方法：调用注册API并自动登录
  - [ ] logout() 方法：清理token和用户信息
  - [ ] isLoggedIn 计算属性
  - [ ] currentUser 计算属性

- [ ] **WorkspaceStore（工作区状态管理）**
  - [ ] 创建 packages/editor-ui/src/stores/workspace.store.ts
  - [ ] setWorkspaces() - 保存工作区列表
  - [ ] setCurrentWorkspace() - 设置当前工作区
  - [ ] 从登录响应中加载工作区列表
  - [ ] 自动选择默认工作区

- [ ] **路由守卫调整**
  - [ ] 未登录访问功能页面 → 弹出登录弹窗（不跳转）
  - [ ] 登录成功后 → 跳转到工作台或返回原页面
  - [ ] 添加 '/' 首页路由（公开访问）

#### 3. 测试验证（0.5天）
- [ ] 新用户注册流程完整（创建用户+默认工作区+ProjectRelation）
- [ ] 登录响应包含工作区列表和默认工作区
- [ ] 前端正确保存和显示工作区数据
- [ ] 未登录访问功能页面时弹出登录弹窗
- [ ] 登录成功后正确跳转到工作台
- [ ] 工作区切换功能正常（为Phase 4做准备）

**预计工期：** 3-4天
**依赖关系：** Phase 3 完成后开始，Phase 4 依赖此阶段的工作区数据结构

---

### 📋 Phase 2: 服务层实现（Week 3-4）- 已完成

**任务清单：**
1. **TeamService 实现**
   - [x] 创建团队（createTeam）✅
   - [x] 获取团队信息（getTeam, getTeamById）✅
   - [x] 更新团队信息（updateTeam）✅
   - [x] 删除团队（deleteTeam, suspendTeam, activateTeam）✅
   - [x] 团队成员验证（validateTeamOwnership）✅
   - [x] 统计功能（hasReachedMemberLimit, getTeamStats）✅

2. **TeamMemberService 实现**
   - [x] 添加成员（addMember, addMembers）✅
   - [x] 移除成员（removeMember）✅
   - [x] 更新成员角色（updateMemberRole）✅
   - [x] 获取团队成员列表（getTeamMembers）✅
   - [x] 成员权限验证（isMember, hasRoleOrHigher）✅
   - [x] 统计功能（getMemberStats）✅

3. **单元测试**
   - [ ] TeamService 测试用例（可选，后续补充）
   - [ ] TeamMemberService 测试用例（可选，后续补充）

---

## 🛠️ 技术实施细节

### 实体设计要点

#### Team 实体
```typescript
@Entity()
export class Team {
  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, unique: true, nullable: true })
  slug: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: 'active' | 'suspended' | 'deleted';

  @Column({ type: 'varchar', length: 50, default: 'owner_pays' })
  billingMode: 'owner_pays' | 'member_pays';

  @Column({ default: 10 })
  maxMembers: number;

  // 关联关系
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  owner: User;

  @OneToMany(() => TeamMember, (member) => member.team)
  members: TeamMember[];

  @OneToMany(() => Project, (project) => project.team)
  projects: Project[];
}
```

#### 扩展 Project 实体
```typescript
// 在现有 Project 实体中添加：
@Column({ type: 'uuid', nullable: true })
teamId: string | null;

@Column({ type: 'boolean', default: false })
isDefault: boolean;

// 关联关系
@ManyToOne(() => Team, { nullable: true, onDelete: 'CASCADE' })
team: Team | null;

// 添加验证逻辑
@Check(`(type = 'personal' AND team_id IS NULL) OR (type = 'team' AND team_id IS NOT NULL)`)
private validateTeamConsistency() {}
```

### Repository 设计模式

基于现有 n8n Repository 模式：
- 使用 `@Service()` 装饰器
- 继承 `Repository<T>`
- 使用 `withTransaction` 支持事务
- 统一的错误处理和日志记录

### 计费系统设计

#### 用户余额管理
```typescript
@Service()
export class UserBalanceService {
  async getBalance(userId: string): Promise<Decimal>
  async addBalance(userId: string, amount: Decimal): Promise<void>
  async deductBalance(userId: string, amount: Decimal): Promise<void>
  async hasSufficientBalance(userId: string, amount: Decimal): Promise<boolean>
}
```

#### 计费模式集成
- **owner_pays**：从团队创建者余额扣费
- **member_pays**：从执行工作流的用户余额扣费

---

## 💡 关键技术决策

### 1. 架构选择理由
**为什么选择基于 Project 扩展？**
- ✅ n8n 的 Project 架构已经非常成熟
- ✅ 现有的权限系统（ProjectRelation + SharedWorkflow）功能完整
- ✅ 前端、后端、API 都围绕 Project 构建
- ✅ 避免了大规模重构的风险

### 2. 数据库设计原则
**为什么选择这种表结构？**
- ✅ 保留现有表结构，不破坏现有功能
- ✅ 新增表最小化，只添加必要的团队和计费功能
- ✅ 使用外键约束保证数据一致性
- ✅ 添加必要的索引保证查询性能

### 3. 前端设计思路
**为什么采用这种组件结构？**
- ✅ 基于现有 WorkspaceSwitcher 思路，改为 ProjectSwitcher
- ✅ 保持现有的用户操作习惯
- ✅ 渐进式添加新功能，不破坏现有体验

---

## 🔨 风险控制措施

### 技术风险控制
1. **数据库兼容性**：所有新增操作都不影响现有表
2. **API 兼容性**：不修改现有 API，只添加新的 API 端点
3. **前端兼容性**：现有页面保持不变，新功能通过新组件实现

### 业务风险控制
1. **功能完整性**：保留所有现有功能
2. **用户体验**：新功能不影响现有操作流程
3. **数据安全**：严格的权限验证和数据隔离

### 开发风险控制
1. **分阶段实施**：每个阶段都可以独立验证
2. **代码质量**：保持与 n8n 原有代码风格一致
3. **测试覆盖**：每个功能都编写对应的测试用例

---

## 📈 成功标准

### MVP 功能验收标准
1. ✅ **用户注册**：自动创建个人项目和用户余额
2. ✅ **团队创建**：支持创建团队并邀请成员
3. ✅ **项目切换**：在个人项目和团队项目间切换
4. ✅ **权限管理**：基于角色的项目访问控制
5. ✅ **基础计费**：简单的余额管理和扣费功能

### 性能指标
- 数据库查询响应时间 < 100ms
- API 响应时间 < 500ms
- 前端页面加载时间 < 2s

### 兼容性要求
- 现有功能 100% 兼容
- 不破坏现有的工作流和凭证
- 支持从上游 n8n 无缝升级

---

## 🎯 里程碑节点

### Week 1-2: 数据库层 ✅ 已完成
- [x] 所有实体创建完成
- [x] 所有 Repository 实现完成
- [x] Migration 脚本编写完成
- [x] 数据库结构验证通过

### Week 3-4: 服务层 ✅
- [ ] TeamService 实现完成
- [ ] TeamMemberService 实现完成
- [ ] UserBalanceService 实现完成
- [ ] 单元测试编写完成

### Week 5-6: API 层 ✅
- [ ] TeamController 实现完成
- [ ] TeamMemberController 实现完成
- [ ] BalanceController 实现完成
- [ ] API 测试通过

### Week 7-8: 前端层 ✅
- [ ] ProjectSwitcher 组件实现
- [ ] TeamManagement 页面实现
- [ ] Balance 页面实现
- [ ] 集成测试通过

### Week 9-10: 计费集成 ✅
- [ ] 工作流执行计费集成
- [ ] AI Token 计量实现
- [ ] 端到端测试通过
- [ ] MVP 功能发布

---

## 📞 问题反馈

### 技术问题
- 参考 `MULTITENANT_PLAN_V2.md` 获取详细技术方案
- 检查本文档的实施进度和代码统计

### 进度问题
- 查看上方进度概览表格
- 参考里程碑节点验证完成情况

### 架构问题
- 参考技术要点和关键决策章节
- 查看设计原则和实施细节

---

## 🎉 最终目标

**实现一个功能完整的多租户 n8n：**
- ✅ 支持个人项目和团队项目
- ✅ 完整的团队成员管理
- ✅ 灵活的计费模式
- ✅ 优秀的用户体验
- ✅ 与上游 n8n 完全兼容

**预期收益：**
- 📈 用户增长：团队协作功能吸引企业用户
- 💰 收入增长：按量计费实现精准收费
- 🚀 产品竞争力：优于原生 n8n 的多租户能力
- 🔧 维护成本降低：基于成熟架构，易于维护

---

**文档版本：** v2.0
**最后更新：** 2025-10-29
**维护者：** 老王
**预计完成：** 2025-12-15 (8-10 周)