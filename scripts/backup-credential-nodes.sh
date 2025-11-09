#!/bin/bash

# 移动需要凭证的节点到备份目录
# 策略：遍历所有凭证文件，找到引用该凭证的节点并移动
# 用法: bash scripts/backup-credential-nodes.sh

set -e

BACKUP_DIR="packages/nodes-base-backup"
NODES_DIR="packages/nodes-base/nodes"
CREDS_DIR="packages/nodes-base/credentials"

echo "=== n8n 节点备份工具 ==="
echo ""

# 1. 创建备份目录
mkdir -p "$BACKUP_DIR/nodes"
mkdir -p "$BACKUP_DIR/credentials"

# 2. 初始化统计
moved_nodes=0
moved_creds=0
declare -A moved_node_dirs  # 用于记录已移动的节点目录

# 3. 初始化报告
echo "" > "$BACKUP_DIR/BACKUP_REPORT.md"
echo "# 节点备份报告" >> "$BACKUP_DIR/BACKUP_REPORT.md"
echo "" >> "$BACKUP_DIR/BACKUP_REPORT.md"
echo "**生成时间：** $(date '+%Y-%m-%d %H:%M:%S')" >> "$BACKUP_DIR/BACKUP_REPORT.md"
echo "" >> "$BACKUP_DIR/BACKUP_REPORT.md"
echo "## 凭证与节点对应关系" >> "$BACKUP_DIR/BACKUP_REPORT.md"
echo "" >> "$BACKUP_DIR/BACKUP_REPORT.md"

# 4. 遍历所有凭证文件
echo "🔄 开始分析凭证文件..."
for cred_file in $(find $CREDS_DIR -name "*.credentials.ts" | sort); do
  cred_basename=$(basename "$cred_file")
  cred_name=$(basename "$cred_file" .credentials.ts)

  # 将驼峰转为小写用于搜索（githubApi, githubOAuth2Api等）
  # 凭证名称通常是：GitHubApi, SlackOAuth2Api等

  echo "  🔍 分析凭证: $cred_name"

  # 在所有节点文件中搜索该凭证名称（忽略大小写）
  # 注意：凭证在代码中通常是小写开头，如 'githubApi', 'githubOAuth2Api'
  cred_name_lower=$(echo ${cred_name:0:1} | tr '[:upper:]' '[:lower:]')${cred_name:1}

  # 搜索引用该凭证的节点文件
  found_nodes=$(grep -r -l -i "name:.*['\"]${cred_name_lower}['\"]" $NODES_DIR 2>/dev/null || true)

  if [ -z "$found_nodes" ]; then
    echo "    ⚠️  未找到使用此凭证的节点"
    echo "- ⚠️ **$cred_name** → (未找到使用的节点)" >> "$BACKUP_DIR/BACKUP_REPORT.md"
  else
    # 提取节点目录
    for node_file in $found_nodes; do
      node_dir=$(dirname "$node_file")
      # 找到顶层节点目录（在nodes/下的直接子目录）
      while [ "$(dirname "$node_dir")" != "$NODES_DIR" ] && [ "$node_dir" != "$NODES_DIR" ]; do
        node_dir=$(dirname "$node_dir")
      done

      node_name=$(basename "$node_dir")

      # 检查是否已经移动过
      if [ -z "${moved_node_dirs[$node_name]}" ]; then
        if [ -d "$node_dir" ]; then
          echo "    → 移动节点: $node_name"
          mv "$node_dir" "$BACKUP_DIR/nodes/" 2>/dev/null || true
          moved_nodes=$((moved_nodes + 1))
          moved_node_dirs[$node_name]=1
          echo "- ✅ **$cred_name** → $node_name" >> "$BACKUP_DIR/BACKUP_REPORT.md"
        fi
      fi
    done
  fi

  # 移动凭证文件
  mv "$cred_file" "$BACKUP_DIR/credentials/" 2>/dev/null || true
  moved_creds=$((moved_creds + 1))
done

# 5. 统计保留的节点
kept_nodes=$(find $NODES_DIR -maxdepth 1 -type d -not -path $NODES_DIR 2>/dev/null | wc -l)

# 6. 输出统计
echo ""
echo "✅ 移动完成！"
echo ""
echo "📊 最终统计："
echo "  移动的凭证文件: $moved_creds"
echo "  移动的节点: $moved_nodes"
echo "  保留的节点: $kept_nodes"
echo ""
echo "📄 详细报告: $BACKUP_DIR/BACKUP_REPORT.md"

# 7. 写入统计和保留节点列表到报告
cat >> "$BACKUP_DIR/BACKUP_REPORT.md" << EOF

## 统计汇总

| 项目 | 数量 |
|------|------|
| 移动的凭证文件 | $moved_creds |
| 移动的节点 | $moved_nodes |
| 保留的核心节点 | $kept_nodes |

## 保留的核心节点列表

$(find $NODES_DIR -maxdepth 1 -type d -not -path $NODES_DIR 2>/dev/null | while read dir; do
  echo "- $(basename $dir)"
done | sort)
EOF

echo ""
echo "✨ 备份完成！核心节点已保留，需要凭证的节点已移动到备份目录。"
