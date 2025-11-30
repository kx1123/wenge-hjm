<template>
  <div class="upload-dashboard">
    <!-- 背景装饰 -->
    <div class="dashboard-bg">
      <div class="grid-pattern"></div>
      <div class="glow-effect"></div>
    </div>

    <!-- 主内容区 -->
    <div class="dashboard-content">
      <!-- 标题区域 -->
      <div class="dashboard-header">
        <h1 class="dashboard-title">
          <span class="title-icon">📊</span>
          <span class="title-text">数据上传中心</span>
          <span class="title-subtitle">Data Upload Center</span>
        </h1>
        <div class="header-time">{{ currentTime }}</div>
      </div>

      <!-- 统计卡片区域 -->
      <div class="stats-grid">
        <!-- 总数据量 -->
        <div class="stat-card stat-card-primary">
          <div class="stat-icon">📈</div>
          <div class="stat-content">
            <div class="stat-label">总数据量</div>
            <div class="stat-value">{{ formatNumber(dataStore.stats.total.total) }}</div>
            <div class="stat-unit">条</div>
          </div>
          <div class="stat-glow"></div>
        </div>

        <!-- 网媒数据 -->
        <div class="stat-card stat-card-blue">
          <div class="stat-icon">🌐</div>
          <div class="stat-content">
            <div class="stat-label">网媒数据</div>
            <div class="stat-value">{{ formatNumber(dataStore.stats.webmedia.total) }}</div>
            <div class="stat-sub">
              <span>已分析: {{ formatNumber(dataStore.stats.webmedia.analyzed) }}</span>
              <span>未分析: {{ formatNumber(dataStore.stats.webmedia.unanalyzed) }}</span>
            </div>
          </div>
          <div class="stat-glow"></div>
        </div>

        <!-- 微博数据 -->
        <div class="stat-card stat-card-green">
          <div class="stat-icon">💬</div>
          <div class="stat-content">
            <div class="stat-label">微博数据</div>
            <div class="stat-value">{{ formatNumber(dataStore.stats.weibo.total) }}</div>
            <div class="stat-sub">
              <span>已分析: {{ formatNumber(dataStore.stats.weibo.analyzed) }}</span>
              <span>未分析: {{ formatNumber(dataStore.stats.weibo.unanalyzed) }}</span>
            </div>
          </div>
          <div class="stat-glow"></div>
        </div>

        <!-- 分析进度 -->
        <div class="stat-card stat-card-purple">
          <div class="stat-icon">⚡</div>
          <div class="stat-content">
            <div class="stat-label">分析进度</div>
            <div class="stat-value">
              {{
                dataStore.stats.total.total > 0
                  ? Math.round(
                      (dataStore.stats.total.analyzed / dataStore.stats.total.total) * 100
                    )
                  : 0
              }}%
            </div>
            <div class="stat-progress">
              <div
                class="stat-progress-bar"
                :style="{
                  width: `${
                    dataStore.stats.total.total > 0
                      ? (dataStore.stats.total.analyzed / dataStore.stats.total.total) * 100
                      : 0
                  }%`,
                }"
              ></div>
            </div>
          </div>
          <div class="stat-glow"></div>
        </div>
      </div>

      <!-- 上传区域 -->
      <div class="upload-section">
        <div class="section-title">
          <span class="title-line"></span>
          <span class="title-text">文件上传</span>
          <span class="title-line"></span>
        </div>
        <FileUpload @upload-success="handleUploadSuccess" @upload-error="handleUploadError" />
      </div>

      <!-- 数据源管理区域 -->
      <div class="source-management-section">
        <div class="section-title">
          <span class="title-line"></span>
          <span class="title-text">数据源管理</span>
          <span class="title-line"></span>
        </div>

        <div class="source-cards-grid">
          <!-- 网媒数据源卡片 -->
          <div class="source-card">
            <div class="source-card-header">
              <div class="source-info">
                <span class="source-icon">🌐</span>
                <div>
                  <div class="source-name">网媒数据源</div>
                  <div class="source-desc">新闻、资讯、门户网站等媒体报道</div>
                </div>
              </div>
              <n-button
                type="error"
                size="small"
                :loading="deletingWebMedia"
                @click="handleDeleteWebMedia"
                :disabled="dataStore.stats.webmedia.total === 0"
              >
                删除
              </n-button>
            </div>
            <div class="source-stats">
              <div class="stat-row">
                <span class="stat-label">总条数</span>
                <span class="stat-value">{{ formatNumber(dataStore.stats.webmedia.total) }}</span>
              </div>
              <div class="stat-row" v-if="dataStore.stats.webmedia.timeRange">
                <span class="stat-label">时间范围</span>
                <span class="stat-value-small">
                  {{ formatDate(dataStore.stats.webmedia.timeRange.start) }} ~
                  {{ formatDate(dataStore.stats.webmedia.timeRange.end) }}
                </span>
              </div>
              <div class="stat-row">
                <span class="stat-label">媒体分布</span>
                <span class="stat-value-small">
                  {{ Object.keys(dataStore.stats.webmedia.sourceDistribution || {}).length }} 个来源
                </span>
              </div>
              <div class="stat-row">
                <span class="stat-label">情感分布</span>
                <div class="sentiment-bars">
                  <span class="sentiment-item positive">
                    正面: {{ dataStore.stats.webmedia.sentiment?.positive || 0 }}
                  </span>
                  <span class="sentiment-item neutral">
                    中性: {{ dataStore.stats.webmedia.sentiment?.neutral || 0 }}
                  </span>
                  <span class="sentiment-item negative">
                    负面: {{ dataStore.stats.webmedia.sentiment?.negative || 0 }}
                  </span>
                </div>
              </div>
            </div>
            <div class="source-actions">
              <n-button
                type="primary"
                size="small"
                @click="$router.push('/data-list?type=webmedia')"
                :disabled="dataStore.stats.webmedia.total === 0"
              >
                查看数据
              </n-button>
            </div>
          </div>

          <!-- 微博数据源卡片 -->
          <div class="source-card">
            <div class="source-card-header">
              <div class="source-info">
                <span class="source-icon">💬</span>
                <div>
                  <div class="source-name">微博数据源</div>
                  <div class="source-desc">微博平台的社交媒体内容</div>
                </div>
              </div>
              <n-button
                type="error"
                size="small"
                :loading="deletingWeibo"
                @click="handleDeleteWeibo"
                :disabled="dataStore.stats.weibo.total === 0"
              >
                删除
              </n-button>
            </div>
            <div class="source-stats">
              <div class="stat-row">
                <span class="stat-label">总条数</span>
                <span class="stat-value">{{ formatNumber(dataStore.stats.weibo.total) }}</span>
              </div>
              <div class="stat-row" v-if="dataStore.stats.weibo.timeRange">
                <span class="stat-label">时间范围</span>
                <span class="stat-value-small">
                  {{ formatDate(dataStore.stats.weibo.timeRange.start) }} ~
                  {{ formatDate(dataStore.stats.weibo.timeRange.end) }}
                </span>
              </div>
              <div class="stat-row">
                <span class="stat-label">用户活跃度</span>
                <span class="stat-value-small">
                  {{ dataStore.stats.weibo.userActivity?.totalUsers || 0 }} 个用户
                </span>
              </div>
              <div class="stat-row">
                <span class="stat-label">平均互动</span>
                <div class="interaction-stats">
                  <span>点赞: {{ dataStore.stats.weibo.userActivity?.avgLikes || 0 }}</span>
                  <span>评论: {{ dataStore.stats.weibo.userActivity?.avgComments || 0 }}</span>
                  <span>转发: {{ dataStore.stats.weibo.userActivity?.avgReposts || 0 }}</span>
                </div>
              </div>
              <div class="stat-row">
                <span class="stat-label">情感分布</span>
                <div class="sentiment-bars">
                  <span class="sentiment-item positive">
                    正面: {{ dataStore.stats.weibo.sentiment?.positive || 0 }}
                  </span>
                  <span class="sentiment-item neutral">
                    中性: {{ dataStore.stats.weibo.sentiment?.neutral || 0 }}
                  </span>
                  <span class="sentiment-item negative">
                    负面: {{ dataStore.stats.weibo.sentiment?.negative || 0 }}
                  </span>
                </div>
              </div>
            </div>
            <div class="source-actions">
              <n-button
                type="primary"
                size="small"
                @click="$router.push('/data-list?type=weibo')"
                :disabled="dataStore.stats.weibo.total === 0"
              >
                查看数据
              </n-button>
            </div>
          </div>
        </div>

        <!-- 对比分析卡片 -->
        <div class="comparison-card" v-if="dataStore.stats.webmedia.total > 0 && dataStore.stats.weibo.total > 0">
          <div class="comparison-header">
            <span class="comparison-icon">📊</span>
            <span class="comparison-title">数据源对比分析</span>
          </div>
          <div class="comparison-content">
            <div class="comparison-item">
              <div class="comparison-label">情感分布对比</div>
              <div class="comparison-bars">
                <div class="comparison-bar-group">
                  <div class="bar-label">正面</div>
                  <div class="bar-container">
                    <div
                      class="bar webmedia-bar"
                      :style="{
                        width: `${
                          dataStore.stats.webmedia.total > 0
                            ? ((dataStore.stats.webmedia.sentiment?.positive || 0) /
                                dataStore.stats.webmedia.total) *
                              100
                            : 0
                        }%`,
                      }"
                    >
                      <span>网媒: {{ dataStore.stats.webmedia.sentiment?.positive || 0 }}</span>
                    </div>
                    <div
                      class="bar weibo-bar"
                      :style="{
                        width: `${
                          dataStore.stats.weibo.total > 0
                            ? ((dataStore.stats.weibo.sentiment?.positive || 0) /
                                dataStore.stats.weibo.total) *
                              100
                            : 0
                        }%`,
                      }"
                    >
                      <span>微博: {{ dataStore.stats.weibo.sentiment?.positive || 0 }}</span>
                    </div>
                  </div>
                </div>
                <div class="comparison-bar-group">
                  <div class="bar-label">负面</div>
                  <div class="bar-container">
                    <div
                      class="bar webmedia-bar"
                      :style="{
                        width: `${
                          dataStore.stats.webmedia.total > 0
                            ? ((dataStore.stats.webmedia.sentiment?.negative || 0) /
                                dataStore.stats.webmedia.total) *
                              100
                            : 0
                        }%`,
                      }"
                    >
                      <span>网媒: {{ dataStore.stats.webmedia.sentiment?.negative || 0 }}</span>
                    </div>
                    <div
                      class="bar weibo-bar"
                      :style="{
                        width: `${
                          dataStore.stats.weibo.total > 0
                            ? ((dataStore.stats.weibo.sentiment?.negative || 0) /
                                dataStore.stats.weibo.total) *
                              100
                            : 0
                        }%`,
                      }"
                    >
                      <span>微博: {{ dataStore.stats.weibo.sentiment?.negative || 0 }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="comparison-actions">
            <n-button type="primary" @click="$router.push('/data-list?type=all')">
              合并查看所有数据
            </n-button>
            <n-button @click="$router.push('/data-list?view=compare')">对比分析</n-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, useMessage, useDialog } from 'naive-ui'
