/**
 * AI分析 Store
 * 管理分析状态、结果、进度
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createAnalysisEngine, type AnalysisEngine } from '@/ai/analysisEngine'
import type { AIAnalysisResult } from '@/interfaces/ai'
import type { WebMediaData, WeiboData } from '@/interfaces/data'
import { getUnanalyzedWebMedia, getUnanalyzedWeibos, getAllWebMediaAll, getAllWeibosAll } from '@/db/indexedDB'
import { buildEventMap } from '@/ai/eventLinker'

/**
 * 分析状态
 */
export type AnalysisStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error'

/**
 * AI分析 Store
 */
export const useAIAnalysisStore = defineStore('aiAnalysis', () => {
  // 状态
  const status = ref<AnalysisStatus>('idle')
  const progress = ref({ completed: 0, total: 0 })
  const currentItem = ref<{ id: string | number; type: 'webmedia' | 'weibo' } | null>(null)
  const error = ref<string | null>(null)

  // 分析引擎
  const engine = ref<AnalysisEngine | null>(null)

  // 分析结果统计
  const results = ref<{
    webmedia: { total: number; analyzed: number; bySentiment: { positive: number; neutral: number; negative: number } }
    weibo: { total: number; analyzed: number; bySentiment: { positive: number; neutral: number; negative: number } }
  }>({
    webmedia: { total: 0, analyzed: 0, bySentiment: { positive: 0, neutral: 0, negative: 0 } },
    weibo: { total: 0, analyzed: 0, bySentiment: { positive: 0, neutral: 0, negative: 0 } },
  })

  // 事件映射（eventId -> 相关数据项）
  const eventMap = ref<Map<string, Array<{ type: 'webmedia' | 'weibo'; id: string | number }>>>(new Map())

  // 计算属性
  const isRunning = computed(() => status.value === 'running')
  const isPaused = computed(() => status.value === 'paused')
  const progressPercent = computed(() => {
    if (progress.value.total === 0) return 0
    return Math.round((progress.value.completed / progress.value.total) * 100)
  })

  /**
   * 初始化分析引擎
   */
  function initEngine(config?: { batchSize?: number; batchInterval?: number; timeout?: number }) {
    engine.value = createAnalysisEngine(config)
  }

  /**
   * 分析网媒数据
   */
  async function analyzeWebMedia(limit?: number) {
    if (status.value === 'running') {
      throw new Error('分析正在进行中')
    }

    try {
      status.value = 'running'
      error.value = null

      if (!engine.value) {
        initEngine()
      }

      const unanalyzed = await getUnanalyzedWebMedia(limit)
      if (unanalyzed.length === 0) {
        status.value = 'completed'
        return
      }

      progress.value = { completed: 0, total: unanalyzed.length }
      currentItem.value = null

      await engine.value.analyzeBatch(unanalyzed, (progressData) => {
        progress.value = { completed: progressData.completed, total: progressData.total }
        currentItem.value = progressData.current || null
        if (progressData.error) {
          console.error('分析错误:', progressData.error)
        }
      })

      status.value = 'completed'
      await updateResults()
    } catch (err) {
      status.value = 'error'
      error.value = err instanceof Error ? err.message : '分析失败'
      throw err
    }
  }

  /**
   * 分析微博数据
   */
  async function analyzeWeibos(limit?: number) {
    if (status.value === 'running') {
      throw new Error('分析正在进行中')
    }

    try {
      status.value = 'running'
      error.value = null

      if (!engine.value) {
        initEngine()
      }

      const unanalyzed = await getUnanalyzedWeibos(limit)
      if (unanalyzed.length === 0) {
        status.value = 'completed'
        return
      }

      progress.value = { completed: 0, total: unanalyzed.length }
      currentItem.value = null

      await engine.value.analyzeBatch(unanalyzed, (progressData) => {
        progress.value = { completed: progressData.completed, total: progressData.total }
        currentItem.value = progressData.current || null
        if (progressData.error) {
          console.error('分析错误:', progressData.error)
        }
      })

      status.value = 'completed'
      await updateResults()
    } catch (err) {
      status.value = 'error'
      error.value = err instanceof Error ? err.message : '分析失败'
      throw err
    }
  }

  /**
   * 分析所有数据
   */
  async function analyzeAll(limit?: number) {
    await Promise.all([analyzeWebMedia(limit), analyzeWeibos(limit)])
  }

  /**
   * 暂停分析
   */
  function pause() {
    if (engine.value && status.value === 'running') {
      engine.value.abort()
      status.value = 'paused'
    }
  }

  /**
   * 继续分析
   */
  async function resume() {
    if (status.value === 'paused') {
      // 重新开始分析未完成的数据
      const remaining = progress.value.total - progress.value.completed
      if (remaining > 0) {
        await analyzeAll(remaining)
      }
    }
  }

  /**
   * 停止分析
   */
  function stop() {
    if (engine.value) {
      engine.value.abort()
    }
    status.value = 'idle'
    progress.value = { completed: 0, total: 0 }
    currentItem.value = null
    error.value = null
  }

  /**
   * 重置状态
   */
  function reset() {
    stop()
    results.value = {
      webmedia: { total: 0, analyzed: 0, bySentiment: { positive: 0, neutral: 0, negative: 0 } },
      weibo: { total: 0, analyzed: 0, bySentiment: { positive: 0, neutral: 0, negative: 0 } },
    }
  }

  /**
   * 更新分析结果统计
   */
  async function updateResults() {
    // 这里可以从数据库重新统计，或者从分析过程中累积
    // 简化实现：从数据库查询
    const { getStats } = await import('@/db/indexedDB')
    const stats = await getStats()
    results.value = {
      webmedia: {
        total: stats.webmedia.total,
        analyzed: stats.webmedia.analyzed,
        bySentiment: stats.webmedia.bySentiment,
      },
      weibo: {
        total: stats.weibo.total,
        analyzed: stats.weibo.analyzed,
        bySentiment: stats.weibo.bySentiment,
      },
    }

    // 更新事件映射
    const [webmediaData, weiboData] = await Promise.all([
      getAllWebMediaAll(),
      getAllWeibosAll(),
    ])
    eventMap.value = buildEventMap(webmediaData, weiboData)
  }

  return {
    // 状态
    status,
    progress,
    currentItem,
    error,
    isRunning,
    isPaused,
    progressPercent,
    results,
    eventMap,

    // 方法
    initEngine,
    analyzeWebMedia,
    analyzeWeibos,
    analyzeAll,
    pause,
    resume,
    stop,
    reset,
    updateResults,
  }
})

