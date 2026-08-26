param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,

  [Parameter(Mandatory = $true)]
  [ValidateRange(1, 160)]
  [int]$RenderedSize,

  [ValidateRange(0, 255)]
  [double]$MinimumMeanFrameDifference = 10,

  [ValidateRange(0, 12)]
  [int]$PassingLiftPixels = 3,

  [ValidateRange(0, 1)]
  [double]$FootRegionStartRatio = 0.75,

  [ValidateRange(0, 1000)]
  [int]$MinimumFootSilhouetteChanges = 50
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$cellSize = 160
$columnCount = 6
$rowCount = 8
$contactBaseline = 150
$passingBaseline = $contactBaseline - $PassingLiftPixels

function Get-VisibleBounds([System.Drawing.Bitmap]$bitmap) {
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

function New-RenderedFrame(
  [System.Drawing.Bitmap]$frame,
  [int]$size
) {
  $rendered = [System.Drawing.Bitmap]::new(
    $size,
    $size,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($rendered)
  try {
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($frame, 0, 0, $size, $size)
  } finally {
    $graphics.Dispose()
  }
  return $rendered
}

function New-AlphaRenderedFrame(
  [System.Drawing.Bitmap]$frame,
  [int]$size
) {
  $rendered = [System.Drawing.Bitmap]::new(
    $size,
    $size,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($rendered)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($frame, 0, 0, $size, $size)
  } finally {
    $graphics.Dispose()
  }
  return $rendered
}

function Get-FootSilhouetteChanges(
  [System.Drawing.Bitmap]$first,
  [System.Drawing.Bitmap]$second,
  [double]$startRatio
) {
  $startRow = [int][Math]::Floor($first.Height * $startRatio)
  $changes = 0
  for ($row = $startRow; $row -lt $first.Height; $row += 1) {
    for ($column = 0; $column -lt $first.Width; $column += 1) {
      $firstVisible = $first.GetPixel($column, $row).A -gt 48
      $secondVisible = $second.GetPixel($column, $row).A -gt 48
      if ($firstVisible -ne $secondVisible) {
        $changes += 1
      }
    }
  }
  return $changes
}

function Get-MeanFrameDifference(
  [System.Drawing.Bitmap]$first,
  [System.Drawing.Bitmap]$second
) {
  [long]$difference = 0
  for ($row = 0; $row -lt $first.Height; $row += 1) {
    for ($column = 0; $column -lt $first.Width; $column += 1) {
      $firstPixel = $first.GetPixel($column, $row)
      $secondPixel = $second.GetPixel($column, $row)
      $difference += [Math]::Abs($firstPixel.R - $secondPixel.R)
      $difference += [Math]::Abs($firstPixel.G - $secondPixel.G)
      $difference += [Math]::Abs($firstPixel.B - $secondPixel.B)
    }
  }
  return $difference / ($first.Width * $first.Height * 3)
}

function Assert-FramesEquivalent(
  [System.Drawing.Bitmap]$first,
  [System.Drawing.Bitmap]$second,
  [string]$message
) {
  $difference = Get-MeanFrameDifference $first $second
  if ($difference -gt 0.1) {
    throw "$message Mean difference: $([Math]::Round($difference, 3))."
  }
}

$sheet = [System.Drawing.Bitmap]::new($InputPath)
try {
  if (
    $sheet.Width -ne $cellSize * $columnCount -or
    $sheet.Height -ne $cellSize * $rowCount
  ) {
    throw "Expected a 960x1280 sprite sheet, got $($sheet.Width)x$($sheet.Height)."
  }

  $minimumDifference = [double]::PositiveInfinity
  $minimumObservedFootSilhouetteChanges = [int]::MaxValue
  $minimumFootChangesByDirection = @()
  $oppositeContactChangesByDirection = @()
  for ($directionRow = 0; $directionRow -lt $rowCount; $directionRow += 1) {
    $frames = @()
    $renderedFrames = @()
    $alphaRenderedFrames = @()
    try {
      for ($column = 0; $column -lt $columnCount; $column += 1) {
        $frame = $sheet.Clone(
          [System.Drawing.Rectangle]::new(
            $column * $cellSize,
            $directionRow * $cellSize,
            $cellSize,
            $cellSize
          ),
          [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
        )
        $frames += $frame
        $bounds = Get-VisibleBounds $frame
        $expectedBaseline = if ($column % 2 -eq 1) {
          $passingBaseline
        } else {
          $contactBaseline
        }
        if ($bounds.Bottom - 1 -ne $expectedBaseline) {
          throw (
            "Unexpected baseline in row $directionRow column $column`: " +
            "$($bounds.Bottom - 1), expected $expectedBaseline."
          )
        }
        $renderedFrames += New-RenderedFrame $frame $RenderedSize
        $alphaRenderedFrames += New-AlphaRenderedFrame $frame $RenderedSize
      }

      Assert-FramesEquivalent `
        -first $frames[1] `
        -second $frames[5] `
        -message "Passing frames differ in direction row $directionRow."
      Assert-FramesEquivalent `
        -first $frames[2] `
        -second $frames[4] `
        -message "Opposite contact frames differ in direction row $directionRow."

      $directionFootChanges = @()
      for ($column = 0; $column -lt $columnCount; $column += 1) {
        $difference = Get-MeanFrameDifference `
          -first $renderedFrames[$column] `
          -second $renderedFrames[($column + 1) % $columnCount]
        $minimumDifference = [Math]::Min($minimumDifference, $difference)
        if ($difference -lt $MinimumMeanFrameDifference) {
          throw (
            "Walk motion is too subtle in row $directionRow column $column`: " +
            "$([Math]::Round($difference, 2)) < $MinimumMeanFrameDifference."
          )
        }
        $footSilhouetteChanges = Get-FootSilhouetteChanges `
          -first $alphaRenderedFrames[$column] `
          -second $alphaRenderedFrames[($column + 1) % $columnCount] `
          -startRatio $FootRegionStartRatio
        $minimumObservedFootSilhouetteChanges = [Math]::Min(
          $minimumObservedFootSilhouetteChanges,
          $footSilhouetteChanges
        )
        $directionFootChanges += $footSilhouetteChanges
        if ($footSilhouetteChanges -lt $MinimumFootSilhouetteChanges) {
          throw (
            "Walk footwork is too subtle in row $directionRow column $column`: " +
            "$footSilhouetteChanges silhouette pixels changed, expected at least " +
            "$MinimumFootSilhouetteChanges."
          )
        }
      }
      $minimumFootChangesByDirection += (
        $directionFootChanges | Measure-Object -Minimum
      ).Minimum
      $oppositeContactChangesByDirection += Get-FootSilhouetteChanges `
        -first $alphaRenderedFrames[0] `
        -second $alphaRenderedFrames[2] `
        -startRatio $FootRegionStartRatio
    } finally {
      foreach ($frame in $frames) {
        $frame.Dispose()
      }
      foreach ($frame in $renderedFrames) {
        $frame.Dispose()
      }
      foreach ($frame in $alphaRenderedFrames) {
        $frame.Dispose()
      }
    }
  }

  [PSCustomObject]@{
    Path = (Resolve-Path $InputPath).Path
    FrameCount = $columnCount * $rowCount
    RenderedSize = $RenderedSize
    MinimumMeanFrameDifference = [Math]::Round($minimumDifference, 2)
    ContactBaseline = $contactBaseline
    PassingBaseline = $passingBaseline
    FootRegionStartRatio = $FootRegionStartRatio
    MinimumFootSilhouetteChanges = $minimumObservedFootSilhouetteChanges
    MinimumFootChangesByDirection = $minimumFootChangesByDirection
    OppositeContactChangesByDirection = $oppositeContactChangesByDirection
  }
} finally {
  $sheet.Dispose()
}
