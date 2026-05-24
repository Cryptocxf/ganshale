# 确保本机可用 gh.exe（优先 PATH，其次项目 tools/gh，最后 %TEMP%\gh-cli）
# 用法：. .\scripts\ensure-gh.ps1   然后使用 $script:GhExe

$ErrorActionPreference = 'Stop'

function Get-GhExePath {
  $cmd = Get-Command gh -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $root = Split-Path -Parent $PSScriptRoot
  $local = Join-Path $root 'tools\gh\bin\gh.exe'
  if (Test-Path $local) { return $local }

  $temp = Join-Path $env:TEMP 'gh-cli\bin\gh.exe'
  if (Test-Path $temp) { return $temp }

  return $null
}

function Install-GhToTools {
  $root = Split-Path -Parent $PSScriptRoot
  $toolsDir = Join-Path $root 'tools\gh'
  $zipPath = Join-Path $env:TEMP 'gh-windows-amd64.zip'
  $uri = 'https://github.com/cli/cli/releases/download/v2.63.2/gh_2.63.2_windows_amd64.zip'

  Write-Host '正在下载 GitHub CLI...' -ForegroundColor Cyan
  Invoke-WebRequest -Uri $uri -OutFile $zipPath -UseBasicParsing
  if (Test-Path $toolsDir) { Remove-Item $toolsDir -Recurse -Force }
  Expand-Archive -Path $zipPath -DestinationPath $toolsDir -Force

  $extracted = Get-ChildItem $toolsDir -Recurse -Filter gh.exe | Select-Object -First 1
  if (-not $extracted) { throw 'gh.exe not found after extract' }

  $binDir = Join-Path $toolsDir 'bin'
  New-Item -ItemType Directory -Force -Path $binDir | Out-Null
  Copy-Item $extracted.FullName (Join-Path $binDir 'gh.exe') -Force
  return Join-Path $binDir 'gh.exe'
}

$GhExe = Get-GhExePath
if (-not $GhExe) {
  $GhExe = Install-GhToTools
}

Write-Host "使用 gh: $GhExe" -ForegroundColor Green
$script:GhExe = $GhExe
return $GhExe