import FileUpload from '@/components/FileUpload.vue'
import { useDataStore } from '@/stores/data'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const dataStore = useDataStore()

const currentTime = ref('')
const deletingWebMedia = ref(false)
const deletingWeibo = ref(false)

// 格式化数字
const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}

// 格式化日期
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return dateStr.substring(0, 10)
  }
}

// 更新时间
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

let timeInterval: number | null = null

onMounted(() => {
  updateTime()
  timeInterval = window.setInterval(updateTime, 1000)
  // 加载数据
  dataStore.loadAll()
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})

// 处理上传成功事件
const handleUploadSuccess = async () => {
  try {
    await dataStore.loadAll()
    message.success('数据已更新')
  } catch (error) {
    message.error('刷新数据失败')
  }
}

// 处理上传错误事件
const handleUploadError = (error: string) => {
  console.error('上传错误:', error)
}

// 删除网媒数据源
const handleDeleteWebMedia = () => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除所有网媒数据吗？共 ${dataStore.stats.webmedia.total} 条数据，此操作不可恢复！`,
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        deletingWebMedia.value = true
        await dataStore.deleteWebMedia()
        message.success('网媒数据已删除')
      } catch (error) {
        message.error('删除失败')
      } finally {
        deletingWebMedia.value = false
      }
    },
  })
}

// 删除微博数据源
const handleDeleteWeibo = () => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除所有微博数据吗？共 ${dataStore.stats.weibo.total} 条数据，此操作不可恢复！`,
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        deletingWeibo.value = true
        await dataStore.deleteWeibo()
        message.success('微博数据已删除')
      } catch (error) {
        message.error('删除失败')
      } finally {
        deletingWeibo.value = false
      }
    },
  })
}
</script>

