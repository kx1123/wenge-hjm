/**
 * AI分析引擎
 * 提供批量分析、单条分析、缓存、事件关联等功能
 */

import type { AIAnalyzer } from './client'
import { createAIAnalyzer } from './client'
import type { AIAnalysisResult } from '@/interfaces/ai'
import type { WebMediaData, WeiboData } from '@/interfaces/data'
import { db } from '@/db/indexedDB'
import { updateWebMediaData, updateWeiboData } from '@/db/indexedDB'

/**
 * 情感数据（网媒或微博）
 */
export type SentimentData = WebMediaData | WeiboData

/**
 * 事件映射项
 */
export interface EventMapItem {
  eventId: string
  dataIds: Array<{ id: string | number; type: 'webmedia' | 'weibo' }>
  isCrossSource: boolean // 是否跨源事件（同时包含网媒和微博）
}

/**
 * AI分析引擎类
 */
export class AIAnalysisEngine {
  private analyzer: AIAnalyzer
  private abortController: AbortController | null = null
  private eventMap: Map<string, Array<{ id: string | number; type: 'webmedia' | 'weibo' }>> = new Map()

  constructor(analyzer: ReturnType<typeof import('./client').createAIAnalyzer>) {
    this.analyzer = analyzer
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(content: string, dataType: 'webmedia' | 'weibo'): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return `ai_${Math.abs(hash).toString(36)}_${dataType}`
  }

  /**
   * 从缓存获取
   */
  private async getFromCache(cacheKey: string): Promise<AIAnalysisResult | null> {
    try {
      const cached = await db.aiCache.where('cacheKey').equals(cacheKey).first()
      if (!cached) return null

      // 检查是否过期（24小时）
      const now = new Date()
      const createdAt = new Date(cached.createdAt)
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      if (hoursDiff > 24) {
        // 确保 id 是 number 类型
        const cacheId = typeof cached.id === 'number' ? cached.id : (typeof cached.id === 'string' ? parseInt(cached.id, 10) : null)
        if (cacheId !== null && !isNaN(cacheId)) {
          await db.aiCache.delete(cacheId)
        }
        return null
      }

      return JSON.parse(cached.result) as AIAnalysisResult
    } catch (error) {
      console.error('读取缓存失败:', error)
      return null
    }
  }

  /**
   * 保存到缓存
   */
  private async saveToCache(
    cacheKey: string,
    dataType: 'webmedia' | 'weibo',
    result: AIAnalysisResult
  ): Promise<void> {
    try {
      await db.aiCache.put({
        cacheKey,
        dataType,
        promptType: 'full',
        promptVersion: 'v1',
        result: JSON.stringify(result),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时后过期
      })
    } catch (error) {
      console.error('保存缓存失败:', error)
    }
  }

  /**
   * 分析单条数据
   * 优先查缓存 → 无则调 analyzer → 存结果
   * 填充 data.sentiment / aiKeywords / aiSummary / aiCategory / isWarning
   */
  async analyzeSingle(data: SentimentData): Promise<AIAnalysisResult> {
    const dataType = 'title' in data ? 'webmedia' : 'weibo'
    const content = 'title' in data ? data.content : data.content
    const cacheKey = this.generateCacheKey(content, dataType)

    // 1. 优先查缓存
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      // 填充数据字段
      await this.fillDataFields(data, cached, dataType)
      return cached
    }

