# n8n 文档索引

## 📚 文档导航

本项目包含了 n8n 核心架构的完整文档。根据你的需求选择相应的文档：

---

## 🎯 快速开始

### 我刚接触 n8n，应该从哪里开始？

**推荐阅读顺序：**

1. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** ⭐
   - **最短时间内了解核心概念**
   - 项目结构一览
   - 关键文件快速查找
   - 常用 API 速查表
   - 代码片段示例
   - 阅读时间：15-20 分钟

2. **[ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md)** 📊
   - **可视化理解系统架构**
   - 14 个 Mermaid 图表
   - 从高层架构到执行细节
   - 阅读时间：20-30 分钟

3. **[N8N_CORE_ARCHITECTURE.md](./N8N_CORE_ARCHITECTURE.md)** 🏗️
   - **深入理解核心架构**
   - 完整的概念解释
   - 关键文件详细说明
   - 代码示例和实现细节
   - 数据流演示
   - 阅读时间：45-60 分钟

4. **[N8N_DETAILED_IMPLEMENTATION.md](./N8N_DETAILED_IMPLEMENTATION.md)** 🔧
   - **学习具体实现和调试**
   - 前端编辑器流程
   - 节点参数系统详解
   - 表达式引擎原理
   - HTTP 节点实现
   - 调试技巧和工具
   - 阅读时间：60-90 分钟

5. **[EXPLORATION_SUMMARY.md](./EXPLORATION_SUMMARY.md)** 📋
   - **查看探索成果总结**
   - 核心发现亮点
   - 技术栈总结
   - 常见问题解答
   - 下一步建议
   - 阅读时间：20-30 分钟

---

## 📖 文档详细说明

### 1. QUICK_REFERENCE.md
**最实用的速查表**

适合：
- 需要快速查找 API 的开发者
- 想要代码片段的开发者
- 需要快速命令参考的开发者

包含内容：
- 项目结构一览
- 前端快速导航（路由、Store、Composable）
- 后端快速导航（服务、API、依赖注入）
- 节点开发速查（参数、条件显示、凭证）
- 凭证开发速查（实现、测试）
- 表达式速查（语法、常用函数）
- 调试命令
- 常用代码片段
- 文件修改检查清单

---

### 2. ARCHITECTURE_DIAGRAMS.md
**可视化系统架构**

包含 14 个 Mermaid 图表：

1. **高层系统架构** - 浏览器、网络、服务器、扩展的整体布局
2. **前端组件架构** - Vue 组件层级和 Pinia Store
3. **编辑流程** - 用户编辑工作流的交互序列
4. **执行流程** - 工作流执行的完整路径
5. **Canvas 数据映射** - 数据如何从 n8n 映射到 Vue Flow
6. **节点参数流程** - 参数定义、条件显示、动态加载
7. **凭证系统流程** - 凭证定义、存储、使用、执行时注入
8. **表达式计算流程** - 表达式解析、上下文构建、沙箱执行
9. **后端服务架构** - 各个后端服务和它们的关系
10. **节点执行上下文** - IExecuteFunctions 接口提供的 API
11. **数据类型关系** - IWorkflow、INode、IConnection 等类型的关系
12. **事件流 (WebSocket)** - 执行事件的推送和处理
13. **项目构建流程** - 从源代码到生产的编译过程
14. **完整执行时序图** - 端到端的详细执行时序

适合：
- 需要理解系统整体结构的开发者
- 需要快速查看数据流向的开发者
- 想要演示给团队的开发者

---

### 3. N8N_CORE_ARCHITECTURE.md
**完整的架构指南**

最全面的技术文档，包含：

#### 工作流编辑器 (文档长度：25%)
- 编辑器主要组件
- Canvas 层级结构
- 节点创建面板
- Pinia 状态管理（Workflows Store、NodeTypes Store）

#### 节点系统 (文档长度：30%)
- 节点定义结构 (300+ 内置节点)
- INodeType 接口详解
- 节点参数配置 (INodeProperties)
- AI 节点实现（OpenAI、Anthropic、LangChain）
- 节点版本控制
- 节点加载和注册机制

#### 工作流执行 (文档长度：20%)
- 执行流程图
- WorkflowRunner 实现
- WorkflowExecutionService
- 执行引擎核心文件结构
- IExecuteFunctions 接口
- 执行上下文
- 工作流数据结构

#### 凭证系统 (文档长度：20%)
- 凭证定义 (ICredentialType)
- API Key 实现示例
- IAM 凭证实现示例
- 后端凭证管理 (CredentialsService、CredentialsTester)
- 前端凭证管理 (Store、UI 组件)
- OAuth 2.0 流程

#### 关键文件映射 (文档长度：5%)
- 前端完整文件结构
- 后端完整文件结构
- 核心包文件结构
- 文件位置速查表

#### 数据流示例
- 执行一个工作流的完整数据流
- 前端准备 → 后端处理 → 执行引擎 → WebSocket 推送 → UI 更新

---

