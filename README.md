<p align="center">
  <img src="public/ganshale-logo-app.png" alt="干啥了 Logo" width="128" height="128" />
</p>

<h1 align="center">干啥了（Ganshale）</h1>

<p align="center">
  <strong>一款拯救你于日报、周报、月报水火的 Windows 桌面工具</strong>
</p>

<p align="center">
  自动记录你在电脑上「干了啥」，整理成工作记录，并借助大模型一键生成日报、周报、月报。
</p>

---

## 功能概览

| 模块 | 说明 |
|------|------|
| **每日** | 当日时间分布、应用时长排行、分类分布、窗口记录、今日工作记录 |
| **每周** | 按周汇总活跃时长与应用排行，支持生成与查看历史周报 |
| **每月** | 按月汇总使用情况，辅助月报与复盘 |
| **工作记录** | 手动记录 + 系统自动记录；AI 按间隔或定时（如 12:00 / 18:00）自动总结窗口活动 |
| **窗口回顾** | 长时间停留在同一窗口时弹出轻量回顾，快速补记「刚才在干啥」 |
| **日报 / 周报** | 基于工作记录与自定义提示词，调用 OpenAI 兼容网关流式生成 |
| **数据** | ActivityWatch 风格桶与事件；支持 JSON 导入 / 导出与本地备份 |
| **设置** | 外观、数据目录、模型网关、提示词、自动生成时间、关于 |

## 环境要求

- **Windows 10 / 11**（完整功能需桌面端；浏览器模式仅可预览 UI）
- 使用 AI 功能时，需可访问的 **OpenAI 兼容网关** 及有效 API Key
- 从源码构建时需 **Node.js 18+**（推荐 20+）

---

## 安装与使用（普通用户）

### 1. 下载安装包

