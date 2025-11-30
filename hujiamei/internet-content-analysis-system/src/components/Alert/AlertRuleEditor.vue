<template>
  <div class="alert-rule-editor">
    <n-card title="预警规则配置" class="rule-card">
      <n-tabs v-model:value="activeTab" type="line">
        <!-- 关键词预警 -->
        <n-tab-pane name="keyword" tab="关键词预警">
          <div class="rule-section">
            <n-form-item label="关键词列表">
              <n-input
                v-model:value="keywordInput"
                type="textarea"
                placeholder="输入关键词，用逗号分隔，支持正则表达式"
                :rows="3"
              />
            </n-form-item>
            <n-form-item label="使用正则">
              <n-switch v-model:value="keywordRegex" />
            </n-form-item>
            <n-form-item label="预警级别">
              <n-select v-model:value="keywordLevel" :options="levelOptions" />
            </n-form-item>
            <n-form-item label="描述">
              <n-input v-model:value="keywordDesc" placeholder="规则描述（可选）" />
            </n-form-item>
            <n-button type="primary" @click="addKeywordRule">添加规则</n-button>
          </div>
        </n-tab-pane>

        <!-- 情感预警 -->
        <n-tab-pane name="sentiment" tab="情感预警">
          <div class="rule-section">
            <n-form-item label="情感类型">
              <n-select v-model:value="sentimentType" :options="sentimentOptions" />
            </n-form-item>
            <n-form-item label="得分阈值">
              <n-input-number
                v-model:value="sentimentScoreThreshold"
                :min="0"
                :max="100"
                placeholder="低于此值触发（0-100）"
              />
            </n-form-item>
            <n-form-item label="置信度阈值">
              <n-input-number
                v-model:value="sentimentConfidenceThreshold"
                :min="0"
                :max="1"
                :step="0.1"
                placeholder="高于此值触发（0-1）"
              />
            </n-form-item>
            <n-form-item label="预警级别">
              <n-select v-model:value="sentimentLevel" :options="levelOptions" />
            </n-form-item>
            <n-form-item label="描述">
              <n-input v-model:value="sentimentDesc" placeholder="规则描述（可选）" />
            </n-form-item>
            <n-button type="primary" @click="addSentimentRule">添加规则</n-button>
          </div>
        </n-tab-pane>

        <!-- 量激增预警 -->
        <n-tab-pane name="volume" tab="量激增预警">
          <div class="rule-section">
            <n-form-item label="数量阈值">
              <n-input-number
                v-model:value="volumeThreshold"
                :min="1"
                placeholder="条数"
              />
            </n-form-item>
            <n-form-item label="时间窗口（分钟）">
              <n-input-number
                v-model:value="volumeTimeWindow"
                :min="1"
                placeholder="分钟"
              />
            </n-form-item>
            <n-form-item label="预警级别">
              <n-select v-model:value="volumeLevel" :options="levelOptions" />
            </n-form-item>
            <n-form-item label="描述">
              <n-input v-model:value="volumeDesc" placeholder="规则描述（可选）" />
            </n-form-item>
            <n-button type="primary" @click="addVolumeRule">添加规则</n-button>
          </div>
        </n-tab-pane>

        <!-- 传播预警 -->
        <n-tab-pane name="propagation" tab="传播预警">
          <div class="rule-section">
            <n-form-item label="时间窗口（分钟）">
              <n-input-number
                v-model:value="propagationTimeWindow"
                :min="1"
                placeholder="分钟（默认10分钟）"
              />
            </n-form-item>
            <n-form-item label="最少跨源数量">
              <n-input-number
                v-model:value="propagationMinSources"
                :min="2"
                :max="2"
                placeholder="最少跨源数量（默认2：网媒+微博）"
              />
            </n-form-item>
            <n-form-item label="预警级别">
              <n-select v-model:value="propagationLevel" :options="levelOptions" />
            </n-form-item>
            <n-form-item label="描述">
              <n-input v-model:value="propagationDesc" placeholder="规则描述（可选）" />
            </n-form-item>
            <n-button type="primary" @click="addPropagationRule">添加规则</n-button>
          </div>
        </n-tab-pane>
      </n-tabs>

      <!-- 规则列表 -->
      <div class="rules-list">
        <n-divider>已配置规则</n-divider>
        <n-list>
          <n-list-item v-for="rule in rules" :key="rule.id">
            <div class="rule-item">
              <div class="rule-info">
                <n-tag :type="getRuleTypeTag(rule.type)">{{ getRuleTypeName(rule.type) }}</n-tag>
                <AlertBadge :level="rule.severity" />
                <span class="rule-desc">{{ rule.description || '无描述' }}</span>
                <n-switch
                  v-model:value="rule.enabled"
                  @update:value="updateRuleEnabled(rule.id, $event)"
                />
              </div>
              <n-button size="small" type="error" @click="deleteRule(rule.id)">删除</n-button>
            </div>
          </n-list-item>
        </n-list>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NCard, NTabs, NTabPane, NFormItem, NInput, NInputNumber, NSelect, NButton, NList, NListItem, NTag, NSwitch, NDivider, useMessage } from 'naive-ui'
