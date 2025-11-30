# 前端AI竞赛项目开发规则

## 全局规范

### 代码风格
- **缩进**: 2空格
- **引号**: 单引号
- **尾逗号**: ES5风格（对象/数组最后一个元素后加逗号）
- **分号**: 不使用分号
- **行宽**: 100字符

### TypeScript规范
- **严格模式**: 启用所有strict检查
- **类型定义**: 所有函数、变量必须显式类型
- **接口优先**: 优先使用interface而非type（除非需要联合类型）
- **禁止any**: 除非必要，避免使用any，使用unknown替代

### Vue 3规范
- **Composition API**: 统一使用 `<script setup lang="ts">`
- **响应式**: 优先使用 `ref`，复杂对象使用 `reactive`
- **Props**: 使用 `defineProps<T>()` 或 `withDefaults(defineProps<T>(), {})`
- **Emits**: 使用 `defineEmits<T>()`
- **组件命名**: PascalCase，文件名与组件名一致

### 文件组织
- **目录结构**: 严格按竞赛要求组织
- **导入顺序**: 
  1. Vue相关
  2. 第三方库
  3. 类型定义
  4. 工具函数
  5. 组件
  6. 样式

## 数据结构规范

### 网媒数据（WebMediaData）
严格对齐 `网媒.xlsx`，共13字段：
```typescript
interface WebMediaData {
  id?: number
  title: string              // 标题
  content: string            // 内容
  source: string            // 来源
  publishTime: string       // ISO 8601格式
  url: string               // 链接
  author: string            // 作者
  category: string          // 分类
  tags: string             // 标签（逗号分隔）
  viewCount: number        // 浏览量
  likeCount: number        // 点赞数
  commentCount: number     // 评论数
  shareCount: number       // 分享数
  region: string           // 地区
  // AI分析字段（可选）
  sentiment?: 'positive' | 'neutral' | 'negative'
  keywords?: string[]
  summary?: string
  analyzedAt?: string
}
```

### 微博数据（WeiboData）
严格对齐 `微博.xlsx`，共12字段：
```typescript
interface WeiboData {
  id?: number
  content: string           // 内容
  userName: string          // 用户名
  publishTime: string    // ISO 8601格式
  url: string              // 链接
  repostCount: number      // 转发数
  commentCount: number     // 评论数
  likeCount: number        // 点赞数
  device: string           // 设备
  location: string         // 位置
  verified: boolean        // 是否认证
  followers: number        // 粉丝数
  region: string           // 地区
  // AI分析字段（可选）
  sentiment?: 'positive' | 'neutral' | 'negative'
  keywords?: string[]
  summary?: string
  analyzedAt?: string
}
```

## AI集成规范

### AI客户端配置
```typescript
createAIAnalyzer({
  mock: true,              // 默认启用mock
  apiUrl: string,          // API地址
  apiKey: string,          // API密钥
  model: 'glm-4-flash'     // 模型名称
})
```

### Mock模式
- 模拟延迟：500-1500ms
- 随机返回情感（positive/neutral/negative）
- 简单关键词提取
- 默认摘要生成

### 真实API模式
- 使用GLM-4-Flash模型
- 错误处理：失败时回退到默认值
- 响应解析：支持JSON和文本格式

### Prompt规范
所有Prompt文件位于 `src/ai/prompts/`：
1. **sentiment.ts**: 情感分析（区分网媒/微博）
2. **keywords.ts**: 关键词提取（返回JSON数组）
3. **summary.ts**: 摘要生成（网媒50-100字，微博30-50字）
4. **chat.ts**: 对话系统提示词
5. **report.ts**: 报告生成提示词

### 缓存策略
- 分析结果存入IndexedDB
- 避免重复分析相同内容
- 支持增量更新

## 实时方案A（模拟实时）

### 实现逻辑
```typescript
useRealtimeSimulator()
```

### 特性
- 每5-15秒随机推送一条未分析数据
- 自动标记为NEW（3秒后移除）
- 触发高亮动画
- 自动执行AI分析
- 更新数据库

### 数据流
1. 从IndexedDB获取随机未分析数据
2. 创建SimulatedDataItem（isNew=true）
3. 添加到simulatedData列表
4. 执行AI分析
5. 更新数据库
6. 3秒后移除NEW标记

## 数据库规范

### IndexedDB表结构
- **webmedia表**: 
  - 索引：publishTime, sentiment, source, keywords
- **weibos表**:
  - 索引：publishTime, sentiment, userName, keywords

### 操作规范
- 批量操作使用 `bulkAdd`
- 查询使用索引优化
- 分页查询支持
- 时间范围查询使用 `between`

## 组件规范

