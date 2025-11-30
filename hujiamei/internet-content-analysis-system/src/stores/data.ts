import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WebMediaData, WeiboData } from '@/interfaces/data'
import { addWebMediaData, addWeiboData, getAllWebMedia, getAllWeibos } from '@/db/indexedDB'

export const useDataStore = defineStore('data', () => {
  // 原始数据
  const webmediaData = ref<WebMediaData[]>([])
  const weiboData = ref<WeiboData[]>([])

  // 加载状态
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 统计数据
  const stats = computed(() => {
    const webmediaTotal = webmediaData.value.length
    const weiboTotal = weiboData.value.length
    const webmediaAnalyzed = webmediaData.value.filter((d) => d.sentiment).length
    const weiboAnalyzed = weiboData.value.filter((d) => d.sentiment).length

    // 网媒统计详情
    const webmediaTimeRange = getTimeRange(webmediaData.value)
    const webmediaSources = getSourceDistribution(webmediaData.value)
    const webmediaSentiment = getSentimentDistribution(webmediaData.value)

    // 微博统计详情
    const weiboTimeRange = getTimeRange(weiboData.value)
    const weiboUserActivity = getUserActivity(weiboData.value)
    const weiboSentiment = getSentimentDistribution(weiboData.value)

    // 对比统计
    const sentimentComparison = {
      webmedia: webmediaSentiment,
      weibo: weiboSentiment,
    }

    return {
      webmedia: {
        total: webmediaTotal,
        analyzed: webmediaAnalyzed,
        unanalyzed: webmediaTotal - webmediaAnalyzed,
        timeRange: webmediaTimeRange,
        sourceDistribution: webmediaSources,
        sentiment: webmediaSentiment,
      },
      weibo: {
        total: weiboTotal,
        analyzed: weiboAnalyzed,
        unanalyzed: weiboTotal - weiboAnalyzed,
        timeRange: weiboTimeRange,
        userActivity: weiboUserActivity,
        sentiment: weiboSentiment,
      },
      total: {
        total: webmediaTotal + weiboTotal,
        analyzed: webmediaAnalyzed + weiboAnalyzed,
        unanalyzed: webmediaTotal + weiboTotal - webmediaAnalyzed - weiboAnalyzed,
      },
      comparison: {
        sentiment: sentimentComparison,
      },
    }
  })

  // 获取时间范围
  function getTimeRange(data: (WebMediaData | WeiboData)[]): { start: string; end: string } | null {
    if (data.length === 0) return null
    const times = data.map((d) => d.publishTime).filter(Boolean).sort()
    return {
      start: times[0] || '',
      end: times[times.length - 1] || '',
    }
  }

  // 获取来源分布（网媒）
  function getSourceDistribution(data: WebMediaData[]): Record<string, number> {
    const distribution: Record<string, number> = {}
    data.forEach((item) => {
      const source = item.source || '未知'
      distribution[source] = (distribution[source] || 0) + 1
    })
    return distribution
  }

  // 获取情感分布
  function getSentimentDistribution(
    data: (WebMediaData | WeiboData)[]
  ): { positive: number; neutral: number; negative: number } {
    return {
      positive: data.filter((d) => d.sentiment === 'positive').length,
      neutral: data.filter((d) => d.sentiment === 'neutral').length,
      negative: data.filter((d) => d.sentiment === 'negative').length,
    }
  }

  // 获取用户活跃度（微博）
  function getUserActivity(data: WeiboData[]): {
    totalUsers: number
    avgLikes: number
    avgComments: number
    avgReposts: number
  } {
    if (data.length === 0) {
      return { totalUsers: 0, avgLikes: 0, avgComments: 0, avgReposts: 0 }
    }
    const uniqueUsers = new Set(data.map((d) => d.userName))
    const totalLikes = data.reduce((sum, d) => sum + d.likeCount, 0)
    const totalComments = data.reduce((sum, d) => sum + d.commentCount, 0)
    const totalReposts = data.reduce((sum, d) => sum + d.repostCount, 0)

    return {
      totalUsers: uniqueUsers.size,
      avgLikes: Math.round(totalLikes / data.length),
      avgComments: Math.round(totalComments / data.length),
      avgReposts: Math.round(totalReposts / data.length),
    }
  }

  /**
   * 添加网媒数据
   */
  async function addWebMedia(newData: WebMediaData[]) {
    try {
      loading.value = true
      error.value = null
      const ids = await addWebMediaData(newData)
      // 重新加载数据
      await loadWebMedia()
      return ids
    } catch (err) {
      error.value = err instanceof Error ? err.message : '添加网媒数据失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 添加微博数据
   */
  async function addWeibo(newData: WeiboData[]) {
    try {
      loading.value = true
      error.value = null
      const ids = await addWeiboData(newData)
      // 重新加载数据
      await loadWeibos()
      return ids
    } catch (err) {
      error.value = err instanceof Error ? err.message : '添加微博数据失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载网媒数据
   */
  async function loadWebMedia(page: number = 1, pageSize: number = 1000) {
    try {
      loading.value = true
      error.value = null
      const result = await getAllWebMedia(page, pageSize)
      webmediaData.value = result.data
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载网媒数据失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载微博数据
   */
  async function loadWeibos(page: number = 1, pageSize: number = 1000) {
    try {
      loading.value = true
      error.value = null
      const result = await getAllWeibos(page, pageSize)
      weiboData.value = result.data
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载微博数据失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载所有数据
   */
  async function loadAll() {
    await Promise.all([loadWebMedia(), loadWeibos()])
  }

  /**
   * 清空数据
   */
  function clear() {
    webmediaData.value = []
    weiboData.value = []
    error.value = null
  }

  /**
   * 删除网媒数据源
   */
  async function deleteWebMedia() {
    try {
      loading.value = true
      error.value = null
      const { clearWebMedia } = await import('@/db/indexedDB')
      await clearWebMedia()
      webmediaData.value = []
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除网媒数据失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除微博数据源
   */
  async function deleteWeibo() {
    try {
      loading.value = true
      error.value = null
      const { clearWeibos } = await import('@/db/indexedDB')
      await clearWeibos()
      weiboData.value = []
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除微博数据失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除所有数据
   */
  async function deleteAll() {
    try {
      loading.value = true
      error.value = null
      const { clearAll } = await import('@/db/indexedDB')
      await clearAll()
      webmediaData.value = []
      weiboData.value = []
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除所有数据失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    webmediaData,
    weiboData,
    loading,
    error,
    stats,
    addWebMedia,
    addWeibo,
    loadWebMedia,
    loadWeibos,
    loadAll,
    clear,
    deleteWebMedia,
    deleteWeibo,
    deleteAll,
  }
})

