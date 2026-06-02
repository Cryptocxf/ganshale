import { readFileSync } from 'node:fs'
import type { IncomingMessage } from 'node:http'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

// https://vite.dev/config/
// Use relative asset paths when built for Electron (file://).
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const llmProxyTarget =
    (env.VITE_LLM_PROXY_TARGET && env.VITE_LLM_PROXY_TARGET.trim()) || 'http://127.0.0.1:15678'

  return {
    base: command === 'build' ? './' : '/',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [react(), tailwindcss()],
    // Align with Electron + wait-on: default "localhost" may bind ::1 only on Windows,
    // so http://127.0.0.1:5173 would never become ready.
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        // 浏览器直连网关常因 CORS 失败（Failed to fetch）；开发时走同源再由 Vite 转发。
        '/__llm': {
          target: llmProxyTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/__llm/, ''),
          // 设置页填写 http://127.0.0.1:15721/... 时由请求头指定真实 upstream
          router: (req: IncomingMessage) => {
            const raw = req.headers['x-llm-upstream']
            const upstream = typeof raw === 'string' ? raw.trim() : ''
            if (upstream && /^https?:\/\//i.test(upstream)) return upstream
            return llmProxyTarget
          },
        },
      },
    },
  }
})