### 图表组件（EchartsPanel）
必须包含5+图表：
1. 趋势折线图（最近7天情感分布）
2. 情感环形图（正面/中性/负面占比）
3. 关键词词云（柱状图展示Top20）
4. 热度Top10（综合热度排序）
5. 数据源占比（网媒vs微博）

### 预警面板（AlertPanel）
三类预警规则：
1. **关键词预警**: 关键词列表匹配
2. **情感预警**: 负面/中性情感阈值+时间窗口
3. **热度预警**: 数据量阈值+时间窗口

### 文件上传（FileUpload）
- 支持拖拽上传
- 文件名校验（包含"网媒"或"微博"）
- 进度显示
- 字段校验
- publishTime自动转换ISO格式

## 工程硬性要求

### TypeScript
- ✅ strict: true
- ✅ noUnusedLocals: true
- ✅ noUnusedParameters: true
- ✅ noFallthroughCasesInSwitch: true

### 性能
- ✅ 首屏加载 < 3秒
- ✅ 代码分割（chunkSizeWarningLimit: 2000）
- ✅ 预加载关键资源

### 测试
- ✅ 测试覆盖率 ≥ 60%（目标）

### 无障碍
- ✅ ARIA标签支持
- ✅ 键盘导航
- ✅ 屏幕阅读器友好

## 12项任务指令模板

### 1. 数据上传功能
```
实现FileUpload组件，支持拖拽上传Excel，自动识别网媒/微博，字段校验，进度显示
```

### 2. Excel解析
```
实现excelParser.ts，使用SheetJS解析，支持publishTime ISO转换，字段校验
```

### 3. IndexedDB封装
```
实现indexedDB.ts，使用Dexie.js，建表webmedia/weibos，索引publishTime/sentiment/source/userName
```

### 4. AI客户端
```
实现ai/client.ts，createAIAnalyzer({ mock: true })，支持analyzeSentiment/extractKeywords/generateSummary
```

### 5. Prompt工程
```
创建ai/prompts/目录，实现5个Prompt文件（sentiment/keywords/summary/chat/report），区分网媒vs微博
```

### 6. 实时模拟器
```
实现useRealtimeSimulator.ts，方案A：getRandomUnanalyzed + NEW徽章 + 高亮动画，5-15秒随机推送
```

### 7. Pinia状态管理
```
实现stores/data.ts和analysis.ts，存储原始数据+状态，批量分析状态（running/completed/error）
```

### 8. 图表面板
```
实现Dashboard/EchartsPanel.vue，5+图表：趋势折线、情感环形、热词词云、热度Top10、数据源占比
```

### 9. 预警面板
```
实现Dashboard/AlertPanel.vue，三类预警规则（keyword/sentiment/volume），预警记录管理
```

### 10. AI对话助手
```
实现AIChatPanel.vue，支持自然语言查询（"今天负面多少条？"），实时对话交互
```

### 11. 视图页面
```
实现Upload.vue、Dashboard.vue、Report.vue，三栏布局（上传区+大屏+聊天助手）
```

### 12. 项目配置
```
配置ESLint+Prettier（2空格、单引号、尾逗号），vite.config.ts（chunkSizeWarningLimit），.env（VITE_AI_MOCK）
```

## 开发流程

1. **需求分析**: 明确功能点和技术要求
2. **接口设计**: 定义TypeScript接口
3. **组件拆分**: 按功能模块拆分组件
4. **状态管理**: 设计Pinia store结构
5. **AI集成**: 实现AI客户端和Prompt
6. **数据持久化**: 实现IndexedDB操作
7. **UI实现**: 使用Naive UI + TailwindCSS
8. **测试验证**: 功能测试和性能优化
9. **文档完善**: 更新README和注释

## 注意事项

1. **数据格式**: 严格对齐Excel字段，publishTime必须ISO格式
2. **错误处理**: 所有异步操作必须有try-catch
3. **用户体验**: 加载状态、错误提示、成功反馈
4. **性能优化**: 大数据量使用分页，避免阻塞UI
5. **代码复用**: 提取公共逻辑到composables/utils
6. **类型安全**: 避免使用any，充分利用TypeScript类型系统

## 竞赛提交检查清单

- [ ] 项目结构符合要求
- [ ] 所有接口定义完整
- [ ] Excel解析功能正常
- [ ] IndexedDB操作正常
- [ ] AI分析功能正常（mock模式）
- [ ] 实时模拟器正常工作
- [ ] 5+图表正常显示
- [ ] 预警规则功能完整
- [ ] AI对话助手可用
- [ ] 代码通过ESLint检查
- [ ] TypeScript无错误
- [ ] README.md完整
- [ ] .cursor/rules.md存在

