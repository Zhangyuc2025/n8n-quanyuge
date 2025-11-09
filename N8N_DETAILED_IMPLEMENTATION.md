# n8n 详细实现指南

## 目录
1. [前端编辑器详细流程](#前端编辑器详细流程)
2. [节点参数系统](#节点参数系统)
3. [表达式引擎](#表达式引擎)
4. [HTTP 请求节点详解](#http-请求节点详解)
5. [调试技巧](#调试技巧)

---

## 前端编辑器详细流程

### 1. 编辑器初始化

#### 页面路由和加载

```typescript
// 路由定义
{
  path: '/workflows/:id/edit',
  component: () => import('@/app/views/NodeView.vue'),
  name: VIEWS.WORKFLOW,
}

// NodeView.vue 挂载流程
onMounted(async () => {
  // 1. 从 URL 获取工作流 ID
  const workflowId = route.params.id;
  
  // 2. 加载工作流数据
  const workflowData = await workflowsApi.getWorkflow(workflowId);
  workflowsStore.setWorkflow(workflowData);
  
  // 3. 确保节点类型已加载
  if (!nodeTypesStore.allLatestNodeTypes.length) {
    await nodeTypesStore.fetchNodeTypes();
  }
  
  // 4. 创建 Workflow 对象（用于表达式计算）
  const workflowObject = new Workflow({
    nodes: workflowData.nodes,
    connections: workflowData.connections,
  });
  
  // 5. 挂载 Canvas
  canvasReady.value = true;
});
```

#### Canvas 组件加载

```vue
<!-- NodeView.vue 模板 -->
<template>
  <div class="node-view">
    <!-- 顶部导航 -->
    <MainHeader />
    
    <!-- 左侧边栏 -->
    <MainSidebar />
    
    <!-- Canvas 主区域 -->
    <WorkflowCanvas
      v-if="canvasReady"
      :workflow="currentWorkflow"
      :workflowObject="workflowObject"
      @nodeSelected="onNodeSelected"
      @connectionCreated="onConnectionCreated"
    />
    
    <!-- 右侧面板：节点详情视图 (NDV) -->
    <NDVPanel
      v-if="selectedNode"
      :node="selectedNode"
      @parameterChanged="onParameterChanged"
      @credentialSelected="onCredentialSelected"
    />
    
    <!-- 节点创建面板 -->
    <NodeCreator
      v-if="showNodeCreator"
      @nodeTypeSelected="onNodeTypeSelected"
    />
  </div>
</template>

<script setup lang="ts">
const canvasReady = ref(false);
const selectedNode = ref<INodeUi | null>(null);
const showNodeCreator = ref(false);

const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();

const currentWorkflow = computed(() => 
  workflowsStore.workflows[route.params.id]
);

onMounted(async () => {
  // ... 初始化代码
  canvasReady.value = true;
});
</script>
```

### 2. Canvas 节点渲染

#### WorkflowCanvas 组件

```vue
<!-- WorkflowCanvas.vue -->
<script setup lang="ts">
import { useVueFlow } from '@vue-flow/core';
import { useCanvasMapping } from '../composables/useCanvasMapping';

const props = defineProps<{
  workflow: IWorkflowDb;
  workflowObject: Workflow;
}>();

// 使用 Vue Flow
const { nodes, edges } = useVueFlow('canvas');

// 映射 n8n 数据到 Vue Flow
const { nodes: mappedNodes, connections: mappedConnections } = 
  useCanvasMapping({
    nodes: computed(() => props.workflow.nodes),
    connections: computed(() => props.workflow.connections),
    workflowObject: toRef(props, 'workflowObject'),
  });

// 监听映射结果，更新 Vue Flow
watch(mappedNodes, (newNodes) => {
  nodes.value = newNodes;
}, { deep: true });

watch(mappedConnections, (newConnections) => {
  edges.value = newConnections;
}, { deep: true });
</script>

<template>
  <VueFlow @connect="onConnect" @pane-click="onPaneClick">
    <!-- 背景网格 -->
    <CanvasBackground />
    
    <!-- 节点（由 Vue Flow 自动渲染） -->
    <template #default>
      <CanvasNode
        v-for="node in nodes"
        :key="node.id"
        :node="node"
        @click="$emit('nodeSelected', node)"
      />
    </template>
    
    <!-- 连接线（由 Vue Flow 自动渲染） -->
    
    <!-- 控制按钮 -->
    <CanvasControlButtons
      :isRunning="isExecuting"
      @run="onRunWorkflow"
      @stop="onStopExecution"
    />
  </VueFlow>
</template>
```

#### Canvas 节点组件

```vue
<!-- CanvasNode.vue -->
<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';

const props = defineProps<{
  data: CanvasNodeData;
  selected: boolean;
}>();

const emit = defineEmits<{
  'parameter-change': [paramName: string, value: unknown];
  'credential-change': [credentialType: string];
}>();

const nodeType = computed(() => {
  const types = useNodeTypesStore();
  return types.getByNameAndVersion(props.data.type, props.data.typeVersion);
});

// 节点运行状态
const runData = computed(() => {
  const store = useWorkflowsStore();
  return store.getNodeRunData(props.data.id);
});

// 错误状态
const hasError = computed(() => runData.value?.error);
const isExecuting = computed(() => runData.value?.status === 'running');
</script>

<template>
  <div
    :class="[
      'canvas-node',
      { 'canvas-node--selected': selected },
      { 'canvas-node--error': hasError },
      { 'canvas-node--executing': isExecuting },
    ]"
    @click="$emit('select')"
    @contextmenu="$emit('contextmenu')"
  >
    <!-- 输入连接点 -->
    <Handle
      type="target"
      position="Position.Top"
      @connect="onInputConnect"
    />
    
    <!-- 节点内容 -->
    <div class="canvas-node__content">
      <!-- 节点图标 -->
      <img
        :src="nodeType.icon"
        :alt="nodeType.displayName"
        class="canvas-node__icon"
      />
      
      <!-- 节点名称 -->
      <div class="canvas-node__name">{{ data.name }}</div>
      
      <!-- 执行状态图标 -->
      <div v-if="isExecuting" class="canvas-node__spinner" />
      <div v-else-if="hasError" class="canvas-node__error-icon" />
    </div>
    
    <!-- 输出连接点 -->
    <Handle
      type="source"
      position="Position.Bottom"
      @connect="onOutputConnect"
    />
    
    <!-- 错误提示 -->
    <Tooltip v-if="hasError" :content="runData.error.message" />
  </div>
</template>

<style scoped>
.canvas-node {
  padding: 12px;
  border-radius: 8px;
  background: var(--color--foreground);
  border: 2px solid var(--color--foreground--shade-1);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 160px;
  text-align: center;
}

.canvas-node--selected {
  border-color: var(--color--primary);
  box-shadow: 0 0 0 2px rgba(var(--color--primary--rgb), 0.2);
}

.canvas-node--error {
  border-color: var(--color--danger);
}

.canvas-node--executing {
  opacity: 0.8;
}

.canvas-node__icon {
  width: 32px;
  height: 32px;
  margin-bottom: 8px;
}

.canvas-node__spinner {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 12px;
  height: 12px;
  border: 2px solid var(--color--primary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
```

### 3. 节点选择和参数编辑

#### NDV（Node Details View）面板

```vue
<!-- NDVPanel.vue -->
<script setup lang="ts">
import { watch } from 'vue';

const props = defineProps<{
  node: INodeUi;
}>();

const emit = defineEmits<{
  'parameter-change': [paramName: string, value: unknown];
  'credential-selected': [credentialType: string, credentialId: string];
}>();

const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const credentialsStore = useCredentialsStore();

// 获取节点类型定义
const nodeType = computed(() =>
  nodeTypesStore.getByNameAndVersion(
    props.node.type,
    props.node.typeVersion,
  )
);

// 获取节点参数值
const nodeParameters = computed(
  () => props.node.parameters
);

// 处理参数变更
const onParameterChange = (paramName: string, value: unknown) => {
  // 1. 更新 store 中的参数
  workflowsStore.updateNodeParameter(
    props.node.id,
    paramName,
    value,
  );
  
  // 2. 清除该节点的运行数据（参数变更则需要重新运行）
  workflowsStore.clearNodeRunData(props.node.id);
  
  // 3. 发出事件
  emit('parameter-change', paramName, value);
};

// 处理凭证选择
const onCredentialSelect = (credentialType: string, credentialId: string) => {
  workflowsStore.updateNodeCredential(
    props.node.id,
    credentialType,
    credentialId,
  );
  
  emit('credential-selected', credentialType, credentialId);
};
</script>

<template>
  <div class="ndv-panel">
    <!-- 标签页 -->
    <div class="ndv-tabs">
      <button
        v-for="tab in ['Inputs', 'Settings', 'Outputs']"
        :key="tab"
        :class="['ndv-tab', { 'ndv-tab--active': activeTab === tab }]"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>
    
    <!-- 内容区域 -->
    <div class="ndv-content">
      <!-- 设置标签页 -->
      <div v-if="activeTab === 'Settings'" class="ndv-settings">
        <!-- 节点名称 -->
        <div class="ndv-section">
          <label>Node Name</label>
          <input
            :value="node.name"
            @input="workflowsStore.renameNode(node.id, $event.target.value)"
          />
        </div>
        
        <!-- 凭证选择 -->
        <div
          v-for="credentialType in nodeType.credentials"
          :key="credentialType.name"
          class="ndv-section"
        >
          <label>{{ credentialType.displayName }}</label>
          <div class="credential-selector">
            <!-- 下拉框：选择现有凭证 -->
            <select
              :value="node.credentials?.[credentialType.name]?.id || ''"
              @change="onCredentialSelect(credentialType.name, $event.target.value)"
            >
              <option value="">-- Select credential --</option>
              <option
                v-for="cred in getCredentialsOfType(credentialType.name)"
                :key="cred.id"
                :value="cred.id"
              >
                {{ cred.name }}
              </option>
            </select>
            
            <!-- 按钮：创建新凭证 -->
            <button @click="openCreateCredentialModal(credentialType)">
              + Create
            </button>
          </div>
        </div>
        
        <!-- 节点参数 -->
        <div class="ndv-parameters">
          <NodeParameter
            v-for="param in nodeType.properties"
            :key="param.name"
            :param="param"
            :value="nodeParameters[param.name]"
            :node-data="node"
            @change="onParameterChange"
          />
        </div>
      </div>
      
      <!-- 输出标签页 -->
      <div v-else-if="activeTab === 'Outputs'" class="ndv-outputs">
        <div v-if="node.runData?.data?.main">
          <!-- 显示节点输出数据 -->
          <pre>{{ JSON.stringify(node.runData.data.main, null, 2) }}</pre>
        </div>
        <div v-else class="ndv-empty">
          No output data. Run the workflow to see results.
        </div>
      </div>
    </div>
  </div>
</template>
```

#### 节点参数组件

```vue
<!-- NodeParameter.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import type { INodeProperties, INode } from 'n8n-workflow';

const props = defineProps<{
  param: INodeProperties;
  value: unknown;
  nodeData: INode;
}>();

const emit = defineEmits<{
  change: [paramName: string, value: unknown];
}>();

const workflowsStore = useWorkflowsStore();

// 检查参数是否应该显示
const shouldDisplay = computed(() => {
  if (!props.param.displayOptions) return true;
  
  const { show, hide } = props.param.displayOptions;
  
  if (show) {
    // 检查 show 条件是否满足
    for (const [key, values] of Object.entries(show)) {
      const paramValue = props.nodeData.parameters[key];
      if (!values.includes(paramValue)) return false;
    }
  }
  
  if (hide) {
    // 检查 hide 条件是否满足
    for (const [key, values] of Object.entries(hide)) {
      const paramValue = props.nodeData.parameters[key];
      if (values.includes(paramValue)) return false;
    }
  }
  
  return true;
});

// 动态加载选项（如模型列表）
const loadOptions = computed(() => {
  if (!props.param.typeOptions?.loadOptions) return null;
  return props.param.typeOptions.loadOptions;
});

const loadedOptions = ref([]);

const loadDynamicOptions = async () => {
  if (!loadOptions.value) return;
  
  // 调用后端 API 获取选项
  const response = await nodeTypesApi.getNodeOptions({
    nodeName: props.nodeData.type,
    paramName: props.param.name,
  });
  
  loadedOptions.value = response;
};

onMounted(() => {
  if (loadOptions.value) {
    loadDynamicOptions();
  }
});
</script>

<template>
  <div v-if="shouldDisplay" class="node-parameter">
    <!-- 参数标签 -->
    <label :for="`param-${param.name}`" class="node-parameter__label">
      {{ param.displayName }}
      <span v-if="param.required" class="required">*</span>
    </label>
    
    <!-- 参数描述 -->
    <p v-if="param.description" class="node-parameter__description">
      {{ param.description }}
    </p>
    
    <!-- 参数输入组件（根据类型自动选择） -->
    <component
      :is="getParameterComponent(param.type)"
      :id="`param-${param.name}`"
      :key="param.name"
      :param="param"
      :value="value"
      :loaded-options="loadedOptions"
      @input="emit('change', param.name, $event)"
    />
  </div>
</template>

<style scoped>
.node-parameter {
  margin-bottom: 16px;
}

.node-parameter__label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
}

.node-parameter__description {
  font-size: 12px;
  color: var(--color--text--tint-1);
  margin-bottom: 8px;
}

.required {
  color: var(--color--danger);
}
</style>
```

---

## 节点参数系统

### 1. 参数类型详解

```typescript
// INodeProperties 中支持的参数类型

interface INodeProperties {
  // 基础字段
  displayName: string;      // UI 显示名称
  name: string;             // 参数唯一标识符
  type: ParameterType;      // 参数类型
  description?: string;     // 参数描述
  default?: any;            // 默认值
  required?: boolean;       // 是否必需
  
  // 类型特定选项
  typeOptions?: {
    // 字符串/数字选项
    password?: boolean;           // 隐藏输入
    rows?: number;               // 文本区行数
    multiLine?: boolean;         // 多行文本
    minValue?: number;           // 最小值
    maxValue?: number;           // 最大值
    numberPrecision?: number;    // 小数精度
    
    // 选项选择器
    loadOptions?: {               // 动态加载选项
      routing: IRequestRouting;  // HTTP 请求配置
    };
    multipleValues?: boolean;     // 允许多个值
    
    // 日期/时间
    clearable?: boolean;          // 显示清除按钮
    
    // 资源定位符
    resourceLocatorTypes?: string[];  // 支持的资源定位符类型
  };
  
  // 选项列表（下拉/单选）
  options?: Array<{
    name: string;              // UI 显示名称
    value: string | number;    // 实际值
    description?: string;      // 选项描述
    action?: string;           // 操作描述
  }>;
  
  // 条件显示
  displayOptions?: {
    show?: { [key: string]: (string | number)[] };    // 显示条件
    hide?: { [key: string]: (string | number)[] };    // 隐藏条件
  };
  
  // HTTP 路由（用于 HTTP 节点）
  routing?: IRequestRouting;
  
  // 集合和固定集合（复杂结构）
  values?: INodeProperties[];   // 嵌套属性
}

// 支持的参数类型
type ParameterType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'options'
  | 'collection'
  | 'fixedCollection'
  | 'resourceLocator'
  | 'resourceMapper'
  | 'dateTime'
  | 'hidden'
  | 'notice'
  | 'json'
  | 'table';
```

### 2. 条件显示示例

```typescript
// OpenAI 节点参数示例

export const chatOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: ['chat'],  // 仅在 resource 为 'chat' 时显示
      },
    },
    options: [
      { name: 'Complete', value: 'complete' },
    ],
    default: 'complete',
  },
];

export const chatFields: INodeProperties[] = [
  {
    displayName: 'Model',
    name: 'model',
    type: 'options',
    displayOptions: {
      show: {
        resource: ['chat'],
        operation: ['complete'],  // 同时满足两个条件
      },
    },
    typeOptions: {
      loadOptions: {
        routing: {
          request: {
            method: 'GET',
            url: '/v1/models',
          },
          output: {
            postReceive: [
              {
                type: 'rootProperty',
                properties: {
                  propName: 'data',  // API 响应中包含 'data' 字段
                },
              },
            ],
          },
        },
      },
    },
    default: 'gpt-4',
  },
  {
    displayName: 'Prompt',
    name: 'prompt',
    type: 'string',
    typeOptions: {
      rows: 4,  // 显示为 4 行的文本区
      multiLine: true,
    },
    default: '',
    description: 'The prompt for the model',
    displayOptions: {
      show: {
        resource: ['chat'],
        operation: ['complete'],
      },
    },
  },
];
```

### 3. 集合参数（Collection）

```typescript
// 例如：Google Sheets 批量操作

{
  displayName: 'Rows',
  name: 'rows',
  type: 'fixedCollection',
  typeOptions: {
    multipleValues: true,  // 允许多行
  },
  default: { values: [{ row: '' }] },
  placeholder: 'Click to add a row',
  options: [
    {
      displayName: 'Row',
      name: 'values',
      values: [
        {
          displayName: 'Data',
          name: 'data',
          type: 'json',
          default: '{}',
          description: 'Row data as JSON',
        },
      ],
    },
  ],
}

// 前端生成的参数值结构：
{
  "rows": {
    "values": [
      { "data": { "name": "John", "age": 30 } },
      { "data": { "name": "Jane", "age": 28 } },
    ]
  }
}
```

---

## 表达式引擎

### 1. 表达式语法

n8n 支持一种强大的表达式语言，用于动态参数值：

```javascript
// 基本变量访问
{{ $node.HttpRequest.data }}        // 获取 HttpRequest 节点的输出
{{ $parameter.prompt }}              // 获取当前节点的参数

// 数组和对象访问
{{ $node.HttpRequest.data[0].id }}
{{ $input.item.json.name }}

// 函数调用
{{ $node.HttpRequest.data[0].id.toUpperCase() }}
{{ $input.item.json.items.map(item => item.name).join(', ') }}

// 条件表达式
{{ $node.HttpRequest.data.length > 0 ? $node.HttpRequest.data[0].name : 'No data' }}

// 对象构造
{{ { name: $parameter.name, id: $input.item.json.id } }}

// 数组构造
{{ [$node.Start.data, ...previousResults] }}

// 内置函数
{{ $now }}                           // 当前时间戳
{{ $today }}                         // 当前日期
{{ JSON.stringify($input.all()) }}   // 序列化所有输入
{{ $env.ENV_VAR_NAME }}             // 环境变量

// 多项操作 (当节点接收多个输入项时)
{{ $input.item.json.name }}         // 当前处理项的名称
{{ $input.all() }}                  // 所有输入项
{{ $input.all()[0].json.id }}       // 第一个输入项的 ID
```

### 2. 表达式上下文对象

```typescript
// 表达式计算时的可用对象

interface ExpressionContext {
  // 节点输出数据
  $node: {
    [nodeName: string]: {
      data: INodeExecutionData[];    // 节点的主输出
      [outputType: string]: any;     // 其他输出（如 binary）
    };
  };
  
  // 当前节点参数
  $parameter: {
    [paramName: string]: any;
  };
  
  // 输入数据
  $input: {
    item: INodeExecutionData;        // 当前处理项
    all: () => INodeExecutionData[]; // 所有输入项
  };
  
  // 环境变量
  $env: {
    [varName: string]: string;
  };
  
  // 特殊变量
  $now: number;                      // 当前时间戳 (ms)
  $today: string;                    // 当前日期 (YYYY-MM-DD)
  
  // JSON 对象（全局）
  JSON: JSONObject;
  
  // 数学对象（全局）
  Math: MathObject;
  
  // 其他工具函数
  $secret: (name: string) => string; // 访问密钥
  $base64: {
    encode: (str: string) => string;
    decode: (str: string) => string;
  };
}
```

### 3. 表达式计算实现

```typescript
// 前端表达式计算

class ExpressionEvaluator {
  evaluate(
    expression: string,
    context: ExpressionContext,
  ): unknown {
    // 1. 解析表达式（提取 {{ }} 中的内容）
    const match = expression.match(/^\{\{(.*)\}\}$/);
    if (!match) return expression;  // 不是表达式
    
    const code = match[1];
    
    // 2. 创建安全的执行环境（沙箱）
    const sandbox = this.createSandbox(context);
    
    // 3. 编译和执行
    try {
      const func = new Function(...Object.keys(sandbox), `return ${code}`);
      return func(...Object.values(sandbox));
    } catch (error) {
      console.error('Expression evaluation error:', error);
      throw new ExpressionError(error.message, code);
    }
  }
  
  private createSandbox(context: ExpressionContext) {
    return {
      // 注入上下文变量
      $node: context.$node,
      $parameter: context.$parameter,
      $input: context.$input,
      $env: context.$env,
      $now: context.$now,
      $today: context.$today,
      
      // 注入全局对象
      JSON,
      Math,
      
      // 注入工具函数
      Object,
      Array,
      String,
      Number,
      Boolean,
    };
  }
}
```

### 4. 后端表达式计算

```typescript
// 后端在执行节点前计算表达式

class ExecutionContextBase implements IExecuteFunctions {
  async evaluateExpression(
    expression: string,
    itemIndex: number,
  ): Promise<unknown> {
    const context = {
      // 构建节点数据对象
      $node: this.buildNodeData(),
      $parameter: this.nodeParameters,
      $input: this.getInputData()[itemIndex],
      $env: process.env,
      $now: Date.now(),
      $today: new Date().toISOString().split('T')[0],
      
      JSON,
      Math,
    };
    
    // 使用 eval 或沙箱执行（后端可以更信任，但仍需要安全）
    const func = new Function(
      ...Object.keys(context),
      `return ${expression}`,
    );
    
    return func(...Object.values(context));
  }
  
  private buildNodeData() {
    const nodeData: Record<string, any> = {};
    
    for (const node of this.workflow.getNodes()) {
      const runData = this.executionData.resultData.runData[node.id];
      if (runData) {
        nodeData[node.name] = {
          data: runData.data?.main || [],
          // 其他输出类型...
        };
      }
    }
    
    return nodeData;
  }
}
```

---

## HTTP 请求节点详解

### 1. HTTP 节点参数配置

```typescript
// HTTP 节点完整参数结构

{
  displayName: 'Method',
  name: 'requestMethod',
  type: 'options',
  options: [
    { name: 'GET', value: 'GET' },
    { name: 'POST', value: 'POST' },
    { name: 'PATCH', value: 'PATCH' },
    { name: 'PUT', value: 'PUT' },
    { name: 'DELETE', value: 'DELETE' },
    { name: 'HEAD', value: 'HEAD' },
    { name: 'OPTIONS', value: 'OPTIONS' },
  ],
  default: 'GET',
}

{
  displayName: 'URL',
  name: 'url',
  type: 'string',
  default: '',
  placeholder: 'https://api.example.com/users',
  description: 'The URL to send the request to. Supports expressions.',
  required: true,
}

{
  displayName: 'Headers',
  name: 'headers',
  type: 'fixedCollection',
  typeOptions: {
    multipleValues: true,
  },
  default: { values: [] },
  options: [
    {
      displayName: 'Header',
      name: 'values',
      values: [
        {
          displayName: 'Name',
          name: 'name',
          type: 'string',
          default: '',
        },
        {
          displayName: 'Value',
          name: 'value',
          type: 'string',
          default: '',
        },
      ],
    },
  ],
}

{
  displayName: 'Body',
  name: 'requestBody',
  type: 'json',
  default: '{}',
  typeOptions: {
    rows: 4,
  },
  description: 'Request body as JSON',
  displayOptions: {
    show: {
      requestMethod: ['POST', 'PATCH', 'PUT'],
    },
  },
}
```

### 2. HTTP 节点执行

```typescript
// HTTP 节点类

export class HttpRequestNode implements INodeType {
  description: INodeTypeDescription = {
    // ... 完整定义
  };
  
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const method = this.getNodeParameter('requestMethod', 0) as string;
    const url = this.getNodeParameter('url', 0) as string;
    const headers = this.getNodeParameter('headers', 0) as { values: Array<{ name: string; value: string }> };
    const body = this.getNodeParameter('requestBody', 0);
    
    // 构建请求配置
    const requestOptions: IHttpRequestOptions = {
      method: method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS',
      url,
      headers: {},
      json: true,
    };
    
    // 添加请求头
    if (headers.values) {
      for (const header of headers.values) {
        requestOptions.headers[header.name] = header.value;
      }
    }
    
    // 添加请求体
    if (body) {
      requestOptions.body = typeof body === 'string' ? JSON.parse(body) : body;
    }
    
    try {
      // 执行 HTTP 请求
      const response = await this.helpers.request(requestOptions);
      
      // 返回格式化的结果
      return [
        [
          {
            json: response,
            pairedItem: { item: 0 },
          },
        ],
      ];
    } catch (error) {
      // 错误处理
      throw new NodeApiError(this.getNode(), error);
    }
  }
}
```

### 3. 带凭证的 HTTP 请求

```typescript
// 使用凭证的 HTTP 请求

export class ApiNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'API',
    credentials: [
      {
        name: 'httpHeaderAuth',
        required: true,
        displayOptions: {
          show: {
            authentication: ['headerAuth'],
          },
        },
      },
    ],
    requestDefaults: {
      // 使用 $credentials 表达式注入认证
      headers: {
        'Authorization': '=Bearer {{ $credentials.apiKey }}',
      },
    },
  };
  
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // 1. 获取凭证
    const credentials = await this.getCredentials('httpHeaderAuth');
    
    // 2. 构建请求选项（凭证已自动注入）
    const requestOptions: IHttpRequestOptions = {
      method: 'GET',
      url: 'https://api.example.com/data',
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
      },
    };
    
    // 3. 执行请求
    const response = await this.helpers.request(requestOptions);
    
    return [[{ json: response }]];
  }
}
```

---

## 调试技巧

### 1. 前端调试

#### 使用浏览器 DevTools

```javascript
// 在浏览器控制台中调试

// 访问 Pinia stores
import { useWorkflowsStore } from '@/app/stores/workflows.store';
const store = useWorkflowsStore();

// 查看当前工作流
console.log(store.currentWorkflow);

// 查看节点列表
console.log(store.currentWorkflow.nodes);

// 查看某个节点的运行数据
console.log(store.getNodeRunData('node1'));

// 查看节点类型定义
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
const nodeTypesStore = useNodeTypesStore();
console.log(nodeTypesStore.getByNameAndVersion('openAi', 1));
```

#### 添加调试日志

```typescript
// 在组件中添加日志

const onParameterChange = (paramName: string, value: unknown) => {
  console.log('[NDV] Parameter changed:', {
    nodeId: props.node.id,
    paramName,
    value,
    timestamp: new Date().toISOString(),
  });
  
  workflowsStore.updateNodeParameter(
    props.node.id,
    paramName,
    value,
  );
};
```

#### 检查网络请求

在浏览器 Network 标签中：

```
API 调用示例：

1. 获取节点类型
   GET /api/node-types
   Response: { nodes: [{...}], credentials: [{...}] }

2. 加载动态选项（如 OpenAI 模型列表）
   POST /api/node-types/options
   Body: {
     "nodeName": "openAi",
     "paramName": "model",
     "nodeData": {...}
   }

3. 执行工作流
   POST /api/workflows/123/execute
   Body: {
     "nodes": [{...}],
     "connections": {...}
   }

4. WebSocket 连接
   WS /socket.io
   Events:
     - execution:nodeExecuteStart
     - execution:nodeExecuteComplete
     - execution:finished
```

### 2. 后端调试

#### 启用详细日志

```typescript
// 在 .env 中配置日志级别

N8N_LOG_LEVEL=debug
N8N_LOG_OUTPUT=console
N8N_LOG_FILE=/var/log/n8n.log
```

#### 调试执行流程

```typescript
// 在 WorkflowRunner 中添加日志

async run(data: IWorkflowExecutionDataProcess) {
  this.logger.debug('Starting workflow execution', {
    workflowId: data.workflowData.id,
    executionMode: data.executionMode,
    nodeCount: data.workflowData.nodes.length,
  });
  
  // ... 执行代码
  
  this.logger.debug('Workflow execution completed', {
    status: result.status,
    duration: endTime - startTime,
  });
}
```

#### 断点调试

```bash
# 使用 Node.js 调试器启动 n8n
node --inspect=9229 dist/commands/start.js

# 在 Chrome 中访问
chrome://inspect

# 或使用 VS Code
# .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "n8n",
      "program": "${workspaceFolder}/packages/cli/dist/commands/start.js",
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "port": 9229
    }
  ]
}
```

### 3. 工作流执行分析

#### 查看执行数据

```typescript
// 在执行完成后查看详细数据

const execution = await executionsApi.getExecution(executionId);

console.log('Execution Summary:', {
  status: execution.status,
  startTime: execution.startedAt,
  endTime: execution.stoppedAt,
  duration: execution.stoppedAt - execution.startedAt,
});

// 查看每个节点的执行数据
for (const [nodeId, taskData] of Object.entries(execution.data.resultData.runData)) {
  console.log(`Node ${nodeId}:`, {
    status: taskData[0].status,
    executionTime: taskData[0].executionTime,
    output: taskData[0].data?.main,
    error: taskData[0].error?.message,
  });
}
```

#### 性能分析

```typescript
// 分析各节点执行时间

const runData = execution.data.resultData.runData;
const nodeStats = [];

for (const [nodeId, taskData] of Object.entries(runData)) {
  const node = workflow.getNode(nodeId);
  nodeStats.push({
    nodeName: node.name,
    nodeType: node.type,
    executionTime: taskData[0].executionTime,
  });
}

// 按执行时间排序
nodeStats.sort((a, b) => b.executionTime - a.executionTime);

console.table(nodeStats);
```

---

## 总结

这份详细文档涵盖了：

1. **前端编辑器** - 从初始化到节点编辑的完整流程
2. **参数系统** - 参数类型、条件显示和动态加载
3. **表达式引擎** - 支持的语法和上下文对象
4. **HTTP 节点** - 完整的请求和响应处理
5. **调试技巧** - 前端、后端和执行分析的调试方法

这些知识可以帮助你：
- 理解 n8n 的工作流编辑和执行机制
- 开发新的节点和凭证类型
- 扩展 n8n 的功能
- 调试工作流执行问题
