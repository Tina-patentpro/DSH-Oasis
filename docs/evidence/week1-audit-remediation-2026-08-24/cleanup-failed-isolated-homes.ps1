param(
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'

$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar)
$names = @(
  'oasis-dsh-week1-remediation-eKejJF',
  'oasis-dsh-week1-remediation-1D38ru',
  'oasis-dsh-week1-remediation-qieLBc'
)

foreach ($name in $names) {
  $target = [IO.Path]::GetFullPath((Join-Path $tempRoot $name))
  $expectedPrefix = $tempRoot + [IO.Path]::DirectorySeparatorChar

  if (-not $target.StartsWith($expectedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing target outside temp root: $target"
  }
  if ([IO.Path]::GetFileName($target) -cne $name) {
    throw "Refusing unexpected target name: $target"
  }
  if (-not (Test-Path -LiteralPath $target)) {
    Write-Output "missing=$target"
    continue
  }

  $resolved = (Resolve-Path -LiteralPath $target).Path
  if (-not $resolved.StartsWith($expectedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing resolved target outside temp root: $resolved"
  }

  $item = Get-Item -LiteralPath $resolved -Force
  if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw "Refusing reparse root: $resolved"
  }

  if ($Remove) {
    Remove-Item -LiteralPath $resolved -Recurse -Force
    Write-Output "removed=$resolved"
  } else {
    Write-Output "verified=$resolved"
  }
}
