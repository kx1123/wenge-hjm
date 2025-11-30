<template>
  <div class="data-list-view">
    <!-- 背景装饰 -->
    <div class="dashboard-bg">
      <div class="grid-pattern"></div>
      <div class="glow-effect"></div>
    </div>

    <!-- 主内容区 -->
    <div class="dashboard-content">
      <!-- 标题和工具栏 -->
      <div class="list-header">
        <div class="header-left">
          <h1 class="page-title">
            <span class="title-icon">📋</span>
            <span class="title-text">数据列表</span>
          </h1>
          <div class="data-source-tabs">
            <n-button
              :type="viewType === 'all' ? 'primary' : 'default'"
              @click="viewType = 'all'"
            >
              全部数据
            </n-button>
            <n-button
              :type="viewType === 'webmedia' ? 'primary' : 'default'"
              @click="viewType = 'webmedia'"
            >
              网媒数据
            </n-button>
            <n-button
              :type="viewType === 'weibo' ? 'primary' : 'default'"
              @click="viewType = 'weibo'"
            >
              微博数据
            </n-button>
            <n-button
              :type="viewType === 'compare' ? 'primary' : 'default'"
              @click="viewType = 'compare'"
              :disabled="dataStore.stats.webmedia.total === 0 || dataStore.stats.weibo.total === 0"
            >
              对比分析
            </n-button>
          </div>
        </div>
        <div class="header-right">
          <n-space>
            <n-button-group>
              <n-button
                :type="viewMode === 'list' ? 'primary' : 'default'"
                @click="viewMode = 'list'"
              >
                列表
              </n-button>
              <n-button
                :type="viewMode === 'card' ? 'primary' : 'default'"
                @click="viewMode = 'card'"
              >
                卡片
              </n-button>
              <n-button
                :type="viewMode === 'timeline' ? 'primary' : 'default'"
                @click="viewMode = 'timeline'"
              >
                时间轴
              </n-button>
            </n-button-group>
            <n-button @click="handleRefresh">
              <template #icon>
                <span>🔄</span>
              </template>
              刷新
            </n-button>
          </n-space>
        </div>
      </div>

      <!-- 搜索和筛选栏 -->
      <div class="filter-bar">
        <n-space :size="16" style="width: 100%">
          <n-input
            v-model:value="searchKeyword"
            placeholder="搜索关键词..."
            clearable
            style="width: 300px"
            @keydown.enter="handleSearch"
          >
            <template #prefix>
              <span>🔍</span>
            </template>
          </n-input>
          <n-select
            v-model:value="filterSentiment"
            placeholder="情感筛选"
            clearable
            style="width: 150px"
            :options="sentimentOptions"
          />
          <n-date-picker
            v-model:value="dateRange"
            type="daterange"
            clearable
            placeholder="时间范围"
            style="width: 300px"
          />
          <n-select
            v-if="viewType === 'webmedia'"
            v-model:value="filterSource"
            placeholder="来源筛选"
            clearable
            filterable
            style="width: 200px"
            :options="sourceOptions"
          />
          <n-select
            v-if="viewType === 'weibo'"
            v-model:value="filterUser"
            placeholder="用户筛选"
            clearable
            filterable
            style="width: 200px"
            :options="userOptions"
          />
          <n-button type="primary" @click="handleSearch">搜索</n-button>
          <n-button @click="handleReset">重置</n-button>
        </n-space>
      </div>

      <!-- 数据展示区域 -->
      <div class="data-display-area">
        <!-- 列表模式 -->
        <div v-if="viewMode === 'list'" class="list-view">
          <div class="pagination-info-top">
            <span class="total-info">共 {{ formatNumber(total) }} 条数据</span>
            <span class="page-info">
              第 {{ currentPage }} 页，每页 {{ pageSize }} 条，共 {{ totalPages }} 页
            </span>
          </div>
          <n-data-table
            :columns="tableColumns"
            :data="displayData"
            :loading="loading"
            :pagination="pagination"
            :bordered="true"
            striped
            @update:page="handlePageChange"
            @update:page-size="handlePageSizeChange"
          />
        </div>

        <!-- 卡片模式 -->
        <div v-if="viewMode === 'card'" class="card-view">
          <div class="card-grid">
            <div
              v-for="item in displayData"
              :key="`${item.type}-${item.id}`"
              class="data-card"
              :class="{ 'card-webmedia': item.type === 'webmedia', 'card-weibo': item.type === 'weibo' }"
            >
              <div class="card-header">
                <n-tag :type="item.type === 'webmedia' ? 'primary' : 'success'" size="small">
                  {{ item.type === 'webmedia' ? '网媒' : '微博' }}
                </n-tag>
                <span class="card-time">{{ formatTime(item.publishTime) }}</span>
              </div>
              <div class="card-content">
                <div v-if="item.type === 'webmedia' && item.title" class="card-title">
                  {{ item.title }}
                </div>
                <div class="card-text">{{ getContentPreview(item) }}</div>
              </div>
              <div class="card-footer">
                <div class="card-stats">
                  <span v-if="item.viewCount" class="stat-item">
                    <span class="stat-icon">👁</span>
                    {{ formatNumber(item.viewCount) }}
                  </span>
                  <span class="stat-item">
                    <span class="stat-icon">👍</span>
                    {{ formatNumber(item.likeCount) }}
                  </span>
                  <span class="stat-item">
                    <span class="stat-icon">💬</span>
                    {{ formatNumber(item.commentCount) }}
                  </span>
                  <span v-if="item.shareCount" class="stat-item">
                    <span class="stat-icon">🔄</span>
                    {{ formatNumber(item.shareCount) }}
                  </span>
                </div>
                <n-tag
                  v-if="item.sentiment"
                  :type="getSentimentType(item.sentiment)"
                  size="small"
                >
                  {{ getSentimentText(item.sentiment) }}
                </n-tag>
              </div>
            </div>
          </div>
          <div class="pagination-wrapper">
            <div class="pagination-info">
              <span class="total-info">共 {{ formatNumber(total) }} 条数据</span>
              <span class="page-info">
                第 {{ currentPage }} 页，每页 {{ pageSize }} 条，共 {{ total > 0 ? Math.ceil(total / pageSize) : 1 }} 页
              </span>
            </div>
            <n-pagination
              v-model:page="currentPage"
              v-model:page-size="pageSize"
              :item-count="total"
              :page-sizes="[20, 50, 100]"
              show-size-picker
              show-quick-jumper
              @update:page="handlePageChange"
              @update:page-size="handlePageSizeChange"
            />
          </div>
        </div>

        <!-- 时间轴模式 -->
        <div v-if="viewMode === 'timeline'" class="timeline-view">
          <div class="timeline-container">
            <div
              v-for="item in displayData"
              :key="`${item.type}-${item.id}`"
              class="timeline-item"
            >
              <div class="timeline-line"></div>
              <div class="timeline-dot" :class="`dot-${item.type}`"></div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <n-tag :type="item.type === 'webmedia' ? 'primary' : 'success'" size="small">
                    {{ item.type === 'webmedia' ? '网媒' : '微博' }}
                  </n-tag>
                  <span class="timeline-time">{{ formatTime(item.publishTime) }}</span>
                </div>
                <div v-if="item.type === 'webmedia' && item.title" class="timeline-title">
                  {{ item.title }}
                </div>
                <div class="timeline-text">{{ getContentPreview(item) }}</div>
                <div class="timeline-footer">
                  <span v-if="item.source" class="timeline-source">{{ item.source }}</span>
                  <span v-if="item.userName" class="timeline-user">{{ item.userName }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="pagination-wrapper">
            <div class="pagination-info">
              <span class="total-info">共 {{ formatNumber(total) }} 条数据</span>
              <span class="page-info">
                第 {{ currentPage }} 页，每页 {{ pageSize }} 条，共 {{ total > 0 ? Math.ceil(total / pageSize) : 1 }} 页
              </span>
            </div>
            <n-pagination
              v-model:page="currentPage"
              v-model:page-size="pageSize"
              :item-count="total"
              :page-sizes="[20, 50, 100]"
              show-size-picker
              show-quick-jumper
              @update:page="handlePageChange"
              @update:page-size="handlePageSizeChange"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NButtonGroup,
  NSpace,
  NInput,
  NSelect,
  NDatePicker,
  NDataTable,
  NPagination,
  NTag,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import { useDataStore } from '@/stores/data'
import { search } from '@/db/indexedDB'
import type { WebMediaData, WeiboData, UnifiedData } from '@/interfaces/data'
import { mergeData, toUnifiedData, toUnifiedDataFromWeibo } from '@/interfaces/data'
import dayjs from 'dayjs'

const route = useRoute()
const _router = useRouter()
const message = useMessage()
const dataStore = useDataStore()

// 视图类型
const viewType = ref<'all' | 'webmedia' | 'weibo' | 'compare'>('all')
// 展示模式
const viewMode = ref<'list' | 'card' | 'timeline'>('list')
// 搜索关键词
const searchKeyword = ref('')
// 筛选条件
const filterSentiment = ref<'positive' | 'neutral' | 'negative' | null>(null)
const dateRange = ref<[number, number] | null>(null)
const filterSource = ref<string | null>(null)
const filterUser = ref<string | null>(null)

// 分页
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const loading = ref(false)

// 显示数据
const displayData = ref<UnifiedData[]>([])

// 情感选项
const sentimentOptions = [
  { label: '正面', value: 'positive' },
  { label: '中性', value: 'neutral' },
  { label: '负面', value: 'negative' },
]

// 来源选项（网媒）
const sourceOptions = computed(() => {
  const sources = new Set<string>()
  dataStore.webmediaData.forEach((item) => {
    if (item.source) sources.add(item.source)
  })
  return Array.from(sources).map((s) => ({ label: s, value: s }))
})

// 用户选项（微博）
const userOptions = computed(() => {
  const users = new Set<string>()
  dataStore.weiboData.forEach((item) => {
    if (item.userName) users.add(item.userName)
  })
  return Array.from(users).map((u) => ({ label: u, value: u }))
})

// 表格列定义
const tableColumns = computed<DataTableColumns<UnifiedData>>(() => [
  {
    title: '类型',
    key: 'type',
    width: 80,
    render: (row) => {
      return h(NTag, {
        type: row.type === 'webmedia' ? 'primary' : 'success',
        size: 'small',
      }, () => row.type === 'webmedia' ? '网媒' : '微博')
    },
  },
  {
    title: '标题/内容',
    key: 'content',
    ellipsis: {
      tooltip: true,
    },
    render: (row) => {
      if (row.type === 'webmedia' && row.title) {
        return row.title
      }
      return row.content?.substring(0, 100) || ''
    },
  },
  {
    title: '来源/用户',
    key: 'source',
    width: 150,
    render: (row) => {
      if (row.type === 'webmedia') {
        return row.source || '-'
      }
      return row.userName || '-'
    },
  },
  {
    title: '发布时间',
    key: 'publishTime',
    width: 180,
    render: (row) => formatTime(row.publishTime),
  },
  {
    title: '互动数据',
    key: 'stats',
    width: 200,
    render: (row) => {
      const stats = []
      if (row.viewCount) stats.push(`阅读: ${formatNumber(row.viewCount)}`)
      if (row.likeCount) stats.push(`点赞: ${formatNumber(row.likeCount)}`)
      if (row.commentCount) stats.push(`评论: ${formatNumber(row.commentCount)}`)
      if (row.shareCount) stats.push(`转发: ${formatNumber(row.shareCount)}`)
      return stats.join(' | ')
    },
  },
  {
    title: '情感',
    key: 'sentiment',
    width: 100,
    render: (row) => {
      if (!row.sentiment) return '-'
      return h(NTag, {
        type: getSentimentType(row.sentiment),
        size: 'small',
      }, () => getSentimentText(row.sentiment!))
    },
  },
])

// 计算总页数
const totalPages = computed(() => {
  if (total.value === 0) return 1
  return Math.ceil(total.value / pageSize.value)
})

// 分页配置
const pagination = computed(() => ({
  page: currentPage.value,
  pageSize: pageSize.value,
  itemCount: total.value,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
  showQuickJumper: true,
}))

// 从URL参数初始化
onMounted(() => {
  const type = route.query.type as string
  if (type === 'webmedia' || type === 'weibo' || type === 'all') {
    viewType.value = type
  }
  if (route.query.view === 'compare') {
    viewType.value = 'compare'
  }
  loadData()
  loadOptions()
})

// 监听视图类型变化
watch(viewType, () => {
  currentPage.value = 1
  loadData()
})

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    let result: { data: (WebMediaData | WeiboData)[]; total: number }

    if (viewType.value === 'all') {
      // 合并查询
      const [webmediaResult, weiboResult] = await Promise.all([
        search(
          {
            type: 'webmedia',
            keyword: searchKeyword.value || undefined,
            startTime: dateRange.value
              ? new Date(dateRange.value[0]).toISOString()
              : undefined,
            endTime: dateRange.value ? new Date(dateRange.value[1]).toISOString() : undefined,
            sentiment: filterSentiment.value || undefined,
            source: filterSource.value || undefined,
          },
          currentPage.value,
          pageSize.value
        ),
        search(
          {
            type: 'weibo',
            keyword: searchKeyword.value || undefined,
            startTime: dateRange.value
              ? new Date(dateRange.value[0]).toISOString()
              : undefined,
            endTime: dateRange.value ? new Date(dateRange.value[1]).toISOString() : undefined,
            sentiment: filterSentiment.value || undefined,
            userName: filterUser.value || undefined,
          },
          currentPage.value,
          pageSize.value
        ),
      ])

      const unified = mergeData(
        webmediaResult.data as WebMediaData[],
        weiboResult.data as WeiboData[]
      )
      displayData.value = unified
      total.value = webmediaResult.total + weiboResult.total
    } else if (viewType.value === 'webmedia') {
      result = await search(
        {
          type: 'webmedia',
          keyword: searchKeyword.value || undefined,
          startTime: dateRange.value ? new Date(dateRange.value[0]).toISOString() : undefined,
          endTime: dateRange.value ? new Date(dateRange.value[1]).toISOString() : undefined,
          sentiment: filterSentiment.value || undefined,
          source: filterSource.value || undefined,
        },
        currentPage.value,
        pageSize.value
      )
      displayData.value = (result.data as WebMediaData[]).map(toUnifiedData)
      total.value = result.total
    } else if (viewType.value === 'weibo') {
      result = await search(
        {
          type: 'weibo',
          keyword: searchKeyword.value || undefined,
          startTime: dateRange.value ? new Date(dateRange.value[0]).toISOString() : undefined,
          endTime: dateRange.value ? new Date(dateRange.value[1]).toISOString() : undefined,
          sentiment: filterSentiment.value || undefined,
          userName: filterUser.value || undefined,
        },
        currentPage.value,
        pageSize.value
      )
      displayData.value = (result.data as WeiboData[]).map(toUnifiedDataFromWeibo)
      total.value = result.total
    } else if (viewType.value === 'compare') {
      // 对比模式：显示两个数据源的对比
      // 先获取总数（使用 page=1, size=1 来获取 total，不关心实际数据）
      const [webmediaTotalResult, weiboTotalResult] = await Promise.all([
        search({ type: 'webmedia' }, 1, 1),
        search({ type: 'weibo' }, 1, 1),
      ])

      const totalCount = webmediaTotalResult.total + weiboTotalResult.total

      // 获取当前页的数据（每个数据源各取一半）
      const halfPageSize = Math.ceil(pageSize.value / 2)
      const [webmediaResult, weiboResult] = await Promise.all([
        search({ type: 'webmedia' }, currentPage.value, halfPageSize),
        search({ type: 'weibo' }, currentPage.value, halfPageSize),
      ])

      const webmediaUnified = (webmediaResult.data as WebMediaData[]).map(toUnifiedData)
      const weiboUnified = (weiboResult.data as WeiboData[]).map(toUnifiedDataFromWeibo)

      // 交替显示
      const merged: UnifiedData[] = []
      const maxLen = Math.max(webmediaUnified.length, weiboUnified.length)
      for (let i = 0; i < maxLen; i++) {
        if (i < webmediaUnified.length) merged.push(webmediaUnified[i])
        if (i < weiboUnified.length) merged.push(weiboUnified[i])
      }

      displayData.value = merged
      total.value = totalCount
    }
  } catch (error) {
    message.error('加载数据失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 加载选项数据
const loadOptions = async () => {
  await dataStore.loadAll()
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  loadData()
}

// 重置
const handleReset = () => {
  searchKeyword.value = ''
  filterSentiment.value = null
  dateRange.value = null
  filterSource.value = null
  filterUser.value = null
  currentPage.value = 1
  loadData()
}

// 刷新
const handleRefresh = async () => {
  await dataStore.loadAll()
  loadData()
  message.success('数据已刷新')
}

// 分页变化
const handlePageChange = (page: number) => {
  currentPage.value = page
  loadData()
}

const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadData()
}

// 工具函数
const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}

