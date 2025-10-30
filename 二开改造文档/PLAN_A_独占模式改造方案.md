# 方案 A：激进重构 - 工作区独占模式改造方案

## 概述

**目标**：将 n8n 的资源归属模型从"共享引用模式"改造为"独占归属模式"，对齐 Coze 的多租户架构。

**核心原则**：
- 每个资源（Workflow、Credentials）只能归属一个工作区（Project）
- 工作区之间数据完全隔离
- 通过"应用市场"实现跨工作区的模板共享和复用

---

## 一、架构对比

### 改造前：共享引用模式

```
Workflow X (单一实体)
  ├─ SharedWorkflow { projectId: A, role: owner }
  ├─ SharedWorkflow { projectId: B, role: editor }   // ❌ 跨工作区共享
  └─ SharedWorkflow { projectId: C, role: viewer }

问题：
1. 工作流"属于"哪个工作区不明确
2. A 修改会影响 B/C
3. 工作区切换时数据边界模糊
4. 违反多租户 SaaS 的数据隔离原则
```

### 改造后：独占归属模式

```
Workflow X { id: 1, projectId: A }  // ✅ 独占归属工作区 A
Workflow Y { id: 2, projectId: B }  // ✅ 独占归属工作区 B
Workflow Z { id: 3, projectId: C }  // ✅ 独占归属工作区 C

优势：
1. 每个资源有明确的唯一所有者
2. 修改完全隔离，互不影响
3. 工作区切换：WHERE projectId = currentProjectId（简单清晰）
4. 符合 Coze 的架构模型
```

---

## 二、数据库改造

### 2.1 WorkflowEntity 改造

#### 修改点 1：添加 projectId 外键

```typescript
// 文件：packages/@n8n/db/src/entities/workflow-entity.ts

@Entity()
export class WorkflowEntity extends WithTimestampsAndStringId implements IWorkflowDb {
  // ... 现有字段保持不变 ...

  // [方案 A 改造] 添加工作区独占归属
  @ManyToOne('Project', {
    onDelete: 'CASCADE', // 工作区删除时级联删除工作流
  })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'varchar', length: 36 })
  @Index()
  projectId: string; // ✅ 工作流独占归属一个工作区

  // ❌ 删除：shared: SharedWorkflow[]
  // 不再需要多对多关系

  // [应用市场扩展字段] 用于后续功能
  @Column({ default: false })
  isMarketplaceTemplate: boolean; // 是否为应用市场的公开模板

  @Column({ type: 'varchar', length: 36, nullable: true })
  sourceMarketplaceAppId: string | null; // 如果是从市场安装，记录来源
}
```

#### 修改点 2：删除 shared 关系

```typescript
// 删除这行：
// @OneToMany('SharedWorkflow', 'workflow')
// shared: SharedWorkflow[];
```

#### 修改点 3：更新 IWorkflowDb 接口

```typescript
// 文件：packages/@n8n/db/src/entities/types-db.ts

export interface IWorkflowDb {
  id: string;
  name: string;
  active: boolean;
  nodes: INode[];
  connections: IConnections;
  settings?: IWorkflowSettings;
  staticData?: IDataObject;
  // ... 其他字段 ...

  // ✅ 新增
  projectId: string;
  project?: Project;

  // ❌ 删除
  // shared?: SharedWorkflow[];
}
```

---

### 2.2 CredentialsEntity 改造

```typescript
// 文件：packages/@n8n/db/src/entities/credentials-entity.ts

@Entity()
export class CredentialsEntity extends WithTimestampsAndStringId implements ICredentialsDb {
  // ... 现有字段保持不变 ...

  // [方案 A 改造] 添加工作区独占归属
  @ManyToOne('Project', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'varchar', length: 36 })
  @Index()
  projectId: string; // ✅ 凭证独占归属一个工作区

  // ❌ 删除：shared: SharedCredentials[]

  // [应用市场扩展字段]
  @Column({ default: false })
  isMarketplaceTemplate: boolean;

  @Column({ type: 'varchar', length: 36, nullable: true })
  sourceMarketplaceAppId: string | null;
}
```

---

### 2.3 废弃 SharedWorkflow / SharedCredentials

**选项 1：完全删除（激进）**

```sql
-- 迁移完成后删除表
DROP TABLE shared_workflow;
DROP TABLE shared_credentials;
```

**选项 2：保留用于应用市场（保守）**