### 4. N8N_DETAILED_IMPLEMENTATION.md
**具体实现和开发指南**

包含高级主题的深入讲解：

#### 前端编辑器详细流程 (40%)
- 编辑器初始化和加载
- Canvas 组件实现
- 节点选择和参数编辑
- NDV（Node Details View）面板
- 参数组件实现

#### 节点参数系统 (20%)
- 参数类型详解（string、number、options、collection 等）
- 条件显示示例
- 集合参数使用

#### 表达式引擎 (20%)
- 表达式语法详解
- 表达式上下文对象
- 前端和后端的实现差异

#### HTTP 请求节点 (10%)
- HTTP 节点参数配置
- HTTP 节点执行逻辑
- 带凭证的请求实现

#### 调试技巧 (10%)
- 前端调试（DevTools、Pinia）
- 后端调试（日志、Node 调试器）
- 工作流执行分析

---

### 5. EXPLORATION_SUMMARY.md
**探索成果总结**

包含：
- 已生成文档概述
- 核心发现亮点
- 关键文件位置速查表
- 技术栈总结
- 开发指南（添加新节点、新凭证）
- 高级主题（表达式、版本化、执行上下文）
- 常见问题解答
- 下一步建议

适合用作：
- 快速了解整个探索的成果
- 推荐给团队成员的起点
- 查找特定技术主题的入口

---

## 🔍 按主题查找文档

### 我想学习...

| 主题 | 推荐文档 | 章节 |
|------|--------|------|
| **前端编辑器工作原理** | ARCHITECTURE_DIAGRAMS | #2, #3 |
| 前端编辑器工作原理 | N8N_CORE_ARCHITECTURE | 工作流编辑器 |
| 前端编辑器工作原理 | N8N_DETAILED_IMPLEMENTATION | 前端编辑器详细流程 |
| **节点系统** | N8N_CORE_ARCHITECTURE | 节点系统 |
| 节点系统 | ARCHITECTURE_DIAGRAMS | #5, #6 |
| 节点系统 | QUICK_REFERENCE | 节点开发速查 |
| **工作流执行** | ARCHITECTURE_DIAGRAMS | #4, #12, #14 |
| 工作流执行 | N8N_CORE_ARCHITECTURE | 工作流执行 |
| **凭证系统** | N8N_CORE_ARCHITECTURE | 凭证系统 |
| 凭证系统 | ARCHITECTURE_DIAGRAMS | #7 |
| 凭证系统 | QUICK_REFERENCE | 凭证开发速查 |
| **表达式引擎** | N8N_DETAILED_IMPLEMENTATION | 表达式引擎 |
| 表达式引擎 | ARCHITECTURE_DIAGRAMS | #8 |
| 表达式引擎 | QUICK_REFERENCE | 表达式速查 |
| **调试和开发** | N8N_DETAILED_IMPLEMENTATION | 调试技巧 |
| 调试和开发 | QUICK_REFERENCE | 调试命令、代码片段 |
| **开发新节点** | QUICK_REFERENCE | 节点开发速查 |
| 开发新节点 | EXPLORATION_SUMMARY | 开发指南 |
| **添加凭证** | QUICK_REFERENCE | 凭证开发速查 |
| 添加凭证 | EXPLORATION_SUMMARY | 开发指南 |
| **项目结构** | QUICK_REFERENCE | 项目结构一览 |
| 项目结构 | EXPLORATION_SUMMARY | 关键文件映射 |
| **API 参考** | QUICK_REFERENCE | API 端点、Services |
| **代码示例** | QUICK_REFERENCE | 常用代码片段 |
| 代码示例 | N8N_DETAILED_IMPLEMENTATION | 各个章节 |

---

## 🎓 学习路径建议

### 路径 1：快速上手 (2 小时)
1. QUICK_REFERENCE (15 分钟) - 了解项目结构和关键概念
2. ARCHITECTURE_DIAGRAMS (20 分钟) - 查看系统架构图
3. QUICK_REFERENCE 中的代码示例 (25 分钟) - 学习常用代码
4. 实际操作：修改一个简单的参数或试试一个API调用 (60 分钟)

### 路径 2：深入理解 (4 小时)
1. QUICK_REFERENCE (15 分钟)
2. ARCHITECTURE_DIAGRAMS (30 分钟)
3. N8N_CORE_ARCHITECTURE 的编辑器章节 (60 分钟)
4. N8N_DETAILED_IMPLEMENTATION 的前端章节 (60 分钟)
5. 实际操作：修改 Canvas 组件或 Store (45 分钟)

### 路径 3：全面掌握 (8 小时)
1. 按推荐顺序阅读所有文档 (4 小时)
2. QUICK_REFERENCE 中的所有代码片段 (1 小时)
3. 阅读项目源代码，对照文档学习 (2 小时)
4. 实际开发：创建一个新节点和新凭证 (1 小时)

