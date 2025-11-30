import axios from 'axios'
import { db } from '@/db/indexedDB'
import type { WebMediaData, WeiboData } from '@/interfaces/data'

// 统一的数据类型
type SentimentData = WebMediaData | WeiboData

/**
 * AI 预警顾问
 * 用于分析预警原因和生成建议
 */
export class AlertAdvisor {
  private apiKey: string
  private apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
  private model = 'qwen-turbo'
  private mock: boolean

  constructor() {
    this.apiKey = import.meta.env.VITE_QWEN_API_KEY || 'sk-b48c6eb1c32242af82e89ee7582c66e9'
    this.mock = import.meta.env.VITE_AI_MOCK === 'true'
  }

  /**
   * 调用通义千问 API
   */
  private async callAPI(prompt: string, maxRetries: number = 2): Promise<string> {
    if (this.mock) {
      // Mock 模式：返回模拟结果
      return JSON.stringify({
        cause: '模拟分析：用户表达强烈挫败感',
        advice: [
          '客服团队准备话术：致歉+补货预告',
          '公关部发布说明：公平抢购机制优化',
          '产品侧评估：增加库存/分批释放',
        ],
      })
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(
          this.apiUrl,
          {
            model: this.model,
            input: {
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: prompt,
                    },
                  ],
                },
              ],
            },
            parameters: {
              result_format: 'message',
              temperature: 0.7,
              max_tokens: 2000,
            },
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        )

        const content = response.data?.output?.choices?.[0]?.message?.content
        if (content) {
          return content
        }

        return response.data.choices?.[0]?.message?.content || response.data.output?.text || ''
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const status = error.response?.status

        if ((status === 429 || status === 500) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000
          console.warn(`API调用失败，${delay}ms后重试 (${attempt + 1}/${maxRetries})...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        throw lastError
      }
    }

    throw lastError || new Error('API调用失败')
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(dataSamples: SentimentData[]): string {
    const ids = dataSamples.map((d) => String(d.id || '')).join(',')
    // 简单的 hash 函数
    let hash = 0
    for (let i = 0; i < ids.length; i++) {
      const char = ids.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return `alert_advice_${Math.abs(hash).toString(36)}`
  }

  /**
   * 从缓存获取
   */
  private async getFromCache(cacheKey: string): Promise<{ cause: string; advice: string[] } | null> {
    try {
      const cached = await db.aiCache.where('cacheKey').equals(cacheKey).first()
      if (!cached) return null

      // 检查是否过期（24小时）
      const now = new Date()
      const createdAt = new Date(cached.createdAt)
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      if (hoursDiff > 24) {
        const cacheId = typeof cached.id === 'number' ? cached.id : (typeof cached.id === 'string' ? parseInt(cached.id, 10) : null)
        if (cacheId !== null && !isNaN(cacheId)) {
          await db.aiCache.delete(cacheId)
        }
        return null
      }

      const result = JSON.parse(cached.result)
      return {
        cause: result.cause || '',
        advice: Array.isArray(result.advice) ? result.advice : [],
      }
    } catch (error) {
      console.error('读取缓存失败:', error)
      return null
    }
  }

  /**
   * 保存到缓存
   */
  private async saveToCache(
    cacheKey: string,
    result: { cause: string; advice: string[] }
  ): Promise<void> {
    try {
      await db.aiCache.put({
        cacheKey,
        dataType: 'webmedia', // 预警分析不区分数据类型
        promptType: 'full',
        promptVersion: 'v1',
        result: JSON.stringify(result),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
    } catch (error) {
      console.error('保存缓存失败:', error)
    }
  }

  /**
   * 从响应中提取 JSON
   */
  private extractJSON(response: string): any {
    // 清理响应文本
    let cleaned = response.trim()

    // 移除 markdown 代码块标记
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    // 尝试提取 JSON 对象
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        // 如果解析失败，继续尝试整个文本
      }
    }

    // 尝试解析整个文本
    try {
      return JSON.parse(cleaned)
    } catch {
      // 如果还是失败，返回原始文本
      return cleaned
    }
  }

  /**
   * 格式化数据样本为提示文本
   */
  private formatDataSamples(dataSamples: SentimentData[]): string {
    return dataSamples
      .slice(0, 10) // 最多10条
      .map((data, index) => {
        if ('title' in data) {
          // 网媒数据
          return `${index + 1}. [网媒] 标题：${data.title}；内容：${data.content.substring(0, 200)}${data.content.length > 200 ? '...' : ''}`
        } else {
          // 微博数据
          return `${index + 1}. [微博] 用户：${data.userName}；内容：${data.content.substring(0, 200)}${data.content.length > 200 ? '...' : ''}`
        }
      })
      .join('\n')
  }

  /**
   * 加载提示模板
   */
  private async loadPromptTemplate(): Promise<string> {
    try {
      // 尝试从文件加载（如果支持）
      // 这里直接返回模板内容
      return `你是一名舆情危机公关专家，请基于以下舆情样本分析：

【样本】（最多10条）
{dataSamples}

【任务】输出 JSON：
{
  "cause": "20字内根因",
  "advice": ["建议1", "建议2", "建议3"]
}

【要求】
- cause 聚焦：用户痛点 / 传播路径 / 情绪引爆点
- advice 可执行：客服 / 公关 / 产品 / 运营 各1条
- 示例：
  cause: "限量商品秒罄引发用户强烈挫败感"
  advice: [
    "客服团队准备话术：致歉+补货预告",
    "公关部发布说明：公平抢购机制优化",
    "产品侧评估：增加库存/分批释放"
  ]

【输出格式】
仅输出 JSON，不要包含其他文字或说明。`
    } catch (error) {
      console.error('加载提示模板失败:', error)
      // 返回默认模板
      return `分析以下舆情样本，输出 JSON 格式：{ "cause": "原因", "advice": ["建议1", "建议2", "建议3"] }`
    }
  }

  /**
   * 分析原因和建议
   * @param dataSamples 舆情数据样本（最多10条）
   * @param context 上下文信息（可选）
   */
  async analyzeCauseAndAdvice(
    dataSamples: SentimentData[],
    context?: string
  ): Promise<{ cause: string; advice: string[] }> {
    if (dataSamples.length === 0) {
      return {
        cause: '无数据样本',
        advice: ['建议收集更多数据进行分析'],
      }
    }

    // 生成缓存键
    const cacheKey = this.generateCacheKey(dataSamples)

    // 1. 尝试从缓存获取
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    try {
      // 2. 加载提示模板
      const template = await this.loadPromptTemplate()

      // 3. 格式化数据样本
      const formattedSamples = this.formatDataSamples(dataSamples)

      // 4. 构建完整提示
      let prompt = template.replace('{dataSamples}', formattedSamples)
      if (context) {
        prompt += `\n\n【上下文】${context}`
      }

      // 5. 调用 API
      const response = await this.callAPI(prompt)

      // 6. 解析响应
      const parsed = this.extractJSON(response)

      let result: { cause: string; advice: string[] }

      if (typeof parsed === 'object' && parsed !== null && 'cause' in parsed) {
        result = {
          cause: String(parsed.cause || '需要进一步分析'),
          advice: Array.isArray(parsed.advice)
            ? parsed.advice.slice(0, 4).map(String) // 最多4条建议
            : ['建议及时关注舆情动态'],
        }
      } else {
        // 解析失败，使用降级方案
        result = {
          cause: '分析失败，请手动检查',
          advice: ['建议及时关注舆情动态', '建议加强监控'],
        }
      }

      // 7. 保存到缓存
      await this.saveToCache(cacheKey, result)

      return result
    } catch (error) {
      console.error('AI 分析失败:', error)
      // 降级方案
      return {
        cause: '分析失败，请手动检查',
        advice: ['建议及时关注舆情动态', '建议加强监控'],
      }
    }
  }

  /**
   * 兼容旧接口：分析预警原因
   * @deprecated 使用 analyzeCauseAndAdvice 代替
   */
  async analyzeCause(
    alertData: SentimentData[],
    ruleType: 'keyword' | 'sentiment' | 'volume' | 'spread',
    level: 'critical' | 'warning' | 'info'
  ): Promise<string> {
    const result = await this.analyzeCauseAndAdvice(alertData, `规则类型：${ruleType}，级别：${level}`)
    return result.cause
  }

  /**
   * 兼容旧接口：生成预警建议
   * @deprecated 使用 analyzeCauseAndAdvice 代替
   */
  async generateAdvice(
    alertData: SentimentData[],
    ruleType: 'keyword' | 'sentiment' | 'volume' | 'spread',
    level: 'critical' | 'warning' | 'info',
    cause?: string
  ): Promise<string[]> {
    const result = await this.analyzeCauseAndAdvice(alertData, `规则类型：${ruleType}，级别：${level}${cause ? `，原因：${cause}` : ''}`)
    return result.advice
  }

  /**
   * 兼容旧接口：综合分析
   * @deprecated 使用 analyzeCauseAndAdvice 代替
   */
  async analyze(
    alertData: SentimentData[],
    ruleType: 'keyword' | 'sentiment' | 'volume' | 'spread',
    level: 'critical' | 'warning' | 'info'
  ): Promise<{ cause: string; advice: string[]; confidence: number }> {
    const result = await this.analyzeCauseAndAdvice(alertData, `规则类型：${ruleType}，级别：${level}`)
    return {
      ...result,
      confidence: 0.8, // 默认置信度
    }
  }
}

/**
 * 创建预警顾问实例
 */
export function createAlertAdvisor(): AlertAdvisor {
  return new AlertAdvisor()
}
