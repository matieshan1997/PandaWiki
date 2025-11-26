# PandaWiki 项目分析报告

## 项目概述

PandaWiki 是一款由 AI 大模型驱动的开源知识库搭建系统，帮助用户快速构建智能化的产品文档、技术文档、FAQ、博客系统。项目提供 AI 创作、AI 问答、AI 搜索等核心功能。

## 技术架构

### 整体架构
- **架构模式**: 微服务架构，基于 Docker Compose 部署
- **前后端分离**: Go 后端 + React/Next.js 前端
- **数据存储**: PostgreSQL + Redis + MinIO + Qdrant(向量数据库)
- **消息队列**: NATS
- **反向代理**: Caddy + Nginx

### 后端技术栈 (Go)
- **框架**: Echo Web 框架
- **数据库**: GORM + PostgreSQL
- **缓存**: Redis
- **对象存储**: MinIO (S3兼容)
- **向量数据库**: Qdrant (用于RAG检索)
- **消息队列**: NATS
- **AI集成**: 支持多种LLM模型 (OpenAI, Gemini, DeepSeek, Ollama等)
- **依赖注入**: Google Wire
- **API文档**: Swagger
- **认证**: JWT
- **日志**: 结构化日志
- **监控**: OpenTelemetry

### 前端技术栈
#### 管理后台 (web/admin)
- **框架**: React 19 + Vite
- **UI库**: Material-UI (MUI)
- **状态管理**: Redux Toolkit
- **富文本编辑**: TipTap
- **图表**: ECharts
- **包管理**: pnpm

#### 用户前台 (web/app)
- **框架**: Next.js 15
- **UI库**: Material-UI (MUI)
- **Markdown渲染**: react-markdown
- **图表**: Mermaid
- **包管理**: pnpm

## 核心功能模块

### 1. 知识库管理
- **创建知识库**: 支持创建多个独立的知识库
- **访问控制**: 支持端口、SSL、域名等访问设置
- **数据集成**: 自动创建向量数据库数据集
- **Web应用**: 为每个知识库自动创建对应的Web应用

### 2. 文档管理 (Node)
- **文档CRUD**: 创建、读取、更新、删除文档
- **富文本编辑**: 支持Markdown和HTML格式
- **文档层级**: 支持文档树形结构
- **版本管理**: 文档发布和版本控制
- **可见性控制**: 公开/私有文档设置

### 3. AI功能
#### AI问答 (Chat)
- **多模型支持**: OpenAI、Gemini、DeepSeek、Ollama等
- **RAG检索**: 基于向量数据库的文档检索
- **流式响应**: 实时流式AI回答
- **对话历史**: 完整的对话记录和管理
- **敏感词过滤**: 内容安全检查

#### AI创作 (Creation)
- **内容生成**: AI辅助文档创作
- **多种创作模式**: 支持不同的创作场景

### 4. 用户管理
- **用户认证**: JWT token认证
- **角色权限**: 管理员/普通用户角色
- **用户CRUD**: 完整的用户管理功能
- **默认管理员**: 自动创建admin用户

### 5. 第三方集成
#### 文档导入
- **飞书文档**: 支持飞书空间和文档导入
- **Notion**: 支持Notion页面导入
- **Confluence**: 支持Confluence导出文件解析
- **语雀**: 支持语雀文档导入
- **思源笔记**: 支持思源笔记导入
- **Wiki.js**: 支持Wiki.js导出文件解析
- **EPUB**: 支持EPUB电子书转换

#### 内容抓取
- **网页抓取**: 根据URL抓取网页内容
- **RSS订阅**: 支持RSS feed导入
- **Sitemap**: 支持网站地图批量导入

#### 机器人集成
- **钉钉机器人**: 支持钉钉聊天机器人
- **飞书机器人**: 支持飞书应用集成
- **企业微信**: 支持企业微信机器人
- **微信公众号**: 支持微信公众号集成

### 6. 应用管理
- **多应用支持**: 一个知识库可创建多个应用
- **应用配置**: 标题、描述、图标等自定义设置
- **Web应用**: 自动生成知识库网站

