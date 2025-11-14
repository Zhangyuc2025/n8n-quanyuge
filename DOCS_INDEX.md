# SASA Platform 文档索引

本文档提供 SASA Platform 所有文档的导航和索引。

## 📚 文档分类

### 🎯 项目概览（必读）

| 文档 | 说明 | 用途 |
|------|------|------|
| [README.md](./README.md) | **项目主页** | 快速了解项目、安装和基本使用 |
| [CHANGES_FROM_UPSTREAM.md](./CHANGES_FROM_UPSTREAM.md) | **与原版 n8n 的区别** | 了解 SASA Platform 的核心改造内容 |

### 🛠️ 开发文档

| 文档 | 说明 | 适合角色 |
|------|------|----------|
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 开发指南 | 所有开发者 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 部署指南 | 运维工程师 |
| [CLAUDE.md](./CLAUDE.md) | AI 助手指令 | 使用 Claude 的开发者 |
| [packages/frontend/CLAUDE.md](./packages/frontend/CLAUDE.md) | 前端开发规范 | 前端开发者 |

### 📋 设计文档（详细）

**位置**: [`改造方案文档/`](./改造方案文档/)

这个目录包含了完整的设计阶段文档（356KB），适合深入了解系统设计：

#### 主文档

| 文档 | 说明 |
|------|------|
| [改造方案文档/README.md](./改造方案文档/README.md) | 改造方案总览 |
| [改造方案文档/00-总览与导航.md](./改造方案文档/00-总览与导航.md) | 快速导航和核心概念 |

#### 核心模块设计（modules/）

| 模块 | 文档 | 内容 |
|------|------|------|
| 01 | [多租户架构](./改造方案文档/modules/01-多租户架构.md) | 多租户基础架构设计 |
| 02 | [架构总览](./改造方案文档/modules/02-架构总览.md) | 整体技术架构 |
| 03 | [数据库设计](./改造方案文档/modules/03-数据库设计.md) | 完整数据库表结构 |
| 04 | [节点架构](./改造方案文档/modules/04-节点架构.md) | 四层节点系统 |
| 05 | [AI服务架构](./改造方案文档/modules/05-AI服务架构.md) | AI 托管和计费 |
| 06 | [后端实现](./改造方案文档/modules/06-后端实现.md) | 后端模块设计 |
| 07 | [前端实现](./改造方案文档/modules/07-前端实现.md) | 前端组件设计 |
| 08 | [用户体验](./改造方案文档/modules/08-用户体验.md) | UI/UX 设计 |
| 09 | [实施计划](./改造方案文档/modules/09-实施计划.md) | 分阶段实施 |
| 10 | [验收标准](./改造方案文档/modules/10-验收标准.md) | 功能验收 |
| 11 | [用户认证与初始化](./改造方案文档/modules/11-用户认证与初始化系统.md) | 认证系统设计 |

#### 专项文档

| 文档 | 说明 |
|------|------|
| [03-品牌替换指南](./改造方案文档/03-品牌替换指南.md) | 品牌定制化操作手册 |
| [节点动态化改造总结](./改造方案文档/节点动态化改造总结.md) | 节点系统改造 |
| [Chat-Hub按量计费改造方案](./改造方案文档/Chat-Hub按量计费改造方案.md) | AI 计费设计 |
| [Phase11-用户认证与初始化系统-完成总结](./改造方案文档/Phase11-用户认证与初始化系统-完成总结.md) | 认证系统实现总结 |

#### 遗留问题追踪

| 文档 | 说明 |
|------|------|
| [单租户架构遗留清理计划](./改造方案文档/单租户架构遗留清理计划.md) | 待清理的单租户遗留代码 |
| [凭证系统移除-遗留问题清单](./改造方案文档/凭证系统移除-遗留问题清单.md) | 凭证系统改造遗留问题 |

---

## 🚀 快速导航

### 按角色查找文档

#### 👨‍💼 产品经理 / 项目经理
1. [README.md](./README.md) - 了解项目
2. [CHANGES_FROM_UPSTREAM.md](./CHANGES_FROM_UPSTREAM.md) - 了解改造内容
3. [改造方案文档/00-总览与导航.md](./改造方案文档/00-总览与导航.md) - 详细设计

#### 🏗️ 架构师
1. [CHANGES_FROM_UPSTREAM.md](./CHANGES_FROM_UPSTREAM.md) - 架构变更
2. [改造方案文档/modules/02-架构总览.md](./改造方案文档/modules/02-架构总览.md) - 技术架构
3. [改造方案文档/modules/01-多租户架构.md](./改造方案文档/modules/01-多租户架构.md) - 多租户设计
4. [改造方案文档/modules/03-数据库设计.md](./改造方案文档/modules/03-数据库设计.md) - 数据库设计

#### 💻 后端工程师
1. [DEVELOPMENT.md](./DEVELOPMENT.md) - 开发环境设置
2. [CHANGES_FROM_UPSTREAM.md](./CHANGES_FROM_UPSTREAM.md) - 了解改造
3. [改造方案文档/modules/06-后端实现.md](./改造方案文档/modules/06-后端实现.md) - 后端实现细节
4. [CLAUDE.md](./CLAUDE.md) - 代码规范

