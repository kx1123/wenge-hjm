/**
 * AI分析结果
 */
export interface AIAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative'
  sentimentScore?: number // 情感强度评分（0-100）
  sentimentConfidence?: number // 情感分析置信度（0-1）
  keywords: string[] // 关键词列表
  keywordsWithWeight?: KeywordWithWeight[] // 带权重的关键词
  summary: string
  category?: string // 舆情分类（投诉/建议/咨询/表扬/中性报道等）
  topics?: string[] // 话题标签
  eventId?: string // 事件ID（用于跨源关联）
}

/**
 * AI分析选项
 */
export interface AnalyzeOptions {
  type: 'webmedia' | 'weibo'
  content: string
  title?: string
  userName?: string
  summaryLength?: number // 摘要长度（可选）
}

/**
 * 情感分析结果（带评分）
 */
export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative'
  score: number // 情感强度评分（0-100）
  confidence?: number // 置信度（0-1）
}

/**
 * 关键词结果（带权重）
 */
export interface KeywordWithWeight {
  keyword: string
  weight: number // 权重（0-1）
}

/**
 * 关键词统计结果
 */
export interface KeywordStats {
  keyword: string
  count: number
  frequency: number // 频率（0-1）
  trend?: 'up' | 'down' | 'stable' // 趋势
}

/**
 * 热词分析结果
 */
export interface HotWordAnalysis {
  keywords: KeywordStats[]
  topKeywords: string[] // Top N 关键词
  wordCloud?: { word: string; value: number }[] // 词云数据
}

/**
 * 话题聚类结果
 */
export interface TopicCluster {
  topic: string // 话题名称
  items: Array<{ id: string | number; type: 'webmedia' | 'weibo' }> // 相关数据项
  keywords: string[] // 话题关键词
  sentiment: {
    positive: number
    neutral: number
    negative: number
  }
  timeRange: {
    start: string
    end: string
  }
}

/**
 * 事件关联结果
 */
export interface EventCorrelation {
  event: string // 事件名称
  webmediaItems: Array<{ id: string | number; title?: string; content: string }>
  weiboItems: Array<{ id: string | number; content: string; userName: string }>
  correlationScore: number // 关联度评分（0-1）
  timeRange: {
    start: string
    end: string
  }
}

/**
 * AI客户端配置
 */
export interface AIClientConfig {
  mock?: boolean
  apiUrl?: string
  apiKey?: string
  model?: string
}

/**
 * AI对话消息
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