从 [Releases](https://github.com/<你的用户名>/ganshale/releases) 下载最新版安装程序：

```text
干啥了 Setup x.x.x.exe
```

> 若尚未发布到 GitHub，可在项目 `release/` 目录找到本地打包产物（见下方「开发者打包」）。

### 2. 安装

1. 双击 `干啥了 Setup x.x.x.exe`
2. 按向导选择安装目录（可自定义路径）
3. 安装完成后，可从 **桌面快捷方式** 或 **开始菜单 → 干啥了** 启动

> 安装目录内的主程序为 **`Ganshale.exe`**（英文文件名，避免部分 Windows 环境无法启动中文 exe）。

首次启动会播放约 4 秒的入场动画，随后进入主界面。

#### 双击没反应？

1. **先卸载旧版**，再安装最新 `干啥了 Setup x.x.x.exe`（安装目录选 `D:\ganshale` 等普通路径，避免 `Program Files`）。
2. 打开安装目录，**直接双击 `Ganshale.exe`**（不要只依赖可能指向旧路径的快捷方式）。
3. 若从网盘/U 盘拷贝安装包，右键安装包 → **属性** → 勾选 **「解除锁定」** 后再安装。
4. 将安装目录加入 **杀毒软件白名单**（此前安装若报 `WinShell.dll` 写入失败，很可能也被拦截了主程序）。
5. 查看 `%TEMP%\ganshale-startup.log`：
   - **有日志**：说明进程曾启动，把日志内容发给开发者；
   - **无日志**：说明 exe 根本没跑起来，优先查杀毒隔离区与安装是否完整（应有 `resources\app.asar`）。

### 3. 首次使用建议

**① 配置大模型（使用 AI 功能前必做）**

1. 打开 **设置 → 模型配置**
2. 从 **供应商** 下拉选择 OpenAI、DeepSeek、Moonshot、智谱、百炼、SiliconFlow、OpenRouter、Groq、Ollama 等（或「自定义」）
3. 填写 **API Key** 与 **模型 ID**
4. 点击 **测试** 确认连通后 **保存**

> 应用不内置任何网关地址或 API Key，首次使用前需自行配置。

**② 让应用开始记录**

- 安装版启动后会自动采集 **前台窗口**（应用名、窗口标题、停留时长）
- 打开 **每日** 页即可查看当日统计与窗口记录
- 顶栏会显示实时采集状态

**③ 生成日报 / 周报**

1. 在 **每日** 或 **每周** 页补充、确认 **工作记录**（可手动填写，或等待 AI 自动总结）
2. 点击 **生成日报** / **生成周报**
3. 在弹窗中查看流式输出，满意后保存或复制

**④ 按需调整（设置）**

| 设置项 | 作用 |
|--------|------|
| **基础设置** | 外观（字体、皮肤、背景）、数据目录、清空本地数据 |
| **模型配置** | 网关地址、API Key、默认模型 |
| **提示词** | AI 自动总结、日报、周报的提示词模板 |
| **时间** | AI 总结间隔、日报 / 周报自动生成时间 |
| **关于** | 版本信息与功能说明 |

### 4. 数据与隐私

- 窗口与事件数据默认保存在 **本机 IndexedDB**，不上传云端
- 可在 **设置 → 基础设置** 修改数据存储目录
- 支持 **数据** 页导入 / 导出 JSON 备份
- 调用大模型时，仅将您配置的提示词与相关文本发送至所选网关

### 5. 卸载

在 Windows **设置 → 应用 → 已安装的应用** 中找到「干啥了」，选择卸载即可。

---

## 开发者指南

### 克隆与安装依赖

```bash
git clone https://github.com/<你的用户名>/ganshale.git
cd ganshale
npm install
```

### 开发模式

**Electron 桌面端（含窗口采集，推荐）：**

```bash
npm run dev
```

**仅浏览器预览 UI（无窗口采集）：**

```bash
npm run dev:web
```

### 生产构建

```bash
npm run build
```

### 打包 Windows 安装程序

```bash
npm run pack
```

产物位于 `release/` 目录：

| 文件 | 说明 |
|------|------|
| `干啥了 Setup x.x.x.exe` | **NSIS 安装包**（分发给用户） |
| `win-unpacked/` | 未打包目录（调试用，勿分发） |

> 打包依赖 electron-builder。若 GitHub 下载 `winCodeSign` 失败，可手动下载后放入 `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0\`，或使用镜像：  
> `https://npmmirror.com/mirrors/electron-builder-binaries/winCodeSign-2.6.0/winCodeSign-2.6.0.7z`

### 其他脚本

| 命令 | 说明 |
|------|------|
| `npm run lint` | ESLint 检查 |
| `npm run preview` | 预览 Vite 构建结果 |
| `npm run gen:dashboard` | 根据脚本重新生成日看板组件 |

### 环境变量（可选，勿提交 `.env`）

打包时若需预填网关（仅限私有构建）：

```env
VITE_LLM_BASE_URL=https://your-gateway.example/v1
VITE_LLM_API_KEY=your-api-key
```

开发模式下未配置 `VITE_LLM_BASE_URL` 时，可将网关设为 `http://127.0.0.1:5173/__llm/v1`，由 Vite 代理转发到本地服务（`VITE_LLM_PROXY_TARGET`，默认 `http://127.0.0.1:15678`），以避免浏览器 CORS。

---

## 技术栈

- **前端**：React 19 + TypeScript + Vite 8 + Tailwind CSS 4
- **桌面端**：Electron 34（Windows，NSIS 安装包）
- **采集**：`active-win` 轮询前台窗口，本地 IndexedDB 存储
- **大模型**：OpenAI 兼容 `chat/completions`（含流式）

## 项目结构

```text
ganshale/
├── electron/          # Electron 主进程、预加载、窗口采集
├── public/            # 品牌 Logo、图标等静态资源
├── src/
│   ├── components/    # UI（看板、设置、日报、启动页等）
│   ├── context/       # React 数据上下文
│   └── lib/           # 存储、聚合、LLM、工作记录等业务逻辑
├── release/           # 打包产物（安装包）
└── scripts/           # 代码生成等工具脚本
```

---

## 常见问题

**Q：浏览器里为什么没有窗口记录？**  
A：前台采集依赖 Electron 桌面端，请使用安装版或 `npm run dev`，不要用 `npm run dev:web`。

**Q：安装后看不到入场动画？**  
A：请使用最新安装包；若仍异常，确认未开启系统「减少动画」类无障碍选项。

**Q：日报生成失败 / Failed to fetch？**  
A：检查 **设置 → 模型配置** 中的网关地址、API Key 是否正确；开发环境优先使用 `/__llm` 代理。

**Q：如何备份或迁移数据？**  
A：**数据** 页导出 JSON；或在 **设置 → 基础设置** 修改数据目录后重启应用。

**Q：如何清空本地数据？**  
A：**设置 → 基础设置 → 清空本地**（请谨慎操作，不可恢复）。

---

## 许可证与版权

版权所有 © 2026 **小疯子** · **干啥了**

本仓库按原样提供；使用 AI 功能产生的费用由使用者自行承担。

---

## 发布到 GitHub

本地已初始化 Git 仓库。在 **PowerShell** 中进入项目根目录：

```powershell
# 1. 登录 GitHub（无需单独安装 gh，脚本会自动下载到 tools/gh）
.\scripts\gh-login.ps1

# 2. 创建远程仓库并推送（默认私有仓库名 ganshale）
.\scripts\publish-github.ps1

# 公开仓库：
# .\scripts\publish-github.ps1 -RepoName ganshale -Visibility public
```

若提示「无法识别 gh」，请用 `.\scripts\gh-login.ps1`，不要直接输入 `gh auth login`。

**不用 gh 的替代方式**：在 [GitHub 新建空仓库](https://github.com/new) 后：

```powershell
git remote add origin https://github.com/<你的用户名>/ganshale.git
git push -u origin main
```

（首次 push 会弹出浏览器或要求输入 GitHub 用户名 + [Personal Access Token](https://github.com/settings/tokens)）

## 参与与反馈

欢迎通过 GitHub Issues 提交问题与建议。
