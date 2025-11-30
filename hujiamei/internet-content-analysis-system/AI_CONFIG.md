# AI智能分析配置说明

## 阿里通义千问API配置

本项目已配置使用阿里通义千问API进行AI智能分析。

### API配置信息

- **API端点**: `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`
- **API密钥**: `sk-b48c6eb1c32242af82e89ee7582c66e9`
- **默认模型**: `qwen-plus`（能力均衡，推荐）
- **可选模型**:
  - `qwen-turbo`: 速度快，成本低，适合简单任务
  - `qwen-plus`: 能力均衡，适合中等复杂任务（默认）
  - `qwen-max`: 能力最强，适合复杂任务

### 环境变量配置

在项目根目录创建 `.env` 文件（如果不存在）：

```env
# 阿里通义千问API配置
VITE_AI_MOCK=false
VITE_AI_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
VITE_AI_API_KEY=sk-b48c6eb1c32242af82e89ee7582c66e9
VITE_AI_MODEL=qwen-plus
```

### 已实现的功能

#### 1. 情感分析 ✅
- ✅ 调用AI API分析文本情感倾向（正面/中性/负面）
- ✅ 情感强度评分（0-100）
- ✅ 分数据源分析：
  - 网媒情感倾向（媒体报道的客观性/倾向性分析）
  - 微博情感倾向（用户观点的情绪化分析）
- ✅ 批量分析与单条分析

#### 2. 关键词提取 ✅
- ✅ AI自动提取舆情热词
- ✅ 区分数据源的热词：
  - 网媒热词（媒体报道关注的焦点）
  - 微博热词（用户讨论的热点话题）
- ✅ 词频统计与词云展示
- ✅ 热词趋势分析（时间维度）
- ✅ 热词对比分析（网媒 vs 微博）

#### 3. 内容摘要生成 ✅
- ✅ AI自动生成舆情摘要
- ✅ 支持自定义摘要长度
- ✅ 分场景摘要：
  - 网媒报道摘要（提取新闻要点）
  - 微博观点摘要（提取用户核心观点）
- ✅ 多条舆情智能合并摘要

#### 4. 舆情分类与话题识别 ✅
- ✅ AI自动分类舆情类型（投诉/建议/咨询/表扬/中性报道等）
- ✅ 话题聚类分析：
  - 识别网媒报道的主要议题
  - 识别微博讨论的热门话题
  - 发现网媒与微博的议题关联性
- ✅ 事件关联分析（同一事件在不同数据源的传播）

### 代码位置

- **AI客户端**: `src/ai/client.ts`
- **Prompt模板**: `src/ai/prompts/`
  - `sentiment.ts`: 情感分析提示词
  - `keywords.ts`: 关键词提取提示词
  - `summary.ts`: 摘要生成提示词
  - `category.ts`: 舆情分类提示词
  - `topic.ts`: 话题识别提示词
- **分析Store**: `src/stores/analysis.ts`
- **实时模拟器**: `src/composables/useRealtimeSimulator.ts`

### 使用方式

#### 批量分析
```typescript
import { useAnalysisStore } from '@/stores/analysis'

const analysisStore = useAnalysisStore()
// 分析所有未分析的数据
await analysisStore.analyzeAll()
// 或限制数量
await analysisStore.analyzeAll(100)
```

#### 单条分析
```typescript
import { createAIAnalyzer } from '@/ai/client'

const analyzer = createAIAnalyzer({ mock: false })
const result = await analyzer.analyze({
  type: 'webmedia',
  content: '文章内容',
  title: '文章标题',
})
```

#### 单独调用各项功能
```typescript
// 情感分析
const sentiment = await analyzer.analyzeSentiment(options)

// 关键词提取
const keywords = await analyzer.extractKeywords(options)

// 摘要生成
const summary = await analyzer.generateSummary(options)

// 舆情分类
const category = await analyzer.classifyCategory(options)

// 话题识别
const topics = await analyzer.identifyTopics(options)
```

### API响应处理

代码已自动处理以下情况：
1. **JSON格式响应**: 自动解析JSON
2. **Markdown代码块**: 自动移除 ```json 标记
3. **文本格式响应**: 智能提取关键信息
4. **错误处理**: 失败时返回默认值，确保系统稳定运行

### 注意事项

1. **API调用频率**: 通义千问API有调用频率限制，批量分析时建议控制并发数量
2. **Token消耗**: 每次分析会消耗API Token，注意控制成本
3. **响应时间**: 真实API调用需要网络请求，比Mock模式慢
4. **错误处理**: 所有API调用都包含错误处理，失败时会使用默认值或重试

### 测试

运行项目后，在数据上传页面导入数据，然后在分析页面点击"批量分析"按钮即可测试AI功能。

