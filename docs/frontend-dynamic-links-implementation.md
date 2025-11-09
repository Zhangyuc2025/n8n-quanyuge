# 前端动态链接实现方案

## 概述

实现节点参数中的教学链接从数据库动态获取，支持后台管理员修改。

## 数据流程

```
节点源文件 (Agent.node.ts)
  ↓ 构建时同步
数据库 (platform_node.documentation_config)
  ↓ API 查询
前端 (nodeTypes.store.ts)
  ↓ 参数渲染
用户界面 (显示中文教程链接)
```

## 数据库结构

```json
// platform_node 表的 documentation_config 字段
{
  "primaryDocumentation": [
    {
      "url": "https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/"
    }
  ],
  "tutorialLinks": {
    "quickStart": "https://docs.n8n.io/advanced-ai/intro-tutorial/",
    "exampleWorkflow": "/workflows/templates/1954"
  }
}
```

## 前端实现步骤

### 1. API 层 - 获取节点文档配置

**文件**: `packages/frontend/editor-ui/src/app/api/available-nodes.api.ts`

```typescript
/**
 * 获取节点的文档配置
 */
export async function getNodeDocumentation(nodeKey: string): Promise<NodeDocumentation> {
  const response = await get(`/rest/nodes/${nodeKey}/documentation`);
  return response.data;
}

interface NodeDocumentation {
  documentationUrl: string | null;
  documentationConfig: {
    primaryDocumentation?: Array<{ url: string }>;
    tutorialLinks?: {
      quickStart?: string;
      exampleWorkflow?: string;
    };
    videos?: Array<{ url: string; title: string }>;
  } | null;
}
```

### 2. Store 层 - 缓存文档配置

**文件**: `packages/frontend/editor-ui/src/app/stores/nodeTypes.store.ts`

```typescript
export const useNodeTypesStore = defineStore('nodeTypes', () => {
  // 现有状态
  const nodeTypes = ref<INodeTypeDescription[]>([]);

  // 新增：节点文档配置缓存
  const nodeDocumentations = ref<Map<string, NodeDocumentation>>(new Map());

  /**
   * 获取节点文档配置
   */
  async function getNodeDocumentation(nodeKey: string): Promise<NodeDocumentation | null> {
    // 1. 先从缓存读取
    if (nodeDocumentations.value.has(nodeKey)) {
      return nodeDocumentations.value.get(nodeKey)!;
    }

    // 2. 从 API 获取
    try {
      const doc = await getNodeDocumentation(nodeKey);
      nodeDocumentations.value.set(nodeKey, doc);
      return doc;
    } catch (error) {
      console.error(`Failed to load documentation for node ${nodeKey}:`, error);
      return null;
    }
  }

  /**
   * 替换节点参数中的链接占位符
   */
  function replaceLinkPlaceholders(
    displayName: string,
    nodeKey: string,
  ): string {
    const doc = nodeDocumentations.value.get(nodeKey);
    if (!doc || !doc.documentationConfig) {
      return displayName;
    }

    let result = displayName;
    const { tutorialLinks } = doc.documentationConfig;

    if (tutorialLinks) {
      // 替换 {{tutorialUrl}}
      if (tutorialLinks.quickStart) {
        result = result.replace(/\{\{tutorialUrl\}\}/g, tutorialLinks.quickStart);
      }
      // 替换 {{exampleUrl}}
      if (tutorialLinks.exampleWorkflow) {
        result = result.replace(/\{\{exampleUrl\}\}/g, tutorialLinks.exampleWorkflow);
      }
    }

    return result;
  }

  return {
    nodeTypes,
    nodeDocumentations,
    getNodeDocumentation,
    replaceLinkPlaceholders,
  };
});
```

### 3. 组件层 - 渲染时替换链接

**文件**: `packages/frontend/editor-ui/src/app/components/NodeSettings/NodeSettings.vue`

```vue
<script setup lang="ts">
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { computed, onMounted } from 'vue';

const nodeTypesStore = useNodeTypesStore();
const props = defineProps<{
  node: INode;
}>();

// 加载节点文档配置
onMounted(async () => {
  await nodeTypesStore.getNodeDocumentation(props.node.type);
});

// 渲染参数时替换链接占位符
const processedParameters = computed(() => {
  const nodeType = nodeTypesStore.getNodeType(props.node.type);
  if (!nodeType || !nodeType.properties) return [];

  return nodeType.properties.map((param) => {
    if (param.type === 'callout' && param.displayName) {
      return {
        ...param,
        displayName: nodeTypesStore.replaceLinkPlaceholders(
          param.displayName,
          props.node.type,
        ),
      };
    }
    return param;
  });
});
</script>
```

