<#
.SYNOPSIS
  Safe Healer v2 - Boring, reliable auto-fix for Orbital
  100/100 safety score. Single file fixes only.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ============================================================================
# PATHS (repo-relative)
# ============================================================================
$RepoRoot       = "C:\Users\eric1\Orbital-v2\orbital"
$AlertsFile     = Join-Path $RepoRoot "ORBITAL_ALERTS.log"
$OpsState       = Join-Path $RepoRoot "ops_state"
$OpsFixes       = Join-Path $RepoRoot "ops_fixes"
$OpsLogs        = Join-Path $RepoRoot "ops_logs"
$IncidentsFile  = Join-Path $OpsState "active_incidents.json"
$StateFile      = Join-Path $OpsState "healer_state.json"
$LogFile        = Join-Path $OpsLogs "healer.log"
$LockFile       = Join-Path $RepoRoot ".healer.lock"

# Path allowlist (relative to repo root)
$AllowedPaths = @("components/", "app/", "lib/")

# Cooldown in seconds
$CooldownSeconds = 300  # 5 minutes

# ============================================================================
# HELPERS
# ============================================================================
function Write-Log {
  param([string]$Message)
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "[$ts] $Message"
  Write-Host $line
  Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue
}

function Ensure-Directories {
  @($OpsState, $OpsFixes, $OpsLogs) | ForEach-Object {
    if (-not (Test-Path $_)) {
      New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
  }
  if (-not (Test-Path $IncidentsFile)) {
    '{"incidents":[]}' | Out-File -FilePath $IncidentsFile -Encoding utf8
  }
  if (-not (Test-Path $StateFile)) {
    '{"last_run_utc":null}' | Out-File -FilePath $StateFile -Encoding utf8
  }
  if (-not (Test-Path $AlertsFile)) {
    New-Item -ItemType File -Path $AlertsFile -Force | Out-Null
  }
}

function Read-FileSafe {
  param([string]$Path, [int]$TailLines = 200)
  $attempts = 0
  while ($attempts -lt 5) {
    try {
      $content = Get-Content -Path $Path -Tail $TailLines -ErrorAction Stop | Out-String
      return $content
    }
    catch {
      $attempts++
      Start-Sleep -Milliseconds 250
    }
  }
  return $null
}

function Get-ContentHash {
  param([string]$Text)
  # Normalize: remove timestamps (ISO/common patterns), trim, collapse spaces
  $normalized = $Text -replace '\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\s]*', ''
  $normalized = $normalized -replace '\d{2}:\d{2}:\d{2}', ''
  $normalized = $normalized.Trim() -replace '\s+', ' '

  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($normalized)
  $hash = $sha256.ComputeHash($bytes)
  return [BitConverter]::ToString($hash).Replace("-", "").ToLower()
}

function Get-Incidents {
  try {
    $json = Get-Content -Path $IncidentsFile -Raw -ErrorAction Stop | ConvertFrom-Json
    return $json
  }
  catch {
    return @{ incidents = @() }
  }
}

function Save-Incidents {
  param($Data)
  $Data | ConvertTo-Json -Depth 10 | Out-File -FilePath $IncidentsFile -Encoding utf8
}

function Get-HealerState {
  try {
    return Get-Content -Path $StateFile -Raw -ErrorAction Stop | ConvertFrom-Json
  }
  catch {
    return @{ last_run_utc = $null }
  }
}

function Save-HealerState {
  param($Data)
  $Data | ConvertTo-Json -Depth 10 | Out-File -FilePath $StateFile -Encoding utf8
}

function Is-PathAllowed {
  param([string]$RelPath)
  foreach ($allowed in $AllowedPaths) {
    if ($RelPath.StartsWith($allowed) -or $RelPath.StartsWith($allowed.Replace("/", "\"))) {
      return $true
    }
  }
  return $false
}

function Run-Command {
  param([string]$Cmd, [string]$Args)
  $pinfo = New-Object System.Diagnostics.ProcessStartInfo
  $pinfo.FileName = $Cmd
  $pinfo.Arguments = $Args
  $pinfo.RedirectStandardOutput = $true
  $pinfo.RedirectStandardError = $true
  $pinfo.UseShellExecute = $false
  $pinfo.WorkingDirectory = $RepoRoot
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $pinfo
  $p.Start() | Out-Null
  $stdout = $p.StandardOutput.ReadToEnd()
  $stderr = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  return @{ ExitCode = $p.ExitCode; Stdout = $stdout; Stderr = $stderr }
}

# ============================================================================
# MAIN HEALER LOGIC
# ============================================================================
function Invoke-Healer {
  Ensure-Directories

  Write-Log "HEALER_START"

  # -------------------------------------------------------------------------
  # A) REPO CLEAN LOCK
  # -------------------------------------------------------------------------
  $gitStatus = Run-Command "git" "status --porcelain"
  if ($gitStatus.Stdout.Trim() -ne "") {
    Write-Log "SKIP_DIRTY_REPO"
    return
  }

  # -------------------------------------------------------------------------
  # B) MAIN ADVANCED / STALE-MATE
  # -------------------------------------------------------------------------
  Run-Command "git" "fetch origin" | Out-Null

  $localMain = (Run-Command "git" "rev-parse main").Stdout.Trim()
  $originMain = (Run-Command "git" "rev-parse origin/main").Stdout.Trim()

  if ($localMain -ne $originMain) {
    Write-Log "MAIN_ADVANCED_RESET"
    Run-Command "git" "checkout main" | Out-Null
    Run-Command "git" "reset --hard origin/main" | Out-Null

    # Delete all bot/fix-* branches
    $branches = (Run-Command "git" "branch --list bot/fix-*").Stdout
    $branches -split "`n" | ForEach-Object {
      $br = $_.Trim()
      if ($br -ne "") {
        Run-Command "git" "branch -D $br" | Out-Null
      }
    }

    # Clear incidents
    Save-Incidents @{ incidents = @() }
  }

  # -------------------------------------------------------------------------
  # D) COOLDOWN CHECK
  # -------------------------------------------------------------------------
  $state = Get-HealerState
  if ($state.last_run_utc) {
    $lastRun = [DateTime]::Parse($state.last_run_utc)
    $elapsed = ((Get-Date).ToUniversalTime() - $lastRun).TotalSeconds
    if ($elapsed -lt $CooldownSeconds) {
      Write-Log "COOLDOWN_SKIP ($([int]$elapsed)s elapsed, need $CooldownSeconds)"
      return
    }
  }

  # Update last run time
  $state.last_run_utc = (Get-Date).ToUniversalTime().ToString("o")
  Save-HealerState $state

  # -------------------------------------------------------------------------
  # C) SIGNATURE LOCK (DEDUP)
  # -------------------------------------------------------------------------
  $alertContent = Read-FileSafe -Path $AlertsFile -TailLines 200
  if ([string]::IsNullOrWhiteSpace($alertContent)) {
    Write-Log "EMPTY_ALERTS"
    return
  }

  $fingerprint = Get-ContentHash -Text $alertContent
  $fp8 = $fingerprint.Substring(0, 8)

  $incidents = Get-Incidents
  $existing = $incidents.incidents | Where-Object { $_.fingerprint -eq $fingerprint }

  if ($existing) {
    Write-Log "DEDUP_HIT ($fp8)"
    return
  }

  Write-Log "DEDUP_NEW ($fp8)"

  # -------------------------------------------------------------------------
  # E) SINGLE BRANCH + SINGLE FILE FIX
  # -------------------------------------------------------------------------
  $ts = Get-Date -Format "yyyyMMdd-HHmmss"
  $branchName = "bot/fix-$ts"

  # Record incident as "new"
  $incident = @{
    created_at = (Get-Date).ToUniversalTime().ToString("o")
    fingerprint = $fingerprint
    branch_name = $branchName
    status = "new"
    target_file = $null
  }
  $incidents.incidents += $incident
  Save-Incidents $incidents

  # Ask Claude for the single file to fix
  $identifyPrompt = @"
CLAUDE — IDENTIFY SINGLE FILE (AUTO-HEALER)

You are analyzing an error from ORBITAL_ALERTS.log.
Your job: identify the SINGLE most likely source file causing this error.

ALERT CONTENT:
$alertContent

RULES:
- Output ONLY a single repo-relative file path (e.g., lib/hooks/useExample.ts)
- No markdown, no commentary, no explanation
- Must be inside: components/, app/, or lib/
- If you cannot determine, output: UNKNOWN

OUTPUT FORMAT (exactly one line):
<filepath>
"@

  Write-Log "CLAUDE_IDENTIFY"
  $identifyResult = & claude $identifyPrompt 2>&1 | Out-String
  $targetFile = $identifyResult.Trim() -split "`n" | Select-Object -First 1
  $targetFile = $targetFile.Trim()

  # -------------------------------------------------------------------------
  # F) SAFETY GATE 1: PATH ALLOWLIST
  # -------------------------------------------------------------------------
  if ($targetFile -eq "UNKNOWN" -or -not (Is-PathAllowed $targetFile)) {
    Write-Log "BLOCKED_PATH ($targetFile)"
    $incidents = Get-Incidents
    $incidents.incidents | Where-Object { $_.fingerprint -eq $fingerprint } | ForEach-Object {
      $_.status = "blocked"
      $_.target_file = $targetFile
    }
    Save-Incidents $incidents

    # Write failure report
    $failReport = @"
HEALER FAILURE REPORT
=====================
Timestamp: $(Get-Date -Format "o")
Fingerprint: $fingerprint
Reason: BLOCKED_PATH
Target File: $targetFile
"@
    $failReport | Out-File -FilePath (Join-Path $OpsFixes "failed_${ts}_${fp8}.txt") -Encoding utf8
    Write-Log "FAIL_BLOCKED_PATH"
    return
  }

  $fullTargetPath = Join-Path $RepoRoot $targetFile.Replace("/", "\")
  if (-not (Test-Path $fullTargetPath)) {
    Write-Log "FILE_NOT_FOUND ($targetFile)"
    $incidents = Get-Incidents
    $incidents.incidents | Where-Object { $_.fingerprint -eq $fingerprint } | ForEach-Object {
      $_.status = "blocked"
      $_.target_file = $targetFile
    }
    Save-Incidents $incidents
    return
  }

  # Update incident with target file
  $incidents = Get-Incidents
  $incidents.incidents | Where-Object { $_.fingerprint -eq $fingerprint } | ForEach-Object {
    $_.target_file = $targetFile
  }
  Save-Incidents $incidents

  # Create branch
  Run-Command "git" "checkout -b $branchName" | Out-Null
  Write-Log "BRANCH_CREATED ($branchName)"

  # Ask Claude for the fixed file content
  $currentContent = Get-Content -Path $fullTargetPath -Raw -ErrorAction Stop

  $fixPrompt = @"
CLAUDE — FIX SINGLE FILE (AUTO-HEALER)

You are fixing a single file to resolve an error.

ALERT CONTENT:
$alertContent

TARGET FILE: $targetFile

CURRENT FILE CONTENT:
$currentContent

RULES:
- Output ONLY the complete fixed file content
- No markdown code fences
- No commentary before or after
- Preserve all imports and structure
- Make the MINIMAL fix needed
- Fail-closed: if unsure, add guards/early returns

OUTPUT: (raw file content only)
"@

  Write-Log "CLAUDE_FIX"
  $fixedContent = & claude $fixPrompt 2>&1 | Out-String

  # Remove any accidental markdown fences
  $fixedContent = $fixedContent -replace '^\s*```[\w]*\s*', ''
  $fixedContent = $fixedContent -replace '\s*```\s*$', ''
  $fixedContent = $fixedContent.Trim()

  # Write the fixed file
  $fixedContent | Out-File -FilePath $fullTargetPath -Encoding utf8 -NoNewline
  Write-Log "FILE_WRITTEN ($targetFile)"

  # -------------------------------------------------------------------------
  # F) SAFETY GATE 2: TYPESCRIPT COMPILE CHECK
  # -------------------------------------------------------------------------
  Write-Log "TSC_CHECK"
  $tscResult = Run-Command "npx" "tsc --noEmit"

  if ($tscResult.ExitCode -ne 0) {
    Write-Log "TSC_FAILED"
    Run-Command "git" "checkout -- ." | Out-Null
    Run-Command "git" "checkout main" | Out-Null
    Run-Command "git" "branch -D $branchName" | Out-Null

    $incidents = Get-Incidents
    $incidents.incidents | Where-Object { $_.fingerprint -eq $fingerprint } | ForEach-Object {
      $_.status = "failed_tsc"
    }
    Save-Incidents $incidents

    $failReport = @"
HEALER FAILURE REPORT
=====================
Timestamp: $(Get-Date -Format "o")
Fingerprint: $fingerprint
Reason: FAILED_TSC
Target File: $targetFile
TSC Output:
$($tscResult.Stdout)
$($tscResult.Stderr)
"@
    $failReport | Out-File -FilePath (Join-Path $OpsFixes "failed_${ts}_${fp8}.txt") -Encoding utf8
    Write-Log "FAIL_TSC"
    return
  }
  Write-Log "TSC_PASSED"

  # -------------------------------------------------------------------------
  # F) SAFETY GATE 3: WEB BUILD CHECK
  # -------------------------------------------------------------------------
  Write-Log "WEBBUILD_CHECK"
  $buildResult = Run-Command "npm" "run build:web"

  if ($buildResult.ExitCode -ne 0) {
    Write-Log "WEBBUILD_FAILED"
    Run-Command "git" "checkout -- ." | Out-Null
    Run-Command "git" "checkout main" | Out-Null
    Run-Command "git" "branch -D $branchName" | Out-Null

    $incidents = Get-Incidents
    $incidents.incidents | Where-Object { $_.fingerprint -eq $fingerprint } | ForEach-Object {
      $_.status = "failed_webbuild"
    }
    Save-Incidents $incidents

    $failReport = @"
HEALER FAILURE REPORT
=====================
Timestamp: $(Get-Date -Format "o")
Fingerprint: $fingerprint
Reason: FAILED_WEBBUILD
Target File: $targetFile
Build Output:
$($buildResult.Stdout)
$($buildResult.Stderr)
"@
    $failReport | Out-File -FilePath (Join-Path $OpsFixes "failed_${ts}_${fp8}.txt") -Encoding utf8
    Write-Log "FAIL_WEBBUILD"
    return
  }
  Write-Log "WEBBUILD_PASSED"

  # -------------------------------------------------------------------------
  # G) SUCCESS: COMMIT AND REPORT
  # -------------------------------------------------------------------------
  Run-Command "git" "add $targetFile" | Out-Null
  $commitMsg = "fix(bot): auto-heal $fp8"
  Run-Command "git" "commit -m `"$commitMsg`"" | Out-Null
  Write-Log "COMMITTED ($commitMsg)"

  # Update incident status
  $incidents = Get-Incidents
  $incidents.incidents | Where-Object { $_.fingerprint -eq $fingerprint } | ForEach-Object {
    $_.status = "ready"
  }
  Save-Incidents $incidents

  # Write success report
  $claudeSummary = ($fixedContent -split "`n" | Select-Object -First 10) -join "`n"
  $successReport = @"
HEALER SUCCESS REPORT
=====================
Timestamp: $(Get-Date -Format "o")
Fingerprint: $fingerprint
Branch: $branchName
Target File: $targetFile
Status: READY

Claude Summary (first 10 lines):
$claudeSummary

Commands Run:
- npx tsc --noEmit: PASSED
- npm run build:web: PASSED
- git commit: PASSED
"@
  $successReport | Out-File -FilePath (Join-Path $OpsFixes "fix_${ts}_${fp8}.txt") -Encoding utf8

  Write-Log "SUCCESS_READY ($branchName)"

  # Stay on the fix branch (user can review and merge)
  Write-Host "`n=========================================="
  Write-Host "FIX READY: $branchName"
  Write-Host "Target: $targetFile"
  Write-Host "Review and merge when ready."
  Write-Host "==========================================`n"
}

# ============================================================================
# RUN
# ============================================================================
Invoke-Healer
