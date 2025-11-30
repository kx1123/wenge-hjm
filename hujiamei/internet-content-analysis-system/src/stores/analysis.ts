import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createAIAnalyzer } from '@/ai/client'
import type { WebMediaData, WeiboData } from '@/interfaces/data'
import {
  getUnanalyzedWebMedia,
  getUnanalyzedWeibos,
  updateWebMediaData,
  updateWeiboData,
} from '@/db/indexedDB'

export const useAnalysisStore = defineStore('analysis', () => {
  // 批量分析状态
  const running = ref(false)
  const completed = ref(0)
  const total = ref(0)
  const error = ref<string | null>(null)

  /**
   * 批量分析网媒数据
   */
  async function analyzeWebMedia(limit?: number) {
    running.value = true
    error.value = null
    completed.value = 0

    try {
      const unanalyzed = await getUnanalyzedWebMedia(limit)
      total.value = unanalyzed.length

      if (total.value === 0) {
        running.value = false
        return
      }

      // 使用真实AI API（阿里通义千问）
      const analyzer = createAIAnalyzer({ mock: false })

      for (const item of unanalyzed) {
        try {
          const result = await analyzer.analyze({
            type: 'webmedia',
            content: item.content,
            title: item.title,
          })

          await updateWebMediaData(item.id!, {
            sentiment: result.sentiment,
            sentimentScore: result.sentimentScore,
            aiKeywords: result.keywords,
            aiSummary: result.summary,
            aiCategory: result.category,
            topics: result.topics,
            analyzedAt: new Date().toISOString(),
          })

          completed.value++
        } catch (err) {
          console.error(`分析失败 (ID: ${item.id}):`, err)
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '批量分析失败'
    } finally {
      running.value = false
    }
  }

  /**
   * 批量分析微博数据
   */
  async function analyzeWeibos(limit?: number) {
    running.value = true
    error.value = null
    completed.value = 0

    try {
      const unanalyzed = await getUnanalyzedWeibos(limit)
      total.value = unanalyzed.length

      if (total.value === 0) {
        running.value = false
        return
      }

      // 使用真实AI API（阿里通义千问）
      const analyzer = createAIAnalyzer({ mock: false })

      for (const item of unanalyzed) {
        try {
          const result = await analyzer.analyze({
            type: 'weibo',
            content: item.content,
            userName: item.userName,
          })

          await updateWeiboData(item.id!, {
            sentiment: result.sentiment,
            sentimentScore: result.sentimentScore,
            aiKeywords: result.keywords,
            aiSummary: result.summary,
            aiCategory: result.category,
            topics: result.topics,
            analyzedAt: new Date().toISOString(),
          })

          completed.value++
        } catch (err) {
          console.error(`分析失败 (ID: ${item.id}):`, err)
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '批量分析失败'
    } finally {
      running.value = false
    }
  }

  /**
   * 批量分析所有数据
   */
  async function analyzeAll(limit?: number) {
    await Promise.all([analyzeWebMedia(limit), analyzeWeibos(limit)])
  }

  /**
   * 重置状态
   */
  function reset() {
    running.value = false
    completed.value = 0
    total.value = 0
    error.value = null
  }

  return {
    running,
    completed,
    total,
    error,
    analyzeWebMedia,
    analyzeWeibos,
    analyzeAll,
    reset,
  }
})

