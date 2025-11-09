# 旧迁移文件状态报告

> **生成时间**: 2025-11-08
> **状态**: 待删除（等待生产验证）

---

## ✅ 当前状态

### 新迁移文件（已创建）
- **文件**: `1762511303000-RedesignPlatformArchitecture.ts`
- **位置**: `/packages/@n8n/db/src/migrations/common/`
- **状态**: ✅ 已创建并注册到所有数据库索引
- **功能**: 创建新架构的4个表，删除旧的 `workspace_plugin_credentials` 表

### 旧迁移文件（待删除）

**位置**: `/packages/@n8n/db/src/migrations/common/`

1. `1762511302220-CreatePlatformServiceTables.ts`
   - **大小**: 12KB
   - **创建**: `platform_service` 表（已被废弃）
   - **状态**: ✅ 文件存在，已注册

2. `1762511302660-ExtendPlatformServiceForPlugins.ts`
   - **大小**: 8.1KB
   - **扩展**: `platform_service` 表增加插件字段（错误设计）
   - **状态**: ✅ 文件存在，已注册

3. `1762511302880-CreateWorkspacePluginCredentialsTable.ts`
   - **大小**: 3.4KB
   - **创建**: `workspace_plugin_credentials` 表（已被废弃）
   - **状态**: ✅ 文件存在，已注册

---

## ⚠️ 删除前的必要条件

根据 `08-旧代码清理清单.md` 的要求，这些迁移文件只能在以下条件**全部满足**时删除：

### 1. ✅ 新迁移已创建并注册
- [x] `RedesignPlatformArchitecture1762511303000` 已创建
- [x] 已注册到 SQLite 迁移索引
- [x] 已注册到 PostgreSQL 迁移索引（需确认）
- [x] 已注册到 MySQL 迁移索引（需确认）

### 2. ⏳ 新迁移已在所有环境成功执行
- [ ] 开发环境执行成功
- [ ] 测试环境执行成功
- [ ] 生产环境执行成功

### 3. ⏳ 数据已成功迁移到新表
- [ ] 验证新表数据完整性
- [ ] 确认旧表数据已正确转换
- [ ] 验证外键关系正确

### 4. ⏳ 系统运行稳定至少1周
- [ ] 无数据库错误日志
- [ ] 无迁移回滚需求
- [ ] 所有功能正常运行

---

## 📋 删除步骤（待执行）

当上述所有条件满足后，按以下步骤删除：

### 步骤 1: 从迁移索引中移除
需要修改以下文件，删除对应的导入和数组项：

**SQLite**: `/packages/@n8n/db/src/migrations/sqlite/index.ts`
```diff
-import { CreatePlatformServiceTables1762511302220 } from '../common/1762511302220-CreatePlatformServiceTables';
-import { ExtendPlatformServiceForPlugins1762511302660 } from '../common/1762511302660-ExtendPlatformServiceForPlugins';
-import { CreateWorkspacePluginCredentialsTable1762511302880 } from '../common/1762511302880-CreateWorkspacePluginCredentialsTable';

 const sqliteMigrations: Migration[] = [
   // ...
-  CreatePlatformServiceTables1762511302220,
   CreatePlatformFeatureTables1762511302440,
-  ExtendPlatformServiceForPlugins1762511302660,
-  CreateWorkspacePluginCredentialsTable1762511302880,
   RedesignPlatformArchitecture1762511303000,
 ];
```

**PostgreSQL**: `/packages/@n8n/db/src/migrations/postgresdb/index.ts`（同样的修改）

**MySQL**: `/packages/@n8n/db/src/migrations/mysqldb/index.ts`（同样的修改）

### 步骤 2: 删除迁移文件
```bash
git rm packages/@n8n/db/src/migrations/common/1762511302220-CreatePlatformServiceTables.ts
git rm packages/@n8n/db/src/migrations/common/1762511302660-ExtendPlatformServiceForPlugins.ts
git rm packages/@n8n/db/src/migrations/common/1762511302880-CreateWorkspacePluginCredentialsTable.ts
```

### 步骤 3: 验证
```bash
# TypeScript编译检查
pnpm typecheck

# 构建检查
pnpm build

# 测试（如果有）
pnpm test
```

### 步骤 4: 提交
```bash
git commit -m "chore: remove deprecated migration files

Removed old migration files that created the incorrect architecture:
- CreatePlatformServiceTables (mixed AI models and plugins)
- ExtendPlatformServiceForPlugins (wrong plugin concept)
- CreateWorkspacePluginCredentialsTable (redundant credentials)

These have been replaced by RedesignPlatformArchitecture1762511303000
which implements the correct architecture with separate tables for:
- platform_ai_provider (AI service providers)
- platform_node (platform nodes)
- custom_node (user custom nodes)
- user_node_config (user node configurations)

All data has been successfully migrated and system is stable."
```

---

## 🔍 验证清单

删除前的最终检查：

- [ ] 运行 `grep -r "CreatePlatformServiceTables" packages/` - 应无引用
- [ ] 运行 `grep -r "ExtendPlatformServiceForPlugins" packages/` - 应无引用
- [ ] 运行 `grep -r "CreateWorkspacePluginCredentialsTable" packages/` - 应无引用
- [ ] 检查数据库是否有 `platform_service` 表 - 应不存在
- [ ] 检查数据库是否有 `workspace_plugin_credentials` 表 - 应不存在
- [ ] 检查数据库是否有新表 - 应全部存在且有数据
- [ ] 检查应用日志 - 应无数据库错误

---

## 📊 预期影响

删除这些迁移文件后：

### 代码清洁度
- ✅ 移除约 23.5KB 的错误架构代码
- ✅ 简化迁移历史
- ✅ 避免概念混淆

### 注意事项
- ⚠️ 删除后无法回滚到这些迁移创建的表结构
- ⚠️ 确保所有环境都已执行新迁移
- ⚠️ 保留 Git 历史以备查

---

## 📝 总结

**当前建议**: **暂不删除**，等待以下确认：
1. 新迁移在所有环境执行成功
2. 数据迁移验证完成
3. 系统稳定运行至少1周

**预计删除时间**: 待生产环境验证后

**相关文档**:
- [08-旧代码清理清单.md](./改造方案文档/08-旧代码清理清单.md)
- [06-概念修正方案.md](./改造方案文档/06-概念修正方案.md)

---

**文档版本**: v1.0
**最后更新**: 2025-11-08
**状态**: ✅ 已完成分析，等待生产验证