### 7. 统计分析
- **使用统计**: 文档访问、AI对话等数据统计
- **性能监控**: 系统性能和使用情况分析

### 8. 评论系统
- **文档评论**: 支持文档评论功能
- **评论管理**: 评论的增删改查

## 项目结构

```
PandaWiki/
├── backend/                 # Go后端
│   ├── api/                # API接口定义
│   ├── cmd/                # 应用入口
│   │   ├── api/           # API服务入口
│   │   ├── consumer/      # 消息消费者入口
│   │   └── migrate/       # 数据库迁移入口
│   ├── config/            # 配置管理
│   ├── domain/            # 领域模型
│   ├── handler/           # HTTP处理器
│   ├── usecase/           # 业务逻辑层
│   ├── repo/              # 数据访问层
│   ├── store/             # 存储层实现
│   ├── middleware/        # 中间件
│   ├── migration/         # 数据库迁移
│   └── utils/             # 工具函数
├── web/                    # 前端
│   ├── admin/             # 管理后台 (React + Vite)
│   └── app/               # 用户前台 (Next.js)
├── sdk/                    # SDK
│   └── rag/               # RAG相关SDK
├── docker-compose.yml      # Docker编排文件
└── images/                # 项目图片资源
```

## 如何启动项目

### 方式一：一键安装脚本（推荐）
```bash
# 使用官方安装脚本（需要root权限）
bash -c "$(curl -fsSLk https://release.baizhi.cloud/panda-wiki/manager.sh)"
```

### 方式二：Docker Compose 部署
1. **环境要求**
   - Docker 20.x+
   - Docker Compose
   - Linux系统

2. **克隆项目**
   ```bash
   git clone https://github.com/chaitin/PandaWiki.git
   cd PandaWiki
   ```

3. **配置环境变量**
   ```bash
   # 创建.env文件，配置必要的环境变量
   cp .env.example .env
   # 编辑.env文件，设置数据库密码、JWT密钥等
   ```

4. **启动服务**
   ```bash
   docker-compose up -d
   ```

### 方式三：开发环境启动

#### 后端开发
```bash
cd backend
# 安装依赖
go mod tidy
# 生成代码
make generate
# 启动API服务
go run cmd/api/main.go
# 启动消费者服务
go run cmd/consumer/main.go
```

#### 前端开发
```bash
# 管理后台
cd web/admin
pnpm install
pnpm dev

# 用户前台
cd web/app
pnpm install
pnpm dev
```

## 服务组件说明

| 服务 | 端口 | 说明 |
|------|------|------|
| nginx | 2443 | 反向代理，管理后台入口 |
| api | 8080 | 后端API服务 |
| app | 3000 | 用户前台应用 |
| postgres | 5432 | 主数据库 |
| redis | 6379 | 缓存数据库 |
| minio | 9000 | 对象存储 |
| qdrant | 6333 | 向量数据库 |
| nats | 4222 | 消息队列 |
| raglite | 8000 | RAG服务 |
| crawler | 8080 | 爬虫服务 |

## 数据库初始化机制

### SQL初始化架构

PandaWiki 采用**双重数据库迁移机制**，没有传统的初始化SQL脚本，而是使用现代化的代码驱动初始化方式：

#### 1. 基础SQL迁移（golang-migrate）
- **位置**: `backend/store/pg/migration/` 目录
- **工具**: 使用 `golang-migrate` 库
- **文件格式**: `000001_init.up.sql` / `000001_init.down.sql`
- **内容**: 仅包含表结构创建，不包含数据插入
- **执行时机**: 容器启动时自动执行

```sql
-- 示例：创建用户表
CREATE TABLE "public"."users" (
    "id" text NOT NULL,
    "account" text NULL,
    "password" text NULL,
    "role" text NOT NULL DEFAULT 'user',
    "created_at" timestamptz NULL,
    "last_access" timestamptz NULL,
    PRIMARY KEY ("id")
);
```

