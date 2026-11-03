# Keep-alive ping for Render free tier.
# Render sleeps the service after ~15 min without traffic; waking it up can take 30-40s.
# Pinging /api/health every 10 minutes keeps it warm so users never hit a cold start.
# Registered as Windows Scheduled Task: "PomodoroLifeQuest-KeepAlive" (every 10 min).
# Backup (works even when this PC is off): cron-job.org — see DEPLOY.md section 5.2.

$ErrorActionPreference = 'SilentlyContinue'
$target = 'https://pomodoro-lifequest.onrender.com/api/health'
$ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

$result = try {
    $resp = Invoke-WebRequest -Uri $target -Method GET -TimeoutSec 60 -UseBasicParsing
    "HTTP $($resp.StatusCode)"
} catch {
    "FAIL: $($_.Exception.Message)"
}

# Overwrite a tiny status file (no log growth) so the task can be verified anytime.
$statusFile = Join-Path $env:TEMP 'pomodoro-keepalive.last.log'
"$ts -> $result" | Set-Content -Path $statusFile -Encoding UTF8
