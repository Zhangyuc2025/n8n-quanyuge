# SASA Platform 开发指南

## 📁 项目结构详解

### Monorepo 架构

项目采用 pnpm workspaces + Turbo 的 monorepo 架构，主要分为以下几个部分：

```
n8n-quanyuge/
├── packages/
│   ├── @n8n/              # n8n 核心包
│   ├── cli/               # 后端 API 服务
│   ├── core/              # 工作流执行引擎
│   ├── workflow/          # 工作流类型定义
│   ├── nodes-base/        # 内置节点
│   └── frontend/          # 前端相关包
```

## 🔧 开发环境设置

### 必需工具

```bash

# pnpm
npm install -g pnpm@10.18.3

# Git hooks (自动安装)
# 通过 lefthook 管理，在 pnpm install 时自动配置
```

### IDE 配置

推荐使用 **VSCode**，并安装以下扩展：

- Vue - Official (Vue Language Features)
- TypeScript Vue Plugin (Volar)
- ESLint
- Prettier - Code formatter
- EditorConfig for VS Code

VSCode 配置已包含在 `.vscode/` 目录中。

## 💻 开发工作流

### 1. 启动开发服务器

```bash
# 方式一：分别启动各个服务
pnpm dev:be        # 后端 (localhost:5678)
pnpm dev:fe:main   # 前端编辑器 (localhost:8080)
pnpm dev:fe:admin  # 管理面板 (localhost:5679)

# 方式二：同时启动所有服务（不推荐，日志混乱）
pnpm dev
```

### 2. 代码修改流程

```bash
# 1. 进行代码修改
# 2. 运行代码检查（在修改的包目录中）
cd packages/cli
pnpm lint
pnpm typecheck

# 3. 提交代码
git add .
git commit -m "feat: your commit message"

# 4. 推送并创建 PR
git push origin feature/your-feature-name
```

### 3. 构建和测试

```bash
# 完整构建
pnpm build

# 只构建特定包
pnpm --filter=n8n build
pnpm --filter=editor-ui build

# 运行测试
pnpm test

# 运行特定包的测试
cd packages/cli
pnpm test

# E2E 测试
pnpm --filter=n8n-playwright test:local
```

## 📦 包开发指南

### 后端包开发

#### 添加新的 API 端点

1. 在 `packages/cli/src/controllers/` 创建控制器
2. 使用依赖注入装饰器 `@RestController`
3. 定义路由和方法

```typescript
import { RestController, Get, Post } from '@n8n/decorators';
import { Service } from '@n8n/di';

@Service()
@RestController('/api/your-feature')
export class YourFeatureController {
  @Get('/')
  async list() {
    // 实现逻辑
  }

  @Post('/')
  async create(@Body() data: CreateDto) {
    // 实现逻辑
  }
}
```

#### 添加数据库实体

1. 在 `packages/@n8n/db/src/entities/` 创建实体
2. 使用 TypeORM 装饰器定义表结构
3. 在 `packages/@n8n/db/src/databases/` 更新数据库类

```typescript
import { Entity, Column } from '@n8n/typeorm';
import { WithTimestamps } from './abstract-entity';

@Entity()
export class YourEntity extends WithTimestamps {
  @Column()
  name: string;

  @Column('text')
  description: string;
}
```

### 前端包开发

#### 添加新的 Vue 组件

1. 在 `packages/frontend/editor-ui/src/components/` 创建组件
2. 使用 Vue 3 Composition API
3. 添加 TypeScript 类型

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
  title: string;
}>();

const emit = defineEmits<{
  save: [value: string];
}>();

const i18n = useI18n();
const inputValue = ref('');

const isValid = computed(() => inputValue.value.length > 0);

function handleSave() {
  emit('save', inputValue.value);
}
</script>

<template>
  <div :class="$style.container">
    <h2>{{ i18n.baseText('yourFeature.title') }}</h2>
    <input v-model="inputValue" />
    <button @click="handleSave" :disabled="!isValid">
      {{ i18n.baseText('common.save') }}
    </button>
  </div>
</template>

