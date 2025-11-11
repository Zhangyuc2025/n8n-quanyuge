# 节点图标渲染快速参考指南

## 核心问题

**InvalidCharacterError** 错误通常发生在以下场景：
- 将 SVG data URI 误用作 HTML 元素标签名
- 例如：`document.createElement('data:image/svg+xml;base64,...')`

## 关键代码位置

### Admin-Panel

| 文件 | 行号 | 功能 | 是否有风险 |
|------|------|------|----------|
| `PlatformNodesView.vue` | 280-287 | 显示节点卡片 | 否（仅文本显示） |
| `PlatformNodeDialog.vue` | 49,112,288-296 | 编辑图标 URL | 中等（需要验证）|
| `platform-nodes.store.ts` | 1-900 | 数据管理 | 否（数据操作） |

### Editor-UI

| 文件 | 行号 | 功能 | 是否有风险 |
|------|------|------|----------|
| `nodeIcon.ts` | 154-201 | 获取图标源 | 高（可能误解析 data URI）|
| `nodeIcon.ts` | 184 | 解析 icon 字符串 | 高（split(':') 可能失败）|
| `NodeIcon.vue` | 42-56 | 计算图标属性 | 低（正确的类型检查）|

## 最可能的问题点

### 1. nodeIcon.ts 第 184 行
```typescript
// 危险：如果 icon 是 'data:image/svg+xml;...'
const [type, iconName] = icon.split(':');
// type='data', iconName='image/svg+xml;...' ← 都无效！
```

**解决**：添加 data URI 检查
```typescript
if (icon.startsWith('data:')) {
    return createFileIconSource(icon, fullNodeType);
}
```

### 2. PlatformNodeDialog.vue 中无验证
目前接受任意输入，没有验证 iconUrl 格式

**解决**：添加验证函数
```typescript
function isValidIconUrl(url: string): boolean {
    const patterns = [
        /^https?:\/\/.+/,
        /^\/[^<>:"|?*]+$/,
        /^data:image\/svg\+xml;base64,[a-zA-Z0-9+/=]+$/
    ];
    return patterns.some(p => p.test(url));
}
```

### 3. N8nNodeIcon 组件处理
位置：`@n8n/design-system`（外部包）
可能在渲染时误用了 src 作为标签名

## 立即可采取的行动

### 1. 添加前端验证（5分钟）
```typescript
// PlatformNodeDialog.vue - onSave 方法中
if (formData.value.iconUrl && !isValidIconUrl(formData.value.iconUrl)) {
    ElMessage.error('图标 URL 格式无效');
    return;
}
```

### 2. 添加防御性检查（10分钟）
```typescript
// nodeIcon.ts - createFileIconSource 函数中
if (src.includes('\x00') || src.includes('<') || src.includes('>')) {
    console.warn('Invalid character in icon source');
    return { type: 'file', src: '', ... };
}
```

### 3. 后端验证（15分钟）
```typescript
// platform-nodes.controller.ts
private validateIconUrl(url?: string) {
    if (!url) return;
    if (!url.match(/^(https?:|\/|data:image\/)/)) {
        throw new BadRequestException('Invalid icon URL');
    }
}
```

## 测试清单

- [ ] 使用有效的 HTTP URL 创建节点 ✓
- [ ] 使用相对路径创建节点 ✓
- [ ] 使用 SVG data URI 创建节点 ✓
- [ ] 尝试使用无效字符（<, >, :, 等）✓
- [ ] 检查浏览器控制台是否有 InvalidCharacterError

## 参考资源

- 完整分析：`ICON_RENDERING_ANALYSIS.md`
- 相关文件：
  - `/packages/frontend/admin-panel/src/modules/platform-nodes/components/PlatformNodeDialog.vue`
  - `/packages/frontend/editor-ui/src/app/utils/nodeIcon.ts`
  - `/packages/frontend/editor-ui/src/app/components/NodeIcon.vue`

## 常见错误消息

| 错误 | 原因 | 解决 |
|-----|------|------|
| `InvalidCharacterError` | 无效的标签名 | 检查 data URI 处理 |
| `Failed to load icon` | 404 或跨域 | 使用有效 URL 或 data URI |
| `Icon is undefined` | 数据缺失 | 检查 iconUrl 是否为空 |

