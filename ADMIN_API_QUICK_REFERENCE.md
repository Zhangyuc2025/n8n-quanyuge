# 管理员API快速参考

## 如何使用Admin Store

### 在Vue组件中导入

```typescript
import { useAdminStore } from '@/app/stores/admin.store';

// 在setup()中使用
const adminStore = useAdminStore();
```

## API使用示例

### AI提供商管理

```typescript
// 获取所有AI提供商
await adminStore.fetchAIProviders();

// 获取活跃的AI提供商
const activeProviders = adminStore.activeAIProviders;

// 创建新的AI提供商
await adminStore.createAIProvider({
  providerKey: 'openai',
  providerName: 'OpenAI',
  apiEndpoint: 'https://api.openai.com/v1',
  apiKey: 'sk-xxx',
  modelsConfig: {
    models: [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Most capable GPT-4 model',
        pricePerToken: 0.00003,
        currency: 'USD',
        contextWindow: 8192,
        maxOutputTokens: 4096,
        supportsFunctions: true,
        supportsVision: false,
      }
    ]
  },
  enabled: true
});

// 更新AI提供商
await adminStore.updateAIProvider('openai', {
  enabled: true,
  modelsConfig: { /* updated config */ }
});

// 启用/禁用AI提供商
await adminStore.toggleAIProvider('openai', false);

// 删除AI提供商
await adminStore.deleteAIProvider('openai');
```

### 平台节点管理

```typescript
// 获取所有平台节点
await adminStore.fetchPlatformNodes();

// 获取待审核的节点
const pending = adminStore.pendingPlatformNodes;

// 获取已审核通过的节点
const approved = adminStore.approvedPlatformNodes;

// 审核通过节点
await adminStore.approvePlatformNode('my-custom-node', '审核通过');

// 拒绝节点
await adminStore.rejectPlatformNode('my-custom-node', '不符合要求');

// 启用/禁用节点
await adminStore.togglePlatformNode('my-custom-node', true);

// 创建平台节点
await adminStore.createPlatformNode({
  nodeKey: 'my-node',
  nodeName: 'My Node',
  nodeType: 'platform',
  nodeDefinition: { /* node definition */ },
  category: 'productivity',
  description: 'A custom node',
});

// 删除平台节点
await adminStore.deletePlatformNode('my-node');
```

### 自定义节点管理

```typescript
// 获取工作空间的自定义节点
const workspaceId = 'workspace-123';
await adminStore.fetchCustomNodes(workspaceId);

// 获取待审核的自定义节点
const pendingCustom = adminStore.pendingCustomNodes;

// 创建自定义节点
await adminStore.createCustomNode({
  workspaceId: 'workspace-123',
  nodeKey: 'my-custom-node',
  nodeName: 'My Custom Node',
  nodeDefinition: { /* definition */ },
  nodeCode: 'class MyNode { /* code */ }',
  configMode: 'team',
  category: 'custom',
});

// 更新自定义节点
await adminStore.updateCustomNode('node-id', workspaceId, {
  nodeName: 'Updated Name',
});

// 更新共享配置
await adminStore.updateCustomNodeSharedConfig('node-id', workspaceId, {
  apiKey: 'xxx',
  endpoint: 'https://api.example.com'
});

// 启用/禁用自定义节点
await adminStore.toggleCustomNode('node-id', workspaceId, false);

// 删除自定义节点
await adminStore.deleteCustomNode('node-id', workspaceId);
```

### 错误处理

```typescript
try {
  await adminStore.fetchAIProviders();
} catch (error) {
  console.error('Failed to fetch providers:', error);
  // 错误信息也会自动存储在 adminStore.error
  console.log('Store error:', adminStore.error);
}

// 清除错误
adminStore.clearError();
```

### 加载状态

```typescript
// 检查是否正在加载
if (adminStore.isLoading) {
  console.log('Loading...');
}

// 在模板中使用
<template>
  <div v-if="adminStore.isLoading">Loading...</div>
  <div v-else>{{ adminStore.aiProviders }}</div>
</template>
```

## 完整的Vue组件示例

