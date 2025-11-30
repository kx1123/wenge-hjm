/**
 * AI分析引擎
 * 提供批量分析、单条分析、缓存、降级等功能
 */

import { createAIAnalyzer, AIAnalyzer } from './client'
import type { AIAnalysisResult, AnalyzeOptions, SentimentAnalysisResult } from '@/interfaces/ai'
import type { WebMediaData, WeiboData } from '@/interfaces/data'
import { db, type AICache } from '@/db/indexedDB'
import { updateWebMediaData, updateWeiboData } from '@/db/indexedDB'
import { extractEventId } from './eventLinker'

/**
 * 分析引擎配置
 */
export interface AnalysisEngineConfig {
  batchSize?: number // 批量分析大小（默认5）
  batchInterval?: number // 批量分析间隔（默认200ms）
  timeout?: number // 超时时间（默认8s）
  enableCache?: boolean // 是否启用缓存（默认true）
  cacheExpiry?: number // 缓存过期时间（默认7天，单位：毫秒）
  maxRetries?: number // 最大重试次数（默认2）
}

/**
 * 分析进度回调
 */
export type AnalysisProgressCallback = (progress: {
  completed: number
  total: number
  current?: { id: string | number; type: 'webmedia' | 'weibo' }
  error?: Error
}) => void

/**
 * 内容哈希函数（简单实现）
 */
function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * 生成缓存键
 */
function generateCacheKey(
  content: string,
  dataType: 'webmedia' | 'weibo',
  promptType: 'sentiment' | 'keywords' | 'summary' | 'category' | 'topic' | 'full',
  promptVersion: string = 'v1'
): string {
  const hash = hashContent(content)
  return `${hash}_${dataType}_${promptType}_${promptVersion}`
}

/**
 * 从缓存获取结果
 */
