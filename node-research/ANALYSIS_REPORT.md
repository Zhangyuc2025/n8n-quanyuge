# Slack 节点转换分析报告

**生成时间**: 2025-11-12
**目标**: 将 Slack V2 节点转换为 SASA 平台可上传的动态节点

---

## 一、原始节点结构

### 文件组成（V2 版本）

| 文件 | 行数 | 作用 |
|------|------|------|
| **SlackV2.node.ts** | 1,429 | 主节点类（核心逻辑） |
| **ChannelDescription.ts** | 1,495 | Channel 资源参数定义 |
| **MessageDescription.ts** | 1,272 | Message 资源参数定义 |
| **GenericFunctions.ts** | 345 | API 请求封装 |
| **UserGroupDescription.ts** | 329 | UserGroup 资源参数定义 |
| **FileDescription.ts** | 326 | File 资源参数定义 |
| **UserDescription.ts** | 303 | User 资源参数定义 |
| **StarDescription.ts** | 268 | Star 资源参数定义 |
| **ReactionDescription.ts** | 131 | Reaction 资源参数定义 |
| **MessageInterface.ts** | 38 | TypeScript 类型定义 |
| **总计** | **5,936 行** | |

### 支持的资源和操作

| 资源 | 操作 |
|------|------|
| **Message** | Send, Update, Delete, Get Permalink, Search, Send and Wait |
| **Channel** | Archive, Close, Create, Get, Get Many, History, Invite, Join, Kick, Leave, Member, Open, Rename, Replies, Set Purpose, Set Topic, Unarchive |
| **File** | Get, Get Many, Upload |
| **Reaction** | Add, Get, Remove |
| **Star** | Add, Delete, Get Many |
| **User** | Get, Get Many, Get Presence, Update Profile |
| **User Group** | Create, Disable, Enable, Get Many, Update |

---

## 二、依赖关系分析

### 2.1 外部 npm 依赖

| 包 | 用途 | VM2 白名单 | 处理方案 |
|-----|------|-----------|---------|
| **`n8n-workflow`** | 核心类型和工具 | ✅ 在白名单 | 保持不变 |
| **`lodash/get`** | 对象属性访问 | ❌ 不在白名单 | **内联替换**（仅1处使用） |
| **`moment-timezone`** | 时间处理 | ❌ 不在白名单 | **检查是否使用**，未使用则删除 |

#### lodash/get 使用位置

```typescript
// GenericFunctions.ts:131
query.cursor = get(responseData, 'response_metadata.next_cursor');
```

**替换方案**：
```typescript
query.cursor = responseData?.response_metadata?.next_cursor;
```

#### moment-timezone 检查结果

```bash
grep -n "moment" node-research/slack-original/V2/SlackV2.node.ts
```

- **第 1 行**: `import moment from 'moment-timezone';`
- **实际使用**: 需要进一步检查是否在代码中实际调用

### 2.2 内部模块依赖

#### 本地文件依赖（同目录）

```typescript
import { channelFields, channelOperations } from './ChannelDescription';
import { fileFields, fileOperations } from './FileDescription';
import { slackApiRequest, ... } from './GenericFunctions';
import { messageFields, messageOperations, ... } from './MessageDescription';
import { reactionFields, reactionOperations } from './ReactionDescription';
import { starFields, starOperations } from './StarDescription';
import { userFields, userOperations } from './UserDescription';
import { userGroupFields, userGroupOperations } from './UserGroupDescription';
```

**处理方案**: ✅ 直接内联到主文件

#### 外部工具依赖（跨目录）

```typescript
import { configureWaitTillDate } from '../../../utils/sendAndWait/configureWaitTillDate.util';
import { sendAndWaitWebhooksDescription } from '../../../utils/sendAndWait/descriptions';
import { getSendAndWaitProperties, SEND_AND_WAIT_WAITING_TOOLTIP, sendAndWaitWebhook } from '../../../utils/sendAndWait/utils';
```

**处理方案**: ⚠️ 需要特殊处理（两种方案）:
- **方案 A**: 复制工具函数到节点代码中
- **方案 B**: 禁用 Send and Wait 功能（删除相关代码）

