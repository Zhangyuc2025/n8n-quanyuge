# SASA Platform 部署指南

## 📋 部署概览

SASA Platform 支持多种部署方式，本文档提供详细的部署指南。

## 🎯 部署选项

### 1. Docker 部署（推荐）
### 2. 直接部署
### 3. Kubernetes 部署

---

## 🐳 Docker 部署

### 前置要求

```bash
Docker >= 20.10
Docker Compose >= 2.0
```

### 快速开始

```bash
# 1. 创建数据卷
docker volume create n8n_data

# 2. 运行容器
docker run -d \
  --name sasa-platform \
  -p 5678:5678 \
  -e DB_TYPE=postgresdb \
  -e DB_POSTGRESDB_HOST=postgres \
  -e DB_POSTGRESDB_DATABASE=n8n \
  -e DB_POSTGRESDB_USER=n8n \
  -e DB_POSTGRESDB_PASSWORD=your_password \
  -e N8N_ENCRYPTION_KEY=your_encryption_key \
  -v n8n_data:/home/node/.n8n \
  <your-registry>/sasa-platform:latest
```

### Docker Compose 部署

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: your_postgres_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U n8n']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  n8n:
    image: <your-registry>/sasa-platform:latest
    restart: always
    ports:
      - '5678:5678'
    environment:
      # 数据库配置
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: n8n
      DB_POSTGRESDB_PASSWORD: your_postgres_password

      # Redis 配置
      QUEUE_BULL_REDIS_HOST: redis
      QUEUE_BULL_REDIS_PORT: 6379

      # 服务器配置
      N8N_HOST: 0.0.0.0
      N8N_PORT: 5678
      N8N_PROTOCOL: https
      N8N_BASE_URL: https://your-domain.com

      # 安全配置
      N8N_ENCRYPTION_KEY: your_encryption_key_here

      # 执行配置
      EXECUTIONS_MODE: queue
      EXECUTIONS_DATA_SAVE_ON_SUCCESS: all
      EXECUTIONS_DATA_SAVE_ON_ERROR: all

      # Webhook 配置
      WEBHOOK_URL: https://your-domain.com/

      # 时区
      TZ: Asia/Shanghai
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres_data:
  redis_data:
  n8n_data:
```

启动服务：

```bash
docker-compose up -d
```

---

## 💻 直接部署

### 前置要求

```bash
Node.js >= 22.16
pnpm >= 10.18.3
PostgreSQL >= 14 (推荐) 或 MySQL >= 8.0
Redis >= 6.0 (可选，用于队列模式)
```

### 构建步骤

```bash
# 1. 克隆代码
git clone <your-repo-url> sasa-platform
cd sasa-platform

# 2. 安装依赖
pnpm install

# 3. 构建项目
pnpm build

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库等信息

# 5. 运行数据库迁移
NODE_ENV=production pnpm --filter=@n8n/cli start migrate

# 6. 启动服务
NODE_ENV=production pnpm start
```

### 使用 PM2 管理

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start packages/cli/bin/n8n --name sasa-platform

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs sasa-platform

# 重启
pm2 restart sasa-platform
```

---

## ☸️ Kubernetes 部署

### Helm Chart

创建 `values.yaml`:

```yaml
replicaCount: 3

image:
  repository: <your-registry>/sasa-platform
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 5678

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: sasa-platform.your-domain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: sasa-platform-tls
      hosts:
        - sasa-platform.your-domain.com

postgresql:
  enabled: true
  auth:
    database: n8n
    username: n8n
    password: your_password

redis:
  enabled: true

env:
  - name: DB_TYPE
    value: postgresdb
  - name: DB_POSTGRESDB_HOST
    value: sasa-platform-postgresql
  - name: N8N_ENCRYPTION_KEY
    valueFrom:
      secretKeyRef:
        name: sasa-platform-secrets
        key: encryption-key

resources:
  limits:
    cpu: 2000m
    memory: 4Gi
  requests:
    cpu: 1000m
    memory: 2Gi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

部署：

```bash
helm install sasa-platform ./helm-chart -f values.yaml
```

---

## 🔧 环境变量配置

### 必需配置

```bash
# 数据库配置
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=localhost
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n
DB_POSTGRESDB_PASSWORD=your_password

# 加密密钥（重要！）
N8N_ENCRYPTION_KEY=your_encryption_key

# 服务器配置
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
N8N_BASE_URL=https://your-domain.com
```

### 推荐配置

```bash
# 执行模式
EXECUTIONS_MODE=queue  # regular 或 queue
EXECUTIONS_PROCESS=main  # main 或 own

