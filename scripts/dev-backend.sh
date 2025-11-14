#!/bin/bash
# 智能启动后端开发服务器

echo "🛑 停止旧的后端进程..."
# 停止所有相关进程
pkill -f "pnpm --filter=n8n dev" 2>/dev/null
pkill -f "packages/cli.*concurrently" 2>/dev/null
pkill -f "packages/cli.*nodemon" 2>/dev/null
pkill -f "packages/cli/bin/n8n" 2>/dev/null
sleep 2

echo "🚀 启动后端开发服务器..."
cd "$(dirname "$0")/.." || exit 1
pnpm --filter=n8n dev