#### 🎨 前端工程师
1. [DEVELOPMENT.md](./DEVELOPMENT.md) - 开发环境设置
2. [packages/frontend/CLAUDE.md](./packages/frontend/CLAUDE.md) - 前端规范
3. [改造方案文档/modules/07-前端实现.md](./改造方案文档/modules/07-前端实现.md) - 前端实现细节
4. [改造方案文档/modules/08-用户体验.md](./改造方案文档/modules/08-用户体验.md) - UI/UX 设计

#### 🚀 运维工程师
1. [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
2. [README.md](./README.md#部署选项) - 快速部署

#### 🧪 测试工程师
1. [改造方案文档/modules/10-验收标准.md](./改造方案文档/modules/10-验收标准.md) - 测试标准
2. [DEVELOPMENT.md](./DEVELOPMENT.md#测试指南) - 测试指南

### 按任务查找文档

#### 🆕 新手上手
1. [README.md](./README.md) → 项目概览
2. [CHANGES_FROM_UPSTREAM.md](./CHANGES_FROM_UPSTREAM.md) → 了解差异
3. [DEVELOPMENT.md](./DEVELOPMENT.md) → 开始开发

#### 🔧 添加新功能
1. [DEVELOPMENT.md](./DEVELOPMENT.md#包开发指南) → 开发流程
2. [改造方案文档/modules/](./改造方案文档/modules/) → 相关模块设计
3. [CLAUDE.md](./CLAUDE.md) → 代码规范

#### 🐛 修复 Bug
1. [DEVELOPMENT.md](./DEVELOPMENT.md#调试技巧) → 调试方法
2. 相关模块的设计文档

#### 🚢 部署上线
1. [DEPLOYMENT.md](./DEPLOYMENT.md) → 完整部署指南
2. [DEPLOYMENT.md](./DEPLOYMENT.md#环境变量配置) → 环境配置

#### 📊 了解架构
1. [CHANGES_FROM_UPSTREAM.md](./CHANGES_FROM_UPSTREAM.md) → 核心改造
2. [改造方案文档/modules/02-架构总览.md](./改造方案文档/modules/02-架构总览.md) → 详细架构
3. [改造方案文档/modules/03-数据库设计.md](./改造方案文档/modules/03-数据库设计.md) → 数据库设计

---

## 📂 文档结构总览

```
n8n-quanyuge/
├── README.md                           # 项目主页
├── CHANGES_FROM_UPSTREAM.md            # 与原版差异（核心）
├── DEVELOPMENT.md                      # 开发指南
├── DEPLOYMENT.md                       # 部署指南
├── CLAUDE.md                           # AI 助手指令
├── DOCS_INDEX.md                       # 本文档
│
├── packages/
│   └── frontend/
│       └── CLAUDE.md                   # 前端开发规范
│
└── 改造方案文档/                        # 详细设计文档
    ├── README.md                       # 改造方案总览
    ├── 00-总览与导航.md                 # 快速导航
    ├── 03-品牌替换指南.md               # 品牌定制
    ├── modules/                        # 模块设计文档
    │   ├── 01-多租户架构.md
    │   ├── 02-架构总览.md
    │   ├── 03-数据库设计.md
    │   ├── 04-节点架构.md
    │   ├── 05-AI服务架构.md
    │   ├── 06-后端实现.md
    │   ├── 07-前端实现.md
    │   ├── 08-用户体验.md
    │   ├── 09-实施计划.md
    │   ├── 10-验收标准.md
    │   └── 11-用户认证与初始化系统.md
    │
    ├── 节点动态化改造总结.md
    ├── Chat-Hub按量计费改造方案.md
    ├── Phase11-用户认证与初始化系统-完成总结.md
    ├── 单租户架构遗留清理计划.md
    └── 凭证系统移除-遗留问题清单.md
```

---

## 💡 文档使用建议

### 第一次接触项目？

1. **10 分钟快速了解**: 读 [README.md](./README.md)
2. **30 分钟深入理解**: 读 [CHANGES_FROM_UPSTREAM.md](./CHANGES_FROM_UPSTREAM.md)
3. **开始开发**: 读 [DEVELOPMENT.md](./DEVELOPMENT.md)

### 需要深入了解设计？

阅读 [`改造方案文档/`](./改造方案文档/) 目录下的相关模块文档。

### 需要部署到生产环境？

完整阅读 [DEPLOYMENT.md](./DEPLOYMENT.md)。

### 遇到问题？

1. 检查 [DEVELOPMENT.md](./DEVELOPMENT.md#故障排除)
2. 查看相关模块的设计文档
3. 检查遗留问题清单

---

## 🔄 文档维护

- **核心文档**（根目录）: 由主要维护者更新，保持简洁和最新
- **设计文档**（改造方案文档/）: 作为历史参考，主要在设计阶段使用
- **更新频率**:
  - README.md, DEVELOPMENT.md, DEPLOYMENT.md: 每次重大变更时更新
  - CHANGES_FROM_UPSTREAM.md: 每次架构变更时更新
  - 设计文档: 设计阶段编写，实施后作为参考

---

**维护团队**: SASA Platform Team
**最后更新**: 2025-11-14