```typescript
// 重命名并调整用途
@Entity('marketplace_workflow_reference') // 改名
export class MarketplaceWorkflowReference extends WithTimestamps {
  @Column({ type: 'varchar' })
  role: 'viewer'; // 强制只读

  @ManyToOne('WorkflowEntity')
  workflow: WorkflowEntity; // 指向市场模板

  @ManyToOne('Project')
  project: Project; // 引用到的工作区

  @PrimaryColumn()
  workflowId: string;

  @PrimaryColumn()
  projectId: string;

  @Column({ default: true })
  autoUpdate: boolean; // 自动同步模板更新
}
```

**建议**：采用选项 2，保留表结构但限制用途为市场引用。

---

## 三、数据迁移

### 3.1 迁移脚本（TypeORM Migration）

```typescript
// 文件：packages/cli/src/databases/migrations/1730XXXXXX-MigrateToExclusiveProjectModel.ts

import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from '@n8n/typeorm';

export class MigrateToExclusiveProjectModel1730XXXXXX implements MigrationInterface {
  name = 'MigrateToExclusiveProjectModel1730XXXXXX';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // 步骤 1：为 workflow_entity 添加 projectId 字段（nullable）
    // ============================================================
    await queryRunner.addColumn('workflow_entity', new TableColumn({
      name: 'projectId',
      type: 'varchar',
      length: '36',
      isNullable: true, // 先允许 null，迁移后改为 NOT NULL
    }));

    // ============================================================
    // 步骤 2：迁移数据 - 设置 workflow.projectId
    // ============================================================

    // 2.1 为每个工作流设置主工作区（owner 所在的工作区）
    await queryRunner.query(`
      UPDATE workflow_entity w
      SET projectId = (
        SELECT sw.projectId
        FROM shared_workflow sw
        WHERE sw.workflowId = w.id
          AND sw.role = 'workflow:owner'
        LIMIT 1
      )
    `);

    // 2.2 检查是否有工作流没有 owner（异常数据）
    const orphanedWorkflows = await queryRunner.query(`
      SELECT id, name FROM workflow_entity WHERE projectId IS NULL
    `);

    if (orphanedWorkflows.length > 0) {
      console.warn(`⚠️ 发现 ${orphanedWorkflows.length} 个没有 owner 的工作流：`, orphanedWorkflows);

      // 将孤儿工作流分配到第一个个人工作区
      await queryRunner.query(`
        UPDATE workflow_entity w
        SET projectId = (
          SELECT id FROM project WHERE type = 'personal' LIMIT 1
        )
        WHERE projectId IS NULL
      `);
    }

    // ============================================================
    // 步骤 3：为跨工作区共享创建副本
    // ============================================================

    // 3.1 查找所有跨工作区共享的记录
    const sharedRecords = await queryRunner.query(`
      SELECT
        sw.workflowId,
        sw.projectId as sharedProjectId,
        w.name,
        w.active,
        w.nodes,
        w.connections,
        w.settings,
        w.staticData,
        w.meta,
        w.pinData,
        w.versionId,
        w.versionCounter,
        w.triggerCount
      FROM shared_workflow sw
      JOIN workflow_entity w ON sw.workflowId = w.id
      WHERE sw.projectId != w.projectId  -- 不是主工作区的共享
        AND sw.role != 'workflow:owner'   -- 排除 owner
    `);

    console.log(`📋 发现 ${sharedRecords.length} 个跨工作区共享，准备创建副本...`);

    // 3.2 为每个共享工作区创建独立副本
    for (const record of sharedRecords) {
      const newId = this.generateUuid();

      await queryRunner.query(`
        INSERT INTO workflow_entity (
          id, name, active, nodes, connections, settings,
          staticData, meta, pinData, versionId, versionCounter,
          triggerCount, projectId, createdAt, updatedAt
        )
        SELECT
          '${newId}',
          CONCAT(name, ' (从共享转换)'),
          active,
          nodes,
          connections,
          settings,
          staticData,
          meta,
          pinData,
          '${this.generateUuid()}', -- 新 versionId
          versionCounter,
          triggerCount,
          '${record.sharedProjectId}',
          NOW(),
          NOW()
        FROM workflow_entity
        WHERE id = '${record.workflowId}'
      `);

      console.log(`✅ 为工作区 ${record.sharedProjectId} 创建工作流副本: ${newId}`);
    }

    // ============================================================
    // 步骤 4：删除跨工作区的 shared_workflow 记录
    // ============================================================
    await queryRunner.query(`
      DELETE FROM shared_workflow
      WHERE projectId != (
        SELECT projectId FROM workflow_entity
        WHERE id = shared_workflow.workflowId
      )
    `);

    // ============================================================
    // 步骤 5：同理处理 credentials_entity
    // ============================================================

    // 5.1 添加 projectId 字段
    await queryRunner.addColumn('credentials_entity', new TableColumn({
      name: 'projectId',
      type: 'varchar',
      length: '36',
      isNullable: true,
    }));

    // 5.2 迁移数据
    await queryRunner.query(`
      UPDATE credentials_entity c
      SET projectId = (
        SELECT sc.projectId
        FROM shared_credentials sc
        WHERE sc.credentialsId = c.id
          AND sc.role = 'credential:owner'
        LIMIT 1
      )
    `);

    // 5.3 检查孤儿凭证
    const orphanedCredentials = await queryRunner.query(`
      SELECT id, name FROM credentials_entity WHERE projectId IS NULL
    `);

    if (orphanedCredentials.length > 0) {
      console.warn(`⚠️ 发现 ${orphanedCredentials.length} 个没有 owner 的凭证：`, orphanedCredentials);

      await queryRunner.query(`
        UPDATE credentials_entity c
        SET projectId = (
          SELECT id FROM project WHERE type = 'personal' LIMIT 1
        )
        WHERE projectId IS NULL
      `);
    }

    // 5.4 为跨工作区共享创建副本
    const sharedCredentials = await queryRunner.query(`
      SELECT
        sc.credentialsId,
        sc.projectId as sharedProjectId,
        c.name,
        c.type,
        c.data
      FROM shared_credentials sc
      JOIN credentials_entity c ON sc.credentialsId = c.id
      WHERE sc.projectId != c.projectId
        AND sc.role != 'credential:owner'
    `);

    console.log(`📋 发现 ${sharedCredentials.length} 个跨工作区共享的凭证，准备创建副本...`);

    for (const record of sharedCredentials) {
      const newId = this.generateUuid();

      await queryRunner.query(`
        INSERT INTO credentials_entity (
          id, name, type, data, projectId, createdAt, updatedAt
        )
        SELECT
          '${newId}',
          CONCAT(name, ' (从共享转换)'),
          type,
          data,
          '${record.sharedProjectId}',
          NOW(),
          NOW()
        FROM credentials_entity
        WHERE id = '${record.credentialsId}'
      `);

      console.log(`✅ 为工作区 ${record.sharedProjectId} 创建凭证副本: ${newId}`);
    }

    // 5.5 删除跨工作区的 shared_credentials 记录
    await queryRunner.query(`
      DELETE FROM shared_credentials
      WHERE projectId != (
        SELECT projectId FROM credentials_entity
        WHERE id = shared_credentials.credentialsId
      )
    `);

    // ============================================================
    // 步骤 6：修改字段约束为 NOT NULL
    // ============================================================
    await queryRunner.changeColumn('workflow_entity', 'projectId', new TableColumn({
      name: 'projectId',
      type: 'varchar',
      length: '36',
      isNullable: false, // ✅ 改为 NOT NULL
    }));

    await queryRunner.changeColumn('credentials_entity', 'projectId', new TableColumn({
      name: 'projectId',
      type: 'varchar',
      length: '36',
      isNullable: false, // ✅ 改为 NOT NULL
    }));

    // ============================================================
    // 步骤 7：添加外键约束
    // ============================================================
    await queryRunner.createForeignKey('workflow_entity', new TableForeignKey({
      columnNames: ['projectId'],
      referencedTableName: 'project',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
    }));

    await queryRunner.createForeignKey('credentials_entity', new TableForeignKey({
      columnNames: ['projectId'],
      referencedTableName: 'project',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
    }));

    // ============================================================
    // 步骤 8：添加应用市场扩展字段
    // ============================================================
    await queryRunner.addColumn('workflow_entity', new TableColumn({
      name: 'isMarketplaceTemplate',
      type: 'boolean',
      default: false,
    }));

    await queryRunner.addColumn('workflow_entity', new TableColumn({
      name: 'sourceMarketplaceAppId',
      type: 'varchar',
      length: '36',
      isNullable: true,
    }));

    await queryRunner.addColumn('credentials_entity', new TableColumn({
      name: 'isMarketplaceTemplate',
      type: 'boolean',
      default: false,
    }));

    await queryRunner.addColumn('credentials_entity', new TableColumn({
      name: 'sourceMarketplaceAppId',
      type: 'varchar',
      length: '36',
      isNullable: true,
    }));

    console.log('✅ 迁移完成！工作流和凭证已改为独占归属模式。');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚操作（生产环境谨慎使用）

    // 删除外键
    const workflowTable = await queryRunner.getTable('workflow_entity');
    const workflowForeignKey = workflowTable?.foreignKeys.find(
      fk => fk.columnNames.indexOf('projectId') !== -1
    );
    if (workflowForeignKey) {
      await queryRunner.dropForeignKey('workflow_entity', workflowForeignKey);
    }

    const credentialsTable = await queryRunner.getTable('credentials_entity');
    const credentialsForeignKey = credentialsTable?.foreignKeys.find(
      fk => fk.columnNames.indexOf('projectId') !== -1
    );
    if (credentialsForeignKey) {
      await queryRunner.dropForeignKey('credentials_entity', credentialsForeignKey);
    }

    // 删除字段
    await queryRunner.dropColumn('workflow_entity', 'projectId');
    await queryRunner.dropColumn('workflow_entity', 'isMarketplaceTemplate');
    await queryRunner.dropColumn('workflow_entity', 'sourceMarketplaceAppId');
    await queryRunner.dropColumn('credentials_entity', 'projectId');
    await queryRunner.dropColumn('credentials_entity', 'isMarketplaceTemplate');
    await queryRunner.dropColumn('credentials_entity', 'sourceMarketplaceAppId');
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
```

