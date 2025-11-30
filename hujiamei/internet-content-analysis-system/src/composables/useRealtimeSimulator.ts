import { ref, onUnmounted } from 'vue'
import { getRandomUnanalyzedWebMedia, getRandomUnanalyzedWeibo } from '@/db/indexedDB'
import type { WebMediaData, WeiboData } from '@/interfaces/data'
import { createAIAnalyzer } from '@/ai/client'
import { updateWebMediaData, updateWeiboData } from '@/db/indexedDB'

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
export function useRealtimeSimulator() {
  const isRunning = ref(false)
  const intervalId = ref<number | null>(null)
  const simulatedData = ref<SimulatedDataItem[]>([])
  const latestItem = ref<SimulatedDataItem | null>(null)

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

        // 自动分析（可选）
        const analyzer = createAIAnalyzer({ mock: true })
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
    start,
    stop,
  }
}

