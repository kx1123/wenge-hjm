<template>
  <div class="report-view p-6">
    <n-card>
      <template #header>
        <h2 class="text-2xl font-bold">数据分析报告</h2>
      </template>

      <n-space vertical>
        <n-space>
          <n-select
            v-model:value="reportType"
            :options="reportTypeOptions"
            style="width: 200px"
          />
          <n-date-picker
            v-model:value="selectedDate"
            type="date"
            clearable
            placeholder="选择日期"
            :is-date-disabled="disableDate"
          />
          <n-button type="primary" @click="handleGenerateReport" :loading="generating" :disabled="!selectedDate">
            生成报告
          </n-button>
        </n-space>

        <n-card v-if="reportContent" title="报告内容">
          <div class="report-content-wrapper">
            <div class="report-content" ref="reportContentRef" v-html="renderedContent"></div>
          </div>
          <template #footer>
            <n-space justify="end">
              <n-button @click="handleCopyReport">复制报告</n-button>
              <n-button type="primary" @click="handleDownloadPDF" :loading="exportingPDF">下载 PDF</n-button>
            </n-space>
          </template>
        </n-card>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NCard,
  NSpace,
  NSelect,
  NDatePicker,
  NButton,
  useMessage,
} from 'naive-ui'
import { generateReport, type ReportType } from '@/features/report/reportGenerator'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import dayjs from 'dayjs'

const message = useMessage()

const reportType = ref<ReportType>('daily')
const selectedDate = ref<number | null>(Date.now())
const reportContent = ref('')
const reportContentRef = ref<HTMLElement | null>(null)
const generating = ref(false)
const exportingPDF = ref(false)

const reportTypeOptions = [
  { label: '日报', value: 'daily' },
  { label: '周报', value: 'weekly' },
  { label: '月报', value: 'monthly' },
]

function disableDate(timestamp: number): boolean {
  return timestamp > Date.now()
}

// 简单的Markdown转HTML（不使用marked库，直接处理基本格式）
const renderedContent = computed(() => {
  if (!reportContent.value) return ''
  let html = reportContent.value
  // 转换标题
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')
  // 转换粗体
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  // 转换列表
  html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>')
  // 转换段落
  html = html.split('\n\n').map(p => {
    if (!p.trim()) return ''
    if (p.startsWith('<h') || p.startsWith('<li>')) return p
    return `<p>${p.replace(/\n/g, '<br>')}</p>`
  }).join('')
  // 包装列表项
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
  return html
})

const handleGenerateReport = async () => {
  if (!selectedDate.value) {
    message.warning('请选择日期')
    return
  }
  
  generating.value = true
  reportContent.value = ''

  try {
    const dateStr = dayjs(selectedDate.value).format('YYYY-MM-DD')
    const content = await generateReport({
      type: reportType.value,
      date: dateStr,
    })
    
    reportContent.value = content
    message.success('报告生成成功')
  } catch (error) {
    message.error('生成报告失败: ' + (error instanceof Error ? error.message : '未知错误'))
    console.error(error)
  } finally {
    generating.value = false
  }
}

async function handleDownloadPDF() {
  if (!reportContentRef.value) {
    message.warning('没有可导出的内容')
    return
  }

  exportingPDF.value = true

  try {
    const canvas = await html2canvas(reportContentRef.value, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    const imgWidth = canvas.width
    const imgHeight = canvas.height
    const pdfWidth = 210
    const pdfHeight = 297
    const imgAspectRatio = imgWidth / imgHeight
    
    let imgPdfWidth = pdfWidth
    let imgPdfHeight = pdfWidth / imgAspectRatio
    
    if (imgPdfHeight > pdfHeight) {
      imgPdfHeight = pdfHeight
      imgPdfWidth = pdfHeight * imgAspectRatio
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const imgData = canvas.toDataURL('image/png', 1.0)
    const pageHeight = pdf.internal.pageSize.height
    let heightLeft = imgPdfHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', (pdfWidth - imgPdfWidth) / 2, position, imgPdfWidth, imgPdfHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position = heightLeft - imgPdfHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', (pdfWidth - imgPdfWidth) / 2, position, imgPdfWidth, imgPdfHeight)
      heightLeft -= pageHeight
    }

    const fileName = `舆情分析报告_${reportType.value}_${dayjs(selectedDate.value).format('YYYY-MM-DD')}.pdf`
    pdf.save(fileName)

    message.success('PDF 导出成功')
  } catch (error) {
    console.error('导出 PDF 失败:', error)
    message.error('导出 PDF 失败: ' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    exportingPDF.value = false
  }
}

const handleCopyReport = async () => {
  try {
    await navigator.clipboard.writeText(reportContent.value)
    message.success('报告已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
  }
}

</script>

<style scoped>
.report-view {
  max-width: 1200px;
  margin: 0 auto;
}

.report-content-wrapper {
  max-height: 600px;
  overflow-y: auto;
  padding: 1rem;
  background-color: #ffffff;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

/* 自定义滚动条 */
.report-content-wrapper::-webkit-scrollbar {
  width: 8px;
}

.report-content-wrapper::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 4px;
}

.report-content-wrapper::-webkit-scrollbar-thumb {
  background: #9ca3af;
  border-radius: 4px;
}

.report-content-wrapper::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

.report-content {
  line-height: 1.8;
  color: #1f2937;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* Markdown 样式 */
.report-content :deep(h1) {
  font-size: 24px;
  font-weight: 700;
  margin: 24px 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
  color: #111827;
}

.report-content :deep(h2) {
  font-size: 20px;
  font-weight: 600;
  margin: 20px 0 12px 0;
  color: #1f2937;
}

.report-content :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 16px 0 8px 0;
  color: #374151;
}

.report-content :deep(p) {
  margin: 12px 0;
  color: #1f2937;
  word-wrap: break-word;
}

.report-content :deep(strong) {
  font-weight: 600;
  color: #111827;
}

.report-content :deep(em) {
  font-style: italic;
}

.report-content :deep(code) {
  background-color: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #dc2626;
}

.report-content :deep(pre) {
  background-color: #f9fafb;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 16px 0;
  border: 1px solid #e5e7eb;
}

.report-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: #1f2937;
  font-size: 13px;
}

.report-content :deep(ul),
.report-content :deep(ol) {
  margin: 12px 0;
  padding-left: 24px;
}

.report-content :deep(li) {
  margin: 6px 0;
  color: #1f2937;
}

.report-content :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.report-content :deep(a:hover) {
  color: #1d4ed8;
}

.report-content :deep(hr) {
  margin: 24px 0;
  border: none;
  border-top: 1px solid #e5e7eb;
}
</style>

