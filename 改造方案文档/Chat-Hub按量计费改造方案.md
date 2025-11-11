# Chat Hub 按量计费改造方案

> **状态:** 待实现
> **优先级:** P1
> **预计工期:** 1-2 天
> **创建日期:** 2025-01-10

---

## 📋 背景说明

凭证系统移除后，Chat Hub 模块无法使用原有的凭证系统进行 AI 模型认证。需要改造为使用平台统一托管的 API Key，并实现按量计费功能。

### 当前问题

1. **ChatHubAgent 实体** - 缺少 PlatformAIProvider 关系
2. **ChatHubWorkflowService** - 使用空凭证对象（line 339）
3. **BuildModelNode 方法** - credentials 字段为空（TODO 标记）

---

## 🎯 改造目标

1. ✅ **统一认证:** 使用 PlatformAIProvider 提供的平台级 API Key
2. ✅ **自动计费:** 调用 AI 模型时自动从工作空间余额扣费
3. ✅ **架构一致:** 与 LmChatPlatform 节点保持相同的架构模式

---

## 📐 技术方案

### 方案 1: 使用 PlatformAIProvider (推荐)

#### 优势
- ✅ 与 AI 节点架构完全一致
- ✅ 统一的 API Key 管理
- ✅ 自动计费机制完善
- ✅ 无需重复实现加密逻辑

#### 实施步骤

##### 1. 修改 ChatHubAgent 实体

**文件:** `packages/cli/src/modules/chat-hub/chat-hub-agent.entity.ts`

**修改内容:**
```typescript
import { PlatformAIProvider } from '@n8n/db';

@Entity({ name: 'chat_hub_agents' })
export class ChatHubAgent extends WithTimestamps {
  // ... 现有字段 ...

  /**
   * Platform AI Provider key for pay-per-use authentication.
   */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'platform_ai_provider_key' })
  platformAiProviderKey: string | null;

  /**
   * Relationship to Platform AI Provider.
   */
  @ManyToOne(() => PlatformAIProvider, { nullable: true })
  @JoinColumn({ name: 'platform_ai_provider_key', referencedColumnName: 'providerKey' })
  platformAiProvider?: PlatformAIProvider | null;
}
```

**数据库迁移:**
```sql
-- 添加新列
ALTER TABLE chat_hub_agents
ADD COLUMN platform_ai_provider_key VARCHAR(100) NULL;

-- 添加外键约束
ALTER TABLE chat_hub_agents
ADD CONSTRAINT fk_chat_hub_agents_platform_ai_provider
FOREIGN KEY (platform_ai_provider_key)
REFERENCES platform_ai_provider(provider_key);

-- 迁移现有数据（可选）
-- 根据 provider 字段设置 platform_ai_provider_key
UPDATE chat_hub_agents
SET platform_ai_provider_key = provider
WHERE provider IN ('openai', 'anthropic', 'google');
```

---

##### 2. 修改 ChatHubWorkflowService

**文件:** `packages/cli/src/modules/chat-hub/chat-hub-workflow.service.ts`

**2.1 注入 PlatformAIProviderService**

```typescript
import { PlatformAIProviderService } from '@/services/platform-ai-provider.service';

@Service()
export class ChatHubWorkflowService {
  constructor(
    private readonly logger: Logger,
    private readonly workflowRepository: WorkflowRepository,
    private readonly platformAIProviderService: PlatformAIProviderService, // 新增
  ) {}
}
```

**2.2 修改 buildModelNode 方法**

```typescript
private async buildModelNode(
  conversationModel: ChatHubConversationModel,
  agent: ChatHubAgent, // 新增参数
): Promise<INode> {
  if (conversationModel.provider === 'n8n' || conversationModel.provider === 'custom-agent') {
    throw new OperationalError('Custom agent workflows do not require a model node');
  }

  const { provider, model } = conversationModel;

  // 使用 Agent 关联的 PlatformAIProvider
  if (!agent.platformAiProviderKey) {
    throw new OperationalError(
      `Chat agent ${agent.name} does not have a platform AI provider configured`
    );
  }

  // 获取平台 AI Provider 配置
  const platformProvider = await this.platformAIProviderService.getProvider(
    agent.platformAiProviderKey
  );

  // 解密 API Key
  const apiKey = await this.platformAIProviderService.getDecryptedApiKey(
    agent.platformAiProviderKey
  );

  const common = {
    position: [600, 300] satisfies [number, number],
    id: uuidv4(),
    name: NODE_NAMES.CHAT_MODEL,
    // 使用平台 API Key（通过环境变量或节点参数传递）
    credentials: {
      [PROVIDER_NODE_TYPE_MAP[provider].credentialName]: {
        id: agent.platformAiProviderKey,
        name: platformProvider.providerName,
      },
    },
    type: PROVIDER_NODE_TYPE_MAP[provider].name,
    typeVersion: PROVIDER_NODE_TYPE_MAP[provider].version,
  };

  // ... 其余逻辑保持不变 ...
}
```

