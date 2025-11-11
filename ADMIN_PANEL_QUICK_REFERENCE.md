# Admin Panel 快速参考

> 📖 完整分析请参阅: [ADMIN_PANEL_ARCHITECTURE_ANALYSIS.md](./ADMIN_PANEL_ARCHITECTURE_ANALYSIS.md)

---

## 🎯 核心信息

- **路径**: `packages/frontend/admin-panel`
- **端口**: 5679 (dev), `/admin/` (生产)
- **框架**: Vue 3 + Pinia + Vue Router
- **共享依赖**: @n8n/design-system, @n8n/i18n, @n8n/api-types
- **认证**: HTTP-only Cookie (平台管理员独立认证)

---

## 📦 模块清单

| 模块 | 状态 | 路由 | 功能 |
|------|------|------|------|
| Telemetry | ✅ 已实现 | `/telemetry/*` | 事件分析、仪表板、数据导出 |
| AI Providers | ✅ 已实现 | `/ai-providers` | AI 服务商管理、模型配置 |
| Platform Nodes | ✅ 已实现 | `/platform-nodes` | 平台节点管理、审核、计费配置 |
| Workspaces | ❌ 规划中 | `/workspaces` | 工作空间管理 (P1) |
| Users | ❌ 规划中 | `/users` | 用户管理 (P1) |
| Billing | ❌ 规划中 | `/billing` | 计费管理 (P1) |
| System | ❌ 规划中 | `/system` | 系统设置 (P2) |
| Audit | ❌ 规划中 | `/audit` | 审计日志 (P2) |

---

## 🌐 API 端点速查

### 平台管理
- `GET /rest/platform-admin/status` - 系统状态
- `POST /rest/platform-admin/setup` - 初始化
- `POST /rest/platform-admin/login` - 登录

### Telemetry
- `GET /rest/telemetry/events` - 事件列表
- `GET /rest/telemetry/stats/overview` - 统计概览
- `GET /rest/telemetry/export` - 数据导出

### AI Providers
- `GET /rest/admin/platform-ai-providers` - 列表
- `POST /rest/admin/platform-ai-providers` - 创建
- `PATCH /rest/admin/platform-ai-providers/:key` - 更新

### Platform Nodes
- `GET /rest/platform-nodes/admin/all` - 所有节点
- `POST /rest/platform-nodes/:key/approve` - 审核通过
- `POST /rest/platform-nodes/:key/reject` - 审核拒绝

---

## 🗄️ Stores 速查

| Store | 路径 | 职责 |
|-------|------|------|
| System | `stores/system.store.ts` | 系统初始化、管理员认证 |
| Auth | `stores/auth.store.ts` | n8n 用户认证 (保留) |
| Telemetry | `modules/telemetry/stores/telemetry.store.ts` | 事件数据管理 |
| AI Providers | `modules/ai-providers/stores/ai-providers.store.ts` | AI 提供商管理 |
| Platform Nodes | `modules/platform-nodes/stores/platform-nodes.store.ts` | 节点管理 |

---

## 🔐 认证流程

```
1. 访问 /admin/* 
   ↓
2. 检查系统初始化 (GET /rest/platform-admin/status)
   ↓ (未初始化)
3. 重定向到 /setup → 创建管理员账户
   ↓ (已初始化)
4. 检查 Cookie 有效性 (测试 API 调用)
   ↓ (无效)
5. 重定向到 /login → 管理员登录
   ↓ (有效)
6. 进入后台 (默认: /telemetry/dashboard)
```

---

## 🚨 已知问题

| 问题 | 影响 | 优先级 |
|------|------|--------|
| 认证检查性能 (每次路由都调 API) | 性能、后端负载 | P0 |
| Fail-open 策略 (认证失败直接放行) | 安全风险 | P0 |
| 缺少 CSRF 保护 | 安全风险 | P0 |
| 缺少统一 API 客户端 | 代码重复、难维护 | P1 |
| 缺少错误边界 | 用户体验 | P1 |
| 缺少单元测试 | 代码质量 | P2 |

---

## 🛠️ 开发命令

```bash
# 启动管理后台 (开发模式)
pnpm --filter=@n8n/admin-panel dev  # http://localhost:5679

# 构建
pnpm --filter=@n8n/admin-panel build

# 类型检查
pnpm --filter=@n8n/admin-panel typecheck
```

---

## 📂 关键文件

| 文件 | 用途 |
|------|------|
| `src/router/index.ts` | 路由配置 + 认证守卫 (⚠️ 性能问题) |
| `src/config/modules.ts` | 模块配置 (已实现/规划中标记) |
| `src/stores/system.store.ts` | 系统初始化 + 管理员登录 |
| `vite.config.ts` | Vite 配置 (CDN 支持) |
| `src/main.ts` | 入口文件 (i18n 初始化) |

---

## 💡 快速定位

**添加新模块**:
1. 在 `src/config/modules.ts` 添加配置
2. 创建 `src/modules/[module-name]/` 目录
3. 在 `src/router/index.ts` 添加路由
4. 创建对应的 Store (如需要)

**修改认证逻辑**:
- `src/router/index.ts` (路由守卫)
- `src/stores/system.store.ts` (管理员认证)

**添加 API 调用**:
- 在对应的 Store 中添加 action (建议先创建统一 API 客户端)

---

**架构评分**: ⭐⭐⭐⭐☆ (4/5)  
**文档版本**: v1.0  
**最后更新**: 2025-11-11
