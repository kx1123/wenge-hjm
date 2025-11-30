<template>
  <div class="report-panel">
    <n-card class="report-card">
      <!-- 顶部：按钮组 + 日期选择器 -->
      <div class="report-header">
        <div class="report-controls">
          <n-radio-group v-model:value="reportType" size="medium">
            <n-radio-button value="daily">日报</n-radio-button>
            <n-radio-button value="weekly">周报</n-radio-button>
            <n-radio-button value="monthly">月报</n-radio-button>
          </n-radio-group>
          
          <n-date-picker
            v-model:value="selectedDate"
            type="date"
            format="yyyy-MM-dd"
            :is-date-disabled="disableDate"
            placeholder="选择日期"
            clearable
            style="width: 200px; margin-left: 16px;"
          />
          
          <n-button
            type="primary"
            @click="handleGenerate"
            :loading="generating"
            :disabled="!selectedDate"
            style="margin-left: 16px;"
          >
            <template #icon>
              <span>📊</span>
            </template>
            生成报告
          </n-button>
        </div>
        
        <!-- 导出按钮 -->
        <div class="export-buttons" v-if="reportContent">
          <n-button @click="handleExportPDF" :loading="exportingPDF" secondary>
            <template #icon>
              <span>📄</span>
            </template>
            导出 PDF
          </n-button>
          <n-button @click="handleExportWord" :loading="exportingWord" secondary style="margin-left: 8px;">
            <template #icon>
              <span>📝</span>
            </template>
            导出 Word
          </n-button>
        </div>
      </div>

      <!-- 生成进度提示 -->
      <Transition name="fade">
        <div v-if="generating" class="generating-tip">
          <n-progress
            type="line"
            :percentage="progress"
            :status="progressStatus"
            :show-indicator="true"
          />
          <div class="progress-text">
            <n-spin size="small" />
            <span class="ml-2">{{ progressText }}</span>
          </div>
        </div>
      </Transition>

      <!-- 预览区：Markdown 渲染结果 -->
      <div class="report-preview" v-if="reportContent || generating">
        <div class="report-content" ref="reportContentRef" v-html="renderedContent"></div>
      </div>
      
      <!-- 空状态 -->
      <n-empty
        v-else
        description="请选择报告类型和日期，然后点击「生成报告」"
        style="padding: 60px 0;"
      />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { NCard, NRadioGroup, NRadioButton, NDatePicker, NButton, NProgress, NSpin, NEmpty, useMessage } from 'naive-ui'
import { generateReport, type ReportType } from '@/features/report/reportGenerator'
import dayjs from 'dayjs'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { saveAs } from 'file-saver'

const message = useMessage()

// 报告类型和日期
const reportType = ref<ReportType>('daily')
const selectedDate = ref<number | null>(Date.now())
const reportContent = ref<string>('')
const reportContentRef = ref<HTMLElement | null>(null)

// 生成状态
const generating = ref(false)
const progress = ref(0)
const progressStatus = ref<'success' | 'error' | 'warning' | 'info'>('info')
const progressText = ref('准备生成报告...')

// 导出状态
const exportingPDF = ref(false)
const exportingWord = ref(false)

/**
 * 禁用未来日期
 */
function disableDate(timestamp: number): boolean {
  return timestamp > Date.now()
}

/**
 * 渲染 Markdown 为 HTML
 */
function renderMarkdown(text: string): string {
  if (!text) return ''
  
  // 转义 HTML
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // 标题 # ## ###
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  
  // 粗体 **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  
  // 斜体 *text*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  
  // 代码块 ```code```
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
  
  // 行内代码 `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  
  // 链接 [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
  
  // 列表项 - item
  html = html.replace(/^\- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
  
  // 有序列表 1. item
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
  
  // 换行（保留段落）
  html = html.replace(/\n\n/g, '</p><p>')
  html = html.replace(/\n/g, '<br>')
  
  // 包装段落
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<pre')) {
    html = '<p>' + html + '</p>'
  }
  
  return html
}

/**
 * 渲染后的内容
 */
const renderedContent = computed(() => {
  return renderMarkdown(reportContent.value)
})

/**
 * 生成报告
 */
