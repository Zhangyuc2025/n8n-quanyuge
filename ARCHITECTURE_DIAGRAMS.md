# n8n 架构图解

这份文档使用 Mermaid 图表可视化 n8n 的核心架构和数据流。

---

## 1. 高层系统架构

```mermaid
graph TB
    subgraph 浏览器["🌐 浏览器"]
        FE["前端应用<br/>Vue 3 + Pinia"]
        Canvas["Canvas 编辑器<br/>Vue Flow"]
        NDV["节点详情面板<br/>Node Details View"]
    end
    
    subgraph 网络["🔗 网络层"]
        HTTP["HTTP API<br/>REST Client"]
        WS["WebSocket<br/>Socket.IO"]
    end
    
    subgraph 服务器["🖥️ n8n 服务器"]
        Express["Express 服务器"]
        
        subgraph 核心服务["核心服务"]
            WorkflowService["工作流服务"]
            ExecutionService["执行服务"]
            CredentialService["凭证服务"]
        end
        
        subgraph 执行引擎["执行引擎"]
            WorkflowRunner["Workflow Runner"]
            Executor["Executor<br/>n8n-core"]
            NodeExecution["节点执行上下文"]
        end
        
        Database["数据库<br/>SQLite/PostgreSQL"]
        Vault["密钥保管库<br/>加密存储"]
    end
    
    subgraph 扩展["🔌 扩展"]
        Nodes["300+ 内置节点<br/>+ 社区节点"]
        Credentials["400+ 凭证类型"]
        APIs["第三方 API"]
    end
    
    FE -->|拖拽节点| Canvas
    Canvas -->|选择节点| NDV
    NDV -->|编辑参数| FE
    
    FE -->|REST 请求| HTTP
    HTTP -->|API 端点| Express
    
    Express -->|CRUD 操作| WorkflowService
    Express -->|执行请求| ExecutionService
    Express -->|凭证管理| CredentialService
    
    WorkflowService -->|保存| Database
    CredentialService -->|加密存储| Vault
    ExecutionService -->|启动执行| WorkflowRunner
    
    WorkflowRunner -->|执行工作流| Executor
    Executor -->|执行节点| NodeExecution
    NodeExecution -->|获取凭证| Vault
    NodeExecution -->|调用节点| Nodes
    Nodes -->|调用 API| APIs
    
    Executor -->|推送状态| WS
    WS -->|更新 UI| FE
    
    Nodes -->|注册节点| Credentials
    Credentials -->|提供认证| Nodes
```

---

## 2. 前端组件架构

```mermaid
graph TD
    subgraph 应用层["应用层"]
        App["App.vue"]
    end
    
    subgraph 视图层["视图层"]
        WorkflowsView["工作流列表<br/>WorkflowsView.vue"]
        NodeView["编辑器主视图<br/>NodeView.vue"]
        SettingsView["设置视图<br/>SettingsView.vue"]
    end
    
    subgraph 编辑器["编辑器组件"]
        MainHeader["MainHeader<br/>顶部导航栏"]
        MainSidebar["MainSidebar<br/>左侧边栏"]
        WorkflowCanvas["WorkflowCanvas<br/>Canvas 包装器"]
        Canvas["Canvas.vue<br/>Vue Flow 实例"]
        NDVPanel["NDVPanel<br/>节点详情"]
        NodeCreator["NodeCreator<br/>节点面板"]
    end
    
    subgraph Canvas组件["Canvas 内部组件"]
        CanvasNode["CanvasNode<br/>节点组件"]
        CanvasEdge["CanvasEdge<br/>连接线"]
        CanvasHandle["CanvasHandle<br/>连接点"]
        CanvasBackground["CanvasBackground<br/>网格背景"]
        ControlButtons["ControlButtons<br/>运行/停止按钮"]
    end
    
    subgraph 状态管理["Pinia Stores"]
        WorkflowsStore["Workflows Store<br/>工作流数据"]
        NodeTypesStore["NodeTypes Store<br/>节点类型"]
        CredentialsStore["Credentials Store<br/>凭证数据"]
        ExecutionsStore["Executions Store<br/>执行记录"]
        UIStore["UI Store<br/>UI 状态"]
    end
    
    subgraph 组合函数["Composables"]
        useRunWorkflow["useRunWorkflow<br/>执行工作流"]
        useCanvasOperations["useCanvasOperations<br/>Canvas 操作"]
        useNodeHelpers["useNodeHelpers<br/>节点助手"]
        useWorkflowHelpers["useWorkflowHelpers<br/>工作流助手"]
    end
    
    App -->|路由| WorkflowsView
    App -->|路由| NodeView
    App -->|路由| SettingsView
    
    NodeView --> MainHeader
    NodeView --> MainSidebar
    NodeView --> WorkflowCanvas
    NodeView --> NDVPanel
    NodeView --> NodeCreator
    
    WorkflowCanvas --> Canvas
    Canvas --> CanvasNode
    Canvas --> CanvasEdge
    Canvas --> CanvasHandle
    Canvas --> CanvasBackground
    Canvas --> ControlButtons
    
    Canvas -.注入| WorkflowsStore
    NDVPanel -.注入| WorkflowsStore
    NDVPanel -.注入| NodeTypesStore
    NDVPanel -.注入| CredentialsStore
    NodeCreator -.注入| NodeTypesStore
    ControlButtons -.注入| ExecutionsStore
    
    CanvasNode -.读取| WorkflowsStore
    CanvasNode -.读取| ExecutionsStore
    
    useRunWorkflow -.调用| WorkflowsStore
    useRunWorkflow -.更新| ExecutionsStore
    useCanvasOperations -.操作| WorkflowsStore
    
    NodeView -->|使用| useRunWorkflow
    NodeView -->|使用| useCanvasOperations
    Canvas -->|使用| useNodeHelpers
```

