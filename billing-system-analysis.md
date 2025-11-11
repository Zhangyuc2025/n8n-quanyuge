# SASA 平台计费系统实现分析

## 一、系统概述

SASA 平台的计费系统采用**双层余额模型**，支持工作空间共享计费和用户个人计费两种模式，使用**悲观锁（Pessimistic Write Lock）**确保并发安全。

### 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                 BillingService（计费服务）                │
├─────────────────────────────────────────────────────────┤
│ • deductBalance() - 工作空间扣费                         │
│ • deductUserBalance() - 用户个人扣费                    │
│ • deductBalanceWithMode() - 双层模式扣费               │
│ • recharge() - 余额充值                                 │
│ • getBalance() - 查询余额                               │
│ • getUsageHistory() - 查询使用记录                     │
└─────────────────────────────────────────────────────────┘
           ↓                          ↓                    ↓
    ┌──────────────┐      ┌─────────────────┐    ┌──────────────┐
    │WorkspaceBalance    │UsageRecord        │    │RechargeRecord│
    │  Repository        │  Repository       │    │  Repository  │
    └──────────────┘      └─────────────────┘    └──────────────┘
           ↓                          ↓                    ↓
    ┌──────────────┐      ┌─────────────────┐    ┌──────────────┐
    │workspace_    │      │usage_record      │    │recharge_     │
    │balance TABLE │      │TABLE             │    │record TABLE  │
    └──────────────┘      └─────────────────┘    └──────────────┘
```

---

## 二、关键数据表结构

### 1. workspace_balance（工作空间余额表）

**文件路径**: `/home/zhang/n8n-quanyuge/packages/@n8n/db/src/entities/workspace-balance.entity.ts`

```typescript
@Entity()
export class WorkspaceBalance extends WithTimestampsAndStringId {
  @Column({ type: 'varchar', length: 36, name: 'workspace_id' })
  @Index({ unique: true })
  workspaceId: string;                    // 工作空间 ID，唯一索引

  @Column({ type: 'double', default: 0.0, name: 'balance_cny' })
  balanceCny: number;                     // 余额（人民币，保留4位小数）

  @Column({ type: 'double', default: 10.0, name: 'low_balance_threshold_cny' })
  lowBalanceThresholdCny: number;         // 低余额阈值（默认 10.0 CNY）

