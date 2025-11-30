import { describe, it, expect } from 'vitest'
import { parseExcelFile } from '@/utils/excelParser'
import * as XLSX from 'xlsx'

describe('parseExcelFile', () => {
  // 创建模拟的File对象
  const createMockFile = (name: string, content: ArrayBuffer): File => {
    return new File([content], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }

  // 创建网媒Excel文件
  const createWebMediaExcel = (data: any[]): ArrayBuffer => {
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  }

  // 创建微博Excel文件
  const createWeiboExcel = (data: any[]): ArrayBuffer => {
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  }

  describe('网媒数据解析', () => {
    it('应该正确解析网媒数据', async () => {
      const webMediaData = [
        {
          title: '测试标题',
          content: '测试内容',
          source: '测试来源',
          publishTime: '2024-01-01 10:00:00',
          url: 'https://example.com',
          author: '测试作者',
          category: '测试分类',
          tags: '标签1,标签2',
          viewCount: 1000,
          likeCount: 100,
          commentCount: 50,
          shareCount: 20,
          region: '北京',
        },
      ]

      const excelContent = createWebMediaExcel(webMediaData)
      const file = createMockFile('网媒数据.xlsx', excelContent)

      const result = await parseExcelFile(file)

      expect(result.webMedia).toHaveLength(1)
      expect(result.weibo).toHaveLength(0)
      expect(result.webMedia[0].title).toBe('测试标题')
      expect(result.webMedia[0].content).toBe('测试内容')
      expect(result.webMedia[0].publishTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) // ISO 8601格式
    })

    it('应该根据title字段识别为网媒类型', async () => {
      const data = [
        {
          title: '标题',
          content: '内容',
          source: '来源',
          publishTime: '2024-01-01',
          url: 'https://example.com',
          author: '作者',
          category: '分类',
          tags: '标签',
          viewCount: 0,
          likeCount: 0,
          commentCount: 0,
          shareCount: 0,
          region: '地区',
        },
      ]

      const excelContent = createWebMediaExcel(data)
      const file = createMockFile('test.xlsx', excelContent)

      const result = await parseExcelFile(file)

      expect(result.webMedia.length).toBeGreaterThan(0)
      expect(result.weibo.length).toBe(0)
    })

    it('缺少必需字段应该抛出错误', async () => {
      const incompleteData = [
        {
          title: '标题',
          // 缺少content字段
          source: '来源',
          publishTime: '2024-01-01',
          url: 'https://example.com',
          author: '作者',
          category: '分类',
          tags: '标签',
          viewCount: 0,
          likeCount: 0,
          commentCount: 0,
          shareCount: 0,
          region: '地区',
        },
      ]

      const excelContent = createWebMediaExcel(incompleteData)
      const file = createMockFile('test.xlsx', excelContent)

      await expect(parseExcelFile(file)).rejects.toThrow('缺少必需字段')
    })

    it('publishTime应该转换为ISO 8601格式', async () => {
      const data = [
        {
          title: '标题',
          content: '内容',
          source: '来源',
          publishTime: '2024-01-01 12:00:00',
          url: 'https://example.com',
          author: '作者',
          category: '分类',
          tags: '标签',
          viewCount: 0,
          likeCount: 0,
          commentCount: 0,
          shareCount: 0,
          region: '地区',
        },
      ]

      const excelContent = createWebMediaExcel(data)
      const file = createMockFile('test.xlsx', excelContent)

      const result = await parseExcelFile(file)

      expect(result.webMedia[0].publishTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('无效的publishTime应该抛出错误', async () => {
      const data = [
        {
          title: '标题',
          content: '内容',
          source: '来源',
          publishTime: '无效日期',
          url: 'https://example.com',
          author: '作者',
          category: '分类',
          tags: '标签',
          viewCount: 0,
          likeCount: 0,
          commentCount: 0,
          shareCount: 0,
          region: '地区',
        },
      ]

      const excelContent = createWebMediaExcel(data)
      const file = createMockFile('test.xlsx', excelContent)

      await expect(parseExcelFile(file)).rejects.toThrow('发布时间格式无效')
    })
  })

  describe('微博数据解析', () => {
    it('应该正确解析微博数据', async () => {
      const weiboData = [
        {
          content: '测试微博内容',
          userName: '测试用户',
          publishTime: '2024-01-01 10:00:00',
          url: 'https://weibo.com',
          repostCount: 10,
          commentCount: 20,
          likeCount: 30,
          device: 'iPhone',
          location: '北京',
          verified: true,
          followers: 1000,
          region: '北京',
        },
      ]

      const excelContent = createWeiboExcel(weiboData)
      const file = createMockFile('微博数据.xlsx', excelContent)

      const result = await parseExcelFile(file)

      expect(result.weibo).toHaveLength(1)
      expect(result.webMedia).toHaveLength(0)
      expect(result.weibo[0].content).toBe('测试微博内容')
      expect(result.weibo[0].userName).toBe('测试用户')
      expect(result.weibo[0].publishTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('应该根据userName字段识别为微博类型', async () => {
      const data = [
        {
          content: '内容',
          userName: '用户名',
          publishTime: '2024-01-01',
          url: 'https://weibo.com',
          repostCount: 0,
          commentCount: 0,
          likeCount: 0,
          device: '设备',
          location: '位置',
          verified: false,
          followers: 0,
          region: '地区',
        },
      ]

      const excelContent = createWeiboExcel(data)
      const file = createMockFile('test.xlsx', excelContent)

      const result = await parseExcelFile(file)

      expect(result.weibo.length).toBeGreaterThan(0)
      expect(result.webMedia.length).toBe(0)
    })

    it('应该支持userId字段映射到userName', async () => {
      const data = [
        {
          content: '内容',
          userId: '用户ID', // 使用userId而不是userName
          publishTime: '2024-01-01',
          url: 'https://weibo.com',
          repostCount: 0,
          commentCount: 0,
          likeCount: 0,
          device: '设备',
          location: '位置',
          verified: false,
          followers: 0,
          region: '地区',
        },
      ]

      const excelContent = createWeiboExcel(data)
      const file = createMockFile('test.xlsx', excelContent)

      const result = await parseExcelFile(file)

      expect(result.weibo[0].userName).toBe('用户ID')
    })

    it('应该正确处理verified字段（字符串）', async () => {
      const data = [
        {
          content: '内容',
          userName: '用户名',
          publishTime: '2024-01-01',
          url: 'https://weibo.com',
          repostCount: 0,
          commentCount: 0,
          likeCount: 0,
          device: '设备',
          location: '位置',
          verified: '是',
          followers: 0,
          region: '地区',
        },
      ]

      const excelContent = createWeiboExcel(data)
      const file = createMockFile('test.xlsx', excelContent)

      const result = await parseExcelFile(file)

      expect(result.weibo[0].verified).toBe(true)
    })

    it('缺少必需字段应该抛出错误', async () => {
      const incompleteData = [
        {
          // 缺少content字段
          userName: '用户名',
          publishTime: '2024-01-01',
          url: 'https://weibo.com',
          repostCount: 0,
          commentCount: 0,
          likeCount: 0,
          device: '设备',
          location: '位置',
          verified: false,
          followers: 0,
          region: '地区',
        },
      ]

      const excelContent = createWeiboExcel(incompleteData)
      const file = createMockFile('test.xlsx', excelContent)

      await expect(parseExcelFile(file)).rejects.toThrow('缺少必需字段')
    })
  })

  describe('混合数据解析', () => {
    it('应该正确分离网媒和微博数据', async () => {
      const workbook = XLSX.utils.book_new()

      // 网媒工作表
      const webMediaData = [
        {
          title: '网媒标题',
          content: '网媒内容',
          source: '来源',
          publishTime: '2024-01-01',
          url: 'https://example.com',
          author: '作者',
          category: '分类',
          tags: '标签',
          viewCount: 0,
          likeCount: 0,
          commentCount: 0,
          shareCount: 0,
          region: '地区',
        },
      ]
      const webMediaSheet = XLSX.utils.json_to_sheet(webMediaData)
      XLSX.utils.book_append_sheet(workbook, webMediaSheet, '网媒')

      // 微博工作表
      const weiboData = [
        {
          content: '微博内容',
          userName: '用户名',
          publishTime: '2024-01-01',
          url: 'https://weibo.com',
          repostCount: 0,
          commentCount: 0,
          likeCount: 0,
          device: '设备',
          location: '位置',
          verified: false,
          followers: 0,
          region: '地区',
        },
      ]
      const weiboSheet = XLSX.utils.json_to_sheet(weiboData)
      XLSX.utils.book_append_sheet(workbook, weiboSheet, '微博')

      const excelContent = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
      const file = createMockFile('混合数据.xlsx', excelContent)

      const result = await parseExcelFile(file)

      expect(result.webMedia).toHaveLength(1)
      expect(result.weibo).toHaveLength(1)
      expect(result.webMedia[0].title).toBe('网媒标题')
      expect(result.weibo[0].content).toBe('微博内容')
    })
  })

  describe('错误处理', () => {
    it('空文件应该抛出错误', async () => {
      const workbook = XLSX.utils.book_new()
      const excelContent = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
      const file = createMockFile('空文件.xlsx', excelContent)

      // 空文件应该不会抛出错误，只是返回空数组
      const result = await parseExcelFile(file)
      expect(result.webMedia).toHaveLength(0)
      expect(result.weibo).toHaveLength(0)
    })

    it('无法识别的数据类型应该抛出错误', async () => {
      const unknownData = [
        {
          unknownField: '未知数据',
        },
      ]

      const excelContent = createWebMediaExcel(unknownData)
      const file = createMockFile('test.xlsx', excelContent)

      await expect(parseExcelFile(file)).rejects.toThrow('无法识别')
    })
  })
})

