<template>
  <div class="alert-system-view">
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
            <span class="title-icon">⚠️</span>
            <span class="title-text">智能预警系统</span>
            <span class="title-subtitle">Intelligent Alert System</span>
          </h1>
        </div>
        <div class="header-right">
          <n-space>
            <n-tag :type="stats.unhandled > 0 ? 'error' : 'success'" size="large">
              未处理预警: {{ stats.unhandled }}
            </n-tag>
            <n-tag type="info" size="large">总计: {{ stats.total }}</n-tag>
          </n-space>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-cards">
        <n-grid :cols="4" :x-gap="20">
          <n-gi>
            <n-card class="stat-card stat-card-high">
              <div class="stat-value">{{ stats.bySeverity.high }}</div>
              <div class="stat-label">严重预警</div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card class="stat-card stat-card-medium">
              <div class="stat-value">{{ stats.bySeverity.medium }}</div>
              <div class="stat-label">警告预警</div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card class="stat-card stat-card-low">
              <div class="stat-value">{{ stats.bySeverity.low }}</div>
              <div class="stat-label">提示预警</div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card class="stat-card stat-card-total">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">预警总数</div>
            </n-card>
          </n-gi>
        </n-grid>
      </div>

      <!-- 预警规则管理 -->
      <AlertRuleEditor />

      <!-- 预警记录面板 -->
      <AlertPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { NCard, NGrid, NGi, NTag, NSpace } from 'naive-ui'
import AlertPanel from '@/components/Alert/AlertPanel.vue'
import AlertRuleEditor from '@/components/Alert/AlertRuleEditor.vue'
import { useAlertStore } from '@/stores/alertStore'

const alertStore = useAlertStore()
const stats = alertStore.alertStats

onMounted(async () => {
  await alertStore.init()
})
</script>

<style scoped>
.alert-system-view {
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
  background-image: linear-gradient(rgba(255, 68, 68, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 68, 68, 0.03) 1px, transparent 1px);
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
  background: radial-gradient(circle, rgba(255, 68, 68, 0.1) 0%, transparent 70%);
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
  max-width: 1400px;
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
  background: linear-gradient(135deg, rgba(255, 68, 68, 0.1) 0%, rgba(255, 170, 0, 0.1) 100%);
  border: 1px solid rgba(255, 68, 68, 0.2);
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
  background: linear-gradient(135deg, #ff4444 0%, #ffaa00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-icon {
  font-size: 2.5rem;
  filter: drop-shadow(0 0 10px rgba(255, 68, 68, 0.5));
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

/* 统计卡片 */
.stats-cards {
  margin-bottom: 2rem;
}

.stat-card {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  text-align: center;
  padding: 1.5rem;
}

.stat-card-high {
  border-color: rgba(255, 68, 68, 0.3);
}

.stat-card-medium {
  border-color: rgba(255, 170, 0, 0.3);
}

.stat-card-low {
  border-color: rgba(59, 130, 246, 0.3);
}

.stat-card-total {
  border-color: rgba(255, 255, 255, 0.2);
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

/* 响应式 */
@media (max-width: 768px) {
  .alert-system-view {
    padding: 1rem;
  }

  .dashboard-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .stats-cards :deep(.n-grid) {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}
</style>