---

## 三、凭证系统改造

### 原始凭证配置

```typescript
credentials: [
    {
        name: 'slackApi',           // Access Token 模式
        required: true,
        displayOptions: {
            show: { authentication: ['accessToken'] }
        }
    },
    {
        name: 'slackOAuth2Api',     // OAuth2 模式
        required: true,
        displayOptions: {
            show: { authentication: ['oAuth2'] }
        }
    }
]
```

### SASA 平台改造方案

**SASA 平台已删除凭证表**，改用 `user_node_config` 表存储用户配置。

#### 改造步骤

1. **删除 credentials 字段**
2. **添加配置参数到 properties**:

```typescript
properties: [
    {
        displayName: 'API Token',
        name: 'apiToken',
        type: 'string',
        typeOptions: { password: true },
        default: '',
        required: true,
        description: 'Slack Bot Token (starts with xoxb-)'
    },
    // ... 其他参数
]
```

3. **修改 API 请求函数**:

```typescript
// 原代码
const credentials = await this.getCredentials('slackApi');

// 改造后
const apiToken = this.getNodeParameter('apiToken', 0) as string;
```

---

## 四、图标处理

### 原始文件

- `slack.svg` (1,734 bytes)

### 转换方案

```bash
base64 -w 0 slack.svg > slack.svg.base64
```

然后在 `nodeDefinition` 中使用：
```typescript
icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxu...'
```

或者上传到 CDN：
```typescript
icon: 'https://cdn.sasa-platform.com/icons/slack.svg'
```

---

## 五、VM2 沙箱兼容性问题

### 5.1 不兼容的特性

| 特性 | 使用位置 | 解决方案 |
|------|---------|---------|
| **外部 npm 包** | `lodash/get`, `moment` | 内联或删除 |
| **动态 require** | 无 | N/A |
| **文件系统访问** | 无 | N/A |
| **网络请求** | 通过 `this.helpers.request` | ✅ n8n 提供，安全 |

### 5.2 需要验证的功能

- ✅ **HTTP 请求**: 使用 `this.helpers.requestWithAuthentication()`
- ✅ **参数获取**: 使用 `this.getNodeParameter()`
- ✅ **工作流信息**: 使用 `this.getWorkflow()`
- ⚠️ **Send and Wait**: 需要 Webhook 功能，可能不支持

---

## 六、转换策略

### 方案 A：完整转换（保留所有功能）

#### 优点
- ✅ 保留 Send and Wait 功能
- ✅ 功能完整

#### 缺点
- ❌ 需要复制大量外部工具代码
- ❌ 代码体积大（~10,000 行）
- ❌ Send and Wait 可能在 VM2 中不工作

#### 工作量
- **复杂度**: 高
- **预估时间**: 4-6 小时

---

### 方案 B：精简转换（推荐）✅

#### 优点
- ✅ 代码体积小（~6,000 行）
- ✅ 移除不稳定的功能
- ✅ 更容易维护

#### 缺点
- ❌ 失去 Send and Wait 功能

#### 工作量
- **复杂度**: 中等
- **预估时间**: 2-3 小时

#### 删除的功能
- Send and Wait for Response 操作
- 相关的 Webhook 处理

---

## 七、转换步骤（方案 B）

### Step 1: 合并所有 Description 文件

```bash
cat V2/{ChannelDescription,MessageDescription,FileDescription,...}.ts > merged_descriptions.ts
```

### Step 2: 合并 GenericFunctions

```bash
cat V2/GenericFunctions.ts >> merged_code.ts
```

### Step 3: 修改主文件

```typescript
// SlackV2.node.ts
export class SlackV2 implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Slack',
        name: 'slack',
        icon: 'data:image/svg+xml;base64,...',
        version: [2, 2.1, 2.2, 2.3],

        // ❌ 删除 credentials
        // credentials: [...],

        properties: [
            // ✅ 添加 apiToken
            {
                displayName: 'API Token',
                name: 'apiToken',
                type: 'string',
                typeOptions: { password: true },
                required: true
            },

            // ... 其他参数（从 Description 文件内联）
        ]
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        // ... 执行逻辑
    }
}
```