**2.3 修改方法签名**

```typescript
async createChatWorkflow(
  userId: string,
  sessionId: ChatSessionId,
  projectId: string,
  history: ChatHubMessage[],
  humanMessage: string,
  model: ChatHubConversationModel,
  agent: ChatHubAgent, // 新增参数
  systemMessage?: string,
  trx?: EntityManager,
): Promise<{ workflowData: IWorkflowBase; executionData: IRunExecutionData }> {
  // ...
  const modelNode = await this.buildModelNode(model, agent); // 传递 agent
  // ...
}
```

---

##### 3. 修改 ChatHubService

**文件:** `packages/cli/src/modules/chat-hub/chat-hub.service.ts`

**3.1 加载 Agent 时预加载 PlatformAIProvider**

```typescript
async getAgentById(agentId: string): Promise<ChatHubAgent> {
  const agent = await this.chatHubAgentRepository.findOne({
    where: { id: agentId },
    relations: ['platformAiProvider'], // 预加载关系
  });

  if (!agent) {
    throw new NotFoundError(`Chat agent not found: ${agentId}`);
  }

  return agent;
}
```

**3.2 调用 createChatWorkflow 时传递 agent**

```typescript
const { workflowData, executionData } = await this.chatHubWorkflowService.createChatWorkflow(
  userId,
  sessionId,
  projectId,
  history,
  humanMessage,
  { provider: agent.provider, model: agent.model },
  agent, // 传递完整的 agent 对象
  agent.systemPrompt,
  em,
);
```

---

##### 4. 计费集成

**方式 A: 使用 PlatformAIProviderService 的自动计费**

```typescript
// PlatformAIProviderService.chatCompletion 已经包含自动计费
const response = await this.platformAIProviderService.chatCompletion(
  agent.platformAiProviderKey,
  agent.model,
  {
    messages: chatMessages,
    temperature: 0.7,
  },
  workspaceId,
  userId,
);
```

**方式 B: 在工作流执行后手动计费**

```typescript
// 工作流执行完成后
const executionResult = await this.workflowRunner.run(workflowData);

// 从执行结果中提取 token 使用量
const tokensUsed = executionResult.data?.usage?.totalTokens || 0;

// 计算费用并扣费
const model = await this.platformAIProviderService.getModel(
  agent.platformAiProviderKey,
  agent.model,
);
const cost = (tokensUsed * model.pricePerToken) / 1000;

await this.billingService.deductBalance(workspaceId, cost, {
  serviceKey: `chat-hub:${agent.id}`,
  userId,
  tokensUsed,
});
```

---

##### 5. 前端修改

**文件:** `packages/frontend/editor-ui/src/features/ai/chatHub/composables/useChatCredentials.ts`

**修改前:**
```typescript
// 选择凭证 ID
credentialId: string;
```

**修改后:**
```typescript
// 选择平台 AI Provider
platformAiProviderKey: string;
```

**API 调用修改:**
```typescript
// 创建/更新 Agent 时
await chatHubApi.createAgent({
  name: agentName,
  provider: selectedProvider,
  model: selectedModel,
  platformAiProviderKey: selectedProvider, // 使用 provider 作为 key
  systemPrompt: systemPrompt,
});
```

---

### 方案 2: 直接存储加密的 API Key (备选)

#### 优势
- ✅ 实现简单，不依赖 PlatformAIProvider
- ✅ 灵活性高，可自定义 API Key

#### 劣势
- ❌ 需要重复实现加密/解密逻辑
- ❌ 计费需要手动实现
- ❌ 与系统架构不一致
- ❌ 增加维护成本

#### 实施（不推荐）

```typescript
@Entity({ name: 'chat_hub_agents' })
export class ChatHubAgent extends WithTimestamps {
  // ... 现有字段 ...

  @Column({ type: 'text', nullable: true, name: 'api_key_encrypted' })
  apiKeyEncrypted: string | null;
}
```

---

## 📊 对比分析

| 维度 | 方案 1: PlatformAIProvider | 方案 2: 直接存储 |
|------|---------------------------|----------------|
| **架构一致性** | ✅ 与 AI 节点完全一致 | ❌ 独立实现 |
| **实现复杂度** | 🟡 中等（需要修改多处） | 🟢 简单 |
| **维护成本** | 🟢 低（复用现有逻辑） | 🔴 高（独立维护） |
| **计费集成** | ✅ 自动计费 | ❌ 手动实现 |
| **API Key 管理** | ✅ 平台统一管理 | ❌ 分散管理 |
| **安全性** | ✅ 统一加密逻辑 | 🟡 需自行实现 |
| **扩展性** | ✅ 易于扩展新提供商 | 🟡 需修改代码 |

**推荐:** 方案 1 - 使用 PlatformAIProvider

---

## 🔄 数据迁移策略

