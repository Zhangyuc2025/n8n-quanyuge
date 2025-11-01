# n8n 内部多租户 Docker 镜像

> 本镜像基于多租户改造版 n8n，仅供公司内部测试与部署使用。请勿将镜像或文档对外传播。

## 快速启动（SQLite + 本地持久化）

```bash
docker volume create n8n_data

docker run -it --rm \
  --name n8n-internal \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  <INTERNAL_REGISTRY>/n8n:latest
```

首次启动时会自动生成凭证加密密钥并初始化数据库。持久化 `n8n_data` 卷，可避免密钥丢失导致的凭证解密失败。

## 连接内部 PostgreSQL（推荐）

```bash
docker run -it --rm \
  --name n8n-internal \
  -p 5678:5678 \
  -e DB_TYPE=postgresdb \
  -e DB_POSTGRESDB_DATABASE=<DB_NAME> \
  -e DB_POSTGRESDB_HOST=<DB_HOST> \
  -e DB_POSTGRESDB_PORT=<DB_PORT> \
  -e DB_POSTGRESDB_USER=<DB_USER> \
  -e DB_POSTGRESDB_PASSWORD=<DB_PASSWORD> \
  -e DB_POSTGRESDB_SCHEMA=public \
  -v n8n_data:/home/node/.n8n \
  <INTERNAL_REGISTRY>/n8n:latest
```

> 提示：如需从 Neon PostgreSQL 读取参数，可通过 `.env` 文件集中管理，再在 `docker run` 中传递 `--env-file`.

## 开发调试建议

- 仅在内网环境暴露 5678 端口，不要映射到公网
- 若需临时 Webhook 调试，可使用 `pnpm start:tunnel` 或内部隧道服务
- 更新镜像前，先检查 `二开改造文档/MULTITENANT_PROGRESS_V2.md` 中的 Breaking Changes 记录

## 许可与支持

镜像仅供内部团队使用，不再遵循上游开源分发流程。更多部署细节请联系平台工程组。