```vue
<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useAdminStore } from '@/app/stores/admin.store';

const adminStore = useAdminStore();

// 计算属性
const providers = computed(() => adminStore.activeAIProviders);
const isLoading = computed(() => adminStore.isLoading);
const error = computed(() => adminStore.error);

// 生命周期钩子
onMounted(async () => {
  try {
    await adminStore.fetchAIProviders();
  } catch (e) {
    console.error('Failed to load providers:', e);
  }
});

// 方法
async function handleToggleProvider(providerKey: string, enabled: boolean) {
  try {
    await adminStore.toggleAIProvider(providerKey, enabled);
  } catch (e) {
    console.error('Failed to toggle provider:', e);
  }
}

async function handleDeleteProvider(providerKey: string) {
  if (confirm('Are you sure you want to delete this provider?')) {
    try {
      await adminStore.deleteAIProvider(providerKey);
    } catch (e) {
      console.error('Failed to delete provider:', e);
    }
  }
}
</script>

<template>
  <div class="admin-panel">
    <h1>AI Provider Management</h1>

    <div v-if="isLoading" class="loading">
      Loading...
    </div>

    <div v-else-if="error" class="error">
      Error: {{ error }}
      <button @click="adminStore.clearError()">Clear</button>
    </div>

    <div v-else class="providers-list">
      <div v-for="provider in providers" :key="provider.id" class="provider-card">
        <h3>{{ provider.providerName }}</h3>
        <p>{{ provider.providerKey }}</p>
        <p>Status: {{ provider.enabled ? 'Enabled' : 'Disabled' }}</p>

        <button @click="handleToggleProvider(provider.providerKey, !provider.enabled)">
          {{ provider.enabled ? 'Disable' : 'Enable' }}
        </button>

        <button @click="handleDeleteProvider(provider.providerKey)">
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-panel {
  padding: var(--spacing--lg);
}

.loading, .error {
  padding: var(--spacing--md);
  border-radius: var(--radius);
}

.error {
  background-color: var(--color--danger--tint-4);
  color: var(--color--danger);
}

.providers-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing--md);
}

.provider-card {
  padding: var(--spacing--md);
  border: var(--border);
  border-radius: var(--radius);
  background-color: var(--color--background);
}

button {
  margin-right: var(--spacing--xs);
  padding: var(--spacing--xs) var(--spacing--sm);
  border-radius: var(--radius);
  cursor: pointer;
}
</style>
```

## Store状态结构

```typescript
{
  // AI提供商
  aiProviders: AdminAIProvider[],
  selectedAIProvider: AdminAIProvider | null,

  // 平台节点
  platformNodes: AdminPlatformNode[],
  selectedPlatformNode: AdminPlatformNode | null,

  // 自定义节点
  customNodes: AdminCustomNode[],
  selectedCustomNode: AdminCustomNode | null,

  // 通用状态
  loading: boolean,
  error: string | null,
}
```

## 计算属性（Getters）

```typescript
// AI提供商
activeAIProviders     // 已启用的AI提供商
inactiveAIProviders   // 未启用的AI提供商

// 平台节点
pendingPlatformNodes    // 待审核的平台节点
approvedPlatformNodes   // 已审核通过的平台节点
rejectedPlatformNodes   // 已拒绝的平台节点
activePlatformNodes     // 已启用的平台节点

// 自定义节点
pendingCustomNodes      // 待审核的自定义节点

// 通用
isLoading              // 是否正在加载
hasError               // 是否有错误
```

## 权限要求

所有管理员API都需要 `global:admin` 权限。在使用这些API之前，请确保：

1. 用户已登录
2. 用户具有管理员角色
3. 可以通过路由守卫或组件内部检查来验证权限

示例权限检查：

```typescript
import { useUsersStore } from '@/app/stores/users.store';

const usersStore = useUsersStore();
const isAdmin = computed(() => usersStore.currentUser?.role?.slug === 'global:admin');

// 在模板中
<template>
  <div v-if="isAdmin">
    <!-- 管理员功能 -->
  </div>
  <div v-else>
    <p>You don't have permission to access this page.</p>
  </div>
</template>
```

## 注意事项

1. **错误处理**: 所有API调用都应该包含try-catch块
2. **加载状态**: 使用`isLoading`计算属性来显示加载指示器
3. **状态更新**: Store会自动更新本地状态，无需手动刷新
4. **类型安全**: 所有API都有完整的TypeScript类型定义
5. **权限验证**: 后端会验证管理员权限，前端也应该添加UI级别的权限检查