---

## 3. 工作流编辑流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant FE as 前端 UI
    participant Store as Pinia Store
    participant API as REST API
    participant BE as 后端服务
    participant DB as 数据库
    
    User->>FE: 点击添加节点
    FE->>FE: 打开 NodeCreator 面板
    
    User->>FE: 选择节点类型
    FE->>Store: 触发 addNode()
    Store->>Store: 更新 currentWorkflow.nodes
    FE->>FE: Canvas 重新渲染，显示新节点
    
    User->>FE: 拖动节点连接
    FE->>Store: 触发 addConnection()
    Store->>Store: 更新 currentWorkflow.connections
    FE->>FE: Canvas 显示新连接线
    
    User->>FE: 点击节点，打开 NDV 面板
    FE->>FE: 显示节点参数表单
    
    User->>FE: 填写节点参数（如 API Key）
    FE->>Store: 触发 updateNodeParameter()
    Store->>Store: 更新 node.parameters
    
    User->>FE: 保存工作流
    FE->>API: POST /api/workflows/:id
    API->>BE: 接收工作流数据
    BE->>DB: 保存工作流配置
    DB-->>BE: 保存成功
    BE-->>API: 返回工作流数据
    API-->>FE: 返回成功响应
    FE->>FE: 显示保存成功提示
```

---

## 4. 工作流执行流程

```mermaid
graph LR
    A["用户点击运行"] -->|API 请求| B["WorkflowExecutionService"]
    B -->|初始化执行| C["WorkflowRunner"]
    C -->|获取节点类型| D["NodeTypes"]
    C -->|获取凭证| E["CredentialsService"]
    
    C -->|启动执行| F["n8n-core<br/>WorkflowExecute"]
    
    F -->|初始化栈| G["执行栈"]
    G -->|弹出节点| H["当前节点"]
    
    H -->|获取节点类型| I["INodeType"]
    H -->|创建执行上下文| J["ExecuteContext"]
    J -->|获取参数值| K["参数评估"]
    K -->|计算表达式| L["表达式引擎"]
    L -->|返回参数值| J
    
    J -->|获取凭证| M["解密凭证"]
    M -->|注入 HTTP| N["HTTP 请求"]
    
    J -->|执行节点| I
    I -->|节点逻辑| O["执行节点代码"]
    O -->|返回输出| P["INodeExecutionData"]
    
    P -->|保存运行数据| Q["resultData.runData"]
    Q -->|添加后续节点| G
    
    G -->|栈不为空| H
    G -->|栈为空| R["执行完成"]
    
    R -->|WebSocket 推送| S["实时状态更新"]
    S -->|更新前端 UI| T["ExecutionsStore"]
    T -->|重新渲染| U["显示运行结果"]