    // 2. 调用 analyzer 进行分析
    try {
      // 情感分析
      const sentimentResult = await this.analyzer.analyzeSentiment(content, dataType)

      // 关键词提取
      const keywordsResult = await this.analyzer.extractKeywords(content, 10)
      const keywords = keywordsResult.map((kw) => kw.keyword)

      // 摘要生成
      const summary = await this.analyzer.generateSummary(content, 200)

      // 话题分类（包含 event_id）
      const topicResult = await this.analyzer.classifyTopic(content, dataType, 'title' in data ? data.title : undefined)

      // 构建分析结果
      const result: AIAnalysisResult = {
        sentiment: sentimentResult.sentiment,
        sentimentScore: sentimentResult.score,
        sentimentConfidence: sentimentResult.confidence,
        keywords,
        keywordsWithWeight: keywordsResult,
        summary,
        category: topicResult.category,
        topics: topicResult.topics,
        eventId: topicResult.event_id,
      }

      // 3. 保存到缓存
      await this.saveToCache(cacheKey, dataType, result)

      // 4. 填充数据字段
      await this.fillDataFields(data, result, dataType)

      // 5. 建立事件映射
      if (result.eventId) {
        this.addToEventMap(result.eventId, data.id!, dataType)
      }

      return result
    } catch (error) {
      console.error('AI分析失败:', error)
      // 降级方案：返回默认结果
      const fallbackResult: AIAnalysisResult = {
        sentiment: 'neutral',
        sentimentScore: 50,
        sentimentConfidence: 0.5,
        keywords: [],
        summary: '分析失败',
        category: '中性报道',
        topics: [],
      }
      await this.fillDataFields(data, fallbackResult, dataType)
      return fallbackResult
    }
  }

  /**
   * 填充数据字段
   */
  private async fillDataFields(
    data: SentimentData,
    result: AIAnalysisResult,
    dataType: 'webmedia' | 'weibo'
  ): Promise<void> {
    // 判断是否需要预警
    const isWarning = result.sentiment === 'negative' && (result.sentimentScore || 50) < 30
    const warningLevel: 'low' | 'medium' | 'high' | undefined = isWarning
      ? (result.sentimentScore || 50) < 20
        ? 'high'
        : (result.sentimentScore || 50) < 30
          ? 'medium'
          : 'low'
      : undefined

    // 确保 id 存在且有效
    if (!data.id) {
      console.warn('数据缺少 id，无法更新:', data)
      return
    }

    // 验证并规范化 id 类型
    let id: number | null = null
    if (typeof data.id === 'number') {
      id = data.id
    } else if (typeof data.id === 'string') {
      // 尝试从字符串中提取数字（处理 "WM123" 格式）
      const match = data.id.match(/\d+/)
      if (match) {
        const parsed = parseInt(match[0], 10)
        if (!isNaN(parsed) && parsed > 0) {
          id = parsed
        }
      }
      // 如果无法提取，尝试直接解析
      if (id === null) {
        const directParsed = parseInt(data.id, 10)
        if (!isNaN(directParsed) && directParsed > 0) {
          id = directParsed
        }
      }
    }
    
    if (id === null || id <= 0) {
      console.warn('数据 id 格式无效，无法更新:', { id: data.id, normalizedId: id, dataType, data })
      return
    }

    try {
      if (dataType === 'webmedia') {
        const webmediaData = data as WebMediaData
        await updateWebMediaData(id, {
          sentiment: result.sentiment,
          sentimentScore: result.sentimentScore,
          sentimentConfidence: result.sentimentConfidence,
          aiKeywords: result.keywords,
          aiSummary: result.summary,
          aiCategory: result.category,
          topics: result.topics,
          eventId: result.eventId,
          isWarning,
          warningLevel,
          analyzedAt: new Date().toISOString(),
        })
      } else {
        const weiboData = data as WeiboData
        await updateWeiboData(id, {
          sentiment: result.sentiment,
          sentimentScore: result.sentimentScore,
          sentimentConfidence: result.sentimentConfidence,
          aiKeywords: result.keywords,
          aiSummary: result.summary,
          aiCategory: result.category,
          topics: result.topics,
          eventId: result.eventId,
          isWarning,
          warningLevel,
          analyzedAt: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error('更新数据失败:', error, { id: data.id, dataType })
      // 不抛出错误，避免中断分析流程
    }
  }

  /**
   * 添加到事件映射
   */
  private addToEventMap(eventId: string, dataId: string | number, dataType: 'webmedia' | 'weibo'): void {
    if (!this.eventMap.has(eventId)) {
      this.eventMap.set(eventId, [])
    }
    this.eventMap.get(eventId)!.push({ id: dataId, type: dataType })
  }

  /**
   * 批量分析数据
   * 分批处理（每批5条，间隔200ms）
   * 支持取消（AbortController）
   * 返回 { success: number, failed: number }
   */
  async analyzeBatch(
    dataList: SentimentData[],
    onProgress?: (progress: {
      completed: number
      total: number
      current?: { id: string | number; type: 'webmedia' | 'weibo' }
      error?: Error
    }) => void
  ): Promise<{ success: number; failed: number }> {
    const batchSize = 5
    const batchInterval = 200
    let success = 0
    let failed = 0
    let completed = 0
    const total = dataList.length

    // 重置中止控制器
    this.abortController = new AbortController()

    // 分批处理
    for (let i = 0; i < dataList.length; i += batchSize) {
      // 检查是否已中止
      if (this.abortController.signal.aborted) {
        throw new Error('分析已中止')
      }

      const batch = dataList.slice(i, i + batchSize)

      // 并行处理当前批次
      const batchPromises = batch.map(async (data) => {
        try {
          await this.analyzeSingle(data)
          success++
          completed++
          onProgress?.({
            completed,
            total,
            current: { id: data.id!, type: 'title' in data ? 'webmedia' : 'weibo' },
          })
        } catch (error) {
          failed++
          completed++
          const err = error instanceof Error ? error : new Error(String(error))
          console.error('批量分析失败:', err)
          onProgress?.({
            completed,
            total,
            current: { id: data.id!, type: 'title' in data ? 'webmedia' : 'weibo' },
            error: err,
          })
        }
      })

      await Promise.all(batchPromises)

      // 批次间隔（最后一批不需要等待）
      if (i + batchSize < dataList.length) {
        await new Promise((resolve) => setTimeout(resolve, batchInterval))
      }
    }

    return { success, failed }
  }

  /**
   * 中止分析
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }

  /**
   * 获取事件映射
   * 返回所有事件及其关联的数据ID列表
   */
  getEventMap(): EventMapItem[] {
    const result: EventMapItem[] = []

    this.eventMap.forEach((dataIds, eventId) => {
      const webmediaIds = dataIds.filter((item) => item.type === 'webmedia')
      const weiboIds = dataIds.filter((item) => item.type === 'weibo')
      const isCrossSource = webmediaIds.length > 0 && weiboIds.length > 0

      result.push({
        eventId,
        dataIds,
        isCrossSource,
      })
    })

    return result
  }

  /**
   * 获取跨源事件列表
   * 返回同时包含网媒和微博的事件
   */
  getCrossSourceEvents(): EventMapItem[] {
    return this.getEventMap().filter((item) => item.isCrossSource)
  }

  /**
   * 清空事件映射
   */
  clearEventMap(): void {
    this.eventMap.clear()
  }
}

/**
 * 创建分析引擎实例（兼容旧接口）
 */
export function createAnalysisEngine(config?: { batchSize?: number; batchInterval?: number; timeout?: number }): AIAnalysisEngine {
  const analyzer = createAIAnalyzer({ mock: import.meta.env.VITE_AI_MOCK === 'true' })
  return new AIAnalysisEngine(analyzer)
}

/**
 * 兼容旧接口：AnalysisEngine 类型别名
 */
export type AnalysisEngine = AIAnalysisEngine
