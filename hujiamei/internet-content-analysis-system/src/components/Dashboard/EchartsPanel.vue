<template>
  <div class="echarts-panel">
    <n-grid :cols="2" :x-gap="20" :y-gap="20" class="mb-6">
      <!-- 趋势折线图 -->
      <n-gi>
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-icon">📈</span>
            <span class="chart-title">情感趋势分析</span>
          </div>
          <div class="chart-content">
            <v-chart :option="trendOption" class="h-full" autoresize />
          </div>
        </div>
      </n-gi>

      <!-- 情感环形图 -->
      <n-gi>
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-icon">🎯</span>
            <span class="chart-title">情感分布</span>
          </div>
          <div class="chart-content">
            <v-chart :option="sentimentOption" class="h-full" autoresize />
          </div>
        </div>
      </n-gi>

      <!-- 热词词云 -->
      <n-gi>
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-icon">🔥</span>
            <span class="chart-title">关键词词云</span>
          </div>
          <div class="chart-content">
            <v-chart :option="wordcloudOption" class="h-full" autoresize />
          </div>
        </div>
      </n-gi>

      <!-- 热度Top10 -->
      <n-gi>
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-icon">⭐</span>
            <span class="chart-title">热度Top10</span>
          </div>
          <div class="chart-content">
            <v-chart :option="top10Option" class="h-full" autoresize />
          </div>
        </div>
      </n-gi>
    </n-grid>

    <!-- 数据源占比 -->
    <div class="chart-card">
      <div class="chart-header">
        <span class="chart-icon">📊</span>
        <span class="chart-title">数据源占比</span>
      </div>
      <div class="chart-content-large">
        <v-chart :option="sourceOption" class="h-full" autoresize />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { NCard, NGrid, NGi } from 'naive-ui'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { useDataStore } from '@/stores/data'
import { getSentimentStats } from '@/db/indexedDB'
import dayjs from 'dayjs'

use([
  CanvasRenderer,
  LineChart,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

const dataStore = useDataStore()

// 趋势折线图
const trendOption = computed(() => {
  const dates: string[] = []
  const positive: number[] = []
  const neutral: number[] = []
  const negative: number[] = []

  // 按日期统计（最近7天）
  const last7Days = Array.from({ length: 7 }, (_, i) =>
    dayjs().subtract(i, 'day').format('YYYY-MM-DD')
  ).reverse()

  last7Days.forEach((date) => {
    dates.push(date)
    const start = dayjs(date).startOf('day').toISOString()
    const end = dayjs(date).endOf('day').toISOString()

    const webmedia = dataStore.webmediaData.filter(
      (d) => d.publishTime >= start && d.publishTime <= end
    )
    const weibos = dataStore.weiboData.filter(
      (d) => d.publishTime >= start && d.publishTime <= end
    )

    const all = [...webmedia, ...weibos]
    positive.push(all.filter((d) => d.sentiment === 'positive').length)
    neutral.push(all.filter((d) => d.sentiment === 'neutral').length)
    negative.push(all.filter((d) => d.sentiment === 'negative').length)
  })

  return {
    backgroundColor: 'transparent',
    textStyle: {
      color: '#ffffff',
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#00ffff',
      borderWidth: 1,
      textStyle: {
        color: '#ffffff',
      },
    },
    legend: {
      data: ['正面', '中性', '负面'],
      textStyle: {
        color: '#ffffff',
      },
      top: 10,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: {
        lineStyle: {
          color: '#00ffff',
        },
      },
      axisLabel: {
        color: '#ffffff',
      },
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#00ffff',
        },
      },
      axisLabel: {
        color: '#ffffff',
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 255, 255, 0.1)',
        },
      },
    },
    series: [
      {
        name: '正面',
        type: 'line',
        data: positive,
        smooth: true,
        lineStyle: {
          color: '#00ff88',
          width: 3,
        },
        itemStyle: {
          color: '#00ff88',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 255, 136, 0.3)' },
              { offset: 1, color: 'rgba(0, 255, 136, 0.05)' },
            ],
          },
        },
      },
      {
        name: '中性',
        type: 'line',
        data: neutral,
        smooth: true,
        lineStyle: {
          color: '#ffaa00',
          width: 3,
        },
        itemStyle: {
          color: '#ffaa00',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 170, 0, 0.3)' },
              { offset: 1, color: 'rgba(255, 170, 0, 0.05)' },
            ],
          },
        },
      },
      {
        name: '负面',
        type: 'line',
        data: negative,
        smooth: true,
        lineStyle: {
          color: '#ff4444',
          width: 3,
        },
        itemStyle: {
          color: '#ff4444',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 68, 68, 0.3)' },
              { offset: 1, color: 'rgba(255, 68, 68, 0.05)' },
            ],
          },
        },
      },
    ],
  }
})