```

---

## 5. Canvas 数据映射

```mermaid
graph TB
    subgraph 数据源["n8n 工作流数据"]
        Nodes["IWorkflowDb.nodes<br/>节点列表"]
        Connections["IWorkflowDb.connections<br/>连接列表"]
        RunData["RunData<br/>执行结果"]
    end
    
    subgraph 映射层["映射 Composable"]
        Mapping["useCanvasMapping"]
        NodeMapper["节点映射器"]
        EdgeMapper["边映射器"]
    end
    
    subgraph VueFlow["Vue Flow 数据"]
        VFNodes["Vue Flow 节点<br/>CanvasNode 对象"]
        VFEdges["Vue Flow 边<br/>CanvasEdge 对象"]
    end
    
    subgraph 渲染["Canvas 渲染"]
        NodeRender["节点渲染"]
        EdgeRender["连接线渲染"]
        HandleRender["连接点渲染"]
    end
    
    Nodes -->|映射| NodeMapper
    Connections -->|映射| EdgeMapper
    RunData -->|添加状态| NodeMapper
    
    NodeMapper -->|返回| VFNodes
    EdgeMapper -->|返回| VFEdges
    
    VFNodes -->|自动渲染| NodeRender
    VFEdges -->|自动渲染| EdgeRender
    VFNodes -->|创建| HandleRender
    
    NodeRender -->|显示| Canvas["Canvas 可视化"]
    EdgeRender -->|显示| Canvas
    HandleRender -->|显示| Canvas
```

---

## 6. 节点参数流程

```mermaid
graph TB
    NodeType["INodeTypeDescription<br/>节点定义"]
    Properties["INodeProperties[]<br/>参数列表"]
    
    NodeType -->|包含| Properties
    
    subgraph 参数类型["参数类型"]
        String["string<br/>文本"]
        Number["number<br/>数字"]
        Boolean["boolean<br/>布尔值"]
        Options["options<br/>下拉选项"]
        Collection["collection<br/>集合"]
    end
    
    Properties -->|定义| String
    Properties -->|定义| Number
    Properties -->|定义| Boolean
    Properties -->|定义| Options
    Properties -->|定义| Collection
    
    subgraph 参数特性["参数特性"]
        DisplayOptions["displayOptions<br/>条件显示"]
        TypeOptions["typeOptions<br/>类型选项"]
        LoadOptions["loadOptions<br/>动态加载"]
    end
    
    String -.配置| DisplayOptions
    Options -.配置| TypeOptions
    Options -.配置| LoadOptions
    
    DisplayOptions -->|检查条件| "应该显示?"
    "应该显示?" -->|true| "渲染参数组件"
    "应该显示?" -->|false| "隐藏参数"
    
    LoadOptions -->|HTTP 请求| "获取选项列表"
    "获取选项列表" -->|响应数据| "填充选项"
    
    "渲染参数组件" -->|用户输入| "参数值"
    "填充选项" -->|用户选择| "参数值"
    
    "参数值" -->|保存到| "node.parameters"
    "node.parameters" -->|执行时| "getNodeParameter()"
    "getNodeParameter()" -->|用于| "节点执行逻辑"
```

---

## 7. 凭证系统流程

```mermaid
graph TB
    subgraph 定义["凭证类型定义"]
        CT["ICredentialType"]
        Props["properties<br/>字段定义"]
        Auth["authenticate()<br/>认证方法"]
        Test["test<br/>测试方法"]
    end
    
    CT -->|包含| Props
    CT -->|实现| Auth
    CT -->|实现| Test
    
    subgraph 前端["前端操作"]
        SelectCred["选择现有凭证"]
        CreateCred["创建新凭证"]
        TestCred["测试凭证"]
    end
    
    SelectCred -->|选择| "凭证 ID"
    CreateCred -->|生成表单| Props
    CreateCred -->|用户输入| "凭证数据"
    
    "凭证数据" -->|API 请求| "后端创建"
    TestCred -->|API 请求| "后端测试"
    
    subgraph 后端["后端处理"]
        CredService["CredentialsService"]
        Encrypt["加密凭证数据"]
        Store["保存到数据库"]
        Decrypt["解密凭证"]
    end
    
    "后端创建" -->|CredentialsService| Encrypt
    Encrypt -->|AES-256| Store
    Store -->|保存| "数据库"
    
    "后端测试" -->|测试 API| Test
    Test -->|成功/失败| "返回结果"
    
    subgraph 执行["执行时"]
        NodeExec["节点执行"]
        GetCred["getCredentials()"]
        Decrypt
        UseCred["使用凭证"]
    end
    
    NodeExec -->|获取凭证| GetCred
    GetCred -->|从数据库| "凭证数据"
    "凭证数据" -->|解密| Decrypt
    Decrypt -->|返回| "凭证对象"
    "凭证对象" -->|注入| Auth
    Auth -->|修改请求| UseCred
    UseCred -->|HTTP 请求| "第三方 API"
