param(
  [string]$SourceDirectory = 'dist-itch',
  [string]$DestinationArchive = 'toy-base-reversal-itch.zip'
)

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourcePath = (Resolve-Path (Join-Path $repositoryRoot $SourceDirectory)).Path
$archivePath = [System.IO.Path]::GetFullPath(
  (Join-Path $repositoryRoot $DestinationArchive)
)
$repositoryPrefix = $repositoryRoot + [System.IO.Path]::DirectorySeparatorChar

if (-not $sourcePath.StartsWith($repositoryPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'The itch.io build source must stay inside the repository.'
}
if (-not $archivePath.StartsWith($repositoryPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'The itch.io package must stay inside the repository.'
}
if (-not (Test-Path -LiteralPath (Join-Path $sourcePath 'index.html'))) {
  throw 'dist-itch/index.html is missing. Run the itch.io build first.'
}

Compress-Archive -Path (Join-Path $sourcePath '*') -DestinationPath $archivePath -CompressionLevel Optimal -Force -ErrorAction Stop

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
  $entryNames = @(
    $archive.Entries |
      ForEach-Object { $_.FullName.Replace('\', '/') }
  )
} finally {
  $archive.Dispose()
}

$hasTopLevelIndex = $entryNames -contains 'index.html'
$prefixedEntries = @($entryNames | Where-Object { $_ -like 'dist-itch/*' })
$html = Get-Content -Raw -LiteralPath (Join-Path $sourcePath 'index.html')
$assetReferences = @(
  [regex]::Matches($html, '(?:src|href)="\.\/([^"?#]+)"') |
    ForEach-Object { $_.Groups[1].Value }
)
$missingAssets = @(
  $assetReferences | Where-Object { $entryNames -notcontains $_ }
)

if (
  -not $hasTopLevelIndex -or
  $prefixedEntries.Count -gt 0 -or
  $missingAssets.Count -gt 0
) {
  throw 'The itch.io package structure is invalid.'
}

$package = Get-Item -LiteralPath $archivePath
$hash = Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath
[pscustomobject]@{
  Path = $package.FullName
  Megabytes = [math]::Round($package.Length / 1MB, 2)
  EntryCount = $entryNames.Count
  Sha256 = $hash.Hash
}
