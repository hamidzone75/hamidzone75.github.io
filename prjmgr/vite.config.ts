import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// برای GitHub Pages: اگر ریپوی شما مثلاً my-project است،
// دستور زیر را اجرا کنید:
//   VITE_BASE=/my-project/ npm run build
// یا مقدار base را مستقیماً اینجا تغییر دهید.
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'مدیریت پروژه حرفه‌ای (Light)',
        short_name: 'پروژه من',
        description: 'نرم‌افزار مدیریت پروژه سبک، آفلاین و کاملاً محلی با تقویم شمسی و قمری',
        theme_color: '#0f766e',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        lang: 'fa',
        dir: 'rtl',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        navigateFallback: base === '/' ? '/index.html' : `${base}index.html`,
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          db: ['dexie', 'dexie-react-hooks'],
          utils: ['date-fns', 'jszip', 'uuid', 'clsx']
        }
      }
    }
  }
})
