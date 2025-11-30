import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Upload from './views/Upload.vue'
import Dashboard from './views/Dashboard.vue'
import Report from './views/Report.vue'
import DataList from './views/DataList.vue'
import AIAnalysis from './views/AIAnalysis.vue'
import AlertSystem from './views/AlertSystem.vue'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/upload' },
    { path: '/upload', component: Upload },
    { path: '/dashboard', component: Dashboard },
    { path: '/report', component: Report },
    { path: '/data-list', component: DataList },
    { path: '/ai-analysis', component: AIAnalysis },
    { path: '/alert-system', component: AlertSystem },
  ],
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(naive)
app.use(router)

app.mount('#app')

