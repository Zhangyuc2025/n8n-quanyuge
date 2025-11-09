# n8n 核心架构探索总结

## 已生成的文档

本次探索已为你生成了两份详细的技术文档，提供 n8n 项目的完整理解：

### 1. **N8N_CORE_ARCHITECTURE.md** - 核心架构完整指南
   - **工作流编辑器**: Canvas 组件架构、节点创建面板、Pinia 状态管理
   - **节点系统**: 节点定义结构、INodeType 接口、AI 节点实现、版本控制
   - **工作流执行**: 执行流程、WorkflowRunner、执行引擎、节点上下文
   - **凭证系统**: 凭证定义、API Key/OAuth 实现、后端管理、前端 UI
   - **关键文件映射**: 前端、后端、核心包的完整文件结构
   - **数据流示例**: 执行一个工作流的完整数据流

### 2. **N8N_DETAILED_IMPLEMENTATION.md** - 详细实现指南
   - **前端编辑器详细流程**: 初始化、Canvas 渲染、节点编辑
   - **节点参数系统**: 参数类型、条件显示、集合参数
   - **表达式引擎**: 表达式语法、上下文对象、计算实现
   - **HTTP 请求节点**: 参数配置、执行逻辑、凭证注入
   - **调试技巧**: 前端调试、后端调试、执行分析

---

## 核心发现

### 工作流编辑器架构

```
前端编辑器层级：
NodeView.vue (主容器)
├── MainHeader (顶部导航)
├── MainSidebar (左侧边栏)
├── WorkflowCanvas (Canvas 容器)
│   └── Canvas.vue (Vue Flow 实现)
│       ├── CanvasNode (节点组件)
│       ├── CanvasEdge (连接线)
│       └── CanvasControlButtons (运行按钮)
├── NDVPanel (右侧节点详情)
└── NodeCreator (节点选择面板)
```

**关键特性**:
- 使用 Vue Flow 库管理节点和连接的可视化
- Pinia 存储管理工作流数据状态
- 支持拖拽、连接、参数编辑
- 实时 WebSocket 推送执行状态

### 节点系统架构

```
节点定义结构：
packages/nodes-base/nodes/
├── 300+ 内置节点
│   ├── OpenAi/ (AI 节点)
│   ├── HttpRequest/ (HTTP 请求)
│   ├── Code/ (代码执行)
│   └── ... (其他节点)
└── 支持自定义和社区节点
```

**节点实现方式**:
- 实现 `INodeType` 接口定义节点
- 使用 `INodeTypeDescription` 定义参数和元数据
- 实现 `execute()` 方法执行节点逻辑
- 支持版本化实现向后兼容

**特殊节点类型**:
- **AI 节点**: OpenAI、Anthropic、LangChain 等
- **HTTP 节点**: 通用 HTTP 请求，支持各种认证方式
- **代码节点**: JavaScript 和 Python 沙箱执行
- **触发器**: Webhook、定时、数据库轮询等

### 工作流执行流程

```
执行链路：
1. 用户点击运行按钮
   ↓
2. 前端调用 WorkflowExecutionService API
   ↓
3. 后端 WorkflowRunner 初始化执行
   ↓
4. n8n-core WorkflowExecute 执行引擎
   ↓
5. 依次执行节点
   - 为每个节点创建 ExecutionContext
   - 调用节点的 execute() 方法
   - 传递输入数据和凭证
   ↓
6. WebSocket 推送执行状态
   ↓
7. 前端实时更新 UI
```

**执行引擎核心**:
- `/packages/core/src/execution-engine/` - 执行引擎实现
- `IExecuteFunctions` 接口 - 节点执行时可用的 API
- 支持多种执行上下文 (批量、单项、Webhook、触发器、轮询)

### 凭证系统架构

```
凭证流程：
1. 定义凭证类型 (ICredentialType)
   - 字段定义 (INodeProperties)
   - 认证方法 (authenticate())
   - 测试方法 (test)

2. 后端存储
   - 加密存储在数据库
   - CredentialsService 管理 CRUD

3. 前端 UI
   - 凭证选择下拉框
   - 创建新凭证模态框
   - 凭证测试按钮

4. 执行时注入
   - 节点执行时获取凭证
   - 自动注入到 HTTP 请求
```

**支持的认证方式**:
- API Key (最简单)
- OAuth 2.0 (授权流程)
- 基本认证 (用户名/密码)
- 签名认证 (如 AWS Signature v4)
- 自定义认证

---

