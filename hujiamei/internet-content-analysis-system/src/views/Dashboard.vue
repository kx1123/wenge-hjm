<template>
  <div class="dashboard-container">
    <!-- 顶部：关键指标 -->
    <div ref="headerRef" class="dashboard-header">
      <KeyMetrics />
    </div>

    <!-- 主内容区：按行布局 -->
    <div class="dashboard-grid">
      <!-- 第二行：4个图表 -->
      <div class="chart-row chart-row-4">
        <TrendChart />
        <DataSourcePie />
        <SentimentPie title="网媒情感" type="webmedia" />
        <SentimentPie title="微博情感" type="weibo" />
      </div>

      <!-- 第三行：3个图表 -->
      <div class="chart-row chart-row-3">
        <KeywordCloud />
        <MediaDistribution />
        <HotList title="热门报道 Top10" type="webmedia" />
      </div>
    </div>

    <!-- 控制按钮（固定右下） -->
    <div class="control-buttons">
      <button
        @click="simulator.start()"
        :disabled="simulator.status === 'running'"
        class="control-btn control-btn-primary"
      >
        <span class="control-icon">▶</span>
        <span>启动模拟</span>
      </button>
      <button
        @click="simulator.pause()"
        :disabled="simulator.status !== 'running'"
        class="control-btn control-btn-secondary"
      >
        <span class="control-icon">⏸</span>
        <span>暂停</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref, onUnmounted } from 'vue'
import KeyMetrics from '@/components/Dashboard/KeyMetrics.vue'
import TrendChart from '@/components/Dashboard/TrendChart.vue'
import SentimentPie from '@/components/Dashboard/SentimentPie.vue'
import HotList from '@/components/Dashboard/HotList.vue'
import DataSourcePie from '@/components/Dashboard/DataSourcePie.vue'
import KeywordCloud from '@/components/Dashboard/KeywordCloud.vue'
import MediaDistribution from '@/components/Dashboard/MediaDistribution.vue'
import { useRealtimeSimulator } from '@/composables/useRealtimeSimulator'
import { useDataStore } from '@/stores/data'

const simulator = useRealtimeSimulator()
const dataStore = useDataStore()
const headerRef = ref<HTMLElement | null>(null)
const headerHeight = ref(120)

// 动态计算 header 高度
const updateHeaderHeight = () => {
  if (headerRef.value) {
    headerHeight.value = headerRef.value.offsetHeight
    document.documentElement.style.setProperty('--header-height', `${headerHeight.value}px`)
  }
}

// 数据流：监听最新数据，自动更新 store
watch(
  () => simulator.latest.value,
  (data) => {
    if (data) {
      // 数据已通过 simulator 自动更新到 store
      // 这里可以添加额外的处理逻辑
    }
  }
)

// 加载数据
onMounted(async () => {
  await dataStore.loadAll()
  // 等待 DOM 渲染后计算高度
  setTimeout(() => {
    updateHeaderHeight()
  }, 100)
  
  // 监听窗口大小变化
  window.addEventListener('resize', updateHeaderHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateHeaderHeight)
})
</script>

<style scoped>
.dashboard-container {
  @apply h-screen w-screen bg-gray-900 text-gray-200 font-sans overflow-hidden;
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%);
  position: relative;
  display: flex;
  flex-direction: column;
}

/* 背景装饰 */
.dashboard-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  pointer-events: none;
  z-index: 0;
}

.dashboard-header {
  @apply p-4 relative z-10;
  min-height: 100px;
  flex-shrink: 0;
}

.dashboard-grid {
  @apply flex flex-col gap-4 px-4 relative z-10;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  padding-bottom: 100px; /* 为控制按钮留出空间 */
}

/* 自定义滚动条样式 */
.dashboard-grid::-webkit-scrollbar {
  width: 8px;
}

.dashboard-grid::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.dashboard-grid::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #3b82f6 0%, #8b5cf6 100%);
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
}

.dashboard-grid::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #2563eb 0%, #7c3aed 100%);
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.8);
}

/* 图表行布局 */
.chart-row {
  @apply grid gap-4;
  width: 100%;
  flex: 1 1 0;
  min-height: 0;
}

/* 第二行：4个图表 */
.chart-row-4 {
  grid-template-columns: repeat(4, 1fr);
}

/* 第三行：3个图表 */
.chart-row-3 {
  grid-template-columns: repeat(3, 1fr);
}

/* 确保图表卡片统一高度和对齐 */
.chart-row > * {
  flex-shrink: 0;
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 统一图表高度 */
.chart-row > * {
  flex: 1 1 0;
  min-height: 320px;
  max-height: none;
}

/* 控制按钮 */
.control-buttons {
  @apply fixed bottom-6 right-6 z-50 flex gap-3;
  pointer-events: auto;
}

.control-btn {
  @apply px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-300 flex items-center gap-2;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.control-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
}

.control-btn:disabled {
  @apply opacity-50 cursor-not-allowed;
}

.control-btn-primary {
  @apply bg-blue-600 hover:bg-blue-700;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
}

.control-btn-primary:not(:disabled):hover {
  box-shadow: 0 0 30px rgba(59, 130, 246, 0.6);
}

.control-btn-secondary {
  @apply bg-gray-700 hover:bg-gray-600;
  box-shadow: 0 0 15px rgba(107, 114, 128, 0.3);
}

.control-icon {
  @apply text-base;
}

/* 响应式适配 */
@media (max-width: 1920px) {
  .dashboard-grid {
    gap: 1rem;
  }
  
  .chart-row {
    gap: 1rem;
  }
}

@media (max-width: 1600px) {
  .chart-row-4 {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .chart-row-3 {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .chart-row > * {
    min-height: 300px;
  }
}

@media (max-width: 1440px) {
  .dashboard-grid {
    gap: 1.5rem;
    padding-bottom: 20px;
  }
  
  .chart-row-4 {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .chart-row-3 {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .dashboard-header {
    height: auto;
    min-height: 80px;
  }
  
  .chart-row > * {
    min-height: 300px;
    max-height: 400px;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    @apply p-2;
    height: auto;
  }
  
  .dashboard-grid {
    @apply px-2;
    gap: 1rem;
    padding-bottom: 80px;
  }
  
  .chart-row-4,
  .chart-row-3 {
    grid-template-columns: 1fr;
  }
  
  .control-buttons {
    @apply bottom-4 right-4;
    flex-direction: column;
  }
  
  .control-btn {
    @apply px-4 py-2 text-xs;
  }
}

/* 大屏优化（≥1920px） */
@media (min-width: 1920px) {
  .dashboard-grid {
    gap: 1.5rem;
  }
  
  .chart-row {
    gap: 1.5rem;
  }
  
  .chart-row > * {
    min-height: 380px;
  }
}
</style>
