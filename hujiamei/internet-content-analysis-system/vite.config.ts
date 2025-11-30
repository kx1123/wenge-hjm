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
      '/api/dashscope': {
        target: 'https://dashscope.aliyuncs.com',
        changeOrigin: true,
        rewrite: (path) => '/api/v1/services/aigc/text-generation/generation',
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // 保留原始请求头
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization)
            }
            if (req.headers['content-type']) {
              proxyReq.setHeader('Content-Type', req.headers['content-type'])
            }
            if (req.headers['x-dashscope-sse']) {
              proxyReq.setHeader('X-DashScope-SSE', req.headers['x-dashscope-sse'])
            }
          })
        },
      },
    },
  },
})

