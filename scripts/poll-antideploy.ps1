$deviceCode = "3MdKjVkpBa5WIxSGBMeX9RjEnZ4K3mn1WoZk-w1-dRc"
$interval = 5
$maxAttempts = 180 # 15 minutes max
$attempts = 0

$antideployDir = Join-Path $HOME ".antideploy"
if (-not (Test-Path $antideployDir)) {
    New-Item -ItemType Directory -Path $antideployDir -Force | Out-Null
}
$configFile = Join-Path $antideployDir "config.json"

Write-Output "Waiting for approval in browser..."

while ($attempts -lt $maxAttempts) {
    Start-Sleep -Seconds $interval
    $attempts++
    try {
        $body = @{ deviceCode = $deviceCode } | ConvertTo-Json
        $res = Invoke-WebRequest -Uri "https://antideploy.com/api/v1/device/token" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
        
        if ($res.StatusCode -eq 200) {
            # Successful redemption! Write directly to config file without printing token
            $res.Content | Out-File -FilePath $configFile -Encoding utf8 -Force
            Write-Output "SUCCESS: Connected to Antideploy and token saved securely to config.json"
            exit 0
        }
    } catch {
        $ex = $_.Exception
        if ($ex.Response) {
            $stream = $ex.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $errBody = $reader.ReadToEnd()
            
            if ($errBody -match "authorization_pending") {
                # Still waiting for user approval
                continue
            } elseif ($errBody -match "access_denied") {
                Write-Output "ERROR: Access was denied by user."
                exit 1
            } elseif ($errBody -match "expired_token") {
                Write-Output "ERROR: Code expired. Need to restart step 2."
                exit 1
            } else {
                Write-Output "Status: $errBody"
            }
        }
    }
}

Write-Output "ERROR: Timed out waiting for approval."
exit 1