### 现有数据处理

如果已有 Chat Hub Agent 数据：

```sql
-- 1. 查看现有数据
SELECT id, name, provider, model
FROM chat_hub_agents;

-- 2. 迁移数据（设置 platform_ai_provider_key）
UPDATE chat_hub_agents
SET platform_ai_provider_key = provider
WHERE provider IN ('openai', 'anthropic', 'google');

-- 3. 验证迁移
SELECT
  a.id,
  a.name,
  a.provider,
  a.platform_ai_provider_key,
  p.provider_name,
  p.is_active
FROM chat_hub_agents a
LEFT JOIN platform_ai_provider p
  ON a.platform_ai_provider_key = p.provider_key;

-- 4. 标记未迁移的记录
SELECT id, name, provider
FROM chat_hub_agents
WHERE platform_ai_provider_key IS NULL
  AND provider NOT IN ('n8n', 'custom-agent');
```

---

## ✅ 验收标准

### 功能测试
- [ ] 创建新的 Chat Agent 可以选择 PlatformAIProvider
- [ ] Chat 对话能正常调用 AI 模型
- [ ] API Key 从平台配置自动加载
- [ ] 对话费用自动从工作空间余额扣除
- [ ] 使用记录正确记录到数据库

### 性能测试
- [ ] Chat 响应时间 < 3 秒（不含 AI API 调用时间）
- [ ] API Key 解密不影响性能
- [ ] 并发 10 个对话无异常

### 安全测试
- [ ] API Key 加密存储
- [ ] API Key 不出现在日志中
- [ ] API Key 不返回给前端
- [ ] 工作空间隔离正确

---

## 📝 实施清单

### 后端 (1 天)

- [ ] 修改 ChatHubAgent 实体添加 platformAiProvider 关系
- [ ] 创建数据库迁移脚本
- [ ] 修改 ChatHubWorkflowService.buildModelNode 使用平台 API Key
- [ ] 修改 ChatHubService 预加载 platformAiProvider
- [ ] 集成计费逻辑
- [ ] 单元测试

### 前端 (0.5 天)

- [ ] 修改 Agent 创建表单，选择 PlatformAIProvider
- [ ] 修改 Agent 编辑表单
- [ ] 移除凭证选择器相关代码
- [ ] 更新 API 调用参数

### 测试 (0.5 天)

- [ ] 功能测试
- [ ] 性能测试
- [ ] 安全测试
- [ ] 回归测试

---

## 🚧 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 现有 Chat 数据丢失 | 高 | 低 | 完整数据库备份 + 迁移脚本测试 |
| API Key 解密失败 | 中 | 低 | 错误处理 + 降级方案 |
| 计费不准确 | 高 | 中 | 充分测试 + Token 使用量验证 |
| 性能下降 | 中 | 低 | 预加载关系 + 缓存 API Key |

---

## 📅 实施计划

### Phase 1: 数据库和实体修改 (2 小时)
- 修改 ChatHubAgent 实体
- 创建迁移脚本
- 迁移现有数据

### Phase 2: 服务层改造 (3 小时)
- 修改 ChatHubWorkflowService
- 修改 ChatHubService
- 集成 PlatformAIProviderService

### Phase 3: 计费集成 (2 小时)
- 实现自动计费逻辑
- 测试计费准确性

### Phase 4: 前端改造 (3 小时)
- 修改 Agent 管理界面
- 移除凭证选择器
- 更新 API 调用

### Phase 5: 测试和验收 (2 小时)
- 功能测试
- 性能测试
- 安全测试

**总计:** 12 小时 ≈ 1.5 天

---

## 📖 参考资料

### 相关文件

**实体:**
- `packages/cli/src/modules/chat-hub/chat-hub-agent.entity.ts`
- `packages/@n8n/db/src/entities/platform-ai-provider.entity.ts`

**服务:**
- `packages/cli/src/modules/chat-hub/chat-hub.service.ts`
- `packages/cli/src/modules/chat-hub/chat-hub-workflow.service.ts`
- `packages/cli/src/services/platform-ai-provider.service.ts`
- `packages/cli/src/services/billing.service.ts`

**前端:**
- `packages/frontend/editor-ui/src/features/ai/chatHub/composables/useChatCredentials.ts`
- `packages/frontend/editor-ui/src/features/ai/chatHub/components/ModelSelector.vue`

### 类似实现参考

**LmChatPlatform 节点:**
- 已实现完整的平台 API Key 认证和按量计费
- 可直接参考其实现模式

---

## 💡 后续优化

### Phase 2 优化 (可选)
1. **API Key 缓存:** 减少解密次数，提升性能
2. **配额管理:** 为 Chat Hub 添加月度配额限制
3. **使用统计:** Chat Hub 专属的使用统计面板
4. **多模型支持:** 用户可在同一 Agent 中切换模型

---

**文档维护:** 开发团队
**最后更新:** 2025-01-10