<style scoped>
.upload-dashboard {
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
  background-image: 
    linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
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
  0%, 100% {
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
  max-width: 1600px;
  margin: 0 auto;
}

/* 标题区域 */
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

.header-time {
  font-size: 1.25rem;
  font-weight: 600;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  font-family: 'Courier New', monospace;
}

/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  position: relative;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  border-color: rgba(0, 255, 255, 0.5);
}

.stat-card-primary {
  border-color: rgba(0, 255, 255, 0.3);
}

.stat-card-blue {
  border-color: rgba(0, 150, 255, 0.3);
}

.stat-card-green {
  border-color: rgba(0, 255, 150, 0.3);
}

.stat-card-purple {
  border-color: rgba(138, 43, 226, 0.3);
}

.stat-glow {
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(0, 255, 255, 0.1) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stat-card:hover .stat-glow {
  opacity: 1;
}

.stat-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  display: block;
}

.stat-content {
  position: relative;
  z-index: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #00ffff;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  line-height: 1;
  margin-bottom: 0.5rem;
}

.stat-unit {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
  margin-left: 0.5rem;
}

.stat-sub {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.5rem;
}

.stat-progress {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 0.75rem;
}

.stat-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #00ffff 0%, #8a2be2 100%);
  border-radius: 2px;
  transition: width 0.5s ease;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

