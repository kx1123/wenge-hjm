<template>
  <div class="chart-card">
    <div class="chart-header">
      <span class="chart-icon">🔥</span>
      <span class="chart-title">热词对比</span>
    </div>
    <div class="chart-content">
      <v-chart :option="chartOption" class="h-full" autoresize />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { useDataStore } from '@/stores/data'

use([CanvasRenderer, BarChart, TitleComponent, TooltipComponent, GridComponent])

const dataStore = useDataStore()

/**
 * 从文本中提取简单关键词（备用方案）
 */
function extractSimpleKeywords(text: string, maxWords: number = 5): string[] {
  if (!text) return []
  
  // 移除标点符号和特殊字符
  const cleaned = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
  
  // 提取中文词汇（2-4字）和英文单词（3+字符）
  const words = cleaned.match(/[\u4e00-\u9fa5]{2,4}|[a-zA-Z]{3,}/g) || []
  
  // 过滤停用词
  const stopWords = new Set(['的', '了', '在', '是', '有', '和', '与', '或', '但', '而', '等', '这个', '那个', '一个', '一些', '可以', '应该', '需要', '进行', '已经', '还是', '如果', '因为', '所以', '但是', '然而', '不过', '虽然', '尽管', '由于', '通过', '根据', '关于', '对于', '为了', '以及', '或者', '而且', '并且', '同时', '另外', '此外', '另外', '其他', '其他', '其他', '其他'])
  
  const filtered = words
    .filter((w) => w && !stopWords.has(w))
    .slice(0, maxWords)
  
  return filtered
}

