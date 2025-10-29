# n8n 多租户改造进度跟踪 - v2.0 版本

> **更新时间:** 2025-10-30
> **当前状态:** ✅ Phase 3.7 完成 - 登录注册弹窗改造
> **当前方案:** 基于 Project 架构扩展（最小改动策略）+ 完整计费系统
> **预计总工期:** 10-11 周（已调整，含完整计费）
> **当前版本:** n8n@1.117.0 (满血版)
> **下一步:** Phase 4 - 前端组件实现（工作区切换、团队管理）
> **方案版本:** v2.8（2025-10-30登录注册弹窗改造完成）

---

## 📝 文档更新规范

### ✅ 必须更新的部分（动态信息）

每次完成一个阶段或重要里程碑时，必须更新：

1. **文档头部信息** - 更新时间、当前状态、下一步
2. **整体进度概览表格** - 状态、完成时间、代码量
3. **已完成工作章节** - 添加新完成阶段的简要描述

### ❌ 禁止操作

1. **禁止简单追加** - 不要在文档末尾无限追加新内容
2. **禁止过度细节** - 不要粘贴大段代码示例或详细checkbox
3. **禁止重复章节** - 应该在已完成工作章节中更新，不要重复记录

### 📏 保持简洁的原则

- **一个阶段 ≤ 10行**：每个已完成阶段的描述不超过10行
- **关键信息优先**：只保留文件路径、核心功能、代码量
- **使用表格呈现**：进度、统计数据用表格，清晰易读

---

## 📊 整体进度概览

| 阶段 | 任务 | 状态 | 完成时间 | 代码量 |
|------|------|------|----------|--------|
| **准备阶段** | 方案设计和上游切换 | ✅ 完成 | 2025-10-29 | - |
| **License解除** | 满血版功能解锁 | ✅ 完成 | 2025-10-29 | ~300行 |
| **构建修复** | 依赖冲突和TS类型错误 | ✅ 完成 | 2025-10-29 | ~60行 |
| **Phase 1** | 数据库层改造（Team/TeamMember） | ✅ 完成 | 2025-10-29 | ~630行 |
| **Phase 2** | 服务层实现（TeamService） | ✅ 完成 | 2025-10-29 | ~704行 |
| **Phase 3** | API层实现（19个端点） | ✅ 完成 | 2025-10-29 | ~534行 |
| **Phase 3.5** | 公开首页 + 侧边栏改造 | ✅ 完成 | 2025-10-29 | ~210行 |
| **Phase 3.6** | 侧边栏统一化与延迟加载 | ✅ 完成 | 2025-10-29 | ~120行 |
| **Phase 3.7** | 登录注册弹窗改造 | ✅ 完成 | 2025-10-30 | ~550行 |
| **Phase 4** | 前端组件实现 | 📋 待开始 | - | - |
| **Phase 5** | 完整计费系统 ⭐扩展 | 📋 待开始 | - | - |

**总计已完成:** ~3,108行代码

---

## 🎯 已完成工作

### ✅ Phase 1: 数据库层改造（2025-10-29）

**核心文件:** `packages/@n8n/db/src/migrations/mysqldb/1761701813576-AddMultiTenantTables.ts`

**完成内容:**
- 创建 Team 表（团队管理）、TeamMember 表（成员关系）
- 扩展 User 表（tier, maxTeams, tenantStatus）、Project 表（teamId, isDefault）
- 创建 TeamRepository、TeamMemberRepository（完整数据访问层）
- 建立 4个外键约束、9个索引
- 修复排序规则冲突和索引表引用错误

**代码量:** ~630行

---

### ✅ Phase 2: 服务层实现（2025-10-29）

**核心文件:**
- `packages/cli/src/services/team.service.ts` (344行)
- `packages/cli/src/services/team-member.service.ts` (360行)

**完成内容:**
- TeamService: 13个方法（创建、查询、更新、删除、权限验证、统计）
- TeamMemberService: 12个方法（成员管理、角色管理、权限验证）
- 完整的错误处理和EventService集成
- 业务逻辑验证（权限、配额、数据一致性）

**代码量:** ~704行

---

### ✅ Phase 3: API层实现（2025-10-29）

**核心文件:**
- `packages/@n8n/api-types/src/schemas/team.schema.ts` - Team Schema定义
- `packages/@n8n/api-types/src/dto/team/` - 4个DTO类
- `packages/cli/src/controllers/team.controller.ts` (236行)
- `packages/cli/src/controllers/team-member.controller.ts` (207行)

