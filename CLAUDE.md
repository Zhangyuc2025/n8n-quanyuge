# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在处理 n8n 代码仓库中的代码时提供指导。

## 🎯 项目概述

**SASA 平台**是基于 n8n 进行激进二次开发的多租户 SaaS 平台，对标 Coze 商业版。

**核心改造**：
- ✅ 多租户架构（Project = Workspace）
- ✅ 三层节点系统（内置 + 平台 + 自定义）
- ✅ AI 平台托管 + 按量计费（RMB）
- ✅ 完全去除许可证限制
- ✅ 完整中文本地化（3,795+ 翻译）

**技术栈**：TypeScript + pnpm 单仓库 + Node.js + Vue 3 + TypeORM + PostgreSQL

**重要**：这是二次开发项目，很多 n8n 原有代码已删除（SharedWorkflow、SharedCredentials、许可证验证等），开发时参考 `改造方案文档/` 目录，不要盲目参考原版 n8n。

---

## 一般准则

- 始终使用 pnpm
- 我们使用 Linear 作为工单跟踪系统
- 我们使用 Posthog 进行功能标志
- 开始处理新工单时 - 从最新的 master 创建新分支，使用 Linear 工单中指定的名称
- 为 Linear 中的工单创建新分支时 - 使用 linear 建议的分支名称
- 当需要可视化某些内容时，在 MD 文件中使用 mermaid 图表
- **在获得用户同意之前不要擅自创建 .md 或 .txt 文档**
- **涉及多租户时，确保正确使用 `projectId`/`workspaceId` 隔离**
- **新增节点使用三层架构，不要直接修改文件系统节点**

---

## 智能辅助系统

### 自动调用 .claude 工作流

本项目配置了智能工作流命令（位于 `.claude/commands/`），在合适场景下应**主动自动调用**：

#### 1. `/Initialize` - 项目初始化
**自动触发**：用户首次询问项目结构/架构，或 `.claude/guide/` 不存在时
**不要问用户**，直接调用生成项目知识库

#### 2. `/task` - 规范化任务执行
**自动触发**：用户提出任何开发需求（添加功能、修复 bug、重构等）
**重要**：会自动引用 `.claude/guide/` 和 `改造方案文档/`

#### 3. `/sync-kb` - 知识库同步
**自动触发**：完成代码修改后（由 `/task` 自动调用）

#### 4. `/shencha` - 代码审查
**自动触发**：准备提交 PR、完成大功能后
**检查**：多租户隔离、三层节点架构、计费集成

### 子代理使用策略

**重要**：为避免上下文不足，**积极主动使用子代理**：

1. **代码探索和搜索** - 使用 Explore 子代理
   - 查找功能实现位置、搜索 @ProjectScope 装饰器等

2. **复杂分析** - 使用 general-purpose 子代理
   - 多次搜索、跨包分析、理解改造方案文档

3. **并行处理** - 同时启动多个子代理
   ```
   示例：分析多租户实现
   - 子代理 A：数据库层（@n8n/db）
   - 子代理 B：后端 Service 层（packages/cli）
   - 子代理 C：前端 Store 层（packages/editor-ui）
   - 在单个消息中同时调用
   ```

**原则**：
- 不要犹豫，任务复杂立即使用子代理
- 可独立任务必须并行调用
- 让子代理读取大文档提取关键信息

### 上下文管理

**避免上下文不足**：
1. 优先读取 `.claude/guide/` 和 `改造方案文档/00-总览与导航.md`
2. 将搜索任务委托给子代理
3. 优先使用 `/task` 管理复杂任务
4. 改造文档很大，按需读取具体模块

---

## SASA 平台核心概念

**必须理解的 3 个核心改造**：

1. **Project = Workspace（多租户）**
   - 所有数据操作必须考虑 `projectId` 隔离
   - 使用 `@ProjectScope` 装饰器自动隔离

2. **三层节点架构**
   ```
   Layer 1: 内置节点（53个，文件系统，只读）
   Layer 2: 平台节点（数据库，VM2 沙箱，所有用户可见）
   Layer 3: 自定义节点（数据库，VM2 沙箱，工作空间私有）
   ```

3. **计费系统**
   - AI 服务调用必须检查余额并扣费
   - 使用悲观锁防止余额透支

**已删除的 n8n 功能**（不要参考）：
- ❌ SharedWorkflow 表和代码（147 处引用已删除）
- ❌ SharedCredentials 表和代码（95 处引用已删除）
- ❌ 许可证验证系统
- ❌ 用户端 npm 节点安装

**详细说明**：参考 `改造方案文档/00-总览与导航.md`

---

## 必要命令

### 构建
```bash
pnpm build > build.log 2>&1
tail -n 20 build.log
```

### 开发模式（前后端分离）
```bash
pnpm dev:be        # 后端 API (5678)
pnpm dev:fe:main   # 主应用前端 (8080)
pnpm dev:fe:admin  # 管理后台 (5679)
```

### 测试
- `pnpm test` - 运行所有测试
- `pnpm test:affected` - 基于变更运行测试
- **重点**：多租户数据隔离测试

### 代码质量
- `pnpm lint` - 代码检查
- `pnpm typecheck` - 类型检查
- 提交前必须运行

### 数据库迁移
```bash
pnpm --filter=@n8n/db migration:generate MigrationName
pnpm --filter=@n8n/db migration:run
```
**注意**：所有迁移必须支持多租户（project_id 字段）

---

## 架构概述

**单仓库结构：** pnpm 工作空间和 Turbo 构建编排

### 关键包（SASA 改造）

