# 最近变更

本文档仅记录最近几个月的重要变更。完整历史请查看 [archive/FULL-CHANGELOG.md](./archive/FULL-CHANGELOG.md)。

## 2025-11-09

### 彻底移除许可证系统和所有付费墙 ✅

完全清理 n8n 中的许可证系统和所有付费墙组件，使所有功能对用户完全开放。

**移除内容**:
- ✅ **4 个付费墙组件**: EvaluationsPaywall、InsightsPaywall、DebugPaywallModal、CommunityPlusEnrollmentModal
- ✅ **2 个常量文件**: executions.constants.ts、usage.constants.ts
- ✅ **70+ 个翻译键**: 清理所有付费墙相关的多语言文本
- ✅ **600+ 行代码**: 删除不再需要的许可证检查逻辑

**核心修复**:
```typescript
// usage.store.ts - 修复默认值问题
workflowsHavingEvaluations: {
  value: 0,
  limit: -1,  // 改为 -1 表示无限制（原值 0 导致付费墙显示）
}

// 移除所有许可证相关计算属性
// planName, planId, workflowsWithEvaluationsLimit 等全部删除
```

**修改文件清单**（14 个）:

1. **EvaluationsRootView.vue** - 移除 useUsageStore 和付费墙条件渲染
2. **SetupWizard.vue** - 移除配额检查、警告提示和升级按钮
3. **InsightsDashboard.vue** - 移除付费墙组件
4. **InsightsTableWorkflows.vue** - 移除表格模糊遮罩
5. **useExecutionDebugging.ts** - 简化 debug 链接点击处理
6. **Modals.vue** - 移除付费墙模态框注册
7. **ui.store.ts** - 从模态框列表移除付费墙
8. **usage.store.ts** - 清理许可证相关代码（保留基础统计功能）
9. **EvaluationsRootView.test.ts** - 移除配额相关测试
10. **usage.schema.ts** - 添加向后兼容性注释
11-14. **i18n 文件** - en.json、zh.json 及 backup 文件

**功能影响**:

开放的功能（无任何限制）:
- ✅ Evaluations（评估） - 无配额限制
- ✅ Insights（洞察） - 无付费墙
- ✅ Debug（调试） - 所有用户可用
- ✅ 移除强制社区版注册

保留的功能:
- ✅ 工作流触发器使用统计
- ✅ 基础 usage store 功能
- ✅ 后端功能开关（配置控制）

**代码质量**:
- ✅ 所有 lint 错误已修复（由清理导致的）
- ✅ TypeScript 类型检查通过
- ✅ 向后兼容性保持
- ⚠️ 12 个项目原有 lint 问题（与清理无关）

**技术细节**:
```typescript
// 修改前：条件渲染付费墙
<SetupWizard v-if="evaluationsLicensed" @run-test="runTest" />
<EvaluationsPaywall v-else />

// 修改后：直接显示功能
<SetupWizard @run-test="runTest" />
```

**清理统计**:
- 📝 修改文件：14 个
- 🗑️ 删除文件：6 个
- 🧩 删除组件：4 个
- 🌐 删除翻译键：~70 个
- 📉 删除代码行：~600+ 行
- 🧹 清理模块：4 个（Evaluations, Insights, Debug, CommunityPlus）

**执行方式**:
- 🤖 主代理 + 3 个并行子代理
- ⏱️ 执行时间：~30 分钟
- 🎯 影响范围：前端 Vue 组件、Store、i18n 翻译

**最终效果**:
- ✅ 所有功能完全开放，无任何付费墙限制
- ✅ 代码结构更简洁，删除 600+ 行不必要代码
- ✅ 用户体验提升，无注册/升级提示
- ✅ 向后兼容性完整保持

详细报告: `/tmp/paywall-cleanup-summary.md`

---

## 2025-11-07

### 移除 GitHub Star 按钮和 Source Control 功能 ✅

进一步简化界面，移除不必要的第三方集成和企业功能。

**移除内容**:
- ✅ **GitHub Star 按钮**: 完全移除主界面顶部的 GitHub Star 按钮组件
- ✅ **Source Control 功能**: 移除"推送到 Git"工作流集成功能
- ✅ **相关依赖**: 移除 `vue-github-button` 包
- ✅ **UI 元素**: 移除只读环境提示、分支显示等 UI 元素

**具体修改**:

1. **GitHub Star 按钮移除**:
   - 移除 `MainHeader.vue` 中的按钮组件及样式
   - 移除 `vue-github-button` 依赖
   - 清理 localStorage 和 URL 常量

2. **Source Control 功能禁用**:
   - 移除工作流菜单中的"推送到 Git"选项
   - 禁用 `sourceControl.store.ts` 中的企业功能标志
   - 移除源代码控制设置路由（`/environments`）
   - 移除推送/拉取模态框组件
   - 清理所有只读分支相关的 UI 提示

