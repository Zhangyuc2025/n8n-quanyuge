# NodeTester 组件使用示例

## editor-ui 版本

### 基本使用

```vue
<template>
  <NodeTester
    :node-definition="nodeDefinition"
    :node-code="nodeCode"
    api-endpoint="/custom-nodes/test"
    @test-result="handleTestResult"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import NodeTester from '@/app/components/shared/NodeTester.vue';

const nodeDefinition = ref({
  displayName: 'My Custom Node',
  name: 'myCustomNode',
  group: ['transform'],
  version: 1,
  description: 'A custom node for testing',
  defaults: {
    name: 'My Custom Node',
  },
  inputs: ['main'],
  outputs: ['main'],
  properties: [
    {
      displayName: 'Input Text',
      name: 'inputText',
      type: 'string',
      default: '',
    },
  ],
});

const nodeCode = ref(`
class MyCustomNode {
  async execute(items) {
    return items.map(item => ({
      json: {
        ...item.json,
        processed: true,
        timestamp: new Date().toISOString()
      }
    }));
  }
}
`);

function handleTestResult(result) {
  if (result.success) {
    console.log('Test passed:', result.output);
  } else {
    console.error('Test failed:', result.error);
  }
}
</script>
```

### API 调用方式

editor-ui 使用 `makeRestApiRequest` 从 `@n8n/rest-api-client` 包：

```typescript
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';

const rootStore = useRootStore();

const response = await makeRestApiRequest(
  rootStore.restApiContext,
  'POST',
  '/custom-nodes/test',
  {
    nodeDefinition: nodeDefinition.value,
    nodeCode: nodeCode.value,
    testInput: [{ json: { name: 'test' } }]
  }
);
```

### UI 组件库

editor-ui 使用 n8n 自定义的设计系统组件：

- `N8nButton` - 按钮组件
- `N8nIcon` - 图标组件
- `N8nText` - 文本组件
- `N8nInput` - 输入组件
- `N8nSelect` / `N8nOption` - 下拉选择
- `N8nNotice` - 通知提示

### 国际化

使用 `useI18n` composable：

```typescript
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
const message = i18n.baseText('nodeTester.runTest');
```

### Toast 通知

使用 `useToast` composable：

```typescript
import { useToast } from '@/app/composables/useToast';

const toast = useToast();

toast.showMessage({
  title: '成功',
  message: '测试完成',
  type: 'success',
});

toast.showError({
  title: '错误',
  message: '测试失败',
});
```

## admin-panel 版本

### 基本使用

```vue
<template>
  <NodeTester
    :node-definition="nodeDefinition"
    :node-code="nodeCode"
    api-endpoint="/platform-nodes/test"
    @test-result="handleTestResult"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import NodeTester from '@/components/shared/NodeTester.vue';

const nodeDefinition = ref({
  // ... 节点定义
});

const nodeCode = ref(`
  // ... 节点代码
`);

function handleTestResult(result) {
  console.log('Test result:', result);
}
</script>
```

### API 调用方式

admin-panel 使用 `adminApiClient` 从 `@n8n/shared` 包：

```typescript
import { adminApiClient } from '@n8n/shared';

const response = await adminApiClient.post('/platform-nodes/test', {
  nodeDefinition: nodeDefinition.value,
  nodeCode: nodeCode.value,
  testInput: [{ json: { name: 'test' } }]
});
```

### UI 组件库

admin-panel 使用 Ant Design Vue：

- `a-button` - 按钮组件
- `a-alert` - 警告提示
- `a-textarea` - 文本域
- `a-select` / `a-select-option` - 下拉选择

### 通知方式

使用 Ant Design Vue 的 `message` API：

```typescript
import { message } from 'ant-design-vue';

message.success('测试完成');
message.error('测试失败');
```

## API 响应格式

两个组件期望后端返回相同格式的响应：

```typescript
interface TestResult {
  success: boolean;
  output?: any[];
  logs: Array<{
    type: 'log' | 'warn' | 'error';
    message: string;
    timestamp: string;
  }>;
  error?: string;
  executionTime: number;
}
```

## 功能差异

| 功能 | admin-panel | editor-ui |
|------|------------|-----------|
| API 客户端 | `adminApiClient` (Axios) | `makeRestApiRequest` |
| UI 组件库 | Ant Design Vue | n8n Design System |
| 通知方式 | `message` API | `useToast` composable |
| 国际化 | 硬编码中文 | `useI18n` |
| 代码编辑器 | 自定义 CodeEditor | Textarea |

## 集成示例

### 在自定义节点编辑页面集成

```vue
<template>
  <div class="custom-node-editor">
    <div class="editor-section">
      <h3>节点定义</h3>
      <!-- 节点定义编辑器 -->
    </div>

    <div class="editor-section">
      <h3>节点代码</h3>
      <!-- 代码编辑器 -->
    </div>

    <div class="editor-section">
      <h3>测试节点</h3>
      <NodeTester
        :node-definition="nodeDefinition"
        :node-code="nodeCode"
        api-endpoint="/custom-nodes/test"
        @test-result="handleTestResult"
      />
    </div>

    <div class="editor-actions">
      <button @click="saveNode">保存节点</button>
    </div>
  </div>
</template>
```
