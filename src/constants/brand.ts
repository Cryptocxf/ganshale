/** Product tagline（顶栏、启动页、页眉右侧等与产品说明统一）。 */
export const PRODUCT_TAGLINE = '一款拯救你于日报、周报、月报水火的工具'

/** 产品展示名（窗口标题、关于页等） */
export const APP_DISPLAY_NAME = '干啥了'

/** 窗口标题栏 / 浏览器标签 */
export const APP_WINDOW_TITLE = APP_DISPLAY_NAME

/** @deprecated 请用 {@link APP_WINDOW_TITLE} */
export const APP_DOCUMENT_TITLE = APP_WINDOW_TITLE

/** Vite `base`（Electron 打包为 `./`，须用相对路径，避免 file:// 下 `/logo.png` 指向磁盘根目录） */
const brandAsset = (file: string) => `${import.meta.env.BASE_URL}${file}`

/** 入场页（`public/ganshale-splash.png`，桌面「入场」图稿） */
export const BRAND_LOGO_SPLASH_SRC = brandAsset('ganshale-splash.png')

/** 应用内 Logo（侧栏、关于、任务栏等，`public/ganshale-logo-app.png`） */
export const BRAND_LOGO_APP_SRC = brandAsset('ganshale-logo-app.png')

/** OpenClaw 应用图标（`public/openclaw-favicon-32.png`） */
export const OPENCLAW_ICON_SRC = brandAsset('openclaw-favicon-32.png')

/** @deprecated 请用 {@link BRAND_LOGO_APP_SRC} 或 {@link BRAND_LOGO_SPLASH_SRC} */
export const BRAND_LOGO_SRC = BRAND_LOGO_APP_SRC

/** 与入场图稿白底一致（启动页铺满背景） */
export const BRAND_LOGO_BG = '#f8fafc'
