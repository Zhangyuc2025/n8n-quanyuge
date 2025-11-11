# SASA 平台节点动态化 - 详细架构图

> 深度技术文档 | 2025-11-11

---

## 1. 三层节点架构全景图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│          SASA 平台 - 三层节点动态化架构（v2.0）                            │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Layer 1: 内置基础节点 (Built-in Nodes)                              │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  来源: 文件系统 (n8n-nodes-base)                                     │  │
│  │  路径: packages/nodes-base/nodes/*/*.node.ts                         │  │
│  │  数量: 53 个基础节点                                                 │  │
│  │  特性:                                                              │  │
│  │    ✓ 只读，无法修改                                                 │  │
│  │    ✓ 所有租户共享                                                   │  │
│  │    ✓ 无凭证依赖                                                     │  │
│  │    ✓ 纯逻辑节点                                                     │  │
│  │  例子: Set, If, Code, Switch, Merge, Filter...                     │  │
│  │                                                                       │  │
│  │  加载器: DirectoryLoader / LazyPackageDirectoryLoader               │  │
│  │  类型接口: INodeType                                                │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Layer 2: 平台节点 (Platform Nodes) - 管理员管理                      │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  来源: 数据库 (platform_node 表)                                     │  │
│  │  特性: 所有用户可见，管理员统一管理                                  │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │ 2.1 平台托管节点 (Platform Managed)                          │   │  │
│  │  ├─────────────────────────────────────────────────────────────┤   │  │
│  │  │ 特点: 平台提供 API Key，用户直接使用（按量计费）              │   │  │
│  │  │                                                              │   │  │
│  │  │ 例子:                                                       │   │  │
│  │  │  • OpenAI Chat          (isBillable: true, 0.01¥/次)        │   │  │
│  │  │  • Claude Chat          (isBillable: true, 0.015¥/次)       │   │  │
│  │  │  • Gemini Chat          (isBillable: true, 0.008¥/次)       │   │  │
│  │  │  • Translate (Baidu)    (isBillable: true, 0.002¥/次)       │   │  │
│  │  │                                                              │   │  │
│  │  │ 计费集成:                                                   │   │  │
│  │  │  ✓ 字段: isBillable, pricePerRequest                        │   │  │
│  │  │  ✓ 扣费时机: 节点执行完成后                                 │   │  │
│  │  │  ✓ 余额保证: 悲观锁防止透支                                 │   │  │
│  │  │  ⚠️ 状态: 字段已设计，扣费逻辑待实现                        │   │  │
│  │  │                                                              │   │  │
│  │  └─────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │ 2.2 第三方节点 (Third Party)                                │   │  │
│  │  ├─────────────────────────────────────────────────────────────┤   │  │
│  │  │ 特点: 用户自备 API Key，管理员从 npm 精选并改造               │   │  │
│  │  │                                                              │   │  │
│  │  │ 例子:                                                       │   │  │
│  │  │  • GitHub API                                              │   │  │
│  │  │  • Slack                                                   │   │  │
│  │  │  • Telegram                                                │   │  │
│  │  │  • Stripe                                                  │   │  │
│  │  │                                                              │   │  │
│  │  │ 工作流:                                                     │   │  │
│  │  │  1. 用户通过平台界面上传 npm 包 URL                          │   │  │
│  │  │  2. 管理员审核和改造（凭证转换 + 汉化）                      │   │  │
│  │  │  3. 管理员通过审核                                           │   │  │
│  │  │  4. 节点对所有用户可见                                       │   │  │
│  │  │                                                              │   │  │
│  │  └─────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  │  数据库存储:                                                        │  │
│  │    ┌─────────────────────────────────────────────────┐             │  │
│  │    │ platform_node 表 (32 字段)                       │             │  │
│  │    │                                                 │             │  │
│  │    │ 主键:          nodeKey                          │             │  │
│  │    │ 定义:          nodeDefinition (JSON)            │             │  │
│  │    │ 代码:          nodeCode (TEXT)                  │             │  │
│  │    │ 计费 ✅:       isBillable, pricePerRequest      │             │  │
│  │    │ 审核:          submissionStatus, reviewedBy     │             │  │
│  │    │ 状态:          isActive, enabled                │             │  │
│  │    │ 元数据:        category, description, icon      │             │  │
│  │    │                                                 │             │  │
│  │    └─────────────────────────────────────────────────┘             │  │
│  │                                                                       │  │
│  │  执行方式:                                                          │  │
│  │    1. 获取节点: await platformNodeService.getNodeByKey(key)        │  │
│  │    2. 获取代码: nodeCode = node.nodeCode                           │  │
│  │    3. 编译: NodeClass = nodeCompiler.compileNodeCode(nodeCode)     │  │
│  │    4. 沙箱执行: result = await nodeInstance.execute()              │  │
│  │    5. 计费 ⚠️: await billingService.charge(...)  [待实现]          │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Layer 3: 自定义节点 (Custom Nodes) - 用户管理                        │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  来源: 数据库 (custom_node 表)                                       │  │
│  │  特性:                                                              │  │
│  │    ✓ 工作空间私有（多租户隔离）                                    │  │
│  │    ✓ 只有工作空间成员可见                                          │  │
│  │    ✓ 用户上传 TypeScript 代码                                      │  │
│  │    ✓ 可选提交审核（通过后变成 Layer 2）                            │  │
│  │                                                                       │  │
│  │  创建流程:                                                          │  │
│  │    1. 用户编写 TypeScript 代码（遵循 INodeType 接口）              │  │
│  │    2. 上传到工作空间（设置 configMode: personal 或 shared）        │  │
│  │    3. 代码自动验证和编译                                            │  │
│  │    4. 可在工作流中立即使用                                          │  │
│  │    5. 可选提交审核，通过后成为平台节点                              │  │
│  │                                                                       │  │
│  │  配置管理（两种模式）:                                              │  │
│  │    ┌─────────────────────────────────────────────────┐             │  │
│  │    │ configMode: 'personal' (默认)                   │             │  │
│  │    │ ├─ 每个用户有独立配置                            │             │  │
│  │    │ ├─ 存储在 user_node_config 表                   │             │  │
│  │    │ └─ 用户各自填写 API Key、参数等                  │             │  │
│  │    │                                                 │             │  │
│  │    │ configMode: 'shared' (团队共享)                 │             │  │
│  │    │ ├─ 整个工作空间共用一份配置                      │             │  │
│  │    │ ├─ 存储在 custom_node.sharedConfigData          │             │  │
│  │    │ ├─ 加密存储（使用 Cipher）                      │             │  │
│  │    │ └─ 仅工作空间管理员可设置                        │             │  │
│  │    │                                                 │             │  │
│  │    └─────────────────────────────────────────────────┘             │  │
│  │                                                                       │  │
│  │  数据库存储:                                                        │  │
│  │    ┌─────────────────────────────────────────────────┐             │  │
│  │    │ custom_node 表 (28 字段)                         │             │  │
│  │    │                                                 │             │  │
│  │    │ 主键:          id (UUID)                        │             │  │
│  │    │ 隔离:          workspace_id (多租户)             │             │  │
│  │    │ 定义:          node_definition (JSON)           │             │  │
│  │    │ 代码:          node_code (TEXT)                 │             │  │
│  │    │ 配置:          config_mode, configSchema        │             │  │
│  │    │ 共享配置:      sharedConfigData (加密)          │             │  │
│  │    │ 审核:          submissionStatus, reviewedBy     │             │  │
│  │    │ 创建者:        created_by                       │             │  │
│  │    │ 状态:          is_active                        │             │  │
│  │    │ 计费 ❌:       [缺失]                            │             │  │
│  │    │                                                 │             │  │
│  │    └─────────────────────────────────────────────────┘             │  │
│  │                                                                       │  │
│  │  执行方式:                                                          │  │
│  │    1. 验证权限: 仅工作空间成员可执行                                │  │
│  │    2. 获取节点: await customNodeService.getNodeByKey(ws, key)      │  │
│  │    3. 获取配置: 如果 configMode='personal'                         │  │
│  │    4. 编译: NodeClass = nodeCompiler.compileNodeCode(nodeCode)     │  │
│  │    5. 沙箱执行: result = await nodeInstance.execute()              │  │
│  │    6. 计费 ❌: [需要添加]                                           │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 节点加载时序图

```
工作流执行流程
┌─────────────┐
│ 工作流运行   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ 1. 加载工作流定义                         │
│    workflow.nodes = [                    │
│      { type: 'n8n-nodes-base.set' },     │ ◄─ Layer 1
│      { type: 'platform:openai-chat' },   │ ◄─ Layer 2
│      { type: 'custom:weather-query' },   │ ◄─ Layer 3
│    ]                                     │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ 2. 识别节点来源（前缀识别）              │
│                                          │
│ if (nodeType.startsWith('n8n-nodes')) {  │
│   // Layer 1: 文件系统加载               │
│   const node = nodeTypes.getByName(...); │
│                                          │
│ } else if (nodeType.startsWith('platform:')) {
│   // Layer 2: 数据库加载                 │
│   const node = await platform            │
│     NodeService.getNodeByKey(key);       │
│                                          │
│ } else if (nodeType.startsWith('custom:')) {
│   // Layer 3: 数据库加载                 │
│   const node = await                     │
│     customNodeService.getNodeByKey(...)  │
│ }                                        │
│                                          │
│ ⚠️ 当前状态: 逻辑缺失！                  │
│    NodeTypes 没有数据库查询逻辑          │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ 3. 加载节点定义和代码                    │
│                                          │
│ Layer 1: 从内存加载（已加载）            │
│  → definition = node.description         │
│                                          │
│ Layer 2: 从数据库加载                    │
│  → definition = node.nodeDefinition (JSON)
│  → code = node.nodeCode (TEXT)           │
│                                          │
│ Layer 3: 从数据库加载（工作空间私有）   │
│  → definition = node.nodeDefinition      │
│  → code = node.nodeCode                  │
│  → config = await getConfig(userId)      │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ 4. 编译和验证代码（Layer 2 & 3）        │
│                                          │
│ Step 4a: 语法验证                        │
│  const NodeClass =                       │
│    nodeCompiler.compileNodeCode(code);   │
│                                          │
│ Step 4b: 实例化验证                      │
│  const nodeInstance = new NodeClass();   │
│                                          │
│ Step 4c: 接口验证                        │
│  if (!nodeInstance.execute) {            │
│    throw 'Missing execute() method';     │
│  }                                       │
│                                          │
│ ✅ 实现: NodeCompilerService             │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ 5. 准备执行上下文                        │
│                                          │
│ const execContext = {                    │
│   node: nodeDefinition,                  │
│   workflow: workflow,                    │
│   executionData: {...},                  │
│   helpers: {...},                        │
│   params: {...},                         │
│   // Layer 2/3 特有                      │
│   projectId: workspaceId,                │
│   userId: user.id,                       │
│ };                                       │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ 6. 沙箱执行节点                          │
│                                          │
│ if (isLayer1Node) {                      │
│   // 直接执行（已验证）                  │
│   result = await node.execute(context);  │
│                                          │
│ } else {                                 │
│   // VM2 沙箱执行（Layer 2 & 3）        │
│   result = await nodeInstance.execute    │
│     .call(execContext);                  │
│ }                                        │
│                                          │
│ ✅ 实现: VM2 沙箱                        │
│ ⚠️ 缺失: 错误处理和重试                 │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ 7. 计费（Layer 2 平台托管节点）         │
│                                          │
│ if (node.isBillable) {                   │
│   const balance =                        │
│     await billingService.getBalance(...) │
│                                          │
│   if (balance < node.pricePerRequest) {  │
│     throw new InsufficientBalanceError() │
│   }                                      │
│                                          │
│   await billingService                   │
│     .chargeNodeExecution(                │
│       workspaceId,                       │
│       nodeKey,                           │
│       node.pricePerRequest,              │
│     );                                   │
│ }                                        │
│                                          │
│ ❌ 缺失: 完整实现                        │
│    字段存在，逻辑缺失                    │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ 8. 返回执行结果                          │
│    output = [                            │
│      {                                   │
│        data: {...},                      │
│        timestamp: Date.now(),            │
│        nodeId: node.id,                  │
│      }                                   │
│    ]                                     │
└──────────────────────────────────────────┘
```

---

## 3. 数据库关系图

```
┌────────────────────────────────────────────────────────────────────┐
│ n8n 数据库架构 - 节点动态化部分                                      │
└────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐         ┌──────────────────────┐
│     user            │         │   project            │
├─────────────────────┤         ├──────────────────────┤
│ id (PK) ────────┐   │         │ id (PK) ──────────┐  │
│ email           │   │         │ name               │  │
│ firstName       │   │         │ type               │  │
│ role_id (FK)    │   │         │ created_at         │  │
│ workspace_id(FK)│   │         │ updated_at         │  │
└────┬────────────┘   │         └───────┬────────────┘  │
     │                │                 │               │
     │                │                 │               │
     │        ┌────────────────────────┬┴────────────┐  │
     │        │                        │             │  │
     │        │                        │             │  │
  ┌──▼────────▼─────────────────┐  ┌──▼─────────────┐ │
  │ platform_node               │  │ custom_node    │ │
  ├─────────────────────────────┤  ├────────────────┤ │
  │ nodeKey (PK)                │  │ id (PK)        │ │
  │ nodeName                    │  │ nodeKey        │ │
  │ nodeType                    │  │ nodeName       │ │
  │ nodeDefinition (JSON)       │  │ workspace_id──┼─┼──┐
  │ nodeCode (TEXT)             │  │ (FK)           │ │  │
  │ category                    │  │ nodeDefinition │ │  │
  │ isBillable ✅               │  │ nodeCode       │ │  │
  │ pricePerRequest ✅          │  │ configMode     │ │  │
  │ submissionStatus            │  │ configSchema   │ │  │
  │ submittedBy (FK)────────────┼──┼──────┐         │ │  │
  │ reviewedBy (FK)─────────┐   │  │      │         │ │  │
  │ reviewedAt              │   │  │ sharedConfigBy │ │  │
  │ version                 │   │  │ (FK)──┐        │ │  │
  │ created_at              │   │  │       │        │ │  │
  │ updated_at              │   │  │ isActive       │ │  │
  │ isActive                │   │  │ created_by (FK)┼─┼──┤
  │ enabled                 │   │  │ submissionStatus
  └─────────────────────────┘   │  │ reviewedBy (FK)
                                │  └────────────────┘
                                │
                        ┌───────┘
                        │
                        ▼
                  ┌──────────────┐
                  │ user         │
                  ├──────────────┤
                  │ id           │
                  │ email        │
                  │ firstName    │
                  └──────────────┘

┌──────────────────────────────────┐
│ user_node_config (个人配置)        │
├──────────────────────────────────┤
│ id (PK)                          │
│ userId (FK) ──┐                  │
│ nodeType      │                  │
│ config (JSON) │                  │
│ isConfigured  │                  │
│ lastUsedAt    │                  │
│ created_at    │                  │
│ updated_at    │                  │
└───────────────┼──────────────────┘
                │
                ▼
           ┌────────────┐
           │ user       │
           │ id         │
           └────────────┘

┌────────────────────────────────────────┐
│ 计费相关表（独立体系）                    │
├────────────────────────────────────────┤
│ • workspace_balance                    │
│   ├─ workspace_id (FK to project)     │
│   ├─ balance (人民币，Decimal)        │
│   ├─ last_updated                     │
│                                        │
│ • recharge_record                      │
│   ├─ workspace_id                      │
│   ├─ amount                            │
│   ├─ currency                          │
│   ├─ payment_method                    │
│   ├─ status                            │
│                                        │
│ • balance_transfer_record              │
│   ├─ from_workspace_id                │
│   ├─ to_workspace_id                  │
│   ├─ amount                            │
│   ├─ reason                            │
│                                        │
└────────────────────────────────────────┘

关键约束:
  ✅ custom_node(workspace_id, nodeKey) UNIQUE
  ✅ 级联删除: project ← custom_node
  ⚠️ 缺失: custom_node 的计费字段 (isBillable, pricePerRequest)
```

---

## 4. 服务层架构 - 依赖注入关系

```
┌────────────────────────────────────────────────────────────┐
│ REST API 请求                                             │
│ POST /platform-nodes                                       │
│ POST /custom-nodes                                         │
│ GET  /workflows/:id/execute                                │
└────────┬───────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│ Controllers 层 (@RestController)                           │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ • PlatformNodesController                                  │
│   └─ @Inject PlatformNodeService                          │
│                                                             │
│ • (CustomNodesController - 待实现)                         │
│   └─ @Inject CustomNodeService                            │
│                                                             │
│ • DynamicNodeParametersController                          │
│   └─ @Inject DynamicNodeParametersService                 │
│                                                             │
│ • AvailableNodesController                                 │
│   └─ @Inject PlatformNodeService                          │
│      @Inject CustomNodeService                            │
│                                                             │
└────────┬───────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│ Services 层 (@Service)                                    │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ PlatformNodeService (477 行)                         │  │
│ ├──────────────────────────────────────────────────────┤  │
│ │ @Inject PlatformNodeRepository                       │  │
│ │                                                      │  │
│ │ Methods:                                             │  │
│ │  • getAllNodes(filters)     ✅                       │  │
│ │  • getActiveNodes(category) ✅                       │  │
│ │  • getNodeByKey(nodeKey)    ✅                       │  │
│ │  • getNodeCode(nodeKey)     ✅                       │  │
│ │  • createNode(data)         ✅                       │  │
│ │  • updateNode(nodeKey)      ✅                       │  │
│ │  • deleteNode(nodeKey)      ✅                       │  │
│ │  • approveNode(nodeKey)     ✅ (审核)              │  │
│ │  • rejectNode(nodeKey)      ✅ (审核)              │  │
│ │  • toggleNode(nodeKey)      ✅                       │  │
│ │  • bulkCreateNodes(nodes)   ✅                       │  │
│ │  • searchNodes(query)       ✅                       │  │
│ │  • getNodesByCategory()     ✅                       │  │
│ │  • getNodesForWorkspace()   ⚠️ (保留扩展)          │  │
│ │                                                      │  │
│ │ 缺失:                                               │  │
│ │  ❌ 计费扣费逻辑                                     │  │
│ │  ❌ 执行代理                                         │  │
│ │                                                      │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ CustomNodeService (546 行)                           │  │
│ ├──────────────────────────────────────────────────────┤  │
│ │ @Inject CustomNodeRepository                         │  │
│ │ @Inject Cipher                                       │  │
│ │                                                      │  │
│ │ Methods:                                             │  │
│ │  • getWorkspaceNodes(wsId)           ✅              │  │
│ │  • getNodeById(nodeId, wsId)         ✅              │  │
│ │  • getNodeByKey(wsId, nodeKey)       ✅              │  │
│ │  • createNode(data)                  ✅              │  │
│ │  • updateNode(nodeId, wsId, updates) ✅              │  │
│ │  • deleteNode(nodeId, wsId)          ✅              │  │
│ │  • setSharedConfig(nodeId, wsId)     ✅ (加密)      │  │
│ │  • getSharedConfig(nodeId, wsId)     ✅ (解密)      │  │
│ │  • switchConfigMode(nodeId, wsId)    ✅              │  │
│ │  • submitForReview(nodeId, wsId)     ✅              │  │
│ │  • reviewNode(nodeId, approved)      ✅ (审核)      │  │
│ │  • toggleNode(nodeId, wsId)          ✅              │  │
│ │  • getNodeCode(nodeId, wsId)         ✅              │  │
│ │  • searchWorkspaceNodes(wsId, query) ✅              │  │
│ │  • getNodesByCategory(wsId)          ✅              │  │
│ │  • getPendingNodes()                 ✅ (管理员)    │  │
│ │                                                      │  │
│ │ 特性:                                               │  │
│ │  ✅ 多租户隔离（所有查询验证 workspaceId）           │  │
│ │  ✅ 权限检查                                         │  │
│ │  ✅ 加密存储（Cipher）                              │  │
│ │                                                      │  │
│ │ 缺失:                                               │  │
│ │  ❌ 计费字段和逻辑                                   │  │
│ │  ❌ 版本管理                                         │  │
│ │  ❌ 依赖检查                                         │  │
│ │                                                      │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ NodeCompilerService (268 行)                         │  │
│ ├──────────────────────────────────────────────────────┤  │
│ │ @Inject Logger                                       │  │
│ │                                                      │  │
│ │ Methods:                                             │  │
│ │  • compileNodeCode(code)              ✅ VM2沙箱   │  │
│ │  • validateNodeMetadata(desc)         ✅            │  │
│ │  • validateAndInstantiateNode(code)   ✅            │  │
│ │  • validateMultipleNodes(codes)       ✅            │  │
│ │  • createSandboxRequire()             ✅ 白名单    │  │
│ │                                                      │  │
│ │ 安全特性:                                           │  │
│ │  ✅ VM2 沙箱（5秒超时）                              │  │
│ │  ✅ 模块白名单（仅 n8n-* 模块）                      │  │
│ │  ✅ 类型检查（必须导出类）                           │  │
│ │  ✅ 元数据验证                                       │  │
│ │                                                      │  │
│ │ 缺失:                                               │  │
│ │  ⚠️ 内存/CPU 限制                                    │  │
│ │  ⚠️ AST 分析                                         │  │
│ │                                                      │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ DynamicNodeParametersService                         │  │
│ ├──────────────────────────────────────────────────────┤  │
│ │ @Inject Logger                                       │  │
│ │ @Inject NodeTypes                                    │  │
│ │ @Inject WorkflowLoaderService                        │  │
│ │                                                      │  │
│ │ Methods:                                             │  │
│ │  • getOptionsViaMethodName(...)       ✅             │  │
│ │  • scrubInaccessibleProjectId(...)    ✅             │  │
│ │                                                      │  │
│ │ 用途: 加载动态参数列表（dropdown 选项等）           │  │
│ │                                                      │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                             │
└────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│ Repository 层 (@Service extends Repository<T>)            │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ • PlatformNodeRepository (98 行)                           │
│   ├─ findActive()                                          │
│   ├─ findByNodeKey(nodeKey)                                │
│   ├─ findActiveByNodeKey(nodeKey)                          │
│   ├─ findByCategory(category)                              │
│   ├─ findByNodeType(nodeType)                              │
│   └─ findPendingApproval()                                 │
│                                                             │
│ • CustomNodeRepository (133 行)                            │
│   ├─ findByWorkspace(workspaceId)                          │
│   ├─ findByWorkspaceAndNodeKey(wsId, key)                  │
│   ├─ findActiveByWorkspaceAndNodeKey(wsId, key)            │
│   ├─ findByWorkspaceAndCategory(wsId, category)            │
│   ├─ findByWorkspaceAndConfigMode(wsId, mode)              │
│   ├─ findByCreator(createdBy)                              │
│   ├─ findPendingApproval()                                 │
│   └─ findBySubmissionStatus(status)                        │
│                                                             │
│ • UserNodeConfigRepository (102 行)                        │
│   ├─ findByUser(userId)                                    │
│   ├─ findByUserAndNodeType(userId, nodeType)               │
│   ├─ findActiveByUserAndNodeType(userId, nodeType)         │
│   ├─ updateLastUsedAt(userId, nodeType)                    │
│   ├─ findUnusedSince(sinceDate)                            │
│   └─ deleteByUserAndNodeType(userId, nodeType)             │
│                                                             │
└────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│ 数据库 (PostgreSQL)                                        │
├────────────────────────────────────────────────────────────┤
│  ├─ platform_node                                          │
│  ├─ custom_node                                            │
│  ├─ user_node_config                                       │
│  └─ [其他 n8n 表]                                          │
└────────────────────────────────────────────────────────────┘
```

---

## 5. 工作流执行集成点

```
┌─────────────────────────────────────────────────────────────┐
│ 工作流执行引擎 (WorkflowExecute)                            │
├─────────────────────────────────────────────────────────────┤
│ packages/core/src/execution-engine/workflow-execute.ts      │
│                                                              │
│ 当前流程:                                                  │
│  1. 加载工作流                                              │
│  2. 遍历节点                                                │
│  3. 获取节点类型: nodeTypes.getByNameAndVersion(nodeType)  │
│  4. 执行节点                                                │
│                                                              │
│ ⚠️ 问题: 步骤3 只处理 Layer 1 (文件系统)                  │
│                                                              │
│ 需要改造点:                                                │
│                                                              │
│  ┌─────────────────────────────────────────────────┐       │
│  │ 改造位置 1: NodeTypes 类                         │       │
│  ├─────────────────────────────────────────────────┤       │
│  │                                                 │       │
│  │ // 当前代码 (src/node-types.ts)                │       │
│  │ getByNameAndVersion(nodeType: string) {        │       │
│  │   const node = this.loadNodesAndCredentials    │       │
│  │     .getNode(nodeType);                        │       │
│  │   return NodeHelpers.getVersionedNodeType(...) │       │
│  │ }                                              │       │
│  │                                                 │       │
│  │ // 改造后:                                     │       │
│  │ async getByNameAndVersion(                     │       │
│  │   nodeType: string,                            │       │
│  │   projectId?: string                           │       │
│  │ ) {                                            │       │
│  │   // 识别前缀                                  │       │
│  │   if (nodeType.startsWith('platform:')) {      │       │
│  │     const key = nodeType.replace('platform:', '');
│  │     const node = await this                    │       │
│  │       .platformNodeService.getNodeByKey(key);  │       │
│  │     // 编译和返回                              │       │
│  │   } else if (nodeType.startsWith('custom:')) { │       │
│  │     const key = nodeType.replace('custom:', '');│      │
│  │     const node = await this                    │       │
│  │       .customNodeService.getNodeByKey(...);    │       │
│  │     // 编译和返回                              │       │
│  │   } else {                                      │       │
│  │     // Layer 1 逻辑                            │       │
│  │   }                                            │       │
│  │ }                                              │       │
│  │                                                 │       │
│  └─────────────────────────────────────────────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────┐       │
│  │ 改造位置 2: 工作流执行器                         │       │
│  ├─────────────────────────────────────────────────┤       │
│  │                                                 │       │
│  │ // 在执行每个节点时                            │       │
│  │ async runNode(node) {                          │       │
│  │   const nodeType = await nodeTypes            │       │
│  │     .getByNameAndVersion(                      │       │
│  │       node.type,                               │       │
│  │       this.projectId  // ◄ 传入 projectId    │       │
│  │     );                                         │       │
│  │                                                 │       │
│  │   // 执行节点                                  │       │
│  │   const result = await nodeType.execute(...);  │       │
│  │                                                 │       │
│  │   // 计费（如果需要）✅ ← 新增               │       │
│  │   if (nodeType.isBillable) {                   │       │
│  │     await this.billingService                  │       │
│  │       .chargeNodeExecution(                    │       │
│  │         this.projectId,                        │       │
│  │         node.type,                             │       │
│  │         nodeType.price                         │       │
│  │       );                                       │       │
│  │   }                                            │       │
│  │                                                 │       │
│  │   return result;                               │       │
│  │ }                                              │       │
│  │                                                 │       │
│  └─────────────────────────────────────────────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────┐       │
│  │ 改造位置 3: 错误处理                            │       │
│  ├─────────────────────────────────────────────────┤       │
│  │                                                 │       │
│  │ try {                                          │       │
│  │   const result = await nodeType.execute(...);  │       │
│  │   return result;                               │       │
│  │                                                 │       │
│  │ } catch (error) {                              │       │
│  │   // 根据错误类型处理                          │       │
│  │   if (error instanceof VMError) {              │       │
│  │     // VM2 沙箱错误 (超时、执行错误等)        │       │
│  │     throw new NodeExecutionError(...)          │       │
│  │   } else if (error instanceof                  │       │
│  │     InsufficientBalanceError) {                │       │
│  │     // 余额不足                                │       │
│  │     throw error;                               │       │
│  │   } else {                                      │       │
│  │     // 其他错误                                │       │
│  │     throw error;                               │       │
│  │   }                                            │       │
│  │ }                                              │       │
│  │                                                 │       │
│  └─────────────────────────────────────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 计费系统集成点

```
┌────────────────────────────────────────────────────────┐
│ 平台节点计费流程                                        │
└────────────────────────────────────────────────────────┘

┌─────────────┐
│ 用户执行    │
│ 工作流      │
└──────┬──────┘
       │
       ▼
┌────────────────────────────────────────────────────┐
│ 1. 前置检查                                        │
│    ├─ 工作流有效性                                │
│    ├─ 用户权限                                    │
│    └─ 余额充足                                    │
│                                                    │
│    await billingService.checkBalance({            │
│      projectId: workspaceId,                      │
│      minimumRequired: 0.01  // 最低成本           │
│    });                                            │
│                                                    │
│    ✅ 实现: WorkspaceBilling service              │
│    ❌ 缺失: 与节点执行的集成                      │
│                                                    │
└────────┬───────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────┐
│ 2. 遍历节点                                        │
│    for (const node of workflow.nodes) {           │
│      // 检查是否需要计费                          │
│      const nodeDefinition =                       │
│        await nodeTypes.getByNameAndVersion(...)   │
│                                                   │
│      if (nodeDefinition.isBillable) {             │
│        // 预检查余额                              │
│        const cost = nodeDefinition.pricePerRequest
│        const balance =                            │
│          await billingService.getBalance(...)    │
│                                                   │
│        if (balance < cost) {                      │
│          throw new InsufficientBalanceError(...)  │
│        }                                          │
│      }                                            │
│    }                                              │
│                                                    │
│    ❌ 当前: 无此逻辑                              │
│    ⚠️ 建议: 在工作流启动前检查总成本              │
│                                                    │
└────────┬───────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────┐
│ 3. 执行节点                                        │
│    for (const node of executionOrder) {           │
│      try {                                        │
│        // 执行节点                                │
│        const result = await executeNode(node);    │
│                                                   │
│        // 节点执行成功 → 扣费                    │
│        if (nodeDefinition.isBillable) {           │
│          await billingService                    │
│            .chargeNodeExecution({                 │
│              projectId: workspaceId,              │
│              nodeKey: node.type,                  │
│              amount: nodeDefinition               │
│                .pricePerRequest,                  │
│              executionId: this.executionId,       │
│              timestamp: Date.now(),               │
│            });                                    │
│        }                                          │
│                                                   │
│      } catch (error) {                            │
│        // 节点执行失败 → 不扣费                  │
│        if (error instanceof                       │
│          InsufficientBalanceError) {              │
│          // 中断工作流                            │
│          throw error;                             │
│        } else {                                   │
│          // 其他错误：记录但继续                  │
│          log.error('Node execution failed', error)
│        }                                          │
│      }                                            │
│    }                                              │
│                                                    │
│    ✅ 部分实现: Platform_node.isBillable 字段   │
│    ❌ 缺失: chargeNodeExecution() 实现             │
│    ❌ 缺失: 与工作流执行器的集成                  │
│                                                    │
└────────┬───────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────┐
│ 4. 结算报告                                        │
│                                                    │
│    const executionSummary = {                     │
│      executionId: this.executionId,               │
│      projectId: workspaceId,                      │
│      totalCost: 0,                                │
│      charges: [                                   │
│        {                                          │
│          nodeKey: 'openai-chat',                  │
│          nodeType: 'platform:openai-chat',        │
│          price: 0.01,                             │
│          executedAt: Date.now(),                  │
│          status: 'success'                        │
│        },                                         │
│        {                                          │
│          nodeKey: 'gemini-chat',                  │
│          nodeType: 'platform:gemini-chat',        │
│          price: 0.008,                            │
│          executedAt: Date.now(),                  │
│          status: 'success'                        │
│        }                                          │
│      ],                                           │
│      totalCost: 0.018,                            │
│      remainingBalance: 99.982,                    │
│    };                                             │
│                                                    │
│    // 存储计费记录                                │
│    await billingService                          │
│      .recordNodeExecutionCharges(executionSummary)
│                                                    │
│    ❌ 缺失: 完整的计费记录系统                    │
│    ❌ 缺失: 定时对账                              │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 7. 前端集成架构

```
┌─────────────────────────────────────────────────────┐
│ Editor UI (Vue 3 + Pinia)                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ Stores (状态管理)                             │ │
│  ├───────────────────────────────────────────────┤ │
│  │                                               │ │
│  │ usePlatformNodesStore                         │ │
│  │ ├─ nodes: PlatformNode[]                      │ │
│  │ ├─ selectedNode: PlatformNode | null          │ │
│  │ ├─ loading: boolean                           │ │
│  │ ├─ filters: NodeFilters                       │ │
│  │ ├─ computed: {                                │ │
│  │ │  platformManagedNodes,                      │ │
│  │ │  thirdPartyNodes,                           │ │
│  │ │  enabledNodes,                              │ │
│  │ │  nodesByCategory,                           │ │
│  │ │  categories                                 │ │
│  │ │}                                            │ │
│  │ ├─ actions: {                                 │ │
│  │ │  async fetchNodes(),                        │ │
│  │ │  async fetchNodesByCategory(),              │ │
│  │ │  async searchNodes(query),                  │ │
│  │ │  async approveNode(nodeKey),                │ │
│  │ │  async rejectNode(nodeKey),                 │ │
│  │ │  async toggleNode(nodeKey, enabled)         │ │
│  │ │}                                            │ │
│  │ └─ getters: {...}                            │ │
│  │                                               │ │
│  │ useCustomNodesStore                           │ │
│  │ ├─ customNodes: CustomNode[]                  │ │
│  │ ├─ selectedNode: CustomNode | null            │ │
│  │ ├─ loading: boolean                           │ │
│  │ ├─ computed: {                                │ │
│  │ │  activeNodes,                               │ │
│  │ │  pendingNodes,                              │ │
│  │ │  userManagedNodes,                          │ │
│  │ │  teamSharedNodes,                           │ │
│  │ │  nodesByCategory                            │ │
│  │ │}                                            │ │
│  │ ├─ actions: {                                 │ │
│  │ │  async fetchWorkspaceNodes(projectId),      │ │
│  │ │  async createNode(nodeData),                │ │
│  │ │  async updateNode(nodeId, updates),         │ │
│  │ │  async deleteNode(nodeId),                  │ │
│  │ │  async setSharedConfig(nodeId, config),     │ │
│  │ │  async submitForReview(nodeId),             │ │
│  │ │  async toggleNode(nodeId, isActive)         │ │
│  │ │}                                            │ │
│  │ └─ getters: {...}                            │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ API 客户端 (HTTP)                             │ │
│  ├───────────────────────────────────────────────┤ │
│  │                                               │ │
│  │ platforms-nodes.api.ts                        │ │
│  │ ├─ GET  /platform-nodes                       │ │
│  │ ├─ GET  /platform-nodes/:nodeKey              │ │
│  │ ├─ GET  /platform-nodes/search?q=...          │ │
│  │ ├─ POST /platform-nodes/:nodeKey/approve      │ │
│  │ ├─ POST /platform-nodes/:nodeKey/reject       │ │
│  │ └─ PATCH /platform-nodes/:nodeKey/toggle      │ │
│  │                                               │ │
│  │ custom-nodes.api.ts (待实现)                  │ │
│  │ ├─ GET  /custom-nodes                         │ │
│  │ ├─ POST /custom-nodes                         │ │
│  │ ├─ PATCH /custom-nodes/:nodeId                │ │
│  │ ├─ DELETE /custom-nodes/:nodeId               │ │
│  │ ├─ POST /custom-nodes/:nodeId/config          │ │
│  │ └─ POST /custom-nodes/:nodeId/submit-review   │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ 组件 (Vue Components)                         │ │
│  ├───────────────────────────────────────────────┤ │
│  │                                               │ │
│  │ NodeSelector.vue (节点选择器)                  │ │
│  │ ├─ 显示 Layer 1 + Layer 2 + Layer 3 节点      │ │
│  │ ├─ 按分类分组                                 │ │
│  │ ├─ 搜索功能                                   │ │
│  │ ├─ 计费标签 ✅                                │ │
│  │ └─ 配置表单（Layer 2 + Layer 3）             │ │
│  │                                               │ │
│  │ CustomNodeEditor.vue (自定义节点编辑器)       │ │
│  │ ├─ Monaco 代码编辑器                          │ │
│  │ ├─ 实时验证（调用后端 validateNode）         │ │
│  │ ├─ 配置模式选择                               │ │
│  │ ├─ 共享配置表单                               │ │
│  │ └─ 提交审核按钮                               │ │
│  │                                               │ │
│  │ PlatformNodeAdmin.vue (管理员界面)            │ │
│  │ ├─ 节点列表（含未激活和待审核）              │ │
│  │ ├─ 审核/拒绝/启用/禁用按钮                    │ │
│  │ ├─ 编辑节点信息                               │ │
│  │ └─ 计费设置                                   │ │
│  │                                               │ │
│  │ NodeTypeDescriptionDisplay.vue               │ │
│  │ ├─ 显示节点定义（metadata）                  │ │
│  │ ├─ 参数配置 UI                                │ │
│  │ └─ 计费信息展示                               │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

**架构图完成！** 🎉

这份详细的架构图覆盖了：
1. ✅ 三层节点架构全景
2. ✅ 节点加载时序
3. ✅ 数据库关系
4. ✅ 服务层依赖
5. ✅ 工作流执行集成
6. ✅ 计费系统集成
7. ✅ 前端集成

每个部分都标注了当前状态（✅ 已实现 / ❌ 缺失 / ⚠️ 部分）。

