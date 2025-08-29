# Test PUT endpoint for user update - Testing differential updates
$baseUrl = "http://localhost:3001"

Write-Host "Testing user update with differential data..."
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
    $currentUser = $response.data.users[0]
    Write-Host "User ID: $userId"
    Write-Host "Current user data:"
    Write-Host "  Email: $($currentUser.email)"
    Write-Host "  First Name: $($currentUser.firstName)"
    Write-Host "  Last Name: $($currentUser.lastName)"
    Write-Host "  Status: $($currentUser.status)"
    
    # Test 1: Update with same data (should detect no changes)
    Write-Host "`nTest 1: Updating with same data..."
    $sameData = @{
        firstName = $currentUser.firstName
        lastName = $currentUser.lastName
        email = $currentUser.email
        status = $currentUser.status
    }
    
    $updateResponse1 = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users/$userId" -Method PUT -Headers $headers -Body ($sameData | ConvertTo-Json)
    Write-Host "Response: $($updateResponse1.message)"
    
    # Test 2: Update only firstName (should only update firstName)
     Write-Host "`nTest 2: Updating only firstName..."
     $partialData = @{
         firstName = "UpdatedName"
         lastName = $currentUser.lastName
         email = $currentUser.email
         status = $currentUser.status
     }
    
    $updateResponse2 = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users/$userId" -Method PUT -Headers $headers -Body ($partialData | ConvertTo-Json)
    Write-Host "Response: $($updateResponse2.message)"
    
    # Test 3: Update with completely new data
     Write-Host "`nTest 3: Updating with new email and lastName..."
     $timestamp2 = (Get-Date).ToString("yyyyMMddHHmmss")
     $newData = @{
         firstName = "UpdatedName"
         lastName = "NewLastName"
         email = "newemail$timestamp2@example.com"
         status = "active"
     }
    
    $updateResponse3 = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users/$userId" -Method PUT -Headers $headers -Body ($newData | ConvertTo-Json)
    Write-Host "Response: $($updateResponse3.message)"
    
    $overallEndTime = Get-Date
    $totalElapsed = ($overallEndTime - $overallStartTime).TotalMilliseconds
    Write-Host "`nTotal test time: $totalElapsed ms"
    Write-Host "All tests completed successfully!"
    
} catch {
    Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
    exit 1
}