<template>
  <div class="alert-rule-editor">
    <n-card title="预警规则管理" class="rule-card">
      <template #header-extra>
        <n-button type="primary" @click="showAddDialog = true">
          <template #icon>
            <span>➕</span>
          </template>
          添加规则
        </n-button>
      </template>

      <n-data-table
        :columns="columns"
        :data="alertStore.rules"
        :pagination="false"
      />

      <!-- 添加/编辑规则对话框 -->
      <n-modal v-model:show="showAddDialog" preset="dialog" title="添加预警规则" style="width: 600px">
        <n-form :model="formData" :rules="formRules" ref="formRef" label-placement="left" label-width="120px">
          <n-form-item label="规则类型" path="type">
            <n-select
              v-model:value="formData.type"
              :options="ruleTypeOptions"
              placeholder="选择规则类型"
              @update:value="handleTypeChange"
            />
          </n-form-item>

          <n-form-item label="规则名称" path="description">
            <n-input v-model:value="formData.description" placeholder="输入规则名称" />
          </n-form-item>

          <!-- 关键词规则 -->
          <template v-if="formData.type === 'keyword'">
            <n-form-item label="关键词" path="keywords">
              <n-dynamic-input
                v-model:value="formData.keywords"
                :min="1"
                placeholder="输入关键词，按回车添加"
              />
            </n-form-item>
          </template>

          <!-- 情感规则 -->
          <template v-if="formData.type === 'sentiment'">
            <n-form-item label="情感类型" path="sentiment">
              <n-select
                v-model:value="formData.sentiment"
                :options="sentimentOptions"
                placeholder="选择情感类型"
              />
            </n-form-item>
            <n-form-item label="阈值" path="threshold">
              <n-input-number
                v-model:value="formData.threshold"
                :min="0"
                :max="100"
                placeholder="情感分数阈值（0-100）"
                style="width: 100%"
              />
            </n-form-item>
            <n-form-item label="时间窗口（分钟）" path="timeWindow">
              <n-input-number
                v-model:value="formData.timeWindow"
                :min="1"
                placeholder="时间窗口"
                style="width: 100%"
              />
            </n-form-item>
          </template>

          <!-- 量激增规则 -->
          <template v-if="formData.type === 'volume'">
            <n-form-item label="阈值（条数）" path="threshold">
              <n-input-number
                v-model:value="formData.threshold"
                :min="1"
                placeholder="触发预警的数据量"
                style="width: 100%"
              />
            </n-form-item>
            <n-form-item label="时间窗口（分钟）" path="timeWindow">
              <n-input-number
                v-model:value="formData.timeWindow"
                :min="1"
                placeholder="时间窗口"
                style="width: 100%"
              />
            </n-form-item>
          </template>

          <n-form-item label="预警级别" path="severity">
            <n-select
              v-model:value="formData.severity"
              :options="severityOptions"
              placeholder="选择预警级别"
            />
          </n-form-item>

          <n-form-item label="启用状态" path="enabled">
            <n-switch v-model:value="formData.enabled" />
          </n-form-item>
        </n-form>

        <template #action>
          <n-space>
            <n-button @click="showAddDialog = false">取消</n-button>
            <n-button type="primary" @click="handleSaveRule">保存</n-button>
          </n-space>
        </template>
      </n-modal>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, h, reactive } from 'vue'
import {
  NCard,
  NDataTable,
  NButton,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NInputNumber,
  NSwitch,
  NDynamicInput,
  NSpace,
  NTag,
  NPopconfirm,
  useMessage,
} from 'naive-ui'
import { useAlertStore } from '@/stores/alertStore'
import type { AlertRule } from '@/interfaces/alert'

const alertStore = useAlertStore()
const message = useMessage()
const formRef = ref<any>(null)
const showAddDialog = ref(false)
const editingRule = ref<AlertRule | null>(null)

const ruleTypeOptions = [
  { label: '关键词预警', value: 'keyword' },
  { label: '情感预警', value: 'sentiment' },
  { label: '量激增预警', value: 'volume' },
]

const sentimentOptions = [
  { label: '负面', value: 'negative' },
  { label: '中性', value: 'neutral' },
]

const severityOptions = [
  { label: '严重', value: 'high' },
  { label: '警告', value: 'medium' },
  { label: '提示', value: 'low' },
]

const formData = reactive<Partial<AlertRule> & { keywords?: string[] }>({
  type: 'keyword',
  description: '',
  enabled: true,
  severity: 'medium',
  keywords: [],
  sentiment: 'negative',
  threshold: 30,
  timeWindow: 60,
})

const formRules = {
  type: { required: true, message: '请选择规则类型', trigger: 'change' },
  description: { required: true, message: '请输入规则名称', trigger: 'blur' },
}

