<template>
  <div class="chart-card">
    <div class="chart-header">
      <span class="chart-icon">📈</span>
      <span class="chart-title">舆情趋势对比</span>
      <n-select
        v-model:value="timeRange"
        :options="timeRangeOptions"
        size="small"
        style="width: 100px; margin-left: auto;"
      />
    </div>
    <div class="chart-content">
      <v-chart ref="chartRef" :option="chartOption" class="h-full" autoresize />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { NSelect } from 'naive-ui'
import { useDataStore } from '@/stores/data'
import dayjs from 'dayjs'
import type { EChartsOption } from 'echarts'

use([CanvasRenderer, LineChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent])

const dataStore = useDataStore()
const chartRef = ref<InstanceType<typeof VChart> | null>(null)
const timeRange = ref<'hour' | 'day' | 'week'>('day')

const timeRangeOptions = [
  { label: '按小时', value: 'hour' },
  { label: '按天', value: 'day' },
  { label: '按周', value: 'week' },
]

const chartOption = computed<EChartsOption>(() => {
  const format = timeRange.value === 'hour' ? 'YYYY-MM-DD HH:00' : timeRange.value === 'day' ? 'YYYY-MM-DD' : 'YYYY-[W]WW'
  const unit = timeRange.value === 'hour' ? 'hour' : timeRange.value === 'day' ? 'day' : 'week'
  const count = timeRange.value === 'hour' ? 24 : timeRange.value === 'day' ? 7 : 4

  const dates: string[] = []
  const webMediaHourly: number[] = []
  const weiboHourly: number[] = []

  for (let i = count - 1; i >= 0; i--) {
    const date = dayjs().subtract(i, unit)
    dates.push(date.format(format))
    const start = date.startOf(unit).toISOString()
    const end = date.endOf(unit).toISOString()
    webMediaHourly.push(dataStore.webmediaData.filter((d) => d.publishTime >= start && d.publishTime <= end).length)
    weiboHourly.push(dataStore.weiboData.filter((d) => d.publishTime >= start && d.publishTime <= end).length)
  }

  return {
    backgroundColor: 'transparent',
    textStyle: { color: '#ffffff' },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderColor: '#00ffff',
      borderWidth: 2,
      textStyle: { color: '#ffffff' },
    },
    legend: {
      data: ['网媒', '微博'],
      textStyle: { color: '#ffffff', fontSize: 12 },
      top: 10,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#00ffff', width: 2 } },
      axisLabel: { color: '#ffffff', rotate: 45, fontSize: 10 },
    },
    yAxis: [
      {
        type: 'value',
        name: '网媒',
        position: 'left',
        nameTextStyle: { color: '#00ffff', fontSize: 12 },
        axisLine: { lineStyle: { color: '#00ffff', width: 2 } },
        axisLabel: { color: '#ffffff', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(0, 255, 255, 0.1)' } },
      },
      {
        type: 'value',
        name: '微博',
        position: 'right',
        nameTextStyle: { color: '#00ff88', fontSize: 12 },
        axisLine: { lineStyle: { color: '#00ff88', width: 2 } },
        axisLabel: { color: '#ffffff', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '网媒',
        type: 'line',
        yAxisIndex: 0,
        data: webMediaHourly,
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
      {
        name: '微博',
        type: 'line',
        yAxisIndex: 1,
        data: weiboHourly,
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

// 监听数据变化，增量更新图表
watch(
  () => [dataStore.webmediaData.length, dataStore.weiboData.length, timeRange.value],
  () => {
    if (chartRef.value?.chart) {
      chartRef.value.chart.setOption(chartOption.value, { notMerge: false })
    }
  },
  { deep: true }
)
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
  @apply text-sm font-semibold flex-1;
}

.chart-content {
  flex: 1;
  min-height: 0;
  width: 100%;
}

</style>