**完成内容:**
- 19个REST API端点（11个团队管理 + 8个成员管理）
- Zod + Zod-class 数据验证
- 完整的权限验证和事件记录
- 路由自动注册（/rest/teams）

**代码量:** ~534行

---

### ✅ Phase 3.5: 公开首页改造（2025-10-29）

**核心文件:**
- `packages/frontend/editor-ui/src/views/HomePage.vue` - 简洁占位首页
- `packages/frontend/editor-ui/src/components/MainSidebar.vue` - 未登录状态支持
- `packages/frontend/editor-ui/src/router.ts` - 路由调整
- `packages/cli/src/services/frontend.service.ts` - 禁用setup强制跳转
- `packages/frontend/@n8n/i18n/src/locales/zh-CN.json` - 中文国际化
- `packages/frontend/@n8n/i18n/src/locales/en.json` - 英文国际化

**完成内容:**
- 移除单Owner初始化的强制跳转（showSetupOnFirstLoad: false）
- 创建公开访问的平台首页（使用PageViewLayout保持风格一致）
- MainSidebar支持未登录状态（隐藏项目导航、高级功能菜单）
- 路由配置调整（跳过未登录用户的initializeCore和settingsStore初始化）
- 解决settings未初始化导致的planName错误（条件访问+Report Bug菜单动态显示）
- i18n翻译（homePage.welcome/subtitle/login/register + mainSidebar.home）
- 修复未登录时BecomeTemplateCreatorCta的401错误（条件调用startMonitoringCta）

**代码量:** ~210行

---

### ✅ Phase 3.6: 侧边栏统一化与延迟加载（2025-10-29）

**核心文件:** `packages/frontend/editor-ui/src/components/MainSidebar.vue`

**完成内容:**
- 菜单项显示统一化：Cloud Admin、Chat、Templates、Insights、What's New、Report Bug 全部对未登录用户可见
- 延迟认证检查机制：移除菜单项的 `isAuthenticated` 限制，改为点击时在 `handleSelect` 中检查认证状态
- 数据访问安全化：`showWhatsNewNotification`、`userIsTrialing` 添加认证检查，避免未登录时访问 store 触发请求
- 延迟数据加载：What's New 的文章列表、Templates 的跳转逻辑、Report Bug 的 URL 生成均延迟到点击时处理
- 保留必要限制：ProjectNavigation、创建按钮、UserArea 仍需登录后显示

**代码量:** ~120行

---

### ✅ Phase 3.7: 登录注册弹窗改造（2025-10-30）

**核心文件:**
- `packages/frontend/editor-ui/src/components/AuthModal.vue` (新建，507行)
- `packages/frontend/editor-ui/src/components/MainSidebar.vue` (修改)
- `packages/frontend/editor-ui/src/components/Modals.vue` (注册模态框)
- `packages/frontend/editor-ui/src/constants/modals.ts` (添加AUTH_MODAL_KEY)
- `packages/frontend/editor-ui/src/stores/ui.store.ts` (初始化模态框状态)

**完成内容:**
- 创建 AuthModal 弹窗组件，取代页面跳转的登录注册流程
- 左右布局设计：登录时左侧表单+右侧二维码区域，注册时表单居中显示（二维码隐藏）
- 简化注册表单：用户名+密码+确认密码（密码匹配验证）
- 密码显示/隐藏功能（眼睛图标切换）
- 移除弹窗标题和Tab切换条，通过底部链接切换登录/注册
- 侧边栏菜单改造：未登录点击受限功能弹出登录弹窗，已登录点击正常跳转
- 完整的中英文i18n翻译（23个翻译键）

**代码量:** ~550行

---

### ✅ License解除: 满血版功能解锁（2025-10-29）

**核心文件:** `packages/cli/src/license/self-hosted-license-provider.ts`

**完成内容:**
- 创建 SelfHostedLicenseProvider 类，硬编码满血模式
- 移除 @n8n_io/license-sdk 依赖（减少52个间接依赖）
- 解锁所有企业功能（LDAP/SAML、Variables、AI Assistant等）
- 反向逻辑配置化（REVERSE_LOGIC_FEATURES + isReverseLicenseFeature工具函数）

**代码量:** ~340行

---