**影响范围**:
- ✅ 主界面顶部：不再显示 GitHub Star 按钮
- ✅ 工作流菜单：移除"推送到 Git"选项
- ✅ 侧边栏：移除分支状态和锁定图标
- ✅ 设置页面：移除"Environments"配置项
- ✅ 所有只读环境提示全部禁用

**修改统计**:
- 📝 修改文件：9 个
- 🗑️ 移除常量：4 个
- 🎨 移除 UI 组件：3 个
- 📦 移除依赖：1 个

**技术细节**:
```typescript
// sourceControl.store.ts - 禁用功能
const isEnterpriseSourceControlEnabled = computed(() => false);

// MainHeader.vue - 移除只读限制
const readOnly = computed(() => false);

// MainSidebar.vue - 移除分支限制
v-if="false && !isCollapsed"  // 原: sourceControlStore.preferences.branchReadOnly
```

**最终效果**:
- ✅ 界面更简洁，无第三方服务按钮
- ✅ 移除企业级源代码控制功能
- ✅ 减少外部依赖和复杂度
- ✅ TypeScript 构建通过，零错误

---

### PostHog 完全移除 + 实验性功能默认启用 ✅

彻底移除了 PostHog 外部分析服务，并将所有实验性功能改为默认启用，实现完全本地化运行。

**核心改动**:
- ✅ **删除 PostHog Store**: 完全移除 `posthog.store.ts` 及所有相关引用
- ✅ **移除外部依赖**: 移除 `posthog-node` 包和前端 PostHog 初始化
- ✅ **实验性功能默认启用**: 7个实验性功能存储全部改为无条件启用

**实验性功能列表** (全部默认启用):
1. ✅ Ready-to-run Workflows（就绪工作流）
2. ✅ AI Templates Starter Collection（AI模板启动集合）
3. ✅ Templates Data Quality（模板质量改进）
4. ✅ Template Recommendations V2/V3（模板推荐）
5. ✅ Command Bar（命令栏功能）
6. ✅ NDV UI Overhaul（NDV界面改进）
7. ✅ Pre-built Agents（预构建AI代理）
8. ✅ Canvas Zoomed View（画布缩放视图）
9. ✅ NDV In-Focus Panel（NDV焦点面板）

**修改统计**:
- 📝 修改文件：25+ 个
- 🗑️ 删除文件：1 个（posthog.store.ts）
- 🔧 实验性存储：7 个
- 🎨 Vue 组件：5 个
- ⚙️ 组合式函数：5 个
- 🧪 测试文件清理：10 个

**技术细节**:
```typescript
// 修改前：依赖 PostHog 远程功能标志
const isFeatureEnabled = computed(() => {
  return posthogStore.getVariant(EXPERIMENT.name) === EXPERIMENT.variant;
});

// 修改后：直接启用
const isFeatureEnabled = computed(() => {
  return true; // Experimental feature enabled by default
});
```

**最终效果**:
- ✅ 前端构建成功，零 TypeScript 错误
- ✅ PostHog 完全移除，无外部数据传输
- ✅ 所有实验性功能立即可用，无需配置
- ✅ 系统完全自主部署，无任何外部服务依赖

详见提交: `feat: 完全移除PostHog并默认启用所有实验性功能`

---

### 前后端分离 WebSocket 连接修复 ✅

修复了前后端分离架构中的关键 WebSocket 连接问题，确保实时推送功能正常工作。

**问题根源**:
- ❌ Vite 代理配置遗漏：`/rest` 端点缺少 `ws: true`
- ❌ 导致 `/rest/push` WebSocket 连接无法建立
- ❌ 表现为"与服务器的连接丢失"、无法执行工作流

**核心修复**:
- ✅ 在 `/rest` 代理中添加 `ws: true` 启用 WebSocket 支持
- ✅ 补充 `/mcp` 和 `/mcp-test` 端点（修复 GitHub issue #17923）
- ✅ 添加完整的 webhook、form 相关端点代理
- ✅ 创建 `.env` 环境变量配置文件

**配置完整性**:
- ✅ 13 个代理端点全部配置（REST、WebSocket、Webhook、Form、MCP、监控）
- ✅ 5 个 WebSocket 端点正确启用（/rest、/push、/webhook*）
- ✅ 环境变量完整配置（VITE_API_BASE_URL、N8N_*）
- ✅ 所有关键端点测试通过

**影响范围**:
- ✅ 实时推送连接：正常工作
- ✅ 工作流执行状态更新：正常
- ✅ 多用户协作同步：正常
- ✅ Webhook 和表单功能：完整支持
- ✅ MCP 功能：已支持

