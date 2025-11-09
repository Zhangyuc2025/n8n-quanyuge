# n8n 快速参考卡

## 项目结构一览

```
n8n-quanyuge/
├── packages/
│   ├── frontend/
│   │   ├── editor-ui/              # 主编辑器 UI (Vue 3)
│   │   ├── admin-panel/            # 管理面板
│   │   └── @n8n/                   # 前端相关包
│   │
│   ├── cli/                        # 后端服务 (Express + Node.js)
│   ├── core/                       # 执行引擎核心
│   ├── workflow/                   # 工作流类和接口
│   ├── nodes-base/                 # 内置节点和凭证
│   │   ├── nodes/                  # 300+ 内置节点
│   │   └── credentials/            # 400+ 凭证类型
│   ├── @n8n/                       # 共享包
│   │   ├── api-types/              # FE/BE 共享类型
│   │   ├── design-system/          # UI 组件库
│   │   ├── di/                     # 依赖注入容器
│   │   └── ...
│   └── testing/                    # 测试工具
│
└── docs/
    ├── N8N_CORE_ARCHITECTURE.md    # 完整架构指南
    ├── N8N_DETAILED_IMPLEMENTATION.md # 详细实现指南
    ├── EXPLORATION_SUMMARY.md      # 探索总结
    └── QUICK_REFERENCE.md          # 本文件
```

---

## 前端快速导航

### 主要路由和视图

| 路由 | 组件 | 功能 |
|-----|------|------|
| `/workflows` | `WorkflowsView.vue` | 工作流列表 |
| `/workflows/:id/edit` | `NodeView.vue` | 工作流编辑器 |
| `/credentials` | `CredentialsView.vue` | 凭证管理 |
| `/executions` | `ExecutionsView.vue` | 执行记录 |
| `/settings` | `SettingsView.vue` | 系统设置 |

### 核心 Pinia Stores

```typescript
// 导入
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';

// 使用
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();

// 常用方法
workflowsStore.addNode(node);
workflowsStore.deleteNode(nodeId);
workflowsStore.updateNodeParameter(nodeId, paramName, value);
workflowsStore.currentWorkflow.connections;
workflowsStore.getNodeRunData(nodeId);
```

### Canvas 操作

```typescript
// 在 NodeView.vue 中
const canvasRef = useTemplateRef('canvas');

// 执行工作流
await useRunWorkflow().runWorkflow(currentWorkflow);

// 添加节点
workflowsStore.addNode({
  id: 'unique-id',
  name: 'My Node',
  type: 'openAi',
  typeVersion: 1,
  position: [100, 100],
  parameters: {},
});

// 创建连接
workflowsStore.addConnection({
  source: { nodeId: 'node1', outputType: 'main' },
  target: { nodeId: 'node2', inputType: 'main' },
});
```

### 常用 Composables

```typescript
// 工作流操作
const { runWorkflow, stopExecution } = useRunWorkflow();

// Canvas 操作
const { deleteNode, duplicateNode } = useCanvasOperations();

// 节点助手
const { getNodeColor, getNodeIcon } = useNodeHelpers();

// 工作流助手
const { isWorkflowTouched, saveWorkflow } = useWorkflowHelpers();

// Telemetry
const { trackEvent } = useTelemetry();
```

---

## 后端快速导航

### 主要服务

```typescript
// 工作流服务
@Service()
export class WorkflowService {
  async getMany(user: User, options?: ListQuery.Options);
  async getOneOrFail(id: string);
  async create(user: User, workflow: WorkflowDataCreate);
  async update(user: User, id: string, workflow: WorkflowDataUpdate);
  async delete(user: User, id: string);
}

// 执行服务
@Service()
export class WorkflowExecutionService {
  async runWorkflow(
    workflowData: IWorkflowBase,
    node: INode,
    data: INodeExecutionData[][],
    additionalData: IWorkflowExecuteAdditionalData,
    mode: WorkflowExecuteMode,
  );
}

// 凭证服务
@Service()
export class CredentialsService {
  async getMany(user: User, options?: any);
  async create(user: User, credentialData: CreateCredentialDto);
  async update(user: User, id: string, credentialData: UpdateCredentialDto);
  async delete(user: User, id: string);
  async testConnection(credentialId: string);
}
```

### API 端点

```
工作流 API:
GET    /api/workflows              # 获取工作流列表
GET    /api/workflows/:id          # 获取单个工作流
POST   /api/workflows              # 创建工作流
PATCH  /api/workflows/:id          # 更新工作流
DELETE /api/workflows/:id          # 删除工作流

执行 API:
POST   /api/workflows/:id/execute  # 执行工作流
GET    /api/executions             # 获取执行列表
GET    /api/executions/:id         # 获取执行详情

凭证 API:
GET    /api/credentials            # 获取凭证列表
POST   /api/credentials            # 创建凭证
PATCH  /api/credentials/:id        # 更新凭证
DELETE /api/credentials/:id        # 删除凭证
POST   /api/credentials/:id/test   # 测试凭证
```

### 依赖注入