import AlertBadge from '@/components/ui/AlertBadge.vue'
import { useAlertStore } from '@/stores/alertStore'
import type { AlertLevel } from '@/interfaces/alert'

const alertStore = useAlertStore()
const message = useMessage()

const activeTab = ref('keyword')

// 关键词规则
const keywordInput = ref('')
const keywordRegex = ref(false)
const keywordLevel = ref<AlertLevel>('warning')
const keywordDesc = ref('')

// 情感规则
const sentimentType = ref<'negative' | 'neutral'>('negative')
const sentimentScoreThreshold = ref(30)
const sentimentConfidenceThreshold = ref(0.8)
const sentimentLevel = ref<AlertLevel>('warning')
const sentimentDesc = ref('')

// 量激增规则
const volumeThreshold = ref(50)
const volumeTimeWindow = ref(5)
const volumeLevel = ref<AlertLevel>('warning')
const volumeDesc = ref('')

// 传播规则
const propagationTimeWindow = ref(10)
const propagationMinSources = ref(2)
const propagationLevel = ref<AlertLevel>('warning')
const propagationDesc = ref('')

const rules = ref(alertStore.rules)

const levelOptions = [
  { label: '严重', value: 'critical' },
  { label: '警告', value: 'warning' },
  { label: '信息', value: 'info' },
]

const sentimentOptions = [
  { label: '负面', value: 'negative' },
  { label: '中性', value: 'neutral' },
]

onMounted(async () => {
  await alertStore.loadRules()
  rules.value = alertStore.rules
})

const addKeywordRule = async () => {
  if (!keywordInput.value.trim()) {
    message.warning('请输入关键词')
    return
  }
  
  const keywords = keywordInput.value.split(/[,，]/).map((k) => k.trim()).filter(Boolean)
  
  try {
    await alertStore.addRule({
      type: 'keyword',
      keywords,
      regex: keywordRegex.value,
      enabled: true,
      severity: keywordLevel.value,
      description: keywordDesc.value,
    })
    
    message.success('关键词规则添加成功')
    keywordInput.value = ''
    keywordDesc.value = ''
    rules.value = alertStore.rules
  } catch (err) {
    message.error('添加规则失败')
  }
}

const addSentimentRule = async () => {
  try {
    await alertStore.addRule({
      type: 'sentiment',
      sentiment: sentimentType.value,
      scoreThreshold: sentimentScoreThreshold.value,
      confidenceThreshold: sentimentConfidenceThreshold.value,
      enabled: true,
      severity: sentimentLevel.value,
      description: sentimentDesc.value,
    })
    
    message.success('情感规则添加成功')
    sentimentDesc.value = ''
    rules.value = alertStore.rules
  } catch (err) {
    message.error('添加规则失败')
  }
}

const addVolumeRule = async () => {
  try {
    await alertStore.addRule({
      type: 'volume',
      threshold: volumeThreshold.value,
      timeWindow: volumeTimeWindow.value,
      enabled: true,
      severity: volumeLevel.value,
      description: volumeDesc.value,
    })
    
    message.success('量激增规则添加成功')
    volumeDesc.value = ''
    rules.value = alertStore.rules
  } catch (err) {
    message.error('添加规则失败')
  }
}

const addPropagationRule = async () => {
  try {
    await alertStore.addRule({
      type: 'propagation',
      timeWindow: propagationTimeWindow.value,
      minSources: propagationMinSources.value,
      enabled: true,
      severity: propagationLevel.value,
      description: propagationDesc.value,
    })
    
    message.success('传播规则添加成功')
    propagationDesc.value = ''
    rules.value = alertStore.rules
  } catch (err) {
    message.error('添加规则失败')
  }
}

const updateRuleEnabled = async (id: string, enabled: boolean) => {
  try {
    await alertStore.updateRule(id, { enabled })
    rules.value = alertStore.rules
  } catch (err) {
    message.error('更新规则失败')
  }
}

const deleteRule = async (id: string) => {
  try {
    await alertStore.deleteRule(id)
    message.success('规则删除成功')
    rules.value = alertStore.rules
  } catch (err) {
    message.error('删除规则失败')
  }
}

const getRuleTypeName = (type: string) => {
  const map: Record<string, string> = {
    keyword: '关键词',
    sentiment: '情感',
    volume: '量激增',
    propagation: '传播',
  }
  return map[type] || type
}

const getRuleTypeTag = (type: string) => {
  const map: Record<string, string> = {
    keyword: 'success',
    sentiment: 'warning',
    volume: 'info',
    propagation: 'error',
  }
  return map[type] || 'default'
}
</script>

<style scoped>
.alert-rule-editor {
  @apply w-full;
}

.rule-card {
  @apply bg-gray-800 text-gray-200;
}

.rule-section {
  @apply space-y-4;
}

.rules-list {
  @apply mt-6;
}

.rule-item {
  @apply flex items-center justify-between;
}

.rule-info {
  @apply flex items-center gap-3 flex-1;
}

.rule-desc {
  @apply text-gray-400 text-sm flex-1;
}
</style>