### 路径 4：开发者专用 (6 小时)
1. QUICK_REFERENCE (15 分钟)
2. QUICK_REFERENCE 中的节点和凭证开发部分 (45 分钟)
3. N8N_CORE_ARCHITECTURE 中的节点和凭证章节 (90 分钟)
4. QUICK_REFERENCE 中的调试部分 (30 分钟)
5. 实际开发：创建 3 个测试节点 (3 小时)

---

## 📁 文件位置快速参考

### 生成的文档
```
/home/zhang/n8n-quanyuge/
├── QUICK_REFERENCE.md                    # 速查表
├── ARCHITECTURE_DIAGRAMS.md              # 架构图解
├── N8N_CORE_ARCHITECTURE.md              # 核心架构（主文档）
├── N8N_DETAILED_IMPLEMENTATION.md        # 详细实现指南
├── EXPLORATION_SUMMARY.md                # 探索总结
└── DOCUMENTATION_INDEX.md                # 本文件
```

### 项目源代码
```
packages/
├── frontend/editor-ui/src/               # 前端代码
│   ├── app/stores/                       # Pinia Stores
│   ├── app/views/NodeView.vue            # 编辑器主视图
│   └── features/workflows/canvas/        # Canvas 实现
│
├── cli/src/                              # 后端代码
│   ├── workflows/                        # 工作流服务
│   ├── credentials/                      # 凭证服务
│   └── workflow-runner.ts                # 执行器
│
├── core/src/execution-engine/            # 执行引擎
├── workflow/src/                         # 工作流基础
└── nodes-base/                           # 内置节点和凭证
```

---

## 💡 使用技巧

### 1. 快速查找答案
- 使用 `Ctrl+F` 在文档中搜索关键词
- 查看相应章节的目录
- 使用本索引的"按主题查找"表格

### 2. 结合多份文档
- 先看 ARCHITECTURE_DIAGRAMS 理解概念
- 然后看 N8N_CORE_ARCHITECTURE 学习细节
- 最后用 QUICK_REFERENCE 快速参考

### 3. 查看代码示例
- QUICK_REFERENCE 有简洁的代码片段
- N8N_DETAILED_IMPLEMENTATION 有详细的代码讲解
- EXPLORATION_SUMMARY 有完整的实现示例

### 4. 理解数据流
- 看 ARCHITECTURE_DIAGRAMS #3（编辑流程）和 #4（执行流程）
- 看 ARCHITECTURE_DIAGRAMS #14（完整时序图）
- 读 N8N_CORE_ARCHITECTURE 中的"数据流示例"

### 5. 调试问题
- 查看 N8N_DETAILED_IMPLEMENTATION 的"调试技巧"
- 使用 QUICK_REFERENCE 中的调试命令
- 查看 EXPLORATION_SUMMARY 的"常见问题解答"

---

## 🚀 后续行动

### 立即开始
1. 阅读 QUICK_REFERENCE（15 分钟）
2. 查看 ARCHITECTURE_DIAGRAMS（20 分钟）
3. 选择你感兴趣的主题，深入阅读相应章节

### 加深理解
1. 克隆项目，跟随文档阅读源代码
2. 在浏览器 DevTools 中调试，验证文档的解释
3. 尝试修改一个简单的组件或服务

### 实践发展
1. 创建一个新的节点
2. 实现一个新的凭证类型
3. 扩展 Canvas 功能
4. 编写自动化测试

### 参与贡献
1. 如发现文档错误，请更正
2. 添加新的图表或代码示例
3. 贡献新的节点或凭证实现
4. 分享你的经验和最佳实践

---

## ✅ 检查清单

使用本索引前，确保：

- [ ] 已克隆 n8n 项目到本地
- [ ] 已安装所有依赖 (`pnpm install`)
- [ ] 已了解基本的 Vue 3 和 TypeScript
- [ ] 已安装推荐的 IDE 插件（Volar、Prettier 等）
- [ ] 已配置正确的开发环境

---

## 📞 获取帮助

当遇到问题时：

1. **搜索本文档** - 使用索引表查找相关主题
2. **查看代码示例** - QUICK_REFERENCE 和 N8N_DETAILED_IMPLEMENTATION 有代码片段
3. **查看源代码** - 对照文档阅读实际实现
4. **参考项目文档** - 查看项目根目录的 README 和其他官方文档
5. **查看提交历史** - 用 `git log` 查看相关代码的修改历史

---

## 📝 文档版本信息

- **生成日期**: 2025-11-08
- **n8n 版本**: 基于当前项目版本
- **覆盖范围**: 核心架构、编辑器、执行引擎、凭证系统
- **代码示例**: 基于当前源代码实现

---

## 🎉 总结

这套文档提供了：
- ✅ 14 个架构图表
- ✅ 4 份详细指南
- ✅ 1 份速查表
- ✅ 300+ 代码示例
- ✅ 完整的索引和导航

**现在你已经拥有了理解 n8n 核心架构所需的一切。祝你开发愉快！**

---

**需要帮助？回到 [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) 查看常用命令和代码片段。**