function handleTypeChange() {
  // 重置表单数据
  if (formData.type === 'keyword') {
    formData.keywords = []
  } else if (formData.type === 'sentiment') {
    formData.sentiment = 'negative'
    formData.threshold = 30
    formData.timeWindow = 60
  } else if (formData.type === 'volume') {
    formData.threshold = 50
    formData.timeWindow = 5
  }
}

function handleSaveRule() {
  formRef.value?.validate((errors: any) => {
    if (!errors) {
      const rule: AlertRule = {
        id: editingRule.value?.id || `rule-${Date.now()}`,
        type: formData.type!,
        enabled: formData.enabled ?? true,
        severity: formData.severity!,
        description: formData.description,
        ...(formData.type === 'keyword' && { keywords: formData.keywords || [] }),
        ...(formData.type === 'sentiment' && {
          sentiment: formData.sentiment!,
          threshold: formData.threshold!,
          timeWindow: formData.timeWindow!,
        }),
        ...(formData.type === 'volume' && {
          threshold: formData.threshold!,
          timeWindow: formData.timeWindow!,
        }),
      } as AlertRule

      if (editingRule.value) {
        alertStore.updateRule(rule.id, rule)
        message.success('规则更新成功')
      } else {
        alertStore.addRule(rule)
        message.success('规则添加成功')
      }

      showAddDialog.value = false
      resetForm()
    }
  })
}

function resetForm() {
  editingRule.value = null
  formData.type = 'keyword'
  formData.description = ''
  formData.enabled = true
  formData.severity = 'medium'
  formData.keywords = []
  formData.sentiment = 'negative'
  formData.threshold = 30
  formData.timeWindow = 60
}

function handleEdit(rule: AlertRule) {
  editingRule.value = rule
  formData.type = rule.type
  formData.description = rule.description
  formData.enabled = rule.enabled
  formData.severity = rule.severity
  if (rule.type === 'keyword') {
    formData.keywords = [...rule.keywords]
  } else if (rule.type === 'sentiment') {
    formData.sentiment = rule.sentiment
    formData.threshold = rule.threshold
    formData.timeWindow = rule.timeWindow
  } else if (rule.type === 'volume') {
    formData.threshold = rule.threshold
    formData.timeWindow = rule.timeWindow
  }
  showAddDialog.value = true
}

function handleDelete(rule: AlertRule) {
  alertStore.deleteRule(rule.id)
  message.success('规则删除成功')
}

const columns = [
  {
    title: '规则名称',
    key: 'description',
    width: 150,
  },
  {
    title: '类型',
    key: 'type',
    width: 120,
    render: (row: AlertRule) => {
      const typeMap: Record<string, string> = {
        keyword: '关键词',
        sentiment: '情感',
        volume: '量激增',
      }
      return typeMap[row.type] || row.type
    },
  },
  {
    title: '配置',
    key: 'config',
    ellipsis: { tooltip: true },
    render: (row: AlertRule) => {
      if (row.type === 'keyword') {
        return row.keywords.join('、')
      } else if (row.type === 'sentiment') {
        return `情感: ${row.sentiment === 'negative' ? '负面' : '中性'}, 阈值: ${row.threshold}, 窗口: ${row.timeWindow}分钟`
      } else if (row.type === 'volume') {
        return `阈值: ${row.threshold}条, 窗口: ${row.timeWindow}分钟`
      }
      return '-'
    },
  },
  {
    title: '级别',
    key: 'severity',
    width: 100,
    render: (row: AlertRule) => {
      const typeMap: Record<string, any> = {
        high: { type: 'error', text: '严重' },
        medium: { type: 'warning', text: '警告' },
        low: { type: 'info', text: '提示' },
      }
      const config = typeMap[row.severity] || { type: 'default', text: row.severity }
      return h(NTag, { type: config.type }, { default: () => config.text })
    },
  },
  {
    title: '状态',
    key: 'enabled',
    width: 100,
    render: (row: AlertRule) => {
      return h(
        NTag,
        { type: row.enabled ? 'success' : 'default' },
        { default: () => (row.enabled ? '启用' : '禁用') }
      )
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row: AlertRule) => {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              onClick: () => handleEdit(row),
            },
            { default: () => '编辑' }
          ),
          h(
            NPopconfirm,
            {
              onPositiveClick: () => handleDelete(row),
            },
            {
              trigger: () =>
                h(
                  NButton,
                  {
                    size: 'small',
                    type: 'error',
                  },
                  { default: () => '删除' }
                ),
              default: () => '确定要删除这条规则吗？',
            }
          ),
        ],
      })
    },
  },
]
</script>

<style scoped>
.alert-rule-editor {
  margin-bottom: 2rem;
}

.rule-card {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}
</style>

