#!/bin/bash
# 智能启动管理面板开发服务器

echo "🛑 停止旧的管理面板进程..."
pkill -f "@n8n/admin-panel.*vite" 2>/dev/null
sleep 1

echo "🚀 启动管理面板开发服务器..."
cd "$(dirname "$0")/.." || exit 1
pnpm --filter=@n8n/admin-panel dev
