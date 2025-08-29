# Simple test script untuk mengukur waktu update user
$baseUrl = "http://localhost:3001"

Write-Host "Testing user update performance..."
$overallStartTime = Get-Date

# Login admin first to get valid token
Write-Host "Logging in as admin..."
try {
    $loginData = @{
        email = "admin@cex.com"
        password = "Admin123!@#"
    }
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/auth/login" -Method POST -Body ($loginData | ConvertTo-Json) -ContentType "application/json"
    $adminToken = $loginResponse.data.token
    Write-Host "Admin login successful"
    
    # Get user list
    $startTime = Get-Date
    Write-Host "Getting user list..."
    
    $headers = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users?page=1&limit=1" -Method GET -Headers $headers
    $userId = $response.data.users[0].id
    Write-Host "User ID: $userId"
    
    $getTime = Get-Date
    $getElapsed = ($getTime - $startTime).TotalMilliseconds
    Write-Host "GET request took: $getElapsed ms"
    
    # Update user
    Write-Host "Updating user..."
    $updateStartTime = Get-Date
    
    # Generate unique email with timestamp
    $timestamp = (Get-Date).ToString("yyyyMMddHHmmss")
    $updateData = @{
        firstName = "Updated"
        lastName = "User"
        email = "updated$timestamp@example.com"
        status = "active"
    }
    
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users/$userId" -Method PUT -Headers $headers -Body ($updateData | ConvertTo-Json)
    
    $updateEndTime = Get-Date
    $updateElapsed = ($updateEndTime - $updateStartTime).TotalMilliseconds
    
    Write-Host "PUT request took: $updateElapsed ms"
    Write-Host "Total time: $(($updateEndTime - $startTime).TotalMilliseconds) ms"
    Write-Host "Update successful!"
    
} catch {
    $errorTime = Get-Date
    $errorElapsed = ($errorTime - $overallStartTime).TotalMilliseconds
    Write-Host "Error after $errorElapsed ms: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode"
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error Body: $errorBody"
        } catch {
            Write-Host "Could not parse error response"
        }
    }
    exit 1
}