# 节点图标存储方案

**更新时间**: 2025-11-12
**基于调查**: SASA 平台文件存储和图标管理机制分析

---

## 一、当前状态

### ✅ 已有功能
- **数据库字段**: `iconUrl` 字段已存在（varchar(500)）
- **对象存储配置**: S3/OSS/MinIO 配置完整
- **Binary Data 存储**: 运行中（仅用于执行流程文件）

### ❌ 缺失功能
- **文件上传 API**: 不存在
- **前端上传组件**: 只有 URL 输入框
- **静态资源目录**: 没有 `/uploads` 或 `/public/icons`

---

## 二、推荐方案对比

### 方案 A：静态文件服务（最快实现）⭐ 推荐

#### 实现步骤

**1. 创建图标目录**
```bash
mkdir -p packages/cli/public/node-icons
```

**2. 复制节点图标**
```bash
# 将 Slack 节点图标复制到静态目录
cp node-research/slack-original/slack.svg packages/cli/public/node-icons/
```

**3. 配置静态文件路由**
```typescript
// packages/cli/src/server.ts
// 在 configureRoutes() 方法中添加
this.app.use('/node-icons', express.static('public/node-icons', {
    maxAge: '7d',  // 缓存 7 天
    etag: true,
    dotfiles: 'ignore'
}));
```

**4. 使用图标**
```json
{
    "iconUrl": "http://localhost:5678/node-icons/slack.svg"
}
```

#### 优点
- ✅ **5 分钟实现**
- ✅ 无需前后端开发
- ✅ 支持 SVG 和 PNG
- ✅ 浏览器缓存优化

#### 缺点
- ❌ 需要手动复制文件
- ❌ 不支持在线上传
- ❌ 扩展性差（大量节点时）

#### 适用场景
- ✅ 快速验证节点上传功能
- ✅ 开发测试阶段
- ✅ 节点数量 < 100

---

### 方案 B：对象存储 + 上传 API（生产推荐）

#### 实现步骤

**1. 安装依赖**
```bash
cd packages/cli
pnpm add multer @types/multer
```

**2. 创建上传控制器**
```typescript
// packages/cli/src/controllers/file-upload.controller.ts
import { Response } from 'express';
import multer from 'multer';
import { Authorized, Post, RestController } from '@/decorators';
import { BadRequestError } from '@/errors';

@RestController('/uploads')
export class FileUploadController {
    private upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 1024 * 1024 }, // 1MB
        fileFilter: (req, file, cb) => {
            const allowed = ['image/svg+xml', 'image/png', 'image/jpeg'];
            if (allowed.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('只支持 SVG、PNG、JPEG 格式'));
            }
        },
    }).single('icon');

    @Authorized()
    @Post('/node-icon')
    async uploadNodeIcon(req: express.Request, res: Response) {
        // 解析文件
        await new Promise((resolve, reject) => {
            this.upload(req, res, (err) => (err ? reject(err) : resolve(null)));
        });

        if (!req.file) {
            throw new BadRequestError('未上传文件');
        }

        // 生成文件名
        const ext = req.file.mimetype.split('/')[1];
        const filename = `${Date.now()}-${req.file.originalname}`;
        const filepath = `public/node-icons/${filename}`;

        // 保存文件
        await fs.writeFile(filepath, req.file.buffer);

        // 返回 URL
        return {
            iconUrl: `/node-icons/${filename}`,
        };
    }
}
```

**3. 前端上传组件（Admin Panel）**
```vue
<!-- packages/frontend/admin-panel/src/components/nodes/NodeCreateDialog.vue -->
<a-form-item label="图标">
    <a-space direction="vertical" style="width: 100%">
        <a-upload
            :before-upload="handleIconUpload"
            :show-upload-list="false"
            accept=".svg,.png,.jpg,.jpeg"
        >
            <a-button>
                <upload-outlined /> 上传图标
            </a-button>
        </a-upload>

        <a-input
            v-model:value="formData.iconUrl"
            placeholder="或粘贴图标 URL"
        />

        <a-image
            v-if="formData.iconUrl"
            :src="formData.iconUrl"
            :width="48"
            :preview="false"
        />
    </a-space>
</a-form-item>

<script setup lang="ts">
const handleIconUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('icon', file);

    const response = await adminApiClient.post('/uploads/node-icon', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

    formData.value.iconUrl = response.data.iconUrl;
    return false; // 阻止默认上传
};
</script>
```

**4. 对象存储集成（可选）**
```typescript
// 使用现有的 ObjectStoreService
import { ObjectStoreService } from '@/core/binary-data/object-store/object-store.service.ee';

@Post('/node-icon')
async uploadNodeIcon(req: express.Request, res: Response) {
    // ... 解析文件 ...

    const filename = `node-icons/${Date.now()}-${req.file.originalname}`;

    // 上传到 S3/OSS
    await this.objectStore.put(filename, req.file.buffer, {
        mimeType: req.file.mimetype,
        fileName: req.file.originalname,
    });

    // 返回 CDN URL
    return {
        iconUrl: `${process.env.N8N_CDN_BASE_URL}/${filename}`,
    };
}
```

#### 优点
- ✅ 用户友好（拖拽上传）
- ✅ 自动生成 URL
- ✅ 支持对象存储
- ✅ 可扩展到 CDN

