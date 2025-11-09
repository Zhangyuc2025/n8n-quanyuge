#!/bin/bash

# 手动移动langchain节点到备份目录
# 基于 langchain-nodes-classification.md 的分类清单

set -e

BACKUP_DIR="packages/@n8n/nodes-langchain-backup"
NODES_DIR="packages/@n8n/nodes-langchain/nodes"
CREDS_DIR="packages/@n8n/nodes-langchain/credentials"

echo "=== Langchain 节点手动备份工具 ==="
echo ""

# 创建备份目录
mkdir -p "$BACKUP_DIR/nodes/llms"
mkdir -p "$BACKUP_DIR/nodes/embeddings"
mkdir -p "$BACKUP_DIR/nodes/vector_store"
mkdir -p "$BACKUP_DIR/nodes/memory"
mkdir -p "$BACKUP_DIR/nodes/tools"
mkdir -p "$BACKUP_DIR/nodes/vendors"
mkdir -p "$BACKUP_DIR/nodes/mcp"
mkdir -p "$BACKUP_DIR/nodes/rerankers"
mkdir -p "$BACKUP_DIR/nodes/document_loaders"
mkdir -p "$BACKUP_DIR/nodes/agents"
mkdir -p "$BACKUP_DIR/credentials"

moved_count=0

# === LLM 模型节点 (移动19个，保留1个) ===
echo "🔄 移动 LLM 模型节点..."
llm_nodes=(
    "LMChatAnthropic"
    "LmChatAwsBedrock"
    "LmChatAzureOpenAi"
    "LmChatCohere"
    "LmChatDeepSeek"
    "LmChatGoogleGemini"
    "LmChatGoogleVertex"
    "LmChatGroq"
    "LMChatLemonade"
    "LmChatMistralCloud"
    "LMChatOllama"
    "LMChatOpenAi"
    "LmChatOpenRouter"
    "LmChatVercelAiGateway"
    "LmChatXAiGrok"
    "LMCohere"
    "LMLemonade"
    "LMOllama"
    "LMOpenAi"
    "LMOpenHuggingFaceInference"
)

for node in "${llm_nodes[@]}"; do
    if [ -d "$NODES_DIR/llms/$node" ]; then
        echo "  ✅ 移动 llms/$node"
        mv "$NODES_DIR/llms/$node" "$BACKUP_DIR/nodes/llms/"
        moved_count=$((moved_count + 1))
    fi
done

# === Embeddings 嵌入模型 (全部移动) ===
echo "🔄 移动 Embeddings 节点..."
embedding_nodes=(
    "EmbeddingsAwsBedrock"
    "EmbeddingsAzureOpenAi"
    "EmbeddingsCohere"
    "EmbeddingsGoogleGemini"
    "EmbeddingsGoogleVertex"
    "EmbeddingsHuggingFaceInference"
    "EmbeddingsLemonade"
    "EmbeddingsMistralCloud"
    "EmbeddingsOllama"
    "EmbeddingsOpenAI"
)

for node in "${embedding_nodes[@]}"; do
    if [ -d "$NODES_DIR/embeddings/$node" ]; then
        echo "  ✅ 移动 embeddings/$node"
        mv "$NODES_DIR/embeddings/$node" "$BACKUP_DIR/nodes/embeddings/"
        moved_count=$((moved_count + 1))
    fi
done

# === Vector Store 向量数据库 (移动15个) ===
echo "🔄 移动 Vector Store 节点..."
vector_nodes=(
    "VectorStoreMilvus"
    "VectorStoreMongoDBAtlas"
    "VectorStorePGVector"
    "VectorStorePinecone"
    "VectorStorePineconeInsert"
    "VectorStorePineconeLoad"
    "VectorStoreQdrant"
    "VectorStoreRedis"
    "VectorStoreSupabase"
    "VectorStoreSupabaseInsert"
    "VectorStoreSupabaseLoad"
    "VectorStoreWeaviate"
    "VectorStoreZep"
    "VectorStoreZepInsert"
    "VectorStoreZepLoad"
)

for node in "${vector_nodes[@]}"; do
    if [ -d "$NODES_DIR/vector_store/$node" ]; then
        echo "  ✅ 移动 vector_store/$node"
        mv "$NODES_DIR/vector_store/$node" "$BACKUP_DIR/nodes/vector_store/"
        moved_count=$((moved_count + 1))
    fi
done

# === Memory 记忆存储 (移动6个) ===
echo "🔄 移动 Memory 节点..."
memory_nodes=(
    "MemoryMongoDbChat"
    "MemoryMotorhead"
    "MemoryPostgresChat"
    "MemoryRedisChat"
    "MemoryXata"
    "MemoryZep"
)

