# Live Endpoint Automated Test Suite for Omni Telemetry App
# Verifies:
# 1. GET /api/health -> 200 OK
# 2. POST /api/telemetry (401 without x-api-key, 200 with valid key and paired events)
# 3. POST /api/insights -> 200 OK with strict 3-card schema
# 4. GET /api/sheets?action=template -> 200 OK with Google Apps Script code

$BaseUrl = "http://localhost:3000"
$ApiKey = "a7a00b168ea20c8ba6344fe9518bbbdd9bca6edf1a54265e429b0f33ad31e3d8"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  OMNI TELEMETRY LIVE ENDPOINT AUTOMATED VERIFICATION SUITE  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Target Base URL: $BaseUrl"
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') UTC"
Write-Host ""

$results = @()

function Run-CurlTest {
    param (
        [string]$Name,
        [string]$Method,
        [string]$Path,
        [hashtable]$Headers,
        [string]$Body = $null,
        [int]$ExpectedStatus
    )

    $url = "$BaseUrl$Path"
    $headerArgs = @()
    foreach ($k in $Headers.Keys) {
        $headerArgs += "-H"
        $headerArgs += "$($k): $($Headers[$k])"
    }

    $tmpFile = [System.IO.Path]::GetTempFileName()
    if ($Body) {
        Set-Content -Path $tmpFile -Value $Body -Encoding UTF8
    }

    $argsList = @("-s", "-w", "`n%{http_code}`n%{time_total}", "-X", $Method, $url)
    $argsList += $headerArgs

    if ($Body) {
        $argsList += "--data-binary"
        $argsList += "@$tmpFile"
    }

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $rawOutput = & curl.exe @argsList
    $stopwatch.Stop()

    if (Test-Path $tmpFile) { Remove-Item $tmpFile -Force }

    $lines = ($rawOutput -split "`r?`n") | Where-Object { $_ -ne "" }
    $timeTotalStr = $lines[-1]
    $statusCodeStr = $lines[-2]
    $responseBody = ($lines[0..($lines.Length - 3)]) -join "`n"

    $statusCode = [int]$statusCodeStr
    $durationMs = [Math]::Round([double]$timeTotalStr * 1000, 2)
    $pass = ($statusCode -eq $ExpectedStatus)

    $statusColor = if ($pass) { "Green" } else { "Red" }
    $passText = if ($pass) { "[PASS]" } else { "[FAIL]" }

    Write-Host "$passText $Name" -ForegroundColor $statusColor
    Write-Host "       Method/Path : $Method $Path" -ForegroundColor Gray
    Write-Host "       HTTP Status : $statusCode (Expected: $ExpectedStatus)" -ForegroundColor Gray
    Write-Host "       Latency     : ${durationMs}ms" -ForegroundColor Gray

    return [PSCustomObject]@{
        Name           = $Name
        Method         = $Method
        Path           = $Path
        ExpectedStatus = $ExpectedStatus
        ActualStatus   = $statusCode
        LatencyMs      = $durationMs
        Passed         = $pass
        ResponseSample = $responseBody
    }
}

# 1. Health Endpoint
$t1 = Run-CurlTest -Name "GET /api/health (System & Services Health)" `
    -Method "GET" `
    -Path "/api/health" `
    -Headers @{} `
    -ExpectedStatus 200
$results += $t1

# 2. Telemetry 401 Unauthorized
$t2 = Run-CurlTest -Name "POST /api/telemetry (401 without x-api-key)" `
    -Method "POST" `
    -Path "/api/telemetry" `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body '{"event":"manual","label":"Instagram","durationMinutes":15}' `
    -ExpectedStatus 401
$results += $t2

# 3. Telemetry 200 with valid key (Manual Event)
$t3 = Run-CurlTest -Name "POST /api/telemetry (200 Authenticated Manual Event)" `
    -Method "POST" `
    -Path "/api/telemetry" `
    -Headers @{ "Content-Type" = "application/json"; "x-api-key" = $ApiKey } `
    -Body '{"event":"manual","label":"Deep Architecture Review","category":"focus","durationMinutes":45}' `
    -ExpectedStatus 200
$results += $t3

# 4. Telemetry 200 Paired Event: app_open
$t4 = Run-CurlTest -Name "POST /api/telemetry (200 Paired Event 1: app_open)" `
    -Method "POST" `
    -Path "/api/telemetry" `
    -Headers @{ "Content-Type" = "application/json"; "x-api-key" = $ApiKey } `
    -Body '{"event":"app_open","label":"YouTube Shorts","category":"wasted"}' `
    -ExpectedStatus 200