async function handleGenerate() {
  if (!selectedDate.value) {
    message.warning('请先选择日期')
    return
  }

  generating.value = true
  progress.value = 0
  progressStatus.value = 'info'
  progressText.value = '正在聚合数据...'
  reportContent.value = ''

  try {
    // 模拟进度更新
    const progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += 10
        if (progress.value < 30) {
          progressText.value = '正在聚合数据...'
        } else if (progress.value < 60) {
          progressText.value = '正在调用 AI 生成报告...'
        } else {
          progressText.value = '正在格式化报告内容...'
        }
      }
    }, 500)

    const dateStr = dayjs(selectedDate.value).format('YYYY-MM-DD')
    const startTime = Date.now()
    
    // 生成报告
    const content = await generateReport({
      type: reportType.value,
      date: dateStr,
    })

    clearInterval(progressInterval)
    progress.value = 100
    progressStatus.value = 'success'
    progressText.value = `报告生成完成（耗时 ${Math.round((Date.now() - startTime) / 1000)} 秒）`

    reportContent.value = content

    // 延迟隐藏进度条
    setTimeout(() => {
      generating.value = false
    }, 2000)

    message.success('报告生成成功')
  } catch (error) {
    progress.value = 100
    progressStatus.value = 'error'
    progressText.value = '报告生成失败'
    generating.value = false
    
    console.error('生成报告失败:', error)
    message.error('生成报告失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
}

/**
 * 导出 PDF
 */
async function handleExportPDF() {
  if (!reportContentRef.value) {
    message.warning('没有可导出的内容')
    return
  }

  exportingPDF.value = true

  try {
    // 使用 html2canvas 截图
    const canvas = await html2canvas(reportContentRef.value, {
      scale: 2, // 提高清晰度
      useCORS: true,
      backgroundColor: '#ffffff',
    })

    // 计算 PDF 尺寸（A4: 210mm x 297mm）
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    const pdfWidth = 210 // A4 宽度（mm）
    const pdfHeight = 297 // A4 高度（mm）
    const imgAspectRatio = imgWidth / imgHeight
    const pdfAspectRatio = pdfWidth / pdfHeight
    
    // 计算图片在 PDF 中的实际尺寸
    let imgPdfWidth = pdfWidth
    let imgPdfHeight = pdfWidth / imgAspectRatio
    
    // 如果图片高度超过 PDF 高度，按高度缩放
    if (imgPdfHeight > pdfHeight) {
      imgPdfHeight = pdfHeight
      imgPdfWidth = pdfHeight * imgAspectRatio
    }

    // 创建 PDF（A4 格式）
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const imgData = canvas.toDataURL('image/png', 1.0)
    
    // 如果内容超过一页，需要分页
    const pageHeight = pdf.internal.pageSize.height
    let heightLeft = imgPdfHeight
    let position = 0

    // 添加第一页
    pdf.addImage(imgData, 'PNG', (pdfWidth - imgPdfWidth) / 2, position, imgPdfWidth, imgPdfHeight)
    heightLeft -= pageHeight

    // 如果还有内容，继续添加页面
    while (heightLeft > 0) {
      position = heightLeft - imgPdfHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', (pdfWidth - imgPdfWidth) / 2, position, imgPdfWidth, imgPdfHeight)
      heightLeft -= pageHeight
    }

    // 保存文件
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

/**
 * 导出 Word
 */
async function handleExportWord() {
  if (!reportContent.value) {
    message.warning('没有可导出的内容')
    return
  }

  exportingWord.value = true

  try {
    // 尝试加载模板文件（如果存在）
    let templateLoaded = false
    let arrayBuffer: ArrayBuffer | null = null
    
    // 尝试多个可能的路径
    const templatePaths = [
      '/report_template.docx', // public 目录
      '/src/assets/report_template.docx', // src/assets 目录
    ]
    
    for (const path of templatePaths) {
      try {
        const response = await fetch(path)
        if (response.ok) {
          arrayBuffer = await response.arrayBuffer()
          templateLoaded = true
          break
        }
      } catch (e) {
        // 继续尝试下一个路径
        continue
      }
    }
    
    if (templateLoaded && arrayBuffer) {
      // 使用模板生成 Word 文档
      const zip = new PizZip(arrayBuffer)
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      })

      // 准备数据
      const data = {
        reportType: reportType.value === 'daily' ? '日报' : reportType.value === 'weekly' ? '周报' : '月报',
        date: dayjs(selectedDate.value).format('YYYY年MM月DD日'),
        content: reportContent.value,
        generatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      }

      // 渲染文档
      doc.render(data)

      // 生成文件
      const blob = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      // 保存文件
      const fileName = `舆情分析报告_${reportType.value}_${dayjs(selectedDate.value).format('YYYY-MM-DD')}.docx`
      saveAs(blob, fileName)

      message.success('Word 导出成功')
    } else {
      // 如果模板不存在，使用降级方案
      await createSimpleWordDoc()
    }
  } catch (error) {
    console.error('导出 Word 失败:', error)
    // 如果 docxtemplater 失败，尝试创建简单文档
    try {
      await createSimpleWordDoc()
    } catch (e) {
      message.error('导出 Word 失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  } finally {
    exportingWord.value = false
  }
}

/**
 * 创建简单的 Word 文档（降级方案）
 */
async function createSimpleWordDoc() {
  // 创建一个简单的 HTML 文档，然后转换为 Word
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>舆情分析报告</title>
      <style>
        body { font-family: "Microsoft YaHei", Arial, sans-serif; padding: 20px; }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 20px; }
        p { line-height: 1.6; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>舆情分析${reportType.value === 'daily' ? '日报' : reportType.value === 'weekly' ? '周报' : '月报'}</h1>
      <p><strong>日期：</strong>${dayjs(selectedDate.value).format('YYYY年MM月DD日')}</p>
      <p><strong>生成时间：</strong>${dayjs().format('YYYY-MM-DD HH:mm:ss')}</p>
      <hr>
      <div>${renderedContent.value}</div>
    </body>
    </html>
  `

  // 创建 Blob 并下载
  const blob = new Blob([htmlContent], { type: 'application/msword' })
  const fileName = `舆情分析报告_${reportType.value}_${dayjs(selectedDate.value).format('YYYY-MM-DD')}.doc`
  saveAs(blob, fileName)

  message.success('Word 文档已导出（HTML 格式）')
}
</script>

<style scoped>
.report-panel {
  @apply w-full h-full;
}

.report-card {
  @apply bg-gray-900 text-gray-200;
  min-height: 600px;
}

.report-header {
  @apply flex items-center justify-between mb-4 pb-4 border-b border-gray-700;
  flex-wrap: wrap;
  gap: 16px;
}

.report-controls {
  @apply flex items-center;
  flex-wrap: wrap;
  gap: 8px;
}

.export-buttons {
  @apply flex items-center;
}

.generating-tip {
  @apply mb-4 p-4 bg-gray-800 rounded-lg;
}

.progress-text {
  @apply flex items-center mt-2 text-sm text-gray-400;
}

.report-preview {
  @apply mt-4;
  max-height: calc(100vh - 300px);
  overflow-y: auto;
}

/* 自定义滚动条 */
.report-preview::-webkit-scrollbar {
  width: 8px;
}

.report-preview::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.report-preview::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 4px;
}

.report-preview::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.7);
}

.report-content {
  @apply p-6 bg-white text-gray-900 rounded-lg;
  min-height: 400px;
  line-height: 1.8;
}

/* Markdown 样式 */
.report-content :deep(h1) {
  @apply text-3xl font-bold mb-4 mt-6 pb-2 border-b-2 border-gray-300;
}

.report-content :deep(h2) {
  @apply text-2xl font-bold mb-3 mt-5;
}

.report-content :deep(h3) {
  @apply text-xl font-semibold mb-2 mt-4;
}

.report-content :deep(p) {
  @apply mb-3;
}

.report-content :deep(strong) {
  @apply font-bold text-gray-900;
}

.report-content :deep(em) {
  @apply italic;
}

.report-content :deep(code) {
  @apply bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-red-600;
}

.report-content :deep(pre) {
  @apply bg-gray-100 p-4 rounded my-3 overflow-x-auto;
}

.report-content :deep(pre code) {
  @apply bg-transparent p-0 text-gray-800;
}

.report-content :deep(ul),
.report-content :deep(ol) {
  @apply my-3 ml-6;
}

.report-content :deep(li) {
  @apply mb-1;
}

.report-content :deep(a) {
  @apply text-blue-600 hover:text-blue-800 underline;
}

.report-content :deep(hr) {
  @apply my-4 border-gray-300;
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

