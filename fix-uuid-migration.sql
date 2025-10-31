-- 删除现有的表（使用了错误的 uuid 类型）
-- 执行此脚本前请确认数据库中没有重要数据

-- 1. 删除外键约束
ALTER TABLE IF EXISTS team_member DROP CONSTRAINT IF EXISTS "FK_team_member_team";
ALTER TABLE IF EXISTS team_member DROP CONSTRAINT IF EXISTS "FK_team_member_user";
ALTER TABLE IF EXISTS project DROP CONSTRAINT IF EXISTS "FK_project_team";
ALTER TABLE IF EXISTS team DROP CONSTRAINT IF EXISTS "FK_team_owner";

-- 2. 删除表
DROP TABLE IF EXISTS team_member CASCADE;
DROP TABLE IF EXISTS team CASCADE;

-- 3. 删除 project 表中添加的列
ALTER TABLE project DROP COLUMN IF EXISTS "teamId";
ALTER TABLE project DROP COLUMN IF EXISTS "isDefault";

-- 4. 删除 user 表中添加的列
ALTER TABLE "user" DROP COLUMN IF EXISTS "tier";
ALTER TABLE "user" DROP COLUMN IF EXISTS "maxTeams";
ALTER TABLE "user" DROP COLUMN IF EXISTS "maxStorageMb";
ALTER TABLE "user" DROP COLUMN IF EXISTS "tenantStatus";

-- 完成！现在可以重新运行 n8n，迁移会使用正确的 varchar 类型重新创建表
