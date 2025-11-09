# 管理后台快速开始指南

> 快速了解如何访问和使用 n8n 管理后台

---

## 🚀 快速访问

### 启动服务
```bash
# 在项目根目录
pnpm dev
```

### 访问地址
- **管理后台首页**: http://localhost:5678/admin/
- **AI 服务提供商**: http://localhost:5678/admin/ai-providers
- **平台节点管理**: http://localhost:5678/admin/platform-nodes
- **Telemetry 数据**: http://localhost:5678/admin/telemetry/dashboard

---

## 📁 目录结构

```
packages/frontend/admin-panel/
├── src/
│   ├── config/
│   │   └── modules.ts                    # 模块配置
│   ├── modules/
│   │   ├── ai-providers/                 # AI 提供商模块
│   │   │   ├── stores/
│   │   │   │   └── ai-providers.store.ts
│   │   │   ├── views/
│   │   │   │   └── AIProvidersView.vue
│   │   │   └── components/
│   │   │       ├── ProviderDialog.vue
│   │   │       └── ModelConfigEditor.vue
│   │   ├── platform-nodes/               # 平台节点模块
│   │   │   ├── stores/
│   │   │   │   └── platform-nodes.store.ts
│   │   │   ├── views/
│   │   │   │   └── PlatformNodesView.vue
│   │   │   └── components/
│   │   │       └── PlatformNodeDialog.vue
│   │   └── telemetry/                    # Telemetry 模块
│   ├── router/
│   │   └── index.ts                      # 路由配置
│   └── layouts/
│       └── MainLayout.vue                # 主布局（含侧边栏）
```

---

## 🎯 主要功能

### 1. AI 服务提供商管理

#### 功能列表
- ✅ 查看所有 AI 提供商
- ✅ 创建新提供商
- ✅ 编辑提供商配置
- ✅ 启用/禁用提供商
- ✅ 删除提供商
- ✅ 配置模型和定价

#### API 端点
```typescript
GET    /rest/admin/platform-ai-providers          # 获取提供商列表
POST   /rest/admin/platform-ai-providers          # 创建提供商
PATCH  /rest/admin/platform-ai-providers/:key     # 更新提供商
DELETE /rest/admin/platform-ai-providers/:key     # 删除提供商
PATCH  /rest/admin/platform-ai-providers/:key/toggle  # 切换状态
```

#### Store 使用示例
```typescript
import { useAIProvidersStore } from '@/modules/ai-providers/stores/ai-providers.store';

const store = useAIProvidersStore();

// 获取提供商列表
await store.fetchProviders();

// 创建提供商
await store.createProvider({
    providerKey: 'openai',
    providerName: 'OpenAI',
    apiEndpoint: 'https://api.openai.com/v1',
    apiKey: 'sk-xxx',
    modelsConfig: {
        models: [
            {
                id: 'gpt-4',
                name: 'GPT-4',
                description: 'Most capable model',
                pricePerToken: 0.00003,
                currency: 'USD',
                contextWindow: 8192,
                maxOutputTokens: 4096,
                supportsFunctions: true,
                supportsVision: false,
            }
        ]
    },
    enabled: true,
});

// 切换启用状态
await store.toggleProvider('openai', false);
```

---

### 2. 平台节点管理

#### 功能列表

**平台节点 Tab**:
- ✅ 查看所有平台节点
- ✅ 创建官方节点
- ✅ 编辑节点配置
- ✅ 启用/禁用节点
- ✅ 删除节点

**待审核节点 Tab**:
- ✅ 查看待审核提交
- ✅ 批准第三方节点
- ✅ 拒绝第三方节点
- ✅ 添加审核备注

**自定义节点 Tab**:
- 🚧 待实现（占位符）

#### API 端点

**平台节点**:
```typescript
GET    /rest/platform-nodes                      # 获取节点列表
POST   /rest/platform-nodes                      # 创建节点
PATCH  /rest/platform-nodes/:nodeKey             # 更新节点
DELETE /rest/platform-nodes/:nodeKey             # 删除节点
PATCH  /rest/platform-nodes/:nodeKey/toggle      # 切换状态
POST   /rest/platform-nodes/:nodeKey/approve     # 批准节点
POST   /rest/platform-nodes/:nodeKey/reject      # 拒绝节点
GET    /rest/platform-nodes/submissions          # 获取待审核提交
```

**自定义节点**:
```typescript
GET    /rest/custom-nodes                        # 获取自定义节点
POST   /rest/custom-nodes                        # 创建自定义节点
PATCH  /rest/custom-nodes/:nodeId                # 更新自定义节点
DELETE /rest/custom-nodes/:nodeId                # 删除自定义节点
```

#### Store 使用示例
```typescript
import { usePlatformNodesStore } from '@/modules/platform-nodes/stores/platform-nodes.store';

const store = usePlatformNodesStore();

// 获取平台节点
await store.fetchPlatformNodes();

// 创建平台节点
await store.createPlatformNode({
    nodeKey: 'n8n-nodes-base.httpRequest',
    nodeName: 'HTTP Request',
    nodeType: 'official',
    category: 'core',
    billingConfig: {
        type: 'free'
    },
    enabled: true,
});

// 批准待审核节点
await store.approvePlatformNode('custom-node-123', '审核通过，质量良好');

// 拒绝待审核节点
await store.rejectPlatformNode('custom-node-456', '代码质量不符合要求');
```