# 数据保存
EXECUTIONS_DATA_SAVE_ON_SUCCESS=all  # all, none
EXECUTIONS_DATA_SAVE_ON_ERROR=all

# 队列配置（queue 模式需要）
QUEUE_BULL_REDIS_HOST=localhost
QUEUE_BULL_REDIS_PORT=6379
QUEUE_BULL_REDIS_DB=0

# Webhook 配置
WEBHOOK_URL=https://your-domain.com/

# 时区
TZ=Asia/Shanghai

# 日志级别
N8N_LOG_LEVEL=info  # error, warn, info, verbose, debug

# Worker 配置（queue 模式）
N8N_CONCURRENCY_PRODUCTION_LIMIT=10
```

### 安全配置

```bash
# JWT 配置
N8N_JWT_SECRET=your_jwt_secret

# CORS 配置
N8N_CORS_ORIGIN=https://your-domain.com

# 安全头
N8N_SECURITY_HEADERS=true

# 禁用某些节点（如果需要）
NODES_EXCLUDE=[\"n8n-nodes-base.executeCommand\"]
```

### 高级配置

```bash
# 性能优化
NODE_OPTIONS=--max-old-space-size=4096

# 文件大小限制
N8N_PAYLOAD_SIZE_MAX=16

# 超时配置
N8N_DEFAULT_TIMEOUT=300
```

---

## 🗄️ 数据库配置

### PostgreSQL（推荐）

```bash
# 创建数据库和用户
createdb n8n
createuser n8n
psql -c "GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n;"
psql -c "ALTER USER n8n WITH PASSWORD 'your_password';"

# 环境变量
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=localhost
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n
DB_POSTGRESDB_PASSWORD=your_password
DB_POSTGRESDB_SCHEMA=public
```

### MySQL

```bash
# 创建数据库和用户
mysql -e "CREATE DATABASE n8n CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER 'n8n'@'%' IDENTIFIED BY 'your_password';"
mysql -e "GRANT ALL PRIVILEGES ON n8n.* TO 'n8n'@'%';"

# 环境变量
DB_TYPE=mysqldb
DB_MYSQLDB_HOST=localhost
DB_MYSQLDB_PORT=3306
DB_MYSQLDB_DATABASE=n8n
DB_MYSQLDB_USER=n8n
DB_MYSQLDB_PASSWORD=your_password
```

---

## 🔐 SSL/TLS 配置

### 使用 Nginx 反向代理

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Webhook 支持
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

---

## 📊 监控和日志

### 日志配置

```bash
# 日志级别
N8N_LOG_LEVEL=info

# 日志输出
N8N_LOG_OUTPUT=console,file

# 日志文件位置
N8N_LOG_FILE_LOCATION=/var/log/n8n/
```

### 健康检查

```bash
# HTTP 健康检查端点
curl http://localhost:5678/healthz
```

### Prometheus 指标

```bash
# 启用指标
N8N_METRICS=true
N8N_METRICS_PREFIX=n8n_

# 访问指标
curl http://localhost:5678/metrics
```

---

## 🔄 升级和维护

### 升级步骤

```bash
# 1. 备份数据库
pg_dump n8n > backup-$(date +%Y%m%d).sql

# 2. 停止服务
pm2 stop sasa-platform

# 3. 更新代码
git pull origin main

# 4. 安装依赖
pnpm install

# 5. 构建
pnpm build

# 6. 运行迁移
pnpm --filter=@n8n/cli start migrate

# 7. 启动服务
pm2 start sasa-platform
```

### 数据备份

```bash
# 自动备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/n8n"

# 备份数据库
pg_dump n8n | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# 备份数据目录
tar -czf $BACKUP_DIR/data_$DATE.tar.gz ~/.n8n

# 删除 30 天前的备份
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

---

## 🚨 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查数据库配置
   - 确认数据库服务运行
   - 检查网络连接

2. **Webhook 不工作**
   - 确认 WEBHOOK_URL 配置正确
   - 检查防火墙设置
   - 验证 SSL 证书

3. **队列模式问题**
   - 确认 Redis 运行正常
   - 检查 Redis 连接配置
   - 查看 worker 日志

### 性能优化

```bash
# 增加 Node.js 内存限制
NODE_OPTIONS=--max-old-space-size=8192

# 优化数据库连接池
DB_POSTGRESDB_POOL_SIZE=20

# 调整并发限制
N8N_CONCURRENCY_PRODUCTION_LIMIT=20
```

---

**最后更新**: 2025-11-14