const formatTime = (time: string): string => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

const getContentPreview = (item: UnifiedData): string => {
  if (item.type === 'webmedia' && item.title) {
    return item.content?.substring(0, 150) || ''
  }
  return item.content?.substring(0, 150) || ''
}

const getSentimentType = (sentiment: string): 'success' | 'warning' | 'error' | 'info' => {
  if (sentiment === 'positive') return 'success'
  if (sentiment === 'negative') return 'error'
  return 'warning'
}

const getSentimentText = (sentiment: string): string => {
  if (sentiment === 'positive') return '正面'
  if (sentiment === 'negative') return '负面'
  return '中性'
}
</script>

<style scoped>
.data-list-view {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%);
  color: #ffffff;
  padding: 2rem;
  overflow-x: hidden;
}

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

.dashboard-content {
  position: relative;
  z-index: 1;
  max-width: 1600px;
  margin: 0 auto;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(138, 43, 226, 0.1) 100%);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.page-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #00ffff 0%, #8a2be2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-icon {
  font-size: 1.75rem;
}

.data-source-tabs {
  display: flex;
  gap: 0.5rem;
}

.filter-bar {
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  margin-bottom: 2rem;
}

.data-display-area {
  min-height: 400px;
}

/* 列表模式 */
.list-view {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
}

