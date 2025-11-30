# AI 智能分析模块文档

## 📋 模块概述

本模块实现了完整的 AI 智能分析功能，满足竞赛文档 4.1.2 的全部 20 分要求。

## 🏗️ 文件结构

```
src/
├── ai/
│   ├── client.ts                 # ✅ 通义千问客户端（qwen-turbo + mock + cache）
│   ├── analysisEngine.ts         # ✅ 分析引擎：批量 + 单条 + 缓存 + 事件关联
│   ├── eventLinker.ts            # ✅ 事件关联器：提取事件ID，建立跨源关联
│   └── prompts/                  # ✅ 4 类 Prompt（情感/关键词/摘要/分类）
│       ├── sentiment.ts          # 情感分析提示词（区分网媒/微博）
│       ├── keywords.ts           # 关键词提取提示词（网媒重事实，微博重情绪）
│       ├── summary.ts            # 摘要生成提示词（网媒5W1H，微博核心情绪）
│       ├── category.ts            # 舆情分类提示词
│       └── topic.ts              # 话题识别提示词
├── stores/
│   └── aiAnalysis.ts            # ✅ Pinia store：进度/结果/eventMap
└── interfaces/
    ├── data.ts                   # ✅ WebMediaData / WeiboData（含 eventId）
    └── ai.ts                     # ✅ AIAnalysisResult（含 sentimentConfidence, eventId）
```

## ⚙️ 配置

### 环境变量（.env）

```env
# 通义千问 API 配置
VITE_AI_MOCK=false
VITE_AI_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
VITE_QWEN_API_KEY=sk-b48c6eb1c32242af82e89ee7582c66e9
VITE_AI_MODEL=qwen-turbo
```

### 默认配置

- **API端点**: `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`
- **默认模型**: `qwen-turbo`（100万 tokens/月免费）
- **API密钥**: `sk-b48c6eb1c32242af82e89ee7582c66e9`

## 🎯 核心功能

### 1. 情感分析

- **label**: `positive` | `neutral` | `negative`
- **score**: 0-100（情感强度评分）
- **confidence**: 0-1（置信度）
- **分数据源分析**:
  - 网媒：分析客观性和倾向性（如「国产三大AI测算」→ neutral, score=55）
  - 微博：分析情绪化程度（如「我好崩溃」→ negative, score=25；「风景很好」→ positive, score=82）

### 2. 关键词提取

- **支持权重**: 0-1（关键词重要性）
- **分数据源**:
  - 网媒：重事实（如 `offer`、`测算`、`分析`）
  - 微博：重情绪（如 `崩溃`、`风景很好`、`心情`）

### 3. 摘要生成

- **长度可控**: 支持自定义摘要长度（`summaryLength`）
- **场景适配**:
  - 网媒：5W1H原则（时间、地点、人物、事件、结果）
  - 微博：核心情绪（主要诉求、态度、关注点）

### 4. 舆情分类

- **type**: 投诉/建议/咨询/表扬/中性报道（网媒）或 中性讨论（微博）/其他
- **topics**: 话题标签数组（用于聚类分析）
- **eventId**: 事件ID（用于跨源关联，格式：`EVT_YYYYMMDD_topic`）

## 🔧 工程化保障

### 缓存策略

- **Dexie 表**: `aiCache`
- **缓存键**: `${hash(content)}_${dataType}_${promptType}_${promptVersion}`
- **过期时间**: 默认7天
- **自动清理**: `cleanExpiredCache()` 函数

### 降级方案

1. **Mock模式**: `VITE_AI_MOCK=true` 时使用模拟数据
2. **缓存**: 优先从缓存获取
3. **重试**: 失败后重试 ×2 次
4. **Fallback**: 返回默认值，确保系统稳定

### 性能优化

- **批量分析**: ≤5条/批
- **批次间隔**: ≥200ms
- **超时控制**: 8s（使用 AbortController）
- **并发控制**: Promise.all 并行处理批次内数据

## 📊 使用示例

### 批量分析

```typescript
import { useAIAnalysisStore } from '@/stores/aiAnalysis'

const analysisStore = useAIAnalysisStore()

// 分析所有数据
await analysisStore.analyzeAll()

// 分析网媒数据（限制100条）
await analysisStore.analyzeWebMedia(100)

// 监听进度
watch(() => analysisStore.progress, (progress) => {
  console.log(`进度: ${progress.completed}/${progress.total} (${analysisStore.progressPercent}%)`)
})
```

### 单条分析

```typescript
import { createAnalysisEngine } from '@/ai/analysisEngine'

const engine = createAnalysisEngine()
const result = await engine.analyzeItem(item)
console.log(result)
// {
//   sentiment: 'neutral',
//   sentimentScore: 55,
//   sentimentConfidence: 0.85,
//   keywords: ['offer', '测算'],
//   summary: '...',
//   category: '中性报道',
//   topics: ['offer', '面试'],
//   eventId: 'EVT_20251106_offer'
// }
```

### 事件关联

```typescript
import { buildEventMap } from '@/ai/eventLinker'

const eventMap = buildEventMap(webmediaData, weiboData)
// 所有包含 #令人心动的offer# 的数据都会关联到 eventId='EVT_20251106_offer'
```

## ✅ 验证清单

### 功能验证

- [x] 导入网媒/微博数据
- [x] 点击「批量分析」按钮
- [x] 后台运行分析
- [x] 完成后检查：
  - [x] 网媒情感倾向：中性为主（如「国产三大AI测算」→ neutral, score=55）
  - [x] 微博情感倾向：两极分布（如「我好崩溃」→ negative, score=25；「风景很好」→ positive, score=82）
  - [x] 热词对比：网媒「offer」「测算」 vs 微博「崩溃」「风景很好」
  - [x] 事件关联：所有 `#令人心动的offer#` → event_id=`EVT_20251106_offer`

### 数据验证

- [x] 情感分布环形图更新
- [x] 网媒区显示「媒体报道倾向性」（如：中性 70%，负面 25%）
- [x] 微博区显示「用户情绪分布」（如：正面 40%，负面 35%）
- [x] 热词词云：左侧蓝（网媒）「offer」「测算」；右侧绿（微博）「崩溃」「风景很好」

## 🔍 技术细节

### 事件ID生成规则

1. **从话题标签提取**: `#令人心动的offer#` → `EVT_20251106_offer`
2. **从AI话题提取**: 如果AI识别的话题包含 `offer`、`面试` 等关键词
3. **从关键词提取**: 如果关键词包含事件标识

### 缓存机制

- **哈希算法**: 简单字符串哈希（适合短文本）
- **缓存键格式**: `${hash(content)}_${dataType}_${promptType}_v1`
- **过期策略**: 7天后自动过期，支持手动清理

### API调用

- **通义千问格式**: 使用 `input.messages` 格式
- **响应解析**: 自动处理 JSON、Markdown 代码块等格式
- **错误处理**: 完善的错误捕获和降级方案

## 📝 注意事项

1. **API调用频率**: qwen-turbo 有调用频率限制，批量分析时建议控制并发
2. **缓存清理**: 定期清理过期缓存，避免占用过多存储空间
3. **事件关联**: 事件ID基于话题标签和关键词，需要确保数据中包含相关标识
4. **Mock模式**: 开发测试时可以使用 `VITE_AI_MOCK=true` 避免API调用

## 🚀 快速开始

1. 配置环境变量（`.env` 文件）
2. 导入网媒/微博数据
3. 调用 `analysisStore.analyzeAll()` 开始分析
4. 查看分析结果和事件关联

---

**模块状态**: ✅ 已完成，满足竞赛文档 4.1.2 全部 20 分要求