/* 上传区域 */
.upload-section {
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

/* 详情卡片网格 */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.detail-card {
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.detail-card:hover {
  border-color: rgba(0, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.detail-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-icon {
  font-size: 1.5rem;
}

.detail-title {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.detail-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

.detail-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.detail-value.highlight {
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.detail-value.success {
  color: #00ff88;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.detail-value.warning {
  color: #ffaa00;
  text-shadow: 0 0 10px rgba(255, 170, 0, 0.5);
}

/* 数据源管理区域 */
.source-management-section {
  margin-top: 2rem;
}

.source-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.source-card {
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.source-card:hover {
  border-color: rgba(0, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  transform: translateY(-2px);
}

.source-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.source-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.source-icon {
  font-size: 2rem;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));
}

.source-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.25rem;
}

.source-desc {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

.source-stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.stat-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.stat-value-small {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
}

.sentiment-bars {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.sentiment-item {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
}

.sentiment-item.positive {
  color: #00ff88;
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.sentiment-item.neutral {
  color: #ffaa00;
  border: 1px solid rgba(255, 170, 0, 0.3);
}

.sentiment-item.negative {
  color: #ff4444;
  border: 1px solid rgba(255, 68, 68, 0.3);
}

.interaction-stats {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
}

.source-actions {
  display: flex;
  gap: 0.75rem;
}

.comparison-card {
  padding: 2rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(138, 43, 226, 0.3);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  margin-top: 1.5rem;
}

.comparison-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.comparison-icon {
  font-size: 1.5rem;
}

.comparison-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.comparison-content {
  margin-bottom: 1.5rem;
}

.comparison-item {
  margin-bottom: 1.5rem;
}

.comparison-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.75rem;
  display: block;
}

.comparison-bars {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.comparison-bar-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bar-label {
  min-width: 60px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

.bar-container {
  flex: 1;
  display: flex;
  gap: 0.5rem;
  height: 32px;
}

.bar {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  transition: width 0.5s ease;
  min-width: 60px;
}

.webmedia-bar {
  background: linear-gradient(135deg, #00ffff 0%, #0099ff 100%);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.weibo-bar {
  background: linear-gradient(135deg, #00ff88 0%, #00cc66 100%);
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.comparison-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .upload-dashboard {
    padding: 1rem;
  }

  .dashboard-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .source-cards-grid {
    grid-template-columns: 1fr;
  }

  .comparison-actions {
    flex-direction: column;
  }
}
</style>