  @Column({ type: 'varchar', length: 3, default: 'CNY' })
  currency: string;                       // 货币类型
}
```

**业务含义**:
- 每个工作空间（Project）有**唯一的余额记录**
- 支持低余额告警功能
- 所有工作空间成员共享此余额池（仅在 `billingMode='shared-pool'` 时）

---

### 2. usage_record（使用记录表）

**文件路径**: `/home/zhang/n8n-quanyuge/packages/@n8n/db/src/entities/usage-record.entity.ts`

```typescript
@Entity()
@Index(['workspaceId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['serviceKey', 'createdAt'])
export class UsageRecord extends WithStringId {
  @Column({ type: 'varchar', length: 36, name: 'workspace_id' })
  workspaceId: string;                    // 工作空间 ID

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;                         // 执行用户 ID

  @Column({ type: 'varchar', length: 100, name: 'service_key' })
  serviceKey: string;                     // 服务标识（如：openai-gpt4、anthropic-claude）

  @Column({ type: 'varchar', length: 50, name: 'service_type' })
  serviceType: string;                    // 服务类型（llm、embedding、storage等）

  @Column({ type: 'int', nullable: true, name: 'tokens_used' })
  tokensUsed: number | null;              // 使用的 token 数（LLM特有）

  @Column({ type: 'int', default: 1, name: 'calls_count' })
  callsCount: number;                     // API 调用次数

  @Column({ type: 'double', name: 'amount_cny' })
  amountCny: number;                      // 消费金额（人民币）

  @Column({ type: 'varchar', length: 20, default: 'user', name: 'balance_source' })
  balanceSource: 'user' | 'workspace';    // 余额来源（关键字段）

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;  // 元数据

  @CreateDateColumn({ precision: 3, type: datetimeColumnType })
  createdAt: Date;                        // 创建时间（不可修改）
}
```

**业务含义**:
- **不可变记录**：一旦创建就不能修改（仅有 `createdAt`，无 `updatedAt`）
- **审计追踪**：完整记录每次消费事件
- **成本溯源**：`balanceSource` 字段追踪费用来自用户还是工作空间
- **多维度查询**：支持按工作空间、用户、服务等维度统计

---

### 3. recharge_record（充值记录表）

**文件路径**: `/home/zhang/n8n-quanyuge/packages/@n8n/db/src/entities/recharge-record.entity.ts`

```typescript
export type RechargeStatus = 'pending' | 'completed' | 'failed';

@Entity()
@Index(['workspaceId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['status'])
export class RechargeRecord extends WithTimestampsAndStringId {
  @Column({ type: 'varchar', length: 36, name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @Column({ type: 'double', name: 'amount_cny' })
  amountCny: number;

  @Column({ type: 'varchar', length: 50, name: 'payment_method' })
  paymentMethod: string;                  // alipay | wechat | bank_transfer | admin

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'transaction_id' })
  transactionId: string | null;           // 三方支付交易 ID（用于幂等性）

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: RechargeStatus;                 // pending → completed/failed

  @DateTimeColumn({ nullable: true, name: 'completed_at' })
  completedAt: Date | null;
}
```

**业务含义**:
- 记录所有充值交易
- 支持多种支付方式
- 使用 `transaction_id` 防止重复处理
- 状态机：pending → completed/failed

---

### 4. balance_transfer_record（余额转账记录表）

**文件路径**: `/home/zhang/n8n-quanyuge/packages/@n8n/db/src/entities/balance-transfer-record.entity.ts`

```typescript
@Entity()
export class BalanceTransferRecord extends WithTimestampsAndStringId {
  @Column({ type: 'varchar', length: 36, name: 'from_user_id' })
  @Index()
  fromUserId: string;                     // 转出用户 ID

  @Column({ type: 'varchar', length: 36, name: 'to_workspace_id' })
  @Index()
  toWorkspaceId: string;                  // 转入工作空间 ID

  @Column({ type: 'double', name: 'amount' })
  amount: number;                         // 转账金额
}
```

**业务含义**:
- 支持用户将个人余额转账到工作空间共享余额池
- 双层计费模式的桥接机制

---

## 三、计费服务核心实现

### BillingService 类

**文件路径**: `/home/zhang/n8n-quanyuge/packages/cli/src/services/billing.service.ts`

#### 1. 扣费逻辑（核心）

```typescript
/**
 * 扣除工作空间余额（使用悲观锁）
 */
async deductBalance(
  workspaceId: string,
  amount: number,
  metadata: DeductBalanceMetadata,
): Promise<DeductBalanceResult> {
  // 1. 调用仓储执行扣费（带悲观锁和事务）
  const result = await this.workspaceBalanceRepository.deductBalance(workspaceId, amount);

  // 2. 扣费成功后创建使用记录
  if (result.success && result.newBalance !== undefined) {
    try {
      await this.usageRecordRepository.createRecord({
        workspaceId,
        userId: metadata.userId,
        serviceKey: metadata.serviceKey,
        amountCny: amount,
        tokensUsed: metadata.tokensUsed ?? 0,
      });
    } catch (error) {
      // 使用记录失败不影响扣费结果
      console.error('Failed to create usage record:', error);
    }
  }

  return result;
}
```

#### 2. 悲观锁实现（关键）

**文件路径**: `/home/zhang/n8n-quanyuge/packages/@n8n/db/src/repositories/workspace-balance.repository.ts`

```typescript
async deductBalance(
  workspaceId: string,
  amount: number,
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const queryRunner = this.manager.connection.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction('SERIALIZABLE');  // 1️⃣ 最高隔离级别

  try {
    // 2️⃣ 使用悲观写锁（pessimistic_write）
    const balance = await queryRunner.manager.findOne(WorkspaceBalance, {
      where: { workspaceId },
      lock: { mode: 'pessimistic_write' },  // FOR UPDATE
    });

    // 3️⃣ 验证余额充足
    if (!balance) {
      await queryRunner.rollbackTransaction();
      return { success: false, error: '余额记录不存在' };
    }

    if (balance.balanceCny < amount) {
      await queryRunner.rollbackTransaction();
      return { success: false, error: `余额不足: ${balance.balanceCny} < ${amount}` };
    }

    // 4️⃣ 扣除金额
    balance.balanceCny -= amount;
    await queryRunner.manager.save(balance);

    // 5️⃣ 提交事务
    await queryRunner.commitTransaction();

    return { success: true, newBalance: balance.balanceCny };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    return { success: false, error: error.message };
  } finally {
    await queryRunner.release();
  }
}
```

#### 3. 双层扣费模式

```typescript
/**
 * 根据计费模式选择扣费来源
 */
async deductBalanceWithMode(
  workspaceId: string,
  executorUserId: string,
  amount: number,
  metadata: DeductBalanceMetadata,
): Promise<DeductBalanceResult> {
  // 1. 查询工作空间计费模式
  const project = await this.projectRepository.findOne({
    where: { id: workspaceId },
  });

  let result: DeductBalanceResult;
  let balanceSource: 'user' | 'workspace';

  // 2. 根据模式选择扣费来源
  if (project.billingMode === 'executor') {
    // 从用户个人余额扣费
    result = await this.deductUserBalance(executorUserId, amount);
    balanceSource = 'user';
  } else {
    // 从工作空间共享余额池扣费
    result = await this.workspaceBalanceRepository.deductBalance(workspaceId, amount);
    balanceSource = 'workspace';
  }

  // 3. 记录费用来源（用于审计）
  if (result.success) {
    await this.usageRecordRepository.createRecord({
      workspaceId,
      userId: metadata.userId,
      serviceKey: metadata.serviceKey,
      amountCny: amount,
      balanceSource,  // ← 关键字段
    });
  }

  return result;
}
```

#### 4. 用户个人余额扣费

```typescript
async deductUserBalance(userId: string, amount: number): Promise<DeductBalanceResult> {
  const queryRunner = this.userRepository.manager.connection.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction('SERIALIZABLE');

  try {
    // 锁定用户记录
    const user = await queryRunner.manager.findOne(User, {
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!user) {
      await queryRunner.rollbackTransaction();
      return { success: false, error: `用户不存在: ${userId}` };
    }

    if (user.balance < amount) {
      await queryRunner.rollbackTransaction();
      return {
        success: false,
        error: `余额不足: ${user.balance} < ${amount}`,
      };
    }

    // 扣费
    user.balance -= amount;
    await queryRunner.manager.save(user);
    await queryRunner.commitTransaction();

    return { success: true, newBalance: user.balance };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    return { success: false, error: error.message };
  } finally {
    await queryRunner.release();
  }
}
```

---

## 四、扣费调用点分析

### 1. AI 服务调用时的扣费

**文件路径**: `/home/zhang/n8n-quanyuge/packages/cli/src/services/platform-ai-provider.service.ts`

```typescript
async chatCompletion(
  providerKey: string,
  modelId: string,
  request: ChatCompletionRequest,
  workspaceId: string,
  userId: string,
): Promise<ChatCompletionResponse> {
  // Step 1: 获取提供商和模型配置
  const provider = await this.providerRepository.findOne({
    where: { providerKey, isActive: true },
  });
  const model = provider.modelsConfig.models.find((m) => m.id === modelId);

  // Step 2: 🔴 预检查余额（防止不必要的 API 调用）
  const estimatedTokens = this.estimateTokens(request.messages);
  const estimatedCost = (estimatedTokens * model.pricePerToken) / 1000;

  const currentBalance = await this.billingService.getBalance(workspaceId);
  if (currentBalance < estimatedCost) {
    throw new UserError(
      `余额不足: 需要 ${estimatedCost} CNY，可用 ${currentBalance} CNY`
    );
  }

  // Step 3: 调用 AI API
  const response = await this.callProviderAPI(provider.apiEndpoint, apiKey, modelId, request);

  // Step 4: 🔴 根据实际使用量扣费
  const actualTokens = response.usage.totalTokens;
  const actualCost = (actualTokens * model.pricePerToken) / 1000;

  await this.billingService.deductBalance(workspaceId, actualCost, {
    serviceKey: `${providerKey}:${modelId}`,
    userId,
    tokensUsed: actualTokens,
  });

  return response;
}
```

**流程说明**:
1. **预估成本** - 调用 API 前计算估算费用（防止浪费）
2. **余额检查** - 验证余额充足（快速失败）
3. **API 调用** - 获取实际 Token 使用量
4. **扣费** - 根据实际使用量扣费（可能比估计少）

---

## 五、余额防护机制

### 1. 悲观锁（核心防护）

```
并发场景：
┌─────────────────────────────┐
│   Thread A          Thread B │
├─────────────────────────────┤
│ START TRANSACTION           │
│   ↓                         │
│ LOCK (FOR UPDATE)           │
│   ↓ (Thread B 等待)        │
│ Check: 100 CNY >= 50 CNY   │
│   ↓                         │
│ Deduct: 100 - 50 = 50      │
│   ↓                         │
│ COMMIT                      │
│   ↓                         │
│ (Thread B 获得锁)           │
│   ↓                         │
│              START TRANSACTION
│              ↓
│              LOCK (FOR UPDATE)
│              ↓
│              Check: 50 CNY >= 50 CNY ✓
│              ↓
│              Deduct: 50 - 50 = 0
│              ↓
│              COMMIT

结果: 余额 = 0（安全！）

⚠️ 如果没有锁：
┌──────────────────────────────┐
│   Thread A          Thread B  │
├──────────────────────────────┤
│ Read: 100 CNY                │
│              Read: 100 CNY    │
│ Check: 100 >= 50 ✓           │
│              Check: 100 >= 50 ✓
│ Write: 100 - 50 = 50         │
│              Write: 100 - 50 = 50
│ Commit                       │
│              Commit

结果: 余额 = 50（❌ 透支了！）
```

### 2. 隔离级别

```sql
-- SERIALIZABLE 隔离级别的行为
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

BEGIN;
  -- 1. 获取行锁（在 SELECT FOR UPDATE 时）
  SELECT balance FROM workspace_balance 
  WHERE workspace_id = 'ws-123' 
  FOR UPDATE;
  
  -- 2. 检查条件
  -- 3. 修改数据
  UPDATE workspace_balance 
  SET balance_cny = balance_cny - 50 
  WHERE workspace_id = 'ws-123';
  
  -- 4. 提交事务（释放锁）
COMMIT;

-- 其他事务必须等待直到锁释放
```

### 3. 错误处理

```typescript
// 错误类定义
export class InsufficientBalanceError extends UserError {
  constructor(required: number, available: number) {
    super(`余额不足。需要: ${required} CNY，可用: ${available} CNY`);
  }
}

// 调用时的异常处理
const result = await this.billingService.deductBalance(workspaceId, cost, metadata);
if (!result.success) {
  throw new InsufficientBalanceError(cost, currentBalance);
}
```

---

## 六、时机与触发点

### ⏰ 扣费时机：API 调用后

```typescript
// ✅ 正确模式
async function executeAI() {
  // 1. 预检查（快速失败）
  await checkBalance();
  
  // 2. 执行（获取真实结果）
  const response = await callAI();
  
  // 3. 扣费（基于真实用量）
  await deductBalance(response.tokensUsed);
  
  return response;
}

// ❌ 错误模式（不要这样做）
async function executeAI() {
  // 先扣费再执行 - 如果 API 失败还是扣了费
  await deductBalance(estimatedTokens);
  const response = await callAI();  // 如果这里失败...
  return response;
}
```

### 📊 按节点扣费还是按工作流扣费

根据代码分析，**按 API 调用扣费**（粒度最细），而非按节点或工作流：

```typescript
// 每次 chatCompletion 调用都记录一次使用
await this.billingService.deductBalance(workspaceId, actualCost, {
  serviceKey: `${providerKey}:${modelId}`,  // 精确到 provider + model
  userId,
  tokensUsed: actualTokens,
});

// 使用记录表（usage_record）会有一条记录
// 一个工作流中多个 AI 节点 = 多条记录
```

---

## 七、双层计费模式对比

### 模式 1: executor（用户个人计费）

```typescript
if (project.billingMode === 'executor') {
  // 从执行工作流的用户个人余额扣费
  result = await this.deductUserBalance(executorUserId, amount);
  balanceSource = 'user';
}
```

**特点**:
- 每个用户有自己的余额
- User 表增加 `balance` 字段
- 工作流执行者承担费用
- 适合按使用者计费的场景

### 模式 2: shared-pool（团队共享计费）

```typescript
else {
  // 从工作空间共享余额池扣费
  result = await this.workspaceBalanceRepository.deductBalance(workspaceId, amount);
  balanceSource = 'workspace';
}
```

**特点**:
- WorkspaceBalance 表存储团队余额
- 所有团队成员共享余额
- 团队管理员充值管理
- 适合按工作空间/团队计费的场景

---

## 八、余额充值流程

```typescript
async recharge(
  workspaceId: string,
  amount: number,
  paymentMethod: string,
  transactionId?: string,
): Promise<void> {
  // Step 1: 创建充值记录（状态为 pending）
  const rechargeRecord = await this.rechargeRecordRepository.createRecord({
    workspaceId,
    amountCny: amount,
    paymentMethod,
    transactionId,
    status: 'pending',
  });

  try {
    // Step 2: 增加余额
    await this.workspaceBalanceRepository.addBalance(workspaceId, amount);

    // Step 3: 更新充值记录为已完成
    await this.rechargeRecordRepository.updateStatus(rechargeRecord.id, 'completed');
  } catch (error) {
    // 失败时标记为失败
    await this.rechargeRecordRepository.updateStatus(rechargeRecord.id, 'failed');
    throw error;
  }
}
```

**流程**:
1. pending → 待审核
2. API 调用成功 → completed
3. API 调用失败 → failed
4. 支付回调验证 → 更新状态

---

## 九、API 端点

### 用户端计费 API

**文件路径**: `/home/zhang/n8n-quanyuge/packages/cli/src/controllers/billing.controller.ts`

| 端点 | 方法 | 功能 |
|------|------|------|
| `/billing/balance` | GET | 查询工作空间余额 |
| `/billing/recharge` | POST | 发起充值订单 |
| `/billing/usage` | GET | 查询消费记录（分页） |
| `/billing/usage/summary` | GET | 月度账单汇总 |
| `/billing/recharge/callback` | POST | 支付回调（支付宝/微信） |

### 查询示例

```bash
# 1. 查询余额
curl -X GET "http://localhost:5678/billing/balance?workspaceId=ws-123"
# 返回:
{
  "workspaceId": "ws-123",
  "balance": 99.50,
  "currency": "CNY"
}

# 2. 获取消费记录
curl -X GET "http://localhost:5678/billing/usage?workspaceId=ws-123&skip=0&limit=10"
# 返回:
{
  "records": [
    {
      "id": "rec-1",
      "serviceKey": "openai-gpt4",
      "amountCny": 0.50,
      "tokensUsed": 500,
      "createdAt": "2025-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "skip": 0,
    "limit": 10,
    "hasMore": true
  }
}

# 3. 月度账单
curl -X GET "http://localhost:5678/billing/usage/summary?workspaceId=ws-123&year=2025&month=1"
# 返回:
{
  "summary": {
    "totalAmount": 150.00,
    "totalTokens": 500000,
    "recordCount": 300
  }
}
```

---

## 十、防止透支的关键机制总结

| 机制 | 实现位置 | 作用 |
|------|--------|------|
| **SERIALIZABLE 隔离级别** | deductBalance() | 防止并发冲突 |
| **悲观写锁（FOR UPDATE）** | WorkspaceBalance.deductBalance() | 同一时刻只能有一个事务修改 |
| **余额检查** | deductBalance() | 扣费前验证余额充足 |
| **事务回滚** | try-catch-finally | 失败时撤销所有改动 |
| **预估成本检查** | PlatformAIProviderService | API 调用前快速失败 |
| **使用记录不可变** | UsageRecord（无 updatedAt） | 审计追踪，防止篡改 |
| **余额来源追踪** | balanceSource 字段 | 双层模式的完整记录 |

---

## 十一、已知实现细节

### 1. Token 计算方式

```typescript
/**
 * 粗略估算：平均 1 个 token ≈ 0.75 个单词 ≈ 4 个字符
 */
private estimateTokens(messages: Array<{ role: string; content: string }>): number {
  const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  return Math.ceil(totalChars / 4);
}
```

### 2. 支付方式

- alipay（支付宝）
- wechat（微信支付）
- bank_transfer（银行转账）
- admin（管理员直接充值）

### 3. 低余额警告

```typescript
async checkLowBalance(workspaceId: string): Promise<boolean> {
  const balance = await this.findOne({ where: { workspaceId } });
  return balance.balanceCny < balance.lowBalanceThresholdCny;
  // 默认阈值: 10.0 CNY
}
```

---

## 十二、TODOs 和待完成项

1. **支付回调验证** - 支付宝/微信签名验证（暂未实现）
2. **支付平台集成** - 调用支付宝/微信 API 创建订单
3. **蛋糕 Token 计算** - 使用精确的 Token 计算器替代字符估算
4. **配额管理** - 支持按天/月/总额的配额限制
5. **消费报告** - 导出 CSV/PDF 账单

---

## 十三、代码文件导航

| 功能 | 文件路径 |
|------|---------|
| 计费服务 | `/packages/cli/src/services/billing.service.ts` |
| 工作空间余额仓储 | `/packages/@n8n/db/src/repositories/workspace-balance.repository.ts` |
| 使用记录仓储 | `/packages/@n8n/db/src/repositories/usage-record.repository.ts` |
| 使用记录实体 | `/packages/@n8n/db/src/entities/usage-record.entity.ts` |
| 工作空间余额实体 | `/packages/@n8n/db/src/entities/workspace-balance.entity.ts` |
| 充值记录实体 | `/packages/@n8n/db/src/entities/recharge-record.entity.ts` |
| 余额转账实体 | `/packages/@n8n/db/src/entities/balance-transfer-record.entity.ts` |
| 计费 API 控制器 | `/packages/cli/src/controllers/billing.controller.ts` |
| AI 提供商服务 | `/packages/cli/src/services/platform-ai-provider.service.ts` |
| 数据库迁移 | `/packages/@n8n/db/src/migrations/common/1762511302000-CreateBillingTables.ts` |

