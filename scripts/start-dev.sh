#!/bin/bash
# 🚀 SASA 平台智能开发环境启动脚本
# 作者：老王
# 功能：自动关闭冲突服务，然后启动完整开发环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -ti:$port >/dev/null 2>&1; then
        return 0  # 端口被占用
    else
        return 1  # 端口空闲
    fi
}

# 关闭指定端口的进程
kill_port() {
    local port=$1
    local process_name=$2

    if check_port $port; then
        log_warning "检测到端口 $port 被占用，正在关闭相关进程..."

        # 获取占用端口的进程信息
        local pid=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$pid" ]; then
            local process_info=$(ps -p $pid -o pid,cmd --no-headers 2>/dev/null || echo "PID: $pid")
            log_warning "发现进程: $process_info"

            # 尝试优雅关闭
            kill $pid 2>/dev/null || true
            sleep 2

            # 如果还在运行，强制关闭
            if check_port $port; then
                log_warning "优雅关闭���败，强制终止进程..."
                kill -9 $pid 2>/dev/null || true
                sleep 1
            fi

            if ! check_port $port; then
                log_success "✅ 端口 $port 已释放 ($process_name)"
            else
                log_error "❌ 端口 $port 释放失败"
                return 1
            fi
        fi
    else
        log_success "✅ 端口 $port 空闲 ($process_name)"
    fi
}

# 关闭所有 n8n 相关开发进程
kill_n8n_processes() {
    log_info "正在检查和关闭 n8n 开发进程..."

    # 关闭前端服务器 (8080)
    kill_port 8080 "前端开发服务器"

    # 关闭后端服务器 (5678)
    kill_port 5678 "后端API服务器"

    # 关闭所有 n8n 相关进程
    local n8n_processes=$(ps aux | grep -E "(pnpm.*dev|turbo.*dev|nodemon|node.*n8n)" | grep -v grep | awk '{print $2}')

    if [ -n "$n8n_processes" ]; then
        log_warning "发现 ${#n8n_processes} 个 n8n 相关进程，正在关闭..."
        echo "$n8n_processes" | xargs kill -9 2>/dev/null || true
        sleep 2
        log_success "✅ 所有 n8n 开发进程已关闭"
    else
        log_success "✅ 没有发现冲突的 n8n 进程"
    fi
}

# 检查环境
check_environment() {
    log_info "检查开发环境..."

    # 检查当前目录
    if [ ! -f "package.json" ]; then
        log_error "请在 n8n 根目录运行此脚本"
        exit 1
    fi

    # 检查 pnpm
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm 未安装，请先安装 pnpm"
        exit 1
    fi

    # 检查 .env 文件
    if [ -f ".env" ]; then
        log_success "✅ 找到 .env 配置文件"

        # 检查关键配置
        if grep -q "N8N_SELF_HOSTED_ENTERPRISE=true" .env; then
            log_success "✅ SASA 平台满血模式已启用"
        else
            log_warning "⚠️  建议在 .env 中设置 N8N_SELF_HOSTED_ENTERPRISE=true"
        fi

        if grep -q "N8N_ENCRYPTION_KEY=" .env; then
            log_success "✅ 加密密钥已配置"
        else
            log_warning "⚠️  建议在 .env 中设置 N8N_ENCRYPTION_KEY"
        fi
    else
        log_warning "⚠️  未找到 .env 文件，将使用默认配置"
    fi
}

# 启动开发服务器
start_dev_server() {
    log_info "启动 SASA 平台开发环境..."
    log_info "前端地址: http://localhost:8080"
    log_info "后端地址: http://localhost:5678"
    log_info "按 Ctrl+C 停止服务器"

    # 启动开发服务器
    pnpm dev
}

# 清理函数
cleanup() {
    log_info "正在停止开发服务器..."
    kill_n8n_processes
    log_success "清理完成"
}

# 设置信号处理
trap cleanup EXIT INT TERM

# 主函数
main() {
    echo "🚀 SASA 平台智能开发环境启动器"
    echo "=================================="

    check_environment
    kill_n8n_processes
    start_dev_server
}

# 运行主函数
main "$@"