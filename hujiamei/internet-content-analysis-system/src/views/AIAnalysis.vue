<template>
  <div class="ai-analysis-view">
    <!-- 背景装饰 -->
    <div class="analysis-bg">
      <div class="grid-pattern"></div>
      <div class="glow-effect"></div>
    </div>

    <!-- 主内容区 -->
    <div class="analysis-content">
      <!-- 标题栏 -->
      <div class="analysis-header">
        <div class="header-left">
          <h1 class="analysis-title">
            <span class="title-icon">🤖</span>
            <span class="title-text">AI智能分析</span>
            <span class="title-subtitle">AI Intelligent Analysis</span>
          </h1>
        </div>
      </div>

      <!-- 数据大屏可视化 -->
      <RealtimeDashboard />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useDataStore } from '@/stores/data'
import RealtimeDashboard from '@/components/Dashboard/RealtimeDashboard.vue'

const dataStore = useDataStore()

// 初始化：加载数据
onMounted(async () => {
  await dataStore.loadAll()
})
</script>

<style scoped>
.ai-analysis-view {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%);
  color: #ffffff;
  padding: 2rem;
  overflow-x: hidden;
}

/* 背景装饰 */
.analysis-bg {
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
.analysis-content {
  position: relative;
  z-index: 1;
  max-width: 100%;
  margin: 0 auto;
  width: 100%;
}

/* 标题栏 */
.analysis-header {
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

.analysis-title {
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

/* 响应式 */
@media (max-width: 768px) {
  .ai-analysis-view {
    padding: 1rem;
  }

  .analysis-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
}
</style>
