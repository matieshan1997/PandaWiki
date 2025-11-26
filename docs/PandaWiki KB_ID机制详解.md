# PandaWiki KB_ID 获取机制详解

## 概述

PandaWiki 采用了一套巧妙的多知识库架构，通过 Caddy 动态路由和 Header 自动注入机制，实现了每个知识库的独立访问。本文档详细解析 KB_ID 的获取逻辑和实现原理。

## 核心架构

### 整体设计思路

```
多个知识库 → 多种访问方式 → 统一的应用实例 → 动态内容渲染
```

PandaWiki 不是为每个知识库部署独立的应用实例，而是通过**智能路由**让单个应用实例服务多个知识库。

### 关键组件

1. **Caddy**: 动态反向代理，负责路由识别和 Header 注入
2. **PandaWiki App**: 前端应用，根据 KB_ID 渲染不同内容
3. **PandaWiki API**: 后端 API，根据 KB_ID 返回对应数据

## KB_ID 获取流程详解

### 1. 知识库访问配置

每个知识库可以配置多种访问方式：

#### 端口访问模式
```
知识库 A: http://your-server:8001 → KB_ID: uuid-a
知识库 B: http://your-server:8002 → KB_ID: uuid-b  
知识库 C: http://your-server:8003 → KB_ID: uuid-c
```

#### 域名访问模式
```
知识库 A: https://wiki-a.company.com → KB_ID: uuid-a
知识库 B: https://wiki-b.company.com → KB_ID: uuid-b
知识库 C: https://docs.company.com → KB_ID: uuid-c
```

#### SSL 端口访问模式
```
知识库 A: https://your-server:8443 → KB_ID: uuid-a
知识库 B: https://your-server:8444 → KB_ID: uuid-b
```

### 2. Caddy 动态配置生成

当在管理后台创建或修改知识库时，系统会自动生成 Caddy 配置：

#### 配置生成逻辑
```go
// backend/repo/pg/knowledge_base.go
func (r *KnowledgeBaseRepository) SyncKBAccessSettingsToCaddy(ctx context.Context, kbList []*domain.KnowledgeBaseListItem) error {
    // 为每个知识库生成独立的服务器配置
    // 配置端口监听和路由规则
    // 设置 Header 注入规则
    // 通过 Caddy Admin API 动态更新
}
```

#### 生成的 Caddy 配置示例
```json
{
  "apps": {
    "http": {
      "servers": {
        "server_8001": {
          "listen": [":8001"],
          "routes": [
            {
              "match": [{"path": ["/static-file/*"]}],
              "handle": [{
                "handler": "reverse_proxy",
                "upstreams": [{"dial": "panda-wiki-minio:9000"}]
              }]
            },
            {
              "match": [{"path": ["/*"]}],
              "handle": [
                {
                  "handler": "headers",
                  "request": {
                    "set": {"X-KB-ID": ["kb-uuid-a"]}
                  }
                },
                {
                  "handler": "reverse_proxy", 
                  "upstreams": [{"dial": "panda-wiki-app:3000"}]
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```

### 3. Header 自动注入机制

#### Caddy 的作用
1. **监听特定端口/域名**: 根据配置监听不同的访问入口
2. **识别知识库**: 通过端口号或域名确定对应的知识库 ID
3. **注入 Header**: 自动在请求中添加 `X-KB-ID: uuid-xxx`
4. **转发请求**: 将带有 KB_ID 的请求转发到前端应用

#### Header 注入示例
```
原始请求: GET https://wiki-a.company.com/welcome
         ↓ Caddy 处理
注入后:   GET http://panda-wiki-app:3000/welcome
         Headers: X-KB-ID: uuid-a
```

### 4. 前端中间件处理

#### 中间件逻辑
```typescript
// web/app/src/middleware.ts
const proxyShare = async (request: NextRequest) => {
  // 从 Header 或环境变量获取 KB_ID
  const kb_id = request.headers.get('x-kb-id') || process.env.DEV_KB_ID || '';
  
  // 构造转发请求
  const fetchHeaders = new Headers(request.headers);
  fetchHeaders.set('x-kb-id', kb_id);  // 确保 Header 传递
  
  // 转发到后端 API
  const proxyRes = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: fetchHeaders,
    body: request.body,
  });
}
```

#### 路径白名单
```typescript
const pathnameWhiteList = ["/auth/login", "/welcome", "/"];
```

