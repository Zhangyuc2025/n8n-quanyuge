# Langchain 节点分类清单

## 需要移动的节点（需要凭证的）

### llms/ - AI模型 (17个需要移动)
- [ ] llms/LMChatAnthropic
- [ ] llms/LmChatAwsBedrock
- [ ] llms/LmChatAzureOpenAi
- [ ] llms/LmChatCohere
- [ ] llms/LmChatDeepSeek
- [ ] llms/LmChatGoogleGemini
- [ ] llms/LmChatGoogleVertex
- [ ] llms/LmChatGroq
- [ ] llms/LMChatLemonade
- [ ] llms/LmChatMistralCloud
- [ ] llms/LMChatOllama (本地运行，但也算模型)
- [ ] llms/LMChatOpenAi
- [ ] llms/LmChatOpenRouter
- [ ] llms/LmChatVercelAiGateway
- [ ] llms/LmChatXAiGrok
- [ ] llms/LMCohere
- [ ] llms/LMLemonade
- [ ] llms/LMOllama
- [ ] llms/LMOpenAi
- [ ] llms/LMOpenHuggingFaceInference
- ✅ 保留 llms/LmChatPlatform (平台托管，自动计费)

### embeddings/ - 嵌入模型 (10个全部移动)
- [ ] embeddings/EmbeddingsAwsBedrock
- [ ] embeddings/EmbeddingsAzureOpenAi
- [ ] embeddings/EmbeddingsCohere
- [ ] embeddings/EmbeddingsGoogleGemini
- [ ] embeddings/EmbeddingsGoogleVertex
- [ ] embeddings/EmbeddingsHuggingFaceInference
- [ ] embeddings/EmbeddingsLemonade
- [ ] embeddings/EmbeddingsMistralCloud
- [ ] embeddings/EmbeddingsOllama
- [ ] embeddings/EmbeddingsOpenAI

### vector_store/ - 向量数据库 (需要移动14个，保留1个)
- [ ] vector_store/VectorStoreMilvus
- [ ] vector_store/VectorStoreMongoDBAtlas
- [ ] vector_store/VectorStorePGVector
- [ ] vector_store/VectorStorePinecone
- [ ] vector_store/VectorStorePineconeInsert
- [ ] vector_store/VectorStorePineconeLoad
- [ ] vector_store/VectorStoreQdrant
- [ ] vector_store/VectorStoreRedis
- [ ] vector_store/VectorStoreSupabase
- [ ] vector_store/VectorStoreSupabaseInsert
- [ ] vector_store/VectorStoreSupabaseLoad
- [ ] vector_store/VectorStoreWeaviate
- [ ] vector_store/VectorStoreZep
- [ ] vector_store/VectorStoreZepInsert
- [ ] vector_store/VectorStoreZepLoad
- ✅ 保留 vector_store/VectorStoreInMemory (内存存储)
- ✅ 保留 vector_store/VectorStoreInMemoryInsert
- ✅ 保留 vector_store/VectorStoreInMemoryLoad

### memory/ - 记忆存储 (需要移动5个，保留3个)
- [ ] memory/MemoryMongoDbChat
- [ ] memory/MemoryMotorhead
- [ ] memory/MemoryPostgresChat
- [ ] memory/MemoryRedisChat
- [ ] memory/MemoryXata
- [ ] memory/MemoryZep
- ✅ 保留 memory/MemoryBufferWindow (内存缓冲)
- ✅ 保留 memory/MemoryChatRetriever (核心功能)
- ✅ 保留 memory/MemoryManager (核心功能)

### tools/ - 工具 (需要移动3个，保留8个)
- [ ] tools/ToolSearXng
- [ ] tools/ToolSerpApi
- [ ] tools/ToolWolframAlpha
- ✅ 保留 tools/ToolCalculator (计算器，核心)
- ✅ 保留 tools/ToolCode (代码执行，核心)
- ✅ 保留 tools/ToolHttpRequest (HTTP请求，核心)
- ✅ 保留 tools/ToolThink (思考工具，核心)
- ✅ 保留 tools/ToolVectorStore (向量存储工具，核心)
- ✅ 保留 tools/ToolWikipedia (维基百科，无需凭证)
- ✅ 保留 tools/ToolWorkflow (工作流工具，核心)

### vendors/ - 供应商 (4个全部移动)
- [ ] vendors/Anthropic
- [ ] vendors/GoogleGemini
- [ ] vendors/Ollama
- [ ] vendors/OpenAi

### mcp/ - MCP (2个全部移动)
- [ ] mcp/McpClientTool
- [ ] mcp/McpTrigger

### rerankers/ - 重排序 (1个全部移动)
- [ ] rerankers/RerankerCohere

### document_loaders/ - 文档加载器 (需要移动1个，保留3个)
- [ ] document_loaders/DocumentGithubLoader (需要GitHub凭证)
- ✅ 保留 document_loaders/DocumentBinaryInputLoader (核心)
- ✅ 保留 document_loaders/DocumentDefaultDataLoader (核心)
- ✅ 保留 document_loaders/DocumentJSONInputLoader (核心)

### agents/OpenAiAssistant/ - 需要移动
- [ ] agents/OpenAiAssistant

## 保留的核心节点（不需要凭证）

### agents/ - 代理 (保留Agent核心功能)
- ✅ agents/Agent (所有版本)

### chains/ - 链 (全部保留)
- ✅ chains/ChainLLM
- ✅ chains/ChainRetrievalQA
- ✅ chains/ChainSummarization
- ✅ chains/InformationExtractor
- ✅ chains/SentimentAnalysis
- ✅ chains/TextClassifier

### code/ - 代码 (保留)
- ✅ code/Code

### Guardrails/ - 护栏 (保留)
- ✅ Guardrails/Guardrails

### ModelSelector/ - 模型选择器 (保留)
- ✅ ModelSelector/ModelSelector

### output_parser/ - 输出解析器 (全部保留)
- ✅ output_parser/OutputParserAutofixing
- ✅ output_parser/OutputParserItemList
- ✅ output_parser/OutputParserStructured

### retrievers/ - 检索器 (全部保留)
- ✅ retrievers/RetrieverContextualCompression
- ✅ retrievers/RetrieverMultiQuery
- ✅ retrievers/RetrieverVectorStore
- ✅ retrievers/RetrieverWorkflow

### text_splitters/ - 文本分割器 (全部保留)
- ✅ text_splitters/TextSplitterCharacterTextSplitter
- ✅ text_splitters/TextSplitterRecursiveCharacterTextSplitter
- ✅ text_splitters/TextSplitterTokenSplitter

### ToolExecutor/ - 工具执行器 (保留)
- ✅ ToolExecutor/ToolExecutor

### trigger/ - 触发器 (全部保留)
- ✅ trigger/ChatTrigger
- ✅ trigger/ManualChatTrigger

---

## 统计

- **需要移动**: 约 58 个节点目录
- **保留**: 约 57 个节点目录