<style module>
.container {
  padding: var(--spacing--md);
  background: var(--color--background);
}
</style>
```

#### 使用 Pinia Store

```typescript
// stores/yourFeature.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useYourFeatureStore = defineStore('yourFeature', () => {
  const items = ref<Item[]>([]);
  const loading = ref(false);

  const itemCount = computed(() => items.value.length);

  async function fetchItems() {
    loading.value = true;
    try {
      const response = await api.getItems();
      items.value = response.data;
    } finally {
      loading.value = false;
    }
  }

  return {
    items,
    loading,
    itemCount,
    fetchItems,
  };
});
```

### 节点开发

#### 创建新节点

```bash
# 使用 CLI 工具
pnpm --filter=@n8n/node-cli run:node-dev new YourNodeName
```

#### 节点文件结构

```
nodes-base/nodes/YourNode/
├── YourNode.node.ts        # 节点逻辑
├── YourNode.node.json      # 节点元数据
├── yourNode.svg            # 节点图标
└── __tests__/
    └── YourNode.test.ts    # 单元测试
```

#### 节点实现示例

```typescript
import type {
  INodeType,
  INodeTypeDescription,
  IExecuteFunctions,
  INodeExecutionData,
} from 'n8n-workflow';

export class YourNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Your Node',
    name: 'yourNode',
    icon: 'file:yourNode.svg',
    group: ['transform'],
    version: 1,
    description: 'Your node description',
    defaults: {
      name: 'Your Node',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          {
            name: 'Get',
            value: 'get',
          },
        ],
        default: 'get',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = this.getNodeParameter('operation', i) as string;

      if (operation === 'get') {
        // 实现逻辑
        returnData.push({
          json: { success: true },
        });
      }
    }

    return [returnData];
  }
}
```

## 🎨 前端开发规范

### CSS 使用

**必须使用 CSS 变量**，参考 `packages/frontend/CLAUDE.md`:

```css
/* ✅ 正确 */
.container {
  padding: var(--spacing--md);
  color: var(--color--text);
  background: var(--color--background);
}

/* ❌ 错误 */
.container {
  padding: 20px;
  color: #333;
  background: #fff;
}
```

### 国际化

所有 UI 文本必须使用 i18n：

```typescript
// ✅ 正确
const title = i18n.baseText('yourFeature.title');

// ❌ 错误
const title = 'Your Feature';
```

添加翻译：

```typescript
// packages/frontend/@n8n/i18n/src/locales/en.json
{
  "yourFeature": {
    "title": "Your Feature",
    "description": "Feature description"
  }
}
```

## 🧪 测试指南

### 单元测试

```typescript
import { describe, it, expect } from 'vitest';
import { YourComponent } from './YourComponent.vue';

describe('YourComponent', () => {
  it('should render correctly', () => {
    // 测试逻辑
  });
});
```

### E2E 测试

```typescript
import { test, expect } from '@playwright/test';

test('should create workflow', async ({ page }) => {
  await page.goto('http://localhost:8080');
  await page.click('[data-test-id="create-workflow"]');
  await expect(page).toHaveURL(/workflow/);
});
```

## 🚀 性能优化

### 构建优化

```bash
# 使用 Turbo 缓存
pnpm build  # 自动使用缓存

# 清除缓存
pnpm clean
rm -rf .turbo
```

### 开发服务器优化

```bash
# 只启动需要的服务
pnpm dev:be      # 只启动后端
pnpm dev:fe:main # 只启动前端
```

## 📝 提交规范

使用 Conventional Commits 格式：

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整
refactor: 重构代码
test: 添加测试
chore: 构建/工具相关
```

示例：
```
feat(nodes): 添加 Stripe 支付节点
fix(editor): 修复工作流保存问题
docs(api): 更新 API 文档
```

## 🔍 调试技巧

### 后端调试

```bash
# 使用 VSCode 调试器
# 在 .vscode/launch.json 中已配置
# 按 F5 启动调试
```

### 前端调试

```bash
# 使用 Vue DevTools
# 在 Chrome 中安装 Vue DevTools 扩展
```

### 数据库调试

```bash
# 查看 SQLite 数据库
sqlite3 ~/.n8n/database.sqlite

# 查看所有表
.tables

# 查询数据
SELECT * FROM workflow;
```

## 🛠️ 常用命令

```bash
# 清理构建产物
pnpm clean

# 重置项目（清理并重新安装）
pnpm reset

# 格式化代码
pnpm format

# 代码检查
pnpm lint

# 修复代码问题
pnpm lint:fix

# 类型检查
pnpm typecheck

# 生成第三方许可证列表
pnpm generate:third-party-licenses
```

## 📚 参考资源

- [n8n 官方文档](https://docs.n8n.io)
- [Vue 3 文档](https://vuejs.org)
- [TypeORM 文档](https://typeorm.io)
- [Pinia 文档](https://pinia.vuejs.org)

---

**最后更新**: 2025-11-14