```

---

## 8. 表达式计算流程

```mermaid
graph LR
    Input["参数值<br/>{{ $node.X.data }}"]
    Parse["解析表达式<br/>提取 {{ }}"]
    Extract["提取代码<br/>$node.X.data"]
    
    Input -->|正则匹配| Parse
    Parse -->|成功| Extract
    Parse -->|失败| "返回原值"
    
    subgraph 构建上下文["构建表达式上下文"]
        NodeData["$node<br/>所有节点输出"]
        ParamData["$parameter<br/>当前节点参数"]
        InputData["$input<br/>输入项数据"]
        Env["$env<br/>环境变量"]
        Special["特殊变量<br/>$now, $today"]
    end
    
    Extract -->|创建| 构建上下文
    
    subgraph 沙箱执行["安全沙箱执行"]
        Inject["注入变量到作用域"]
        Compile["编译 Function"]
        Execute["执行代码"]
    end
    
    构建上下文 -->|注入| Inject
    Inject -->|创建函数| Compile
    Compile -->|with 上下文| Execute
    
    Execute -->|成功| Result["表达式结果"]
    Execute -->|错误| Error["表达式错误"]
    
    Result -->|返回给| "参数使用"
    Error -->|抛出异常| "错误处理"
```

---

## 9. 后端服务架构

```mermaid
graph TB
    subgraph API["Express API"]
        WorkflowAPI["工作流 API"]
        ExecutionAPI["执行 API"]
        CredentialAPI["凭证 API"]
    end
    
    subgraph Services["业务服务"]
        WorkflowService["WorkflowService"]
        ExecutionService["ExecutionService"]
        CredentialService["CredentialService"]
        OwnershipService["OwnershipService"]
        RoleService["RoleService"]
    end
    
    subgraph Execution["执行引擎"]
        WorkflowRunner["WorkflowRunner"]
        ActiveExecutions["ActiveExecutions<br/>活跃执行管理"]
        LifecycleHooks["LifecycleHooks<br/>生命周期钩子"]
    end
    
    subgraph Core["n8n-core"]
        WorkflowExecute["WorkflowExecute<br/>核心执行引擎"]
        ExecuteContext["ExecuteContext<br/>执行上下文"]
    end
    
    subgraph Storage["数据存储"]
        Database["数据库<br/>TypeORM"]
        BinaryService["BinaryDataService<br/>二进制数据"]
        KeyValueStore["KeyValueStore<br/>键值存储"]
    end
    
    WorkflowAPI -->|调用| WorkflowService
    ExecutionAPI -->|调用| ExecutionService
    CredentialAPI -->|调用| CredentialService
    
    WorkflowService -->|查询| Database
    ExecutionService -->|启动| WorkflowRunner
    CredentialService -->|存储| KeyValueStore
    
    WorkflowRunner -->|管理| ActiveExecutions
    WorkflowRunner -->|调用| WorkflowExecute
    
    WorkflowExecute -->|执行节点| ExecuteContext
    ExecuteContext -->|获取凭证| CredentialService
    ExecuteContext -->|访问数据| BinaryService
    
    OwnershipService -->|权限检查| WorkflowService
    RoleService -->|权限检查| CredentialService
