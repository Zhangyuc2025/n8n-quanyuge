# n8n 节点中文化指南

## 📋 概述

本指南基于 AI Agent 和 Code 节点的中文化经验总结，用于批量中文化 n8n 内置节点。

**已完成节点**:
- ✅ AI Agent (`packages/@n8n/nodes-langchain/nodes/agents/Agent/`)
- ✅ Code (`packages/nodes-base/nodes/Code/`)

**待处理节点**: 158个

---

## 🎯 中文化原则

### 1. 需要中文化的内容

| 字段 | 说明 | 示例 |
|------|------|------|
| `displayName` | 节点/参数显示名称 | "AI Agent" → "AI 智能体" |
| `description` | 节点/参数功能描述 | "Run custom code" → "运行自定义代码" |
| `defaults.name` | 默认节点实例名称 | "Code" → "代码" |
| `placeholder` | 输入提示文本 | "e.g. Hello" → "例如：你好" |
| `hint` | 提示信息 | 全部翻译为中文 |
| `options[].name` | 选项名称 | "Run Once" → "运行一次" |
| `options[].description` | 选项说明 | 全部翻译为中文 |
| `options[].action` | 操作描述 | "Code in JavaScript" → "使用 JavaScript 编写代码" |
| notice/callout 文本 | 提示框内容 | 全部翻译为中文 |

### 2. 不应修改的内容

| 字段 | 说明 | 原因 |
|------|------|------|
| `name` | 节点/参数内部标识 | 代码逻辑依赖 |
| `value` | 选项值 | 后端逻辑依赖 |
| `icon` | 节点图标 | **绝对不能修改**，会导致图标加载失败 |
| 类名 | TypeScript 类名 | 代码引用 |
| 文件名 | 文件路径 | 模块加载依赖 |
| API 端点 | 路由路径 | 前后端通信 |

**⚠️ 特别注意 - 图标字段**:

```typescript
export class YourNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: '你的节点',      // ✅ 中文化
		name: 'yourNode',            // ❌ 不能修改
		icon: 'fa:robot',            // ❌ 绝对不能修改！保持原样
		// 或
		icon: 'file:code.svg',       // ❌ 绝对不能修改！保持原样
		// 或动态图标表达式
		icon: `={{(${iconFunc})($parameter.lang)}}`,  // ❌ 不能修改
	};
}
```

**图标类型**:
- `fa:*` - FontAwesome 图标（如 `fa:robot`, `fa:code`）
- `file:*.svg` - SVG 文件（如 `file:python.svg`）
- 动态表达式 - 根据参数动态选择图标

**如果修改会导致**:
- ❌ 图标变成缩略图或加载失败图标
- ❌ 节点在画布上显示异常
- ❌ 前端加载错误

**🔧 图标加载失败问题排查**:

如果中文化后发现节点图标变成加载失败的缩略图，按以下步骤检查：

1. **确认icon字段未被修改**:
   ```typescript
   icon: 'file:aggregate.svg',  // ✅ 保持原样，未被修改
   ```

2. **检查SVG文件是否存在**:
   ```bash
   # 源文件
   ls packages/nodes-base/nodes/YourNode/youricon.svg

   # 构建后文件
   ls packages/nodes-base/dist/nodes/YourNode/youricon.svg
   ```

3. **重新构建项目**:
   ```bash
   # 确保静态文件被复制到dist目录
   cd packages/nodes-base
   pnpm build
   ```

4. **清理缓存并重启服务器**:
   ```bash
   # 清理构建缓存
   pnpm clean

   # 重新构建
   pnpm build

   # 重启开发服务器
   pnpm dev
   ```

5. **检查构建日志**:
   - 确保 `n8n-copy-static-files` 脚本执行成功
   - 检查是否有SVG文件复制失败的错误

**常见原因**:
- ✅ SVG文件名大小写不匹配（aggregate.svg vs Aggregate.svg）
- ✅ 构建时静态文件未被复制
- ✅ 开发服务器缓存旧的文件结构
- ✅ 浏览器缓存了旧的资源（需要硬刷新 Ctrl+Shift+R）

### ⚠️ 3. 容易遗漏的字段（重要！）

这些字段经常被遗漏，必须特别注意：

#### 3.1 动态输入连接的 displayName

在 `utils.ts` 或类似工具文件中定义的输入连接：

