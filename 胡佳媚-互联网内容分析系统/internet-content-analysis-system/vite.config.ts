import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'ui-vendor': ['naive-ui'],
          'chart-vendor': ['echarts', 'vue-echarts'],
          'utils-vendor': ['dexie', 'xlsx', 'axios'],
        },
      },
    },
  },
  server: {
    port: 3001,
    open: true,
    proxy: {
      // 代理阿里云通义千问 API
      '/api/ai': {
        target: 'https://dashscope.aliyuncs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, '/api/v1/services/aigc/text-generation/generation'),
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // 保留原始请求头（包括 Authorization）
            // 客户端会在请求中设置 Authorization header
            console.log('代理请求:', req.method, req.url)
          })
          proxy.on('error', (err, _req, _res) => {
            console.error('代理错误:', err)
          })
        },
      },
    },
  },
})

