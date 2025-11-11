# 全域阁管理后台 - 部署说明

本文档描述如何构建和部署全域阁管理后台。

---

## 📋 目录

1. [构建说明](#构建说明)
2. [部署方案](#部署方案)
3. [环境变量配置](#环境变量配置)
4. [故障排查](#故障排查)
5. [性能优化建议](#性能优化建议)

---

## 🔨 构建说明

### 前置要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **TypeScript**: >= 5.9.2

### 构建命令

```bash
# 1. 安装依赖（如果还没安装）
pnpm install

# 2. 类型检查
pnpm --filter @n8n/admin-panel typecheck

# 3. 生产构建
pnpm --filter @n8n/admin-panel build

# 4. 预览构建结果（可选）
pnpm --filter @n8n/admin-panel preview
```

### 构建产物

构建完成后，产物位于 `packages/frontend/admin-panel/dist/` 目录：

```
dist/
├── index.html                    # 入口 HTML 文件
├── css/                          # 样式文件
│   ├── index-[hash].css          # 主应用样式
│   └── vue-vendor-[hash].css     # Vue 相关样式
├── js/                           # JavaScript 文件
│   ├── index-[hash].js           # 主应用代码
│   ├── ant-design-vue-[hash].js  # Ant Design Vue 组件
│   ├── echarts-[hash].js         # ECharts 图表库
│   ├── vue-vendor-[hash].js      # Vue 核心库
│   ├── ant-icons-[hash].js       # Ant Design 图标
│   └── dayjs-[hash].js           # 日期处理库
├── favicon.ico                   # 网站图标
├── logo.svg                      # Logo 完整版
└── logo-mini.svg                 # Logo 小图标
```

### 构建优化

生产构建已启用以下优化：

- ✅ **代码压缩**: 使用 Terser 压缩 JavaScript
- ✅ **移除 console**: 自动移除所有 console 语句
- ✅ **代码分割**: 按库分块（Ant Design、ECharts、Vue 等）
- ✅ **静态资源优化**: 小于 4KB 的资源转 base64
- ✅ **CSS 代码分割**: 按页面分割 CSS
- ✅ **长期缓存**: 文件名包含 hash 值

---

## 🚀 部署方案

### 方案一：与后端一起部署（推荐）

**适用场景**: 简单部署，管理后台和主应用使用同一域名。

#### 步骤

1. **构建管理后台**
   ```bash
   pnpm --filter @n8n/admin-panel build
   ```

2. **构建后端**
   ```bash
   pnpm build
   ```

3. **启动后端服务**
   ```bash
   pnpm start
   ```

4. **访问管理后台**
   - 开发环境: `http://localhost:5679/admin/`
   - 生产环境: `https://yourdomain.com/admin/`

#### 工作原理

后端 `server.ts` 已配置静态文件服务：

```typescript
// packages/cli/src/server.ts
const adminPanelPath = resolve(__dirname, '../../frontend/admin-panel/dist');
this.app.use('/admin', express.static(adminPanelPath));
this.app.get('/admin/*', (_req, res) => {
  res.sendFile(resolve(adminPanelPath, 'index.html'));
});
```

---

### 方案二：使用 Nginx 独立部署

**适用场景**: 需要 CDN 加速、负载均衡或独立域名。

#### Nginx 配置示例

参考 `packages/frontend/admin-panel/nginx.example.conf` 文件。

**简化配置**:

```nginx
server {
    listen 443 ssl http2;
    server_name quanyuge.com;

    # SSL 证书
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 管理后台静态文件
    location /admin {
        alias /var/www/quanyuge/admin-panel/dist;
        try_files $uri $uri/ /admin/index.html;

        # 静态资源缓存 1 年
        location ~* \.(js|css|png|jpg|svg|ico)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 代理到后端
    location /api {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 部署步骤

1. **上传构建产物**
   ```bash
   scp -r packages/frontend/admin-panel/dist/* \
       user@server:/var/www/quanyuge/admin-panel/
   ```

2. **配置 Nginx**
   ```bash
   sudo cp nginx.example.conf /etc/nginx/sites-available/quanyuge
   sudo ln -s /etc/nginx/sites-available/quanyuge /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **访问管理后台**
   ```
   https://quanyuge.com/admin/
   ```

---

### 方案三：使用 CDN 加速（推荐生产）

**适用场景**: 高流量、全球用户访问、需要最佳性能。

#### 步骤

1. **上传到对象存储**

   以阿里云 OSS 为例：

   ```bash
   # 安装 ossutil
   wget http://gosspublic.alicdn.com/ossutil/1.7.13/ossutil64
   chmod 755 ossutil64

   # 配置 OSS
   ./ossutil64 config

   # 上传构建产物
   ./ossutil64 cp -r packages/frontend/admin-panel/dist/ \
       oss://your-bucket/admin/ --update
   ```

2. **配置 CDN 域名**

   - 在阿里云控制台添加 CDN 域名：`cdn.quanyuge.com`
   - 源站类型：OSS 域名
   - 回源 HOST：`your-bucket.oss-cn-hangzhou.aliyuncs.com`

3. **修改 Vite 配置**

   ```typescript
   // vite.config.ts
   export default defineConfig({
     base: 'https://cdn.quanyuge.com/admin/',  // 改为 CDN 地址
     // ...
   });
   ```

4. **重新构建并上传**
   ```bash
   pnpm --filter @n8n/admin-panel build
   ./ossutil64 cp -r dist/ oss://your-bucket/admin/ --update
   ```

5. **刷新 CDN 缓存**

   在 CDN 控制台刷新目录：`https://cdn.quanyuge.com/admin/`

---

## ⚙️ 环境变量配置

### 生产环境 (.env.production)

```env
# 应用标题
VITE_APP_TITLE=全域阁管理后台

# API 基础路径
VITE_API_BASE_URL=/api

# 应用版本
VITE_APP_VERSION=2.0.0

# 应用基础路径（根据部署方案调整）
VITE_BASE_URL=/admin/                           # 方案一、二
# VITE_BASE_URL=https://cdn.quanyuge.com/admin/  # 方案三（CDN）

# 环境标识
VITE_ENV=production
```

### 开发环境 (.env.development)

```env
VITE_APP_TITLE=全域阁管理后台（开发）
VITE_API_BASE_URL=/api
VITE_APP_VERSION=2.0.0-dev
VITE_BASE_URL=/admin/
VITE_ENV=development
VITE_SOURCEMAP=true
```

---

## 🔧 故障排查

### 1. 构建失败

**问题**: `TypeScript 类型错误`

```bash
# 解决方案：运行类型检查
pnpm --filter @n8n/admin-panel typecheck

# 修复类型错误后重新构建
pnpm --filter @n8n/admin-panel build
```

**问题**: `Sass 编译错误`

```bash
# 确保 sass 版本正确
pnpm list sass

# 重新安装依赖
pnpm install --force
```

### 2. 访问 404

**问题**: 访问 `https://yourdomain.com/admin/` 返回 404

**检查清单**:
- ✅ 确认 dist 目录存在并有内容
- ✅ 检查后端 server.ts 是否正确配置静态文件服务
- ✅ 检查 Nginx 配置是否正确
- ✅ 确认 API 路径没有冲突

**解决方案**:

```bash
# 检查构建产物
ls -la packages/frontend/admin-panel/dist/

# 检查后端日志
# 应该看到：Admin Panel static files served from /admin

# 重启后端
pnpm start
```

### 3. API 请求 CORS 错误

**问题**: 浏览器控制台显示 CORS 错误

**解决方案**:

如果使用独立域名，需要后端配置 CORS：

```typescript
// packages/cli/src/server.ts
this.app.use(cors({
  origin: 'https://admin.quanyuge.com',
  credentials: true,
}));
```

### 4. 静态资源加载失败

**问题**: CSS/JS 文件 404

**检查清单**:
- ✅ 检查 `vite.config.ts` 中的 `base` 配置
- ✅ 确认文件路径正确
- ✅ 检查浏览器开发者工具 Network 标签

**解决方案**:

```typescript
// vite.config.ts
export default defineConfig({
  base: '/admin/',  // 确保与实际部署路径一致
  // ...
});
```

---

## 🚀 性能优化建议

### 1. 启用 Gzip/Brotli 压缩

**Nginx 配置**:

```nginx
# 启用 Gzip
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/javascript application/json;

# 启用 Brotli（需要安装模块）
brotli on;
brotli_types text/plain text/css application/javascript application/json;
```

### 2. 设置缓存策略

```nginx
# HTML 不缓存
location ~* \.html$ {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

# 静态资源长期缓存
location ~* \.(js|css|png|jpg|svg|ico|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 使用 HTTP/2

```nginx
server {
    listen 443 ssl http2;  # 启用 HTTP/2
    # ...
}
```

### 4. CDN 加速

- 使用阿里云/腾讯云 CDN 加速静态资源
- 配置全球加速节点
- 启用 CDN 缓存预热

### 5. 监控与日志

**设置监控**:
- 使用阿里云/腾讯云监控
- 配置告警规则（CPU、内存、带宽）

**日志分析**:
```bash
# Nginx 访问日志
tail -f /var/log/nginx/quanyuge_access.log

# Nginx 错误日志
tail -f /var/log/nginx/quanyuge_error.log
```

---

## 📊 构建产物大小

| 文件 | 大小（原始） | 大小（Gzip） |
|------|------------|-------------|
| index.html | 1.05 KB | 0.47 KB |
| CSS 文件 | 42.69 KB | 9.56 KB |
| Vue 核心 | 199.55 KB | 64.11 KB |
| Ant Design Vue | 1,506.90 KB | 453.59 KB |
| ECharts | 1,024.45 KB | 335.03 KB |
| **总计** | **~3.5 MB** | **~1.0 MB** |

---

## 📞 技术支持

如有部署问题，请联系技术团队或查看以下资源：

- **项目仓库**: [n8n-quanyuge](https://github.com/your-org/n8n-quanyuge)
- **问题反馈**: GitHub Issues
- **文档中心**: [https://docs.quanyuge.com](https://docs.quanyuge.com)

---

**最后更新**: 2025-11-11
**版本**: 2.0.0
**维护者**: 全域阁技术团队
