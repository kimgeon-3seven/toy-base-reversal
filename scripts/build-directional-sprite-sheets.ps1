param(
  [Parameter(Mandatory = $true)]
  [string]$InputDirectory,

  [Parameter(Mandatory = $true)]
  [string]$WalkOutput,

  [Parameter(Mandatory = $true)]
  [string]$AttackOutput
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

Add-Type -ReferencedAssemblies @(
  'System.Drawing.Common',
  'System.Drawing.Primitives'
) -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class SpriteComponentCleaner
{
    public static void RemoveSmallComponents(Bitmap bitmap, int minimumPixels)
    {
        var bounds = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
        var data = bitmap.LockBits(bounds, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        try
        {
            var bytes = new byte[Math.Abs(data.Stride) * bitmap.Height];
            Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
            var visited = new bool[bitmap.Width * bitmap.Height];
            var queue = new int[bitmap.Width * bitmap.Height];
            var component = new int[bitmap.Width * bitmap.Height];

            for (var y = 0; y < bitmap.Height; y += 1)
            {
                for (var x = 0; x < bitmap.Width; x += 1)
                {
                    var start = y * bitmap.Width + x;
                    if (visited[start] || bytes[y * data.Stride + x * 4 + 3] <= 12)
                    {
                        continue;
                    }

                    var componentCount = 0;
                    var minX = bitmap.Width;
                    var maxX = -1;
                    var head = 0;
                    var tail = 0;
                    queue[tail++] = start;
                    visited[start] = true;
                    while (head < tail)
                    {
                        var current = queue[head++];
                        component[componentCount++] = current;
                        var currentX = current % bitmap.Width;
                        var currentY = current / bitmap.Width;
                        minX = Math.Min(minX, currentX);
                        maxX = Math.Max(maxX, currentX);
                        Visit(currentX - 1, currentY);
                        Visit(currentX + 1, currentY);
                        Visit(currentX, currentY - 1);
                        Visit(currentX, currentY + 1);
                    }

                    var touchesVerticalEdge = minX <= 1 || maxX >= bitmap.Width - 2;
                    if (
                        componentCount < minimumPixels ||
                        (touchesVerticalEdge && componentCount < minimumPixels * 4)
                    )
                    {
                        for (var componentIndex = 0; componentIndex < componentCount; componentIndex += 1)
                        {
                            var pixel = component[componentIndex];
                            var pixelX = pixel % bitmap.Width;
                            var pixelY = pixel / bitmap.Width;
                            bytes[pixelY * data.Stride + pixelX * 4 + 3] = 0;
                        }
                    }

                    void Visit(int nextX, int nextY)
                    {
                        if (nextX < 0 || nextY < 0 || nextX >= bitmap.Width || nextY >= bitmap.Height)
                        {
                            return;
                        }
                        var next = nextY * bitmap.Width + nextX;
                        if (visited[next] || bytes[nextY * data.Stride + nextX * 4 + 3] <= 12)
                        {
                            return;
                        }
                        visited[next] = true;
                        queue[tail++] = next;
                    }
                }
            }

            Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
        }
        finally
        {
            bitmap.UnlockBits(data);
        }
    }
}
'@

$directions = @(
  'north',
  'northeast',
  'east',
  'southeast',
  'south',
  'southwest',
  'west',
  'northwest'
)

$cellSize = 160
$contentWidth = 140
$contentHeight = 143
$baselineY = 151
$sheetWidth = $cellSize * 4
$sheetHeight = $cellSize * $directions.Count

function New-TransparentBitmap([int]$width, [int]$height) {
  $bitmap = [System.Drawing.Bitmap]::new(
    $width,
    $height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $bitmap.SetResolution(96, 96)
  return $bitmap
}

function Remove-ChromaBackground(
  [System.Drawing.Bitmap]$source,
  [System.Drawing.Rectangle]$sourceBounds
) {
  $result = New-TransparentBitmap $sourceBounds.Width $sourceBounds.Height
  $bounds = [System.Drawing.Rectangle]::new(
    0,
    0,
    $sourceBounds.Width,
    $sourceBounds.Height
  )
  $sourceData = $source.LockBits(
    $sourceBounds,
    [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $resultData = $result.LockBits(
    $bounds,
    [System.Drawing.Imaging.ImageLockMode]::WriteOnly,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )

  try {
    $sourceBytes = [byte[]]::new([Math]::Abs($sourceData.Stride) * $sourceBounds.Height)
    $resultBytes = [byte[]]::new([Math]::Abs($resultData.Stride) * $sourceBounds.Height)
    [System.Runtime.InteropServices.Marshal]::Copy(
      $sourceData.Scan0,
      $sourceBytes,
      0,
      $sourceBytes.Length
    )

    for ($row = 0; $row -lt $sourceBounds.Height; $row += 1) {
      for ($column = 0; $column -lt $sourceBounds.Width; $column += 1) {
        $sourceIndex = $row * $sourceData.Stride + $column * 4
        $resultIndex = $row * $resultData.Stride + $column * 4
        $blue = [int]$sourceBytes[$sourceIndex]
        $green = [int]$sourceBytes[$sourceIndex + 1]
        $red = [int]$sourceBytes[$sourceIndex + 2]
        $alpha = [int]$sourceBytes[$sourceIndex + 3]
        $chromaStrength = [Math]::Min($red, $blue) - $green

        if (
          $red -gt 140 -and
          $blue -gt 100 -and
          $red -gt $green + 40 -and
          $blue -gt $green + 30 -and
          $chromaStrength -gt 10
        ) {
          $alpha = 0
        }

        $resultBytes[$resultIndex] = [byte]$blue
        $resultBytes[$resultIndex + 1] = [byte]$green
        $resultBytes[$resultIndex + 2] = [byte]$red
        $resultBytes[$resultIndex + 3] = [byte]$alpha
      }
    }

    [System.Runtime.InteropServices.Marshal]::Copy(
      $resultBytes,
      0,
      $resultData.Scan0,
      $resultBytes.Length
    )
  } finally {
    $source.UnlockBits($sourceData)
    $result.UnlockBits($resultData)
  }

  return $result
}

function Find-VisibleBounds([System.Drawing.Bitmap]$bitmap) {
  $minX = $bitmap.Width
  $minY = $bitmap.Height
  $maxX = -1
  $maxY = -1
  $bounds = [System.Drawing.Rectangle]::new(0, 0, $bitmap.Width, $bitmap.Height)
  $bitmapData = $bitmap.LockBits(
    $bounds,
    [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )

  try {
    $bytes = [byte[]]::new([Math]::Abs($bitmapData.Stride) * $bitmap.Height)
    [System.Runtime.InteropServices.Marshal]::Copy(
      $bitmapData.Scan0,
      $bytes,
      0,
      $bytes.Length
    )
    for ($row = 0; $row -lt $bitmap.Height; $row += 1) {
      for ($column = 0; $column -lt $bitmap.Width; $column += 1) {
        $index = $row * $bitmapData.Stride + $column * 4
        if ($bytes[$index + 3] -le 12) {
          continue
        }
        $minX = [Math]::Min($minX, $column)
        $minY = [Math]::Min($minY, $row)
        $maxX = [Math]::Max($maxX, $column)
        $maxY = [Math]::Max($maxY, $row)
      }
    }
  } finally {
    $bitmap.UnlockBits($bitmapData)
  }

  if ($maxX -lt $minX -or $maxY -lt $minY) {
    throw 'No visible sprite pixels remained after chroma removal.'
  }

  return [System.Drawing.Rectangle]::FromLTRB(
    $minX,
    $minY,
    $maxX + 1,
    $maxY + 1
  )
}

function Draw-NormalizedFrame(
  [System.Drawing.Graphics]$graphics,
  [System.Drawing.Bitmap]$frame,
  [System.Drawing.Rectangle]$visibleBounds,
  [int]$targetColumn,
  [int]$targetRow
) {
  $scale = [Math]::Min(
    $contentWidth / $visibleBounds.Width,
    $contentHeight / $visibleBounds.Height
  )
  $targetWidth = [int][Math]::Round($visibleBounds.Width * $scale)
  $targetHeight = [int][Math]::Round($visibleBounds.Height * $scale)
  $targetX = $targetColumn * $cellSize + [int][Math]::Round(($cellSize - $targetWidth) / 2)
  $targetY = $targetRow * $cellSize + $baselineY - $targetHeight
  $targetBounds = [System.Drawing.Rectangle]::new(
    $targetX,
    $targetY,
    $targetWidth,
    $targetHeight
  )

  $graphics.DrawImage(
    $frame,
    $targetBounds,
    $visibleBounds,
    [System.Drawing.GraphicsUnit]::Pixel
  )
}

function Get-SharedVisibleBounds([object[]]$preparedFrames) {
  if ($preparedFrames.Count -eq 0) {
    throw 'Cannot calculate shared bounds without prepared frames.'
  }

  $left = [int]::MaxValue
  $top = [int]::MaxValue
  $right = [int]::MinValue
  $bottom = [int]::MinValue
  foreach ($preparedFrame in $preparedFrames) {
    $bounds = $preparedFrame.VisibleBounds
    $left = [Math]::Min($left, $bounds.Left)
    $top = [Math]::Min($top, $bounds.Top)
    $right = [Math]::Max($right, $bounds.Right)
    $bottom = [Math]::Max($bottom, $bounds.Bottom)
  }

  return [System.Drawing.Rectangle]::FromLTRB($left, $top, $right, $bottom)
}

$walkSheet = New-TransparentBitmap $sheetWidth $sheetHeight
$attackSheet = New-TransparentBitmap $sheetWidth $sheetHeight
$walkGraphics = [System.Drawing.Graphics]::FromImage($walkSheet)
$attackGraphics = [System.Drawing.Graphics]::FromImage($attackSheet)

foreach ($graphics in @($walkGraphics, $attackGraphics)) {
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
}

try {
  for ($directionIndex = 0; $directionIndex -lt $directions.Count; $directionIndex += 1) {
    $direction = $directions[$directionIndex]
    $sourcePath = Join-Path $InputDirectory "$direction.png"
    if (-not (Test-Path -LiteralPath $sourcePath)) {
      throw "Missing source sheet: $sourcePath"
    }

    $source = [System.Drawing.Bitmap]::new($sourcePath)
    $preparedFrames = @()
    try {
      for ($animationRow = 0; $animationRow -lt 2; $animationRow += 1) {
        for ($frameIndex = 0; $frameIndex -lt 4; $frameIndex += 1) {
          $left = [int][Math]::Round($source.Width * $frameIndex / 4)
          $right = [int][Math]::Round($source.Width * ($frameIndex + 1) / 4)
          $top = [int][Math]::Round($source.Height * $animationRow / 2)
          $bottom = [int][Math]::Round($source.Height * ($animationRow + 1) / 2)
          $sourceBounds = [System.Drawing.Rectangle]::FromLTRB(
            $left,
            $top,
            $right,
            $bottom
          )
          $frame = Remove-ChromaBackground $source $sourceBounds
          $minimumComponentPixels = [Math]::Max(
            1200,
            [int][Math]::Round($frame.Width * $frame.Height * 0.03)
          )
          [SpriteComponentCleaner]::RemoveSmallComponents(
            $frame,
            $minimumComponentPixels
          )
          $preparedFrames += [PSCustomObject]@{
            Frame = $frame
            VisibleBounds = Find-VisibleBounds $frame
            AnimationRow = $animationRow
            FrameIndex = $frameIndex
          }
        }
      }

      for ($animationRow = 0; $animationRow -lt 2; $animationRow += 1) {
        $animationFrames = @(
          $preparedFrames | Where-Object { $_.AnimationRow -eq $animationRow }
        )
        $sharedBounds = Get-SharedVisibleBounds $animationFrames
        $targetGraphics = if ($animationRow -eq 0) {
          $walkGraphics
        } else {
          $attackGraphics
        }
        foreach ($preparedFrame in $animationFrames) {
          Draw-NormalizedFrame $targetGraphics $preparedFrame.Frame $sharedBounds $preparedFrame.FrameIndex $directionIndex
        }
      }
    } finally {
      foreach ($preparedFrame in $preparedFrames) {
        $preparedFrame.Frame.Dispose()
      }
      $source.Dispose()
    }
  }

  $walkDirectory = Split-Path -Parent $WalkOutput
  $attackDirectory = Split-Path -Parent $AttackOutput
  New-Item -ItemType Directory -Force -Path $walkDirectory | Out-Null
  New-Item -ItemType Directory -Force -Path $attackDirectory | Out-Null
  $walkSheet.Save($WalkOutput, [System.Drawing.Imaging.ImageFormat]::Png)
  $attackSheet.Save($AttackOutput, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $walkGraphics.Dispose()
  $attackGraphics.Dispose()
  $walkSheet.Dispose()
  $attackSheet.Dispose()
}