### Step 4: 修改 GenericFunctions

```typescript
// 原代码
const credentialType = authenticationMethod === 'accessToken' ? 'slackApi' : 'slackOAuth2Api';
const response = await this.helpers.requestWithAuthentication.call(this, credentialType, options);

// 改造后
const apiToken = this.getNodeParameter('apiToken', 0) as string;
options.headers = {
    ...options.headers,
    'Authorization': `Bearer ${apiToken}`
};
const response = await this.helpers.request.call(this, options);
```

### Step 5: 删除 Send and Wait 相关代码

```typescript
// 删除 import
// import { getSendAndWaitProperties, ... } from '...';

// 删除 properties 中的 Send and Wait 选项
options: [
    // { name: 'Send and Wait for Response', value: SEND_AND_WAIT_OPERATION }, // ❌ 删除
]

// 删除 execute() 中的 Send and Wait 分支
if (operation === SEND_AND_WAIT_OPERATION) {
    // ... ❌ 删除整个分支
}
```

### Step 6: 替换 lodash/get

```typescript
// 原代码
import get from 'lodash/get';
query.cursor = get(responseData, 'response_metadata.next_cursor');

// 改造后
query.cursor = responseData?.response_metadata?.next_cursor;
```

### Step 7: 删除 moment-timezone

```bash
grep -rn "moment(" V2/  # 检查是否实际使用
# 如果未使用，删除 import 语句
```

### Step 8: 生成最终文件

```
slack-transformed/
├── slack-node-definition.json   # nodeDefinition（元数据）
├── slack-node-code.ts            # nodeCode（完整代码）
└── upload-payload.json           # 上传接口的请求体
```

---

## 八、预期产物

### 文件结构

```
node-research/slack-transformed/
├── README.md                      # 转换说明
├── slack-node-definition.json     # 节点定义（JSON）
├── slack-node-code.ts             # 节点代码（完整）
├── slack-icon-base64.txt          # 图标 Base64
└── upload-payload.json            # 上传请求体示例
```

### 上传请求体示例

```json
{
    "nodeKey": "slack",
    "nodeName": "Slack",
    "nodeType": "platform_official",
    "category": "messaging",
    "description": "Send messages and manage channels in Slack",
    "iconUrl": "data:image/svg+xml;base64,...",
    "version": "2.3.0",
    "nodeDefinition": { /* 完整的 INodeTypeDescription */ },
    "nodeCode": "/* 完整的 TypeScript 代码 */"
}
```

---

## 九、风险和注意事项

### 9.1 高风险项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **VM2 沙箱限制** | 代码可能无法执行 | 先测试简单功能 |
| **缺少外部依赖** | 编译失败 | 完全内联所有依赖 |
| **凭证改造** | API 认证失败 | 仔细修改所有认证点 |

### 9.2 测试计划

1. **编译测试**: VM2 沙箱能否加载代码
2. **基础测试**: 简单的 Message.Send 操作
3. **完整测试**: 所有 7 个资源的基本操作

---

## 十、后续工作

### 10.1 短期目标（本次任务）

- [x] 分析 Slack 节点结构
- [ ] 合并所有依赖文件
- [ ] 处理凭证系统
- [ ] 处理图标文件
- [ ] 测试 VM2 兼容性
- [ ] 生成最终上传包

### 10.2 长期目标（批量转换）

- [ ] 编写自动化转换脚本
- [ ] 转换备份中的所有 256 个节点
- [ ] 建立节点测试框架
- [ ] 编写节点开发文档

---

## 十一、结论

**推荐方案**: 方案 B（精简转换）

**理由**:
1. Send and Wait 功能在 VM2 中可能不工作
2. 代码体积小，更容易维护
3. 核心功能完整保留（7 个资源，30+ 操作）

**预期成功率**: 85%

**主要挑战**:
- 凭证系统改造（需要仔细处理）
- VM2 沙箱兼容性（需要实际测试）

---

**下一步**: 开始合并依赖文件 →
