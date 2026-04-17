import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'

// Bootstrap CSS + JS
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// PWA Service Worker 註冊
import { registerSW } from 'virtual:pwa-register'
registerSW({
  onNeedRefresh() {
    // 有新版本時靜默更新（autoUpdate 模式已自動處理）
  },
  onOfflineReady() {
    console.log('[PWA] 離線模式已就緒')
  }
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
