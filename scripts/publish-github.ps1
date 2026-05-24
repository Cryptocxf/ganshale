# 将本项目推送到 GitHub（需先完成 gh 登录）
# Windows 用法：
#   1. .\scripts\gh-login.ps1
#   2. .\scripts\publish-github.ps1
# 可选：指定仓库名与可见性
#   .\scripts\publish-github.ps1 -RepoName ganshale -Visibility private

param(
  [string]$RepoName = 'ganshale',
  [ValidateSet('public', 'private')]
  [string]$Visibility = 'private'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$ghExe = . (Join-Path $PSScriptRoot 'ensure-gh.ps1')

& $ghExe auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host '请先登录 GitHub：' -ForegroundColor Yellow
  Write-Host "  & `"$ghExe`" auth login" -ForegroundColor Cyan
  exit 1
}

if (-not (Test-Path '.git')) {
  git init
  git branch -M main
}

$status = git status --porcelain
if ($status) {
  git add -A
  git commit -m "chore: sync before GitHub publish"
}

$remotes = git remote 2>$null
if ($remotes -notcontains 'origin') {
  $visibilityFlag = if ($Visibility -eq 'public') { '--public' } else { '--private' }
  & $ghExe repo create $RepoName --source=. --remote=origin @($visibilityFlag) --description '干啥了 Ganshale - Windows 工作记录与日报周报工具'
} else {
  git push -u origin main
  Write-Host "已存在 origin 远程，仅执行 push。" -ForegroundColor Green
  exit 0
}

git push -u origin main
$repoUrl = & $ghExe repo view --json url -q .url
Write-Host "完成：$repoUrl" -ForegroundColor Green
