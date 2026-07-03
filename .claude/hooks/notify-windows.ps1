Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$input = Read-Host
$payload = $input | ConvertFrom-Json

$matcher = $payload.matcher

if ($matcher -eq "permission_prompt") {
    $title = "Claude Code - Permission Needed"
    $message = "Claude is waiting for your approval to continue"
    $icon = [System.Drawing.SystemIcons]::Warning
} else {
    $title = "Claude Code - Idle"
    $message = "Claude has been waiting on your input"
    $icon = [System.Drawing.SystemIcons]::Information
}

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = $icon
$notify.Visible = $true
$notify.BalloonTipTitle = $title
$notify.BalloonTipText = $message
$notify.ShowBalloonTip(8000)
Start-Sleep -Seconds 8
$notify.Dispose()
