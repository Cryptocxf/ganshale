# Windows：登录 GitHub（无需 gh 在 PATH 中）
# 在项目根目录执行：  .\scripts\gh-login.ps1

$ErrorActionPreference = 'Stop'
$GhExe = . (Join-Path $PSScriptRoot 'ensure-gh.ps1')

Write-Host ''
Write-Host '即将启动 GitHub 登录，请按提示选择：' -ForegroundColor Yellow
Write-Host '  1) GitHub.com'
Write-Host '  2) HTTPS'
Write-Host '  3) Login with a web browser（推荐）'
Write-Host ''

& $GhExe auth login -h github.com -p https -w

if ($LASTEXITCODE -eq 0) {
  Write-Host ''
  Write-Host '登录成功。可执行推送：' -ForegroundColor Green
  Write-Host '  .\scripts\publish-github.ps1' -ForegroundColor Cyan
} else {
  Write-Host ''
  Write-Host '登录未完成。也可改用 Personal Access Token：' -ForegroundColor Yellow
  Write-Host "  & `"$GhExe`" auth login -h github.com -p https --with-token"
  Write-Host '  （粘贴 Token 后按 Enter，再 Ctrl+Z 回车结束输入）'
}
