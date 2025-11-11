---
name: Initialize
description: 智能项目初始化 - 全方位分析构建完整知识库体系
model: inherit
tools: [Read, Grep, Glob, WebFetch, Bash, Write, Edit]
mcp-servers: ["context7","smithery-ai-server-sequential-thinking"]
priority: HIGH
---

# 🚀 /Initialize - 智能项目初始化

**语言**: 中文 | **反馈**: 实时卡片 | **执行**: 禁止跳过任何步骤

---

## 📋 知识库结构

```yaml
.claude/guide/
  ├── index.md                    # 文件索引+功能注释(仅结构,禁止无关内容)
  ├── 项目架构.md                  # 技术栈+系统架构图
  ├── 用户规则.md                  # 自定义规则(空文档,用户填写)
  ├── 自定义库.md                  # 项目封装库+禁用原生库说明
  ├── API.md                      # 全部API+复用函数(不区分前后端)
  ├── 网络文档.md                  # 参考文档记录
  ├── 核心流程/[功能名].md         # Top10功能流程图(Mermaid)
  └── 知识沉淀/
      ├── 错误修复/[错误描述].md   # 修复历史
      └── 踩坑记录/[问题描述].md   # 多次错误汇总
```

---

## 📖 文档格式示例

### 索引文档
```md
.claude/guide/
  ├── index.md      # 文件索引
  └── 项目架构.md    # 技术栈架构
    └── 知识沉淀/    # 历史记录
```

### 自定义库
```md
库名: [name] | 路径: [path]
功能: [description]
主要函数: [function1] # [备注], [function2] # [备注]
禁止使用: [原生库列表]
---
```

### API文档
```md
**[API名称]**
地址: [url] | 方法: [GET/POST]
参数: {key: type, ...}
返回: {data: type, ...}
---
```

### 复用函数
```md
**[函数名]**
功能: [description]
参数: [param1: type, param2: type]
返回: {data: type, ...}
---
```

### 核心流程
```md
功能: [name]
流程图:
  A[👆 用户操作] --> B[📩 API调用] --> C[🛠️ 后端处理] --> D{✅ 成功?}
  D -->|是| E[✅ 完成] 
  D -->|否| F[❌ 错误]
涉及API: [url1], [url2]
---
```

### 网络文档
```md
标题: [title]
链接: [url]
功能: [description]
采用: [是/否]
---
```

---

## ⚙️ 执行流程

### 1️⃣ 启动检查
```yaml
环境验证: 检测 package.json|requirements.txt|pom.xml|go.mod → 确认根目录
目录检查: .claude/guide/ 存在 → 询问"重建/增量更新" | 不存在 → 创建完整结构
错误处理: 无权限提示授权 | 非根目录询问路径 | 已存在备份覆盖
```
**自检**: ✓根目录验证 ✓guide目录检查 ✓目录结构创建 → 全"是"进入步骤2

---

### 2️⃣ 项目扫描
```yaml
文件扫描: Glob "**/*.{js,ts,jsx,tsx,vue,py,java,go,rs}" | 排除 node_modules/,dist/,build/,.git/ | 限制5000文件(超出采样)
技术栈识别: package.json→React/Vue | requirements.txt→FastAPI/Django | pom.xml→SpringBoot | go.mod→Gin | Cargo.toml→Rust
目录定位: 复用(src/utils/,src/lib/,common/) | API(src/api/,routes/,controllers/) | 组件(src/components/,src/views/) | 配置(config/,.env*,*.config.js)
超时保护: 单任务>120s → 采样模式(仅扫描src/,api/)
```
**自检**: ✓文件清单 ✓技术栈版本 ✓关键目录 → 全"是"进入步骤3

---

### 3️⃣ 知识库构建

#### 3.1 index.md (文件索引)
```yaml
生成方法: 按目录层级组织 | 从注释/文件名推断功能 | 关键文件标注依赖
验证标准: 覆盖率≥95%
```

#### 3.2 项目架构.md (技术栈架构)
```yaml
内容: 技术栈清单(步骤2.2) | Mermaid架构图 | 目录设计理念
验证: 版本号=配置文件
```