### ✅ 构建环境修复（2025-10-29）

**修复内容:**
- 锁定依赖版本（ts-essentials, @types/psl等）
- Winston日志类型修复（String()转换）
- TypeORM深度类型实例化问题（最小化as any）
- ESLint配置类型注解

**代码量:** ~60行

---

## 🏗️ 核心技术架构

### 架构设计原则

1. **最小改动原则** - 基于 n8n 现有成熟架构，只添加必要的功能
2. **完全兼容原则** - 不破坏现有功能，易于上游升级
3. **租户隔离原则** - 每个用户独立的钱包和余额管理
4. **团队协作原则** - 支持灵活的团队创建和成员管理

### 架构对比

| 特性 | 原 n8n 架构 | 新多租户架构 |
|------|------------|-------------|
| **工作区** | Project（个人/团队） | Project（扩展团队功能） |
| **权限管理** | ProjectRelation | ProjectRelation + TeamMember |
| **工作流共享** | SharedWorkflow | 保持不变 |
| **凭证共享** | SharedCredentials | 保持不变 |
| **计费系统** | ❌ 无 | ✅ 用户余额 + 团队计费 |
| **团队管理** | ❌ 基础 | ✅ 完整团队管理 |

### 实体关系

```
User (用户/租户)
├── tier (free/pro/enterprise)
├── tenantStatus (active/suspended)
├── ProjectRelation (项目关系)
└── Team (团队 - 可选)
    ├── TeamMember (团队成员) 🆕
    │   └── role (owner/admin/member)
    └── Project (团队项目)
        └── teamId 🆕
```

---

## 🚀 下一步计划

### Phase 4: 前端组件实现（预计 Week 7-8）

**核心任务:**
- 重新设计首页方案（优化用户体验）
- 工作区切换组件（ProjectSwitcher）
- 团队管理页面（Team Management）
- 成员管理功能（Member Management）

**技术栈:** Vue 3 + Pinia + n8n Design System

---

### Phase 5: 完整计费系统（预计 Week 9-11）⭐扩展

**数据库表:**
- usage_record - 消费记录表
- recharge_record - 充值记录表
- team_invitation - 团队邀请表（可选）
- execution_entity.billing_user_id - 计费用户追踪字段

**服务层:**
- UserBalanceService、UsageRecordService、RechargeService、BillingService

**API层:**
- BalanceController、UsageController

**前端:**
- BalanceDisplay、RechargeDialog、UsageRecordsPage

**业务集成:**
- 工作流执行计费、AI Token 计量、余额检查

---

## 📈 成功标准

### MVP 功能验收标准

1. ✅ **数据库层** - 团队表和扩展字段创建成功
2. ✅ **服务层** - TeamService和TeamMemberService完整实现
3. ✅ **API层** - 19个REST端点实现完成
4. ⚠️ **注册登录** - 后端API完成，前端待重新设计
5. 📋 **前端组件** - 工作区切换和团队管理（待实施）
6. 📋 **计费系统** - 余额管理和消费记录（待实施）

### 性能指标

- 数据库查询响应时间 < 100ms
- API 响应时间 < 500ms
- 前端页面加载时间 < 2s

### 兼容性要求

- 现有功能 100% 兼容
- 不破坏现有的工作流和凭证
- 支持从上游 n8n 无缝升级

---

## 💡 关键技术决策

### 1. 为什么选择基于 Project 扩展？

- ✅ n8n 的 Project 架构已经非常成熟
- ✅ 现有的权限系统（ProjectRelation + SharedWorkflow）功能完整
- ✅ 前端、后端、API 都围绕 Project 构建
- ✅ 避免了大规模重构的风险

### 2. 为什么保留 SharedWorkflow/SharedCredentials？

- ✅ 原生权限系统已经非常完善
- ✅ 避免重复造轮子（DRY原则）
- ✅ 保持与上游兼容性

### 3. 为什么分离 Team 和 Project？

- ✅ Team 负责团队管理和计费
- ✅ Project 负责工作流隔离和权限控制
- ✅ 单一职责原则（SOLID）
- ✅ 灵活支持个人项目和团队项目

---

## 🔨 已知问题

/home/zhang/n8n/二开改造文档/KNOWN_ISSUES.md


---

**文档版本:** v2.8
**最后更新:** 2025-10-30
**维护者:** 老王
**预计完成:** 2025-12-15 (10-11 周)
