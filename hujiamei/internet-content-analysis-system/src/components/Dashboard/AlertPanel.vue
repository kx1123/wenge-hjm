<template>
  <div class="alert-panel">
    <n-card title="预警规则管理">
      <n-space vertical>
        <!-- 关键词预警 -->
        <n-card size="small" title="关键词预警">
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
        </n-card>

        <!-- 情感预警 -->
        <n-card size="small" title="情感预警">
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
        </n-card>

        <!-- 热度预警 -->
        <n-card size="small" title="热度预警">
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
        </n-card>
      </n-space>
    </n-card>

    <!-- 预警记录 -->
    <n-card title="预警记录" class="mt-4">
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
    </n-card>
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
}
</style>

