#!/bin/bash

# 注释代码清理脚本
# 用途: 分析和辅助清理凭证系统删除后遗留的注释代码
# 警告: 本脚本仅用于分析，不会自动删除代码，需要手动确认
# 作者: 开发团队
# 日期: 2025-11-10

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="/home/zhang/n8n-quanyuge"
cd "$PROJECT_ROOT"

# 日志文件
LOG_FILE="改造方案文档/注释代码清理日志-$(date +%Y%m%d-%H%M%S).txt"

# 函数: 打印带颜色的消息
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# 函数: 记录到日志
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 函数: 统计信息
show_statistics() {
    print_header "当前改动统计"

    echo "总体改动:"
    git diff HEAD --numstat | awk '{added+=$1; deleted+=$2} END {
        print "  新增行数: " added
        print "  删除行数: " deleted
        print "  净变更: " (added - deleted)
    }'

    echo ""
    echo "注释统计:"
    echo "  新增注释行: $(git diff HEAD | grep -E '^[+]' | grep -E '^\+\s*(//|/\*)' | wc -l)"
    echo "  删除注释行: $(git diff HEAD | grep -E '^[-]' | grep -E '^\-\s*(//|/\*)' | wc -l)"

    echo ""
    echo "特殊注释统计:"
    echo "  'Credential system has been removed' 标记: $(git diff HEAD | grep -c "Credential system has been removed" || echo 0)"
    echo "  '@deprecated' 标记: $(git diff HEAD | grep -c "@deprecated" || echo 0)"

    echo ""
}

# 函数: 查找注释掉的 import 语句
find_commented_imports() {
    print_header "查找注释掉的 import 语句"

    local count=0
    local output_file="改造方案文档/commented-imports-$(date +%Y%m%d).txt"

    echo "扫描文件..."

    # TypeScript 文件
    echo "=== TypeScript 文件中的注释 import ===" > "$output_file"
    git diff HEAD -- "*.ts" | grep -n "^+.*// import" | tee -a "$output_file" || true

    # Vue 文件
    echo "" >> "$output_file"
    echo "=== Vue 文件中的注释 import ===" >> "$output_file"
    git diff HEAD -- "*.vue" | grep -n "^+.*// import" | tee -a "$output_file" || true

    count=$(cat "$output_file" | grep "^[0-9]" | wc -l)

    if [ $count -gt 0 ]; then
        print_warning "发现 $count 处注释掉的 import 语句"
        print_info "详细列表已保存到: $output_file"
    else
        print_success "未发现注释掉的 import 语句"
    fi

    echo ""
}

# 函数: 查找大块注释代码
find_commented_blocks() {
    print_header "查找大块注释代码（连续5行以上）"

    local output_file="改造方案文档/commented-blocks-$(date +%Y%m%d).txt"

    echo "分析注释代码块..."

    git diff HEAD | awk '
    BEGIN {
        block_count = 0
        total_lines = 0
    }
    /^diff --git/ {
        if (count >= 5) {
            print "\n文件: " file
            print "  位置: 第 " start_line " 行"
            print "  行数: " count " 行"
            print "  内容预览:"
            for (i in preview) print "    " preview[i]
            print ""
            block_count++
            total_lines += count
        }
        file = $0
        count = 0
        delete preview
    }
    /^\+[[:space:]]*\/\// {
        if (count == 0) start_line = NR
        count++
        if (count <= 3) preview[count] = $0
    }
    /^[^+]|^\+[^[:space:]\/]/ {
        if (count >= 5) {
            print "\n文件: " file
            print "  位置: 第 " start_line " 行"
            print "  行数: " count " 行"
            print "  内容预览:"
            for (i in preview) print "    " preview[i]
            print ""
            block_count++
            total_lines += count
        }
        count = 0
        delete preview
    }
    END {
        if (count >= 5) {
            print "\n文件: " file
            print "  位置: 第 " start_line " 行"
            print "  行数: " count " 行"
            block_count++
            total_lines += count
        }
        print "\n=== 统计 ==="
        print "发现大块注释代码: " block_count " 处"
        print "总计注释行数: " total_lines " 行"
    }
    ' > "$output_file"

    cat "$output_file"
    print_info "详细报告已保存到: $output_file"

    echo ""
}