$results += $t4

Start-Sleep -Seconds 1

# 5. Telemetry 200 Paired Event: app_close
$t5 = Run-CurlTest -Name "POST /api/telemetry (200 Paired Event 2: app_close - session paired)" `
    -Method "POST" `
    -Path "/api/telemetry" `
    -Headers @{ "Content-Type" = "application/json"; "x-api-key" = $ApiKey } `
    -Body '{"event":"app_close","label":"YouTube Shorts"}' `
    -ExpectedStatus 200
$results += $t5

# 6. Insights 3-Card Strict Schema
$insightsPayload = @'
{
  "blocks": [
    {
      "id": "t-1",
      "startTime": "14:00",
      "endTime": "15:45",
      "durationMinutes": 105,
      "label": "Instagram Reels",
      "category": "wasted",
      "tag": "Doomscrolling",
      "source": "shortcut"
    },
    {
      "id": "t-2",
      "startTime": "09:30",
      "endTime": "11:30",
      "durationMinutes": 120,
      "label": "Omni Architecture Core",
      "category": "focus",
      "tag": "Coding",
      "source": "manual"
    }
  ]
}
'@

$t6 = Run-CurlTest -Name "POST /api/insights (200 OK Strict 3-Card Schema)" `
    -Method "POST" `
    -Path "/api/insights" `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body $insightsPayload `
    -ExpectedStatus 200
$results += $t6

# Verify 3 cards in insights response
try {
    $insightJson = $t6.ResponseSample | ConvertFrom-Json
    $cardCount = $insightJson.insights.Count
    $hasLeak = ($insightJson.insights | Where-Object { $_.type -eq 'leak_window' }) -ne $null
    $hasSpiral = ($insightJson.insights | Where-Object { $_.type -eq 'spiral_chain' }) -ne $null
    $hasForecast = ($insightJson.insights | Where-Object { $_.type -eq 'reclaim_forecast' }) -ne $null
    Write-Host "       [Schema Check] Cards: $cardCount (Leak Window: $hasLeak, Spiral Chain: $hasSpiral, Forecast: $hasForecast)" -ForegroundColor Cyan
} catch {
    Write-Host "       [Schema Check Error] Could not parse insights JSON" -ForegroundColor Red
}

# 7. Google Sheets Template Generator
$t7 = Run-CurlTest -Name "GET /api/sheets?action=template (200 OK Apps Script Code)" `
    -Method "GET" `
    -Path "/api/sheets?action=template" `
    -Headers @{} `
    -ExpectedStatus 200
$results += $t7

# Verify template content
try {
    $sheetsJson = $t7.ResponseSample | ConvertFrom-Json
    $hasScript = $sheetsJson.code -like "*Google Apps Script Bridge*"
    Write-Host "       [Code Check] Apps Script Bridge Code Included: $hasScript (Length: $($sheetsJson.code.Length) chars)" -ForegroundColor Cyan
} catch {
    Write-Host "       [Code Check Error] Could not parse sheets JSON" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                      TEST SUMMARY                          " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
$passedCount = ($results | Where-Object { $_.Passed }).Count
$totalCount = $results.Count
$avgLatency = [Math]::Round(($results | Measure-Object -Property LatencyMs -Average).Average, 2)

Write-Host "Total Tests Run : $totalCount"
Write-Host "Passed          : $passedCount / $totalCount" -ForegroundColor Green
Write-Host "Failed          : $($totalCount - $passedCount)" -ForegroundColor $(if ($totalCount -eq $passedCount) { "Green" } else { "Red" })
Write-Host "Average Latency : ${avgLatency}ms"
Write-Host "============================================================" -ForegroundColor Cyan
