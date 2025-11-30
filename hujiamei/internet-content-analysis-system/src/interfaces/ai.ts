/**
 * AI分析结果
 */
export interface AIAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative'
  keywords: string[]
  summary: string
}

/**
 * AI分析选项
 */
export interface AnalyzeOptions {
  type: 'webmedia' | 'weibo'
  content: string
  title?: string
  userName?: string
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

