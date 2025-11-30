<template>
  <div class="realtime-dashboard">
    <!-- 顶部关键指标 -->
    <KeyMetrics />

    <!-- 主布局：交错排列的图表网格 -->
    <div class="dashboard-layout">
      <!-- 第1行：舆情趋势对比（全宽） -->
      <div class="chart-card chart-full">
        <div class="chart-header">
          <span class="chart-icon">📈</span>
          <span class="chart-title">舆情趋势对比</span>
          <n-select
            v-model:value="timeRange"
            :options="timeRangeOptions"
            size="small"
            style="width: 120px; margin-left: auto;"
          />
        </div>
        <div class="chart-content">
          <v-chart :option="comparisonTrendOption" class="h-full" autoresize />
        </div>
      </div>

      <!-- 第2行：网媒趋势 + 微博趋势（两个并排） -->
      <div class="chart-card chart-half">
        <div class="chart-header">
          <span class="chart-icon">📈</span>
          <span class="chart-title">网媒趋势对比</span>
        </div>
        <div class="chart-content">
          <v-chart :option="webmediaTrendOption" class="h-full" autoresize />
        </div>
      </div>
      <div class="chart-card chart-half">
        <div class="chart-header">
          <span class="chart-icon">📈</span>
          <span class="chart-title">微博趋势对比</span>
        </div>
        <div class="chart-content">
          <v-chart :option="weiboTrendOption" class="h-full" autoresize />
        </div>
      </div>

      <!-- 第3行：数据源占比（全宽） -->
      <div class="chart-card chart-full">
        <div class="chart-header">
          <span class="chart-icon">📊</span>
          <span class="chart-title">数据源占比</span>
        </div>
        <div class="chart-content">
          <v-chart :option="sourceOption" class="h-full" autoresize />
        </div>
      </div>

      <!-- 第4行：网媒情感分布 + 微博情感分布（两个并排） -->
      <div class="chart-card chart-half">
        <div class="chart-header">
          <span class="chart-icon">🎯</span>
          <span class="chart-title">网媒情感分布</span>
        </div>
        <div class="chart-content">
          <v-chart :option="webmediaSentimentOption" class="h-full" autoresize />
        </div>
      </div>
      <div class="chart-card chart-half">
        <div class="chart-header">
          <span class="chart-icon">🎯</span>
          <span class="chart-title">微博情感分布</span>
        </div>
        <div class="chart-content">
          <v-chart :option="weiboSentimentOption" class="h-full" autoresize />
        </div>
      </div>

      <!-- 第5行：热词词云（全宽） -->
      <div class="chart-card chart-full">
        <div class="chart-header">
          <span class="chart-icon">🔥</span>
          <span class="chart-title">热词词云</span>
        </div>
        <div class="chart-content">
          <v-chart :option="wordcloudOption" class="h-full" autoresize />
        </div>
      </div>

      <!-- 第6行：网媒热门报道Top10 + 微博热门话题Top10（两个并排） -->
      <div class="chart-card chart-half">
        <div class="chart-header">
          <span class="chart-icon">⭐</span>
          <span class="chart-title">网媒热门报道 Top 10</span>
        </div>
        <div class="chart-content">
          <v-chart :option="webmediaTop10Option" class="h-full" autoresize />
        </div>
      </div>
      <div class="chart-card chart-half">
        <div class="chart-header">
          <span class="chart-icon">⭐</span>
          <span class="chart-title">微博热门话题 Top 10</span>
        </div>
        <div class="chart-content">
          <v-chart :option="weiboTop10Option" class="h-full" autoresize />
        </div>
      </div>

      <!-- 第7行：实时数据流（全宽，如果运行中） -->
      <div v-if="simulator.isRunning" class="chart-card chart-full realtime-stream-card">
        <div class="chart-header">
          <span class="chart-icon">⚡</span>
          <span class="chart-title">实时数据流</span>
          <n-tag size="small" type="success">运行中</n-tag>
        </div>
        <div class="realtime-stream-content">
          <div
            v-for="item in simulator.simulatedData.value.slice(0, 8)"
            :key="`${item.type}-${item.id}`"
            class="stream-item"
            :class="{ 'stream-item-new': item.isNew }"
          >
            <n-tag :type="item.type === 'webmedia' ? 'primary' : 'success'" size="small">
              {{ item.type === 'webmedia' ? '网媒' : '微博' }}
            </n-tag>
            <span v-if="item.isNew" class="new-badge">NEW</span>
            <span class="stream-content">{{ getItemContent(item) }}</span>
            <span class="stream-time">{{ formatTime(item.timestamp) }}</span>
          </div>
        </div>
      </div>

      <!-- 第8行：媒体活跃度分布 + 影响力用户分布（两个并排） -->
      <div class="chart-card chart-half">
        <div class="chart-header">
          <span class="chart-icon">📰</span>
          <span class="chart-title">媒体活跃度分布</span>
        </div>
        <div class="chart-content">
          <v-chart :option="webmediaSourceOption" class="h-full" autoresize />
        </div>
      </div>
      <div class="chart-card chart-half">
        <div class="chart-header">
          <span class="chart-icon">👥</span>
          <span class="chart-title">影响力用户分布</span>
        </div>
        <div class="chart-content">
          <v-chart :option="weiboUserOption" class="h-full" autoresize />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { NSelect, NTag } from 'naive-ui'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart, BarChart, HeatmapChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  GraphicComponent,
  VisualMapComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { useDataStore } from '@/stores/data'