#### 缺点
- ❌ 需要前后端开发
- ❌ 实现复杂（2-4 小时）

#### 适用场景
- ✅ 生产环境
- ✅ 大量节点（> 100）
- ✅ 多租户共享图标

---

## 三、Slack 节点图标处理方案（当前任务）

### 采用方案 A（静态文件服务）

#### 实现步骤

```bash
# 1. 创建图标目录
mkdir -p packages/cli/public/node-icons

# 2. 复制 Slack 图标
cp node-research/slack-original/slack.svg packages/cli/public/node-icons/slack.svg

# 3. 添加静态路由（手动编辑 server.ts）
# packages/cli/src/server.ts
```

```typescript
// 在 configureRoutes() 中添加（约 line 400）
this.app.use('/node-icons', express.static(path.join(__dirname, '../public/node-icons'), {
    maxAge: '7d',
    etag: true,
}));
```

```bash
# 4. 重启后端
pnpm dev:be

# 5. 测试访问
curl http://localhost:5678/node-icons/slack.svg
```

#### 使用方式

**在转换后的节点中使用**：
```json
{
    "nodeKey": "slack",
    "nodeName": "Slack",
    "iconUrl": "http://localhost:5678/node-icons/slack.svg",
    "nodeDefinition": { ... },
    "nodeCode": "..."
}
```

**生产环境替换为 CDN**：
```json
{
    "iconUrl": "https://cdn.sasa-platform.com/node-icons/slack.svg"
}
```

---

## 四、批量转换节点时的图标处理

### 脚本示例

```bash
#!/bin/bash
# scripts/prepare-node-icons.sh

SOURCE_DIR="nodes-base-backup/nodes"
TARGET_DIR="packages/cli/public/node-icons"

mkdir -p "$TARGET_DIR"

# 遍历所有节点目录
find "$SOURCE_DIR" -maxdepth 1 -type d | while read -r node_dir; do
    node_name=$(basename "$node_dir")

    # 查找 SVG 图标（优先）
    svg_file=$(find "$node_dir" -maxdepth 1 -name "*.svg" ! -name "*.dark.svg" | head -1)

    if [ -n "$svg_file" ]; then
        # 复制并重命名为小写
        target_name=$(echo "$node_name" | tr '[:upper:]' '[:lower:]').svg
        cp "$svg_file" "$TARGET_DIR/$target_name"
        echo "✅ Copied: $target_name"
    else
        echo "⚠️  No icon found for: $node_name"
    fi
done

echo "✅ Icon preparation completed!"
```

### 使用脚本

```bash
chmod +x scripts/prepare-node-icons.sh
./scripts/prepare-node-icons.sh
```

---

## 五、图标规范

### 文件格式
- **优先**: SVG（矢量图，清晰度最好）
- **备选**: PNG（48x48 或 64x64）

### 文件大小
- SVG: < 50KB
- PNG: < 100KB

### 命名规范
```
slack.svg           # ✅ 推荐：小写、短横线
github.svg          # ✅
http-request.svg    # ✅
Slack.svg           # ❌ 避免：大写
slack_icon.svg      # ❌ 避免：下划线
```

### 颜色规范
- **浅色主题**: 默认图标
- **深色主题**: `*icon-name*.dark.svg`（可选）

示例：
```
slack.svg           # 浅色主题
slack.dark.svg      # 深色主题
```

---

## 六、迁移到云存储（后续）

### 阿里云 OSS

```bash
# 1. 配置环境变量
N8N_DEFAULT_BINARY_DATA_MODE=s3
N8N_EXTERNAL_STORAGE_S3_HOST=oss-cn-hangzhou.aliyuncs.com
N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME=sasa-platform-icons
N8N_EXTERNAL_STORAGE_S3_BUCKET_REGION=oss-cn-hangzhou
N8N_EXTERNAL_STORAGE_S3_ACCESS_KEY=LTAI5t...
N8N_EXTERNAL_STORAGE_S3_ACCESS_SECRET=xxx...

# 2. CDN 加速
N8N_CDN_BASE_URL=https://cdn.sasa-platform.com
```

### 批量上传

```bash
# 使用 ossutil 上传
ossutil cp -r packages/cli/public/node-icons/ oss://sasa-platform-icons/node-icons/

# 批量更新数据库 iconUrl
UPDATE platform_node
SET icon_url = REPLACE(icon_url, 'http://localhost:5678', 'https://cdn.sasa-platform.com')
WHERE icon_url LIKE 'http://localhost:5678%';
```

---

## 七、总结

| 方案 | 实现难度 | 开发时间 | 适用场景 |
|------|---------|---------|---------|
| **方案 A（静态文件）** | ⭐ 简单 | 5 分钟 | ✅ 开发测试、快速验证 |
| **方案 B（对象存储）** | ⭐⭐⭐ 中等 | 2-4 小时 | ✅ 生产环境、大规模部署 |

**当前任务推荐**: ✅ 使用方案 A（静态文件服务）

**理由**:
1. 快速验证节点上传功能
2. 不阻塞核心开发
3. 后续可平滑迁移到对象存储

---

**下一步**: 创建静态图标目录并配置路由 →
