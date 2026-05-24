# 干啥了（Ganshale）

一款拯救你于日报、周报、月报水火的 **Windows 桌面工具**。自动记录前台窗口使用情况，整理成工作记录，并借助大模型生成日报、周报。

> 产品标语：一款拯救你于日报、周报、月报水火的工具

## 功能概览

| 模块 | 说明 |
|------|------|
| **每日** | 时间分布、应用时长、分类分布、窗口记录、今日工作记录 |
| **工作记录** | 手动记录 + 系统记录；支持 AI 按间隔自动总结窗口活动 |
| **日报 / 周报** | 基于工作记录与提示词，调用 OpenAI 兼容网关流式生成 |
| **每周 / 每月 / 每年** | 按时间范围汇总窗口活跃时长与应用排行 |
| **数据** | ActivityWatch 风格桶与事件；JSON 导入 / 导出 |
| **设置** | 模型网关、提示词（自动总结 / 日报 / 周报）、关于 |

## 技术栈

- **前端**：React 19 + TypeScript + Vite 8 + Tailwind CSS 4
- **桌面端**：Electron 34（Windows）
- **采集**：`active-win` 轮询前台窗口，本地 IndexedDB 存储
- **大模型**：OpenAI 兼容 `chat/completions`（含流式）

## 环境要求

- Windows 10/11（桌面完整功能）
- Node.js 18+（推荐 20+）
- 使用 AI 功能时需可访问的 **OpenAI 兼容网关** 及有效 API Key

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式（Electron + Vite）

```bash
npm run dev
```

浏览器仅预览 UI（无窗口采集）：

```bash
npm run dev:web
```

### 生产构建

```bash
npm run build
```

### 打包 Windows 便携版

```bash
npm run pack
```

产物位于 `release/` 目录。

### 其他脚本

| 命令 | 说明 |
|------|------|
| `npm run lint` | ESLint 检查 |
| `npm run preview` | 预览构建结果 |
| `npm run gen:dashboard` | 根据脚本重新生成日看板组件 |

## 配置说明

### 模型网关

打开应用内 **设置 → 模型配置**：

1. 从 **供应商** 下拉选择 OpenAI、DeepSeek、Moonshot、智谱、百炼、SiliconFlow、OpenRouter、Groq、Ollama 等（或「自定义」）
2. 填写 **API Key** 与 **模型 ID**（选择供应商后会自动填入常用网关地址与示例模型）
3. 点击 **测试** 确认连通后再 **保存**

应用**不再内置**任何网关地址或 API Key；首次使用前必须自行配置。

打包时若需预填（仅限私有构建），可在项目根目录 `.env` 中设置（勿提交到 Git）：

```env
VITE_LLM_BASE_URL=https://your-gateway.example/v1
VITE_LLM_API_KEY=your-api-key
```

开发模式下未配置 `VITE_LLM_BASE_URL` 时，可将网关设为 `http://127.0.0.1:5173/__llm/v1`，由 Vite 代理转发到本地服务（`VITE_LLM_PROXY_TARGET`，默认 `http://127.0.0.1:15678`），以避免浏览器 CORS。

### 提示词

**设置 → 提示词** 可编辑：

- AI 自动总结提示词
- 生成日报 / 周报提示词

支持 **恢复默认** 与 AI 自动总结间隔（含 12:00 / 18:00 定时）。

## 项目结构（简要）

```
ganshale/
├── electron/          # Electron 主进程、预加载、窗口采集
├── src/
│   ├── components/    # UI 组件（看板、设置、日报等）
│   ├── context/       # React 数据上下文
│   └── lib/           # 存储、聚合、LLM、工作记录等业务逻辑
├── public/            # 静态资源与品牌图标
└── scripts/           # 代码生成等工具脚本
```

## 数据与隐私

- 窗口与事件数据默认保存在本机 **IndexedDB**，不上传云端
- 导出 / 导入为本地 JSON 文件
- 调用大模型时，仅将您配置的提示词与相关文本发送至所选网关

## 常见问题

**Q：浏览器里为什么没有窗口记录？**  
A：前台采集依赖 Electron 桌面端，请使用 `npm run dev` 或打包后的 exe。

**Q：日报生成失败 / Failed to fetch？**  
A：检查网关地址、API Key、跨域；开发环境优先使用 `/__llm` 代理或配置 `VITE_LLM_BASE_URL`。

**Q：如何清空本地数据？**  
A：**设置 → 基本设置 → 清空本地**（请谨慎操作）。

## 许可证与版权

版权所有归「小疯子」所有。

本仓库按原样提供；使用 AI 功能产生的费用由使用者自行承担。

## 发布到 GitHub

本地已初始化 Git 仓库。在 **PowerShell** 中进入项目根目录 `D:\Ganshale`：

```powershell
# 1. 登录 GitHub（无需单独安装 gh，脚本会自动下载到 tools/gh）
.\scripts\gh-login.ps1

# 2. 创建远程仓库并推送（默认私有仓库名 ganshale）
.\scripts\publish-github.ps1

# 公开仓库：
# .\scripts\publish-github.ps1 -RepoName ganshale -Visibility public
```

若提示「无法识别 gh」，说明未安装 GitHub CLI，**不要**直接输入 `gh auth login`，请用上面的 `.\scripts\gh-login.ps1`。

**不用 gh 的替代方式**：在 [GitHub 新建空仓库](https://github.com/new) 后：

```powershell
git remote add origin https://github.com/<你的用户名>/ganshale.git
git push -u origin main
```

（首次 push 会弹出浏览器或要求输入 GitHub 用户名 + [Personal Access Token](https://github.com/settings/tokens)）

## 参与与反馈

欢迎通过 GitHub Issues 提交问题与建议。