import { useRealtimeSimulator } from '@/composables/useRealtimeSimulator'
import { getSentimentStats } from '@/db/indexedDB'
import KeyMetrics from './KeyMetrics.vue'
import type { WebMediaData, WeiboData } from '@/interfaces/data'
import dayjs from 'dayjs'

use([
  CanvasRenderer,
  LineChart,
  PieChart,
  BarChart,
  HeatmapChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  GraphicComponent,
  VisualMapComponent,
])

const dataStore = useDataStore()
const simulator = useRealtimeSimulator()
const timeRange = ref<'hour' | 'day' | 'week'>('day')

const timeRangeOptions = [
  { label: '按小时', value: 'hour' },
  { label: '按天', value: 'day' },
  { label: '按周', value: 'week' },
]

// 通用图表配置
const commonChartConfig = {
  backgroundColor: 'transparent',
  textStyle: { 
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowBlur: 4,
    textShadowOffsetX: 1,
    textShadowOffsetY: 1,
  },
  tooltip: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderColor: '#00ffff',
    borderWidth: 2,
    textStyle: { 
      color: '#ffffff',
      fontSize: 14,
      fontWeight: 'bold',
    },
    padding: [8, 12],
  },
}

// 网媒趋势图
const webmediaTrendOption = computed(() => {
  const dates: string[] = []
  const counts: number[] = []

  const format = timeRange.value === 'hour' ? 'YYYY-MM-DD HH:00' : timeRange.value === 'day' ? 'YYYY-MM-DD' : 'YYYY-[W]WW'
  const unit = timeRange.value === 'hour' ? 'hour' : timeRange.value === 'day' ? 'day' : 'week'
  const count = timeRange.value === 'hour' ? 24 : timeRange.value === 'day' ? 7 : 4

  for (let i = count - 1; i >= 0; i--) {
    const date = dayjs().subtract(i, unit)
    dates.push(date.format(format))
    const start = date.startOf(unit).toISOString()
    const end = date.endOf(unit).toISOString()
    counts.push(
      dataStore.webmediaData.filter((d) => d.publishTime >= start && d.publishTime <= end).length
    )
  }

  return {
    ...commonChartConfig,
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#00ffff', width: 2 } },
      axisLabel: { 
        color: '#ffffff', 
        rotate: 45,
        textStyle: {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#00ffff', width: 2 } },
      axisLabel: { 
        color: '#ffffff',
        textStyle: {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
      },
      splitLine: { lineStyle: { color: 'rgba(0, 255, 255, 0.1)' } },
    },
    series: [
      {
        type: 'line',
        data: counts,
        smooth: true,
        lineStyle: { color: '#00ffff', width: 3 },
        itemStyle: { color: '#00ffff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 255, 255, 0.3)' },
              { offset: 1, color: 'rgba(0, 255, 255, 0.05)' },
            ],
          },
        },
      },
    ],
  }
})

