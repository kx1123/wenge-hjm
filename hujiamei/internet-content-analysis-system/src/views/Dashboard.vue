<template>
  <div class="dashboard-view">
    <!-- 背景装饰 -->
    <div class="dashboard-bg">
      <div class="grid-pattern"></div>
      <div class="glow-effect"></div>
    </div>

    <!-- 主内容区 -->
    <div class="dashboard-content">
      <!-- 标题栏 -->
      <div class="dashboard-header">
        <div class="header-left">
          <h1 class="dashboard-title">
            <span class="title-icon">📊</span>
            <span class="title-text">数据大屏</span>
            <span class="title-subtitle">Data Dashboard</span>
          </h1>
        </div>
        <div class="header-right">
          <n-space>
            <n-button
              :type="simulator.isRunning ? 'error' : 'primary'"
              size="large"
              round
              @click="simulator.isRunning ? simulator.stop() : simulator.start()"
            >
              <template #icon>
                <span>{{ simulator.isRunning ? '⏹' : '▶' }}</span>
              </template>
              {{ simulator.isRunning ? '停止模拟实时' : '启动模拟实时' }}
            </n-button>
            <n-tag v-if="simulator.latestItem" type="info" :bordered="false" size="large">
              <span class="tag-icon">⚡</span>
              <span>最新: {{ simulator.latestItem.type === 'webmedia' ? '网媒' : '微博' }}</span>
              <span v-if="simulator.latestItem.isNew" class="new-badge-header">NEW</span>
            </n-tag>
          </n-space>
        </div>
      </div>

      <!-- 实时数据流 -->
      <div v-if="simulator.isRunning" class="realtime-section">
        <div class="section-title">
          <span class="title-line"></span>
          <span class="title-text">实时数据流</span>
          <span class="title-line"></span>
        </div>
        <div class="realtime-stream">
          <div
            v-for="item in simulator.simulatedData.value.slice(0, 10)"
            :key="`${item.type}-${item.id}`"
            class="stream-item"
            :class="{ 'stream-item-new': item.isNew }"
          >
            <n-tag :type="item.type === 'webmedia' ? 'primary' : 'success'" size="small">
              {{ item.type === 'webmedia' ? '网媒' : '微博' }}
            </n-tag>
            <span v-if="item.isNew" class="new-badge">NEW</span>
            <span class="stream-content">
              {{ getItemContent(item) }}
            </span>
            <span class="stream-time">
              {{ formatTime(item.timestamp) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 实时分析大屏 -->
      <RealtimeDashboard />

      <!-- 预警面板 -->
      <AlertPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { NCard, NButton, NSpace, NTag } from 'naive-ui'
import RealtimeDashboard from '@/components/Dashboard/RealtimeDashboard.vue'
import AlertPanel from '@/components/Dashboard/AlertPanel.vue'
import { useRealtimeSimulator } from '@/composables/useRealtimeSimulator'
import { useDataStore } from '@/stores/data'
import type { WebMediaData, WeiboData } from '@/interfaces/data'
import dayjs from 'dayjs'

const simulator = useRealtimeSimulator()
const dataStore = useDataStore()

// 加载数据
onMounted(async () => {
  await dataStore.loadAll()
})

const formatTime = (time: string) => {
  return dayjs(time).format('HH:mm:ss')
}

const getItemContent = (item: { type: 'webmedia' | 'weibo'; data: WebMediaData | WeiboData }) => {
  if (item.type === 'webmedia') {
    const webmediaData = item.data as WebMediaData
    return webmediaData.title || webmediaData.content
  } else {
    const weiboData = item.data as WeiboData
    return weiboData.content.substring(0, 50)
  }
}
</script>

<style scoped>
.dashboard-view {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%);
  color: #ffffff;
  padding: 2rem;
  overflow-x: hidden;
}

/* 背景装饰 */
.dashboard-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.grid-pattern {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: gridMove 20s linear infinite;
}

@keyframes gridMove {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(50px, 50px);
  }
}

.glow-effect {
  position: absolute;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(0, 255, 255, 0.1) 0%, transparent 70%);
  top: -250px;
  right: -250px;
  animation: glowPulse 4s ease-in-out infinite;
}

@keyframes glowPulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

/* 主内容 */
.dashboard-content {
  position: relative;
  z-index: 1;
  max-width: 100%;
  margin: 0 auto;
  width: 100%;
}

/* 标题栏 */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(138, 43, 226, 0.1) 100%);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.dashboard-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #00ffff 0%, #8a2be2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-icon {
  font-size: 2.5rem;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));
}

.title-text {
  position: relative;
}

.title-subtitle {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 400;
  margin-left: 0.5rem;
}

.tag-icon {
  margin-right: 0.25rem;
}

.new-badge-header {
  display: inline-block;
  padding: 2px 6px;
  background-color: #ff4444;
  color: white;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  margin-left: 0.5rem;
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

/* 实时数据流区域 */
.realtime-section {
  margin-bottom: 2rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.title-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.5) 50%, transparent 100%);
}

.section-title .title-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: #00ffff;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.realtime-stream {
  max-height: 400px;
  overflow-y: auto;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.realtime-stream::-webkit-scrollbar {
  width: 6px;
}

.realtime-stream::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
}

.realtime-stream::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 255, 0.3);
  border-radius: 3px;
}

.realtime-stream::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 255, 0.5);
}

.stream-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  margin-bottom: 0.75rem;
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
  padding: 3px 8px;
  background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
  color: white;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  box-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
  animation: pulse 1.5s ease-in-out infinite;
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
  min-width: 80px;
  text-align: right;
}

/* 响应式 */
@media (max-width: 768px) {
  .dashboard-view {
    padding: 1rem;
  }

  .dashboard-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
}
</style>