const chartOption = computed(() => {
  // 网媒热词
  const webmediaKeywordMap = new Map<string, number>()
  dataStore.webmediaData.forEach((item) => {
    // 优先使用 AI 关键词
    let keywords: string[] = (item.keywords || item.aiKeywords || []) as string[]
    
    // 如果没有 AI 关键词，从标题和内容中提取
    if (keywords.length === 0) {
      const titleKeywords = extractSimpleKeywords(item.title || '', 3)
      const contentKeywords = extractSimpleKeywords(item.content || '', 5)
      keywords = [...titleKeywords, ...contentKeywords]
    }
    
    // 也可以从 topics 中提取
    if (item.topics && Array.isArray(item.topics)) {
      keywords = [...keywords, ...item.topics]
    }
    
    keywords.forEach((kw) => {
      if (kw && typeof kw === 'string') {
        const trimmed = kw.trim()
        if (trimmed && trimmed.length >= 2) {
          webmediaKeywordMap.set(trimmed, (webmediaKeywordMap.get(trimmed) || 0) + 1)
        }
      }
    })
  })

  // 微博热词
  const weiboKeywordMap = new Map<string, number>()
  dataStore.weiboData.forEach((item) => {
    // 优先使用 AI 关键词
    let keywords: string[] = (item.keywords || item.aiKeywords || []) as string[]
    
    // 如果没有 AI 关键词，从内容中提取
    if (keywords.length === 0) {
      keywords = extractSimpleKeywords(item.content || '', 5)
    }
    
    // 也可以从 topics 中提取
    if (item.topics && Array.isArray(item.topics)) {
      keywords = [...keywords, ...item.topics]
    }
    
    // 提取 #话题标签#
    const hashtags = (item.content || '').match(/#([^#]+)#/g) || []
    hashtags.forEach((tag) => {
      const cleanTag = tag.replace(/#/g, '').trim()
      if (cleanTag) {
        keywords.push(cleanTag)
      }
    })
    
    keywords.forEach((kw) => {
      if (kw && typeof kw === 'string') {
        const trimmed = kw.trim()
        if (trimmed && trimmed.length >= 2) {
          weiboKeywordMap.set(trimmed, (weiboKeywordMap.get(trimmed) || 0) + 1)
        }
      }
    })
  })

  const webmediaTop = Array.from(webmediaKeywordMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }))
    .filter((item) => item.count > 0) // 过滤掉计数为0的

  const weiboTop = Array.from(weiboKeywordMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }))
    .filter((item) => item.count > 0) // 过滤掉计数为0的

  // 调试信息（开发环境）
  if (import.meta.env.DEV) {
    console.log('热词对比数据:', {
      webmediaDataCount: dataStore.webmediaData.length,
      weiboDataCount: dataStore.weiboData.length,
      webmediaKeywords: webmediaKeywordMap.size,
      weiboKeywords: weiboKeywordMap.size,
      webmediaTop: webmediaTop.length,
      weiboTop: weiboTop.length,
    })
  }

  // 如果没有数据，显示"暂无数据"
  if (webmediaTop.length === 0 && weiboTop.length === 0) {
    return {
      backgroundColor: 'transparent',
      textStyle: { 
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowBlur: 4,
        textShadowOffsetX: 2,
        textShadowOffsetY: 2,
      },
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: 'center',
          style: {
            text: '暂无数据',
            fontSize: 18,
            fontWeight: 'bold',
            fill: '#9ca3af',
            textAlign: 'center',
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowBlur: 4,
            textShadowOffsetX: 2,
            textShadowOffsetY: 2,
          },
        },
      ],
    }
  }

  // 合并数据，左侧显示网媒，右侧显示微博
  const maxLen = Math.max(webmediaTop.length, weiboTop.length)
  const categories: string[] = []
  const webmediaData: number[] = []
  const weiboData: number[] = []

  for (let i = 0; i < maxLen; i++) {
    if (i < webmediaTop.length) {
      categories.push(webmediaTop[i].word)
      webmediaData.push(webmediaTop[i].count)
    } else {
      categories.push('')
      webmediaData.push(0)
    }

    if (i < weiboTop.length) {
      weiboData.push(weiboTop[i].count)
    } else {
      weiboData.push(0)
    }
  }

  return {
    backgroundColor: 'transparent',
    textStyle: { color: '#ffffff' },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderColor: '#00ffff',
      borderWidth: 2,
      textStyle: { color: '#ffffff' },
    },
    legend: {
      data: ['网媒热词', '微博热词'],
      textStyle: { color: '#ffffff', fontSize: 12 },
      top: 10,
    },
    grid: [
      { left: '3%', right: '52%', top: '15%', bottom: '10%' },
      { left: '52%', right: '3%', top: '15%', bottom: '10%' },
    ],
    xAxis: [
      {
        type: 'value',
        gridIndex: 0,
        axisLine: { lineStyle: { color: '#3b82f6', width: 2 } },
        axisLabel: { color: '#ffffff', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(59, 130, 246, 0.1)' } },
      },
      {
        type: 'value',
        gridIndex: 1,
        axisLine: { lineStyle: { color: '#10b981', width: 2 } },
        axisLabel: { color: '#ffffff', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(16, 185, 129, 0.1)' } },
      },
    ],
    yAxis: [
      {
        type: 'category',
        gridIndex: 0,
        data: webmediaTop.map((w) => w.word),
        inverse: true,
        axisLine: { lineStyle: { color: '#3b82f6', width: 2 } },
        axisLabel: { color: '#ffffff', fontSize: 10 },
      },
      {
        type: 'category',
        gridIndex: 1,
        data: weiboTop.map((w) => w.word),
        inverse: true,
        axisLine: { lineStyle: { color: '#10b981', width: 2 } },
        axisLabel: { color: '#ffffff', fontSize: 10 },
      },
    ],
    series: [
      {
        name: '网媒热词',
        type: 'bar',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: webmediaTop.map((w) => w.count),
        itemStyle: { color: '#3b82f6', borderRadius: [0, 4, 4, 0] },
        label: {
          show: true,
          position: 'right',
          color: '#ffffff',
          fontSize: 10,
        },
      },
      {
        name: '微博热词',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: weiboTop.map((w) => w.count),
        itemStyle: { color: '#10b981', borderRadius: [0, 4, 4, 0] },
        label: {
          show: true,
          position: 'right',
          color: '#ffffff',
          fontSize: 10,
        },
      },
    ],
  }
})
</script>

<style scoped>
.chart-card {
  @apply bg-gray-800/80 border border-blue-500/30 rounded-lg p-4 shadow-[0_0_10px_rgba(59,130,246,0.3)] backdrop-blur-sm;
  transition: all 0.3s ease;
  position: relative;
  overflow: visible;
  display: flex;
  flex-direction: column;
}

.chart-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #3b82f6, transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.chart-card:hover {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
  transform: translateY(-2px);
}

.chart-card:hover::before {
  opacity: 1;
}

.chart-header {
  @apply flex items-center gap-2 mb-3 text-gray-200;
}

.chart-icon {
  @apply text-xl;
}

.chart-title {
  @apply text-sm font-semibold;
}

.chart-content {
  flex: 1;
  min-height: 0;
  width: 100%;
}

</style>