```typescript
// ❌ 容易遗漏 - 在 utils.ts 或 getInputs() 函数中
const specialInputs = [
	{
		type: 'ai_languageModel',
		displayName: 'Chat Model',        // ⚠️ 需要中文化 → "聊天模型"
	},
	{
		type: 'ai_languageModel',
		displayName: 'Fallback Model',    // ⚠️ 需要中文化 → "备用模型"
	},
	{
		type: 'ai_memory',
		displayName: 'Memory',             // ⚠️ 需要中文化 → "记忆"
	},
	{
		type: 'ai_tool',
		displayName: 'Tool',               // ⚠️ 需要中文化 → "工具"
	},
	{
		type: 'ai_outputParser',
		displayName: 'Output Parser',      // ⚠️ 需要中文化 → "输出解析器"
	},
];
```

**检查位置**:
- `utils.ts`
- `V1/utils.ts`, `V2/utils.ts`, `V3/utils.ts`（版本化节点）
- 任何包含 `getInputs()` 函数的文件

#### 3.2 占位符文本（Placeholder）

集合类型参数的占位符：

```typescript
{
	type: 'fixedCollection',
	placeholder: 'Add Option',          // ⚠️ 需要中文化 → "添加选项"
}
```

**常见占位符**:
- `"Add Option"` → `"添加选项"`
- `"Add Field"` → `"添加字段"`
- `"Add Parameter"` → `"添加参数"`
- `"Add Item"` → `"添加项目"`
- `"Add Value"` → `"添加值"`

**检查位置**:
- 所有 `description.ts` 文件
- 主节点文件中的 `properties` 数组
- `agents/*/description.ts`（对于 Agent 节点）

#### 3.3 子代理描述文件

很多节点将参数定义拆分到单独的描述文件：

```
YourNode/
├── YourNode.node.ts          # 主文件
├── descriptions/
│   ├── ParamA.description.ts  # ⚠️ 需要中文化
│   └── ParamB.description.ts  # ⚠️ 需要中文化
└── agents/                    # 对于 Agent 节点
    ├── TypeA/
    │   └── description.ts     # ⚠️ 需要中文化
    └── TypeB/
        └── description.ts     # ⚠️ 需要中文化
```

**必须检查**:
- `descriptions/` 目录下的所有文件
- `agents/*/description.ts`
- 任何被主节点 import 的描述文件

#### 3.4 固定值集合的标签

```typescript
{
	displayName: 'Options',
	name: 'options',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	options: [
		{
			name: 'values',
			displayName: 'Values',      // ⚠️ 需要中文化 → "值"
			values: [
				{
					displayName: 'Key',     // ⚠️ 需要中文化 → "键"
					name: 'key',
				},
				{
					displayName: 'Value',   // ⚠️ 需要中文化 → "值"
					name: 'value',
				},
			],
		},
	],
}
```

#### 3.5 错误消息和验证文本

```typescript
// 在节点执行代码中
throw new NodeOperationError(
	this.getNode(),
	'Please provide a valid input',  // ⚠️ 需要中文化 → "请提供有效的输入"
);

// 在参数验证中
{
	validateType: 'string',
	errorMessage: 'Value must be a string',  // ⚠️ 需要中文化
}
```

#### 3.6 动态加载选项的标签

```typescript
async loadOptions() {
	return [
		{
			name: 'Option 1',    // ⚠️ 需要中文化
			value: 'option1',
		},
	];
}
```

### 🔍 遗漏检查清单

中文化每个节点后，使用以下清单逐项检查：

#### ✅ 必须中文化的内容
- [ ] 主节点文件 `displayName` 和所有 `properties`
- [ ] `defaults.name` 字段
- [ ] **所有 `utils.ts` 文件中的 `displayName`**（容易遗漏！）
- [ ] **所有版本文件 `V1/`, `V2/`, `V3/` 的 utils.ts**
- [ ] **`descriptions/` 目录下的所有文件**
- [ ] **`agents/*/description.ts` 文件**（对于 Agent 节点）
- [ ] **所有 `placeholder` 字段**（特别是 "Add Option"）
- [ ] 所有 `options[].name` 和 `description`
- [ ] fixedCollection 的内层 `displayName`
- [ ] notice/callout/hint 文本
- [ ] 错误消息字符串
- [ ] loadOptions 返回的标签

