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

打开应用内 **设置 → 模型配置**，填写：

- **网关地址**：须为 OpenAI 兼容根路径，包含 `/v1`
- **API Key**：界面以密文显示；留空可使用内置默认（建议在私有部署时改为环境变量或自行填写）
- **模型 ID**：发给网关的 `model` 字段

开发时可在项目根目录创建 `.env`（勿提交到 Git）：

```env
VITE_LLM_BASE_URL=https://your-gateway.example/v1
VITE_LLM_API_KEY=your-api-key
VITE_LLM_PROXY_TARGET=http://127.0.0.1:15678
```

未配置 `VITE_LLM_BASE_URL` 时，开发服务器会通过 `/__llm` 代理转发，避免浏览器 CORS 问题。

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

## 参与与反馈

欢迎通过 [Issues](https://github.com/PLACEHOLDER/ganshale/issues) 提交问题与建议（请将上方链接替换为实际仓库地址）。