#### 3.3 自定义库.md (封装库)
```yaml
检测策略(优先级):
  1.命名: Glob "**/*{Manager,Client,Service}*.{py,js,ts}"
  2.目录: src/lib/,core/,server/Manager_*
  3.引用: import统计≥3次
  4.特征: 装饰器封装 | 第三方库二次封装(axios,ORM等)

提取字段: 库名(文件名/类名) | 功能(注释/推断) | 路径 | 禁用原生库
禁用规则: DB封装→禁pymysql.connect,mysql.createConnection | HTTP封装→禁fetch直调,requests.get | 装饰器→禁@app.get/@app.post | 认证→禁jwt.encode直调 | 不确定→WebSearch "[库名] 替代原生库"
无库处理: 创建空文档注释"# 项目暂无自定义库"
```

#### 3.4 API.md (API+复用函数)
```yaml
API提取: 
  扫描: routes/,api/,@app.route,@Get/@Post装饰器
  提取: 方法+路径+参数+响应格式 | Grep调用关系(fetch/axios)
  
复用函数提取:
  方法: Grep import/require引用 | 统计≥2次 | Read源码提取签名+参数+返回值
  
合并输出: API列表 + 复用函数列表(统一文档,按类型分组)
```

#### 3.5 核心流程/*.md (流程图)
```yaml
识别: Grep "@click|onClick|addEventListener|@submit" | 追踪 事件→API→后端
绘制: Mermaid(emoji:👆📩🛠️✅❌) | 标注涉及API
限制: Top10功能(防过度分析)
```

#### 3.6 用户规则.md (代码规范)
```yaml
提取: .eslintrc,.prettierrc,tsconfig.json → 代码规范
输出: 禁止重复造轮子(自定义库路径) + 代码规范(配置文件规则)
初次: 创建空文档供用户填写
```

#### 3.7 网络文档.md (参考记录)
```yaml
初次: 创建空文档注释"# 用户提供或参考过的网络文档"
```

**自检**: ✓index(覆盖≥95%) ✓项目架构(版本准确) ✓自定义库 ✓API ✓核心流程(Top10) ✓用户规则 → 全"是"进入步骤4

---

### 4️⃣ 质量验证
```yaml
自动检查:
  ✓ index.md文件数≥扫描数95% | 抽查5个文件有功能注释 | 关键文件有依赖标注
  ✓ 技术栈版本=配置文件 | Mermaid语法可渲染
  ✓ 自定义库文件真实存在 | 功能描述准确 | 禁用字段合理
  ✓ 复用函数源码可追溯 | 签名完整(参数+返回值)
  ✓ API路由无遗漏 | 包含真实请求/响应格式
  ✓ 文档格式符合示例规范

失败处理: 输出错误详情 + 询问是否继续
```
**自检**: ✓index覆盖 ✓技术栈准确 ✓自定义库真实 ✓函数真实 ✓API完整 ✓格式规范 → 全"是"进入步骤5

---

### 5️⃣ 生成报告
```
┏━━━━━━━━━━━━━━━━━━━┓
┃  ✅ 初始化完成    ┃
┗━━━━━━━━━━━━━━━━━━━┛

📊 扫描: [X]文件([Y]前端+[Z]后端+[N]配置)
🏗️ 技术栈: [框架@版本] + [数据库] + [工具链]
📚 知识库: [N]文档 | [M]API | [K]函数 | [L]流程 | [P]自定义库

⏱️ 耗时: [X]分[Y]秒 | 📁 位置: .claude/guide/

💡 下一步: /dev:feature 开发 | /analysis-error 分析
```

---

## 🚫 执行规则

```yaml
禁止: 猜测数据 | 占位符(TODO/示例) | 跳过自检 | 遗漏文件 | 格式不规范
强制: 实时反馈 | 覆盖率≥95% | 版本精确 | 数据可追溯源码
违规: 初始化标记失败,必须重新执行
```

---

> **核心**: 100%真实 | 0容忍猜测 | 步步验证