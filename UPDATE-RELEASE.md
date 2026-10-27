# 发布客户端更新

客户端“设置 → 关于 → 检查更新”读取 Cryptocxf/ganshale 的公开 GitHub Releases。

检查地址为 `https://github.com/Cryptocxf/ganshale/releases/latest/download/latest.yml`，直接读取正式 Release 附件，不使用 GitHub REST API。成功检查结果缓存5分钟，失败后冷却1分钟；缓存与冷却仅作用于当前客户端进程。GitHub 网站或附件下载自身的限流仍可能发生。

1. 在 package.json 中提升 version，例如 1.0.2；新版本必须大于已安装版本。
2. 停止开发客户端，运行 `npm run pack`。
3. 在 GitHub 创建与版本一致的标签（例如 v1.0.2），发布正式 Release。
4. 将 release 目录中的安装程序 `.exe`、对应的 `.exe.blockmap` 和 `latest.yml` 一起上传为 Release 附件。保持文件名不变，不要只上传源码压缩包。
5. 在装有上一版客户端的 Windows 机器上检查、下载并重启安装，检查历史数据仍可读取。

首次启用：原来的旧客户端没有更新按钮，需要先手动覆盖安装一次包含本功能的新版本。以后即可在客户端更新。无需先卸载。

开发版不会安装更新。自动更新关闭降级、预发布版与退出时静默安装；下载完成后由用户点击重启安装。
用户数据继续保存在 `%APPDATA%\Ganshale`；安装器配置不在卸载时删除用户数据。
发布仓库为公开仓库时，无需在客户端配置 GitHub Token。不要将发布凭证写进前端或安装包。