// 情感环形图（使用ref + watch）
const sentimentOption = ref({
  backgroundColor: 'transparent',
  textStyle: {
    color: '#ffffff',
  },
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderColor: '#00ffff',
    borderWidth: 1,
    textStyle: {
      color: '#ffffff',
    },
  },
  legend: {
    orient: 'vertical',
    left: 'left',
    textStyle: {
      color: '#ffffff',
    },
  },
  series: [
    {
      name: '情感分布',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: 'rgba(0, 0, 0, 0.5)',
        borderWidth: 2,
      },
      label: {
        show: true,
        formatter: '{b}: {c} ({d}%)',
        color: '#ffffff',
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 16,
          fontWeight: 'bold',
          color: '#00ffff',
        },
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(0, 255, 255, 0.5)',
        },
      },
      data: [
        { value: 0, name: '正面', itemStyle: { color: '#00ff88' } },
        { value: 0, name: '中性', itemStyle: { color: '#ffaa00' } },
        { value: 0, name: '负面', itemStyle: { color: '#ff4444' } },
      ],
    },
  ],
})

const updateSentimentOption = async () => {
  const stats = await getSentimentStats()
  sentimentOption.value = {
    backgroundColor: 'transparent',
    textStyle: {
      color: '#ffffff',
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#00ffff',
      borderWidth: 1,
      textStyle: {
        color: '#ffffff',
      },
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: {
        color: '#ffffff',
      },
    },
    series: [
      {
        name: '情感分布',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: 'rgba(0, 0, 0, 0.5)',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c} ({d}%)',
          color: '#ffffff',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
            color: '#00ffff',
          },
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(0, 255, 255, 0.5)',
          },
        },
        data: [
          {
            value: stats.webmedia.positive + stats.weibos.positive,
            name: '正面',
            itemStyle: { color: '#00ff88' },
          },
          {
            value: stats.webmedia.neutral + stats.weibos.neutral,
            name: '中性',
            itemStyle: { color: '#ffaa00' },
          },
          {
            value: stats.webmedia.negative + stats.weibos.negative,
            name: '负面',
            itemStyle: { color: '#ff4444' },
          },
        ],
      },
    ],
  }
}

onMounted(() => {
  updateSentimentOption()
})

watch(
  () => [dataStore.webmediaData.length, dataStore.weiboData.length],
  () => {
    updateSentimentOption()
  },
  { immediate: true }
)

// 热词词云（简化版，使用柱状图展示）
const wordcloudOption = computed(() => {
  const keywordMap = new Map<string, number>()

  ;[...dataStore.webmediaData, ...dataStore.weiboData].forEach((item) => {
    const keywords = item.keywords || item.aiKeywords || []
    if (keywords && keywords.length > 0) {
      keywords.forEach((kw) => {
        keywordMap.set(kw, (keywordMap.get(kw) || 0) + 1)
      })
    }
  })

  const sorted = Array.from(keywordMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  return {
    backgroundColor: 'transparent',
    textStyle: {
      color: '#ffffff',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#00ffff',
      borderWidth: 1,
      textStyle: {
        color: '#ffffff',
      },
    },
    grid: {
      left: '20%',
      right: '10%',
      bottom: '10%',
      top: '10%',
    },
    xAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#00ffff',
        },
      },
      axisLabel: {
        color: '#ffffff',
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 255, 255, 0.1)',
        },
      },
    },
    yAxis: {
      type: 'category',
      data: sorted.length > 0 ? sorted.map(([kw]) => kw) : ['暂无数据'],
      inverse: true,
      axisLine: {
        lineStyle: {
          color: '#00ffff',
        },
      },
      axisLabel: {
        color: '#ffffff',
      },
    },
    series: [
      {
        type: 'bar',
        data: sorted.length > 0 ? sorted.map(([, count]) => count) : [0],
        itemStyle: {
          color: (params: any) => {
            const colors = [
              '#00ffff',
              '#00ff88',
              '#ffaa00',
              '#ff4444',
              '#8a2be2',
              '#00bcd4',
              '#4caf50',
              '#ff9800',
              '#f44336',
              '#9c27b0',
            ]
            return colors[params.dataIndex % colors.length]
          },
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: 'right',
          color: '#ffffff',
        },
      },
    ],
  }
})

