# 快速启动指南

## 1. 安装依赖

```bash
cd internet-content-analysis-system
npm install
```

## 2. 启动开发服务器

```bash
npm run dev
```

浏览器会自动打开 http://localhost:3000

## 3. 功能验证

### 数据上传
1. 进入「数据上传」页面
2. 拖拽上传 `网媒数据.xlsx` 或 `微博数据.xlsx`
3. 等待解析完成，数据自动存入 IndexedDB

### 数据大屏
1. 进入「数据大屏」页面
2. 点击「启动模拟实时」按钮
3. 观察右侧实时数据流（每5-15秒推送一条，带NEW徽章）
4. 查看5个图表：
   - 情感趋势折线图
   - 情感分布环形图
   - 关键词词云
   - 热度Top10
   - 数据源占比

### AI对话助手
1. 在底部右侧的AI聊天面板
2. 输入问题：「今天负面舆情有多少条？」
3. 查看AI回复（mock模式返回示例数据）

### 批量分析
1. 在「数据上传」页面
2. 点击「批量分析未分析数据」
3. 等待分析完成（进度条显示）

## 4. 常见问题

### Q: 图表不显示？
A: 确保已安装 echarts 和 vue-echarts，运行 `npm install`

### Q: 上传Excel失败？
A: 检查文件名是否包含"网媒"或"微博"关键字，确保Excel格式正确

### Q: AI对话无响应？
A: 当前为mock模式，返回的是模拟数据。如需真实AI，配置 `.env` 中的 `VITE_AI_API_KEY`

### Q: IndexedDB数据丢失？
A: IndexedDB数据存储在浏览器本地，清除浏览器数据会丢失。建议定期导出数据。

## 5. 项目结构说明

- `src/interfaces/`: TypeScript接口定义
- `src/utils/`: Excel解析工具
- `src/db/`: IndexedDB数据库封装
- `src/ai/`: AI客户端和Prompt
- `src/stores/`: Pinia状态管理
- `src/components/`: Vue组件
- `src/views/`: 页面视图

## 6. 下一步

- 配置真实AI API（修改 `.env`）
- 添加更多图表类型
- 实现数据导出功能
- 添加用户认证
- 优化性能（大数据量处理）

