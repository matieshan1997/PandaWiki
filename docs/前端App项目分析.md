# PandaWiki 前端 App 项目分析文档

## 📋 目录

- [1. 项目概述](#1-项目概述)
- [2. 技术栈](#2-技术栈)
- [3. 项目结构](#3-项目结构)
- [4. 核心架构](#4-核心架构)
- [5. 路由系统](#5-路由系统)
- [6. 状态管理](#6-状态管理)
- [7. 组件体系](#7-组件体系)
- [8. API 集成](#8-api-集成)
- [9. 主要功能模块](#9-主要功能模块)
- [10. 构建与部署](#10-构建与部署)

---

## 1. 项目概述

### 1.1 项目定位

**PandaWiki App** 是 PandaWiki 知识库系统的**用户前台应用**，为最终用户提供知识库浏览、文档查看、AI 问答等功能。

```
┌─────────────────────────────────────────────────────────┐
│                    PandaWiki 系统                        │
│  ┌──────────────┐         ┌──────────────────────────┐ │
│  │  Admin 后台  │         │      App 前台 (本项目)    │ │
│  │  (管理员)    │         │      (最终用户)          │ │
│  │              │         │                          │ │
│  │ - 知识库管理 │         │ - 文档浏览               │ │
│  │ - 文档编辑   │         │ - AI 问答                │ │
│  │ - 系统配置   │         │ - 搜索                   │ │
│  │ - 用户管理   │         │ - 评论反馈               │ │
│  └──────────────┘         └──────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 1.2 核心特性

- ✅ **服务端渲染 (SSR)**: 基于 Next.js 15，支持 SEO 优化
- ✅ **多知识库支持**: 通过 KB_ID 机制支持多个独立知识库
- ✅ **响应式设计**: 支持桌面端和移动端
- ✅ **AI 问答**: 集成 AI 对话功能
- ✅ **实时搜索**: 文档搜索和 AI 搜索
- ✅ **主题切换**: 支持亮色/暗色主题
- ✅ **Markdown 渲染**: 支持富文本、代码高亮、Mermaid 图表
- ✅ **评论系统**: 文档评论和反馈
- ✅ **水印功能**: 可配置的页面水印

---

## 2. 技术栈

### 2.1 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 16.0.0 | React 服务端渲染框架 |
| **React** | 19.x | UI 框架 |
| **TypeScript** | 5.x | 类型系统 |
| **Material-UI** | 7.x | UI 组件库 |

### 2.2 主要依赖

#### UI 相关
- `@mui/material-nextjs`: Material-UI Next.js 集成
- `@emotion/cache`: CSS-in-JS 样式缓存
- `react-photo-view`: 图片预览
- `html-to-image`: HTML 转图片

#### Markdown 渲染
- `react-markdown`: Markdown 渲染
- `markdown-it`: Markdown 解析器
- `remark-gfm`: GitHub Flavored Markdown
- `remark-math`: 数学公式支持
- `rehype-katex`: KaTeX 数学公式渲染
- `highlight.js`: 代码高亮
- `mermaid`: 流程图渲染

#### 工具库
- `ahooks`: React Hooks 工具库
- `axios`: HTTP 客户端
- `js-cookie`: Cookie 管理
- `uuid`: UUID 生成

#### AI 相关
- `@cap.js/widget`: AI 对话组件
- `@emoji-mart/react`: Emoji 选择器

#### 监控
- `@sentry/nextjs`: 错误监控和性能追踪

### 2.3 开发工具

- **包管理器**: pnpm 10.12.1
- **代码规范**: ESLint + Prettier
- **API 生成**: @ctzhian/cx-swagger-api
- **构建工具**: Next.js 内置 (Turbopack/Webpack)

---

## 3. 项目结构

### 3.1 目录结构

```
web/app/
├── public/                    # 静态资源
│   ├── cap@0.0.6/            # AI 对话组件资源
│   ├── images/               # 图片资源
│   ├── favicon.png           # 网站图标
│   ├── widget-bot.css        # Widget 样式
│   └── widget-bot.js         # Widget 脚本
├── src/                       # 源代码
│   ├── app/                  # Next.js App Router
│   │   ├── (pages)/         # 页面路由组
│   │   │   ├── (doc)/       # 文档相关页面
│   │   │   │   ├── home/    # 首页
│   │   │   │   ├── node/    # 文档详情
│   │   │   │   ├── editor/  # 编辑器
│   │   │   │   └── welcome/ # 欢迎页
│   │   │   ├── auth/        # 认证页面
│   │   │   │   └── login/   # 登录页
│   │   │   └── layout.tsx   # 页面布局
│   │   ├── feedback/        # 反馈页面
│   │   ├── h5-chat/         # 移动端聊天
│   │   ├── widget/          # Widget 嵌入
│   │   ├── layout.tsx       # 根布局
│   │   ├── globals.css      # 全局样式
│   │   └── markdown.css     # Markdown 样式
│   ├── assets/              # 资源文件
│   │   ├── fonts/           # 字体文件
│   │   ├── images/          # 图片资源
│   │   └── type/            # TypeScript 类型定义
│   ├── components/          # 公共组件
│   │   ├── QaModal/         # AI 问答弹窗
│   │   ├── commentInput/    # 评论输入
│   │   ├── docFab/          # 文档浮动按钮
│   │   ├── emoji/           # Emoji 选择器
│   │   ├── error/           # 错误页面
│   │   ├── feedback/        # 反馈组件
│   │   ├── footer/          # 页脚
│   │   ├── header/          # 页头
│   │   ├── icons/           # 图标组件
│   │   ├── markdown/        # Markdown 渲染器
│   │   ├── markdown2/       # Markdown 渲染器 v2
│   │   ├── menuSelect/      # 菜单选择
│   │   └── watermark/       # 水印组件
│   ├── constant/            # 常量定义
│   ├── hooks/               # 自定义 Hooks
│   │   ├── useCopy.tsx      # 复制功能
│   │   └── useSmartScroll.ts # 智能滚动
│   ├── provider/            # Context Providers
│   │   ├── index.tsx        # 全局状态管理
│   │   └── themeStore.tsx   # 主题状态
│   ├── request/             # API 请求
│   │   ├── ShareApp.ts      # 应用相关 API
│   │   ├── ShareAuth.ts     # 认证 API
│   │   ├── ShareChat.ts     # 聊天 API
│   │   ├── ShareNode.ts     # 文档 API
│   │   ├── httpClient.ts    # HTTP 客户端
│   │   └── types.ts         # API 类型定义
│   ├── utils/               # 工具函数
│   │   ├── cookie.ts        # Cookie 工具
│   │   ├── fetch.ts         # Fetch 封装
│   │   └── getServerHeader.ts # 服务端 Header 获取
│   ├── views/               # 页面视图组件
│   │   ├── auth/            # 认证视图
│   │   ├── chat/            # 聊天视图
│   │   ├── editor/          # 编辑器视图
│   │   ├── feedback/        # 反馈视图
│   │   ├── h5Chat/          # 移动端聊天视图
│   │   ├── home/            # 首页视图
│   │   ├── node/            # 文档视图
│   │   └── widget/          # Widget 视图
│   ├── theme.ts             # 主题配置
│   └── proxy.ts             # 代理配置
├── api-templates/           # API 生成模板
├── dist/                    # 构建输出
├── next.config.ts           # Next.js 配置
├── tsconfig.json            # TypeScript 配置
├── package.json             # 项目配置
├── Dockerfile               # Docker 镜像
└── README.md                # 项目说明
```

### 3.2 关键文件说明

| 文件 | 作用 |
|------|------|
| `src/app/layout.tsx` | 根布局，处理全局状态、主题、元数据 |
| `src/provider/index.tsx` | 全局状态管理 Provider |
| `src/request/httpClient.ts` | HTTP 客户端封装，处理请求/响应 |
| `src/theme.ts` | Material-UI 主题配置 |
| `next.config.ts` | Next.js 配置，包括 Sentry、代理等 |
| `swagger.api.config.ts` | API 自动生成配置 |

---

## 4. 核心架构

### 4.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js App Router                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   Server Components                     │ │
│  │  - layout.tsx (SSR 数据获取)                           │ │
│  │  - page.tsx (页面渲染)                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↓                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Client Components                      │ │
│  │  - StoreProvider (全局状态)                            │ │
│  │  - ThemeProvider (主题)                                │ │
│  │  - Views (页面视图)                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↓                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    API Layer                            │ │
│  │  - httpClient (HTTP 封装)                              │ │
│  │  - ShareApp, ShareNode, ShareChat (API 模块)          │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↓                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Backend API                            │ │
│  │  - /share/v1/* (知识库 API)                            │ │
│  │  - X-KB-ID Header (知识库标识)                         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 KB_ID 机制

PandaWiki 支持多知识库，通过 **KB_ID** 机制实现：

```
用户访问 → Caddy (注入 X-KB-ID) → Next.js App → 后端 API
                                      ↓
                              读取 X-KB-ID Header
                                      ↓
                              返回对应知识库数据
```

**关键代码**:

<augment_code_snippet path="web/app/src/app/layout.tsx" mode="EXCERPT">
````typescript
const Layout = async ({ children }: { children: React.ReactNode }) => {
  // 获取知识库信息和用户认证信息
  const [kbDetailResolve, authInfoResolve] = await Promise.allSettled([
    getShareV1AppWebInfo(),  // 通过 X-KB-ID 获取知识库配置
    getShareProV1AuthInfo({}),
  ]);
  
  const kbDetail = kbDetailResolve.status === 'fulfilled' ? kbDetailResolve.value : undefined;
  const authInfo = authInfoResolve.status === 'fulfilled' ? authInfoResolve.value : undefined;
  
  return (
    <StoreProvider kbDetail={kbDetail} authInfo={authInfo} themeMode={themeMode} mobile={isMobile}>
      {children}
    </StoreProvider>
  );
};
````
</augment_code_snippet>

### 4.3 服务端渲染 (SSR)

Next.js 15 App Router 采用 **React Server Components**:

- ✅ **layout.tsx**: 服务端组件，在服务器获取数据
- ✅ **page.tsx**: 服务端组件，渲染页面
- ✅ **'use client'**: 客户端组件，处理交互

**优势**:
- 更快的首屏加载
- 更好的 SEO
- 减少客户端 JavaScript 体积

---

## 5. 路由系统

### 5.1 Next.js App Router

采用 **文件系统路由**，基于目录结构自动生成路由：

```
src/app/
├── (pages)/              # 路由组 (不影响 URL)
│   ├── (doc)/           # 文档相关路由组
│   │   ├── home/        # /home
│   │   ├── node/        # /node
│   │   │   └── [id]/    # /node/:id (动态路由)
│   │   ├── editor/      # /editor
│   │   │   └── [id]/    # /editor/:id
│   │   └── welcome/     # /welcome
│   ├── auth/            # 认证路由
│   │   └── login/       # /auth/login
│   └── layout.tsx       # 页面布局
├── feedback/            # /feedback
├── h5-chat/             # /h5-chat
├── widget/              # /widget
└── layout.tsx           # 根布局
```

### 5.2 路由组 (Route Groups)

使用 `(pages)` 和 `(doc)` 路由组组织代码，**不影响 URL 结构**：

- `(pages)`: 所有页面的父级布局
- `(doc)`: 文档相关页面的布局

### 5.3 动态路由

```typescript
// src/app/(pages)/(doc)/node/[id]/page.tsx
export default async function NodePage({ params }: { params: { id: string } }) {
  const nodeId = params.id;
  // 根据 nodeId 获取文档数据
}
```

### 5.4 主要路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 重定向到 `/home` 或 `/welcome` |
| `/home` | 知识库首页 | 文档列表和目录 |
| `/node/:id` | 文档详情 | 显示文档内容 |
| `/editor/:id` | 编辑器 | 文档编辑 (需权限) |
| `/welcome` | 欢迎页 | 知识库介绍 |
| `/auth/login` | 登录页 | 用户登录 |
| `/feedback` | 反馈页 | 用户反馈 |
| `/h5-chat` | 移动端聊天 | H5 聊天界面 |
| `/widget` | Widget | 嵌入式组件 |

---

## 6. 状态管理

### 6.1 Context API

使用 **React Context** 进行全局状态管理，无需 Redux：

<augment_code_snippet path="web/app/src/provider/index.tsx" mode="EXCERPT">
````typescript
interface StoreContextType {
  authInfo?: AuthInfo;           // 用户认证信息
  widget?: WidgetInfo;           // Widget 配置
  kbDetail?: KBDetail;           // 知识库详情
  catalogShow?: boolean;         // 目录显示状态
  tree?: ITreeItem[];            // 文档树
  themeMode?: 'light' | 'dark';  // 主题模式
  mobile?: boolean;              // 是否移动端
  nodeList?: NodeListItem[];     // 文档列表
  catalogWidth?: number;         // 目录宽度
  qaModalOpen?: boolean;         // AI 问答弹窗状态
  // ... setters
}

export const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
````
</augment_code_snippet>

### 6.2 主题管理

独立的主题状态管理：

```typescript
// src/provider/themeStore.tsx
export const ThemeStoreProvider = ({ children, themeMode }: Props) => {
  const [mode, setMode] = useState<'light' | 'dark'>(themeMode);
  
  const toggleTheme = () => {
    const newMode = mode === 'light' | 'dark';
    setMode(newMode);
    // 保存到 Cookie
    document.cookie = `theme_mode=${newMode}; path=/; max-age=31536000`;
  };
  
  return (
    <ThemeProvider theme={createTheme(mode)}>
      {children}
    </ThemeProvider>
  );
};
```

### 6.3 状态使用示例

```typescript
'use client';

import { useStore } from '@/provider';

export default function MyComponent() {
  const { kbDetail, catalogShow, setCatalogShow, mobile } = useStore();
  
  return (
    <div>
      <h1>{kbDetail?.name}</h1>
      {!mobile && (
        <button onClick={() => setCatalogShow(!catalogShow)}>
          Toggle Catalog
        </button>
      )}
    </div>
  );
}
```

---

## 7. 组件体系

### 7.1 组件分类

#### 布局组件
- `header`: 页头导航
- `footer`: 页脚信息
- `docFab`: 文档浮动按钮 (AI 问答、反馈等)

#### 功能组件
- `QaModal`: AI 问答弹窗
- `commentInput`: 评论输入框
- `emoji`: Emoji 选择器
- `menuSelect`: 菜单选择器
- `watermark`: 水印组件

#### 内容组件
- `markdown`: Markdown 渲染器 (v1)
- `markdown2`: Markdown 渲染器 (v2，支持增量渲染)
  - `incrementalRenderer`: 增量渲染
  - `mermaidRenderer`: Mermaid 图表
  - `imageRenderer`: 图片渲染
  - `thinkingRenderer`: 思考过程渲染

#### 错误组件
- `error`: 错误页面
- `feedback`: 反馈组件

### 7.2 Markdown 渲染

支持两个版本的 Markdown 渲染器：

**Markdown v1** (`components/markdown`):
- 基于 `markdown-it`
- 支持代码高亮、Mermaid、KaTeX
- 用于静态文档渲染

**Markdown v2** (`components/markdown2`):
- 基于 `react-markdown`
- 支持增量渲染 (流式输出)
- 用于 AI 对话渲染

### 7.3 AI 问答组件

<augment_code_snippet path="web/app/src/components/QaModal/index.tsx" mode="EXCERPT">
````typescript
export default function QaModal() {
  const { qaModalOpen, setQaModalOpen, kbDetail } = useStore();
  const [activeTab, setActiveTab] = useState<'ai' | 'search'>('ai');
  
  return (
    <Modal open={qaModalOpen} onClose={() => setQaModalOpen(false)}>
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
        <Tab label="AI 问答" value="ai" />
        <Tab label="搜索文档" value="search" />
      </Tabs>
      
      {activeTab === 'ai' ? (
        <AiQaContent />  // AI 对话界面
      ) : (
        <SearchDocContent />  // 文档搜索界面
      )}
    </Modal>
  );
}
````
</augment_code_snippet>

---

## 8. API 集成

### 8.1 HTTP 客户端

基于 Swagger 自动生成的 API 客户端：

<augment_code_snippet path="web/app/src/request/httpClient.ts" mode="EXCERPT">
````typescript
export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  
  private request = async <T = any>({
    path,
    method,
    query,
    body,
    secure,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T>> => {
    // 1. 构建 URL
    const requestUrl = this.baseUrl + path + this.toQueryString(query);
    
    // 2. 构建 Headers
    const headers = new Headers(params.headers);
    if (secure) {
      // 添加认证 Token
      const token = getCookie('token');
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    
    // 3. 发送请求
    const response = await fetch(requestUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    // 4. 处理响应
    const data = await response.json();
    if (!data.success) {
      // 错误处理
      if (response.status === 401) {
        redirectToLogin();
      }
      throw new Error(data.message);
    }
    
    return { ...response, data: data.data };
  };
}
````
</augment_code_snippet>

### 8.2 API 模块

| 模块 | 文件 | 说明 |
|------|------|------|
| **应用** | `ShareApp.ts` | 知识库配置、Web 应用信息 |
| **认证** | `ShareAuth.ts` | 登录、注册、用户信息 |
| **文档** | `ShareNode.ts` | 文档列表、详情、树形结构 |
| **聊天** | `ShareChat.ts` | AI 对话、流式响应 |
| **搜索** | `ShareChatSearch.ts` | 文档搜索、AI 搜索 |
| **评论** | `ShareComment.ts` | 评论列表、添加评论 |
| **文件** | `ShareFile.ts` | 文件上传、下载 |
| **统计** | `ShareStat.ts` | 访问统计 |
| **Widget** | `Widget.ts` | Widget 配置 |
| **微信** | `Wechat.ts` | 微信集成 |

### 8.3 API 自动生成

使用 `@ctzhian/cx-swagger-api` 从 Swagger 文档自动生成 API 代码：

```bash
# 生成 API
pnpm api
```

配置文件 `swagger.api.config.ts`:
```typescript
export default {
  url: process.env.SWAGGER_BASE_URL + '/swagger/doc.json',
  authorization: process.env.SWAGGER_AUTH_TOKEN,
  outputDir: './src/request',
  templates: './api-templates',
};
```

---

## 9. 主要功能模块

### 9.1 文档浏览

**页面**: `/node/:id`

**功能**:
- 文档内容渲染 (Markdown/HTML)
- 文档目录导航
- 代码高亮
- Mermaid 图表
- 数学公式 (KaTeX)
- 图片预览
- 文档评论
- 相关文档推荐

**关键组件**:
- `views/node/DocContent.tsx`: 文档内容
- `views/node/Catalog.tsx`: 文档目录
- `views/node/DocAnchor.tsx`: 锚点导航
- `components/markdown`: Markdown 渲染

### 9.2 AI 问答

**入口**: 浮动按钮 (docFab) → AI 问答弹窗

**功能**:
- AI 对话
- 流式响应
- 历史记录
- 文档引用
- 复制/分享

**关键组件**:
- `components/QaModal/AiQaContent.tsx`: AI 对话界面
- `components/markdown2/incrementalRenderer.tsx`: 流式渲染

**API**:
```typescript
// 发送消息
postShareV1ConversationChat({
  conversation_id: conversationId,
  question: userInput,
  stream: true,  // 流式响应
});

// 处理流式响应
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // 解析 SSE 数据
  const text = new TextDecoder().decode(value);
  // 增量渲染
}
```

### 9.3 文档搜索

**入口**: 浮动按钮 → 搜索文档

**功能**:
- 关键词搜索
- AI 语义搜索
- 搜索结果高亮
- 快速跳转

**关键组件**:
- `components/QaModal/SearchDocContent.tsx`

**API**:
```typescript
// 搜索文档
getShareV1ChatSearchDoc({
  query: searchText,
  kb_id: kbId,
});
```

### 9.4 评论系统

**位置**: 文档底部

**功能**:
- 查看评论
- 添加评论
- Emoji 表情
- 评论通知

**关键组件**:
- `components/commentInput`
- `components/emoji`

**API**:
```typescript
// 获取评论列表
getShareV1CommentList({ node_id: nodeId });

// 添加评论
postShareV1Comment({
  node_id: nodeId,
  content: commentText,
});
```

### 9.5 主题切换

**位置**: 页头

**功能**:
- 亮色/暗色主题切换
- 主题持久化 (Cookie)
- 系统主题跟随

**关键组件**:
- `components/header/themeSwitch.tsx`
- `provider/themeStore.tsx`

### 9.6 水印功能

**功能**:
- 可配置的页面水印
- 支持文本、图片
- 防截图保护

**关键组件**:
- `components/watermark`

**配置**:
```typescript
// 知识库配置中的水印设置
kbDetail.settings.watermark_settings = {
  enabled: true,
  text: '机密文档',
  opacity: 0.1,
};
```

---

## 10. 构建与部署

### 10.1 开发环境

```bash
# 安装依赖
pnpm install

# 启动开发服务器 (端口 3010)
pnpm dev

# 环境变量配置 (.env.local)
TARGET=http://localhost:8000              # 后端 API 地址
STATIC_FILE_TARGET=http://localhost:9000  # 静态文件地址
DEV_KB_ID=your-kb-id                      # 开发环境知识库 ID
```

### 10.2 生产构建

```bash
# 构建
pnpm build

# 启动生产服务器
pnpm start
```

**构建配置** (`next.config.ts`):
```typescript
const nextConfig: NextConfig = {
  distDir: 'dist',              // 输出目录
  output: 'standalone',         // 独立输出模式
  reactStrictMode: false,
  transpilePackages: ['mermaid'],  // 转译 mermaid
};
```

### 10.3 Docker 部署

```bash
# 构建镜像
docker build -t panda-wiki-app .

# 运行容器
docker run -p 3000:3000 panda-wiki-app
```

**Dockerfile**:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/standalone ./
EXPOSE 3000
CMD ["node", "server.js"]
```

### 10.4 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `TARGET` | 后端 API 地址 | `http://localhost:8000` |
| `STATIC_FILE_TARGET` | 静态文件地址 | `http://localhost:9000` |
| `DEV_KB_ID` | 开发环境知识库 ID | `uuid-xxx` |
| `SWAGGER_BASE_URL` | Swagger 文档地址 | `http://localhost:8000` |
| `SWAGGER_AUTH_TOKEN` | Swagger 认证 Token | `Bearer xxx` |
| `NODE_ENV` | 环境 | `development` / `production` |

### 10.5 性能优化

#### 代码分割
- ✅ 动态导入 (`lazy` + `Suspense`)
- ✅ 路由级别代码分割 (Next.js 自动)

#### 图片优化
- ✅ Next.js Image 组件
- ✅ 图片懒加载
- ✅ WebP 格式

#### 缓存策略
- ✅ 静态资源缓存 (1 年)
- ✅ API 响应缓存
- ✅ 浏览器缓存

#### SSR 优化
- ✅ 服务端数据预取
- ✅ 流式渲染
- ✅ 增量静态生成 (ISR)

---

## 📊 总结

### 技术亮点

1. ✅ **Next.js 15 App Router**: 最新的 React 服务端渲染方案
2. ✅ **多知识库架构**: 通过 KB_ID 机制支持多租户
3. ✅ **流式 AI 对话**: 实时流式响应，用户体验优秀
4. ✅ **增量 Markdown 渲染**: 支持流式输出的 Markdown 渲染
5. ✅ **响应式设计**: 完美支持桌面端和移动端
6. ✅ **主题系统**: 亮色/暗色主题无缝切换
7. ✅ **错误监控**: Sentry 集成，生产环境错误追踪
8. ✅ **TypeScript**: 完整的类型安全

### 项目规模

- **代码行数**: ~15,000 行
- **组件数量**: ~50 个
- **页面数量**: ~10 个
- **API 接口**: ~30 个
- **依赖包**: ~40 个

### 开发建议

1. **熟悉 Next.js 15**: 理解 App Router 和 Server Components
2. **理解 KB_ID 机制**: 多知识库的核心
3. **掌握 Material-UI**: 主要的 UI 组件库
4. **学习流式渲染**: AI 对话的关键技术
5. **注意 SSR/CSR 边界**: 正确使用 'use client'

---

**文档生成时间**: 2025-11-26  
**版本**: v1.0  
**维护者**: PandaWiki Team

