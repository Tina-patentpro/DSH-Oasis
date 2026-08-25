$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..')).Path
$fixtureRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot 'tests\fixtures')).Path
$targets = @(
  (Join-Path $fixtureRoot 'oasis-slot-evidence-probe\node_modules'),
  (Join-Path $fixtureRoot 'oasis-client-layout-probe\node_modules')
)

foreach ($target in $targets) {
  $resolved = (Resolve-Path -LiteralPath $target).Path
  $expectedPrefix = $fixtureRoot + [IO.Path]::DirectorySeparatorChar
  if (-not $resolved.StartsWith($expectedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing target outside fixture root: $resolved"
  }
  $item = Get-Item -LiteralPath $resolved -Force
  if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw "Refusing reparse root: $resolved"
  }
  Remove-Item -LiteralPath $resolved -Recurse -Force
  Write-Output "removed=$resolved"
}