---

## 🔧 开发指南

### 添加新模块

1. **在 `modules.ts` 中注册模块**:
```typescript
export const modules: AdminModule[] = [
    // ...existing modules
    {
        id: 'new-module',
        name: '新模块',
        icon: 'icon-name',
        path: '/new-module',
        enabled: true,
        description: '模块描述',
    },
];
```

2. **创建模块目录结构**:
```bash
mkdir -p src/modules/new-module/{stores,views,components}
```

3. **创建 Store**:
```typescript
// src/modules/new-module/stores/new-module.store.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNewModuleStore = defineStore('newModule', () => {
    const data = ref([]);
    const loading = ref(false);

    async function fetchData() {
        loading.value = true;
        try {
            const response = await fetch('/rest/api/endpoint', {
                method: 'GET',
                credentials: 'include',
            });
            data.value = await response.json();
        } catch (error) {
            console.error('[NewModule] Fetch error:', error);
        } finally {
            loading.value = false;
        }
    }

    return { data, loading, fetchData };
});
```

4. **创建 View**:
```vue
<!-- src/modules/new-module/views/NewModuleView.vue -->
<script setup lang="ts">
import { onMounted } from 'vue';
import { useNewModuleStore } from '../stores/new-module.store';

const store = useNewModuleStore();

onMounted(async () => {
    await store.fetchData();
});
</script>

<template>
    <div :class="$style.container">
        <h1>新模块</h1>
        <!-- 内容 -->
    </div>
</template>

<style module>
.container {
    padding: var(--spacing--lg);
}
</style>
```

5. **添加路由**:
```typescript
// src/router/index.ts
{
    path: 'new-module',
    name: 'NewModule',
    component: () => import('@/modules/new-module/views/NewModuleView.vue'),
    meta: {
        title: '新模块',
        module: 'new-module',
    },
}
```

---

## 🎨 样式指南

### CSS 变量
使用 CSS 变量保持一致性：

```css
/* 间距 */
padding: var(--spacing--lg);        /* 24px */
margin: var(--spacing--md);         /* 20px */
gap: var(--spacing--sm);            /* 16px */

/* 颜色 */
color: var(--color--text);
background: var(--color--background);
border: var(--border);

/* 圆角 */
border-radius: var(--radius--lg);   /* 8px */

/* 字体 */
font-size: var(--font-size--md);    /* 16px */
font-weight: var(--font-weight--bold);  /* 600 */
```

### 组件使用

**N8n Design System 组件**:
```vue
<N8nButton label="保存" type="primary" @click="handleSave" />
<N8nCard title="卡片标题">内容</N8nCard>
<N8nInput v-model="value" placeholder="请输入" />
```

**Element Plus 组件**:
```vue
<ElTabs v-model="activeTab">
    <ElTabPane label="Tab 1" name="tab1">内容</ElTabPane>
</ElTabs>

<ElSwitch v-model="enabled" />
<ElMessageBox.confirm('确认删除？', '提示', { type: 'warning' });
```

---

## 📊 API 调用模式

### 标准模式
```typescript
async function apiCall() {
    loading.value = true;
    error.value = null;

    try {
        const response = await fetch('/rest/api/endpoint', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
    } catch (e) {
        error.value = e instanceof Error ? e.message : 'Unknown error';
        console.error('[Store] API call failed:', e);
        throw e;
    } finally {
        loading.value = false;
    }
}
```

---

## 🐛 调试技巧

### 1. 检查网络请求
```javascript
// 浏览器开发者工具 -> Network
// 查看 /rest/* 请求
// 检查请求头、响应状态、返回数据
```

### 2. Pinia Devtools
```javascript
// 安装 Vue Devtools
// 查看 Pinia 标签
// 监控 state 变化和 actions 调用
```

### 3. Console 日志
```typescript
console.log('[StoreName] Action:', data);
console.error('[StoreName] Error:', error);
```

---

## ✅ 检查清单

### 功能开发完成
- [ ] Store 已创建并测试
- [ ] View 组件已实现
- [ ] 子组件已创建
- [ ] 路由已配置
- [ ] 模块已在 config 中注册
- [ ] API 调用正常
- [ ] 错误处理完善
- [ ] 加载状态正确

### 代码质量
- [ ] TypeScript 类型完整
- [ ] 使用 CSS 变量
- [ ] 遵循组件命名规范
- [ ] 代码格式化
- [ ] 无 console 警告

### 用户体验
- [ ] 加载状态提示
- [ ] 错误消息友好
- [ ] 响应式设计
- [ ] 操作确认对话框

---

## 📚 相关资源

- [完整迁移报告](./ADMIN_PANEL_MIGRATION_COMPLETE.md)
- [后端 API 文档](./ADMIN_SERVICE_METHODS_REFERENCE.md)
- [Service 层实现](./SERVICE_LAYER_ADMIN_METHODS_IMPLEMENTATION.md)
- [Vue 3 文档](https://vuejs.org/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)

---

**最后更新**: 2025-11-09
