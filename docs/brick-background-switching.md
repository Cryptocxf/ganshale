# 工时积木背景与复制图片

## 最新交互调整
下载按钮与造型区右键均直接生成16:9（1920×1080），不再打开比例菜单、不询问，也不提供9:16入口。以下原始双比例记录仅保留为历史验证说明。

## Electron 45 剪贴板修复
- 根因：Electron 45.3.1 已没有 clipboard.writeImage，旧实现因此抛出 TypeError。
- 主进程改用 await clipboard.write([new ClipboardItem({'image/png': Blob})])，同时保留旧版本 writeImage 兼容路径，维持来源/尺寸/PNG 解码校验。
- 前端先提示正在复制，异步完成后才提示成功；失败使用中文提示，不暴露底层异常。
- scripts/test-brand-wordmark.cjs 使用实际 Electron ClipboardItem 构造类型验证 PNG 负载，替身接收写入，验证旧接口兼容与异步失败；不覆盖用户系统剪贴板。
- 构建、语法、ESLint 和界面回归通过。第三方软件实际粘贴仍未验证。

### Windows 实际链路复查
- scripts/test-brick-native-clipboard.cjs 已实际通过真实 preload → IPC → Windows 剪贴板写入/读回，PNG 为1920×1080；并成功恢复本次测试前的剪贴板内容。
- 第一次实际测试写入成功、恢复失败：新版禁止直接write(read()返回的ClipboardItem)，该次旧内容未自动恢复，已即时告知用户可尝试Win+V。恢复逻辑现已先将负载读入内存再构造新的ClipboardItem，后续复测恢复成功。
- 新增前端浏览器剪贴板后备路径；原生桥失败或旧主进程不兼容时尝试后备接口，失败不伪报成功。
- scripts/test-brick-copy-fallback.cjs 验证原生成功、旧桥失败、浏览器成功/失败等分支，已通过。
- 实际运行中的旧主进程需完全退出后重启才能载入主进程修改；网页热更新不能更新Electron主进程。
- 第三方软件手动粘贴仍未验证；未打包发布。

## 行为
- 每次进入页面默认暖砂岩展台；点击造型区空白按暖砂岩展台→陶土工坊→建筑手稿循环。
- 点击砖块只选择故事，不切换背景。聚焦造型区后 Enter/空格也可切换。
- 右键打开图片比例菜单，支持 16:9（1920×1080）、9:16（1080×1920）。Escape/点击外部关闭。
- 复制与下载共用 renderBrickPoster，包含品牌标题、统计、当前背景、造型、本期之最、应用排行及图鉴，不是单独截取背景。
- Electron 使用受限 IPC 写入图片剪贴板，检查主窗口/主框架来源、PNG 类型、32MB 上限、固定导出尺寸及实际解码结果；浏览器使用 ClipboardItem，失败明确报错。
- 不修改采集、计时、报告生成、历史数据及存储机制；背景选择仅为页面展示状态。

## 素材
- 陶土工坊：复用 public/brick-sunlit-workshop-v1.png。
- 建筑手稿：复用 public/brick-drafting-paper-v1.png。
- 暖砂岩展台：public/brick-sandstone-stage-v1.png。旧素材只有完整界面效果图，因此用内置 imagegen 根据原图还原空场景，并非原始底图。
- 参考原图：exec-b9ea0260-c98b-402c-b0ca-7c99de0189e9.png。
- 生成结果：exec-0a3017ea-b571-4eb0-9b54-208a26055f62.png，保留原文件，复制进 public。
- 提示词核心：仅还原旧图左侧暖米白砂岩/灰泥墙及下方16%砂岩台面；左上柔和阳光；移除全部文字、界面、人物、砖块、边框，输出无物件的完整横向背景。

## 验证
- npm run build：通过（保留现有大 chunk 警告）。
- 改动 TS 文件 ESLint、Electron main/preload 语法检查：通过。
- scripts/test-brand-wordmark.cjs：通过，使用隔离数据目录，不接触真实数据。
- 三背景循环、砖块选择不切换、右键不切换：通过。
- 两种比例复制 PNG 与下载 PNG 逐字节相同、尺寸正确：通过（浏览器剪贴板替身捕获）。
- 1366×768、1440×900、1920×1080、1120×760；深色/纸张/默认及窄窗口既有回归：通过。
- Windows 原生剪贴板粘贴到第三方软件：未实测，不记为通过。
- 本轮未打包、未发布。