---

## 四、业务逻辑调整

### 4.1 WorkflowService 改造

```typescript
// 文件：packages/cli/src/workflows/workflow.service.ts

@Service()
export class WorkflowService {
  // ✅ 修改：创建工作流时直接设置 projectId
  async create(
    user: User,
    workflow: WorkflowRequest,
    projectId: string, // 必填参数
  ): Promise<WorkflowEntity> {
    const newWorkflow = new WorkflowEntity();
    Object.assign(newWorkflow, workflow);

    // ✅ 独占归属
    newWorkflow.projectId = projectId;

    await this.workflowRepository.save(newWorkflow);

    // ❌ 删除：不再创建 SharedWorkflow
    // await this.sharedWorkflowRepository.save({
    //   workflowId: newWorkflow.id,
    //   projectId,
    //   role: 'workflow:owner',
    // });

    return newWorkflow;
  }

  // ✅ 修改：查询时过滤 projectId
  async getMany(
    user: User,
    projectId: string,
    options?: FindManyOptions<WorkflowEntity>,
  ): Promise<WorkflowEntity[]> {
    return await this.workflowRepository.find({
      where: {
        projectId, // ✅ 只查询当前工作区的工作流
        ...options?.where,
      },
      ...options,
    });
  }

  // ✅ 新增：复制工作流到其他工作区
  async duplicateToProject(
    workflowId: string,
    targetProjectId: string,
    user: User,
  ): Promise<WorkflowEntity> {
    const sourceWorkflow = await this.workflowRepository.findOneOrFail({
      where: { id: workflowId },
    });

    // 深拷贝
    const copiedWorkflow = new WorkflowEntity();
    Object.assign(copiedWorkflow, {
      ...sourceWorkflow,
      id: undefined, // 自动生成新 ID
      name: `${sourceWorkflow.name} (副本)`,
      projectId: targetProjectId, // ✅ 归属目标工作区
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await this.workflowRepository.save(copiedWorkflow);
  }

  // ❌ 删除：不再支持跨工作区共享
  // async shareToProject() { ... }
}
```