## 关键文件位置速查

### 前端关键文件

| 功能 | 文件路径 | 作用 |
|------|--------|------|
| 编辑器主体 | `packages/frontend/editor-ui/src/app/views/NodeView.vue` | 工作流编辑器主入口 |
| Canvas | `packages/frontend/editor-ui/src/features/workflows/canvas/` | 可视化编辑区域 |
| 节点创建 | `packages/frontend/editor-ui/src/features/shared/nodeCreator/` | 节点选择面板 |
| 工作流 Store | `packages/frontend/editor-ui/src/app/stores/workflows.store.ts` | 工作流数据管理 |
| 节点类型 Store | `packages/frontend/editor-ui/src/app/stores/nodeTypes.store.ts` | 节点类型管理 |
| 凭证 Store | `packages/frontend/editor-ui/src/features/credentials/credentials.store.ts` | 凭证管理 |
| 执行 Store | `packages/frontend/editor-ui/src/features/execution/executions/executions.store.ts` | 执行记录管理 |

### 后端关键文件

| 功能 | 文件路径 | 作用 |
|------|--------|------|
| 工作流服务 | `packages/cli/src/workflows/workflow.service.ts` | 工作流 CRUD 和管理 |
| 执行服务 | `packages/cli/src/workflows/workflow-execution.service.ts` | 工作流执行管理 |
| 工作流运行器 | `packages/cli/src/workflow-runner.ts` | 执行引擎主类 |
| 凭证服务 | `packages/cli/src/credentials/credentials.service.ts` | 凭证管理服务 |
| 节点加载 | `packages/cli/src/load-nodes-and-credentials.ts` | 节点和凭证加载 |
| API 类型 | `packages/@n8n/api-types/src/` | 前后端共享类型定义 |

### 核心包关键文件

| 包 | 文件路径 | 功能 |
|---|--------|------|
| workflow | `packages/workflow/src/` | Workflow 类、接口、类型定义 |
| core | `packages/core/src/execution-engine/` | 执行引擎核心实现 |
| nodes-base | `packages/nodes-base/nodes/` | 内置节点实现（300+） |
| nodes-base | `packages/nodes-base/credentials/` | 凭证类型定义（400+） |

---

## 技术栈总结

### 前端
- **框架**: Vue 3 + TypeScript
- **状态管理**: Pinia
- **UI 库**: @n8n/design-system (Vue 组件库)
- **Canvas**: Vue Flow (节点编辑)
- **HTTP**: axios + REST 客户端
- **实时通信**: Socket.IO (WebSocket)
- **国际化**: @n8n/i18n

### 后端
- **框架**: Express + Node.js
- **类型**: TypeScript
- **数据库**: TypeORM (支持 SQLite/PostgreSQL/MySQL)
- **依赖注入**: @n8n/di
- **执行引擎**: n8n-core
- **工作流**: n8n-workflow

### 工作流相关
- **执行引擎**: `/packages/core/src/execution-engine/`
- **工作流类**: `/packages/workflow/src/workflow.ts`
- **节点系统**: 300+ 内置节点 + 社区节点 + 自定义节点
- **凭证系统**: 400+ 凭证类型

---

## 开发指南

### 添加新节点

1. **创建节点文件** - `/packages/nodes-base/nodes/MyNode/MyNode.node.ts`
   ```typescript
   export class MyNode implements INodeType {
     description: INodeTypeDescription = { ... };
     async execute(this: IExecuteFunctions) {
       // 实现节点逻辑
     }
   }
   ```

2. **定义参数** - `/packages/nodes-base/nodes/MyNode/descriptions.ts`
   ```typescript
   export const myNodeOperations: INodeProperties[] = [ ... ];
   ```

3. **实现凭证注入** - 在 description 中配置
   ```typescript
   credentials: [{ name: 'myApi', required: true }]
   ```

4. **编写测试** - `/packages/nodes-base/nodes/MyNode/MyNode.test.ts`

### 添加新凭证类型

1. **创建凭证文件** - `/packages/nodes-base/credentials/MyApi.credentials.ts`
   ```typescript
   export class MyApi implements ICredentialType {
     name = 'myApi';
     properties: INodeProperties[] = [ ... ];
     test: ICredentialTestRequest = { ... };
     async authenticate(...) { ... }
   }
   ```

2. **定义字段** - 使用 INodeProperties 定义凭证字段

3. **实现认证** - 在 authenticate() 方法中添加凭证到请求

### 调试工作流