// 热度Top10
const top10Option = computed(() => {
  const items = [...dataStore.webmediaData, ...dataStore.weiboData]
    .map((item) => {
      if ('viewCount' in item) {
        const wm = item as any
        return {
          name: (wm.title || wm.content || '无标题').substring(0, 20),
          value: (wm.viewCount || 0) + (wm.likeCount || 0) * 2 + (wm.commentCount || 0) * 3 + (wm.shareCount || 0) * 5,
        }
      } else {
        const wb = item as any
        return {
          name: (wb.content || '无内容').substring(0, 20),
          value: (wb.repostCount || 0) * 2 + (wb.commentCount || 0) * 3 + (wb.likeCount || 0),
        }
      }
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  // 如果没有数据，返回空数据提示
  if (items.length === 0) {
    return {
      backgroundColor: 'transparent',
      textStyle: {
        color: '#ffffff',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#00ffff',
        borderWidth: 1,
        textStyle: {
          color: '#ffffff',
        },
      },
      grid: {
        left: '20%',
        right: '10%',
        bottom: '10%',
        top: '10%',
      },
      xAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: '#00ffff',
          },
        },
        axisLabel: {
          color: '#ffffff',
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(0, 255, 255, 0.1)',
          },
        },
      },
      yAxis: {
        type: 'category',
        data: ['暂无数据'],
        inverse: true,
        axisLine: {
          lineStyle: {
            color: '#00ffff',
          },
        },
        axisLabel: {
          color: '#ffffff',
        },
      },
      series: [
        {
          type: 'bar',
          data: [0],
          itemStyle: {
            color: '#666666',
            borderRadius: [0, 4, 4, 0],
          },
        },
      ],
    }
  }

  return {
    backgroundColor: 'transparent',
    textStyle: {
      color: '#ffffff',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#00ffff',
      borderWidth: 1,
      textStyle: {
        color: '#ffffff',
      },
    },
    grid: {
      left: '20%',
      right: '10%',
      bottom: '10%',
      top: '10%',
    },
    xAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#00ffff',
        },
      },
      axisLabel: {
        color: '#ffffff',
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 255, 255, 0.1)',
        },
      },
    },
    yAxis: {
      type: 'category',
      data: items.map((i) => i.name),
      inverse: true,
      axisLine: {
        lineStyle: {
          color: '#00ffff',
        },
      },
      axisLabel: {
        color: '#ffffff',
      },
    },
    series: [
      {
        type: 'bar',
        data: items.map((i) => i.value),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#00ffff' },
              { offset: 1, color: '#8a2be2' },
            ],
          },
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: 'right',
          color: '#ffffff',
        },
      },
    ],
  }
})

// 数据源占比
const sourceOption = computed(() => {
  const webmediaCount = dataStore.webmediaData.length
  const weiboCount = dataStore.weiboData.length
  const total = webmediaCount + weiboCount

  // 如果总数为0，显示空状态提示
  if (total === 0) {
    return {
      backgroundColor: 'transparent',
      textStyle: {
        color: '#ffffff',
      },
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: 'center',
          style: {
            text: '暂无数据',
            fontSize: 16,
            fill: '#ffffff',
            textAlign: 'center',
          },
        },
      ],
      series: [
        {
          name: '数据源',
          type: 'pie',
          radius: '50%',
          silent: true,
          data: [
            {
              value: 1,
              name: '暂无数据',
              itemStyle: { color: 'rgba(255, 255, 255, 0.1)' },
            },
          ],
          label: {
            show: false,
          },
        },
      ],
    }
  }

  return {
    backgroundColor: 'transparent',
    textStyle: {
      color: '#ffffff',
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#00ffff',
      borderWidth: 1,
      textStyle: {
        color: '#ffffff',
      },
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: {
        color: '#ffffff',
        fontSize: 14,
      },
      data: ['网媒', '微博'],
    },
    series: [
      {
        name: '数据源',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: 'rgba(0, 0, 0, 0.5)',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}\n{c} ({d}%)',
          color: '#ffffff',
          fontSize: 12,
        },
        labelLine: {
          show: true,
          lineStyle: {
            color: '#ffffff',
          },
        },
        data: [
          {
            value: webmediaCount,
            name: '网媒',
            itemStyle: { color: '#00ffff' },
          },
          {
            value: weiboCount,
            name: '微博',
            itemStyle: { color: '#00ff88' },
          },
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 20,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 255, 255, 0.5)',
          },
          label: {
            color: '#00ffff',
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
      },
    ],
  }
})
</script>

<style scoped>
.echarts-panel {
  width: 100%;
}

.chart-card {
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-card:hover {
  border-color: rgba(0, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 255, 255, 0.2);
  transform: translateY(-2px);
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chart-icon {
  font-size: 1.5rem;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));
}

.chart-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.chart-content {
  flex: 1;
  min-height: 300px;
}

.chart-content-large {
  flex: 1;
  min-height: 250px;
}
</style>