```typescript
// 在服务类中注入依赖
@Service()
export class MyService {
  constructor(
    private logger: Logger,
    private workflowService: WorkflowService,
    private credentialsService: CredentialsService,
  ) {}
}

// 在控制器中使用
@RestController('/my-endpoint')
export class MyController {
  constructor(private myService: MyService) {}
  
  @Get('/')
  async getAll(): Promise<any> {
    return this.myService.getAll();
  }
}
```

---

## 节点开发速查

### 最小节点实现

```typescript
// MyNode/MyNode.node.ts
import type { INodeType, INodeTypeDescription, IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionTypes, INodeExecutionData } from 'n8n-workflow';

export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    icon: 'file:my-node.svg',
    group: ['transform'],
    version: [1],
    defaults: { name: 'My Node' },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    properties: [
      {
        displayName: 'Text',
        name: 'text',
        type: 'string',
        default: '',
        required: true,
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const text = this.getNodeParameter('text', 0) as string;
    
    return [
      [
        {
          json: { result: text.toUpperCase() },
          pairedItem: { item: 0 },
        },
      ],
    ];
  }
}
```

### 节点参数类型

```typescript
// 字符串
{ displayName: 'Text', name: 'text', type: 'string', default: '' }

// 数字
{ displayName: 'Count', name: 'count', type: 'number', default: 1 }

// 布尔值
{ displayName: 'Enabled', name: 'enabled', type: 'boolean', default: true }

// 下拉选项
{
  displayName: 'Option',
  name: 'option',
  type: 'options',
  options: [
    { name: 'Option 1', value: 'opt1' },
    { name: 'Option 2', value: 'opt2' },
  ],
  default: 'opt1',
}

// 动态加载选项
{
  displayName: 'Model',
  name: 'model',
  type: 'options',
  typeOptions: {
    loadOptions: {
      routing: {
        request: {
          method: 'GET',
          url: '/api/models',
        },
        output: {
          postReceive: [{ type: 'rootProperty', properties: { propName: 'data' } }],
        },
      },
    },
  },
}

// 集合
{
  displayName: 'Items',
  name: 'items',
  type: 'fixedCollection',
  typeOptions: { multipleValues: true },
  default: { values: [{ item: '' }] },
  options: [
    {
      displayName: 'Item',
      name: 'values',
      values: [
        { displayName: 'Data', name: 'data', type: 'string', default: '' },
      ],
    },
  ],
}
```

### 条件显示

```typescript
{
  displayName: 'Advanced Options',
  name: 'advancedOptions',
  type: 'boolean',
  default: false,
}

{
  displayName: 'Timeout',
  name: 'timeout',
  type: 'number',
  displayOptions: {
    show: {
      advancedOptions: [true],  // 当 advancedOptions 为 true 时显示
    },
  },
  default: 30000,
}
```

### 使用凭证

```typescript
{
  credentials: [
    {
      name: 'myApi',
      required: true,
      displayOptions: {
        show: {
          authentication: ['oauth'],
        },
      },
    },
  ],
}

// 在 execute 方法中
const credentials = await this.getCredentials('myApi') as MyApiCredentials;
const response = await this.helpers.request({
  method: 'GET',
  url: 'https://api.example.com/data',
  headers: {
    'Authorization': `Bearer ${credentials.accessToken}`,
  },
});
```

---

## 凭证开发速查

### 最小凭证实现

```typescript
// MyApi.credentials.ts
import type { ICredentialType, INodeProperties, IHttpRequestOptions } from 'n8n-workflow';

export class MyApi implements ICredentialType {
  name = 'myApi';
  displayName = 'My API';
  documentationUrl = 'my-api';
  
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
    },
  ];
  
  test = {
    request: {
      baseURL: 'https://api.example.com',
      url: '/ping',
    },
  };
  
  async authenticate(
    credentials: ICredentialDataDecryptedObject,
    requestOptions: IHttpRequestOptions,
  ): Promise<IHttpRequestOptions> {
    requestOptions.headers = {
      'X-API-Key': credentials.apiKey,
    };
    return requestOptions;
  }
}
```

### 凭证测试

```typescript
// 简单 HTTP 测试
test: ICredentialTestRequest = {
  request: {
    baseURL: 'https://api.example.com',
    url: '/auth/test',
    method: 'GET',
  },
};

// 自定义测试函数
test: ICredentialTestRequest = {
  request: {
    baseURL: 'https://api.example.com',
    url: '/users/me',
  },
  rules: [
    {
      type: 'responseCode',
      properties: {
        value: 200,
      },
    },
  ],
};
```

---

## 表达式速查

### 常用表达式

```javascript
// 节点输出
{{ $node.NodeName.data }}
{{ $node.NodeName.data[0].json.field }}

// 参数值
{{ $parameter.paramName }}

// 输入数据
{{ $input.item.json }}
{{ $input.item.json.field }}
{{ $input.all() }}

// 环境变量
{{ $env.API_KEY }}

// 特殊变量
{{ $now }}           // 当前时间戳 (毫秒)
{{ $today }}         // 当前日期 (YYYY-MM-DD)

// 函数调用
{{ JSON.stringify($node.Start.data) }}
{{ $node.HttpRequest.data.map(item => item.name).join(', ') }}
{{ Math.floor(Math.random() * 100) }}

// 条件
{{ $input.item.json.status === 'completed' ? 'Done' : 'Pending' }}

// 对象构造
{{ { name: $parameter.name, id: $input.item.json.id } }}

// Base64
{{ $base64.encode('hello') }}
{{ $base64.decode('aGVsbG8=') }}
```