#### ❌ 绝对不能修改的内容（防止破坏功能）
- [ ] `name` 字段保持英文
- [ ] `value` 字段保持不变
- [ ] **`icon` 字段完全保持原样**（防止图标加载失败）
- [ ] 类名和文件名未修改
- [ ] API 端点路径未改变

---

## 🔧 教学链接处理

### 方案：占位符 + 数据库管理

将教学链接提取到 `codex.resources.tutorialLinks`，使用占位符在前端动态替换。

### 实现步骤

#### 1. 添加 codex 配置（如果不存在）

```typescript
export class YourNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: '节点中文名称',
		name: 'nodeInternalName',
		// ...其他配置
		codex: {
			categories: ['Core Nodes'], // 或其他分类
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/...',
					},
				],
				// 教学链接（将同步到数据库 documentationConfig）
				tutorialLinks: {
					// 键名可自定义，用于占位符替换
					quickStart: 'https://docs.n8n.io/...',
					reference: 'https://docs.n8n.io/...',
					// 可添加更多链接
				},
			},
		},
	};
}
```

#### 2. 在 description/notice 中使用占位符

**原始硬编码链接**:
```typescript
description: 'Learn more at <a href="https://docs.n8n.io/...">documentation</a>.'
```

**使用占位符**:
```typescript
description: '在<a href="{{quickStart}}">文档</a>中了解更多。'
```

**占位符格式**: `{{键名}}` - 键名对应 `tutorialLinks` 中的键

### 常见链接类型

| 键名 | 用途 | 示例 |
|------|------|------|
| `quickStart` | 快速入门教程 | 教程链接 |
| `exampleWorkflow` | 示例工作流 | 模板链接 |
| `reference` | API 参考文档 | 参数说明 |
| `javaScriptMethods` | JS 方法列表 | 特殊变量 |
| `pythonBuiltin` | Python 内置方法 | 内置函数 |

---

## 📝 中文化步骤

### Step 1: 读取节点文件

```bash
# 节点主文件
packages/nodes-base/nodes/YourNode/YourNode.node.ts

# 可能的描述文件
packages/nodes-base/nodes/YourNode/descriptions/*.ts
```

### Step 2: 中文化基本信息

```typescript
export class YourNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: '你的节点',        // ✅ 中文化
		name: 'yourNode',              // ❌ 保持不变
		description: '节点功能描述',    // ✅ 中文化
		defaults: {
			name: '你的节点',           // ✅ 中文化
		},
		// ...
	};
}
```

### Step 3: 中文化参数定义

```typescript
properties: [
	{
		displayName: '参数名称',        // ✅ 中文化
		name: 'parameterName',         // ❌ 保持不变
		type: 'string',
		default: '',
		description: '参数功能说明',    // ✅ 中文化
		placeholder: '例如：示例值',    // ✅ 中文化
	},
	{
		displayName: '模式',
		name: 'mode',
		type: 'options',
		options: [
			{
				name: '选项名称',        // ✅ 中文化
				value: 'optionValue',  // ❌ 保持不变
				description: '选项说明', // ✅ 中文化
			},
		],
	},
]
```

### Step 4: 处理教学链接

**查找硬编码链接**:
```typescript
// 在 description、notice、callout 中查找
description: 'Tip: <a href="https://docs.n8n.io/...">Learn more</a>.'
```

**提取到 tutorialLinks**:
```typescript
codex: {
	resources: {
		tutorialLinks: {
			reference: 'https://docs.n8n.io/...',
		},
	},
},
```

**替换为占位符**:
```typescript
description: '提示：<a href="{{reference}}">了解更多</a>。'
```

### Step 5: 处理共享描述文件

如果节点使用共享的描述文件（如 `descriptions.ts`），需要：

1. 找到共享文件位置
2. 中文化共享参数定义
3. 处理共享描述中的链接

**示例**:
```typescript
// utils/descriptions.ts
export const sharedParam: INodeProperties = {
	displayName: '共享参数',           // ✅ 中文化
	name: 'sharedParam',
	description: '参数说明',           // ✅ 中文化
};
```

---

## 🔍 特殊情况处理

### 1. 版本化节点

某些节点有多个版本（V1, V2, V3）:

