import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: '長照交通服務平台',
        short_name: '長照交通',
        description: '長照交通服務派車管理系統',
        theme_color: '#1e293b',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: 'icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: {
        // 靜態資源：Cache First（安裝後從快取取）
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff}'],
        // API 路由：Network First，失敗後回傳快取
        runtimeCaching: [
          {
            urlPattern: /^\/api\/bookings/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-bookings',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60  // 24 小時
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^\/api\/auth\/me/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-auth',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 5, maxAgeSeconds: 8 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,  // 開發模式也啟用 SW（方便測試）
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
