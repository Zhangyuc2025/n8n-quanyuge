# nodes-langchain 包节点汉化清单

## 📊 总体统计

- **总节点数**: 50 个 .node.ts 文件
- **已完成**: AI Agent 相关节点（6个）
- **待汉化**: 44 个节点

## ✅ 已完成节点

### Agents（6个）
- [x] Agent.node.ts
- [x] AgentTool.node.ts
- [x] V1/AgentV1.node.ts
- [x] V2/AgentV2.node.ts
- [x] V2/AgentToolV2.node.ts
- [x] V3/AgentV3.node.ts

## 📋 待汉化节点（44个）

### 1. Chains（6个节点）
- [ ] ChainLLM/ChainLlm.node.ts
- [ ] ChainRetrievalQA/ChainRetrievalQa.node.ts
- [ ] ChainSummarization/ChainSummarization.node.ts
- [ ] ChainSummarization/V1/ChainSummarizationV1.node.ts
- [ ] ChainSummarization/V2/ChainSummarizationV2.node.ts
- [ ] InformationExtractor/InformationExtractor.node.ts
- [ ] SentimentAnalysis/SentimentAnalysis.node.ts
- [ ] TextClassifier/TextClassifier.node.ts

**注**: ChainSummarization 是版本化节点，实际为 3 个主节点

### 2. Document Loaders（3个节点）
- [ ] DocumentBinaryInputLoader/DocumentBinaryInputLoader.node.ts
- [ ] DocumentDefaultDataLoader/DocumentDefaultDataLoader.node.ts
- [ ] DocumentJSONInputLoader/DocumentJsonInputLoader.node.ts

### 3. Memory（3个节点）
- [ ] MemoryBufferWindow/MemoryBufferWindow.node.ts
- [ ] MemoryChatRetriever/MemoryChatRetriever.node.ts
- [ ] MemoryManager/MemoryManager.node.ts

### 4. Output Parser（3个节点）
- [ ] OutputParserAutofixing/OutputParserAutofixing.node.ts
- [ ] OutputParserItemList/OutputParserItemList.node.ts
- [ ] OutputParserStructured/OutputParserStructured.node.ts

### 5. Retrievers（4个节点）
- [ ] RetrieverContextualCompression/RetrieverContextualCompression.node.ts
- [ ] RetrieverMultiQuery/RetrieverMultiQuery.node.ts
- [ ] RetrieverVectorStore/RetrieverVectorStore.node.ts
- [ ] RetrieverWorkflow/RetrieverWorkflow.node.ts

### 6. Text Splitters（3个节点）
- [ ] TextSplitterCharacterTextSplitter/TextSplitterCharacterTextSplitter.node.ts
- [ ] TextSplitterRecursiveCharacterTextSplitter/TextSplitterRecursiveCharacterTextSplitter.node.ts
- [ ] TextSplitterTokenSplitter/TextSplitterTokenSplitter.node.ts

### 7. Tools（7个主节点，9个文件）
- [ ] ToolCalculator/ToolCalculator.node.ts
- [ ] ToolCode/ToolCode.node.ts
- [ ] ToolHttpRequest/ToolHttpRequest.node.ts
- [ ] ToolThink/ToolThink.node.ts
- [ ] ToolVectorStore/ToolVectorStore.node.ts
- [ ] ToolWikipedia/ToolWikipedia.node.ts
- [ ] ToolWorkflow/ToolWorkflow.node.ts
- [ ] ToolWorkflow/v1/ToolWorkflowV1.node.ts
- [ ] ToolWorkflow/v2/ToolWorkflowV2.node.ts

**注**: ToolWorkflow 是版本化节点

### 8. Trigger（2个主节点，3个文件）
- [ ] ChatTrigger/Chat.node.ts
- [ ] ChatTrigger/ChatTrigger.node.ts
- [ ] ManualChatTrigger/ManualChatTrigger.node.ts

### 9. Vector Store（3个节点）
- [ ] VectorStoreInMemory/VectorStoreInMemory.node.ts
- [ ] VectorStoreInMemoryInsert/VectorStoreInMemoryInsert.node.ts
- [ ] VectorStoreInMemoryLoad/VectorStoreInMemoryLoad.node.ts

### 10. 单独节点（5个节点）
- [ ] code/Code.node.ts
- [ ] Guardrails/Guardrails.node.ts
- [ ] llms/LmChatPlatform/LmChatPlatform.node.ts
- [ ] ModelSelector/ModelSelector.node.ts
- [ ] ToolExecutor/ToolExecutor.node.ts

## 🎯 汉化策略

### 批次划分

**批次 1: 核心链式节点（优先级高）**
- ChainLLM
- ChainRetrievalQA
- ChainSummarization（含版本）
- InformationExtractor
- SentimentAnalysis
- TextClassifier

**批次 2: 工具节点**
- ToolCalculator
- ToolCode
- ToolHttpRequest
- ToolThink
- ToolVectorStore
- ToolWikipedia
- ToolWorkflow（含版本）

**批次 3: 文档和检索节点**
- DocumentBinaryInputLoader
- DocumentDefaultDataLoader
- DocumentJSONInputLoader
- RetrieverContextualCompression
- RetrieverMultiQuery
- RetrieverVectorStore
- RetrieverWorkflow

**批次 4: 内存和向量存储**
- MemoryBufferWindow
- MemoryChatRetriever
- MemoryManager
- VectorStoreInMemory
- VectorStoreInMemoryInsert
- VectorStoreInMemoryLoad

**批次 5: 输出解析器和文本分割器**
- OutputParserAutofixing
- OutputParserItemList
- OutputParserStructured
- TextSplitterCharacterTextSplitter
- TextSplitterRecursiveCharacterTextSplitter
- TextSplitterTokenSplitter

**批次 6: 触发器和其他**
- ChatTrigger
- Chat
- ManualChatTrigger
- Code
- Guardrails
- LmChatPlatform
- ModelSelector
- ToolExecutor

## 📝 注意事项

### 需要检查的文件类型
1. 主节点文件 (*.node.ts)
2. 描述文件 (description.ts, descriptions.ts)
3. 工具函数 (utils.ts, helpers.ts)
4. 版本文件 (V1/, V2/, V3/, v1/, v2/)
5. 共享描述 (shared/descriptions.ts)

### 容易遗漏的内容
- [ ] 动态输入连接的 displayName（utils.ts）
- [ ] 占位符文本（placeholder: "Add Option"）
- [ ] 子目录中的 description.ts 文件
- [ ] 固定值集合的标签
- [ ] 错误消息字符串
- [ ] loadOptions 返回的选项名称

### 绝对不能修改
- ❌ icon 字段（会导致图标加载失败）
- ❌ name 字段（内部标识）
- ❌ value 字段（逻辑依赖）
- ❌ 类名和文件名

## 🔍 验证清单

完成每个节点汉化后：
- [ ] displayName 已中文化
- [ ] description 已中文化
- [ ] defaults.name 已中文化
- [ ] 所有 properties 的 displayName 已中文化
- [ ] 所有 placeholder 已中文化
- [ ] 所有 options[].name 已中文化
- [ ] tutorialLinks 已配置（如有硬编码链接）
- [ ] icon 字段未被修改
- [ ] 运行 pnpm typecheck 通过

---

**创建时间**: 2025-11-10
**最后更新**: 2025-11-10