### 5. 后端 Header 读取

#### 中间件验证
```go
// backend/middleware/share_auth.go
func (h *ShareAuthMiddleware) CheckForbidden(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        kbID := c.Request().Header.Get("X-KB-ID")  // 从 Header 获取
        if kbID == "" {
            return c.JSON(http.StatusBadRequest, domain.Response{
                Success: false,
                Message: "kb_id is required",
            })
        }
        
        // 验证知识库是否存在和可访问
        kb, err := h.kbUsecase.GetKnowledgeBase(c.Request().Context(), kbID)
        if err != nil {
            return c.JSON(http.StatusInternalServerError, domain.Response{
                Success: false,
                Message: "failed to get knowledge base detail",
            })
        }
        
        // 检查访问权限
        if kb.AccessSettings.IsForbidden {
            return c.JSON(http.StatusForbidden, domain.Response{
                Success: false,
                Message: "access is forbidden",
            })
        }
        
        return next(c)
    }
}
```

#### API Handler 使用
```go
// backend/handler/share/app.go
func (h *ShareAppHandler) GetWebAppInfo(c echo.Context) error {
    kbID := c.Request().Header.Get("X-KB-ID")
    if kbID == "" {
        return h.NewResponseWithError(c, "kb_id is required", nil)
    }
    
    appInfo, err := h.usecase.GetWebAppInfo(c.Request().Context(), kbID)
    if err != nil {
        return h.NewResponseWithError(c, err.Error(), err)
    }
    return h.NewResponseWithData(c, appInfo)
}
```

## 完整的请求流程

### 用户访问知识库的完整流程

```
1. 用户访问: https://wiki-a.company.com/welcome
   ↓
2. DNS 解析到 PandaWiki 服务器
   ↓  
3. Caddy 接收请求，识别域名对应知识库 A
   ↓
4. Caddy 注入 Header: X-KB-ID: uuid-a
   ↓
5. Caddy 转发到: panda-wiki-app:3000/welcome (带 Header)
   ↓
6. Next.js 中间件读取 Header，处理路由
   ↓
7. 前端调用 API 时携带 X-KB-ID Header
   ↓
8. 后端从 Header 获取 KB_ID，查询知识库 A 的数据
   ↓
9. 返回知识库 A 的配置和内容
   ↓
10. 前端渲染知识库 A 的页面
```

### 关键数据流

```
域名/端口 → KB_ID 映射 → Header 注入 → API 调用 → 数据查询 → 内容渲染
```

## 本地开发环境的挑战

### 问题根源

本地开发环境通常缺少以下组件：
1. **Caddy 服务**: 无法进行动态路由和 Header 注入
2. **域名配置**: 无法模拟多域名访问
3. **SSL 证书**: 无法测试 HTTPS 访问

### 影响

- 前端无法获取 `X-KB-ID` Header
- API 调用返回 `kb_id is required` 错误
- 无法加载知识库配置信息
- 页面渲染失败或显示默认内容

### 解决方案

#### 方案一：跳过 KB 信息获取（推荐）
- 适用于界面开发和基础功能测试
- 使用默认配置，避免 API 错误
- 快速启动，无需额外配置

#### 方案二：环境变量指定 KB_ID
- 适用于单知识库功能开发
- 需要先创建测试知识库
- 可以测试完整的知识库功能

#### 方案三：完整本地环境
- 适用于完整功能测试
- 需要配置本地 Caddy 服务
- 可以测试多知识库和域名绑定

## 最佳实践

### 开发阶段建议

1. **界面开发阶段**: 使用方案一，专注于 UI 开发
2. **功能开发阶段**: 使用方案二，测试业务逻辑
3. **集成测试阶段**: 使用方案三，验证完整流程
4. **生产部署前**: 完整的 Docker 环境测试

### 调试技巧

1. **检查 Header**: 在浏览器开发者工具中查看请求 Header
2. **日志分析**: 查看后端日志中的 KB_ID 相关错误
3. **API 测试**: 使用 curl 手动添加 X-KB-ID Header 测试
4. **配置验证**: 检查 Caddy 配置是否正确生成

这套机制的设计非常巧妙，既实现了多知识库的独立访问，又保持了系统的简洁性和可维护性。理解这个机制对于 PandaWiki 的开发和部署都非常重要。
