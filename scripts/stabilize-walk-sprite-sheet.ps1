param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath,

  [switch]$UniformCycle,

  [switch]$PingPongCycle,

  [switch]$MagentaChromaKey,

  [ValidateRange(0, 12)]
  [int]$PassingLiftPixels = 0
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$cellSize = 160
$rowCount = 8
$sourceColumnCount = 4
$contentWidth = 140
$contentHeight = 143
$baselineY = 151

# Contact -> passing -> opposite contact -> passing produces a seamless loop.
# Shield v1 needs alternate southwest and west source frames. Later sheets use
# the authored contact frame in every direction so their idle pose stays grounded.
$frameSequences = if ($PingPongCycle) {
  @(
    ,@(0, 1, 2, 3, 2, 1)
    ,@(0, 1, 2, 3, 2, 1)
    ,@(0, 1, 2, 3, 2, 1)
    ,@(0, 1, 2, 3, 2, 1)
    ,@(0, 1, 2, 3, 2, 1)
    ,@(0, 1, 2, 3, 2, 1)
    ,@(0, 1, 2, 3, 2, 1)
    ,@(0, 1, 2, 3, 2, 1)
  )
} elseif ($UniformCycle) {
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
$targetColumnCount = $frameSequences[0].Count

function Remove-MagentaBackground([System.Drawing.Bitmap]$bitmap) {
  $transparent = [System.Drawing.Bitmap]::new(
    $bitmap.Width,
    $bitmap.Height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $backgroundRed = 245
  $backgroundGreen = 15
  $backgroundBlue = 242

  for ($row = 0; $row -lt $bitmap.Height; $row += 1) {
    for ($column = 0; $column -lt $bitmap.Width; $column += 1) {
      $pixel = $bitmap.GetPixel($column, $row)
      $magentaScore = [Math]::Min($pixel.R, $pixel.B) - $pixel.G
      if ($magentaScore -ge 80) {
        $transparent.SetPixel(
          $column,
          $row,
          [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
        )
        continue
      }

      $alpha = if ($magentaScore -le 20) {
        255
      } else {
        [int][Math]::Round((80 - $magentaScore) * 255 / 60)
      }
      $alphaRatio = [Math]::Max(0.01, $alpha / 255)
      $red = [int][Math]::Round(
        ($pixel.R - $backgroundRed * (1 - $alphaRatio)) / $alphaRatio
      )
      $green = [int][Math]::Round(
        ($pixel.G - $backgroundGreen * (1 - $alphaRatio)) / $alphaRatio
      )
      $blue = [int][Math]::Round(
        ($pixel.B - $backgroundBlue * (1 - $alphaRatio)) / $alphaRatio
      )
      $transparent.SetPixel(
        $column,
        $row,
        [System.Drawing.Color]::FromArgb(
          $alpha,
          [Math]::Max(0, [Math]::Min(255, $red)),
          [Math]::Max(0, [Math]::Min(255, $green)),
          [Math]::Max(0, [Math]::Min(255, $blue))
        )
      )
    }
  }

  return $transparent
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

function Get-WeightedClusterBoundaries(
  [long[]]$weights,
  [int]$clusterCount
) {
  $centers = @(
    for ($cluster = 0; $cluster -lt $clusterCount; $cluster += 1) {
      ($cluster + 0.5) * $weights.Count / $clusterCount
    }
  )

  for ($iteration = 0; $iteration -lt 30; $iteration += 1) {
    $weightedPositions = [double[]]::new($clusterCount)
    $clusterWeights = [double[]]::new($clusterCount)
    for ($position = 0; $position -lt $weights.Count; $position += 1) {
      if ($weights[$position] -le 0) {
        continue
      }
      $nearestCluster = 0
      $nearestDistance = [double]::PositiveInfinity
      for ($cluster = 0; $cluster -lt $clusterCount; $cluster += 1) {
        $distance = [Math]::Abs($position - $centers[$cluster])
        if ($distance -lt $nearestDistance) {
          $nearestCluster = $cluster
          $nearestDistance = $distance
        }
      }
      $weightedPositions[$nearestCluster] += $position * $weights[$position]
      $clusterWeights[$nearestCluster] += $weights[$position]
    }

    $maximumShift = 0.0
    for ($cluster = 0; $cluster -lt $clusterCount; $cluster += 1) {
      if ($clusterWeights[$cluster] -le 0) {
        continue
      }
      $nextCenter = $weightedPositions[$cluster] / $clusterWeights[$cluster]
      $maximumShift = [Math]::Max(
        $maximumShift,
        [Math]::Abs($nextCenter - $centers[$cluster])
      )
      $centers[$cluster] = $nextCenter
    }
    if ($maximumShift -lt 0.01) {
      break
    }
  }

  $boundaries = @(0)
  for ($cluster = 0; $cluster -lt $clusterCount - 1; $cluster += 1) {
    $boundaries += [int][Math]::Round(
      ($centers[$cluster] + $centers[$cluster + 1]) / 2
    )
  }
  $boundaries += $weights.Count
  return ,$boundaries
}

function Get-VerticalAlphaWeights([System.Drawing.Bitmap]$bitmap) {
  $weights = [long[]]::new($bitmap.Height)
  for ($row = 0; $row -lt $bitmap.Height; $row += 1) {
    for ($column = 0; $column -lt $bitmap.Width; $column += 1) {
      if ($bitmap.GetPixel($column, $row).A -gt 12) {
        $weights[$row] += 1
      }
    }
  }
  return ,$weights
}

function Get-HorizontalAlphaWeights(
  [System.Drawing.Bitmap]$bitmap,
  [int]$top,
  [int]$bottom
) {
  $weights = [long[]]::new($bitmap.Width)
  for ($row = $top; $row -lt $bottom; $row += 1) {
    for ($column = 0; $column -lt $bitmap.Width; $column += 1) {
      if ($bitmap.GetPixel($column, $row).A -gt 12) {
        $weights[$column] += 1
      }
    }
  }
  return ,$weights
}

$source = [System.Drawing.Bitmap]::new($InputPath)
$workingSource = $null
try {
  if (
    -not $MagentaChromaKey -and
    (
      $source.Width -ne $cellSize * $sourceColumnCount -or
      $source.Height -ne $cellSize * $rowCount
    )
  ) {
    throw "Expected a 640x1280 sprite sheet, got $($source.Width)x$($source.Height)."
  }

  $workingSource = if ($MagentaChromaKey) {
    Remove-MagentaBackground $source
  } else {
    $source
  }

  $sourceRowBoundaries = if ($MagentaChromaKey) {
    Get-WeightedClusterBoundaries (
      Get-VerticalAlphaWeights $workingSource
    ) $rowCount
  } else {
    @(0..$rowCount | ForEach-Object { $_ * $cellSize })
  }
  $sourceColumnBoundaries = @()
  for ($directionRow = 0; $directionRow -lt $rowCount; $directionRow += 1) {
    $columnBoundaries = if ($MagentaChromaKey) {
      Get-WeightedClusterBoundaries (
        Get-HorizontalAlphaWeights `
          $workingSource `
          $sourceRowBoundaries[$directionRow] `
          $sourceRowBoundaries[$directionRow + 1]
      ) $sourceColumnCount
    } else {
      @(0..$sourceColumnCount | ForEach-Object { $_ * $cellSize })
    }
    $sourceColumnBoundaries += ,$columnBoundaries
  }

  $output = [System.Drawing.Bitmap]::new(
    $cellSize * $targetColumnCount,
    $cellSize * $rowCount,
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
          $sourceLeft = $sourceColumnBoundaries[$directionRow][$sourceColumn]
          $sourceRight = $sourceColumnBoundaries[$directionRow][$sourceColumn + 1]
          $sourceTop = $sourceRowBoundaries[$directionRow]
          $sourceBottom = $sourceRowBoundaries[$directionRow + 1]
          $sourceBounds = [System.Drawing.Rectangle]::new(
            $sourceLeft,
            $sourceTop,
            $sourceRight - $sourceLeft,
            $sourceBottom - $sourceTop
          )
          $frame = $workingSource.Clone(
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

        for ($targetColumn = 0; $targetColumn -lt $targetColumnCount; $targetColumn += 1) {
          $preparedFrame = $preparedFrames[$targetColumn]
          $visibleBounds = $preparedFrame.VisibleBounds
          $targetWidth = [int][Math]::Round($visibleBounds.Width * $sharedScale)
          $targetHeight = [int][Math]::Round($visibleBounds.Height * $sharedScale)
          $targetX = $targetColumn * $cellSize + [int][Math]::Round(($cellSize - $targetWidth) / 2)
          $passingLift = if ($targetColumn % 2 -eq 1) {
            $PassingLiftPixels
          } else {
            0
          }
          $targetY = (
            $directionRow * $cellSize +
            $baselineY -
            $targetHeight -
            $passingLift
          )
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
  if ($MagentaChromaKey -and $null -ne $workingSource) {
    $workingSource.Dispose()
  }
  $source.Dispose()
}