---

### 4.2 CredentialsService 改造

```typescript
// 文件：packages/cli/src/credentials/credentials.service.ts

@Service()
export class CredentialsService {
  async save(
    credential: CredentialsEntity,
    encryptedData: ICredentialDataDecryptedObject,
    projectId: string, // 必填参数
  ): Promise<CredentialsEntity> {
    credential.data = this.cipher.encrypt(encryptedData);
    credential.projectId = projectId; // ✅ 独占归属

    return await this.credentialsRepository.save(credential);
  }

  async getMany(
    user: User,
    projectId: string,
    options?: FindManyOptions<CredentialsEntity>,
  ): Promise<CredentialsEntity[]> {
    return await this.credentialsRepository.find({
      where: {
        projectId, // ✅ 只查询当前工作区的凭证
        ...options?.where,
      },
      ...options,
    });
  }

  // ✅ 新增：复制凭证到其他工作区
  async duplicateToProject(
    credentialsId: string,
    targetProjectId: string,
  ): Promise<CredentialsEntity> {
    const source = await this.credentialsRepository.findOneOrFail({
      where: { id: credentialsId },
    });

    const copied = new CredentialsEntity();
    Object.assign(copied, {
      ...source,
      id: undefined,
      name: `${source.name} (副本)`,
      projectId: targetProjectId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await this.credentialsRepository.save(copied);
  }
}
```

