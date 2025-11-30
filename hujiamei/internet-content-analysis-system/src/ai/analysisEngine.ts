import type { WebMediaData, WeiboData } from '@/interfaces/data'
import type { AIAnalysisResult } from '@/interfaces/ai'
import { createAIAnalyzer, type AIAnalyzer } from '@/ai/client'
import { db, updateWebMediaData, updateWeiboData } from '@/db/indexedDB'

/**
 * 可分析的数据类型
 */
export type SentimentData = (WebMediaData | WeiboData) & {
  id: number
}

/**
 * AI分析引擎
 */
export class AIAnalysisEngine {
  private analyzer: AIAnalyzer

  constructor(analyzer: AIAnalyzer) {
    this.analyzer = analyzer
  }

  /**
   * 分析单条数据
   */
  async analyzeSingle(data: SentimentData): Promise<AIAnalysisResult> {
    try {
      const dataType = 'source' in data ? 'webmedia' : 'weibo'
      
      // 调用AI分析
      const [sentimentResult, keywordsResult, summaryResult, categoryResult] = await Promise.all([
        this.analyzer.analyzeSentiment(
          data.content,
          dataType,
          'title' in data ? data.title : undefined
        ),
        this.analyzer.extractKeywords(data.content, 10),
        this.analyzer.generateSummary(data.content, 200),
        this.analyzer.classifyTopic(data.content, dataType, 'title' in data ? data.title : undefined),
      ])

      const result: AIAnalysisResult = {
        sentiment: sentimentResult.sentiment,
        sentimentScore: sentimentResult.score,
        keywords: keywordsResult,
        summary: summaryResult,
        category: categoryResult.category,
        topics: categoryResult.topics,
      }

      // 更新数据库
      const updates: Partial<WebMediaData | WeiboData> = {
        sentiment: result.sentiment,
        sentimentScore: result.sentimentScore,
        aiKeywords: result.keywords,
        aiSummary: result.summary,
        aiCategory: result.category,
        topics: result.topics,
        isWarning: this.checkWarning(result),
        warningLevel: this.getWarningLevel(result),
      }

      if (dataType === 'webmedia') {
        await updateWebMediaData(data.id, updates as Partial<WebMediaData>)
      } else {
        await updateWeiboData(data.id, updates as Partial<WeiboData>)
      }

      return result
    } catch (error) {
      console.error('分析单条数据失败:', error)
      throw error
    }
  }

  /**
   * 批量分析数据
   */
  async analyzeBatch(
    dataList: SentimentData[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0
    const batchSize = 5
    const delay = 200 // 每批间隔200ms

    for (let i = 0; i < dataList.length; i += batchSize) {
      const batch = dataList.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (data) => {
          try {
            await this.analyzeSingle(data)
            success++
          } catch (error) {
            console.error(`分析数据 ${data.id} 失败:`, error)
            failed++
          }
        })
      )

      // 进度回调
      if (onProgress) {
        onProgress(i + batch.length, dataList.length)
      }

      // 延迟，避免API限流
      if (i + batchSize < dataList.length) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    return { success, failed }
  }

  /**
   * 检查是否需要预警
   */
  private checkWarning(result: AIAnalysisResult): boolean {
    return (
      result.sentiment === 'negative' ||
      (result.sentimentScore !== undefined && result.sentimentScore < 30)
    )
  }

  /**
   * 获取预警级别
   */
  private getWarningLevel(result: AIAnalysisResult): 'low' | 'medium' | 'high' {
    if (result.sentiment === 'negative' && result.sentimentScore !== undefined && result.sentimentScore < 20) {
      return 'high'
    }
    if (result.sentiment === 'negative' || (result.sentimentScore !== undefined && result.sentimentScore < 30)) {
      return 'medium'
    }
    return 'low'
  }
}

/**
 * 创建分析引擎实例
 */
export function createAnalysisEngine(analyzer?: AIAnalyzer): AIAnalysisEngine {
  return new AIAnalysisEngine(analyzer || createAIAnalyzer())
}

