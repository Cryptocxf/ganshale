# 将本项目推送到 GitHub（需先完成 gh 登录）
# 用法：
#   1. 安装 GitHub CLI 或确保 gh 在 PATH 中
#   2. gh auth login
#   3. .\scripts\publish-github.ps1
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

$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  $fallback = Join-Path $env:TEMP 'gh-cli\bin\gh.exe'
  if (Test-Path $fallback) { $gh = @{ Source = $fallback } }
}
if (-not $gh) {
  Write-Error '未找到 gh。请安装 GitHub CLI：https://cli.github.com/'
}

$ghExe = if ($gh.Source) { $gh.Source } else { 'gh' }

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