```

---

## 10. 节点执行上下文

```mermaid
graph TB
    subgraph Context["IExecuteFunctions<br/>节点执行上下文"]
        NodeInfo["getNode()<br/>获取节点信息"]
        GetParam["getNodeParameter()<br/>获取参数值"]
        GetInput["getInputData()<br/>获取输入数据"]
        CurrentItem["item<br/>当前处理项"]
    end
    
    subgraph Expression["表达式和变量"]
        Evaluate["evaluateExpression()<br/>表达式计算"]
        Variables["内置变量<br/>$node, $parameter"]
    end
    
    subgraph HTTP["HTTP 请求"]
        Request["helpers.request()<br/>发送 HTTP"]
        Headers["自动添加认证<br/>Authorization"]
    end
    
    subgraph Credentials["凭证访问"]
        GetCreds["getCredentials()<br/>获取凭证"]
        DecryptCreds["自动解密<br/>凭证数据"]
    end
    
    subgraph Data["数据处理"]
        FileSystem["helpers.fs<br/>文件系统"]
        Binary["处理二进制<br/>文件/图片"]
        Database["数据库操作"]
    end
    
    subgraph Execution["执行控制"]
        Continue["继续执行"]
        Pause["暂停等待"]
        Error["错误处理"]
    end
    
    Context -->|提供| NodeInfo
    Context -->|提供| GetParam
    Context -->|提供| GetInput
    Context -->|提供| CurrentItem
    
    GetParam -->|使用| Expression
    Expression -->|计算| Evaluate
    Evaluate -->|访问| Variables
    
    HTTP -->|需要| Credentials
    Credentials -->|调用| GetCreds
    GetCreds -->|解密| DecryptCreds
    DecryptCreds -->|注入请求| Request
    
    GetInput -->|处理| Data
    Data -->|操作| FileSystem
    FileSystem -->|处理| Binary
    
    Context -->|控制| Execution
    Execution -->|继续/暂停/错误| "节点流程"
```

---

## 11. 数据类型关系

```mermaid
graph TB
    IWorkflow["IWorkflowBase<br/>工作流基础接口"]
    INode["INode<br/>节点"]
    IConnection["IConnection<br/>连接"]
    INodeType["INodeType<br/>节点类型定义"]
    INodeTypeDesc["INodeTypeDescription<br/>节点描述"]
    INodeProperties["INodeProperties<br/>节点参数"]
    
    IWorkflow -->|包含| INode
    IWorkflow -->|包含| IConnection
    INode -->|实现| INodeType
    INodeType -->|包含| INodeTypeDesc
    INodeTypeDesc -->|包含| INodeProperties
    
    IRunData["IRunData<br/>运行数据"]
    ITaskData["ITaskData<br/>任务数据"]
    INodeExecutionData["INodeExecutionData<br/>执行结果"]
    
    IRunData -->|包含| ITaskData
    ITaskData -->|包含| INodeExecutionData
    
    INodeExecutionData -->|包含| JSON["json<br/>JSON 数据"]
    INodeExecutionData -->|包含| Binary["binary<br/>二进制数据"]
    
    ICredentialType["ICredentialType<br/>凭证类型"]
    ICredentialData["ICredentialDataDecrypted<br/>凭证数据"]
    
    ICredentialType -->|定义| ICredentialData
    INode -->|使用| ICredentialData
    
    IConnection -->|连接| INode
```

---

## 12. 事件流 (WebSocket)

```mermaid
graph LR
    Server["n8n 服务器<br/>执行引擎"]
    
    Event1["execution:start<br/>执行开始"]
    Event2["execution:nodeExecuteStart<br/>节点执行开始"]
    Event3["execution:nodeExecuteComplete<br/>节点执行完成"]
    Event4["execution:nodeExecuteError<br/>节点执行错误"]
    Event5["execution:finished<br/>执行完成"]
    
    Server -->|发送| Event1
    Event1 -->|包含| "executionId, startedAt"
    
    Server -->|发送| Event2
    Event2 -->|包含| "executionId, nodeId"
    
    Server -->|发送| Event3
    Event3 -->|包含| "executionId, nodeId, runData"
    
    Server -->|发送| Event4
    Event4 -->|包含| "executionId, nodeId, error"
    
    Server -->|发送| Event5
    Event5 -->|包含| "executionId, result, stoppedAt"
    
    subgraph 前端处理["前端接收处理"]
        Client["浏览器<br/>WebSocket 客户端"]
        UpdateUI["更新 UI"]
        Store["更新 Store"]
    end
    
    Event1 -->|接收| Client
    Event2 -->|接收| Client
    Event3 -->|接收| Client
    Event4 -->|接收| Client
    Event5 -->|接收| Client
    
    Client -->|处理| Store
    Store -->|驱动| UpdateUI
    UpdateUI -->|显示| "Canvas 节点状态<br/>执行日志<br/>运行结果"
