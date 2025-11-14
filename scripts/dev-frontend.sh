#!/bin/bash
# 智能启动前端编辑器开发服务器

echo "🛑 停止旧的前端编辑器进程..."
pkill -f "n8n-editor-ui.*vite dev" 2>/dev/null
sleep 1

echo "🚀 启动前端编辑器开发服务器..."
cd "$(dirname "$0")/.." || exit 1
pnpm --filter=n8n-editor-ui dev