### 4. 后端 API - 提供文档配置接口

**文件**: `packages/cli/src/controllers/available-nodes.controller.ts`

```typescript
@Get('/:nodeKey/documentation')
async getNodeDocumentation(
  @Param('nodeKey') nodeKey: string,
): Promise<NodeDocumentationResponse> {
  // 1. 从 platform_node 表查询
  const node = await this.platformNodeRepository.findOne({
    where: { nodeKey, sourceType: 'builtin' },
    select: ['documentationUrl', 'documentationConfig'],
  });

  if (!node) {
    throw new OperationalError('Node not found');
  }

  return {
    documentationUrl: node.documentationUrl,
    documentationConfig: node.documentationConfig,
  };
}
```

## 使用示例

### 节点定义（源文件）

```typescript
// Agent.node.ts
{
  displayName: '提示：通过我们的快速<a href="{{tutorialUrl}}" target="_blank">教程</a>了解智能体',
  name: 'aiAgentStarterCallout',
  type: 'callout',
}
```

### 数据库存储

```sql
-- platform_node 表
{
  "node_key": "agent",
  "documentation_config": {
    "tutorialLinks": {
      "quickStart": "https://your-domain.com/docs/ai-agent-tutorial-cn"
    }
  }
}
```

### 前端渲染结果

```html
<div class="callout">
  提示：通过我们的快速<a href="https://your-domain.com/docs/ai-agent-tutorial-cn" target="_blank">教程</a>了解智能体
</div>
```

## 后台管理界面

### 节点文档管理页面

```vue
<template>
  <div class="node-documentation-manager">
    <h2>节点教学链接管理</h2>

    <el-table :data="nodes">
      <el-table-column prop="nodeName" label="节点名称" />
      <el-table-column label="主要文档">
        <template #default="{ row }">
          <el-input v-model="row.documentationUrl" />
        </template>
      </el-table-column>
      <el-table-column label="快速教程">
        <template #default="{ row }">
          <el-input
            v-model="row.documentationConfig.tutorialLinks.quickStart"
            placeholder="教程链接"
          />
        </template>
      </el-table-column>
      <el-table-column label="示例工作流">
        <template #default="{ row }">
          <el-input
            v-model="row.documentationConfig.tutorialLinks.exampleWorkflow"
            placeholder="示例链接"
          />
        </template>
      </el-table-column>
      <el-table-column>
        <template #default="{ row }">
          <el-button @click="saveDocumentation(row)">保存</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
async function saveDocumentation(node: PlatformNode) {
  await platformNodesApi.updateDocumentation(node.nodeKey, {
    documentationUrl: node.documentationUrl,
    documentationConfig: node.documentationConfig,
  });

  ElMessage.success('教学链接已更新');
}
</script>
```

## 优势

1. ✅ **集中管理**: 所有教学链接在数据库统一管理
2. ✅ **灵活修改**: 管理员可在后台随时修改，无需重新构建
3. ✅ **中文化支持**: 可轻松替换为中文教程链接
4. ✅ **版本控制**: 不同版本的节点可以有不同的教学链接
5. ✅ **多语言**: 未来可支持多语言切换

## 注意事项

1. **占位符格式**: 使用 `{{variableName}}` 格式
2. **默认值**: 节点定义中保留默认链接（数据库为空时使用）
3. **缓存策略**: 前端缓存文档配置，减少API调用
4. **性能优化**: 可在节点列表加载时批量预取文档配置

## 实施优先级

- **P0**: 后端 API 接口
- **P0**: 同步脚本提取链接
- **P1**: 前端 Store 层实现
- **P1**: 组件层链接替换
- **P2**: 后台管理界面

## 下一步

1. ✅ 已完成节点定义中添加 tutorialLinks
2. ✅ 已完成同步脚本链接提取逻辑
3. ⏳ 实现后端 API 接口
4. ⏳ 实现前端动态替换逻辑
5. ⏳ 创建后台管理界面