async function getFromCache(cacheKey: string): Promise<AIAnalysisResult | null> {
  try {
    const cached = await db.aiCache.where('cacheKey').equals(cacheKey).first()
    if (!cached) return null

    // 检查是否过期
    if (new Date(cached.expiresAt) < new Date()) {
      await db.aiCache.delete(cached.id!)
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
async function saveToCache(
  cacheKey: string,
  dataType: 'webmedia' | 'weibo',
  promptType: 'sentiment' | 'keywords' | 'summary' | 'category' | 'topic' | 'full',
  result: AIAnalysisResult,
  expiresIn: number = 7 * 24 * 60 * 60 * 1000 // 7天
): Promise<void> {
  try {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + expiresIn)

    await db.aiCache.put({
      cacheKey,
      dataType,
      promptType,
      promptVersion: 'v1',
      result: JSON.stringify(result),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('保存缓存失败:', error)
  }
}

/**
 * 清理过期缓存
 */
export async function cleanExpiredCache(): Promise<number> {
  try {
    const now = new Date().toISOString()
    const expired = await db.aiCache.where('expiresAt').below(now).toArray()
    const ids = expired.map((item) => item.id!).filter((id) => id !== undefined)
    if (ids.length > 0) {
      await db.aiCache.bulkDelete(ids)
    }
    return ids.length
  } catch (error) {
    console.error('清理过期缓存失败:', error)
    return 0
  }
}

/**
 * AI分析引擎类
 */
export class AnalysisEngine {
  private analyzer: AIAnalyzer
  private config: Required<AnalysisEngineConfig>
  private abortController: AbortController | null = null

  constructor(config: AnalysisEngineConfig = {}) {
    this.config = {
      batchSize: config.batchSize ?? 5,
      batchInterval: config.batchInterval ?? 200,
      timeout: config.timeout ?? 8000,
      enableCache: config.enableCache ?? true,
      cacheExpiry: config.cacheExpiry ?? 7 * 24 * 60 * 60 * 1000,
      maxRetries: config.maxRetries ?? 2,
    }
    this.analyzer = createAIAnalyzer({ mock: import.meta.env.VITE_AI_MOCK === 'true' })
  }

  /**
   * 分析单条数据（带缓存和降级）
   */
  async analyzeItem(
    item: WebMediaData | WeiboData,
    options?: { useCache?: boolean; retry?: boolean }
  ): Promise<AIAnalysisResult> {
    const useCache = options?.useCache ?? this.config.enableCache
    const dataType = 'title' in item ? 'webmedia' : 'weibo'
    const content = 'title' in item ? item.content : item.content
    const cacheKey = generateCacheKey(content, dataType, 'full', 'v1')

    // 1. 尝试从缓存获取
    if (useCache) {
      const cached = await getFromCache(cacheKey)
      if (cached) {
        return cached
      }
    }

    // 2. 构建分析选项
    const analyzeOptions: AnalyzeOptions = {
      type: dataType,
      content,
      title: 'title' in item ? item.title : undefined,
      userName: 'userName' in item ? item.userName : undefined,
    }

        // 3. 尝试调用AI（带重试）
        let lastError: Error | null = null
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
          try {
            // 创建超时控制器
            const timeoutId = setTimeout(() => {
              if (this.abortController) {
                this.abortController.abort()
              }
            }, this.config.timeout)

            const result = await this.analyzer.analyze(analyzeOptions)

            clearTimeout(timeoutId)

            // 4. 提取事件ID（从话题标签中）
            const eventId = extractEventId(item)
            if (eventId) {
              result.eventId = eventId
            }

            // 保存到缓存
            if (useCache) {
              await saveToCache(cacheKey, dataType, 'full', result, this.config.cacheExpiry)
            }

            return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt < this.config.maxRetries) {
          // 等待后重试
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
    }

    // 4. 降级方案：返回默认值
    console.warn('AI分析失败，使用降级方案:', lastError)
    return this.getFallbackResult(dataType)
  }

  /**
   * 批量分析数据
   */
  async analyzeBatch(
    items: (WebMediaData | WeiboData)[],
    onProgress?: AnalysisProgressCallback
  ): Promise<AIAnalysisResult[]> {
    const results: AIAnalysisResult[] = []
    const total = items.length
    let completed = 0

    // 重置中止控制器
    this.abortController = new AbortController()

    // 分批处理
    for (let i = 0; i < items.length; i += this.config.batchSize) {
      if (this.abortController.signal.aborted) {
        throw new Error('分析已中止')
      }

      const batch = items.slice(i, i + this.config.batchSize)
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          try {
            const result = await this.analyzeItem(item)
            completed++

            // 更新数据库
            if ('title' in item) {
              await updateWebMediaData(item.id!, {
                sentiment: result.sentiment,
                sentimentScore: result.sentimentScore,
                sentimentConfidence: result.sentimentConfidence,
                aiKeywords: result.keywords,
                aiSummary: result.summary,
                aiCategory: result.category,
                topics: result.topics,
                eventId: result.eventId,
                analyzedAt: new Date().toISOString(),
              })
            } else {
              await updateWeiboData(item.id!, {
                sentiment: result.sentiment,
                sentimentScore: result.sentimentScore,
                sentimentConfidence: result.sentimentConfidence,
                aiKeywords: result.keywords,
                aiSummary: result.summary,
                aiCategory: result.category,
                topics: result.topics,
                eventId: result.eventId,
                analyzedAt: new Date().toISOString(),
              })
            }

            onProgress?.({
              completed,
              total,
              current: { id: item.id!, type: 'title' in item ? 'webmedia' : 'weibo' },
            })

            return result
          } catch (error) {
            completed++
            const err = error instanceof Error ? error : new Error(String(error))
            onProgress?.({
              completed,
              total,
              current: { id: item.id!, type: 'title' in item ? 'webmedia' : 'weibo' },
              error: err,
            })
            return this.getFallbackResult('title' in item ? 'webmedia' : 'weibo')
          }
        })
      )

      results.push(...batchResults)

      // 批次间隔
      if (i + this.config.batchSize < items.length) {
        await new Promise((resolve) => setTimeout(resolve, this.config.batchInterval))
      }
    }

    return results
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
   * 降级方案：返回默认结果
   */
  private getFallbackResult(dataType: 'webmedia' | 'weibo'): AIAnalysisResult {
    return {
      sentiment: 'neutral',
      sentimentScore: 50,
      sentimentConfidence: 0.5,
      keywords: dataType === 'webmedia' ? ['报道', '新闻'] : ['讨论', '话题'],
      summary: dataType === 'webmedia' ? '这是一条网媒报道。' : '这是一条微博内容。',
      category: '中性报道',
      topics: [],
    }
  }
}

/**
 * 创建分析引擎实例
 */
export function createAnalysisEngine(config?: AnalysisEngineConfig): AnalysisEngine {
  return new AnalysisEngine(config)
}

