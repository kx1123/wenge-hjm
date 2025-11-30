import { createAIAnalyzer } from './client'
import type { AlertRecord } from '@/interfaces/alert'

/**
 * AI预警顾问
 */
export class AlertAdvisor {
  private analyzer = createAIAnalyzer()

  /**
   * 分析预警原因和建议
   */
  async analyzeCauseAndAdvice(alert: AlertRecord, dataSamples: any[]): Promise<{
    cause: string
    advice: string[]
  }> {
    try {
      const prompt = this.buildPrompt(alert, dataSamples)
      const response = await this.analyzer.chat([{
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString(),
      }])

      // 解析JSON响应
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          cause: parsed.cause || '需要进一步分析',
          advice: Array.isArray(parsed.advice) ? parsed.advice : [parsed.advice || '暂无建议'],
        }
      }

      // 降级处理
      return {
        cause: 'AI分析中，请稍后查看',
        advice: ['1. 持续关注舆情动态', '2. 及时响应负面舆情', '3. 加强正面宣传'],
      }
    } catch (error) {
      console.error('AI预警分析失败:', error)
      return {
        cause: '分析失败，请稍后重试',
        advice: ['1. 检查数据源', '2. 联系技术支持'],
      }
    }
  }

  /**
   * 构建提示词
   */
  private buildPrompt(alert: AlertRecord, dataSamples: any[]): string {
    return `你是一名舆情危机公关专家，请基于以下预警信息分析：

【预警信息】
- 类型：${alert.ruleType}
- 级别：${alert.severity}
- 消息：${alert.message}
- 时间：${alert.createdAt}

【数据样本】（最多10条）
${dataSamples.slice(0, 10).map((d, i) => {
  if (d.title) {
    return `${i + 1}. [网媒] 标题：${d.title}；内容：${d.content?.substring(0, 100)}...`
  } else {
    return `${i + 1}. [微博] 用户：${d.userName}；内容：${d.content?.substring(0, 100)}...`
  }
}).join('\n')}

【任务】输出JSON：
{
  "cause": "20字内根因",
  "advice": ["建议1", "建议2", "建议3"]
}

【要求】
- cause 聚焦：用户痛点 / 传播路径 / 情绪引爆点
- advice 可执行：客服 / 公关 / 产品 / 运营 各1条
- 仅输出JSON，不要包含任何其他文字`
  }
}

/**
 * 创建预警顾问实例
 */
export function createAlertAdvisor(): AlertAdvisor {
  return new AlertAdvisor()
}

