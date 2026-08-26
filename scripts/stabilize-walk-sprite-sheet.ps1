param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath,

  [switch]$UniformCycle
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$cellSize = 160
$rowCount = 8
$columnCount = 4
$contentWidth = 140
$contentHeight = 143
$baselineY = 151

# Contact -> passing -> opposite contact -> passing produces a seamless loop.
# Shield v1 needs alternate southwest and west source frames. Later sheets use
# the authored contact frame in every direction so their idle pose stays grounded.
$frameSequences = if ($UniformCycle) {
  @(
    ,@(0, 1, 2, 1)
    ,@(0, 1, 2, 1)
    ,@(0, 1, 2, 1)
    ,@(0, 1, 2, 1)
    ,@(0, 1, 2, 1)
    ,@(0, 1, 2, 1)
    ,@(0, 1, 2, 1)
    ,@(0, 1, 2, 1)
  )
} else {
  @(
    ,@(0, 1, 2, 1)
    ,@(0, 1, 2, 1)
    ,@(0, 1, 2, 1)
    ,@(0, 1, 2, 1)
    ,@(0, 1, 2, 1)
    ,@(1, 2, 3, 2)
    ,@(1, 2, 3, 2)
    ,@(0, 1, 2, 1)
  )
}

function Find-VisibleBounds([System.Drawing.Bitmap]$bitmap) {
  $minimumX = $bitmap.Width
  $minimumY = $bitmap.Height
  $maximumX = -1
  $maximumY = -1

  for ($row = 0; $row -lt $bitmap.Height; $row += 1) {
    for ($column = 0; $column -lt $bitmap.Width; $column += 1) {
      if ($bitmap.GetPixel($column, $row).A -le 12) {
        continue
      }
      $minimumX = [Math]::Min($minimumX, $column)
      $minimumY = [Math]::Min($minimumY, $row)
      $maximumX = [Math]::Max($maximumX, $column)
      $maximumY = [Math]::Max($maximumY, $row)
    }
  }

  if ($maximumX -lt $minimumX -or $maximumY -lt $minimumY) {
    throw 'A walk frame contains no visible pixels.'
  }

  return [System.Drawing.Rectangle]::FromLTRB(
    $minimumX,
    $minimumY,
    $maximumX + 1,
    $maximumY + 1
  )
}

$source = [System.Drawing.Bitmap]::new($InputPath)
try {
  if (
    $source.Width -ne $cellSize * $columnCount -or
    $source.Height -ne $cellSize * $rowCount
  ) {
    throw "Expected a 640x1280 sprite sheet, got $($source.Width)x$($source.Height)."
  }

  $output = [System.Drawing.Bitmap]::new(
    $source.Width,
    $source.Height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($output)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

    for ($directionRow = 0; $directionRow -lt $rowCount; $directionRow += 1) {
      $preparedFrames = @()
      try {
        foreach ($sourceColumn in $frameSequences[$directionRow]) {
          $sourceBounds = [System.Drawing.Rectangle]::new(
            $sourceColumn * $cellSize,
            $directionRow * $cellSize,
            $cellSize,
            $cellSize
          )
          $frame = $source.Clone(
            $sourceBounds,
            [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
          )
          $preparedFrames += [PSCustomObject]@{
            Bitmap = $frame
            VisibleBounds = Find-VisibleBounds $frame
          }
        }

        $maximumWidth = ($preparedFrames.VisibleBounds.Width | Measure-Object -Maximum).Maximum
        $maximumHeight = ($preparedFrames.VisibleBounds.Height | Measure-Object -Maximum).Maximum
        $sharedScale = [Math]::Min(
          $contentWidth / $maximumWidth,
          $contentHeight / $maximumHeight
        )

        for ($targetColumn = 0; $targetColumn -lt $columnCount; $targetColumn += 1) {
          $preparedFrame = $preparedFrames[$targetColumn]
          $visibleBounds = $preparedFrame.VisibleBounds
          $targetWidth = [int][Math]::Round($visibleBounds.Width * $sharedScale)
          $targetHeight = [int][Math]::Round($visibleBounds.Height * $sharedScale)
          $targetX = $targetColumn * $cellSize + [int][Math]::Round(($cellSize - $targetWidth) / 2)
          $targetY = $directionRow * $cellSize + $baselineY - $targetHeight
          $targetBounds = [System.Drawing.Rectangle]::new(
            $targetX,
            $targetY,
            $targetWidth,
            $targetHeight
          )
          $graphics.DrawImage(
            $preparedFrame.Bitmap,
            $targetBounds,
            $visibleBounds,
            [System.Drawing.GraphicsUnit]::Pixel
          )
        }
      } finally {
        foreach ($preparedFrame in $preparedFrames) {
          $preparedFrame.Bitmap.Dispose()
        }
      }
    }

    $outputDirectory = Split-Path -Parent $OutputPath
    New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
    $output.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $output.Dispose()
  }
} finally {
  $source.Dispose()
}
