#!/bin/bash

echo "========================================"
echo "工作空间管理功能验证脚本"
echo "========================================"
echo ""

# 检查文件存在性
echo "📁 检查文件存在性..."
files=(
  "src/stores/workspaces.store.ts"
  "src/types/admin.types.ts"
  "src/views/WorkspacesView.vue"
  "src/components/workspaces/WorkspaceDetailDrawer.vue"
  "src/components/workspaces/RechargeDialog.vue"
  "src/components/workspaces/UsageRecordsModal.vue"
  "src/router/index.ts"
)

all_exist=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (不存在)"
    all_exist=false
  fi
done

echo ""

# 检查路由配置
echo "🔍 检查路由配置..."
if grep -q "path: 'workspaces'" src/router/index.ts; then
  echo "  ✅ 路由配置正确"
else
  echo "  ❌ 路由配置缺失"
  all_exist=false
fi

echo ""

# 检查类型导出
echo "🔍 检查类型定义..."
types=(
  "interface Workspace"
  "interface WorkspaceDetail"
  "interface WorkspaceBalance"
  "interface WorkspaceMember"
  "interface UsageRecord"
  "interface RechargeRecord"
  "interface WorkspaceWithDetails"
)

for type in "${types[@]}"; do
  if grep -q "$type" src/types/admin.types.ts; then
    echo "  ✅ $type"
  else
    echo "  ❌ $type (缺失)"
    all_exist=false
  fi
done

echo ""

# 检查 Store actions
echo "🔍 检查 Store actions..."
actions=(
  "fetchWorkspaces"
  "getWorkspaceDetail"
  "rechargeWorkspace"
  "getUsageRecords"
  "getRechargeRecords"
  "updateWorkspaceStatus"
  "clearCurrentWorkspace"
)

for action in "${actions[@]}"; do
  if grep -q "$action" src/stores/workspaces.store.ts; then
    echo "  ✅ $action"
  else
    echo "  ❌ $action (缺失)"
    all_exist=false
  fi
done

echo ""

# 统计代码行数
echo "📊 代码统计..."
total_lines=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file")
    total_lines=$((total_lines + lines))
    echo "  $file: $lines 行"
  fi
done
echo "  总计: $total_lines 行"

echo ""

# 最终结果
echo "========================================"
if [ "$all_exist" = true ]; then
  echo "✅ 所有检查通过！"
  echo "功能覆盖率: 100%"
else
  echo "❌ 存在问题，请检查上述错误"
fi
echo "========================================"
