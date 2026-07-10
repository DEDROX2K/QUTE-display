param(
  [ValidateSet("state", "command")]
  [string]$Mode = "state",
  [string]$Action = "",
  [double]$Value = 0
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class QuteMediaKeys {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern void keybd_event(byte bVk, byte bScan, int dwFlags, int dwExtraInfo);
}
"@

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].DeclaredMethods | Where-Object {
  $_.Name -eq "AsTask" -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1
})[0]

function Await-WinRt($WinRtTask, $ResultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}

function Write-Json($obj) {
  $json = $obj | ConvertTo-Json -Compress -Depth 8
  [Console]::Out.WriteLine($json)
}

function Get-AppLabel($aumid) {
  if ([string]::IsNullOrWhiteSpace($aumid)) { return "UNKNOWN" }
  $parts = $aumid -split "!"
  if ($parts.Length -ge 2) { return $parts[1] }
  return $aumid
}

function Clamp-Ticks([long]$ticks, $timeline) {
  $start = [long]$timeline.StartTime.Ticks
  $end = [long]$timeline.EndTime.Ticks
  if ($ticks -lt $start) { return $start }
  if ($end -gt 0 -and $ticks -gt $end) { return $end }
  return $ticks
}

function Send-SystemKey([byte]$virtualKey, [int]$times = 1) {
  $count = [Math]::Max(1, [Math]::Abs($times))
  for ($index = 0; $index -lt $count; $index += 1) {
    [QuteMediaKeys]::keybd_event($virtualKey, 0, 0, 0)
    Start-Sleep -Milliseconds 10
    [QuteMediaKeys]::keybd_event($virtualKey, 0, 2, 0)
    Start-Sleep -Milliseconds 20
  }
}

try {
  $manager = Await-WinRt (
    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
  ) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

  $session = $manager.GetCurrentSession()
  if ($null -eq $session) {
    Write-Json @{
      ok = $true
      available = $false
    }
    exit 0
  }

  if ($Mode -eq "command") {
    $timeline = $session.GetTimelineProperties()
    $result = $false

    switch ($Action) {
      "toggle" {
        $result = Await-WinRt ($session.TryTogglePlayPauseAsync()) ([bool])
      }
      "play" {
        $result = Await-WinRt ($session.TryPlayAsync()) ([bool])
      }
      "pause" {
        $result = Await-WinRt ($session.TryPauseAsync()) ([bool])
      }
      "next" {
        $result = Await-WinRt ($session.TrySkipNextAsync()) ([bool])
      }
      "previous" {
        $result = Await-WinRt ($session.TrySkipPreviousAsync()) ([bool])
      }
      "seek_relative" {
        $requestedTicks = [long]([math]::Round($timeline.Position.Ticks + ($Value * 10000000)))
        $requestedTicks = Clamp-Ticks $requestedTicks $timeline
        $result = Await-WinRt ($session.TryChangePlaybackPositionAsync($requestedTicks)) ([bool])
      }
      "seek_absolute" {
        $requestedTicks = [long]([math]::Round($Value * 10000000))
        $requestedTicks = Clamp-Ticks $requestedTicks $timeline
        $result = Await-WinRt ($session.TryChangePlaybackPositionAsync($requestedTicks)) ([bool])
      }
      "volume_step" {
        $stepCount = [Math]::Max(1, [int][Math]::Round([Math]::Abs($Value)))
        if ($Value -gt 0) {
          Send-SystemKey 0xAF $stepCount
        } elseif ($Value -lt 0) {
          Send-SystemKey 0xAE $stepCount
        } else {
          $stepCount = 0
        }
        $result = $true
      }
      "mute" {
        Send-SystemKey 0xAD 1
        $result = $true
      }
      default {
        Write-Json @{
          ok = $false
          available = $true
          error = "unsupported_action"
          action = $Action
        }
        exit 0
      }
    }

    Write-Json @{
      ok = [bool]$result
      available = $true
      action = $Action
    }
    exit 0
  }

  $props = Await-WinRt ($session.TryGetMediaPropertiesAsync()) (
    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]
  )
  $playback = $session.GetPlaybackInfo()
  $controls = $playback.Controls
  $timeline = $session.GetTimelineProperties()
  $status = $playback.PlaybackStatus.ToString().ToLower()
  $source = Get-AppLabel $session.SourceAppUserModelId

  Write-Json @{
    ok = $true
    available = $true
    source = $source
    app = $source
    title = $props.Title
    artist = $props.Artist
    albumTitle = $props.AlbumTitle
    status = $status
    elapsedSeconds = [math]::Round($timeline.Position.TotalSeconds, 2)
    durationSeconds = [math]::Round($timeline.EndTime.TotalSeconds, 2)
    canPlay = [bool]$controls.IsPlayEnabled
    canPause = [bool]$controls.IsPauseEnabled
    canTogglePlayPause = [bool]$controls.IsPlayPauseToggleEnabled
    canNext = [bool]$controls.IsNextEnabled
    canPrevious = [bool]$controls.IsPreviousEnabled
    canSeek = [bool]$controls.IsPlaybackPositionEnabled
  }
} catch {
  Write-Json @{
    ok = $false
    available = $false
    error = $_.Exception.Message
  }
  exit 1
}
