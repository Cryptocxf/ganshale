param(
  [Parameter(Mandatory = $true)]
  [string]$QueryBase64
)

$ErrorActionPreference = 'SilentlyContinue'

try {
  $raw = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($QueryBase64))
}
catch {
  Write-Output '[]'
  exit 0
}

$raw = $raw.Trim()
if ([string]::IsNullOrWhiteSpace($raw)) {
  Write-Output '[]'
  exit 0
}

$hits = New-Object System.Collections.ArrayList
$seen = @{}

function Add-Hit {
  param([string]$Name, [string]$PathVal)

  if ([string]::IsNullOrWhiteSpace($Name)) { return }
  $nameNorm = $Name.Trim()
  if ($nameNorm -notmatch '\.exe\s*$') { return }

  $key = if ($PathVal -and $PathVal.Trim()) {
    try { (Resolve-Path -LiteralPath $PathVal.Trim() -ErrorAction Stop).Path.ToLowerInvariant() }
    catch { $PathVal.Trim().ToLowerInvariant() }
  }
  else {
    ('name:' + $nameNorm).ToLowerInvariant()
  }

  if ($seen.ContainsKey($key)) { return }
  if ($hits.Count -ge 120) { return }

  $pathOut = $null
  if ($PathVal -and $PathVal.Trim() -and (Test-Path -LiteralPath $PathVal.Trim())) {
    try {
      $it = Get-Item -LiteralPath $PathVal.Trim() -ErrorAction Stop
      if ($it.Extension -eq '.exe') {
        $pathOut = $it.FullName
        $nameNorm = $it.Name
      }
    }
    catch { }
  }

  $null = $seen.Add($key, $true)
  $null = $hits.Add([pscustomobject]@{ name = $nameNorm; path = $pathOut })
}

# 1) 注册表 App Paths（已安装应用常用注册位置）
$appPathRoots = @(
  'Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths',
  'Registry::HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths'
)

foreach ($root in $appPathRoots) {
  if (-not (Test-Path -LiteralPath $root)) { continue }
  Get-ChildItem -LiteralPath $root -ErrorAction SilentlyContinue | ForEach-Object {
    $kn = $_.PSChildName
    if ($kn.IndexOf($raw, [StringComparison]::OrdinalIgnoreCase) -lt 0) { return }
    $def = (Get-ItemProperty -LiteralPath $_.PSPath -ErrorAction SilentlyContinue).'(default)'
    Add-Hit -Name $kn -PathVal $def
  }
}

# 2) PATH 中的可执行文件（Get-Command）
Get-Command -CommandType Application -ErrorAction SilentlyContinue | ForEach-Object {
  $nm = $_.Name
  if (-not $nm) { return }
  if ($nm.IndexOf($raw, [StringComparison]::OrdinalIgnoreCase) -lt 0) { return }
  $src = $_.Source
  if (-not $src) { return }
  Add-Hit -Name $nm -PathVal $src
}

# 3) 当前运行中的进程（未注册也可能在跑）
Get-Process -ErrorAction SilentlyContinue | ForEach-Object {
  $exeName = if ($_.Path) {
    try { [System.IO.Path]::GetFileName($_.Path) } catch { $_.ProcessName + '.exe' }
  }
  else {
    $_.ProcessName + '.exe'
  }
  if ($exeName.IndexOf($raw, [StringComparison]::OrdinalIgnoreCase) -lt 0) { return }
  if ($_.Path) {
    Add-Hit -Name $exeName -PathVal $_.Path
  }
  else {
    Add-Hit -Name $exeName -PathVal $null
  }
}

# 4) 用户侧常见安装目录浅层扫描（如 Local\Programs 下的 Electron 应用）
$scanRoots = @(
  (Join-Path $env:LOCALAPPDATA 'Programs'),
  (Join-Path $env:USERPROFILE '.local\bin')
)

foreach ($r in $scanRoots) {
  if (-not (Test-Path -LiteralPath $r)) { continue }
  Get-ChildItem -LiteralPath $r -File -Filter '*.exe' -Recurse -Depth 4 -ErrorAction SilentlyContinue |
    ForEach-Object {
      if ($_.Name.IndexOf($raw, [StringComparison]::OrdinalIgnoreCase) -lt 0) { return }
      Add-Hit -Name $_.Name -PathVal $_.FullName
    }
}

if ($hits.Count -eq 0) {
  Write-Output '[]'
}
else {
  $hits | ConvertTo-Json -Compress -Depth 4
}