1. **前端调试**
   ```bash
   # 打开浏览器 DevTools
   # 访问 Pinia stores: useWorkflowsStore()
   # 检查 currentWorkflow、runData 等
   ```

2. **后端调试**
   ```bash
   # 启用详细日志
   N8N_LOG_LEVEL=debug node dist/commands/start.js
   
   # 或使用 Node 调试器
   node --inspect=9229 dist/commands/start.js
   ```

3. **检查执行数据**
   ```typescript
   // 在执行完成后查看数据
   const execution = await executionsApi.getExecution(executionId);
   console.log(execution.data.resultData.runData);
   ```

---

## 高级主题

### 表达式系统

n8n 支持强大的表达式语言用于动态参数：

```javascript
// 访问节点输出
{{ $node.HttpRequest.data[0].id }}

// 访问参数
{{ $parameter.prompt }}

// 函数调用
{{ $node.HttpRequest.data.map(item => item.name).join(', ') }}

// 条件表达式
{{ $input.item.json.status === 'completed' ? 'Done' : 'Pending' }}
```

### 节点版本化

支持多个版本的同一节点以实现向后兼容：

```
HttpRequest/
├── V1/HttpRequestV1.node.ts (旧版本)
├── V2/HttpRequestV2.node.ts (改进版本)
├── V3/HttpRequestV3.node.ts (最新版本)
└── HttpRequest.node.ts (路由到最新)
```

### 执行上下文

节点执行时可用的 API (IExecuteFunctions):

```typescript
// 访问节点数据
getNode(): INode
getNodeParameter(name: string, itemIndex: number): any

// 访问输入/输出
getInputData(): INodeExecutionData[][]
item: INodeExecutionData

// 表达式计算
evaluateExpression(expr: string, itemIndex: number): Promise<unknown>

// HTTP 请求
helpers.request(options: IRequestOptions): Promise<any>

// 文件系统
helpers.fs: FileSystemAPI

// 凭证访问
getCredentials(type: string): Promise<ICredentialDataDecryptedObject>
```

---

## 常见问题解答

### Q: 如何执行跨节点的表达式？
**A**: 使用 `$node.NodeName.data[index].json.field` 访问其他节点的输出。

### Q: 凭证如何加密存储？
**A**: 在数据库中使用 AES-256 加密存储，执行时自动解密。

### Q: 支持哪些触发方式？
**A**: Webhook、定时任务、数据库变更、消息队列、手动触发等。

### Q: 如何处理大量数据？
**A**: 使用批量执行模式，节点接收多个输入项，逐项处理。

### Q: 支持子工作流吗？
**A**: 是的，可以在一个工作流中调用另一个工作流作为子流程。

### Q: 如何扩展 Canvas 功能？
**A**: 修改 Canvas 组件、composables 和 types，Vue Flow 库支持高度定制。

---

## 下一步建议

1. **深入学习前端编辑器**
   - 研究 Vue Flow 库的用法
   - 理解 Canvas 映射逻辑
   - 学习参数条件显示系统

2. **理解执行引擎**
   - 追踪执行流程
   - 学习节点上下文对象
   - 理解表达式计算

3. **开发新节点**
   - 选择一个简单的 API 创建节点
   - 实现参数定义和执行逻辑
   - 编写测试用例

4. **扩展凭证系统**
   - 实现 OAuth 流程
   - 支持新的认证方式
   - 添加凭证测试方法

5. **性能优化**
   - 分析大工作流执行性能
   - 优化表达式计算
   - 实现执行缓存机制

---

## 文档导航

- **开始使用**: 查看主项目 README 和 CLAUDE.md
- **核心架构**: 阅读 `N8N_CORE_ARCHITECTURE.md`
- **详细实现**: 查看 `N8N_DETAILED_IMPLEMENTATION.md`
- **代码示例**: 在对应的源文件中查看实际实现

---

## 总结

n8n 是一个高度模块化和可扩展的工作流自动化平台：

1. **前端**: 现代化的 Vue 3 编辑器，支持可视化工作流设计
2. **后端**: 基于 Express 的执行引擎，支持 300+ 集成节点
3. **执行**: 灵活的执行模式（手动、自动、Webhook、触发器）
4. **凭证**: 安全的加密存储和多种认证方式支持
5. **扩展**: 支持自定义节点、凭证和执行上下文

这个架构使 n8n 能够适应各种工作流场景，从简单的数据转换到复杂的多步骤自动化流程。

**祝你探索愉快！有任何问题可随时参考这些文档。**