#### 2. 应用级数据迁移（Go代码）
- **位置**: `backend/migration/` 目录
- **执行方式**: Go代码实现的迁移函数
- **管理**: 通过 `migration.Manager` 管理
- **记录**: 在 `migrations` 表中记录执行状态

### 初始化流程

#### 容器启动顺序
```bash
# Dockerfile中的启动命令
CMD ["sh", "-c", "/app/panda-wiki-migrate && /app/panda-wiki-api"]
```

**执行步骤**：
1. **panda-wiki-migrate** - 执行Go代码迁移
2. **panda-wiki-api** - 启动API服务

#### API服务启动时的数据库初始化
1. **连接数据库**: 使用GORM连接PostgreSQL
2. **创建raglite数据库**: 自动检查并创建RAG服务所需的数据库
3. **执行SQL迁移**: 运行所有pending的migration文件
4. **Go代码迁移**: 执行应用级数据迁移
5. **初始用户创建**: 根据环境变量创建管理员用户

### 初始用户创建机制

#### 代码驱动的用户初始化
- **触发条件**: 当环境变量 `ADMIN_PASSWORD` 不为空时
- **执行位置**: `backend/usecase/user.go` 的 `NewUserUsecase` 函数
- **用户信息**:
  - 用户名: `admin` (硬编码)
  - 密码: 从 `ADMIN_PASSWORD` 环境变量读取
  - 角色: `admin` (管理员权限)

```go
// 自动创建管理员用户
if config.AdminPassword != "" {
    if err := repo.UpsertDefaultUser(context.Background(), &domain.User{
        ID:       uuid.New().String(),
        Account:  "admin",
        Password: config.AdminPassword,
        Role:     consts.UserRoleAdmin,
    }); err != nil {
        return nil, fmt.Errorf("failed to create default user: %w", err)
    }
}
```

#### 智能用户管理特性
- **Upsert机制**: 如果admin用户已存在，则更新密码；不存在则创建新用户
- **密码加密**: 使用bcrypt自动加密存储
- **幂等性**: 重复启动不会创建重复用户
- **密码更新**: 重启容器时可通过环境变量更新管理员密码

### 环境变量配置

#### 关键环境变量
```bash
# 数据库配置
POSTGRES_PASSWORD=panda-wiki-password

# 管理员配置（必须设置）
ADMIN_PASSWORD=your-admin-password

# JWT配置
JWT_SECRET=your-jwt-secret

# 其他服务密码
REDIS_PASSWORD=redis-password
NATS_PASSWORD=nats-password
S3_SECRET_KEY=minio-secret-key
QDRANT_API_KEY=qdrant-api-key
```

### 核心数据库表结构

#### 主要业务表
- **users** - 用户表（包含角色权限）
- **knowledge_bases** - 知识库表
- **nodes** - 文档节点表
- **node_releases** - 文档版本表
- **kb_releases** - 知识库发布版本表
- **apps** - 应用配置表
- **conversations** - 对话记录表
- **conversation_messages** - 对话消息表
- **models** - AI模型配置表

#### 系统管理表
- **migrations** - Go代码迁移记录表
- **auth_configs** - 认证配置表
- **settings** - 系统设置表
- **licenses** - 许可证表

### 设计优势

1. **环境友好**: 不同环境可以设置不同的管理员密码
2. **安全性**: 密码通过环境变量传递，不硬编码在代码中
3. **灵活性**: 支持密码更新，重启容器即可修改管理员密码
4. **自动化**: 无需手动执行SQL脚本，完全自动化初始化
5. **版本控制**: 支持数据库结构的版本化管理和回滚
6. **容器友好**: 非常适合容器化部署和云原生环境

## 初始配置

1. **访问管理后台**: http://your-server:2443
2. **默认账号**: admin / (通过ADMIN_PASSWORD环境变量设置的密码)
3. **配置AI模型**: 首次登录需要配置Chat模型
4. **创建知识库**: 配置完成后创建第一个知识库
5. **开始使用**: 可以开始创建文档和使用AI功能

## 许可证

项目采用 GNU Affero General Public License v3.0 (AGPL-3.0) 许可证。
