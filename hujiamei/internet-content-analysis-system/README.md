# 互联网内容分析系统
github地址: https://github.com/kx1123/wenge-hjm/tree/main/hujiamei/internet-content-analysis-system

基于 Vue 3 + Vite + TypeScript + Pinia + TailwindCSS + Naive UI 的前端AI竞赛项目。

## 项目简介

本系统是一个完整的互联网内容分析平台，支持网媒和微博数据的导入、分析、可视化和预警功能。

## 技术栈

- **框架**: Vue 3 (Composition API)
- **构建工具**: Vite 5
- **语言**: TypeScript (strict mode)
- **状态管理**: Pinia
- **UI框架**: Naive UI
- **样式**: TailwindCSS
- **图表**: ECharts
- **数据库**: IndexedDB (Dexie.js)
- **Excel解析**: SheetJS (xlsx)
- **AI集成**: 阿里通义千问 (Qwen-turbo) API (支持mock模式)
- **PDF导出**: jsPDF + html2canvas

## 项目结构

```
internet-content-analysis-system/
├── src/
│   ├── main.ts                    # 应用入口文件
│   ├── App.vue                    # 根组件
│   ├── style.css                  # 全局样式
│   ├── vite-env.d.ts              # Vite 类型声明
│   │
│   ├── interfaces/                # TypeScript 接口定义
│   │   ├── data.ts                # 网媒/微博数据结构接口
│   │   ├── ai.ts                  # AI 分析结果接口
│   │   └── alert.ts               # 预警规则和事件接口
│   │
│   ├── utils/                      # 工具函数
│   │   ├── excelParser.ts          # Excel 文件解析器
│   │   ├── keywordAnalysis.ts     # 关键词分析工具
│   │   └── topicClustering.ts     # 话题聚类工具
│   │
│   ├── db/                         # 数据库封装
│   │   └── indexedDB.ts           # IndexedDB 操作（Dexie.js）
│   │
│   ├── ai/                         # AI 客户端
│   │   ├── client.ts              # AI 分析器（通义千问）
│   │   └── prompts/               # Prompt 模板
│   │       ├── sentiment.ts       # 情感分析提示词
│   │       ├── keywords.ts        # 关键词提取提示词
│   │       ├── summary.ts         # 摘要生成提示词
│   │       ├── category.ts        # 分类提示词
│   │       ├── topic.ts           # 话题识别提示词
│   │       ├── chat.ts            # 对话系统提示词
│   │       └── report.ts         # 报告生成提示词
│   │
│   ├── composables/                # 组合式函数
│   │   └── useRealtimeSimulator.ts  # 实时数据模拟器
│   │
│   ├── stores/                     # Pinia 状态管理
│   │   ├── data.ts                # 数据存储 Store
│   │   └── analysis.ts            # 分析状态 Store
│   │
│   ├── components/                 # Vue 组件
│   │   ├── FileUpload.vue         # 文件上传组件
│   │   ├── AIChatPanel.vue        # AI 对话面板
│   │   ├── Dashboard/             # 数据大屏组件
│   │   │   ├── KeyMetrics.vue     # 关键指标卡片
│   │   │   ├── EchartsPanel.vue   # ECharts 图表面板
│   │   │   ├── AlertPanel.vue     # 预警面板
│   │   │   └── RealtimeDashboard.vue  # 实时大屏组件
│   │   ├── Alert/                 # 预警相关组件（已删除）
│   │   └── ui/                    # 通用 UI 组件（已删除）
│   │
│   ├── views/                      # 页面视图
│   │   ├── Upload.vue             # 数据上传页面
│   │   ├── Dashboard.vue          # 数据大屏页面
│   │   ├── DataList.vue           # 数据列表页面
│   │   └── Report.vue             # 分析报告页面
│   │
│   ├── features/                   # 功能模块
│   │   └── report/                # 报告生成功能（已删除）
│   │
│   ├── services/                   # 服务层（已删除）
│   │
│   └── assets/                     # 静态资源
│
├── public/                         # 公共静态文件
├── .env                            # 环境变量配置
├── package.json                    # 项目依赖配置
├── vite.config.ts                  # Vite 构建配置
├── tsconfig.json                   # TypeScript 配置
├── tailwind.config.js              # TailwindCSS 配置
├── postcss.config.js               # PostCSS 配置
└── README.md                       # 项目说明文档
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3001（端口在 `vite.config.ts` 中配置）

### 代理配置（解决 CORS 问题）

项目已配置本地代理来解决 CORS 问题：

- **开发环境**：自动使用代理 `/api/ai` 转发到阿里云 API
- **Mock 模式**：默认启用，无需配置 API Key（设置 `VITE_AI_MOCK=true`）
- **真实 API 模式**：设置 `VITE_AI_MOCK=false`，代理会自动转发请求

代理配置在 `vite.config.ts` 中，会自动处理 CORS 问题。

### 路由说明

- `/` - 自动重定向到 `/upload`
- `/upload` - 数据上传页面
- `/dashboard` - 数据大屏页面
- `/data-list` - 数据列表页面
- `/report` - 分析报告页面

### 构建生产版本

```bash
npm run build
```

### 代码检查

```bash
npm run lint
```

### 代码格式化

```bash
npm run format
```

### 运行测试

```bash
npm test
```

## 功能特性

### 1. 数据上传 (`/upload`)
- ✅ 支持拖拽上传 Excel 文件（.xlsx / .xls）
- ✅ 自动识别网媒/微博数据类型
- ✅ 字段校验和进度显示
- ✅ 自动转换 `publishTime` 为 ISO 8601 格式
- ✅ 数据导入到 IndexedDB
- ✅ 多文件同时上传（最多 2 个：网媒 + 微博）

### 2. 数据大屏 (`/dashboard`)
- ✅ 关键指标卡片（总数、网媒、微博、情感分布）
- ✅ 5+ 图表可视化：
  - 情感趋势折线图（双轴对比）
  - 情感分布环形图（网媒/微博对比）
  - 关键词对比（柱状图）
  - 热门报道 Top10
  - 数据源占比饼图
  - 媒体/用户分布图
- ✅ 实时数据流模拟（5-15 秒随机推送）
- ✅ 预警面板（关键词/情感/热度三类规则）

### 3. 数据列表 (`/data-list`)
- ✅ 列表/卡片/时间线三种展示模式
- ✅ 分页/虚拟滚动支持
- ✅ 数据源切换（网媒/微博/全部）
- ✅ 搜索、筛选、排序功能
- ✅ 区分数据源类型显示

### 4. AI 分析功能
- ✅ 情感分析（positive/neutral/negative + 置信度）
- ✅ 关键词提取（带权重）
- ✅ 摘要生成（自定义长度）
- ✅ 话题分类和事件关联
- ✅ 批量分析支持
- ✅ Mock 模式（开发测试）

### 5. AI 对话助手
- ✅ 自然语言查询（如"今天负面舆情有多少条？"）
- ✅ 实时对话交互
- ✅ 支持数据统计、趋势分析、洞察建议
- ✅ 意图识别和结构化查询

### 6. 分析报告 (`/report`)
- ✅ 按类型生成报告（网媒/微博/全部）
- ✅ 时间范围筛选
- ✅ Markdown 格式渲染
- ✅ 一键复制/下载（PDF 格式）

## 环境配置

创建 `.env` 文件（可选）：

```env
# 阿里通义千问 API 配置
VITE_QWEN_API_KEY=sk-b48c6eb1c32242af82e89ee7582c66e9
VITE_AI_MOCK=false
```

- `VITE_QWEN_API_KEY`: 通义千问 API 密钥（已预置，可选）
- `VITE_AI_MOCK`: 是否使用 Mock 模式（`true`/`false`，默认 `false`）

**注意**：
- 如果未配置 `VITE_QWEN_API_KEY` 或 `VITE_AI_MOCK=true`，系统将使用 Mock 模式
- Mock 模式返回模拟分析结果，无需 API 调用
- 真实 API 模式使用通义千问 `qwen-turbo` 模型

## 数据格式

### 网媒数据（13字段）
- title, content, source, publishTime, url, author, category, tags, viewCount, likeCount, commentCount, shareCount, region

### 微博数据（12字段）
- content, userName, publishTime, url, repostCount, commentCount, likeCount, device, location, verified, followers, region

## AI开发说明

本项目使用 Cursor AI 进行开发，相关规则和配置位于 `.cursor/rules.md`。

### AI 集成方式

1. **Mock 模式**（默认）：
   - 无需 API 密钥
   - 返回模拟分析结果
   - 网媒数据：中性情感为主
   - 微博数据：两极情感分布
   - 适合开发和测试

2. **真实 API 模式**：
   - 配置 `VITE_QWEN_API_KEY`
   - 设置 `VITE_AI_MOCK=false`
   - 使用通义千问 `qwen-turbo` 模型
   - 支持缓存机制（24 小时过期）

### Prompt 工程

所有 AI 提示词位于 `src/ai/prompts/`：
- `sentiment.ts`: 情感分析提示词
- `keywords.ts`: 关键词提取提示词
- `summary.ts`: 摘要生成提示词
- `category.ts`: 分类提示词
- `topic.ts`: 话题识别提示词
- `chat.ts`: 对话系统提示词
- `report.ts`: 报告生成提示词

## 工程要求

- ✅ TypeScript strict mode
- ✅ ESLint + Prettier（2空格、单引号、尾逗号）
- ✅ 首屏加载 < 3秒
- ✅ 响应式设计
- ✅ 深色主题支持
- ✅ ARIA无障碍支持

## 浏览器支持

- Chrome/Edge (推荐)
- Firefox
- Safari

需要支持 IndexedDB 和 ES2020+ 特性。

## 许可证

MIT

