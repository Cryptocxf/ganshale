$ErrorActionPreference = 'SilentlyContinue'

$list = New-Object System.Collections.ArrayList

$roots = @(
  'Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
  'Registry::HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall',
  'Registry::HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall'
)

foreach ($rp in $roots) {
  if (-not (Test-Path -LiteralPath $rp)) { continue }
  Get-ChildItem -LiteralPath $rp -ErrorAction SilentlyContinue | ForEach-Object {
    $x = Get-ItemProperty -LiteralPath $_.PsPath -ErrorAction SilentlyContinue
    if (-not $x.DisplayName) { return }
    $dn = [string]$x.DisplayName
    if ($dn.Length -lt 2) { return }
    if ($dn -match '^\(KB\d') { return }
    if ($dn -match 'Security Update|Definition Update|Cumulative Update|Hotfix for') { return }

    $icon = if ($x.DisplayIcon) { [string]$x.DisplayIcon } else { $null }
    $loc = if ($x.InstallLocation) { [string]$x.InstallLocation } else { $null }
    $uns = if ($x.UninstallString) { [string]$x.UninstallString } else { $null }

    $null = $list.Add([pscustomobject]@{
      displayName     = $dn
      displayIcon     = $icon
      installLocation = $loc
      uninstallString = $uns
    })
  }
}

$uniq = @{}
$out = New-Object System.Collections.ArrayList
foreach ($row in ($list | Sort-Object displayName)) {
  $k = $row.displayName.ToLowerInvariant()
  if ($uniq.ContainsKey($k)) { continue }
  $uniq[$k] = $true
  $null = $out.Add($row)
  if ($out.Count -ge 900) { break }
}

if ($out.Count -eq 0) {
  Write-Output '[]'
}
else {
  $out | ConvertTo-Json -Compress -Depth 5
}
