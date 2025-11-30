<template>
  <div class="echarts-panel">
    <n-grid :cols="2" :x-gap="16" :y-gap="16" class="mb-4">
      <!-- 趋势折线图 -->
      <n-gi>
        <n-card title="情感趋势分析" class="h-80">
          <v-chart :option="trendOption" class="h-full" autoresize />
        </n-card>
      </n-gi>

      <!-- 情感环形图 -->
      <n-gi>
        <n-card title="情感分布" class="h-80">
          <v-chart :option="sentimentOption" class="h-full" autoresize />
        </n-card>
      </n-gi>

      <!-- 热词词云 -->
      <n-gi>
        <n-card title="关键词词云" class="h-80">
          <v-chart :option="wordcloudOption" class="h-full" autoresize />
        </n-card>
      </n-gi>

      <!-- 热度Top10 -->
      <n-gi>
        <n-card title="热度Top10" class="h-80">
          <v-chart :option="top10Option" class="h-full" autoresize />
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 数据源占比 -->
    <n-card title="数据源占比" class="mt-4">
      <v-chart :option="sourceOption" class="h-64" autoresize />
    </n-card>
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
    tooltip: { trigger: 'axis' },
    legend: { data: ['正面', '中性', '负面'] },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series: [
      { name: '正面', type: 'line', data: positive, smooth: true },
      { name: '中性', type: 'line', data: neutral, smooth: true },
      { name: '负面', type: 'line', data: negative, smooth: true },
    ],
  }
})

// 情感环形图（使用ref + watch）
const sentimentOption = ref({
  tooltip: { trigger: 'item' },
  legend: { orient: 'vertical', left: 'left' },
  series: [
    {
      name: '情感分布',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: true,
        formatter: '{b}: {c} ({d}%)',
      },
      emphasis: {
        label: { show: true, fontSize: 16, fontWeight: 'bold' },
      },
      data: [
        { value: 0, name: '正面' },
        { value: 0, name: '中性' },
        { value: 0, name: '负面' },
      ],
    },
  ],
})

const updateSentimentOption = async () => {
  const stats = await getSentimentStats()
  sentimentOption.value = {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [
      {
        name: '情感分布',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c} ({d}%)',
        },
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: 'bold' },
        },
        data: [
          { value: stats.webmedia.positive + stats.weibos.positive, name: '正面' },
          { value: stats.webmedia.neutral + stats.weibos.neutral, name: '中性' },
          { value: stats.webmedia.negative + stats.weibos.negative, name: '负面' },
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
  }
)

// 热词词云（简化版，使用柱状图展示）
const wordcloudOption = computed(() => {
  const keywordMap = new Map<string, number>()

  ;[...dataStore.webmediaData, ...dataStore.weiboData].forEach((item) => {
    if (item.keywords) {
      item.keywords.forEach((kw) => {
        keywordMap.set(kw, (keywordMap.get(kw) || 0) + 1)
      })
    }
  })

  const sorted = Array.from(keywordMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: sorted.map(([kw]) => kw),
      inverse: true,
    },
    series: [
      {
        type: 'bar',
        data: sorted.map(([, count]) => count),
        itemStyle: {
          color: (params: any) => {
            const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de']
            return colors[params.dataIndex % colors.length]
          },
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
          name: wm.title || wm.content.substring(0, 20),
          value: wm.viewCount + wm.likeCount * 2 + wm.commentCount * 3 + wm.shareCount * 5,
        }
      } else {
        const wb = item as any
        return {
          name: wb.content.substring(0, 20),
          value: wb.repostCount * 2 + wb.commentCount * 3 + wb.likeCount,
        }
      }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: items.map((i) => i.name),
      inverse: true,
    },
    series: [
      {
        type: 'bar',
        data: items.map((i) => i.value),
        itemStyle: { color: '#0ea5e9' },
      },
    ],
  }
})

// 数据源占比
const sourceOption = computed(() => {
  return {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [
      {
        name: '数据源',
        type: 'pie',
        radius: '50%',
        data: [
          { value: dataStore.webmediaData.length, name: '网媒' },
          { value: dataStore.weiboData.length, name: '微博' },
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
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
</style>

