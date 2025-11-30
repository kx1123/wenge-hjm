<template>
  <div class="alert-panel">
    <div class="section-title">
      <span class="title-line"></span>
      <span class="title-text">预警规则管理</span>
      <span class="title-line"></span>
    </div>
    <div class="alert-card">
      <n-space vertical>
        <!-- 关键词预警 -->
        <div class="rule-section">
          <div class="rule-title">关键词预警</div>
          <n-space>
            <n-input
              v-model:value="keywordInput"
              placeholder="输入关键词，用逗号分隔"
              style="width: 300px"
            />
            <n-select
              v-model:value="keywordSeverity"
              :options="severityOptions"
              style="width: 120px"
            />
            <n-button type="primary" @click="addKeywordRule">添加规则</n-button>
          </n-space>
          <n-list class="mt-4">
            <n-list-item v-for="rule in keywordRules" :key="rule.id">
              <n-space justify="space-between" align="center" style="width: 100%">
                <div>
                  <n-tag :type="getSeverityType(rule.severity)">{{ rule.severity }}</n-tag>
                  <span class="ml-2">{{ rule.keywords.join('、') }}</span>
                </div>
                <n-space>
                  <n-switch v-model:value="rule.enabled" />
                  <n-button size="small" type="error" @click="removeRule(rule.id)">删除</n-button>
                </n-space>
              </n-space>
            </n-list-item>
          </n-list>
        </div>

        <!-- 情感预警 -->
        <div class="rule-section">
          <div class="rule-title">情感预警</div>
          <n-space>
            <n-select
              v-model:value="sentimentType"
              :options="sentimentOptions"
              style="width: 120px"
            />
            <n-input-number
              v-model:value="sentimentThreshold"
              :min="1"
              placeholder="阈值"
              style="width: 120px"
            />
            <n-input-number
              v-model:value="sentimentTimeWindow"
              :min="1"
              placeholder="时间窗口(分钟)"
              style="width: 150px"
            />
            <n-select
              v-model:value="sentimentSeverity"
              :options="severityOptions"
              style="width: 120px"
            />
            <n-button type="primary" @click="addSentimentRule">添加规则</n-button>
          </n-space>
          <n-list class="mt-4">
            <n-list-item v-for="rule in sentimentRules" :key="rule.id">
              <n-space justify="space-between" align="center" style="width: 100%">
                <div>
                  <n-tag :type="getSeverityType(rule.severity)">{{ rule.severity }}</n-tag>
                  <span class="ml-2">
                    {{ rule.sentiment === 'negative' ? '负面' : '中性' }} ≥ {{ rule.threshold }}条
                    ({{ rule.timeWindow }}分钟)
                  </span>
                </div>
                <n-space>
                  <n-switch v-model:value="rule.enabled" />
                  <n-button size="small" type="error" @click="removeRule(rule.id)">删除</n-button>
                </n-space>
              </n-space>
            </n-list-item>
          </n-list>
        </div>

        <!-- 热度预警 -->
        <div class="rule-section">
          <div class="rule-title">热度预警</div>
          <n-space>
            <n-input-number
              v-model:value="volumeThreshold"
              :min="1"
              placeholder="阈值(条数)"
              style="width: 150px"
            />
            <n-input-number
              v-model:value="volumeTimeWindow"
              :min="1"
              placeholder="时间窗口(分钟)"
              style="width: 150px"
            />
            <n-select
              v-model:value="volumeSeverity"
              :options="severityOptions"
              style="width: 120px"
            />
            <n-button type="primary" @click="addVolumeRule">添加规则</n-button>
          </n-space>
          <n-list class="mt-4">
            <n-list-item v-for="rule in volumeRules" :key="rule.id">
              <n-space justify="space-between" align="center" style="width: 100%">
                <div>
                  <n-tag :type="getSeverityType(rule.severity)">{{ rule.severity }}</n-tag>
                  <span class="ml-2">
                    ≥ {{ rule.threshold }}条 ({{ rule.timeWindow }}分钟)
                  </span>
                </div>
                <n-space>
                  <n-switch v-model:value="rule.enabled" />
                  <n-button size="small" type="error" @click="removeRule(rule.id)">删除</n-button>
                </n-space>
              </n-space>
            </n-list-item>
          </n-list>
        </div>
      </n-space>
    </div>

    <!-- 预警记录 -->
    <div class="section-title mt-6">
      <span class="title-line"></span>
      <span class="title-text">预警记录</span>
      <span class="title-line"></span>
    </div>
    <div class="alert-card">
      <n-list>
        <n-list-item v-for="alert in alerts" :key="alert.id">
          <n-space justify="space-between" align="center" style="width: 100%">
            <div>
              <n-tag :type="getSeverityType(alert.severity)">{{ alert.severity }}</n-tag>
              <span class="ml-2">{{ alert.message }}</span>
              <span class="ml-2 text-gray-500 text-sm">{{ formatTime(alert.createdAt) }}</span>
            </div>
            <n-button
              v-if="!alert.acknowledged"
              size="small"
              @click="acknowledgeAlert(alert.id)"
            >
              确认
            </n-button>
          </n-space>
        </n-list-item>
      </n-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NCard,
  NSpace,
  NInput,
  NSelect,
  NButton,
  NList,
  NListItem,
  NTag,
  NSwitch,
  NInputNumber,
} from 'naive-ui'
import type { AlertRule, AlertRecord } from '@/interfaces/alert'
import dayjs from 'dayjs'

