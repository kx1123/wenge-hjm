<template>
  <div class="realtime-dashboard">
    <!-- 顶部关键指标 -->
    <KeyMetrics />

    <!-- 主布局：左侧网媒、右侧微博、中间综合 -->
    <div class="dashboard-layout">
      <!-- 左侧：网媒数据专区 -->
      <div class="section-left">
        <div class="section-header">
          <span class="section-icon">🌐</span>
          <span class="section-title">网媒数据专区</span>
        </div>

        <!-- 网媒趋势图 -->
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-icon">📈</span>
            <span class="chart-title">网媒趋势对比</span>
            <n-select
              v-model:value="timeRange"
              :options="timeRangeOptions"
              size="small"
              style="width: 120px; margin-left: auto;"
            />
          </div>
          <div class="chart-content">
            <v-chart :option="webmediaTrendOption" class="h-full" autoresize />
          </div>
        </div>

        <!-- 网媒情感分布 -->
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-icon">🎯</span>
            <span class="chart-title">网媒情感分布</span>
          </div>
          <div class="chart-content">
            <v-chart :option="webmediaSentimentOption" class="h-full" autoresize />
          </div>
        </div>

        <!-- 网媒热门报道Top10 -->
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-icon">⭐</span>
            <span class="chart-title">网媒热门报道 Top 10</span>
          </div>
          <div class="chart-content">
            <v-chart :option="webmediaTop10Option" class="h-full" autoresize />
          </div>
        </div>

        <!-- 网媒来源分布 -->
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-icon">📰</span>
            <span class="chart-title">媒体活跃度分布</span>
          </div>
          <div class="chart-content">
            <v-chart :option="webmediaSourceOption" class="h-full" autoresize />
          </div>
        </div>
      </div>

      <!-- 中间：综合对比分析区 -->
      <div class="section-center">
        <div class="section-header">
          <span class="section-icon">📊</span>
          <span class="section-title">综合对比分析</span>
        </div>

        <!-- 实时数据流 -->
        <div v-if="simulator.isRunning" class="chart-card realtime-stream-card">
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

        <!-- 热词词云 -->
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-icon">🔥</span>
            <span class="chart-title">热词词云</span>
          </div>
          <div class="chart-content">
            <v-chart :option="wordcloudOption" class="h-full" autoresize />
          </div>
        </div>

        <!-- 数据源占比 -->
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-icon">📊</span>
            <span class="chart-title">数据源占比</span>
          </div>
          <div class="chart-content">
            <v-chart :option="sourceOption" class="h-full" autoresize />
          </div>
        </div>

        <!-- 舆情趋势对比 -->
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-icon">📈</span>
            <span class="chart-title">舆情趋势对比</span>
          </div>
          <div class="chart-content">
            <v-chart :option="comparisonTrendOption" class="h-full" autoresize />
          </div>
        </div>
      </div>

      <!-- 右侧：微博数据专区 -->
      <div class="section-right">
        <div class="section-header">
          <span class="section-icon">💬</span>
          <span class="section-title">微博数据专区</span>
        </div>

        <!-- 微博趋势图 -->
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-icon">📈</span>
            <span class="chart-title">微博趋势对比</span>
            <n-select
              v-model:value="timeRange"
              :options="timeRangeOptions"
              size="small"
              style="width: 120px; margin-left: auto;"
            />
          </div>
          <div class="chart-content">
            <v-chart :option="weiboTrendOption" class="h-full" autoresize />
          </div>
        </div>

        <!-- 微博情感分布 -->
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-icon">🎯</span>
            <span class="chart-title">微博情感分布</span>
          </div>
          <div class="chart-content">
            <v-chart :option="weiboSentimentOption" class="h-full" autoresize />
          </div>
        </div>

        <!-- 微博热门话题Top10 -->
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-icon">⭐</span>
            <span class="chart-title">微博热门话题 Top 10</span>
          </div>
          <div class="chart-content">
            <v-chart :option="weiboTop10Option" class="h-full" autoresize />
          </div>
        </div>

        <!-- 微博用户活跃度 -->
        <div class="chart-card">
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { NSelect, NTag } from 'naive-ui'
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
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
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
  textStyle: { color: '#ffffff' },
  tooltip: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderColor: '#00ffff',
    borderWidth: 1,
    textStyle: { color: '#ffffff' },
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
      axisLine: { lineStyle: { color: '#00ffff' } },
      axisLabel: { color: '#ffffff', rotate: 45 },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#00ffff' } },
      axisLabel: { color: '#ffffff' },
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
      axisLine: { lineStyle: { color: '#00ff88' } },
      axisLabel: { color: '#ffffff', rotate: 45 },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#00ff88' } },
      axisLabel: { color: '#ffffff' },
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
      textStyle: { color: '#ffffff' },
      top: 10,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#00ffff' } },
      axisLabel: { color: '#ffffff', rotate: 45 },
    },
    yAxis: [
      {
        type: 'value',
        name: '网媒',
        position: 'left',
        axisLine: { lineStyle: { color: '#00ffff' } },
        axisLabel: { color: '#ffffff' },
        splitLine: { lineStyle: { color: 'rgba(0, 255, 255, 0.1)' } },
      },
      {
        type: 'value',
        name: '微博',
        position: 'right',
        axisLine: { lineStyle: { color: '#00ff88' } },
        axisLabel: { color: '#ffffff' },
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
  legend: { orient: 'vertical', left: 'left', textStyle: { color: '#ffffff' } },
  series: [
    {
      name: '情感分布',
      type: 'pie',
      radius: ['40%', '70%'],
      itemStyle: { borderRadius: 10, borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c} ({d}%)', color: '#ffffff' },
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
  legend: { orient: 'vertical', left: 'left', textStyle: { color: '#ffffff' } },
  series: [
    {
      name: '情感分布',
      type: 'pie',
      radius: ['40%', '70%'],
      itemStyle: { borderRadius: 10, borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c} ({d}%)', color: '#ffffff' },
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
    legend: { orient: 'vertical', left: 'left', textStyle: { color: '#ffffff' } },
    series: [
      {
        name: '情感分布',
        type: 'pie',
        radius: ['40%', '70%'],
        itemStyle: { borderRadius: 10, borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: 2 },
        label: { show: true, formatter: '{b}: {c} ({d}%)', color: '#ffffff' },
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
    legend: { orient: 'vertical', left: 'left', textStyle: { color: '#ffffff' } },
    series: [
      {
        name: '情感分布',
        type: 'pie',
        radius: ['40%', '70%'],
        itemStyle: { borderRadius: 10, borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: 2 },
        label: { show: true, formatter: '{b}: {c} ({d}%)', color: '#ffffff' },
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
      xAxis: { type: 'value', axisLine: { lineStyle: { color: '#00ffff' } }, axisLabel: { color: '#ffffff' } },
      yAxis: { type: 'category', data: ['暂无数据'], inverse: true, axisLine: { lineStyle: { color: '#00ffff' } }, axisLabel: { color: '#ffffff' } },
      series: [{ type: 'bar', data: [0], itemStyle: { color: '#666666' } }],
    }
  }

  return {
    ...commonChartConfig,
    grid: { left: '25%', right: '10%', bottom: '10%', top: '10%' },
    xAxis: { type: 'value', axisLine: { lineStyle: { color: '#00ffff' } }, axisLabel: { color: '#ffffff' }, splitLine: { lineStyle: { color: 'rgba(0, 255, 255, 0.1)' } } },
    yAxis: { type: 'category', data: items.map((i) => i.name), inverse: true, axisLine: { lineStyle: { color: '#00ffff' } }, axisLabel: { color: '#ffffff' } },
    series: [
      {
        type: 'bar',
        data: items.map((i) => i.value),
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#00ffff' }, { offset: 1, color: '#8a2be2' }] }, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', color: '#ffffff' },
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
      xAxis: { type: 'value', axisLine: { lineStyle: { color: '#00ff88' } }, axisLabel: { color: '#ffffff' } },
      yAxis: { type: 'category', data: ['暂无数据'], inverse: true, axisLine: { lineStyle: { color: '#00ff88' } }, axisLabel: { color: '#ffffff' } },
      series: [{ type: 'bar', data: [0], itemStyle: { color: '#666666' } }],
    }
  }

  return {
    ...commonChartConfig,
    grid: { left: '25%', right: '10%', bottom: '10%', top: '10%' },
    xAxis: { type: 'value', axisLine: { lineStyle: { color: '#00ff88' } }, axisLabel: { color: '#ffffff' }, splitLine: { lineStyle: { color: 'rgba(0, 255, 136, 0.1)' } } },
    yAxis: { type: 'category', data: items.map((i) => i.name), inverse: true, axisLine: { lineStyle: { color: '#00ff88' } }, axisLabel: { color: '#ffffff' } },
    series: [
      {
        type: 'bar',
        data: items.map((i) => i.value),
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#00ff88' }, { offset: 1, color: '#00cc6a' }] }, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', color: '#ffffff' },
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
      xAxis: { type: 'category', data: ['暂无数据'], axisLine: { lineStyle: { color: '#00ffff' } }, axisLabel: { color: '#ffffff' } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: '#00ffff' } }, axisLabel: { color: '#ffffff' } },
      series: [{ type: 'bar', data: [0], itemStyle: { color: '#666666' } }],
    }
  }

  return {
    ...commonChartConfig,
    grid: { left: '15%', right: '10%', bottom: '15%', top: '10%' },
    xAxis: { type: 'category', data: sorted.map(([s]) => s), axisLine: { lineStyle: { color: '#00ffff' } }, axisLabel: { color: '#ffffff', rotate: 45 } },
    yAxis: { type: 'value', axisLine: { lineStyle: { color: '#00ffff' } }, axisLabel: { color: '#ffffff' }, splitLine: { lineStyle: { color: 'rgba(0, 255, 255, 0.1)' } } },
    series: [
      {
        type: 'bar',
        data: sorted.map(([, count]) => count),
        itemStyle: { color: '#00ffff', borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', color: '#ffffff' },
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
      xAxis: { type: 'category', data: ['暂无数据'], axisLine: { lineStyle: { color: '#00ff88' } }, axisLabel: { color: '#ffffff' } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: '#00ff88' } }, axisLabel: { color: '#ffffff' } },
      series: [{ type: 'bar', data: [0], itemStyle: { color: '#666666' } }],
    }
  }

  return {
    ...commonChartConfig,
    grid: { left: '15%', right: '10%', bottom: '15%', top: '10%' },
    xAxis: { type: 'category', data: sorted.map(([u]) => u), axisLine: { lineStyle: { color: '#00ff88' } }, axisLabel: { color: '#ffffff', rotate: 45 } },
    yAxis: { type: 'value', axisLine: { lineStyle: { color: '#00ff88' } }, axisLabel: { color: '#ffffff' }, splitLine: { lineStyle: { color: 'rgba(0, 255, 136, 0.1)' } } },
    series: [
      {
        type: 'bar',
        data: sorted.map(([, count]) => count),
        itemStyle: { color: '#00ff88', borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', color: '#ffffff' },
      },
    ],
  }
})

// 热词词云
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
    .slice(0, 20)

  if (sorted.length === 0) {
    return {
      ...commonChartConfig,
      xAxis: { type: 'value', axisLine: { lineStyle: { color: '#00ffff' } }, axisLabel: { color: '#ffffff' } },
      yAxis: { type: 'category', data: ['暂无数据'], inverse: true, axisLine: { lineStyle: { color: '#00ffff' } }, axisLabel: { color: '#ffffff' } },
      series: [{ type: 'bar', data: [0], itemStyle: { color: '#666666' } }],
    }
  }

  return {
    ...commonChartConfig,
    grid: { left: '20%', right: '10%', bottom: '10%', top: '10%' },
    xAxis: { type: 'value', axisLine: { lineStyle: { color: '#00ffff' } }, axisLabel: { color: '#ffffff' }, splitLine: { lineStyle: { color: 'rgba(0, 255, 255, 0.1)' } } },
    yAxis: { type: 'category', data: sorted.map(([kw]) => kw), inverse: true, axisLine: { lineStyle: { color: '#00ffff' } }, axisLabel: { color: '#ffffff' } },
    series: [
      {
        type: 'bar',
        data: sorted.map(([, count]) => count),
        itemStyle: {
          color: (params: any) => {
            const colors = ['#00ffff', '#00ff88', '#ffaa00', '#ff4444', '#8a2be2']
            return colors[params.dataIndex % colors.length]
          },
          borderRadius: [0, 4, 4, 0],
        },
        label: { show: true, position: 'right', color: '#ffffff' },
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
      graphic: [{ type: 'text', left: 'center', top: 'center', style: { text: '暂无数据', fontSize: 16, fill: '#ffffff', textAlign: 'center' } }],
      series: [{ name: '数据源', type: 'pie', radius: '50%', silent: true, data: [{ value: 1, name: '暂无数据', itemStyle: { color: 'rgba(255, 255, 255, 0.1)' } }], label: { show: false } }],
    }
  }

  return {
    ...commonChartConfig,
    tooltip: { ...commonChartConfig.tooltip, formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', left: 'left', textStyle: { color: '#ffffff', fontSize: 14 }, data: ['网媒', '微博'] },
    series: [
      {
        name: '数据源',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        itemStyle: { borderRadius: 10, borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{c} ({d}%)', color: '#ffffff', fontSize: 12 },
        labelLine: { show: true, lineStyle: { color: '#ffffff' } },
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
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.section-left,
.section-center,
.section-right {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(138, 43, 226, 0.1) 100%);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.section-icon {
  font-size: 1.5rem;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
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

@media (max-width: 1920px) {
  .dashboard-layout {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

@media (max-width: 1440px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
  }
}
</style>

