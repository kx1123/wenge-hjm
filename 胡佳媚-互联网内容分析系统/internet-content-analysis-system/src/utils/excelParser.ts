import * as XLSX from 'xlsx'
import type { WebMediaData, WeiboData } from '@/interfaces/data'

/**
 * Excel解析进度回调
 */
export interface ParseProgress {
  current: number
  total: number
  message: string
}

/**
 * 解析结果
 */
export interface ParseResult {
  webMedia: WebMediaData[]
  weibo: WeiboData[]
}

/**
 * 解析网媒Excel文件
 */
export async function parseWebMediaExcel(
  file: File,
  onProgress?: (progress: ParseProgress) => void
): Promise<WebMediaData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false })

        onProgress?.({
          current: 0,
          total: jsonData.length,
          message: '开始解析网媒数据...',
        })

        const results: WebMediaData[] = []
        const requiredFields = [
          'title',
          'content',
          'source',
          'publishTime',
          'url',
          'author',
          'category',
          'tags',
          'viewCount',
          'likeCount',
          'commentCount',
          'shareCount',
          'region',
        ]

        jsonData.forEach((row: any, index: number) => {
          // 字段校验
          const missingFields = requiredFields.filter((field) => !(field in row))
          if (missingFields.length > 0) {
            console.warn(`第 ${index + 1} 行缺少字段: ${missingFields.join(', ')}`)
          }

          // 转换publishTime为ISO格式
          let publishTime = row.publishTime
          if (publishTime) {
            try {
              const date = new Date(publishTime)
              if (isNaN(date.getTime())) {
                console.warn(`第 ${index + 1} 行发布时间格式无效: ${publishTime}`)
                publishTime = new Date().toISOString()
              } else {
                publishTime = date.toISOString()
              }
            } catch {
              console.warn(`第 ${index + 1} 行发布时间格式无效: ${publishTime}`)
              publishTime = new Date().toISOString()
            }
          }

          const item: WebMediaData = {
            title: String(row.title || ''),
            content: String(row.content || ''),
            source: String(row.source || ''),
            publishTime: publishTime || new Date().toISOString(),
            url: String(row.url || ''),
            author: String(row.author || ''),
            category: String(row.category || ''),
            tags: String(row.tags || ''),
            viewCount: Number(row.viewCount) || 0,
            likeCount: Number(row.likeCount) || 0,
            commentCount: Number(row.commentCount) || 0,
            shareCount: Number(row.shareCount) || 0,
            region: String(row.region || ''),
          }

          results.push(item)

          onProgress?.({
            current: index + 1,
            total: jsonData.length,
            message: `解析中: ${index + 1}/${jsonData.length}`,
          })
        })

        resolve(results)
      } catch (error) {
        reject(new Error(`解析Excel失败: ${error}`))
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 解析微博Excel文件
 */
export async function parseWeiboExcel(
  file: File,
  onProgress?: (progress: ParseProgress) => void
): Promise<WeiboData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false })

        onProgress?.({
          current: 0,
          total: jsonData.length,
          message: '开始解析微博数据...',
        })

        const results: WeiboData[] = []
        const requiredFields = [
          'content',
          'userName',
          'publishTime',
          'url',
          'repostCount',
          'commentCount',
          'likeCount',
          'device',
          'location',
          'verified',
          'followers',
          'region',
        ]

        jsonData.forEach((row: any, index: number) => {
          // 字段校验
          const missingFields = requiredFields.filter((field) => !(field in row))
          if (missingFields.length > 0) {
            console.warn(`第 ${index + 1} 行缺少字段: ${missingFields.join(', ')}`)
          }

          // 转换publishTime为ISO格式
          let publishTime = row.publishTime
          if (publishTime) {
            try {
              const date = new Date(publishTime)
              if (isNaN(date.getTime())) {
                console.warn(`第 ${index + 1} 行发布时间格式无效: ${publishTime}`)
                publishTime = new Date().toISOString()
              } else {
                publishTime = date.toISOString()
              }
            } catch {
              console.warn(`第 ${index + 1} 行发布时间格式无效: ${publishTime}`)
              publishTime = new Date().toISOString()
            }
          }

          // 处理verified字段（可能是字符串"是"/"否"或布尔值）
          let verified = false
          if (typeof row.verified === 'boolean') {
            verified = row.verified
          } else if (typeof row.verified === 'string') {
            verified = ['是', 'true', '1', 'yes'].includes(row.verified.toLowerCase())
          }

          const item: WeiboData = {
            content: String(row.content || ''),
            userName: String(row.userName || ''),
            publishTime: publishTime || new Date().toISOString(),
            url: String(row.url || ''),
            repostCount: Number(row.repostCount) || 0,
            commentCount: Number(row.commentCount) || 0,
            likeCount: Number(row.likeCount) || 0,
            device: String(row.device || ''),
            location: String(row.location || ''),
            verified,
            followers: Number(row.followers) || 0,
            region: String(row.region || ''),
          }

          results.push(item)

          onProgress?.({
            current: index + 1,
            total: jsonData.length,
            message: `解析中: ${index + 1}/${jsonData.length}`,
          })
        })

        resolve(results)
      } catch (error) {
        reject(new Error(`解析Excel失败: ${error}`))
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 解析Excel文件（自动识别类型）
 * 严格按照竞赛文档 6.5 节数据结构映射
 * 
 * @param file Excel文件
 * @returns 分离的网媒和微博数据数组
 * @throws 如果文件格式错误或缺少必需字段
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        if (workbook.SheetNames.length === 0) {
          throw new Error('Excel 格式错误：缺少表头')
        }

        const webMediaResults: WebMediaData[] = []
        const weiboResults: WeiboData[] = []
        const timestamp = Date.now().toString(36)

        // 遍历所有工作表
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName]

          // 使用 header: 1 获取数组格式
          const arrayData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]

          if (arrayData.length === 0) {
            continue
          }

          // 获取表头（第一行）
          const headers = arrayData[0] as string[]
          if (!headers || headers.length === 0) {
            throw new Error('Excel 格式错误：缺少表头')
          }

          // 表头识别类型
          const hasTitle = headers.includes('标题')
          const hasAccountName = headers.includes('账号名称')
          const mediaChannelIndex = headers.indexOf('媒体渠道')

          // 检查第一行数据以确定媒体渠道
          let isWebMedia = false
          let isWeibo = false

          if (arrayData.length > 1) {
            const firstDataRow = arrayData[1]
            const mediaChannel = firstDataRow[mediaChannelIndex]

            if (hasTitle && mediaChannel === '今日头条') {
              isWebMedia = true
            } else if (hasAccountName && mediaChannel === '微博') {
              isWeibo = true
            }
          }

          // 如果无法识别，尝试通过表头推断
          if (!isWebMedia && !isWeibo) {
            if (hasTitle) {
              isWebMedia = true
            } else if (hasAccountName) {
              isWeibo = true
            } else {
              throw new Error(`无法识别工作表 "${sheetName}" 的数据类型`)
            }
          }

          // 创建字段索引映射
          const fieldIndexMap: Record<string, number> = {}
          headers.forEach((header, index) => {
            fieldIndexMap[header] = index
          })

          // 获取字段值的辅助函数
          const getField = (fieldName: string, row: any[]): string => {
            const index = fieldIndexMap[fieldName]
            return index !== undefined && index < row.length ? String(row[index] || '') : ''
          }

          // 解析数据行（跳过表头）
          for (let i = 1; i < arrayData.length; i++) {
            const row = arrayData[i]

            // 跳过空行
            if (!row || row.every((cell) => !cell)) {
              continue
            }

            if (isWebMedia) {
              // 解析网媒数据
              const title = getField('标题', row)
              const content = getField('正文', row)
              const publishTime = getField('发布时间', row)
              const url = getField('文章链接', row)

              // 必填字段校验
              // if (!title || !content || !publishTime || !url) {
              //   throw new Error(`网媒第${i + 1}行缺少必要字段`)
              // }

              // 转换发布时间为 ISO 8601
              let publishTimeISO: string
              try {
                const date = new Date(publishTime)
                if (isNaN(date.getTime())) {
                  publishTimeISO = new Date().toISOString()
                } else {
                  publishTimeISO = date.toISOString()
                }
              } catch {
                publishTimeISO = new Date().toISOString()
              }

              // 生成ID
              const id = `WM${timestamp}${i.toString(36).padStart(4, '0')}`

              // 字段映射
              const source = getField('站点名称', row) || getField('媒体渠道', row) || ''
              const author = getField('文章作者', row) || ''
              const viewCount = Number(getField('阅读量', row)) || 0
              const shareCount = Number(getField('转发量', row)) || 0

              const item: WebMediaData = {
                id: id as any, // 使用字符串ID
                title,
                content,
                source,
                publishTime: publishTimeISO,
                url,
                author,
                category: '',
                tags: '',
                viewCount,
                likeCount: 0,
                commentCount: 0,
                shareCount,
                region: '',
                // AI字段初始化为undefined
                sentiment: undefined,
                keywords: undefined,
                summary: undefined,
                analyzedAt: undefined,
              }

              webMediaResults.push(item)
            } else if (isWeibo) {
              // 解析微博数据
              const content = getField('正文', row)
              const publishTime = getField('发布时间', row)
              const url = getField('原文链接', row)

              // // 必填字段校验
              // if (!content || !publishTime) {
              //   throw new Error(`微博第${i + 1}行缺少必要字段`)
              // }

              // 转换发布时间为 ISO 8601
              let publishTimeISO: string
              try {
                const date = new Date(publishTime)
                if (isNaN(date.getTime())) {
                  publishTimeISO = new Date().toISOString()
                } else {
                  publishTimeISO = date.toISOString()
                }
              } catch {
                publishTimeISO = new Date().toISOString()
              }

              // 生成ID
              const id = `WB${timestamp}${i.toString(36).padStart(4, '0')}`

              // 从原文链接提取 userId（用于内部处理，不存储）
              // 如果后续需要userId，可以从url中提取
              // const userIdMatch = url.match(/weibo\.com\/(\d+)/)
              // const userId = userIdMatch ? userIdMatch[1] : `user_${i}`

              // 字段映射
              const userName = getField('账号名称', row) || ''
              const likeCount = Number(getField('点赞量', row)) || 0
              const commentCount = Number(getField('评论量', row)) || 0
              const repostCount = Number(getField('转发量', row)) || 0
              const author = getField('文章作者', row) || ''
              const location = getField('ip属地', row) || ''

              // 推导 isVerified
              const isVerified = author.includes('官方') || author.includes('认证')

              // 从正文提取话题标签（可用于后续处理）
              // 如果后续需要topicTags，可以从content中提取
              // const topicTagsMatch = content.match(/#[^#]+#/g)
              // const topicTags = topicTagsMatch ? topicTagsMatch.join(',') : ''

              const item: WeiboData = {
                id: id as any, // 使用字符串ID
                content,
                userName,
                publishTime: publishTimeISO,
                url: url || '',
                repostCount,
                commentCount,
                likeCount,
                device: '',
                location,
                verified: isVerified,
                followers: 0, // 原文无此列
                region: '',
                // AI字段初始化为undefined
                sentiment: undefined,
                keywords: undefined,
                summary: undefined,
                analyzedAt: undefined,
              }

              weiboResults.push(item)
            }
          }
        }

        resolve({
          webMedia: webMediaResults,
          weibo: weiboResults,
        })
      } catch (error) {
        reject(error instanceof Error ? error : new Error(`解析Excel失败: ${error}`))
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}
