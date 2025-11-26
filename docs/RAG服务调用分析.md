# PandaWiki 后端 RAG 服务调用分析文档

## 📋 目录

- [1. RAG 服务概述](#1-rag-服务概述)
- [2. RAG 接口定义](#2-rag-接口定义)
- [3. RAG 服务调用场景](#3-rag-服务调用场景)
- [4. 详细调用分析](#4-详细调用分析)
- [5. 配置说明](#5-配置说明)
- [6. 错误处理](#6-错误处理)

---

## 1. RAG 服务概述

### 1.1 服务架构

PandaWiki 使用 **RAG (Retrieval-Augmented Generation)** 服务来管理知识库的向量存储和检索功能。

```
┌─────────────────────────────────────────────────────────────┐
│                     PandaWiki Backend                        │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────────┐  │
│  │ Handler  │───▶│ Usecase  │───▶│   RAG Store Layer    │  │
│  │  Layer   │    │  Layer   │    │  (backend/store/rag) │  │
│  └──────────┘    └──────────┘    └──────────┬───────────┘  │
└────────────────────────────────────────────────┼─────────────┘
                                                 │
                                                 ▼
                                    ┌────────────────────────┐
                                    │   External RAG Service │
                                    │   (CT RAG / raglite)   │
                                    │                        │
                                    │  - Vector Store        │
                                    │  - Embedding Models    │
                                    │  - Document Management │
                                    └────────────────────────┘
```

### 1.2 RAG 服务实现

- **接口定义**: `backend/store/rag/rag.go`
- **CT RAG 实现**: `backend/store/rag/ct/rag.go`
- **配置**: `backend/config/config.go`

---

## 2. RAG 接口定义

### 2.1 RAGService 接口

**文件**: `backend/store/rag/rag.go`

```go
type RAGService interface {
    // 知识库管理
    CreateKnowledgeBase(ctx context.Context) (string, error)
    DeleteKnowledgeBase(ctx context.Context, datasetID string) error
    
    // 文档管理
    UpsertRecords(ctx context.Context, datasetID string, nodeRelease *domain.NodeReleaseWithDirPath, authGroupId []int) (string, error)
    DeleteRecords(ctx context.Context, datasetID string, docIDs []string) error
    UpdateDocumentGroupIDs(ctx context.Context, datasetID string, docID string, groupIds []int) error
    ListDocuments(ctx context.Context, datasetID string, params map[string]string) ([]rag.Document, error)
    
    // 检索
    QueryRecords(ctx context.Context, datasetIDs []string, query string, groupIDs []int, similarityThreshold float64, historyMsgs []*schema.Message) ([]*domain.NodeContentChunk, error)
    
    // 模型管理
    GetModelList(ctx context.Context) ([]*domain.Model, error)
    AddModel(ctx context.Context, model *domain.Model) (string, error)
    UpdateModel(ctx context.Context, model *domain.Model) error
    DeleteModel(ctx context.Context, model *domain.Model) error
}
```

---

## 3. RAG 服务调用场景

### 3.1 调用场景总览

| 场景分类 | 调用方法 | 触发时机 | 调用位置 |
|---------|---------|---------|---------|
| **知识库管理** | `CreateKnowledgeBase` | 创建知识库 | `usecase/knowledge_base.go:48` |
| | `DeleteKnowledgeBase` | 删除知识库 | `usecase/knowledge_base.go:140` |
| | | 更新 embedding 模型 | `usecase/model.go:78-82` |
| **文档向量化** | `UpsertRecords` | 发布文档 | `handler/mq/rag.go:88` |
| | | 更新 embedding 模型 | `usecase/model.go:92-99` |
| | `DeleteRecords` | 删除旧版本文档 | `handler/mq/rag.go:107` |
| | | 删除文档 | `handler/mq/rag.go:121` |
| | `UpdateDocumentGroupIDs` | 更新文档权限组 | `handler/mq/rag.go:58` |
| | `ListDocuments` | 获取文档列表 | `usecase/node.go` |
| **知识检索** | `QueryRecords` | 对话问答 | `usecase/llm.go:312` |
| **模型管理** | `AddModel` | 添加模型 | (通过 ModelUsecase) |
| | `UpdateModel` | 更新模型 | `usecase/model.go:321` |
| | | 切换模型模式 | `usecase/model.go:276-327` |
| | `DeleteModel` | 删除模型 | (通过 ModelUsecase) |
| | `GetModelList` | 获取模型列表 | (通过 ModelUsecase) |

---

## 4. 详细调用分析

### 4.1 知识库管理

#### 4.1.1 CreateKnowledgeBase - 创建知识库

**调用链路**:
```
POST /api/v1/knowledge_base
  ↓
Handler: knowledge_base.go:97
  ↓
Usecase: knowledge_base.go:48
  ↓
RAG Store: ct/rag.go:40-48
  ↓
External RAG API: CreateDataset
```

**代码位置**: `backend/usecase/knowledge_base.go:46-70`

```go
func (u *KnowledgeBaseUsecase) CreateKnowledgeBase(ctx context.Context, req *domain.CreateKnowledgeBaseReq) (string, error) {
    // 1. 在向量存储中创建知识库（调用 RAG 服务）
    datasetID, err := u.rag.CreateKnowledgeBase(ctx)
    if err != nil {
        return "", err  // ⚠️ 可能返回 "embedding模型不存在" 错误
    }
    
    // 2. 生成知识库 ID 和构建对象
    kbID := uuid.New().String()
    kb := &domain.KnowledgeBase{
        ID:        kbID,
        Name:      req.Name,
        DatasetID: datasetID,
        AccessSettings: domain.AccessSettings{...},
    }
    
    // 3. 在数据库中创建知识库记录
    if err := u.repo.CreateKnowledgeBase(ctx, req.MaxKB, kb); err != nil {
        return "", err
    }
    return kbID, nil
}
```

**RAG Store 实现**: `backend/store/rag/ct/rag.go:40-48`

```go
func (s *CTRAG) CreateKnowledgeBase(ctx context.Context) (string, error) {
    // 调用 RAG SDK 创建数据集
    dataset, err := s.client.CreateDataset(ctx, rag.CreateDatasetRequest{
        Name: uuid.New().String(),
    })
    if err != nil {
        return "", err  // ⚠️ 错误来源：RAG 服务检查 embedding 模型
    }
    return dataset.ID, nil
}
```

**关键点**:
- ✅ 必须先配置 embedding 模型才能创建知识库
- ✅ 返回的 `datasetID` 用于后续文档管理
- ⚠️ 如果 embedding 模型不存在，会返回错误："embedding模型不存在，请先创建embedding模型"

---

#### 4.1.2 DeleteKnowledgeBase - 删除知识库

**调用场景**:
1. **用户删除知识库**: `DELETE /api/v1/knowledge_base/detail`
2. **更新 embedding 模型**: 删除旧数据集，创建新数据集

**代码位置 1**: `backend/usecase/knowledge_base.go:135-147`

```go
func (u *KnowledgeBaseUsecase) DeleteKnowledgeBase(ctx context.Context, kbID string) error {
    // 1. 删除数据库记录
    if err := u.repo.DeleteKnowledgeBase(ctx, kbID); err != nil {
        return err
    }
    // 2. 删除向量存储
    if err := u.rag.DeleteKnowledgeBase(ctx, kbID); err != nil {
        return err
    }
    // 3. 清除缓存
    if err := u.kbCache.DeleteKB(ctx, kbID); err != nil {
        return err
    }
    return nil
}
```

**代码位置 2**: `backend/usecase/model.go:78-87`

```go
func (u *ModelUsecase) TriggerUpsertRecords(ctx context.Context) error {
    kbList, err := u.kbRepo.GetKnowledgeBaseList(ctx)
    if err != nil {
        return fmt.Errorf("get knowledge base list failed: %w", err)
    }
    for _, kb := range kbList {
        // 创建新数据集
        newDatasetID, err := u.ragStore.CreateKnowledgeBase(ctx)
        if err != nil {
            return fmt.Errorf("create new dataset failed: %w", err)
        }
        // 删除旧数据集
        if err := u.ragStore.DeleteKnowledgeBase(ctx, kb.DatasetID); err != nil {
            return fmt.Errorf("delete old dataset failed: %w", err)
        }
        // 更新数据库中的 dataset_id
        if err := u.kbRepo.UpdateDatasetID(ctx, kb.ID, newDatasetID); err != nil {
            return fmt.Errorf("update knowledge base dataset id failed: %w", err)
        }
    }
    // ... 重新向量化所有文档
}
```

**RAG Store 实现**: `backend/store/rag/ct/rag.go:140-145`

```go
func (s *CTRAG) DeleteKnowledgeBase(ctx context.Context, datasetID string) error {
    if err := s.client.DeleteDatasets(ctx, []string{datasetID}); err != nil {
        return err
    }
    return nil
}
```

---

### 4.2 文档向量化

#### 4.2.1 UpsertRecords - 插入/更新文档向量

**调用场景**: 发布文档到知识库

**调用链路**:
```
POST /api/v1/knowledge_base/release
  ↓
Usecase: knowledge_base.go:166
  ↓
MQ: AsyncUpdateNodeReleaseVector (异步)
  ↓
MQ Handler: mq/rag.go:88
  ↓
RAG Store: ct/rag.go:97-131
  ↓
External RAG API: UploadDocumentsAndParse
```

**代码位置**: `backend/handler/mq/rag.go:64-113`

```go
case "upsert":
    // 1. 获取文档内容
    nodeRelease, err := h.nodeRepo.GetNodeReleaseWithDirPathByID(ctx, request.NodeReleaseID)
    if err != nil {
        h.logger.Error("get node content by ids failed", log.Error(err))
        return nil
    }
    
    // 2. 跳过文件夹类型
    if nodeRelease.Type == domain.NodeTypeFolder {
        h.logger.Info("node is folder, skip upsert")
        return nil
    }
    
    // 3. 获取知识库信息
    kb, err := h.kbRepo.GetKnowledgeBaseByID(ctx, request.KBID)
    if err != nil {
        h.logger.Error("get kb failed", log.Error(err))
        return nil
    }
    
    // 4. 获取权限组 ID
    groupIds, err := h.nodeRepo.GetNodeAuthGroupIdsByNodeId(ctx, nodeRelease.NodeID, consts.NodePermNameAnswerable)
    if err != nil {
        h.logger.Error("get groupIds failed", log.Error(err))
        return nil
    }
    
    // 5. 调用 RAG 服务插入/更新文档向量
    docID, err := h.rag.UpsertRecords(ctx, kb.DatasetID, nodeRelease, groupIds)
    if err != nil {
        h.logger.Error("upsert node content vector failed", log.Error(err))
        return nil
    }
    
    // 6. 更新数据库中的 doc_id
    if err := h.nodeRepo.UpdateNodeReleaseDocID(ctx, request.NodeReleaseID, docID); err != nil {
        h.logger.Error("update node doc_id failed", log.Error(err))
        return nil
    }
    
    // 7. 删除旧版本的向量记录
    oldDocIDs, err := h.nodeRepo.GetOldNodeDocIDsByNodeID(ctx, nodeRelease.ID, nodeRelease.NodeID)
    if err != nil {
        h.logger.Error("get old doc_ids by node_id failed", log.Error(err))
        return nil
    }
    if len(oldDocIDs) > 0 {
        if err := h.rag.DeleteRecords(ctx, kb.DatasetID, oldDocIDs); err != nil {
            h.logger.Error("delete old RAG records failed", log.Error(err))
            return nil
        }
    }
```

**RAG Store 实现**: `backend/store/rag/ct/rag.go:97-131`

```go
func (s *CTRAG) UpsertRecords(ctx context.Context, datasetID string, nodeRelease *domain.NodeReleaseWithDirPath, groupIds []int) (string, error) {
    // 1. 创建临时 Markdown 文件
    tempFile, err := os.CreateTemp("", fmt.Sprintf("%s-*.md", nodeRelease.ID))
    if err != nil {
        return "", fmt.Errorf("create temp file failed: %w", err)
    }
    
    // 2. 如果内容是 HTML，转换为 Markdown
    markdown := nodeRelease.Content
    if utils.IsLikelyHTML(nodeRelease.Content) {
        markdown, err = s.mdConv.ConvertString(nodeRelease.Content)
        if err != nil {
            return "", fmt.Errorf("convert html to markdown failed: %w", err)
        }
    }
    
    // 3. 写入临时文件
    if _, err := tempFile.Write([]byte(markdown)); err != nil {
        return "", fmt.Errorf("write temp file failed: %w", err)
    }
    if err := tempFile.Close(); err != nil {
        return "", fmt.Errorf("close temp file failed: %w", err)
    }
    defer os.Remove(tempFile.Name())
    
    // 4. 上传文档并解析（调用 RAG SDK）
    docs, err := s.client.UploadDocumentsAndParse(ctx, datasetID, []string{tempFile.Name()}, groupIds, &rag.DocumentMetadata{
        DocumentName: nodeRelease.Name,
        CreatedAt:    nodeRelease.CreatedAt.String(),
        UpdatedAt:    nodeRelease.UpdatedAt.String(),
        FolderName:   nodeRelease.Path,
    })
    if err != nil {
        return "", fmt.Errorf("upload document text failed: %w", err)
    }
    if len(docs) == 0 {
        return "", fmt.Errorf("no docs found")
    }
    return docs[0].ID, nil
}
```

**关键点**:
- ✅ 支持 HTML 自动转换为 Markdown
- ✅ 支持权限组控制（groupIds）
- ✅ 自动删除旧版本文档向量
- ✅ 异步处理，不阻塞主流程

---

#### 4.2.2 DeleteRecords - 删除文档向量

**调用场景**:
1. 删除旧版本文档
2. 删除文档

**代码位置**: `backend/handler/mq/rag.go:114-125`

```go
case "delete":
    h.logger.Info("delete node content vector request", log.Any("request", request))
    kb, err := h.kbRepo.GetKnowledgeBaseByID(ctx, request.KBID)
    if err != nil {
        h.logger.Error("get kb failed", log.Error(err))
        return nil
    }
    if err := h.rag.DeleteRecords(ctx, kb.DatasetID, []string{request.DocID}); err != nil {
        h.logger.Error("delete node content vector failed", log.Error(err))
        return nil
    }
    h.logger.Info("delete node content vector success")
```

**RAG Store 实现**: `backend/store/rag/ct/rag.go:133-138`

```go
func (s *CTRAG) DeleteRecords(ctx context.Context, datasetID string, docIDs []string) error {
    if err := s.client.DeleteDocuments(ctx, datasetID, docIDs); err != nil {
        return err
    }
    return nil
}
```

---

#### 4.2.3 UpdateDocumentGroupIDs - 更新文档权限组

**调用场景**: 更新文档的访问权限组

**代码位置**: `backend/handler/mq/rag.go:51-62`

```go
case "update_group_ids":
    h.logger.Info("update node group request", log.Any("request", request))
    kb, err := h.kbRepo.GetKnowledgeBaseByID(ctx, request.KBID)
    if err != nil {
        h.logger.Error("get kb failed", log.Error(err))
        return nil
    }
    if err := h.rag.UpdateDocumentGroupIDs(ctx, kb.DatasetID, request.DocID, request.GroupIds); err != nil {
        h.logger.Error("update node group failed", log.Error(err))
        return nil
    }
    h.logger.Info("update node group success")
```

**RAG Store 实现**: `backend/store/rag/ct/rag.go:224-230`

```go
func (s *CTRAG) UpdateDocumentGroupIDs(ctx context.Context, datasetID string, docID string, groupIds []int) error {
    err := s.client.UpdateDocumentGroupIDs(ctx, datasetID, docID, groupIds)
    if err != nil {
        return fmt.Errorf("update document group IDs failed: %w", err)
    }
    return nil
}
```

---

### 4.3 知识检索

#### 4.3.1 QueryRecords - 检索相关文档

**调用场景**: 对话问答时检索相关知识

**调用链路**:
```
POST /api/v1/conversation/chat (或其他对话接口)
  ↓
Usecase: llm.go:312
  ↓
RAG Store: ct/rag.go:50-94
  ↓
External RAG API: RetrieveChunks
```

**代码位置**: `backend/usecase/llm.go:305-317`

```go
func (u *LLMUsecase) GetRelatedDocuments(
    ctx context.Context,
    datasetIDs []string,
    question string,
    groupIDs []int,
    similarityThreshold float64,
    historyMessages []*schema.Message,
) ([]*domain.RankedNodeChunks, error) {
    var rankedNodes []*domain.RankedNodeChunks
    
    // 从 RAG 服务获取相关文档
    records, err := u.rag.QueryRecords(ctx, datasetIDs, question, groupIDs, similarityThreshold, historyMessages)
    if err != nil {
        return nil, fmt.Errorf("get records from raglite failed: %w", err)
    }
    u.logger.Info("get related documents from raglite", log.Any("record_count", len(records)))
    
    // ... 后续处理：排序、去重、分组
}
```

**RAG Store 实现**: `backend/store/rag/ct/rag.go:50-94`

```go
func (s *CTRAG) QueryRecords(ctx context.Context, datasetIDs []string, query string, groupIds []int, similarityThreshold float64, historyMsgs []*schema.Message) ([]*domain.NodeContentChunk, error) {
    // 1. 转换历史消息格式
    var chatMsgs []rag.ChatMessage
    for _, msg := range historyMsgs {
        switch msg.Role {
        case schema.User:
            chatMsgs = append(chatMsgs, rag.ChatMessage{
                Role:    string(msg.Role),
                Content: msg.Content,
            })
        case schema.Assistant:
            chatMsgs = append(chatMsgs, rag.ChatMessage{
                Role:    string(msg.Role),
                Content: msg.Content,
            })
        }
    }
    
    // 2. 构建检索请求
    retrieveReq := rag.RetrievalRequest{
        DatasetIDs:   datasetIDs,
        Question:     query,
        TopK:         10,
        UserGroupIDs: groupIds,
        ChatMessages: chatMsgs,
    }
    if similarityThreshold != 0 {
        retrieveReq.SimilarityThreshold = similarityThreshold
    }
    
    // 3. 调用 RAG SDK 检索
    chunks, _, rewriteQuery, err := s.client.RetrieveChunks(ctx, retrieveReq)
    s.logger.Info("retrieve chunks result", log.Int("chunks count", len(chunks)), log.String("query", rewriteQuery))
    
    if err != nil {
        return nil, err
    }
    
    // 4. 转换返回格式
    nodeChunks := make([]*domain.NodeContentChunk, len(chunks))
    for i, chunk := range chunks {
        nodeChunks[i] = &domain.NodeContentChunk{
            ID:      chunk.ID,
            Content: chunk.Content,
            DocID:   chunk.DocumentID,
        }
    }
    return nodeChunks, nil
}
```

**关键点**:
- ✅ 支持多数据集检索（datasetIDs）
- ✅ 支持权限组过滤（groupIDs）
- ✅ 支持相似度阈值（similarityThreshold）
- ✅ 支持历史对话上下文（historyMessages）
- ✅ 默认返回 Top 10 结果

---

### 4.4 模型管理

#### 4.4.1 UpdateModel - 更新模型配置

**调用场景**: 切换模型模式或更新模型配置

**代码位置**: `backend/usecase/model.go:275-327`

```go
func (u *ModelUsecase) updateRAGModelsByMode(ctx context.Context, mode, autoModeAPIKey string, oldModelModeSetting domain.ModelModeSetting) error {
    var isTriggerUpsertRecords = true
    
    // 手动切换到手动模式, 根据IsManualEmbeddingUpdated字段决定
    if oldModelModeSetting.Mode == consts.ModelSettingModeManual && mode == string(consts.ModelSettingModeManual) {
        isTriggerUpsertRecords = oldModelModeSetting.IsManualEmbeddingUpdated
    }
    
    ragModelTypes := []domain.ModelType{
        domain.ModelTypeEmbedding,
        domain.ModelTypeRerank,
        domain.ModelTypeAnalysis,
        domain.ModelTypeAnalysisVL,
    }
    
    for _, modelType := range ragModelTypes {
        var model *domain.Model
        
        if mode == string(consts.ModelSettingModeManual) {
            // 获取该类型的活跃模型
            m, err := u.modelRepo.GetModelByType(ctx, modelType)
            if err != nil {
                u.logger.Warn("failed to get model by type", log.String("type", string(modelType)))
                continue
            }
            if m == nil || !m.IsActive {
                u.logger.Warn("no active model found for type", log.String("type", string(modelType)))
                continue
            }
            model = m
        } else {
            // 自动模式：使用百智云默认模型
            modelName := consts.GetAutoModeDefaultModel(string(modelType))
            model = &domain.Model{
                Model:    modelName,
                Type:     modelType,
                IsActive: true,
                BaseURL:  consts.AutoModeBaseURL,
                APIKey:   autoModeAPIKey,
                Provider: domain.ModelProviderBrandBaiZhiCloud,
            }
        }
        
        // 更新RAG存储中的模型
        if model != nil {
            if err := u.ragStore.UpdateModel(ctx, model); err != nil {
                u.logger.Error("failed to update model in RAG store", log.String("model_id", model.ID))
                continue
            }
            u.logger.Info("successfully updated RAG model", log.String("model name: ", string(model.Model)))
        }
    }
    
    // 触发记录更新（如果 embedding 模型变更）
    if isTriggerUpsertRecords {
        u.logger.Info("embedding model updated, triggering upsert records")
        return u.TriggerUpsertRecords(ctx)
    }
    return nil
}
```

**RAG Store 实现**: `backend/store/rag/ct/rag.go:170-191`

```go
func (s *CTRAG) UpdateModel(ctx context.Context, model *domain.Model) error {
    config, err := json.Marshal(model.Parameters)
    if err != nil {
        return fmt.Errorf("failed to marshal model params with err: %v", err)
    }
    updateReq := rag.AddModelConfigRequest{
        Name:      model.Model,
        Provider:  string(model.Provider),
        TaskType:  string(model.Type),
        ApiBase:   model.BaseURL,
        ApiKey:    model.APIKey,
        MaxTokens: 8192,
        IsDefault: true,
        Enabled:   model.IsActive,
        Config:    config,
    }
    _, err = s.client.AddModelConfig(ctx, updateReq)
    if err != nil {
        return err
    }
    return nil
}
```

**关键点**:
- ✅ 更新 embedding 模型会触发所有文档重新向量化
- ✅ 支持自动模式和手动模式切换
- ✅ 更新失败不影响其他模型

---

## 5. 配置说明

### 5.1 RAG 服务配置

**文件**: `backend/config/config.go`

```go
type RAGConfig struct {
    Provider string      `mapstructure:"provider"`
    CTRAG    CTRAGConfig `mapstructure:"ct_rag"`
}

type CTRAGConfig struct {
    BaseURL string `mapstructure:"base_url"`
    APIKey  string `mapstructure:"api_key"`
}
```

**默认配置**:
```go
RAG: RAGConfig{
    Provider: "ct",
    CTRAG: CTRAGConfig{
        BaseURL: "http://121.40.68.241:8080/api/v1",
        APIKey:  "sk-1234567890",
    },
},
```

### 5.2 Docker Compose 配置

**文件**: `docker-compose.yml`

```yaml
raglite:
  image: crpi-40v6m35jg47mwsej.cn-hangzhou.personal.cr.aliyuncs.com/jingyun-model-yungu/jcloud-wiki-raglite:1-4-1
  container_name: jcloud-wiki-raglite
  restart: always
  volumes:
    - ./data/raglite:/data
  environment:
    - GIN_MODE=release
    - DATABASE_HOST=jcloud-wiki-postgres
    - DATABASE_USER=panda-wiki
    - DATABASE_PASSWORD=${POSTGRES_PASSWORD}
    - MINIO_HOST=jcloud-wiki-minio:9000
    - MINIO_USER=s3panda-wiki
    - MINIO_SECRET=${S3_SECRET_KEY}
  networks:
    panda-wiki:
      ipv4_address: "${SUBNET_PREFIX:-169.254.15}.18"
```

---

## 6. 错误处理

### 6.1 常见错误

#### 错误 1: "embedding模型不存在，请先创建embedding模型"

**原因**: 创建知识库时，RAG 服务检测到系统中没有配置 embedding 模型

**解决方案**:
1. 进入"系统配置 → 模型配置"
2. 配置向量模型（embedding）
3. 测试并保存
4. 重新创建知识库

**相关代码**: `backend/usecase/knowledge_base.go:48`

---

#### 错误 2: "get records from raglite failed"

**原因**: 检索文档时 RAG 服务异常

**可能原因**:
- RAG 服务未启动
- 网络连接问题
- 数据集不存在
- 权限组配置错误

**相关代码**: `backend/usecase/llm.go:312-315`

---

#### 错误 3: "upload document text failed"

**原因**: 上传文档到 RAG 服务失败

**可能原因**:
- 文档格式不支持
- 文档内容为空
- RAG 服务存储空间不足
- embedding 模型异常

**相关代码**: `backend/store/rag/ct/rag.go:118-126`

---

### 6.2 错误处理最佳实践

1. **创建知识库前检查模型**:
   ```go
   // 检查必要的模型是否已配置
   needModelTypes := []domain.ModelType{
       domain.ModelTypeChat,
       domain.ModelTypeEmbedding,
       domain.ModelTypeRerank,
       domain.ModelTypeAnalysis,
   }
   for _, modelType := range needModelTypes {
       if _, err := u.modelRepo.GetModelByType(ctx, modelType); err != nil {
           return fmt.Errorf("需要配置 %s 模型", modelType)
       }
   }
   ```

2. **异步处理文档向量化**:
   - 使用消息队列（NATS）异步处理
   - 失败时记录日志，不阻塞主流程
   - 支持重试机制

3. **优雅降级**:
   - RAG 服务异常时，返回友好错误提示
   - 不影响其他功能正常使用

---

## 📊 总结

### RAG 服务调用统计

| 方法 | 调用次数 | 主要场景 |
|-----|---------|---------|
| `CreateKnowledgeBase` | 高频 | 创建知识库、更新 embedding 模型 |
| `DeleteKnowledgeBase` | 中频 | 删除知识库、更新 embedding 模型 |
| `UpsertRecords` | 高频 | 发布文档、更新 embedding 模型 |
| `DeleteRecords` | 中频 | 删除文档、删除旧版本 |
| `QueryRecords` | 极高频 | 每次对话问答 |
| `UpdateModel` | 低频 | 切换模型模式、更新模型配置 |
| `UpdateDocumentGroupIDs` | 低频 | 更新文档权限 |
| `ListDocuments` | 低频 | 获取文档列表 |

### 关键依赖

- **外部服务**: CT RAG / raglite
- **消息队列**: NATS
- **向量数据库**: Qdrant
- **对象存储**: MinIO

---

**文档生成时间**: 2025-11-26  
**版本**: v1.0  
**维护者**: PandaWiki Team