- **`packages/@n8n/api-types`** - 共享类型（新增多租户类型）
- **`packages/cli`** - Express API（Service 层重构，@ProjectScope）
- **`packages/editor-ui`** - Vue 3 前端（ProjectsStore，工作空间切换）
- **`packages/admin-panel`** - **新增**：管理后台
- **`packages/@n8n/i18n`** - 国际化（3,795+ 中文翻译）
- **`packages/@n8n/db`** - 数据库（+11 新表，-2 旧表）
- **`packages/@n8n/nodes-langchain`** - AI 节点（LmChatPlatform 统一节点）

---

## 技术栈

- **前端：** Vue 3 + TypeScript + Vite + Pinia
- **后端：** Node.js + TypeScript + Express + TypeORM
- **测试：** Jest（单元）+ Playwright（E2E）
- **数据库：** PostgreSQL（推荐）
- **SASA 特有：** VM2 沙箱、悲观锁、WebSocket 房间隔离

### 关键架构模式

1. **依赖注入** - `@n8n/di` IoC 容器
2. **控制器-服务-仓库** - MVC 模式
3. **事件驱动** - 内部事件总线
4. **状态管理** - Pinia stores
5. **@ProjectScope 装饰器** - **SASA 新增**：自动工作空间隔离
6. **三层节点加载** - **SASA 新增**：文件系统 + 数据库 + VM2

---

## 关键开发模式

### SASA 开发流程（推荐）

**所有开发任务优先使用 `/task` 命令**：

```
用户："添加新功能"
你：立即调用 /task
```

`/task` 自动执行：
1. 多源分析（读取改造文档 + 知识库 + 搜索代码）
2. 任务制定（确保多租户隔离 + 三层节点 + 计费集成）
3. 任务执行（逐步实现 + 实时反馈）
4. 任务验证（质量检查 + 自动更新知识库）

### 多租户开发原则

```typescript
// ✅ 正确
@Get('/workflows')
@ProjectScope()
async getWorkflows(req) {
  // 自动过滤当前工作空间数据
}

// ❌ 错误
async getWorkflows() {
  return this.repository.find(); // 返回所有工作空间数据！
}
```

### TypeScript 最佳实践
- 切勿使用 `any` 类型
- 避免使用 `as` 类型转换
- 在 `@n8n/api-types` 中定义共享接口
- **SASA**：多租户类型必须包含 `projectId`

### 错误处理
- 使用 `UnexpectedError`、`OperationalError` 或 `UserError`
- **SASA**：余额不足抛出 `InsufficientBalanceError`
- **SASA**：权限不足抛出 `WorkspaceAccessDeniedError`

### 前端开发
- 所有 UI 文本使用 i18n
- 直接使用 CSS 变量（参考 `packages/frontend/CLAUDE.md`）
- **SASA**：工作空间切换时必须刷新数据
  ```typescript
  watch(() => projectsStore.currentWorkspaceId, async () => {
    await workflowsStore.fetchWorkflows();
  });
  ```

### 测试指南
- 从包目录内运行测试
- 单元测试模拟所有外部依赖
- 提交前运行 `pnpm typecheck`
- **SASA**：多租户数据隔离测试最高优先级

---

## 核心行为原则（必须遵守）

### 1. 智能工作流优先
- ✅ 开发需求立即调用 `/task`
- ✅ 没有知识库立即调用 `/Initialize`
- ✅ 需要搜索立即使用子代理
- ❌ 不要手动执行复杂多步骤任务

### 2. 子代理积极使用
- ✅ 任何搜索都使用 Explore 子代理
- ✅ 复杂分析同时启动多个子代理
- ✅ 在单个消息中并行调用
- ❌ 不要手动执行 Grep/Glob

### 3. SASA 平台特定
- ✅ 所有数据操作考虑 `projectId` 隔离
- ✅ 新增节点使用三层架构
- ✅ AI 服务调用集成计费
- ❌ 不要参考 SharedWorkflow 代码（已删除）
- ❌ 不要使用许可证验证逻辑（已删除）

### 4. 质量保证
- ✅ 使用正确类型
- ✅ 添加 i18n
- ✅ 使用 CSS 变量
- ✅ 运行 `pnpm typecheck`
- ✅ 调用 `/sync-kb` 更新知识库
- ✅ **SASA**：正确实现工作空间隔离
- ✅ **SASA**：集成计费系统
- ✅ **SASA**：前端处理工作空间切换

---

## 快速参考

| 场景 | 操作 | 工具 |
|------|------|------|
| 首次接触项目 | 初始化知识库 | `/Initialize` |
| 开发需求 | 启动任务流程 | `/task` |
| 搜索代码 | 使用子代理 | Task (Explore) |
| 理解改造 | 读取改造文档 | `改造方案文档/00-总览与导航.md` |
| 分析多模块 | 并行子代理 | 多个 Task 并行 |
| 代码审查 | 审查代码 | `/shencha` |

---

## 重要文档路径

- **改造总览**：`改造方案文档/00-总览与导航.md`
- **多租户架构**：`改造方案文档/modules/01-多租户架构.md`
- **节点架构**：`改造方案文档/modules/04-节点架构.md`
- **数据库设计**：`改造方案文档/modules/03-数据库设计.md`
- **知识库**：`.claude/guide/`（由 `/Initialize` 生成）

---

## 核心差异提醒

**这是 SASA 平台，不是原版 n8n**

| 概念 | 原版 n8n | SASA 平台 |
|------|----------|-----------|
| Workspace | 无 | Project（personal/team） |
| SharedWorkflow | 存在 | ❌ 已删除 |
| Credentials | 表驱动 | ❌ 改用 user_node_config |
| 节点加载 | 文件系统 + npm | 三层架构 |
| AI 节点 | 用户配置 Key | 平台托管 + 计费 |
| 许可证 | 需要验证 | ❌ 完全移除 |

---

**记住**：`/task` + 子代理 + 改造文档 = 高效开发 + 避免上下文不足
