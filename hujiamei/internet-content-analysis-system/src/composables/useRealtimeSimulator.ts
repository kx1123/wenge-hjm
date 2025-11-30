import { ref, onUnmounted } from 'vue'
import { getRandomUnanalyzedWebMedia, getRandomUnanalyzedWeibo } from '@/db/indexedDB'
import type { WebMediaData, WeiboData } from '@/interfaces/data'
import { createAIAnalyzer } from '@/ai/client'
import { updateWebMediaData, updateWeiboData } from '@/db/indexedDB'
import { useDataStore } from '@/stores/data'

/**
 * 实时模拟器返回的数据项
 */
export interface SimulatedDataItem {
  id: number
  type: 'webmedia' | 'weibo'
  data: WebMediaData | WeiboData
  isNew: boolean
  timestamp: string
}

/**
 * 实时模拟器Composable
 * 方案A：每5-15秒随机推送一条未分析数据，标记为NEW，并触发高亮动画
 */
export interface RealtimeStats {
  webmediaNew: number
  weiboNew: number
  webmediaActive: number
  weiboActive: number
  webmediaInteraction: number
  weiboInteraction: number
}

export function useRealtimeSimulator() {
  const isRunning = ref(false)
  const intervalId = ref<number | null>(null)
  const simulatedData = ref<SimulatedDataItem[]>([])
  const latestItem = ref<SimulatedDataItem | null>(null)
  const stats = ref<RealtimeStats>({
    webmediaNew: 0,
    weiboNew: 0,
    webmediaActive: 0,
    weiboActive: 0,
    webmediaInteraction: 0,
    weiboInteraction: 0,
  })
  const dataStore = useDataStore()

  /**
   * 启动模拟
   */
  const start = () => {
    if (isRunning.value) return

    isRunning.value = true
    simulatedData.value = []

    const pushNext = async () => {
      try {
        // 随机选择网媒或微博（50%概率）
        const isWebMedia = Math.random() > 0.5
        const item = isWebMedia
          ? await getRandomUnanalyzedWebMedia()
          : await getRandomUnanalyzedWeibo()

        if (!item || !item.id) {
          // 没有未分析的数据了，等待一段时间再试
          setTimeout(pushNext, 10000)
          return
        }

        // 创建模拟数据项
        const simulatedItem: SimulatedDataItem = {
          id: item.id,
          type: isWebMedia ? 'webmedia' : 'weibo',
          data: item,
          isNew: true,
          timestamp: new Date().toISOString(),
        }

        // 添加到列表
        simulatedData.value.unshift(simulatedItem)
        latestItem.value = simulatedItem

        // 限制列表长度（保留最近50条）
        if (simulatedData.value.length > 50) {
          simulatedData.value = simulatedData.value.slice(0, 50)
        }

        // 更新实时统计
        if (isWebMedia) {
          stats.value.webmediaNew++
          const wm = item as WebMediaData
          stats.value.webmediaActive = new Set(
            dataStore.webmediaData.map((d) => d.source).filter(Boolean)
          ).size
          stats.value.webmediaInteraction += (wm.viewCount || 0) + (wm.shareCount || 0)
        } else {
          stats.value.weiboNew++
          const wb = item as WeiboData
          stats.value.weiboActive = new Set(
            dataStore.weiboData.map((d) => d.userName).filter(Boolean)
          ).size
          stats.value.weiboInteraction += (wb.likeCount || 0) + (wb.commentCount || 0) + (wb.repostCount || 0)
        }

        // 刷新数据存储
        await dataStore.loadAll()

        // 自动分析（使用真实AI API）
        const analyzer = createAIAnalyzer({ mock: false })
        const analysisResult = await analyzer.analyze({
          type: simulatedItem.type,
          content: isWebMedia ? (item as WebMediaData).content : (item as WeiboData).content,
          title: isWebMedia ? (item as WebMediaData).title : undefined,
          userName: !isWebMedia ? (item as WeiboData).userName : undefined,
        })

        // 更新数据库
        if (isWebMedia) {
          await updateWebMediaData(item.id, {
            ...analysisResult,
            analyzedAt: new Date().toISOString(),
          })
        } else {
          await updateWeiboData(item.id, {
            ...analysisResult,
            analyzedAt: new Date().toISOString(),
          })
        }

        // 更新模拟项的数据
        simulatedItem.data = {
          ...item,
          ...analysisResult,
          analyzedAt: new Date().toISOString(),
        } as WebMediaData | WeiboData

        // 3秒后移除NEW标记
        setTimeout(() => {
          const index = simulatedData.value.findIndex((d) => d.id === item.id && d.type === simulatedItem.type)
          if (index !== -1) {
            simulatedData.value[index].isNew = false
          }
        }, 3000)
      } catch (error) {
        console.error('实时模拟推送失败:', error)
      }

      // 随机间隔5-15秒
      const nextInterval = 5000 + Math.random() * 10000
      intervalId.value = window.setTimeout(pushNext, nextInterval)
    }

    // 立即推送第一条
    pushNext()
  }

  /**
   * 停止模拟
   */
  const stop = () => {
    if (intervalId.value !== null) {
      clearTimeout(intervalId.value)
      intervalId.value = null
    }
    isRunning.value = false
  }

  /**
   * 清理
   */
  onUnmounted(() => {
    stop()
  })

  return {
    isRunning,
    simulatedData,
    latestItem,
    stats,
    start,
    stop,
  }
}