/* 卡片模式 */
.card-view {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.data-card {
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.3) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.data-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 255, 255, 0.2);
  border-color: rgba(0, 255, 255, 0.4);
}

.card-webmedia {
  border-left: 3px solid #00ffff;
}

.card-weibo {
  border-left: 3px solid #00ff88;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-time {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
}

.card-content {
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.5rem;
}

.card-text {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.card-stats {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
}

.stat-icon {
  font-size: 0.875rem;
}

/* 时间轴模式 */
.timeline-view {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 2rem;
  backdrop-filter: blur(10px);
}

.timeline-container {
  position: relative;
  padding-left: 2rem;
}

.timeline-item {
  position: relative;
  padding-bottom: 2rem;
  padding-left: 2rem;
}

.timeline-line {
  position: absolute;
  left: 0.5rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, #00ffff 0%, transparent 100%);
}

.timeline-dot {
  position: absolute;
  left: 0;
  top: 0.5rem;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  border: 2px solid #00ffff;
  background: rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.dot-webmedia {
  border-color: #00ffff;
  background: rgba(0, 255, 255, 0.3);
}

.dot-weibo {
  border-color: #00ff88;
  background: rgba(0, 255, 136, 0.3);
}

.timeline-content {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.3) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1.25rem;
  transition: all 0.3s ease;
}

.timeline-content:hover {
  border-color: rgba(0, 255, 255, 0.3);
  box-shadow: 0 4px 20px rgba(0, 255, 255, 0.2);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.timeline-time {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
}

.timeline-title {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.5rem;
}

.timeline-text {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin-bottom: 0.75rem;
}

.timeline-footer {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
}

.timeline-source,
.timeline-user {
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

/* 分页信息样式 */
.pagination-info-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.pagination-wrapper {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.pagination-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.total-info {
  font-size: 0.875rem;
  font-weight: 600;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.page-info {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

/* 响应式 */
@media (max-width: 768px) {
  .data-list-view {
    padding: 1rem;
  }

  .list-header {
    flex-direction: column;
    gap: 1rem;
  }

  .data-source-tabs {
    flex-wrap: wrap;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>

