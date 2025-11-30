# 互联网内容分析系统

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
- **AI集成**: GLM-4-Flash API (支持mock模式)

## 项目结构

```
src/
├── interfaces/          # TypeScript接口定义
│   ├── data.ts         # 网媒/微博数据结构
│   ├── ai.ts           # AI相关接口
│   └── alert.ts        # 预警规则接口
├── utils/              # 工具函数
│   └── excelParser.ts  # Excel解析器
├── db/                 # 数据库封装
│   └── indexedDB.ts    # IndexedDB操作
├── ai/                 # AI客户端
│   ├── client.ts       # AI分析器
│   └── prompts/        # Prompt模板
├── composables/        # 组合式函数
│   └── useRealtimeSimulator.ts  # 实时模拟器
├── stores/             # Pinia状态管理
│   ├── data.ts         # 数据存储
│   └── analysis.ts     # 分析状态
├── components/         # Vue组件
│   ├── FileUpload.vue
│   ├── Dashboard/
│   │   ├── EchartsPanel.vue
│   │   └── AlertPanel.vue
│   └── AIChatPanel.vue
└── views/              # 页面视图
    ├── Upload.vue
    ├── Dashboard.vue
    └── Report.vue
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

访问 http://localhost:3000

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

## 功能特性

### 1. 数据上传
- 支持拖拽上传Excel文件
- 自动识别网媒/微博数据
- 字段校验和进度显示
- 自动转换publishTime为ISO格式

### 2. 数据大屏
- 5+图表可视化：
  - 情感趋势折线图
  - 情感分布环形图
  - 关键词词云（柱状图展示）
  - 热度Top10
  - 数据源占比
- 实时数据流模拟（方案A：5-15秒随机推送）
- 预警规则管理（关键词/情感/热度三类）

### 3. AI分析
- 情感分析（positive/neutral/negative）
- 关键词提取（3-5个）
- 摘要生成（50-100字）
- 批量分析支持
- Mock模式（开发测试）

### 4. AI对话助手
- 自然语言查询（如"今天负面舆情有多少条？"）
- 实时对话交互
- 支持数据统计、趋势分析、洞察建议

### 5. 分析报告
- 按类型生成报告（网媒/微博/全部）
- 时间范围筛选
- 一键复制/下载

## 环境配置

创建 `.env` 文件：

```env
# 阿里通义千问API配置
VITE_AI_MOCK=false
VITE_AI_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
VITE_AI_API_KEY=sk-b48c6eb1c32242af82e89ee7582c66e9
VITE_AI_MODEL=qwen-plus
```

- `VITE_AI_MOCK=false`: 使用真实AI API（阿里通义千问）
- `VITE_AI_API_URL`: 通义千问API端点（已默认配置）
- `VITE_AI_API_KEY`: 通义千问API密钥（已配置）
- `VITE_AI_MODEL`: 模型名称（qwen-plus/qwen-turbo/qwen-max，默认qwen-plus）

## 数据格式

### 网媒数据（13字段）
- title, content, source, publishTime, url, author, category, tags, viewCount, likeCount, commentCount, shareCount, region

### 微博数据（12字段）
- content, userName, publishTime, url, repostCount, commentCount, likeCount, device, location, verified, followers, region

## AI开发说明

本项目使用 Cursor AI 进行开发，相关规则和配置位于 `.cursor/rules.md`。

### AI集成方式

1. **Mock模式**（默认）：
   - 无需API密钥
   - 返回模拟分析结果
   - 适合开发和测试

2. **真实API模式**：
   - 配置 `VITE_AI_API_KEY`
   - 设置 `VITE_AI_MOCK=false`
   - 使用GLM-4-Flash模型

### Prompt工程

所有AI提示词位于 `src/ai/prompts/`：
- `sentiment.ts`: 情感分析
- `keywords.ts`: 关键词提取
- `summary.ts`: 摘要生成
- `chat.ts`: 对话系统
- `report.ts`: 报告生成

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