```typescript
export class Agent extends VersionedNodeType {
	constructor() {
		const baseDescription = {
			displayName: 'AI 智能体',  // ✅ 在 base 中文化
			// ...
		};
		const nodeVersions = {
			1: new AgentV1(baseDescription),
			2: new AgentV2(baseDescription),
			3: new AgentV3(baseDescription),  // ✅ 每个版本都需检查
		};
	}
}
```

**处理方式**:
- 基础描述在主文件中文化
- 每个版本特定的内容在版本文件中中文化

### 2. 动态选项

某些参数的选项是动态生成的:

```typescript
async loadOptions() {
	return [
		{ name: '选项1', value: 'option1' },  // ✅ name 中文化
		// ...
	];
}
```

### 3. 错误消息

```typescript
throw new NodeOperationError(
	this.getNode(),
	'请提供有效的输入',  // ✅ 中文化错误消息
);
```

---

## ✅ 验证清单

完成节点中文化后，检查：

- [ ] `displayName` 已中文化
- [ ] `description` 已中文化
- [ ] `defaults.name` 已中文化
- [ ] 所有 `properties` 的 `displayName` 已中文化
- [ ] 所有 `description` 已中文化
- [ ] 所有 `placeholder` 已中文化
- [ ] 所有 `options[].name` 已中文化
- [ ] 所有 notice/callout/hint 文本已中文化
- [ ] 硬编码链接已提取到 `tutorialLinks`
- [ ] 链接占位符格式正确 (`{{keyName}}`)
- [ ] `codex.resources` 已添加
- [ ] 内部标识 (`name`, `value`) 未修改
- [ ] 共享描述文件已处理（如果有）

---

## 📦 示例：完整中文化节点

### 原始节点

```typescript
export class MyNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'My Node',
		name: 'myNode',
		description: 'Perform operations',
		defaults: { name: 'My Node' },
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Simple',
						value: 'simple',
						description: 'Simple mode',
					},
				],
				description: 'Learn more at <a href="https://docs.n8n.io/nodes/mynode">documentation</a>',
			},
		],
	};
}
```

### 中文化后

```typescript
export class MyNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: '我的节点',
		name: 'myNode',
		description: '执行操作',
		defaults: { name: '我的节点' },
		codex: {
			categories: ['Core Nodes'],
			resources: {
				primaryDocumentation: [
					{ url: 'https://docs.n8n.io/nodes/mynode' },
				],
				tutorialLinks: {
					reference: 'https://docs.n8n.io/nodes/mynode',
				},
			},
		},
		properties: [
			{
				displayName: '模式',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: '简单模式',
						value: 'simple',
						description: '简单模式',
					},
				],
				description: '在<a href="{{reference}}">文档</a>中了解更多',
			},
		],
	};
}
```

---

## 🚀 批量处理建议

### 分组策略

将160个节点分成8组，每组约20个节点，使用8个子代理并行处理：

- **Group 1**: nodes-base (1-20)
- **Group 2**: nodes-base (21-40)
- **Group 3**: nodes-base (41-60)
- **Group 4**: nodes-base (61-80)
- **Group 5**: nodes-base (81-110)
- **Group 6**: nodes-langchain (1-20)
- **Group 7**: nodes-langchain (21-40)
- **Group 8**: nodes-langchain (41-50)

### 每个子代理的任务

1. 读取分配的节点文件
2. 按照本指南进行中文化
3. 处理教学链接
4. 验证修改
5. 报告完成状态

---

## ⚠️ 注意事项

1. **保持一致性**: 相同概念使用相同的中文翻译
2. **保留技术术语**: API、HTTP、JSON 等保持英文
3. **语言风格**: 简洁、专业、易懂
4. **链接检查**: 确保提取的链接有效
5. **测试**: 中文化后检查节点是否正常工作

---

## 📞 参考资源

- 节点中文化总结: `docs/node-localization-complete-summary.md`
- 前端动态链接实现: `docs/frontend-dynamic-links-implementation.md`
- 同步脚本: `scripts/sync-builtin-nodes-to-db.ts`
- AI Agent 示例: `packages/@n8n/nodes-langchain/nodes/agents/Agent/`
- Code 节点示例: `packages/nodes-base/nodes/Code/`

---

**文档版本**: v1.0
**最后更新**: 2025-11-09
**适用范围**: n8n 内置节点批量中文化
