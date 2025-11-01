![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n 多租户改造版（Multi-tenant Fork）

> 该仓库基于 n8n@1.118.0 的满血版源码，按“Project 扩展 + 独占模式重构”方案实现企业多租户、
> 计费和中文化能力。请勿直接参照上游 README 的使用说明。

## 状态概览（2025-11-01）

- ✅ Phase 1-4.1.2 完成：Team/TeamMember 数据库与服务层、19 个团队 API、独占模式 PLAN_A 重构
- ✅ Neon PostgreSQL 17.5 云数据库迁移完成，TypeScript 编译 0 错误，多语言切换体系上线
- 🚧 待办：Phase 4.2 团队管理前端、Phase 5 完整计费系统、267 个测试用例类型错误修复
- ⏸️ Chat-Hub & Insights 多租户隔离 Service/Controller 层改造（待计费系统落地后继续）
- 📅 预计整体工期 10-11 周，目标完成时间 2025-12-15

## 与上游 n8n 的主要差异

- 新增 Team/TeamMember 实体与服务，实现基于 Project 的多租户与配额管理
- 独占模式（Exclusive Mode）替换 SharedWorkflow/SharedCredentials 查询链路，涵盖命令行、
  Source Control、公有 API、测试工具
- 多语言体系重构：默认英文，可动态加载中文，前端提供语言切换入口
- 默认启用 `chat-hub`、`insights` 模块并预置多租户数据库结构（Service/Controller 待改造）
- 云数据库采用 Neon PostgreSQL，提供迁移脚本与连接配置示例

## 仓库结构速览

- `packages/cli`：CLI 入口、REST API、服务层逻辑（Team/Project/Billing 等新增逻辑在此）
- `packages/core`：工作流执行核心
- `packages/@n8n/db`：数据库实体、迁移与仓库（多租户/独占模式相关改动主要集中在此）
- `packages/frontend`：Vue 3 编辑器与设计系统（WorkspaceSwitcher、AuthModal、团队管理）
- `packages/nodes-base`：官方节点集合
- `二开改造文档/`：本地化改造方案、进度与已知问题（同步维护）

更多说明见 `二开改造文档/MULTITENANT_PLAN_V2.md` 与 `二开改造文档/MULTITENANT_PROGRESS_V2.md`。

## 开发环境准备

1. Node.js ≥ 22.16（建议使用 `fnm`/`nvm` 管理版本）
2. pnpm（随 Node 版本安装或使用 `corepack enable`）
3. Neon PostgreSQL 数据库（或本地 PostgreSQL 兼容实例）
4. 复制 `.env.example` 为 `.env`，根据需要配置下列关键变量：
   - `N8N_DEFAULT_LOCALE=en`（可选值：`en`、`zh-CN`）
   - `N8N_ENABLED_MODULES=chat-hub,insights`
   - `DB_TYPE=postgresdb`、`DB_POSTGRESDB_*`（Neon 连接信息）

安装依赖：

```bash
pnpm install
```

## 启动与调试

- `pnpm dev`：前后端联动开发
- `pnpm dev:be` / `pnpm dev:fe`：分别启动 CLI 后端或前端编辑器
- `pnpm start`：运行 CLI（默认端口 5678）
- `pnpm start:tunnel`：启动用于 Webhook 调试的隧道模式

首次运行时将自动执行数据库迁移。若需要重置数据库，请确认 Neon 或本地实例中的数据。

## 测试与质量

- `pnpm lint`、`pnpm lint:styles`：Biome + stylelint 校验
- `pnpm test`：后端/前端测试矩阵（当前仍有约 267 个 TypeScript 错误待修复）
- 执行 Playwright 回归需使用 `pnpm test:with:docker`

测试改造需同步更新基于 SharedWorkflow/SharedCredentials 的 mock 与断言逻辑。

## Roadmap / 当前优先级

1. 🧪 修复测试文件类型错误（Week 7）
2. 🎨 Phase 4.2 团队管理前端（Week 8）
3. 💳 Phase 5 计费系统（Week 9-11）：余额、消费、充值、执行计费链路
4. 💬 Chat-Hub & Insights 多租户 Service/Controller 改造（计费系统完成后恢复）

详细进度请参阅 `二开改造文档/MULTITENANT_PROGRESS_V2.md`。

## 文档与支持

- 方案设计：`二开改造文档/MULTITENANT_PLAN_V2.md`
- 进度追踪：`二开改造文档/MULTITENANT_PROGRESS_V2.md`
- 独占模式方案：`二开改造文档/PLAN_A_独占模式改造方案.md`
- 已知问题：`二开改造文档/KNOWN_ISSUES.md`

欢迎通过文档中的规范更新条目，保持信息同步。

## 贡献指南

目前仓库由内部团队维护，暂不接受外部 PR。若需参与：

1. 阅读 `CONTRIBUTING.md` 与上述改造文档
2. 遵循 Biome/格式化要求（tabs 宽度 2，100 列）
3. 提交前执行 `pnpm lint`、`pnpm format`、`pnpm test`

## 许可证

本项目为公司内部专用。仓库中保留的上游 LICENSE 文件仅用于追溯源码来源，
不得作为对外分发或授权依据。请遵循内部合规要求，禁止在未获批准的情况下
传播或公开该项目。
