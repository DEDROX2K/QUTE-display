# Emits one JSON object per line to stdout when Windows notifications or media change.
$ErrorActionPreference = "SilentlyContinue"

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$null = [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime]

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].DeclaredMethods | Where-Object {
  $_.Name -eq "AsTask" -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1
})[0]

function Await-WinRt($WinRtTask, $ResultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}

function Write-Event($obj) {
  $json = $obj | ConvertTo-Json -Compress
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
}

function Get-ToastTexts($userNotification) {
  $title = ""
  $body = ""
  try {
    $xmlContent = $userNotification.Notification.Content.GetXml()
    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $xml.LoadXml($xmlContent)
    $texts = $xml.GetElementsByTagName("text")
    if ($texts.Length -ge 1) { $title = $texts.Item(0).InnerText }
    if ($texts.Length -ge 2) { $body = $texts.Item(1).InnerText }
  } catch {}
  return @{ Title = $title; Body = $body }
}

function Get-AppLabel($aumid) {
  if ([string]::IsNullOrWhiteSpace($aumid)) { return "NOTIFICATION" }
  $parts = $aumid -split "!"
  if ($parts.Length -ge 2) { return $parts[1] }
  return $aumid
}

$listener = [Windows.UI.Notifications.Management.UserNotificationListener]::Current
$access = Await-WinRt ($listener.RequestAccessAsync()) ([Windows.UI.Notifications.Management.UserNotificationAccessStatus])
$notificationAccess = $access.ToString()

if ($notificationAccess -ne "Allowed") {
  Write-Event @{
    type    = "bridge"
    status  = "notification_access_denied"
    message = "Turn on notification access for this bridge in Windows Settings > Privacy > Notifications"
  }
}

$seenIds = @{}
$notificationsPrimed = $false
$mediaPrimed = $false
$lastMediaKey = ""

while ($true) {
  if ($notificationAccess -eq "Allowed") {
    try {
      $notifications = Await-WinRt (
        $listener.GetNotificationsAsync([Windows.UI.Notifications.Management.KnownNotificationKinds]::Toast)
      ) ([System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.Management.UserNotification]])

      if (-not $notificationsPrimed) {
        foreach ($n in $notifications) {
          $seenIds[$n.Id] = $true
        }
        $notificationsPrimed = $true
      } else {
        foreach ($n in $notifications) {
          $id = $n.Id
          if ($seenIds.ContainsKey($id)) { continue }
          $seenIds[$id] = $true

          $texts = Get-ToastTexts $n
          $app = Get-AppLabel $n.AppInfo.AppUserModelId
          if (-not $texts.Title -and -not $texts.Body) { continue }

          Write-Event @{
            type  = "notification"
            app   = $app
            title = $texts.Title
            body  = $texts.Body
          }
        }
      }
    } catch {}
  }

  try {
    $manager = Await-WinRt (
      [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
    ) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

    $session = $manager.GetCurrentSession()
    if ($null -ne $session) {
      $props = Await-WinRt ($session.TryGetMediaPropertiesAsync()) (
        [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]
      )
      $playback = $session.GetPlaybackInfo()
      $status = $playback.PlaybackStatus.ToString().ToLower()
      $title = $props.Title
      $artist = $props.Artist
      $appLabel = Get-AppLabel $session.SourceAppUserModelId
      $key = "$title|$artist|$status|$appLabel"

      if (-not $mediaPrimed) {
        $lastMediaKey = $key
        $mediaPrimed = $true
      } elseif ($key -ne $lastMediaKey -and ($title -or $artist)) {
        $lastMediaKey = $key
        Write-Event @{
          type   = "music"
          title  = $title
          artist = $artist
          status = $status
          app    = $appLabel
        }
      }
    } elseif ($mediaPrimed -and $lastMediaKey -ne "") {
      $lastMediaKey = ""
    }
  } catch {}

  Start-Sleep -Milliseconds 500
}
