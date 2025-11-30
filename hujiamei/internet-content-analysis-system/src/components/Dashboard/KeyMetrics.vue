<template>
  <div class="key-metrics">
    <div class="metrics-grid">
      <!-- 总舆情数 -->
      <div class="metric-card metric-total">
        <div class="metric-icon">📊</div>
        <div class="metric-content">
          <div class="metric-label">总舆情数</div>
          <div class="metric-value">{{ formatNumber(metrics.total) }}</div>
          <div class="metric-trend">
            <span class="trend-icon">↗</span>
            <span>今日: {{ formatNumber(metrics.todayTotal) }}</span>
          </div>
        </div>
      </div>

      <!-- 网媒数 -->
      <div class="metric-card metric-webmedia">
        <div class="metric-icon">🌐</div>
        <div class="metric-content">
          <div class="metric-label">网媒数据</div>
          <div class="metric-value">{{ formatNumber(metrics.webmedia) }}</div>
          <div class="metric-trend">
            <span class="trend-icon">↗</span>
            <span>新增: {{ formatNumber(metrics.webmediaNew) }}</span>
          </div>
        </div>
      </div>

      <!-- 微博数 -->
      <div class="metric-card metric-weibo">
        <div class="metric-icon">💬</div>
        <div class="metric-content">
          <div class="metric-label">微博数据</div>
          <div class="metric-value">{{ formatNumber(metrics.weibo) }}</div>
          <div class="metric-trend">
            <span class="trend-icon">↗</span>
            <span>新增: {{ formatNumber(metrics.weiboNew) }}</span>
          </div>
        </div>
      </div>

      <!-- 情感分布 -->
      <div class="metric-card metric-sentiment">
        <div class="metric-icon">😊</div>
        <div class="metric-content">
          <div class="metric-label">情感分布</div>
          <div class="metric-sentiment-bars">
            <div class="sentiment-bar-item">
              <span class="bar-label">正</span>
              <div class="bar-container">
                <div class="bar-fill bar-positive" :style="{ width: `${sentimentPercent.positive}%` }"></div>
              </div>
              <span class="bar-value">{{ sentimentPercent.positive }}%</span>
            </div>
            <div class="sentiment-bar-item">
              <span class="bar-label">中</span>
              <div class="bar-container">
                <div class="bar-fill bar-neutral" :style="{ width: `${sentimentPercent.neutral}%` }"></div>
              </div>
              <span class="bar-value">{{ sentimentPercent.neutral }}%</span>
            </div>
            <div class="sentiment-bar-item">
              <span class="bar-label">负</span>
              <div class="bar-container">
                <div class="bar-fill bar-negative" :style="{ width: `${sentimentPercent.negative}%` }"></div>
              </div>
              <span class="bar-value">{{ sentimentPercent.negative }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDataStore } from '@/stores/data'
import dayjs from 'dayjs'

const dataStore = useDataStore()

interface Metrics {
  total: number
  todayTotal: number
  webmedia: number
  webmediaNew: number
  weibo: number
  weiboNew: number
  sentiment: {
    positive: number
    neutral: number
    negative: number
  }
}

const metrics = computed<Metrics>(() => {
  const today = dayjs().startOf('day').toISOString()
  const now = dayjs().toISOString()

  const webmediaToday = dataStore.webmediaData.filter(
    (d) => d.publishTime >= today && d.publishTime <= now
  ).length
  const weiboToday = dataStore.weiboData.filter(
    (d) => d.publishTime >= today && d.publishTime <= now
  ).length

  const sentiment = dataStore.stats.total
    ? {
        positive: dataStore.stats.comparison.sentiment.webmedia.positive + dataStore.stats.comparison.sentiment.weibo.positive,
        neutral: dataStore.stats.comparison.sentiment.webmedia.neutral + dataStore.stats.comparison.sentiment.weibo.neutral,
        negative: dataStore.stats.comparison.sentiment.webmedia.negative + dataStore.stats.comparison.sentiment.weibo.negative,
      }
    : { positive: 0, neutral: 0, negative: 0 }

  return {
    total: dataStore.stats.total.total,
    todayTotal: webmediaToday + weiboToday,
    webmedia: dataStore.stats.webmedia.total,
    webmediaNew: webmediaToday,
    weibo: dataStore.stats.weibo.total,
    weiboNew: weiboToday,
    sentiment,
  }
})

const sentimentPercent = computed(() => {
  const total = metrics.value.sentiment.positive + metrics.value.sentiment.neutral + metrics.value.sentiment.negative
  if (total === 0) {
    return { positive: 0, neutral: 0, negative: 0 }
  }
  return {
    positive: Math.round((metrics.value.sentiment.positive / total) * 100),
    neutral: Math.round((metrics.value.sentiment.neutral / total) * 100),
    negative: Math.round((metrics.value.sentiment.negative / total) * 100),
  }
})

const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}
</script>

<style scoped>
.key-metrics {
  @apply mb-4;
}

.metrics-grid {
  @apply grid grid-cols-4 gap-4;
}

.metric-card {
  @apply p-4 bg-gray-800 border border-blue-500/30 rounded-lg backdrop-blur-sm flex items-center gap-3 transition-all relative overflow-hidden shadow-[0_0_10px_rgba(59,130,246,0.3)];
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, currentColor, transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.metric-card:hover {
  border-color: rgba(0, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 255, 255, 0.2);
  transform: translateY(-2px);
}

.metric-card:hover::before {
  opacity: 1;
}

.metric-total::before {
  color: #00ffff;
}

.metric-webmedia::before {
  color: #00ffff;
}

.metric-weibo::before {
  color: #00ff88;
}

.metric-sentiment::before {
  color: #ffaa00;
}

.metric-icon {
  font-size: 3rem;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));
  flex-shrink: 0;
}

.metric-content {
  flex: 1;
}

.metric-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: #00ffff;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  margin-bottom: 0.5rem;
  line-height: 1;
}

.metric-trend {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
}

.trend-icon {
  color: #00ff88;
  font-weight: bold;
}

.metric-sentiment-bars {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sentiment-bar-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bar-label {
  width: 20px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
}

.bar-container {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
  box-shadow: 0 0 10px currentColor;
}

.bar-positive {
  background: linear-gradient(90deg, #00ff88, #00cc6a);
}

.bar-neutral {
  background: linear-gradient(90deg, #ffaa00, #ff8800);
}

.bar-negative {
  background: linear-gradient(90deg, #ff4444, #cc0000);
}

.bar-value {
  width: 40px;
  text-align: right;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
}

@media (max-width: 1600px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>