---

### 4.3 API Controller 调整

```typescript
// 文件：packages/cli/src/workflows/workflows.controller.ts

@RestController('/workflows')
export class WorkflowsController {
  // ✅ 修改：创建工作流需要传递 projectId
  @Post('/')
  async create(
    req: WorkflowRequest.Create,
    res: express.Response,
  ): Promise<IWorkflowResponse> {
    const { workflow } = req.body;
    const projectId = req.body.projectId || this.getCurrentProjectId(req); // 必填

    if (!projectId) {
      throw new BadRequestError('projectId is required');
    }

    const savedWorkflow = await this.workflowService.create(
      req.user,
      workflow,
      projectId,
    );

    return savedWorkflow;
  }

  // ✅ 修改：查询工作流列表需要传递 projectId
  @Get('/')
  async getMany(
    req: WorkflowRequest.GetAll,
    res: express.Response,
  ): Promise<IWorkflowResponse[]> {
    const projectId = req.query.projectId || this.getCurrentProjectId(req); // 必填

    if (!projectId) {
      throw new BadRequestError('projectId is required');
    }

    const workflows = await this.workflowService.getMany(
      req.user,
      projectId,
      { /* options */ },
    );

    return workflows;
  }

  // ✅ 新增：复制工作流到其他工作区
  @Post('/:id/duplicate-to-project')
  async duplicateToProject(
    req: WorkflowRequest.DuplicateToProject,
    res: express.Response,
  ): Promise<IWorkflowResponse> {
    const { id: workflowId } = req.params;
    const { targetProjectId } = req.body;

    const copied = await this.workflowService.duplicateToProject(
      workflowId,
      targetProjectId,
      req.user,
    );

    return copied;
  }

  private getCurrentProjectId(req: express.Request): string | undefined {
    // 从请求上下文获取当前工作区 ID
    return req.user?.activeProjectId || req.query.projectId as string;
  }
}
```

---

## 五、前端调整

### 5.1 WorkflowsStore 改造

```typescript
// 文件：packages/frontend/editor-ui/src/stores/workflows.store.ts

export const useWorkflowsStore = defineStore('workflows', () => {
  const projectsStore = useProjectsStore();

  // ✅ 修改：fetchWorkflowsPage 自动使用 currentProjectId
  async function fetchWorkflowsPage(
    projectId?: string, // 可选，默认使用当前工作区
    page = 1,
    limit = 10,
  ) {
    const targetProjectId = projectId || projectsStore.currentProjectId;

    if (!targetProjectId) {
      throw new Error('No active project');
    }

    const response = await workflowsApi.getWorkflows(rootStore.restApiContext, {
      projectId: targetProjectId, // ✅ 过滤参数
      page,
      limit,
    });

    return response;
  }

  // ✅ 修改：createNewWorkflow 自动使用 currentProjectId
  async function createNewWorkflow(workflow: Partial<IWorkflowDb>) {
    const projectId = workflow.projectId || projectsStore.currentProjectId;

    if (!projectId) {
      throw new Error('No active project');
    }

    const savedWorkflow = await workflowsApi.createNewWorkflow(
      rootStore.restApiContext,
      {
        ...workflow,
        projectId, // ✅ 必填
      },
    );

    return savedWorkflow;
  }

  // ✅ 新增：复制到工作区
  async function duplicateToProject(workflowId: string, targetProjectId: string) {
    const copied = await workflowsApi.duplicateWorkflowToProject(
      rootStore.restApiContext,
      workflowId,
      { targetProjectId },
    );

    return copied;
  }

  return {
    fetchWorkflowsPage,
    createNewWorkflow,
    duplicateToProject,
    // ... 其他方法 ...
  };
});
```

---

### 5.2 WorkflowsView 简化

```vue
<script setup lang="ts">
// 文件：packages/frontend/editor-ui/src/views/WorkflowsView.vue

const projectsStore = useProjectsStore();
const workflowsStore = useWorkflowsStore();

// ✅ 简化：不再需要 route.params.projectId，直接用 currentProjectId
const fetchWorkflows = async () => {
  const projectId = projectsStore.currentProjectId;

  if (!projectId) {
    console.warn('No active project');
    return;
  }

  const workflows = await workflowsStore.fetchWorkflowsPage(projectId);
  // ... 处理数据 ...
};

// ✅ 监听 currentProjectId 变化自动刷新
watch(
  () => projectsStore.currentProjectId,
  async (newId, oldId) => {
    if (newId !== oldId && oldId !== undefined) {
      await fetchWorkflows();
    }
  },
);
</script>
```