const keywordInput = ref('')
const keywordSeverity = ref<'low' | 'medium' | 'high'>('medium')
const sentimentType = ref<'negative' | 'neutral'>('negative')
const sentimentThreshold = ref(10)
const sentimentTimeWindow = ref(60)
const sentimentSeverity = ref<'low' | 'medium' | 'high'>('medium')
const volumeThreshold = ref(50)
const volumeTimeWindow = ref(60)
const volumeSeverity = ref<'low' | 'medium' | 'high'>('medium')

const keywordRules = ref<AlertRule[]>([])
const sentimentRules = ref<AlertRule[]>([])
const volumeRules = ref<AlertRule[]>([])
const alerts = ref<AlertRecord[]>([])

const severityOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { value: 'high', label: '高' },
]

const sentimentOptions = [
  { label: '负面', value: 'negative' },
  { label: '中性', value: 'neutral' },
]

const getSeverityType = (severity: string) => {
  if (severity === 'high') return 'error'
  if (severity === 'medium') return 'warning'
  return 'info'
}

const addKeywordRule = () => {
  if (!keywordInput.value.trim()) return
  const keywords = keywordInput.value.split(/[,，]/).map((k) => k.trim()).filter(Boolean)
  keywordRules.value.push({
    id: `keyword-${Date.now()}`,
    type: 'keyword',
    keywords,
    enabled: true,
    severity: keywordSeverity.value,
  })
  keywordInput.value = ''
}

const addSentimentRule = () => {
  sentimentRules.value.push({
    id: `sentiment-${Date.now()}`,
    type: 'sentiment',
    sentiment: sentimentType.value,
    threshold: sentimentThreshold.value,
    timeWindow: sentimentTimeWindow.value,
    enabled: true,
    severity: sentimentSeverity.value,
  })
}

const addVolumeRule = () => {
  volumeRules.value.push({
    id: `volume-${Date.now()}`,
    type: 'volume',
    threshold: volumeThreshold.value,
    timeWindow: volumeTimeWindow.value,
    enabled: true,
    severity: volumeSeverity.value,
  })
}

const removeRule = (id: string) => {
  keywordRules.value = keywordRules.value.filter((r) => r.id !== id)
  sentimentRules.value = sentimentRules.value.filter((r) => r.id !== id)
  volumeRules.value = volumeRules.value.filter((r) => r.id !== id)
}

const acknowledgeAlert = (id: string) => {
  const alert = alerts.value.find((a) => a.id === id)
  if (alert) {
    alert.acknowledged = true
    alert.acknowledgedAt = new Date().toISOString()
  }
}

const formatTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}
</script>

<style scoped>
.alert-panel {
  width: 100%;
  margin-top: 2rem;
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
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.alert-card {
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.alert-card:hover {
  border-color: rgba(0, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 255, 255, 0.2);
}

/* 覆盖 Naive UI 组件样式 */
:deep(.n-card) {
  background: transparent !important;
  border: none !important;
}

:deep(.n-card-header) {
  color: #00ffff !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}

:deep(.n-list-item) {
  background: rgba(0, 0, 0, 0.3) !important;
  border-radius: 8px !important;
  margin-bottom: 0.75rem !important;
  padding: 1rem !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  transition: all 0.3s ease !important;
}

:deep(.n-list-item:hover) {
  border-color: rgba(0, 255, 255, 0.3) !important;
  box-shadow: 0 4px 20px rgba(0, 255, 255, 0.1) !important;
}

:deep(.n-input),
:deep(.n-select),
:deep(.n-input-number) {
  background: rgba(0, 0, 0, 0.3) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
}

:deep(.n-input:focus),
:deep(.n-select:focus),
:deep(.n-input-number:focus) {
  border-color: #00ffff !important;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3) !important;
}

:deep(.n-button--primary-type) {
  background: linear-gradient(135deg, #00ffff 0%, #0099ff 100%) !important;
  border: none !important;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.5) !important;
}

:deep(.n-button--primary-type:hover) {
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.7) !important;
  transform: translateY(-2px);
}

:deep(.n-button--error-type) {
  background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%) !important;
  border: none !important;
}

:deep(.n-tag) {
  background: rgba(0, 255, 255, 0.2) !important;
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  color: #00ffff !important;
}

:deep(.n-switch) {
  --n-color: rgba(0, 255, 255, 0.3) !important;
}

:deep(.n-switch--checked) {
  --n-color: #00ffff !important;
}

.rule-section {
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  margin-bottom: 1rem;
  transition: all 0.3s ease;
}

.rule-section:hover {
  border-color: rgba(0, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 255, 255, 0.1);
}

.rule-title {
  font-size: 1rem;
  font-weight: 600;
  color: #00ffff;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}
</style>