**技术细节**:
```typescript
// vite.config.mts - 关键修复
'/rest': {
  target: 'http://localhost:5678',
  changeOrigin: true,
  ws: true,  // ← 核心修复！
}
```

详见: [packages/frontend/editor-ui/vite.config.mts](../packages/frontend/editor-ui/vite.config.mts)

---

### Telemetry 系统验证与优化 ✅

完成遥测系统与官方 n8n 的全面对比验证，并清理无用字段。

**验证结果**:
- ✅ 功能一致性：100%（所有数据收集逻辑完全相同）
- ✅ 使用方法一致性：99%（调用方式完全一致）
- ✅ 48 个后端事件处理器全部一致
- ✅ 50+ 个前端调用点全部一致
- ✅ 100+ 个事件名称完全相同

**优化内容**:
- ✅ 移除 5 个硬编码的 License 字段（无实际意义）
- ✅ 清理 `serverStarted()` 方法中的假数据
- ✅ 清理 `pulse()` 方法中的硬编码值
- ✅ 代码减少 15 行，数据更精简

**当前状态**:
- ✅ 遥测系统功能与官方完全一致
- ✅ 所有字段都是动态获取的真实数据
- ✅ 数据本地化，完全可控
- ✅ 不向 n8n 官方发送任何数据

详见: [技术概述 - Telemetry 本地化系统](./TECHNICAL-OVERVIEW.md#telemetry-本地化系统)

---

## 2025-11-05

### 前端构建系统修复与优化 ✅

修复了前端构建过程中的 TypeScript 错误和开发环境热重载问题。

**主要修复**:
- ✅ 修复 TypeScript 未使用导入错误（Notice.vue）
- ✅ 修复开发环境热重载无限循环问题（locale 模块）
- ✅ 新增 Telemetry 统计 API（概览、Top 事件、活跃用户）
- ✅ 添加数据库迁移文件：创建 telemetry_event 表

**当前状态**:
- ✅ TypeScript 构建：无错误
- ✅ 开发环境热重载：正常工作
- ✅ 后端/前端服务：正常启动

---

### 前后端分离架构完善 ✅

完成前后端分离架构的全面调整和优化。

**架构调整**:
- ✅ 主应用前端：独立 Vite 服务 (8080) + Vite proxy
- ✅ 管理后台前端：独立 Vite 服务 (5679) + Vite proxy
- ✅ 后端：纯 REST API 服务 (5678)
- ✅ 统一使用 `/rest` 作为 API 端点

**修复内容**:
- ✅ 修复 CSS 变量语法错误（design-system）
- ✅ 修复 Express 路由语法兼容性（path-to-regexp@8.x）
- ✅ 清理冗余配置和文档
- ✅ 构建状态：42/42 包全部通过

---

## 2025-11-04

### 构建系统修复

**依赖版本锁定**:
- ✅ 对比原始 n8n 仓库，发现 8 个依赖版本不匹配
- ✅ 使用 pnpm overrides 精确锁定所有关键依赖
- ✅ 修复 @types/amqplib 版本导致的 RabbitMQ 类型错误
- ✅ 统一 chart.js/vue-chartjs 版本
- ✅ 移除所有临时 @ts-expect-error
- ✅ 构建成功：42/42 包全部通过

---

### Telemetry 独立管理平台

**完成自托管遥测系统**:
- ✅ 实现数据库层（2 个实体 + 1 个迁移）
- ✅ 实现后端模块（Repository + Service + Controller）
- ✅ 恢复前端遥测功能（批量上报 + 持久化 + 重试）
- ✅ 所有遥测数据存储本地数据库
- 🚧 管理界面待开发

---

### 跟踪系统清理

**移除外部分析服务**:
- ✅ 完全移除 CloudPlan Store（云订阅状态）
- ✅ 完全移除 PostHog Store（外部分析）
- ✅ 提取独立 Feature Flags Store（220 行，无外部依赖）
- ✅ 迁移 17 个文件的 Feature Flags 调用

---

### 中文本地化

**完成全面中文化**:
- ✅ 3,795+ 翻译键完整中文化
- ✅ 实现语言切换功能（中文/英文）
- ✅ 设置中文为默认语言
- ✅ 添加语言偏好持久化
- ✅ 优化日期时间本地化

---

## 历史变更

更早期的变更记录请查看：
- [完整更新日志](./archive/FULL-CHANGELOG.md) - 详细的开发历史
- [详细变更说明](./archive/DETAILED-CHANGES.md) - 代码变更和删除内容
- [详细技术说明](./archive/DETAILED-TECHNICAL.md) - 实现策略和代码示例

---

**最后更新**: 2025-11-07
