<#
.SYNOPSIS
  Orbital Alert Watcher - Polls ORBITAL_ALERTS.log and triggers Safe Healer v2
  Bulletproof, no race conditions, single healer at a time.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

# ============================================================================
# PATHS
# ============================================================================
$RepoRoot     = "C:\Users\eric1\Orbital-v2\orbital"
$AlertsFile   = Join-Path $RepoRoot "ORBITAL_ALERTS.log"
$LockFile     = Join-Path $RepoRoot ".healer.lock"
$HealerScript = Join-Path $RepoRoot "safe_healer_v2.ps1"
$LogFile      = Join-Path $RepoRoot "ops_logs\healer.log"

# Lock timeout in minutes
$LockTimeoutMinutes = 10

# ============================================================================
# HELPERS
# ============================================================================
function Write-WatchLog {
  param([string]$Message)
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "[$ts] [WATCHER] $Message"
  Write-Host $line

  $logDir = Join-Path $RepoRoot "ops_logs"
  if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  }
  Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue
}

function Test-LockFile {
  if (-not (Test-Path $LockFile)) {
    return $false  # No lock
  }

  try {
    $lockContent = Get-Content -Path $LockFile -Raw -ErrorAction Stop | ConvertFrom-Json
    $lockTime = [DateTime]::Parse($lockContent.timestamp)
    $age = ((Get-Date) - $lockTime).TotalMinutes

    if ($age -gt $LockTimeoutMinutes) {
      Write-WatchLog "STALE_LOCK (age: $([int]$age)m) - removing"
      Remove-Item -Path $LockFile -Force -ErrorAction SilentlyContinue
      return $false
    }

    # Lock is valid and fresh
    return $true
  }
  catch {
    # Corrupted lock file, remove it
    Remove-Item -Path $LockFile -Force -ErrorAction SilentlyContinue
    return $false
  }
}

function New-LockFile {
  $lockData = @{
    pid = $PID
    timestamp = (Get-Date).ToString("o")
  }
  $lockData | ConvertTo-Json | Out-File -FilePath $LockFile -Encoding utf8
}

function Remove-LockFile {
  Remove-Item -Path $LockFile -Force -ErrorAction SilentlyContinue
}

function Invoke-SafeHealer {
  if (Test-LockFile) {
    Write-WatchLog "HEALER_LOCKED - skipping"
    return
  }

  New-LockFile
  try {
    Write-WatchLog "TRIGGERING_HEALER"
    & powershell -ExecutionPolicy Bypass -File $HealerScript
    Write-WatchLog "HEALER_COMPLETE"
  }
  catch {
    Write-WatchLog "HEALER_ERROR: $_"
  }
  finally {
    Remove-LockFile
  }
}

# ============================================================================
# ENSURE FILES EXIST
# ============================================================================
if (-not (Test-Path $AlertsFile)) {
  New-Item -ItemType File -Path $AlertsFile -Force | Out-Null
}

# ============================================================================
# MAIN WATCH LOOP
# ============================================================================
Write-Host ""
Write-Host "=========================================="
Write-Host "  ORBITAL ALERT WATCHER v2"
Write-Host "=========================================="
Write-Host ""
Write-WatchLog "WATCHER_START"
Write-Host "Watching: $AlertsFile"
Write-Host "Healer:   $HealerScript"
Write-Host "Lock:     $LockFile"
Write-Host ""
Write-Host "Press Ctrl+C to stop."
Write-Host ""

# Track last write time
$LastWrite = (Get-Item $AlertsFile).LastWriteTime

while ($true) {
  try {
    $CurrentWrite = (Get-Item $AlertsFile -ErrorAction Stop).LastWriteTime

    if ($CurrentWrite -gt $LastWrite) {
      Write-WatchLog "CHANGE_DETECTED"
      $LastWrite = $CurrentWrite

      # Small delay to let file finish writing
      Start-Sleep -Milliseconds 500

      Invoke-SafeHealer
    }
  }
  catch {
    # File might be locked, just retry next loop
  }

  Start-Sleep -Seconds 1
}
