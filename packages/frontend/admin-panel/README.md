# @n8n/admin-panel

SASA 平台管理后台 - 基于 Vue 3 + Ant Design Vue 构建的深色主题管理界面

## 技术栈

- **框架**: Vue 3.5+ (Composition API)
- **状态管理**: Pinia 2.2+
- **路由**: Vue Router 4.5+
- **UI 组件库**: Ant Design Vue 4.0+
- **构建工具**: Vite 7 (rolldown-vite)
- **图表库**: ECharts 5.4+
- **类型检查**: TypeScript 5.9+

## 项目结构

```
admin-panel/
├── public/              # 静态资源
├── src/
│   ├── main.ts         # 应用入口
│   ├── App.vue         # 根组件
│   ├── router/         # 路由配置
│   │   └── index.ts    # 路由定义 + 守卫
│   ├── stores/         # Pinia 状态管理
│   │   └── adminAuth.store.ts  # 管理员认证
│   ├── views/          # 页面组件
│   │   ├── AdminLoginView.vue       # 登录页
│   │   ├── AdminDashboard.vue       # 仪表板
│   │   ├── PlatformNodesView.vue    # 平台节点管理
│   │   ├── AiProvidersView.vue      # AI 服务商管理
│   │   ├── WorkspacesView.vue       # 工作空间管理
│   │   └── StatisticsView.vue       # 数据统计
│   ├── styles/         # 全局样式
│   │   ├── theme.scss      # 深色主题
│   │   └── variables.scss  # CSS 变量
│   └── types/          # 本地类型定义
│       └── admin.types.ts
├── index.html          # HTML 入口
├── vite.config.ts      # Vite 配置
├── tsconfig.json       # TypeScript 配置
└── package.json        # 依赖管理
```

## 开发

### 安装依赖

```bash
pnpm install --filter @n8n/admin-panel
```

### 启动开发服务器

```bash
# 方式 1: 从 admin-panel 目录
cd packages/frontend/admin-panel
pnpm dev

# 方式 2: 从根目录
pnpm dev:fe:admin
```

开发服务器将运行在 `http://localhost:5679`

### 构建

```bash
pnpm build
```

### 类型检查

```bash
pnpm typecheck
```

## 路由结构

```
/admin
├── /login          # 登录页 (公开)
└── /               # 管理界面 (需认证)
    ├── /dashboard      # 仪表板
    ├── /platform-nodes # 平台节点管理
    ├── /ai-providers   # AI 服务商管理
    ├── /workspaces     # 工作空间管理
    └── /statistics     # 数据统计
```

## 认证机制

- 使用 `adminAuth.store.ts` 管理认证状态
- 路由守卫 (`router.beforeEach`) 自动验证会话
- 会话信息存储在 `localStorage`，默认有效期 8 小时
- 未认证用户自动重定向到登录页

## 共享组件

从 `@n8n/shared` 包导入：

- `AdminLayout` - 管理后台布局组件（侧边栏 + 顶部栏）
- `adminApiClient` - API 请求客户端
- 其他工具函数和类型定义

## CSS 变量

使用自定义 CSS 变量保持深色主题一致性：

```css
/* 背景色 */
--admin-bg-primary: #141414
--admin-bg-secondary: #1f1f1f
--admin-bg-elevated: #262626

/* 文本色 */
--admin-text-primary: rgba(255, 255, 255, 0.85)
--admin-text-secondary: rgba(255, 255, 255, 0.65)

/* 间距 */
--admin-spacing-xs/sm/md/lg/xl

/* 其他变量见 src/styles/variables.scss */
```

## API 集成

后端 API 代理配置：

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:5678',
    changeOrigin: true,
  },
}
```

管理员登录端点：`POST /api/platform-admin/login`

## 注意事项

1. **深色主题**: 所有组件默认使用深色主题，通过 `body.admin-theme` 类应用
2. **独立部署**: 管理后台与主应用分离，使用独立路由和状态管理
3. **权限隔离**: 管理员认证与普通用户认证完全独立
4. **国际化**: 继承主应用的 i18n 配置，默认中文

## 下一步开发

- [ ] 实现平台节点管理功能
- [ ] 实现 AI 服务商管理功能
- [ ] 实现工作空间管理功能
- [ ] 实现数据统计仪表板
- [ ] 添加单元测试
- [ ] 添加 E2E 测试