# 函数: 查找 Vue HTML 注释
find_html_comments() {
    print_header "查找 Vue 文件中的 HTML 注释"

    local output_file="改造方案文档/html-comments-$(date +%Y%m%d).txt"

    echo "扫描 Vue 文件..."

    git diff HEAD -- "*.vue" | grep -n "^+.*<!--.*Credential" > "$output_file" || true

    local count=$(cat "$output_file" | wc -l)

    if [ $count -gt 0 ]; then
        print_warning "发现 $count 处 HTML 注释"
        cat "$output_file"
        print_info "详细列表已保存到: $output_file"
    else
        print_success "未发现需要清理的 HTML 注释"
    fi

    echo ""
}

# 函数: 分析关键文件
analyze_key_files() {
    print_header "分析关键文件的注释情况"

    local key_files=(
        "packages/workflow/src/interfaces.ts"
        "packages/core/src/execution-engine/node-execution-context/utils/request-helper-functions.ts"
        "packages/cli/src/workflows/workflow.service.ee.ts"
        "packages/frontend/editor-ui/src/features/core/folders/components/MoveToFolderModal.vue"
        "packages/frontend/editor-ui/src/app/composables/useNodeHelpers.ts"
    )

    echo "文件                                                                 | 新增 | 删除 | 注释"
    echo "----------------------------------------------------------------------|------|------|------"

    for file in "${key_files[@]}"; do
        if git diff HEAD --name-only | grep -q "$file"; then
            local stats=$(git diff HEAD -- "$file" | awk '
                /^\+/ {added++; if (/^\+[[:space:]]*(\/\/|\/\*)/) comments++}
                /^\-/ {deleted++}
                END {print added " " deleted " " comments}
            ')
            printf "%-70s| %4s | %4s | %4s\n" "$file" $stats
        fi
    done

    echo ""
}

# 函数: 验证代码质量
verify_code_quality() {
    print_header "验证代码质量"

    echo "运行类型检查..."
    if pnpm typecheck 2>&1 | tee 改造方案文档/typecheck-result.log; then
        print_success "类型检查通过"
    else
        print_error "类型检查失败，请查看: 改造方案文档/typecheck-result.log"
        return 1
    fi

    echo ""
    echo "运行 Lint 检查..."
    if pnpm lint 2>&1 | tee 改造方案文档/lint-result.log; then
        print_success "Lint 检查通过"
    else
        print_error "Lint 检查失败，请查看: 改造方案文档/lint-result.log"
        return 1
    fi

    echo ""
}

# 函数: 生成清理建议
generate_cleanup_suggestions() {
    print_header "生成清理建议"

    local suggestions_file="改造方案文档/清理建议-$(date +%Y%m%d).md"

    cat > "$suggestions_file" << 'EOF'
# 注释代码清理建议

## 根据分析结果生成的清理建议

### 优先级 1: 立即清理（低风险）

#### 1.1 注释掉的 import 语句
- **位置**: 见 commented-imports-*.txt
- **操作**: 可以安全删除
- **命令**:
```bash
# 手动检查每个文件后删除
```

#### 1.2 Vue HTML 注释
- **位置**: 见 html-comments-*.txt
- **操作**: 删除 HTML 注释块
- **注意**: 确保不删除说明性注释

### 优先级 2: 验证后清理（中风险）

#### 2.1 大块注释代码
- **位置**: 见 commented-blocks-*.txt
- **操作**: 逐个检查后删除
- **验证**: 删除后运行 `pnpm typecheck && pnpm lint`

### 优先级 3: 保留（不清理）

#### 3.1 说明性注释
- **标记**: "Credential system has been removed"
- **操作**: 保留这些注释
- **原因**: 说明删除原因

#### 3.2 @deprecated 标记
- **操作**: 保留这些标记
- **原因**: API 废弃文档

## 清理步骤

1. 创建清理分支
```bash
git checkout -b cleanup-commented-code-$(date +%Y%m%d)
```

2. 阶段 1: 清理 import（预计 0.5 小时）
   - 检查 commented-imports-*.txt
   - 手动删除每个注释的 import
   - 运行验证: `pnpm typecheck`

3. 阶段 2: 清理 HTML 注释（预计 1 小时）
   - 检查 html-comments-*.txt
   - 删除 HTML 注释块
   - 测试 UI 正常显示

4. 阶段 3: 清理大块注释代码（预计 3 小时）
   - 检查 commented-blocks-*.txt
   - 逐个验证后删除
   - 每次删除后运行: `pnpm typecheck && pnpm lint`

5. 最终验证
```bash
pnpm build
pnpm test:affected
```

## 安全检查清单

- [ ] 已创建备份分支
- [ ] 已保留所有说明性注释
- [ ] 已保留所有 @deprecated 标记
- [ ] 类型检查通过
- [ ] Lint 检查通过
- [ ] 构建成功
- [ ] 测试通过

---
**生成时间**: $(date '+%Y-%m-%d %H:%M:%S')
EOF

    print_success "清理建议已生成: $suggestions_file"
    echo ""
}

# 函数: 显示帮助
show_help() {
    cat << EOF
注释代码清理脚本

用法: $0 [选项]

选项:
  -a, --all           执行所有分析（默认）
  -s, --statistics    显示统计信息
  -i, --imports       查找注释的 import
  -b, --blocks        查找大块注释代码
  -h, --html          查找 HTML 注释
  -k, --key-files     分析关键文件
  -v, --verify        验证代码质量
  -g, --generate      生成清理建议
  --help              显示此帮助信息

示例:
  $0                  # 执行所有分析
  $0 -i -b            # 只查找 import 和代码块
  $0 -v               # 只验证代码质量

注意:
  本脚本仅用于分析，不会自动修改代码
  所有结果保存在 改造方案文档/ 目录下
EOF
}

# 主函数
main() {
    print_header "注释代码清理分析工具"
    log "开始分析..."

    # 参数解析
    local run_all=true
    local run_stats=false
    local run_imports=false
    local run_blocks=false
    local run_html=false
    local run_key_files=false
    local run_verify=false
    local run_generate=false

    if [ $# -eq 0 ]; then
        run_all=true
    else
        run_all=false
        while [ $# -gt 0 ]; do
            case "$1" in
                -a|--all)
                    run_all=true
                    ;;
                -s|--statistics)
                    run_stats=true
                    ;;
                -i|--imports)
                    run_imports=true
                    ;;
                -b|--blocks)
                    run_blocks=true
                    ;;
                -h|--html)
                    run_html=true
                    ;;
                -k|--key-files)
                    run_key_files=true
                    ;;
                -v|--verify)
                    run_verify=true
                    ;;
                -g|--generate)
                    run_generate=true
                    ;;
                --help)
                    show_help
                    exit 0
                    ;;
                *)
                    print_error "未知选项: $1"
                    show_help
                    exit 1
                    ;;
            esac
            shift
        done
    fi

    # 执行分析
    if [ "$run_all" = true ] || [ "$run_stats" = true ]; then
        show_statistics
        log "统计信息已显示"
    fi

    if [ "$run_all" = true ] || [ "$run_imports" = true ]; then
        find_commented_imports
        log "已查找注释的 import"
    fi

    if [ "$run_all" = true ] || [ "$run_blocks" = true ]; then
        find_commented_blocks
        log "已查找大块注释代码"
    fi

    if [ "$run_all" = true ] || [ "$run_html" = true ]; then
        find_html_comments
        log "已查找 HTML 注释"
    fi

    if [ "$run_all" = true ] || [ "$run_key_files" = true ]; then
        analyze_key_files
        log "已分析关键文件"
    fi

    if [ "$run_all" = true ] || [ "$run_verify" = true ]; then
        if verify_code_quality; then
            log "代码质量验证通过"
        else
            log "代码质量验证失败"
            exit 1
        fi
    fi

    if [ "$run_all" = true ] || [ "$run_generate" = true ]; then
        generate_cleanup_suggestions
        log "已生成清理建议"
    fi

    print_success "分析完成！"
    print_info "日志文件: $LOG_FILE"
    print_info "查看清理策略: cat 改造方案文档/注释代码清理策略.md"

    log "分析完成"
}

# 运行主函数
main "$@"