// 微博趋势图
const weiboTrendOption = computed(() => {
  const dates: string[] = []
  const counts: number[] = []

  const format = timeRange.value === 'hour' ? 'YYYY-MM-DD HH:00' : timeRange.value === 'day' ? 'YYYY-MM-DD' : 'YYYY-[W]WW'
  const unit = timeRange.value === 'hour' ? 'hour' : timeRange.value === 'day' ? 'day' : 'week'
  const count = timeRange.value === 'hour' ? 24 : timeRange.value === 'day' ? 7 : 4

  for (let i = count - 1; i >= 0; i--) {
    const date = dayjs().subtract(i, unit)
    dates.push(date.format(format))
    const start = date.startOf(unit).toISOString()
    const end = date.endOf(unit).toISOString()
    counts.push(
      dataStore.weiboData.filter((d) => d.publishTime >= start && d.publishTime <= end).length
    )
  }

  return {
    ...commonChartConfig,
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#00ff88', width: 2 } },
      axisLabel: { 
        color: '#ffffff', 
        rotate: 45,
        textStyle: {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#00ff88', width: 2 } },
      axisLabel: { 
        color: '#ffffff',
        textStyle: {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
      },
      splitLine: { lineStyle: { color: 'rgba(0, 255, 136, 0.1)' } },
    },
    series: [
      {
        type: 'line',
        data: counts,
        smooth: true,
        lineStyle: { color: '#00ff88', width: 3 },
        itemStyle: { color: '#00ff88' },
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
    ],
  }
})

// 舆情趋势对比（双轴）
const comparisonTrendOption = computed(() => {
  const dates: string[] = []
  const webmediaCounts: number[] = []
  const weiboCounts: number[] = []

  const format = timeRange.value === 'hour' ? 'YYYY-MM-DD HH:00' : timeRange.value === 'day' ? 'YYYY-MM-DD' : 'YYYY-[W]WW'
  const unit = timeRange.value === 'hour' ? 'hour' : timeRange.value === 'day' ? 'day' : 'week'
  const count = timeRange.value === 'hour' ? 24 : timeRange.value === 'day' ? 7 : 4

  for (let i = count - 1; i >= 0; i--) {
    const date = dayjs().subtract(i, unit)
    dates.push(date.format(format))
    const start = date.startOf(unit).toISOString()
    const end = date.endOf(unit).toISOString()
    webmediaCounts.push(
      dataStore.webmediaData.filter((d) => d.publishTime >= start && d.publishTime <= end).length
    )
    weiboCounts.push(
      dataStore.weiboData.filter((d) => d.publishTime >= start && d.publishTime <= end).length
    )
  }

  return {
    ...commonChartConfig,
    legend: {
      data: ['网媒', '微博'],
      textStyle: { 
        color: '#ffffff',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowBlur: 4,
        fontSize: 14,
        fontWeight: 'bold',
      },
      top: 10,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#00ffff', width: 2 } },
      axisLabel: { 
        color: '#ffffff', 
        rotate: 45,
        textStyle: {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '网媒',
        position: 'left',
        nameTextStyle: {
          color: '#ffffff',
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
        axisLine: { lineStyle: { color: '#00ffff', width: 2 } },
        axisLabel: { 
          color: '#ffffff',
          textStyle: {
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowBlur: 4,
          },
        },
        splitLine: { lineStyle: { color: 'rgba(0, 255, 255, 0.1)' } },
      },
      {
        type: 'value',
        name: '微博',
        position: 'right',
        nameTextStyle: {
          color: '#ffffff',
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
        axisLine: { lineStyle: { color: '#00ff88', width: 2 } },
        axisLabel: { 
          color: '#ffffff',
          textStyle: {
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowBlur: 4,
          },
        },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '网媒',
        type: 'line',
        yAxisIndex: 0,
        data: webmediaCounts,
        smooth: true,
        lineStyle: { color: '#00ffff', width: 3 },
        itemStyle: { color: '#00ffff' },
      },
      {
        name: '微博',
        type: 'line',
        yAxisIndex: 1,
        data: weiboCounts,
        smooth: true,
        lineStyle: { color: '#00ff88', width: 3 },
        itemStyle: { color: '#00ff88' },
      },
    ],
  }
})

// 网媒情感分布
const webmediaSentimentOption = ref({
  ...commonChartConfig,
  legend: { 
    orient: 'vertical', 
    left: 'left', 
    textStyle: { 
      color: '#ffffff',
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowBlur: 4,
      fontSize: 14,
      fontWeight: 'bold',
    } 
  },
  series: [
    {
      name: '情感分布',
      type: 'pie',
      radius: ['40%', '70%'],
      itemStyle: { borderRadius: 10, borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: 2 },
      label: { 
        show: true, 
        formatter: '{b}: {c} ({d}%)', 
        color: '#ffffff',
        fontSize: 13,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowBlur: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: [4, 8],
        borderRadius: 4,
      },
      data: [
        { value: 0, name: '正面', itemStyle: { color: '#00ff88' } },
        { value: 0, name: '中性', itemStyle: { color: '#ffaa00' } },
        { value: 0, name: '负面', itemStyle: { color: '#ff4444' } },
      ],
    },
  ],
})

// 微博情感分布
const weiboSentimentOption = ref({
  ...commonChartConfig,
  legend: { 
    orient: 'vertical', 
    left: 'left', 
    textStyle: { 
      color: '#ffffff',
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowBlur: 4,
      fontSize: 14,
      fontWeight: 'bold',
    } 
  },
  series: [
    {
      name: '情感分布',
      type: 'pie',
      radius: ['40%', '70%'],
      itemStyle: { borderRadius: 10, borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: 2 },
      label: { 
        show: true, 
        formatter: '{b}: {c} ({d}%)', 
        color: '#ffffff',
        fontSize: 13,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowBlur: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: [4, 8],
        borderRadius: 4,
      },
      data: [
        { value: 0, name: '正面', itemStyle: { color: '#00ff88' } },
        { value: 0, name: '中性', itemStyle: { color: '#ffaa00' } },
        { value: 0, name: '负面', itemStyle: { color: '#ff4444' } },
      ],
    },
  ],
})

// 更新情感分布
const updateSentimentOptions = async () => {
  const stats = await getSentimentStats()
  webmediaSentimentOption.value = {
    ...commonChartConfig,
    legend: { 
      orient: 'vertical', 
      left: 'left', 
      textStyle: { 
        color: '#ffffff',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowBlur: 4,
        fontSize: 14,
        fontWeight: 'bold',
      } 
    },
    series: [
      {
        name: '情感分布',
        type: 'pie',
        radius: ['40%', '70%'],
        itemStyle: { borderRadius: 10, borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: 2 },
        label: { 
          show: true, 
          formatter: '{b}: {c} ({d}%)', 
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 'bold',
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: [4, 8],
          borderRadius: 4,
        },
        data: [
          { value: stats.webmedia.positive, name: '正面', itemStyle: { color: '#00ff88' } },
          { value: stats.webmedia.neutral, name: '中性', itemStyle: { color: '#ffaa00' } },
          { value: stats.webmedia.negative, name: '负面', itemStyle: { color: '#ff4444' } },
        ],
      },
    ],
  }
  weiboSentimentOption.value = {
    ...commonChartConfig,
    legend: { 
      orient: 'vertical', 
      left: 'left', 
      textStyle: { 
        color: '#ffffff',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowBlur: 4,
        fontSize: 14,
        fontWeight: 'bold',
      } 
    },
    series: [
      {
        name: '情感分布',
        type: 'pie',
        radius: ['40%', '70%'],
        itemStyle: { borderRadius: 10, borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: 2 },
        label: { 
          show: true, 
          formatter: '{b}: {c} ({d}%)', 
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 'bold',
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: [4, 8],
          borderRadius: 4,
        },
        data: [
          { value: stats.weibos.positive, name: '正面', itemStyle: { color: '#00ff88' } },
          { value: stats.weibos.neutral, name: '中性', itemStyle: { color: '#ffaa00' } },
          { value: stats.weibos.negative, name: '负面', itemStyle: { color: '#ff4444' } },
        ],
      },
    ],
  }
}

// 网媒Top10
const webmediaTop10Option = computed(() => {
  const items = dataStore.webmediaData
    .map((item) => ({
      name: (item.title || item.content || '无标题').substring(0, 20),
      value: (item.viewCount || 0) + (item.shareCount || 0) * 2,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  if (items.length === 0) {
    return {
      ...commonChartConfig,
      xAxis: { 
        type: 'value', 
        axisLine: { lineStyle: { color: '#00ffff', width: 2 } }, 
        axisLabel: { 
          color: '#ffffff',
          textStyle: {
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowBlur: 4,
          },
        } 
      },
      yAxis: { 
        type: 'category', 
        data: ['暂无数据'], 
        inverse: true, 
        axisLine: { lineStyle: { color: '#00ffff', width: 2 } }, 
        axisLabel: { 
          color: '#ffffff',
          textStyle: {
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowBlur: 4,
          },
        } 
      },
      series: [{ type: 'bar', data: [0], itemStyle: { color: '#666666' } }],
    }
  }

  return {
    ...commonChartConfig,
    grid: { left: '25%', right: '10%', bottom: '10%', top: '10%' },
    xAxis: { 
      type: 'value', 
      axisLine: { lineStyle: { color: '#00ffff', width: 2 } }, 
      axisLabel: { 
        color: '#ffffff',
        textStyle: {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
      }, 
      splitLine: { lineStyle: { color: 'rgba(0, 255, 255, 0.1)' } } 
    },
    yAxis: { 
      type: 'category', 
      data: items.map((i) => i.name), 
      inverse: true, 
      axisLine: { lineStyle: { color: '#00ffff', width: 2 } }, 
      axisLabel: { 
        color: '#ffffff',
        textStyle: {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
      } 
    },
    series: [
      {
        type: 'bar',
        data: items.map((i) => i.value),
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#00ffff' }, { offset: 1, color: '#8a2be2' }] }, borderRadius: [0, 4, 4, 0] },
        label: { 
          show: true, 
          position: 'right', 
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 'bold',
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: [2, 6],
          borderRadius: 4,
        },
      },
    ],
  }
})

// 微博Top10
const weiboTop10Option = computed(() => {
  const items = dataStore.weiboData
    .map((item) => ({
      name: (item.content || '无内容').substring(0, 20),
      value: (item.likeCount || 0) + (item.commentCount || 0) * 2 + (item.repostCount || 0) * 3,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  if (items.length === 0) {
    return {
      ...commonChartConfig,
      xAxis: { 
        type: 'value', 
        axisLine: { lineStyle: { color: '#00ff88', width: 2 } }, 
        axisLabel: { 
          color: '#ffffff',
          textStyle: {
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowBlur: 4,
          },
        } 
      },
      yAxis: { 
        type: 'category', 
        data: ['暂无数据'], 
        inverse: true, 
        axisLine: { lineStyle: { color: '#00ff88', width: 2 } }, 
        axisLabel: { 
          color: '#ffffff',
          textStyle: {
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowBlur: 4,
          },
        } 
      },
      series: [{ type: 'bar', data: [0], itemStyle: { color: '#666666' } }],
    }
  }

  return {
    ...commonChartConfig,
    grid: { left: '25%', right: '10%', bottom: '10%', top: '10%' },
    xAxis: { 
      type: 'value', 
      axisLine: { lineStyle: { color: '#00ff88', width: 2 } }, 
      axisLabel: { 
        color: '#ffffff',
        textStyle: {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
      }, 
      splitLine: { lineStyle: { color: 'rgba(0, 255, 136, 0.1)' } } 
    },
    yAxis: { 
      type: 'category', 
      data: items.map((i) => i.name), 
      inverse: true, 
      axisLine: { lineStyle: { color: '#00ff88', width: 2 } }, 
      axisLabel: { 
        color: '#ffffff',
        textStyle: {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
      } 
    },
    series: [
      {
        type: 'bar',
        data: items.map((i) => i.value),
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#00ff88' }, { offset: 1, color: '#00cc6a' }] }, borderRadius: [0, 4, 4, 0] },
        label: { 
          show: true, 
          position: 'right', 
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 'bold',
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: [2, 6],
          borderRadius: 4,
        },
      },
    ],
  }
})

// 网媒来源分布
const webmediaSourceOption = computed(() => {
  const sourceMap = new Map<string, number>()
  dataStore.webmediaData.forEach((item) => {
    const source = item.source || '未知'
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
  })

  const sorted = Array.from(sourceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  if (sorted.length === 0) {
    return {
      ...commonChartConfig,
      xAxis: { 
        type: 'category', 
        data: ['暂无数据'], 
        axisLine: { lineStyle: { color: '#00ffff', width: 2 } }, 
        axisLabel: { 
          color: '#ffffff',
          textStyle: {
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowBlur: 4,
          },
        } 
      },
      yAxis: { 
        type: 'value', 
        axisLine: { lineStyle: { color: '#00ffff', width: 2 } }, 
        axisLabel: { 
          color: '#ffffff',
          textStyle: {
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowBlur: 4,
          },
        } 
      },
      series: [{ type: 'bar', data: [0], itemStyle: { color: '#666666' } }],
    }
  }

  return {
    ...commonChartConfig,
    grid: { left: '15%', right: '10%', bottom: '15%', top: '10%' },
    xAxis: { 
      type: 'category', 
      data: sorted.map(([s]) => s), 
      axisLine: { lineStyle: { color: '#00ffff', width: 2 } }, 
      axisLabel: { 
        color: '#ffffff', 
        rotate: 45,
        textStyle: {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
      } 
    },
    yAxis: { 
      type: 'value', 
      axisLine: { lineStyle: { color: '#00ffff', width: 2 } }, 
      axisLabel: { 
        color: '#ffffff',
        textStyle: {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
      }, 
      splitLine: { lineStyle: { color: 'rgba(0, 255, 255, 0.1)' } } 
    },
    series: [
      {
        type: 'bar',
        data: sorted.map(([, count]) => count),
        itemStyle: { color: '#00ffff', borderRadius: [4, 4, 0, 0] },
        label: { 
          show: true, 
          position: 'top', 
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 'bold',
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: [2, 6],
          borderRadius: 4,
        },
      },
    ],
  }
})

// 微博用户分布
const weiboUserOption = computed(() => {
  const userMap = new Map<string, number>()
  dataStore.weiboData.forEach((item) => {
    const user = item.userName || '未知'
    const influence = (item.likeCount || 0) + (item.commentCount || 0) + (item.repostCount || 0)
    userMap.set(user, (userMap.get(user) || 0) + influence)
  })

  const sorted = Array.from(userMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  if (sorted.length === 0) {
    return {
      ...commonChartConfig,
      xAxis: { 
        type: 'category', 
        data: ['暂无数据'], 
        axisLine: { lineStyle: { color: '#00ff88', width: 2 } }, 
        axisLabel: { 
          color: '#ffffff',
          textStyle: {
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowBlur: 4,
          },
        } 
      },
      yAxis: { 
        type: 'value', 
        axisLine: { lineStyle: { color: '#00ff88', width: 2 } }, 
        axisLabel: { 
          color: '#ffffff',
          textStyle: {
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowBlur: 4,
          },
        } 
      },
      series: [{ type: 'bar', data: [0], itemStyle: { color: '#666666' } }],
    }
  }

  return {
    ...commonChartConfig,
    grid: { left: '15%', right: '10%', bottom: '15%', top: '10%' },
    xAxis: { 
      type: 'category', 
      data: sorted.map(([u]) => u), 
      axisLine: { lineStyle: { color: '#00ff88', width: 2 } }, 
      axisLabel: { 
        color: '#ffffff', 
        rotate: 45,
        textStyle: {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
      } 
    },
    yAxis: { 
      type: 'value', 
      axisLine: { lineStyle: { color: '#00ff88', width: 2 } }, 
      axisLabel: { 
        color: '#ffffff',
        textStyle: {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
      }, 
      splitLine: { lineStyle: { color: 'rgba(0, 255, 136, 0.1)' } } 
    },
    series: [
      {
        type: 'bar',
        data: sorted.map(([, count]) => count),
        itemStyle: { color: '#00ff88', borderRadius: [4, 4, 0, 0] },
        label: { 
          show: true, 
          position: 'top', 
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 'bold',
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: [2, 6],
          borderRadius: 4,
        },
      },
    ],
  }
})

// 热词热图
const wordcloudOption = computed(() => {
  const keywordMap = new Map<string, number>()
  ;[...dataStore.webmediaData, ...dataStore.weiboData].forEach((item) => {
    const keywords = item.keywords || item.aiKeywords || []
    keywords.forEach((kw) => {
      keywordMap.set(kw, (keywordMap.get(kw) || 0) + 1)
    })
  })

  const sorted = Array.from(keywordMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30) // 取前30个热词

  if (sorted.length === 0) {
    return {
      ...commonChartConfig,
      graphic: [{ type: 'text', left: 'center', top: 'center', style: { text: '暂无数据', fontSize: 16, fill: '#ffffff', textAlign: 'center' } }],
    }
  }

  // 计算最大和最小值
  const maxValue = Math.max(...sorted.map(([, count]) => count))
  const minValue = Math.min(...sorted.map(([, count]) => count))

  // 将热词按频率分组，生成热图数据
  // 按频率分为5个等级，每个等级显示6个热词
  const rows = 5
  const cols = 6
  const heatmapData: Array<[number, number, number]> = []
  const keywordGroups: Array<{ keywords: Array<{ name: string; value: number }>; level: number }> = []

  // 将热词按频率分组
  const step = (maxValue - minValue) / rows
  for (let i = 0; i < rows; i++) {
    const min = minValue + step * i
    const max = i === rows - 1 ? maxValue : minValue + step * (i + 1)
    const groupKeywords = sorted
      .filter(([, count]) => count >= min && count <= max)
      .slice(0, cols)
      .map(([kw, count]) => ({ name: kw, value: count }))
    if (groupKeywords.length > 0) {
      keywordGroups.push({
        keywords: groupKeywords,
        level: rows - 1 - i, // 反转顺序，高频在上
      })
    }
  }

  // 生成热图数据 [x, y, value]
  keywordGroups.forEach((group, rowIndex) => {
    group.keywords.forEach((kw, colIndex) => {
      heatmapData.push([colIndex, rowIndex, kw.value])
    })
  })

  // 生成X轴标签（热词名称，取第一行的热词）
  const xLabels = keywordGroups[0]?.keywords.map((kw) => (kw.name.length > 8 ? kw.name.substring(0, 8) + '...' : kw.name)) || []

  // 生成Y轴标签（频率等级）
  const yLabels = keywordGroups.map((group) => {
    const avgValue = Math.round(group.keywords.reduce((sum, kw) => sum + kw.value, 0) / group.keywords.length)
    return `频率 ${avgValue}`
  })

  return {
    ...commonChartConfig,
    tooltip: {
      ...commonChartConfig.tooltip,
      formatter: (params: any) => {
        if (Array.isArray(params)) {
          return params.map((p: any) => {
            const row = keywordGroups[p.value[1]]
            const kw = row?.keywords[p.value[0]]
            return `${kw?.name || ''}: ${p.value[2]}`
          }).join('<br/>')
        }
        const row = keywordGroups[params.value[1]]
        const kw = row?.keywords[params.value[0]]
        return `${kw?.name || ''}: ${params.value[2]}`
      },
    },
    grid: { left: '15%', right: '15%', bottom: '15%', top: '10%' },
    xAxis: {
      type: 'category',
      data: Array.from({ length: cols }, (_, i) => i),
      axisLine: { lineStyle: { color: '#00ffff', width: 2 } },
      axisLabel: {
        color: '#ffffff',
        formatter: (value: number) => {
          return xLabels[value] || ''
        },
        interval: 0,
        rotate: 45,
        textStyle: {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
      },
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      data: yLabels,
      axisLine: { lineStyle: { color: '#00ffff', width: 2 } },
      axisLabel: { 
        color: '#ffffff',
        textStyle: {
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        },
      },
      splitArea: { show: true },
    },
    visualMap: {
      min: minValue,
      max: maxValue,
      calculable: true,
      orient: 'vertical',
      left: 'right',
      top: 'center',
      inRange: {
        color: [
          '#0a0e27', // 最低值 - 深蓝
          '#1a1f3a', // 
          '#00ffff', // 中等 - 青色
          '#00ff88', // 
          '#ffaa00', // 高 - 橙色
          '#ff4444', // 最高值 - 红色
        ],
      },
      textStyle: { 
        color: '#ffffff',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowBlur: 4,
        fontSize: 12,
        fontWeight: 'bold',
      },
      itemWidth: 15,
      itemHeight: 200,
    },
    series: [
      {
        name: '热词频率',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          formatter: (params: any) => {
            const row = keywordGroups[params.value[1]]
            const kw = row?.keywords[params.value[0]]
            if (!kw) return ''
            return kw.name.length > 6 ? kw.name.substring(0, 6) + '...' : kw.name
          },
          color: '#ffffff',
          fontSize: 11,
          fontWeight: 'bold',
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          padding: [2, 4],
          borderRadius: 3,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 255, 255, 0.5)',
          },
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

  if (total === 0) {
    return {
      ...commonChartConfig,
      graphic: [{ 
        type: 'text', 
        left: 'center', 
        top: 'center', 
        style: { 
          text: '暂无数据', 
          fontSize: 18, 
          fill: '#ffffff', 
          textAlign: 'center',
          fontWeight: 'bold',
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
        } 
      }],
      series: [{ name: '数据源', type: 'pie', radius: '50%', silent: true, data: [{ value: 1, name: '暂无数据', itemStyle: { color: 'rgba(255, 255, 255, 0.1)' } }], label: { show: false } }],
    }
  }

  return {
    ...commonChartConfig,
    tooltip: { ...commonChartConfig.tooltip, formatter: '{b}: {c} ({d}%)' },
    legend: { 
      orient: 'vertical', 
      left: 'left', 
      textStyle: { 
        color: '#ffffff', 
        fontSize: 14,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowBlur: 4,
      }, 
      data: ['网媒', '微博'] 
    },
    series: [
      {
        name: '数据源',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        itemStyle: { borderRadius: 10, borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: 2 },
        label: { 
          show: true, 
          formatter: '{b}\n{c} ({d}%)', 
          color: '#ffffff', 
          fontSize: 13,
          fontWeight: 'bold',
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 4,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: [4, 8],
          borderRadius: 4,
        },
        labelLine: { 
          show: true, 
          lineStyle: { 
            color: '#ffffff',
            width: 2,
          } 
        },
        data: [
          { value: webmediaCount, name: '网媒', itemStyle: { color: '#00ffff' } },
          { value: weiboCount, name: '微博', itemStyle: { color: '#00ff88' } },
        ],
        emphasis: { itemStyle: { shadowBlur: 20, shadowOffsetX: 0, shadowColor: 'rgba(0, 255, 255, 0.5)' }, label: { color: '#00ffff', fontSize: 16, fontWeight: 'bold' } },
      },
    ],
  }
})

const formatTime = (time: string) => {
  return dayjs(time).format('HH:mm:ss')
}

const getItemContent = (item: { type: 'webmedia' | 'weibo'; data: WebMediaData | WeiboData }) => {
  if (item.type === 'webmedia') {
    const webmediaData = item.data as WebMediaData
    return (webmediaData.title || webmediaData.content || '').substring(0, 40)
  } else {
    const weiboData = item.data as WeiboData
    return (weiboData.content || '').substring(0, 40)
  }
}

onMounted(() => {
  updateSentimentOptions()
})

watch(
  () => [dataStore.webmediaData.length, dataStore.weiboData.length, timeRange.value],
  () => {
    updateSentimentOptions()
  },
  { immediate: true }
)
</script>

<style scoped>
.realtime-dashboard {
  width: 100%;
}

.dashboard-layout {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-full {
  grid-column: 1 / -1; /* 占据整行 */
}

.chart-half {
  grid-column: span 1; /* 占据半行 */
}

.chart-card {
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
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
  font-size: 1rem;
  font-weight: 600;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  flex: 1;
}

.chart-content {
  flex: 1;
  min-height: 250px;
}

.realtime-stream-card {
  max-height: 400px;
}

.realtime-stream-content {
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.realtime-stream-content::-webkit-scrollbar {
  width: 6px;
}

.realtime-stream-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
}

.realtime-stream-content::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 255, 0.3);
  border-radius: 3px;
}

.stream-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.3) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.stream-item:hover {
  border-color: rgba(0, 255, 255, 0.3);
  box-shadow: 0 4px 20px rgba(0, 255, 255, 0.2);
  transform: translateX(4px);
}

.stream-item-new {
  background: linear-gradient(135deg, rgba(255, 170, 0, 0.2) 0%, rgba(255, 170, 0, 0.1) 100%);
  border: 2px solid rgba(255, 170, 0, 0.5);
  animation: highlight 2s ease-in-out;
  box-shadow: 0 0 20px rgba(255, 170, 0, 0.3);
}

@keyframes highlight {
  0%,
  100% {
    background: linear-gradient(135deg, rgba(255, 170, 0, 0.2) 0%, rgba(255, 170, 0, 0.1) 100%);
    box-shadow: 0 0 20px rgba(255, 170, 0, 0.3);
  }
  50% {
    background: linear-gradient(135deg, rgba(255, 170, 0, 0.3) 0%, rgba(255, 170, 0, 0.2) 100%);
    box-shadow: 0 0 30px rgba(255, 170, 0, 0.5);
  }
}

.new-badge {
  display: inline-block;
  padding: 2px 6px;
  background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
  color: white;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  box-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.stream-content {
  flex: 1;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stream-time {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Courier New', monospace;
  min-width: 70px;
  text-align: right;
}

/* 响应式设计 */
@media (max-width: 1440px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
  }
  
  .chart-full,
  .chart-half {
    grid-column: 1 / -1; /* 小屏幕下全部占满整行 */
  }
}

@media (min-width: 1920px) {
  .dashboard-layout {
    gap: 2rem;
  }
  
  .chart-content {
    min-height: 300px;
  }
}
</style>

