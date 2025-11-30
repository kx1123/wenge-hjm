/**
 * 报告生成提示词
 */
export function getReportPrompt(
  type: 'webmedia' | 'weibo',
  stats: {
    total: number
    positive: number
    neutral: number
    negative: number
    topKeywords: string[]
    timeRange: string
  }
): string {
  const dataType = type === 'webmedia' ? '网媒' : '微博'
  return `请基于以下${dataType}数据分析结果，生成一份专业的数据分析报告（500-800字）。

统计数据：
- 总数据量：${stats.total}条
- 正面情感：${stats.positive}条（${((stats.positive / stats.total) * 100).toFixed(1)}%）
- 中性情感：${stats.neutral}条（${((stats.neutral / stats.total) * 100).toFixed(1)}%）
- 负面情感：${stats.negative}条（${((stats.negative / stats.total) * 100).toFixed(1)}%）
- 热门关键词：${stats.topKeywords.join('、')}
- 时间范围：${stats.timeRange}

报告应包含：
1. 数据概览
2. 情感分布分析
3. 关键词热点分析
4. 趋势洞察
5. 建议与展望`
}