---

## 六、验证和测试

### 6.1 迁移前数据快照

```bash
# 备份数据库
pg_dump -h localhost -U n8n -d n8n_db > backup_before_migration.sql

# 导出统计数据
psql -U n8n -d n8n_db -c "
  SELECT
    COUNT(DISTINCT workflowId) as total_workflows,
    COUNT(*) as total_shared_records
  FROM shared_workflow;
" > migration_stats.txt
```

### 6.2 迁移后验证

```sql
-- 验证 1：所有工作流都有 projectId
SELECT COUNT(*) FROM workflow_entity WHERE projectId IS NULL;
-- 期望：0

-- 验证 2：所有凭证都有 projectId
SELECT COUNT(*) FROM credentials_entity WHERE projectId IS NULL;
-- 期望：0

-- 验证 3：shared_workflow 只包含同一工作区的记录
SELECT COUNT(*)
FROM shared_workflow sw
JOIN workflow_entity w ON sw.workflowId = w.id
WHERE sw.projectId != w.projectId;
-- 期望：0

-- 验证 4：统计迁移创建的副本数量
SELECT COUNT(*) FROM workflow_entity WHERE name LIKE '%(从共享转换)';
```

---

## 七、回滚计划

### 紧急回滚步骤

```bash
# 1. 停止应用服务
pm2 stop n8n

# 2. 恢复数据库备份
psql -U n8n -d n8n_db < backup_before_migration.sql

# 3. 回滚代码到迁移前的 commit
git revert <migration-commit-hash>

# 4. 重新构建
pnpm build

# 5. 重启服务
pm2 start n8n
```

---

## 八、时间估算

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| **准备阶段** | 数据分析 + 迁移脚本编写 | 2-3 天 |
| **数据库改造** | 实体修改 + 迁移执行 | 1 天 |
| **业务逻辑调整** | Service/Controller 改造 | 2-3 天 |
| **前端调整** | Store/View 改造 | 1-2 天 |
| **测试验证** | 单元测试 + 集成测试 | 2-3 天 |
| **文档更新** | API 文档 + 用户通知 | 1 天 |
| **总计** |  | **9-13 天** |

---

## 九、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 数据迁移失败 | 高 | ✅ 完整备份 + 分步迁移 + 验证脚本 |
| 副本过多占用存储 | 中 | ✅ 迁移后提示用户清理不需要的副本 |
| API 兼容性破坏 | 高 | ✅ 保留 deprecated API + 版本化 |
| 用户感知混乱 | 中 | ✅ 发布公告 + 详细文档 + 平滑过渡期 |

---

## 十、后续应用市场功能

**改造完成后，即可开始应用市场开发**：

1. ✅ 工作区独占模式已就绪
2. ✅ 数据隔离已完成
3. ✅ 复制机制已准备
4. 🚀 可以开始实现：
   - MarketplaceApp 实体
   - 发布/复制/引用 API
   - 应用市场 UI

---

## 附录 A：完整的迁移命令

```bash
# 1. 生成迁移文件
pnpm typeorm migration:generate \
  -d packages/cli/src/databases/config.ts \
  packages/cli/src/databases/migrations/MigrateToExclusiveProjectModel

# 2. 运行迁移（开发环境测试）
pnpm typeorm migration:run -d packages/cli/src/databases/config.ts

# 3. 验证迁移
pnpm typeorm migration:show -d packages/cli/src/databases/config.ts

# 4. 如需回滚
pnpm typeorm migration:revert -d packages/cli/src/databases/config.ts
```

---

## 总结

**方案 A - 激进重构** 将 n8n 的资源归属模型从"共享引用"彻底改为"独占归属"，完全对齐 Coze 的多租户架构。虽然改动较大，但带来了：

✅ **清晰的数据边界**：每个资源明确归属一个工作区
✅ **完全的数据隔离**：工作区之间互不影响
✅ **简化的业务逻辑**：`WHERE projectId = currentProjectId`
✅ **为应用市场铺路**：复制和模板机制已准备就绪

建议采用**分步实施**策略，先在开发环境完整测试，再逐步推广到生产环境。
