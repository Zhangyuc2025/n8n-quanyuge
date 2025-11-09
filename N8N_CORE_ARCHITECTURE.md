# n8n 核心架构完整指南

## 目录
1. [工作流编辑器](#工作流编辑器)
2. [节点系统](#节点系统)
3. [工作流执行](#工作流执行)
4. [凭证系统](#凭证系统)
5. [关键文件映射](#关键文件映射)

---

## 工作流编辑器

### 1. 编辑器主要组件架构

#### 工作流编辑器入口
**文件**: `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/app/views/NodeView.vue`

这是工作流编辑器的主容器组件，管理整个编辑器的生命周期：
- 加载工作流数据
- 管理节点拖拽和连接
- 处理工作流执行
- 管理 UI 状态和模态框

```vue
<script setup lang="ts">
import WorkflowCanvas from '@/features/workflows/canvas/components/WorkflowCanvas.vue';
import FocusPanel from '@/app/components/FocusPanel.vue';
import CanvasRunWorkflowButton from '@/features/workflows/canvas/components/elements/buttons/CanvasRunWorkflowButton.vue';
// ... 其他导入
</script>
```

#### Canvas 层级结构
**文件**: `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/features/workflows/canvas/`

Canvas 组件树：
```
WorkflowCanvas.vue (主容器)
├── Canvas.vue (Vue Flow 实例)
│   ├── CanvasNode (节点元素)
│   ├── CanvasEdge (边/连接线)
│   ├── CanvasBackground (网格背景)
│   ├── CanvasHandle (连接点)
│   └── CanvasControlButtons (运行/停止按钮)
└── contextMenu (右键菜单)
```

**关键文件**:
- `canvas/components/WorkflowCanvas.vue` - Canvas 包装组件
- `canvas/components/Canvas.vue` - Vue Flow 核心实现
- `canvas/components/elements/nodes/` - 节点渲染组件
- `canvas/composables/useCanvasMapping.ts` - 节点和连接映射逻辑
- `canvas.types.ts` - Canvas 类型定义

### 2. 节点创建面板 (Node Creator)

**文件**: `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/features/shared/nodeCreator/`

节点创建面板是用户添加节点到工作流的入口：

```
NodeCreator.vue (主容器)
├── Panel/NodesListPanel.vue (节点列表)
├── Panel/SearchBar.vue (搜索功能)
├── ItemTypes/NodeItem.vue (单个节点项)
└── ItemTypes/CommunityNodeItem.vue (社区节点)
```

**关键特性**:
- 节点分类和搜索
- 拖拽节点到 Canvas
- 节点推荐
- 社区节点管理

**核心 Store**: `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/features/shared/nodeCreator/nodeCreator.store.ts`

### 3. 状态管理 (Pinia Stores)

**工作流 Store** - `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/app/stores/workflows.store.ts`

```typescript
export const useWorkflowsStore = defineStore(STORES.WORKFLOWS, () => {
  // 存储所有工作流数据
  const workflows = ref<IWorkflowsMap>({});
  
  // 当前工作流
  const currentWorkflow = computed(() => workflows.value[route.params.name]);
  
  // 节点管理
  const addNode = (node: INode) => { ... };
  const deleteNode = (nodeId: string) => { ... };
  const updateNode = (node: INode) => { ... };
  
  // 连接管理
  const addConnection = (connection: IConnection) => { ... };
  const removeConnection = (connection: IConnection) => { ... };
  
  // 执行数据
  const runData = ref<IRunData>({});
  const executionMode = ref<ExecutionMode>('manual');
});
```

**节点类型 Store** - `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/app/stores/nodeTypes.store.ts`

```typescript
export const useNodeTypesStore = defineStore(STORES.NODE_TYPES, () => {
  const nodeTypes = ref<NodeTypesByTypeNameAndVersion>({});
  
  // 组织为：{ "nodeTypeName": { "1": INodeTypeDescription, "2": INodeTypeDescription } }
  const getByNameAndVersion = (name: string, version: number) => { ... };
  
  const allLatestNodeTypes = computed(() => {
    // 获取每个节点类型的最新版本
  });
  
  // 加载节点类型
  const fetchNodeTypes = async () => { ... };
});
```

---

## 节点系统

### 1. 节点定义结构

#### 节点文件位置
`/home/zhang/n8n-quanyuge/packages/nodes-base/nodes/`

```
nodes/
├── OpenAi/                    # 特定服务的节点
│   ├── OpenAi.node.ts         # 节点主类
│   ├── OpenAi.node.json       # 节点元数据
│   ├── ChatDescription.ts     # 聊天操作描述
│   ├── ImageDescription.ts    # 图像操作描述
│   ├── GenericFunctions.ts    # 共享函数
│   └── __schema__/            # API schema 定义
├── Code/                      # 代码执行节点
│   ├── Code.node.ts
│   ├── descriptions/
│   │   ├── JavascriptCodeDescription.ts
│   │   └── PythonCodeDescription.ts
│   └── Sandbox/               # 沙箱执行环境
├── HttpRequest/               # HTTP 请求节点
│   ├── V1/, V2/, V3/         # 版本控制
│   └── HttpRequest.node.ts
└── ... (300+ 其他节点)
```

### 2. 节点类型定义

#### INodeType 接口

```typescript
// 来自 n8n-workflow 包

export interface INodeType {
  description: INodeTypeDescription;
  execute?: (this: IExecuteFunctions) => Promise<INodeExecutionData[][]>;
  executeResource?: (this: IExecuteFunctions) => Promise<INodeExecutionData[][]>;
  supplyData?: (this: ISupplyDataFunctions) => Promise<INodeExecutionData[][]>;
  webhook?: (this: IWebhookFunctions) => Promise<IWebhookResponseData>;
  trigger?: (this: ITriggerFunctions) => Promise<void>;
  poll?: (this: IPollFunctions) => Promise<INodeExecutionData[][]>;
}

export interface INodeTypeDescription {
  displayName: string;           // UI 中显示的名称
  name: string;                  // 唯一标识符（驼峰命名）
  description: string;
  icon: string | { light: string; dark: string };
  group: string[];               // 分类：['transform'], ['trigger'], etc
  version: number[];             // 支持的版本
  defaults: {
    name: string;                // 默认节点名称
    color?: string;
    position?: [number, number];
  };
  inputs: string[];              // 输入连接类型
  outputs: string[];             // 输出连接类型
  credentials?: ICredentialTypeOptions[];  // 需要的凭证
  properties: INodeProperties[]; // 参数配置
  requestDefaults?: IHttpRequestOptions;   // HTTP 请求默认值
  webhookMethods?: IWebhookMethods;
  triggerPanel?: string;
  subtitle?: string;             // 节点副标题（支持表达式）
}

export interface INodeProperties {
  displayName: string;
  name: string;
  type: 'string' | 'number' | 'options' | 'boolean' | 'collection' | 'fixedCollection';
  description?: string;
  default: any;
  required?: boolean;
  displayOptions?: {           // 条件显示
    show?: { [key: string]: any[] };
    hide?: { [key: string]: any[] };
  };
  typeOptions?: {
    password?: boolean;         // 隐藏密码类型
    loadOptions?: ILoadOptions;  // 动态加载选项
    multipleValues?: boolean;
    minValue?: number;
    maxValue?: number;
  };
  options?: Array<{            // 下拉选项
    name: string;
    value: string;
    description?: string;
  }>;
  routing?: IRequestRouting;   // HTTP 路由配置
}
```

#### 完整节点实现示例：OpenAI 节点

**文件**: `/home/zhang/n8n-quanyuge/packages/nodes-base/nodes/OpenAi/OpenAi.node.ts`

```typescript
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { chatFields, chatOperations } from './ChatDescription';

export class OpenAi implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'OpenAI',
    name: 'openAi',
    icon: { light: 'file:openAi.svg', dark: 'file:openAi.dark.svg' },
    group: ['transform'],
    version: [1, 1.1],
    defaults: { name: 'OpenAI' },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    
    // 凭证配置
    credentials: [
      {
        name: 'openAiApi',
        required: true,
      },
    ],
    
    // HTTP 请求默认值（使用 $credentials 表达式）
    requestDefaults: {
      ignoreHttpStatusErrors: true,
      baseURL:
        '={{ $credentials.url?.split("/").slice(0,-1).join("/") ?? "https://api.openai.com" }}',
    },
    
    // 节点参数
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Chat', value: 'chat' },
          { name: 'Image', value: 'image' },
          { name: 'Text', value: 'text' },
        ],
        default: 'text',
      },
      ...chatOperations,
      ...chatFields,
      ...imageOperations,
      ...imageFields,
      ...textOperations,
      ...textFields,
    ],
  };
}
```

**参数描述示例** - `/home/zhang/n8n-quanyuge/packages/nodes-base/nodes/OpenAi/ChatDescription.ts`

```typescript
export const chatOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: { resource: ['chat'] },
    },
    options: [
      {
        name: 'Complete',
        value: 'complete',
        action: 'Create a Completion',
        routing: {
          request: {
            method: 'POST',
            url: '/v1/chat/completions',
          },
          output: {
            postReceive: [sendErrorPostReceive],
          },
        },
      },
    ],
    default: 'complete',
  },
];

const completeOperations: INodeProperties[] = [
  {
    displayName: 'Model',
    name: 'model',
    type: 'options',
    displayOptions: {
      show: {
        operation: ['complete'],
        resource: ['chat'],
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
                  propName: 'data',
                },
              },
            ],
          },
        },
      },
    },
  },
];
```

### 3. AI 节点实现

#### OpenAI 节点
**路径**: `/home/zhang/n8n-quanyuge/packages/nodes-base/nodes/OpenAi/`

支持功能：
- Chat Completions (GPT-4, GPT-3.5-turbo)
- Image Generation (DALL-E)
- Text Embeddings
- 模型列表动态加载

#### LangChain 节点
**路径**: `/home/zhang/n8n-quanyuge/packages/@n8n/nodes-langchain/`

支持:
- LLM Chain
- Vector Store
- Memory
- Tools

#### 节点版本控制

n8n 支持节点版本化，允许向后兼容：

```
HttpRequest/
├── V1/HttpRequestV1.node.ts    # 版本 1
├── V2/HttpRequestV2.node.ts    # 版本 2
├── V3/HttpRequestV3.node.ts    # 版本 3
└── HttpRequest.node.ts         # 路由到最新版本
```

### 4. 节点加载和注册

**文件**: `/home/zhang/n8n-quanyuge/packages/cli/src/load-nodes-and-credentials.ts`

```typescript
@Service()
export class LoadNodesAndCredentials {
  private known: KnownNodesAndCredentials = { nodes: {}, credentials: {} };
  loaded: LoadedNodesAndCredentials = { nodes: {}, credentials: {} };
  types: Types = { nodes: [], credentials: [] };
  loaders: Record<string, DirectoryLoader> = {};

  async init() {
    // 1. 扫描节点目录
    const basePathsToScan = [
      // n8n-nodes-base
      // 自定义节点目录
      // 社区节点
    ];

    // 2. 使用目录加载器
    for (const path of basePathsToScan) {
      const loader = new PackageDirectoryLoader(path);
      const nodes = await loader.loadAll();
      this.loaded.nodes = { ...this.loaded.nodes, ...nodes };
    }

    // 3. 生成类型信息
    for (const [name, loaded] of Object.entries(this.loaded.nodes)) {
      this.types.nodes.push(loaded.description);
    }

    return this;
  }
}
```

**前端节点类型加载**:

```typescript
// useNodeTypesStore 中
const fetchNodeTypes = async () => {
  const response = await nodeTypesApi.getNodeTypes();
  
  // 按名称和版本组织
  nodeTypes.value = response.reduce((acc, type) => {
    if (!acc[type.name]) acc[type.name] = {};
    acc[type.name][type.version] = type;
    return acc;
  }, {});
};
```

---

## 工作流执行

### 1. 执行流程

#### 高层执行流

```
1. 用户点击运行按钮 (Canvas)
   ↓
2. NodeView 捕获运行事件
   ↓
3. useRunWorkflow composable 调用 API
   ↓
4. WorkflowExecutionService (后端) 收到请求
   ↓
5. WorkflowRunner 执行工作流
   ↓
6. 执行引擎依次执行节点
   ↓
7. WebSocket 推送执行状态更新到前端
   ↓
8. 前端更新 UI (运行数据, 执行日志)
```

### 2. 后端执行关键文件

#### WorkflowRunner
**文件**: `/home/zhang/n8n-quanyuge/packages/cli/src/workflow-runner.ts`

```typescript
@Service()
export class WorkflowRunner {
  constructor(
    private readonly logger: Logger,
    private readonly errorReporter: ErrorReporter,
    private readonly activeExecutions: ActiveExecutions,
    private readonly executionRepository: ExecutionRepository,
    private readonly workflowStaticDataService: WorkflowStaticDataService,
    private readonly nodeTypes: NodeTypes,
    private readonly credentialsPermissionChecker: CredentialsPermissionChecker,
    // ...
  ) {}

  async run(
    data: IWorkflowExecutionDataProcess,
    isTestRun: boolean,
    startNode?: string,
    destinationNode?: string,
    responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
  ): Promise<string> {
    // 1. 构建执行数据
    const executionData = data.executionData;
    
    // 2. 创建工作流实例
    const workflow = new Workflow({
      nodes: data.workflowData.nodes,
      connections: data.workflowData.connections,
    });
    
    // 3. 执行工作流
    const workflowExecute = new WorkflowExecute(
      workflow,
      nodeTypes,
      credentialsData,
      // ...
    );
    
    // 4. 运行执行
    const result = await workflowExecute.run(
      executionData,
      mode,
      startNode,
      destinationNode,
    );
    
    // 5. 保存执行结果
    await this.executionRepository.save({
      workflowId: data.workflowData.id,
      data: result,
      // ...
    });
    
    return executionId;
  }
}
```

#### WorkflowExecutionService
**文件**: `/home/zhang/n8n-quanyuge/packages/cli/src/workflows/workflow-execution.service.ts`

```typescript
@Service()
export class WorkflowExecutionService {
  async runWorkflow(
    workflowData: IWorkflowBase,
    node: INode,
    data: INodeExecutionData[][],
    additionalData: IWorkflowExecuteAdditionalData,
    mode: WorkflowExecuteMode,
    responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
  ) {
    // 构建执行堆栈
    const nodeExecutionStack: IExecuteData[] = [
      {
        node,
        data: { main: data },
        source: null,
      },
    ];

    // 构建执行数据
    const executionData: IRunExecutionData = {
      startData: {},
      resultData: { runData: {} },
      executionData: {
        contextData: {},
        metadata: {},
        nodeExecutionStack,
        waitingExecution: {},
      },
    };

    // 启动工作流
    return await this.workflowRunner.run(
      {
        userId: additionalData.userId,
        executionMode: mode,
        executionData,
        workflowData,
      },
      true,
      undefined,
      undefined,
      responsePromise,
    );
  }
}
```

### 3. 执行引擎核心

**路径**: `/home/zhang/n8n-quanyuge/packages/core/src/execution-engine/`

```
execution-engine/
├── index.ts                           # 主入口
├── active-workflows.ts                # 活跃工作流管理
├── execution-lifecycle-hooks.ts       # 执行生命周期
├── external-secrets-proxy.ts          # 外部密钥代理
├── node-execution-context/
│   ├── base-execute-context.ts        # 基础执行上下文
│   ├── execute-context.ts             # 批量执行上下文
│   ├── execute-single-context.ts      # 单项执行上下文
│   ├── trigger-context.ts             # 触发器上下文
│   ├── poll-context.ts                # 轮询上下文
│   ├── webhook-context.ts             # Webhook 上下文
│   ├── node-execution-context.ts      # 节点执行上下文
│   └── utils/
│       ├── binary-helper-functions.ts # 二进制数据处理
│       ├── webhook-helper-functions.ts
│       ├── request-helper-functions.ts
│       ├── file-system-helper-functions.ts
│       └── ... (其他辅助函数)
```

#### IExecuteFunctions 接口

节点执行函数接收的上下文对象：

```typescript
export interface IExecuteFunctions {
  // 访问节点信息
  getNode(): INode;
  getNodeParameter(
    parameterName: string,
    itemIndex: number,
  ): NodeParameterValue;
  
  // 输入/输出数据
  getInputData(): INodeExecutionData[][];
  getInputData(inputIndex: number, outputIndex: number): INodeExecutionData[];
  item: INodeExecutionData;
  items: INodeExecutionData[];
  
  // 表达式和变量
  evaluateExpression(expression: string, itemIndex: number): unknown;
  
  // HTTP 请求（带凭证注入）
  helpers: {
    request?: (options: IRequestOptions) => Promise<any>;
    requestBinary?: (options: IRequestOptions) => Promise<IDataObject>;
  };
  
  // 文件系统
  helpers: {
    fs?: { ... };  // 文件系统操作
  };
  
  // 凭证访问
  getCredentials(type: string): ICredentialDataDecryptedObject;
  
  // 错误处理
  throwAuthenticationError?: () => never;
  throwInsufficientScopesError?: () => never;
}
```

#### 节点执行上下文
**文件**: `/home/zhang/n8n-quanyuge/packages/core/src/execution-engine/node-execution-context/base-execute-context.ts`

```typescript
export class BaseExecuteContext implements IExecuteFunctions {
  private node: INode;
  private workflow: Workflow;
  private nodeType: INodeType;
  private credentialsData: ICredentialsDb;

  getNode(): INode {
    return this.node;
  }

  async getCredentials(type: string): Promise<ICredentialDataDecryptedObject> {
    // 1. 查找节点中指定类型的凭证
    const nodeCredentials = this.node.credentials;
    
    // 2. 从数据库检索凭证
    const credentialData = await this.credentialsRepository.findOne(
      nodeCredentials[type].id,
    );
    
    // 3. 解密凭证数据
    return this.decrypt(credentialData.data);
  }

  async evaluateExpression(
    expression: string,
    itemIndex: number,
  ): Promise<unknown> {
    // 使用 n8n 表达式语言评估表达式
    return evaluateExpression(
      expression,
      {
        $node: this.nodeData,
        $parameters: this.nodeParameters,
        $input: this.inputData[itemIndex],
      },
      null,
      this.workflow,
    );
  }
}
```

### 4. 工作流数据结构

```typescript
interface IWorkflowBase {
  id?: string;
  name: string;
  active: boolean;
  nodes: INode[];
  connections: IConnections;
  settings?: IWorkflowSettings;
  staticData?: IDataObject;
}

interface INode {
  id: string;
  name: string;
  type: string;           // 节点类型名称（如 'openAi', 'httpRequest'）
  typeVersion: number;    // 节点类型版本
  position: [number, number];
  parameters: INodeParameters;  // 节点参数值
  credentials?: INodeCredentials;  // 节点使用的凭证
  disabled?: boolean;
  notes?: string;
  notesInline?: boolean;
}

interface INodeCredentials {
  [credentialType: string]: {
    id: string;
    name: string;
  };
}

interface IConnections {
  [nodeId: string]: INodeConnections;
}

interface INodeConnections {
  [outputType: string]: Array<Array<{
    node: string;           // 目标节点名称
    type: NodeConnectionType;
    index: number;
  }>>;
}

// 执行运行数据
interface IRunData {
  [nodeId: string]: ITaskData[];
}

interface ITaskData {
  startTime: number;
  executionTime: number;
  status: 'ok' | 'error';
  data?: {
    main: INodeExecutionData[][];
  };
  error?: ExecutionError;
}

interface INodeExecutionData {
  json: IDataObject;
  binary?: IBinaryKeyData;
  pairedItem?: IPairedItemData;
}
```

---

## 凭证系统

### 1. 凭证定义

#### 凭证类型接口

**源**: `n8n-workflow` 包

```typescript
export interface ICredentialType {
  name: string;                    // 唯一标识符
  displayName: string;             // UI 显示名称
  documentationUrl: string;        // 文档链接
  icon?: string | { light: string; dark: string };
  
  properties: INodeProperties[];   // 凭证字段定义
  test?: ICredentialTestRequest;   // 测试凭证有效性
  
  // 认证方法
  authenticate?: (
    credentials: ICredentialDataDecryptedObject,
    requestOptions: IHttpRequestOptions,
  ) => Promise<IHttpRequestOptions>;
  
  // OAuth 支持
  oauth2?: OAuth2Options;
}
```

#### 凭证文件位置
`/home/zhang/n8n-quanyuge/packages/nodes-base/credentials/`

```
credentials/
├── ActionNetworkApi.credentials.ts
├── AwsAssumeRole.credentials.ts
├── Aws.credentials.ts
├── AzureStorageOAuth2Api.credentials.ts
├── AzureStorageSharedKeyApi.credentials.ts
├── OpenAiApi.credentials.ts
└── ... (400+ 凭证类型)
```

### 2. 凭证实现示例

#### API Key 凭证（ActionNetwork）

**文件**: `/home/zhang/n8n-quanyuge/packages/nodes-base/credentials/ActionNetworkApi.credentials.ts`

```typescript
import type {
  ICredentialDataDecryptedObject,
  ICredentialTestRequest,
  ICredentialType,
  IHttpRequestOptions,
  INodeProperties,
} from 'n8n-workflow';

export class ActionNetworkApi implements ICredentialType {
  name = 'actionNetworkApi';
  displayName = 'Action Network API';
  documentationUrl = 'actionnetwork';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },  // 隐藏密码
      default: '',
    },
  ];

  // 凭证测试
  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://actionnetwork.org/api/v2',
      url: '/events?per_page=1',
    },
  };

  // 认证函数：向请求添加凭证
  async authenticate(
    credentials: ICredentialDataDecryptedObject,
    requestOptions: IHttpRequestOptions,
  ): Promise<IHttpRequestOptions> {
    requestOptions.headers = {
      'OSDI-API-Token': credentials.apiKey,
    };
    return requestOptions;
  }
}
```

#### IAM 凭证（AWS）

**文件**: `/home/zhang/n8n-quanyuge/packages/nodes-base/credentials/Aws.credentials.ts`

```typescript
export class Aws implements ICredentialType {
  name = 'aws';
  displayName = 'AWS (IAM)';
  documentationUrl = 'aws';

  properties: INodeProperties[] = [
    awsRegionProperty,
    {
      displayName: 'Access Key ID',
      name: 'accessKeyId',
      type: 'string',
      default: '',
    },
    {
      displayName: 'Secret Access Key',
      name: 'secretAccessKey',
      type: 'string',
      default: '',
      typeOptions: { password: true },
    },
    {
      displayName: 'Temporary Security Credentials',
      name: 'temporaryCredentials',
      type: 'boolean',
      default: false,
    },
    {
      displayName: 'Session Token',
      name: 'sessionToken',
      type: 'string',
      default: '',
      displayOptions: {
        show: { temporaryCredentials: [true] },
      },
      typeOptions: { password: true },
    },
    ...awsCustomEndpoints,
  ];

  async authenticate(
    rawCredentials: ICredentialDataDecryptedObject,
    requestOptions: IHttpRequestOptions,
  ): Promise<IHttpRequestOptions> {
    const credentials = rawCredentials as AwsIamCredentialsType;
    
    // AWS Signature V4 签名
    const signOpts = awsGetSignInOptionsAndUpdateRequest(
      requestOptions,
      credentials,
      path,
      method,
      service,
      region,
    );

    return signOptions(
      requestOptions,
      signOpts,
      {
        accessKeyId: credentials.accessKeyId.trim(),
        secretAccessKey: credentials.secretAccessKey.trim(),
        sessionToken: credentials.temporaryCredentials
          ? credentials.sessionToken.trim()
          : undefined,
      },
      url,
      method,
    );
  }

  test = awsCredentialsTest;
}
```

### 3. 后端凭证管理

#### CredentialsService
**文件**: `/home/zhang/n8n-quanyuge/packages/cli/src/credentials/credentials.service.ts`

```typescript
@Service()
export class CredentialsService {
  constructor(
    private readonly credentialsRepository: CredentialsRepository,
    private readonly credentialTypes: CredentialTypes,
    private readonly credentialsTester: CredentialsTester,
    private readonly externalHooks: ExternalHooks,
    // ...
  ) {}

  async getMany(
    user: User,
    options?: {
      listQueryOptions?: ListQuery.Options & { includeData?: boolean };
      includeScopes?: boolean;
      includeData?: boolean;
      onlySharedWithMe?: boolean;
    },
  ) {
    // 1. 检查用户权限
    const returnAll = hasGlobalScope(user, 'credential:list');
    
    // 2. 查询数据库
    const credentials = await this.credentialsRepository.find(
      listQueryOptions,
    );
    
    // 3. 可选：解密凭证数据
    if (includeData && userHasScope(user, 'credential:update')) {
      credentials.forEach((cred) => {
        cred.data = this.decryptCredentialData(cred.data);
      });
    }
    
    return credentials;
  }

  async create(
    user: User,
    credentialData: CreateCredentialDto,
    projectId?: string,
  ) {
    // 1. 验证凭证数据
    const credentialType = this.credentialTypes.getByName(
      credentialData.type,
    );
    validateEntity(credentialData.data, credentialType.properties);
    
    // 2. 加密凭证数据
    const encryptedData = this.encryptCredentialData(credentialData.data);
    
    // 3. 保存到数据库
    const credential = await this.credentialsRepository.save({
      name: credentialData.name,
      type: credentialData.type,
      data: encryptedData,
      projectId,
    });
    
    return credential;
  }

  async testConnection(
    credentialId: string,
  ): Promise<{ success: boolean; message?: string }> {
    // 1. 获取凭证
    const credential = await this.credentialsRepository.findOne(
      credentialId,
    );
    const decryptedData = this.decryptCredentialData(credential.data);
    
    // 2. 获取凭证类型
    const credentialType = this.credentialTypes.getByName(
      credential.type,
    );
    
    // 3. 执行测试
    return await this.credentialsTester.test(
      credentialType,
      decryptedData,
    );
  }
}
```

#### CredentialsTester
**文件**: `/home/zhang/n8n-quanyuge/packages/cli/src/services/credentials-tester.service.ts`

```typescript
@Service()
export class CredentialsTester {
  async test(
    credentialType: ICredentialType,
    decryptedData: ICredentialDataDecryptedObject,
  ): Promise<{ success: boolean; message?: string }> {
    // 1. 检查凭证类型是否支持测试
    if (!credentialType.test) {
      return { success: true };  // 不需要测试
    }

    // 2. 构建测试请求
    const testRequest = credentialType.test;
    
    // 3. 注入凭证
    const requestOptions = { ...testRequest.request };
    if (credentialType.authenticate) {
      credentialType.authenticate(decryptedData, requestOptions);
    }
    
    // 4. 发送请求
    try {
      const response = await this.httpService.request(requestOptions);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
```

### 4. 前端凭证管理

#### Credentials Store
**文件**: `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/features/credentials/credentials.store.ts`

```typescript
export const useCredentialsStore = defineStore(
  STORES.CREDENTIALS,
  () => {
    // 存储凭证列表（不包含敏感数据）
    const credentials = ref<ICredentialsResponse[]>([]);
    
    // 获取凭证列表
    const fetch = async () => {
      credentials.value = await credentialsApi.getAll();
    };
    
    // 创建新凭证
    const create = async (newCredentialData: ICredentialsCreate) => {
      const newCredential = await credentialsApi.create(newCredentialData);
      credentials.value.push(newCredential);
      return newCredential;
    };
    
    // 删除凭证
    const delete = async (id: string) => {
      await credentialsApi.delete(id);
      credentials.value = credentials.value.filter((c) => c.id !== id);
    };
    
    // 测试凭证
    const test = async (id: string) => {
      return await credentialsApi.test(id);
    };
    
    return {
      credentials,
      fetch,
      create,
      delete,
      test,
    };
  },
);
```

#### 凭证编辑 UI

用户在节点编辑面板中选择或创建凭证：

1. 在节点参数中显示凭证下拉框
2. 点击"创建新凭证"按钮打开凭证创建模态框
3. 模态框根据凭证类型的 `properties` 动态生成表单
4. 提交时调用凭证 API 保存凭证
5. 凭证 ID 保存在节点的 `credentials` 字段中

### 5. OAuth 2.0 流程

**文件**: `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/app/views/OAuthConsentView.vue`

```
1. 用户点击"连接"按钮连接 OAuth 凭证
   ↓
2. 前端重定向到 n8n OAuth 回调 URL
3. URL 包含 credentialId 和 credentialType 参数
   ↓
4. 后端 OAuth 端点生成 authorization_url
   ↓
5. 用户被重定向到第三方服务（如 Google、GitHub）
   ↓
6. 用户授权 n8n
   ↓
7. 第三方服务重定向回 n8n 回调端点，包含 authorization_code
   ↓
8. 后端使用 code 交换 access_token 和 refresh_token
   ↓
9. 凭证保存到数据库（加密存储）
   ↓
10. 前端接收成功响应，关闭 OAuth 模态框
```

---

## 关键文件映射

### 前端文件结构

```
packages/frontend/editor-ui/src/
├── app/
│   ├── components/
│   │   ├── MainHeader/MainHeader.vue          # 顶部导航
│   │   ├── MainSidebar.vue                    # 左侧边栏
│   │   ├── WorkflowCard.vue                   # 工作流卡片
│   │   └── ... (其他通用组件)
│   ├── stores/
│   │   ├── nodeTypes.store.ts                 # 节点类型管理
│   │   ├── workflows.store.ts                 # 工作流数据管理
│   │   ├── ui.store.ts                        # UI 状态
│   │   └── ... (其他 stores)
│   ├── views/
│   │   ├── NodeView.vue                       # 主编辑器视图
│   │   ├── WorkflowsView.vue                  # 工作流列表
│   │   └── SettingsView.vue                   # 设置页面
│   └── composables/
│       ├── useRunWorkflow.ts                  # 执行工作流逻辑
│       ├── useCanvasOperations.ts             # Canvas 操作
│       └── ... (其他 composables)
│
├── features/
│   ├── workflows/
│   │   ├── canvas/
│   │   │   ├── components/
│   │   │   │   ├── WorkflowCanvas.vue         # Canvas 包装器
│   │   │   │   ├── Canvas.vue                 # Vue Flow 核心
│   │   │   │   ├── elements/
│   │   │   │   │   ├── nodes/                 # 节点组件
│   │   │   │   │   ├── edges/                 # 连接线组件
│   │   │   │   │   ├── handles/               # 连接点组件
│   │   │   │   │   └── buttons/               # 控制按钮
│   │   │   │   └── ...
│   │   │   ├── composables/
│   │   │   │   ├── useCanvasMapping.ts        # 节点/连接映射
│   │   │   │   └── ...
│   │   │   └── canvas.types.ts                # Canvas 类型定义
│   │   └── templates/                         # 模板管理
│   │
│   ├── shared/
│   │   ├── nodeCreator/
│   │   │   ├── components/
│   │   │   │   ├── NodeCreator.vue            # 节点创建面板
│   │   │   │   ├── Panel/NodesListPanel.vue   # 节点列表
│   │   │   │   └── ItemTypes/NodeItem.vue     # 节点项
│   │   │   ├── nodeCreator.store.ts           # 节点创建器 store
│   │   │   └── composables/
│   │   │       └── useActionsGeneration.ts
│   │   │
│   │   ├── ndv/                               # 节点详情视图
│   │   └── contextMenu/                       # 右键菜单
│   │
│   ├── credentials/
│   │   ├── credentials.store.ts               # 凭证管理 store
│   │   └── credentials.types.ts               # 凭证类型定义
│   │
│   ├── execution/
│   │   ├── executions.store.ts                # 执行记录管理
│   │   └── executions.types.ts                # 执行类型定义
│   │
│   └── settings/
│       └── environments.ee/                   # 环境管理（企业版）
│
└── @n8n/
    ├── design-system/                         # 设计系统组件
    └── i18n/
        └── locales/
            ├── en.json                        # 英文翻译
            └── zh.json                        # 中文翻译
```

### 后端文件结构

```
packages/cli/src/
├── workflows/
│   ├── workflow.service.ts                    # 工作流管理服务
│   ├── workflow-execution.service.ts          # 工作流执行服务
│   ├── workflow-runner.ts                     # 工作流运行器
│   ├── workflow-finder.service.ts             # 工作流查询服务
│   └── workflow-history.ee/                   # 工作流历史（企业版）
│
├── credentials/
│   ├── credentials.service.ts                 # 凭证管理服务
│   ├── credentials.service.ee.ts              # 企业版扩展
│   ├── credentials-finder.service.ts          # 凭证查询服务
│   └── credentials-helper.ts                  # 凭证助手函数
│
├── node-types.ts                              # 节点类型管理
├── load-nodes-and-credentials.ts              # 节点和凭证加载
├── credential-types.ts                        # 凭证类型管理
│
├── api/
│   ├── workflows.api.ts                       # 工作流 API
│   ├── credentials.api.ts                     # 凭证 API
│   └── execution.api.ts                       # 执行 API
│
├── webhooks/
│   ├── webhook-request.service.ts             # Webhook 处理
│   └── test-webhooks.ts                       # 测试 Webhook
│
├── active-workflow-manager.ts                 # 活跃工作流管理
├── workflow-runner.ts                         # 工作流执行器
└── events/
    └── event.service.ts                       # 事件服务
```

### 核心包结构

```
packages/
├── workflow/                                  # 工作流类型和接口
│   └── src/
│       ├── interfaces.ts                      # IWorkflow, INode, IConnection
│       ├── workflow.ts                        # Workflow 类
│       ├── node-helpers.ts                    # 节点辅助函数
│       └── expression-helpers.ts              # 表达式计算助手
│
├── core/                                      # 执行引擎核心
│   └── src/
│       ├── execution-engine/
│       │   ├── index.ts
│       │   ├── node-execution-context/       # 节点执行上下文
│       │   └── active-workflows.ts
│       ├── nodes-loader/                     # 节点加载器
│       └── errors/                           # 错误类型
│
├── nodes-base/                                # 内置节点集合
│   ├── nodes/                                 # 节点实现（300+）
│   ├── credentials/                           # 凭证类型（400+）
│   └── utils/                                 # 共享工具函数
│
├── @n8n/
│   ├── api-types/                             # FE/BE 共享类型
│   │   └── src/
│   │       ├── index.ts
│   │       ├── dto/                           # DTO 类型
│   │       └── schemas/                       # JSON Schema
│   │
│   ├── design-system/                         # Vue 组件库
│   ├── i18n/                                  # 国际化
│   ├── di/                                    # 依赖注入容器
│   ├── permissions/                           # RBAC 权限
│   ├── stores/                                # Pinia root stores
│   ├── config/                                # 配置管理
│   └── backend-common/                        # 后端通用工具
│
└── testing/                                   # 测试工具
    └── playwright/                            # E2E 测试
```

---

## 数据流示例：执行一个工作流

### 1. 前端数据准备

```typescript
// NodeView.vue 中
const workflow: IWorkflowDb = {
  id: 'abc123',
  name: 'My Workflow',
  active: false,
  nodes: [
    {
      id: 'node1',
      name: 'Start',
      type: 'start',
      typeVersion: 1,
      position: [100, 100],
      parameters: {},
    },
    {
      id: 'node2',
      name: 'OpenAI',
      type: 'openAi',
      typeVersion: 1,
      position: [300, 100],
      parameters: {
        resource: 'chat',
        operation: 'complete',
        model: 'gpt-4',
        prompt: 'Say hello',
      },
      credentials: {
        openAiApi: { id: 'cred123', name: 'My OpenAI' },
      },
    },
  ],
  connections: {
    node1: {
      main: [[{ node: 'node2', type: 'main', index: 0 }]],
    },
  },
};

// 调用执行
const { runWorkflow } = useRunWorkflow();
const response = await runWorkflow(workflow, 'manual');
```

### 2. 后端处理流程

```typescript
// WorkflowExecutionService.runWorkflow()
1. 构建执行数据
const executionData: IRunExecutionData = {
  startData: {},
  resultData: { runData: {} },
  executionData: {
    nodeExecutionStack: [{ node: startNode, data: { main: [[]] } }],
  },
};

// WorkflowRunner.run()
2. 创建 Workflow 实例
const workflow = new Workflow({
  nodes: data.workflowData.nodes,
  connections: data.workflowData.connections,
});

3. 创建 WorkflowExecute 实例
const workflowExecute = new WorkflowExecute(
  workflow,
  nodeTypes,
  credentials,
  hooks,
);

4. 执行工作流
const result = await workflowExecute.run(
  executionData,
  'manual',
  null,
  null,
);

// n8n-core 的 WorkflowExecute
5. 初始化节点执行栈
const nodeExecutionStack = executionData.executionData.nodeExecutionStack;

6. 依次执行节点
while (nodeExecutionStack.length > 0) {
  const currentNode = nodeExecutionStack.pop();
  
  // 获取节点类型
  const nodeType = nodeTypes.getByNameAndVersion(
    currentNode.type,
    currentNode.typeVersion,
  );
  
  // 创建执行上下文
  const executionContext = new ExecuteContext(
    workflow,
    currentNode,
    nodeType,
    credentials,
  );
  
  // 执行节点
  const result = await nodeType.execute(executionContext);
  
  // 保存运行数据
  executionData.resultData.runData[currentNode.id] = result;
  
  // 添加连接的后续节点到栈
  const connections = workflow.getNodeConnections(currentNode.id);
  for (const connection of connections) {
    nodeExecutionStack.push({
      node: connection.node,
      data: { main: [result] },
    });
  }
}

7. 返回结果
return {
  status: 'finished',
  startTime: new Date(),
  endTime: new Date(),
  data: executionData,
};
```

### 3. WebSocket 实时更新

```typescript
// ExecutionLifecycleHooks 中
executionHook.beforeNodeExecute.push(async (nodeData) => {
  // 广播节点执行开始事件
  wsServer.emit('execution:nodeExecuteStart', {
    executionId,
    nodeId: nodeData.id,
  });
});

executionHook.afterNodeExecute.push(async (nodeData, result) => {
  // 广播节点执行完成事件
  wsServer.emit('execution:nodeExecuteComplete', {
    executionId,
    nodeId: nodeData.id,
    result,
  });
});

executionHook.afterWorkflowFinish.push(async (result) => {
  // 广播工作流完成事件
  wsServer.emit('execution:finished', {
    executionId,
    result,
  });
});
```

### 4. 前端实时更新 UI

```typescript
// 在 NodeView 中监听 WebSocket 事件
const socket = useWebSocket();

socket.on('execution:nodeExecuteStart', ({ executionId, nodeId }) => {
  // 更新节点视觉状态（显示运行中图标）
  const node = workflowsStore.getNodeById(nodeId);
  node.runData = { status: 'running' };
});

socket.on('execution:nodeExecuteComplete', ({ executionId, nodeId, result }) => {
  // 更新运行数据
  workflowsStore.updateNodeRunData(nodeId, result);
  
  // 在 NDV（节点详情面板）中显示输出
  if (selectedNode.value?.id === nodeId) {
    ndvStore.outputData = result.main;
  }
});

socket.on('execution:finished', ({ executionId, result }) => {
  // 保存执行记录
  executionsStore.addExecution(result);
  
  // 更新工作流运行状态
  workflowsStore.currentWorkflow.runData = result.data.resultData.runData;
});
```

---

## 总结

n8n 的核心架构包括：

1. **前端编辑器** - 基于 Vue 3 + Pinia 的可视化工作流编辑器
   - Canvas 使用 Vue Flow 库实现节点和连接的可视化
   - 节点创建面板提供节点选择和参数配置
   - Pinia stores 管理全局状态

2. **节点系统** - 可扩展的节点架构
   - 每个节点实现 INodeType 接口
   - 节点参数通过 INodeProperties 定义，支持动态加载选项
   - 节点版本化支持向后兼容

3. **工作流执行** - 后端 WorkflowRunner 和 n8n-core 的 WorkflowExecute
   - 构建执行栈依次执行节点
   - 每个节点执行时获得完整的执行上下文（IExecuteFunctions）
   - WebSocket 实时推送执行状态更新

4. **凭证系统** - 集中式凭证管理和加密存储
   - 凭证类型定义凭证字段和认证方法
   - 支持多种认证方式（API Key、OAuth 2.0、IAM 等）
   - 数据库中加密存储，执行时解密注入

这个架构设计使 n8n 能够支持数百个集成节点，同时保持高度的可扩展性和安全性。
