# nodes-langchain 包文档加载器和检索器节点汉化总结

## 汉化完成时间
2025-11-10

## 已汉化节点列表

### 文档加载器（Document Loaders）- 3个节点

#### 1. DocumentBinaryInputLoader（二进制输入加载器）
**文件路径**: `/home/zhang/n8n-quanyuge/packages/@n8n/nodes-langchain/nodes/document_loaders/DocumentBinaryInputLoader/DocumentBinaryInputLoader.node.ts`

**汉化内容**:
- `displayName`: "Binary Input Loader" → "二进制输入加载器"
- `description`: "Use binary data from a previous step in the workflow" → "使用工作流中前一步骤的二进制数据"
- `defaults.name`: "Binary Input Loader" → "二进制输入加载器"
- 输入连接: "Text Splitter" → "文本分割器"
- 输出名称: "Document" → "文档"
- 所有参数的 displayName 和 description
- 所有选项的 name 和 description
- placeholder: "Add Option" → "添加选项"

**注意**: 此节点已标记为 `hidden: true`（已弃用），功能已合并到 DocumentDefaultDataLoader

#### 2. DocumentDefaultDataLoader（默认数据加载器）
**文件路径**: `/home/zhang/n8n-quanyuge/packages/@n8n/nodes-langchain/nodes/document_loaders/DocumentDefaultDataLoader/DocumentDefaultDataLoader.node.ts`

**汉化内容**:
- `displayName`: "Default Data Loader" → "默认数据加载器"
- `description`: "Load data from previous step in the workflow" → "从工作流中前一步骤加载数据"
- `defaults.name`: "Default Data Loader" → "默认数据加载器"
- 动态输入连接（在 getInputs 函数中）: "Text Splitter" → "文本分割器"
- 输出名称: "Document" → "文档"
- 提示信息中的链接保持不变
- 所有参数的 displayName、description 和 placeholder
- 所有选项的 name、description 和 placeholder

**特别注意**:
- 该节点有版本控制（version: [1, 1.1]）
- 包含动态输入配置（使用 getInputs 函数）
- 支持 JSON 和二进制两种数据类型

#### 3. DocumentJsonInputLoader（JSON 输入加载器）
**文件路径**: `/home/zhang/n8n-quanyuge/packages/@n8n/nodes-langchain/nodes/document_loaders/DocumentJSONInputLoader/DocumentJsonInputLoader.node.ts`

**汉化内容**:
- `displayName`: "JSON Input Loader" → "JSON 输入加载器"
- `description`: "Use JSON data from a previous step in the workflow" → "使用工作流中前一步骤的 JSON 数据"
- `defaults.name`: "JSON Input Loader" → "JSON 输入加载器"
- 输入连接: "Text Splitter" → "文本分割器"
- 输入名称: "Text Splitter" → "文本分割器"
- 输出名称: "Document" → "文档"
- 所有参数的 displayName、description 和 placeholder

**注意**: 此节点已标记为 `hidden: true`（已弃用），功能已合并到 DocumentDefaultDataLoader

### 检索器（Retrievers）- 4个节点

#### 1. RetrieverContextualCompression（上下文压缩检索器）
**文件路径**: `/home/zhang/n8n-quanyuge/packages/@n8n/nodes-langchain/nodes/retrievers/RetrieverContextualCompression/RetrieverContextualCompression.node.ts`

**汉化内容**:
- `displayName`: "Contextual Compression Retriever" → "上下文压缩检索器"
- `description`: "Enhances document similarity search by contextual compression." → "通过上下文压缩增强文档相似性搜索"
- `defaults.name`: "Contextual Compression Retriever" → "上下文压缩检索器"
- 输入连接:
  - "Model" → "模型"
  - "Retriever" → "检索器"
- 输出名称: "Retriever" → "检索器"

#### 2. RetrieverMultiQuery（多查询检索器）
**文件路径**: `/home/zhang/n8n-quanyuge/packages/@n8n/nodes-langchain/nodes/retrievers/RetrieverMultiQuery/RetrieverMultiQuery.node.ts`

**汉化内容**:
- `displayName`: "MultiQuery Retriever" → "多查询检索器"
- `description`: "Automates prompt tuning, generates diverse queries and expands document pool for enhanced retrieval." → "自动化提示调优，生成多样化的查询并扩展文档池以增强检索效果"
- `defaults.name`: "MultiQuery Retriever" → "多查询检索器"
- 输入连接:
  - "Model" → "模型"
  - "Retriever" → "检索器"
- 输出名称: "Retriever" → "检索器"
- 所有参数的 displayName、description 和 placeholder

#### 3. RetrieverVectorStore（向量存储检索器）
**文件路径**: `/home/zhang/n8n-quanyuge/packages/@n8n/nodes-langchain/nodes/retrievers/RetrieverVectorStore/RetrieverVectorStore.node.ts`