```

---

## 13. 项目构建流程

```mermaid
graph LR
    Source["源代码<br/>TypeScript"]
    Lint["Lint<br/>代码检查"]
    TypeCheck["Type Check<br/>类型检查"]
    Build["Build<br/>编译"]
    
    subgraph 前端["前端构建"]
        FELint["✓ Lint"]
        FEType["✓ TypeCheck"]
        FEBuild["✓ Vite 构建<br/>生成 dist/"]
    end
    
    subgraph 后端["后端构建"]
        BELint["✓ Lint"]
        BEType["✓ TypeCheck"]
        BEBuild["✓ TSC 编译<br/>生成 dist/"]
    end
    
    Source -->|packages/frontend| 前端构建
    Source -->|packages/cli| 后端构建
    
    FEBuild -->|输出| "编译后的 JS<br/>HTML<br/>CSS"
    BEBuild -->|输出| "编译后的 JS"
    
    "编译后的 JS<br/>HTML<br/>CSS" -->|部署| "生产环境"
    "编译后的 JS" -->|运行| "Node.js 进程"
```

---

## 14. 完整执行时序图

```mermaid
sequenceDiagram
    actor User as 👤 用户
    participant FE as 🖥️ 前端
    participant API as 🔌 API
    participant Runner as 🏃 WorkflowRunner
    participant Executor as ⚙️ Executor
    participant Node as 🔧 节点
    participant Cred as 🔐 凭证
    participant ExtAPI as 🌐 外部 API
    participant WS as 📡 WebSocket
    
    User->>FE: 1️⃣ 点击运行按钮
    FE->>API: 2️⃣ POST /workflows/:id/execute
    
    API->>Runner: 3️⃣ 启动执行
    activate Runner
    
    Runner->>Executor: 4️⃣ 创建 Executor 实例
    activate Executor
    
    loop 5️⃣ 执行栈不为空
        Executor->>Executor: 弹出节点
        Executor->>Node: 6️⃣ 创建节点执行上下文
        activate Node
        
        Node->>Cred: 7️⃣ 获取凭证
        activate Cred
        Cred->>Cred: 8️⃣ 从数据库检索
        Cred->>Cred: 9️⃣ 解密凭证
        Cred-->>Node: 返回解密数据
        deactivate Cred
        
        Node->>Node: 🔟 评估表达式参数
        Node->>Node: 1️⃣1️⃣ 获取输入数据
        
        Node->>ExtAPI: 1️⃣2️⃣ HTTP 请求（含凭证）
        activate ExtAPI
        ExtAPI-->>Node: 1️⃣3️⃣ 返回响应
        deactivate ExtAPI
        
        Node->>Node: 1️⃣4️⃣ 处理返回数据
        Node-->>Executor: 1️⃣5️⃣ 返回执行结果
        deactivate Node
        
        Executor->>WS: 1️⃣6️⃣ 广播节点完成事件
        WS->>FE: nodeExecuteComplete
        FE->>FE: 更新运行数据和 UI
        
        Executor->>Executor: 1️⃣7️⃣ 保存运行数据
        Executor->>Executor: 1️⃣8️⃣ 添加下一个节点
    end
    
    Executor->>Runner: 1️⃣9️⃣ 执行完成
    deactivate Executor
    
    Runner->>Runner: 2️⃣0️⃣ 保存执行记录
    Runner->>WS: 2️⃣1️⃣ 广播执行完成事件
    WS->>FE: execution:finished
    FE->>FE: 2️⃣2️⃣ 显示完整结果
    
    Runner-->>API: 返回执行 ID
    deactivate Runner
    API-->>FE: 返回成功响应
    FE-->>User: 2️⃣3️⃣ 显示执行结果
```

---

## 总结

这些图表展示了：

1. **系统架构** - 前端、后端、执行引擎、扩展的整体布局
2. **组件关系** - 前端各组件之间的层级和通信
3. **编辑流程** - 用户编辑工作流的交互流程
4. **执行流程** - 工作流从触发到完成的执行路径
5. **数据映射** - Canvas 数据如何映射到 Vue Flow
6. **参数系统** - 节点参数的定义和使用
7. **凭证系统** - 凭证的定义、存储和使用
8. **表达式** - 动态表达式的解析和计算
9. **后端服务** - 各个后端服务的职责和关系
10. **执行上下文** - 节点执行时可用的 API
11. **数据类型** - 各个数据结构的关系
12. **事件系统** - WebSocket 事件的推送和处理
13. **构建流程** - 代码从源到生产的编译过程
14. **完整时序** - 端到端的执行时序

这些可视化图表能帮助你快速理解 n8n 的架构和工作流程。