### 表达式在参数中的使用

```typescript
// 参数定义中
{
  displayName: 'Title',
  name: 'title',
  type: 'string',
  default: '{{ $node.HttpRequest.data[0].title }}',
  description: 'Use expressions to reference node outputs',
}

// 运行时计算
const titleValue = await this.evaluateExpression(
  '{{ $node.HttpRequest.data[0].title }}',
  0, // itemIndex
);
```

---

## 调试命令

```bash
# 启用详细日志
N8N_LOG_LEVEL=debug npm start

# 启用特定模块日志
N8N_LOG_LEVEL=debug N8N_LOG_FILE=/var/log/n8n.log npm start

# Node 调试模式
node --inspect=9229 dist/commands/start.js

# 运行测试
pnpm test

# 运行 Lint
pnpm lint

# 类型检查
pnpm typecheck

# 构建项目
pnpm build
```

---

## 常用代码片段

### 前端：获取节点参数值

```typescript
const nodeTypesStore = useNodeTypesStore();
const nodeType = nodeTypesStore.getByNameAndVersion(node.type, node.typeVersion);

// 获取参数值
const paramValue = node.parameters[paramName];

// 评估表达式参数
const expressionValue = await evaluateExpression(
  paramValue,
  {
    $node: nodeData,
    $parameter: node.parameters,
  },
);
```

### 前端：执行工作流

```typescript
const { runWorkflow } = useRunWorkflow();

const response = await runWorkflow(
  currentWorkflow,      // IWorkflowDb
  'manual',             // mode
  undefined,            // destinationNode
  undefined,            // pinData
);

// 响应数据
console.log(response.data.resultData.runData);  // 各节点输出
console.log(response.executedNode);              // 执行的节点
```

### 后端：创建执行数据

```typescript
const executionData: IRunExecutionData = {
  startData: {},
  resultData: {
    runData: {},
  },
  executionData: {
    contextData: {},
    metadata: {},
    nodeExecutionStack: [
      {
        node: startNode,
        data: { main: [[]] },
        source: null,
      },
    ],
    waitingExecution: {},
    waitingExecutionSource: {},
  },
};

const result = await this.workflowRunner.run({
  userId: user.id,
  executionMode: 'manual',
  executionData,
  workflowData,
});
```

### 后端：获取和使用凭证

```typescript
// 在节点执行中
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  // 获取凭证
  const credentials = await this.getCredentials('myApiName') as MyApiCredentialsType;
  
  // 使用凭证发送请求
  const response = await this.helpers.request({
    method: 'GET',
    url: `https://api.example.com/data`,
    headers: {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'X-API-Key': credentials.apiKey,
    },
  });
  
  return [[{ json: response }]];
}
```

---

## 文件修改检查清单

修改代码后，确保运行：

- [ ] `pnpm lint` - 代码风格检查
- [ ] `pnpm typecheck` - TypeScript 类型检查
- [ ] `pnpm test` - 单元测试
- [ ] `pnpm build` - 构建项目

对于前端修改：
- [ ] 检查 i18n 翻译（`@n8n/i18n`）
- [ ] 验证 CSS 变量使用
- [ ] 测试响应式设计

对于后端修改：
- [ ] 检查数据库迁移
- [ ] 验证权限检查
- [ ] 测试 API 端点

---

## 常见操作速查

### 添加翻译

```typescript
// packages/@n8n/i18n/src/locales/en.json
{
  "nodeNames.myNode": "My Node",
  "nodeParameterNames.myNode.text": "Text Input",
  "nodeParameterDescriptions.myNode.text": "Enter text to process",
}

// 在代码中使用
import { addNodeTranslation } from '@n8n/i18n';
addNodeTranslation('myNode', translations);
```

### 添加测试

```typescript
// MyNode.test.ts
describe('MyNode', () => {
  it('should convert text to uppercase', async () => {
    const node = new MyNode();
    
    const result = await node.execute({
      getNodeParameter: jest.fn().mockReturnValue('hello'),
      getInputData: jest.fn().mockReturnValue([[{ json: {} }]]),
    } as any);
    
    expect(result[0][0].json.result).toBe('HELLO');
  });
});
```

### 查看执行日志

```typescript
// 在浏览器开发者工具中
const store = useExecutionsStore();
const execution = store.getExecution('executionId');
console.log(execution.data.resultData.runData);

// 查看特定节点的输出
console.log(execution.data.resultData.runData['nodeId'][0].data);

// 查看错误信息
console.log(execution.data.resultData.runData['nodeId'][0].error);
```

---

**这份快速参考卡可作为日常开发的便利指南。详细内容请参考完整文档。**