for node in "${memory_nodes[@]}"; do
    if [ -d "$NODES_DIR/memory/$node" ]; then
        echo "  ✅ 移动 memory/$node"
        mv "$NODES_DIR/memory/$node" "$BACKUP_DIR/nodes/memory/"
        moved_count=$((moved_count + 1))
    fi
done

# === Tools 工具 (移动3个) ===
echo "🔄 移动 Tools 节点..."
tool_nodes=(
    "ToolSearXng"
    "ToolSerpApi"
    "ToolWolframAlpha"
)

for node in "${tool_nodes[@]}"; do
    if [ -d "$NODES_DIR/tools/$node" ]; then
        echo "  ✅ 移动 tools/$node"
        mv "$NODES_DIR/tools/$node" "$BACKUP_DIR/nodes/tools/"
        moved_count=$((moved_count + 1))
    fi
done

# === Vendors 供应商 (全部移动) ===
echo "🔄 移动 Vendors 节点..."
vendor_nodes=(
    "Anthropic"
    "GoogleGemini"
    "Ollama"
    "OpenAi"
)

for node in "${vendor_nodes[@]}"; do
    if [ -d "$NODES_DIR/vendors/$node" ]; then
        echo "  ✅ 移动 vendors/$node"
        mv "$NODES_DIR/vendors/$node" "$BACKUP_DIR/nodes/vendors/"
        moved_count=$((moved_count + 1))
    fi
done

# === MCP (全部移动) ===
echo "🔄 移动 MCP 节点..."
mcp_nodes=(
    "McpClientTool"
    "McpTrigger"
)

for node in "${mcp_nodes[@]}"; do
    if [ -d "$NODES_DIR/mcp/$node" ]; then
        echo "  ✅ 移动 mcp/$node"
        mv "$NODES_DIR/mcp/$node" "$BACKUP_DIR/nodes/mcp/"
        moved_count=$((moved_count + 1))
    fi
done

# === Rerankers (全部移动) ===
echo "🔄 移动 Rerankers 节点..."
if [ -d "$NODES_DIR/rerankers/RerankerCohere" ]; then
    echo "  ✅ 移动 rerankers/RerankerCohere"
    mv "$NODES_DIR/rerankers/RerankerCohere" "$BACKUP_DIR/nodes/rerankers/"
    moved_count=$((moved_count + 1))
fi

# === Document Loaders (移动1个) ===
echo "🔄 移动 Document Loaders 节点..."
if [ -d "$NODES_DIR/document_loaders/DocumentGithubLoader" ]; then
    echo "  ✅ 移动 document_loaders/DocumentGithubLoader"
    mv "$NODES_DIR/document_loaders/DocumentGithubLoader" "$BACKUP_DIR/nodes/document_loaders/"
    moved_count=$((moved_count + 1))
fi

# === Agents (移动OpenAiAssistant) ===
echo "🔄 移动 Agents 节点..."
if [ -d "$NODES_DIR/agents/OpenAiAssistant" ]; then
    echo "  ✅ 移动 agents/OpenAiAssistant"
    mv "$NODES_DIR/agents/OpenAiAssistant" "$BACKUP_DIR/nodes/agents/"
    moved_count=$((moved_count + 1))
fi

# === 移动所有凭证文件 ===
echo "🔄 移动凭证文件..."
if [ -d "$CREDS_DIR" ]; then
    mv $CREDS_DIR/*.credentials.ts "$BACKUP_DIR/credentials/" 2>/dev/null || true
fi

cred_count=$(find "$BACKUP_DIR/credentials" -name "*.credentials.ts" 2>/dev/null | wc -l)

echo ""
echo "✅ 移动完成！"
echo ""
echo "📊 统计："
echo "  移动的节点: $moved_count"
echo "  移动的凭证: $cred_count"
echo ""

# 生成报告
cat > "$BACKUP_DIR/BACKUP_REPORT.md" << EOF
# Langchain 节点备份报告

**生成时间：** $(date '+%Y-%m-%d %H:%M:%S')

## 统计汇总

| 项目 | 数量 |
|------|------|
| 移动的节点 | $moved_count |
| 移动的凭证文件 | $cred_count |

## 保留的核心节点

$(find $NODES_DIR -type d -mindepth 2 -maxdepth 2 2>/dev/null | sed "s|$NODES_DIR/||" | sort | sed 's/^/- /')

EOF

echo "📄 详细报告: $BACKUP_DIR/BACKUP_REPORT.md"