**状态**: ✅ 已在之前完成汉化
- 该节点已完全汉化，无需修改

#### 4. RetrieverWorkflow（工作流检索器）
**文件路径**: `/home/zhang/n8n-quanyuge/packages/@n8n/nodes-langchain/nodes/retrievers/RetrieverWorkflow/RetrieverWorkflow.node.ts`

**状态**: ✅ 已在之前完成汉化
- 该节点已完全汉化，无需修改

## 修改的文件清单

### 新汉化的文件（5个）:
1. `/home/zhang/n8n-quanyuge/packages/@n8n/nodes-langchain/nodes/document_loaders/DocumentBinaryInputLoader/DocumentBinaryInputLoader.node.ts`
2. `/home/zhang/n8n-quanyuge/packages/@n8n/nodes-langchain/nodes/document_loaders/DocumentDefaultDataLoader/DocumentDefaultDataLoader.node.ts`
3. `/home/zhang/n8n-quanyuge/packages/@n8n/nodes-langchain/nodes/document_loaders/DocumentJSONInputLoader/DocumentJsonInputLoader.node.ts`
4. `/home/zhang/n8n-quanyuge/packages/@n8n/nodes-langchain/nodes/retrievers/RetrieverContextualCompression/RetrieverContextualCompression.node.ts`
5. `/home/zhang/n8n-quanyuge/packages/@n8n/nodes-langchain/nodes/retrievers/RetrieverMultiQuery/RetrieverMultiQuery.node.ts`

### 修复的文件（1个）:
6. `/home/zhang/n8n-quanyuge/packages/@n8n/nodes-langchain/nodes/memory/MemoryChatRetriever/MemoryChatRetriever.node.ts`
   - 修复了嵌套引号导致的构建错误

## 汉化质量检查

### ✅ 已完成项
- [x] 所有 `displayName` 字段已中文化
- [x] 所有 `description` 字段已中文化
- [x] 所有 `defaults.name` 字段已中文化
- [x] 所有输入/输出连接的 `displayName` 已中文化
- [x] 所有参数的 `placeholder` 已中文化
- [x] 所有选项的 `name` 和 `description` 已中文化
- [x] 动态输入连接的 `displayName` 已中文化（getInputs 函数）

### ✅ 未修改项（符合规范）
- [x] `name` 字段保持英文
- [x] `value` 字段保持不变
- [x] `icon` 字段完全保持原样
- [x] 类名和文件名未修改
- [x] API 端点路径未改变

### ✅ 构建验证
- [x] 包构建成功（pnpm build）
- [x] 类型检查通过（预存在的类型错误与本次汉化无关）

## 技术细节

### 处理的特殊情况

1. **版本化节点**:
   - DocumentDefaultDataLoader 支持多个版本（1 和 1.1）
   - 确保所有版本的参数都正确汉化

2. **动态输入配置**:
   - DocumentDefaultDataLoader 使用动态输入函数 `getInputs()`
   - 在函数内正确汉化了 displayName

3. **弃用节点**:
   - DocumentBinaryInputLoader 和 DocumentJsonInputLoader 已标记为 hidden
   - 仍然进行了完整汉化以保持一致性

4. **修复引号错误**:
   - 修复了 MemoryChatRetriever 中的嵌套引号问题
   - 从双引号外层改为单引号外层

### 翻译术语表

| 英文术语 | 中文翻译 |
|---------|---------|
| Binary Input Loader | 二进制输入加载器 |
| Default Data Loader | 默认数据加载器 |
| JSON Input Loader | JSON 输入加载器 |
| Contextual Compression Retriever | 上下文压缩检索器 |
| MultiQuery Retriever | 多查询检索器 |
| Vector Store Retriever | 向量存储检索器 |
| Workflow Retriever | 工作流检索器 |
| Text Splitter | 文本分割器 |
| Document | 文档 |
| Retriever | 检索器 |
| Model | 模型 |
| Add Option | 添加选项 |
| Metadata | 元数据 |
| Query Count | 查询数量 |

## 后续建议

1. **测试建议**:
   - 在开发环境中测试所有汉化的节点
   - 验证节点在工作流画布上的显示效果
   - 确认参数面板中的中文显示正确

2. **文档更新**:
   - 更新节点使用文档以反映中文界面
   - 创建中文用户指南

3. **一致性检查**:
   - 与其他已汉化的 langchain 节点保持术语一致
   - 与 nodes-base 包的翻译保持一致

## 总结

本次汉化工作完成了 nodes-langchain 包中的所有文档加载器和检索器节点（共7个节点，其中5个新汉化，2个已完成）。所有修改都遵循了 n8n 节点中文化指南，保持了代码结构的完整性和功能的正确性。构建和基本类型检查均已通过。
