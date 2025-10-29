# n8n 多租户改造进度跟踪 - v2.0 版本

> **更新时间:** 2025-10-29
> **当前状态:** ✅ Phase 1 完成 - 数据库层改造完成
> **当前方案:** 基于 Project 架构扩展（最小改动策略）
> **预计总工期:** 8-10 周
> **当前版本:** n8n@1.118.1 (上游最新)
> **下一步:** 开始 Phase 2 - 服务层实现

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
| **Phase 1** | 数据库层改造 | ✅ 完成 | 2025-10-29 | ~500行 |
| **Phase 2** | 服务层实现 | ⏳ 进行中 | - | - |
| **Phase 3** | API 层实现 | 📋 待开始 | - | - |
| **Phase 4** | 前端组件实现 | 📋 待开始 | - | - |
| **Phase 5** | 计费系统集成 | 📋 待开始 | - | - |

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
   - [x] Team 实体（团队表）
   - [x] TeamMember 实体（团队成员表）
   - [ ] UserBalance 实体（用户余额表）- 暂缓到 Phase 5

2. **扩展现有实体**
   - [x] 扩展 Project 实体（添加 teamId, isDefault 字段）
   - [x] 扩展 User 实体（添加 tier, maxTeams, tenantStatus 字段）

3. **创建 Repository 层**
   - [x] TeamRepository（团队数据访问）
   - [x] TeamMemberRepository（成员管理数据访问）
   - [ ] UserBalanceRepository（余额管理数据访问）- 暂缓到 Phase 5

4. **创建数据库 Migration**
   - [x] 多租户表创建 Migration
   - [x] 现有表扩展 Migration

---

### 📋 Phase 2: 服务层实现（Week 3-4）- 进行中

**任务清单：**
1. **TeamService 实现**
   - [ ] 创建团队（createTeam）
   - [ ] 获取团队信息（getTeam, getTeamById）
   - [ ] 更新团队信息（updateTeam）
   - [ ] 删除团队（deleteTeam）
   - [ ] 团队成员验证（validateTeamOwnership）

2. **TeamMemberService 实现**
   - [ ] 添加成员（addMember）
   - [ ] 移除成员（removeMember）
   - [ ] 更新成员角色（updateMemberRole）
   - [ ] 获取团队成员列表（getTeamMembers）
   - [ ] 成员权限验证（checkMemberPermission）

3. **单元测试**
   - [ ] TeamService 测试用例
   - [ ] TeamMemberService 测试用例

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