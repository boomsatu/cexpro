# Test script untuk menguji error messages dari backend

$baseUrl = "http://localhost:3001"
$adminEmail = "admin@cex.com"
$adminPassword = "admin123"

Write-Host "Testing error messages from backend..." -ForegroundColor Yellow

try {
    # Login sebagai admin
    Write-Host "Logging in as admin..." -ForegroundColor Cyan
    $loginData = @{
        email = $adminEmail
        password = $adminPassword
    }
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/auth/login" -Method POST -Body ($loginData | ConvertTo-Json) -ContentType "application/json"
    $token = $loginResponse.data.access_token
    Write-Host "Admin login successful" -ForegroundColor Green
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # Get user untuk testing
    Write-Host "Getting user list..." -ForegroundColor Cyan
    $usersResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users?page=1&limit=5" -Method GET -Headers $headers
    $userId = $usersResponse.data.users[0].id
    Write-Host "User ID: $userId" -ForegroundColor White
    
    # Test 1: Invalid firstName (dengan angka)
    Write-Host "`nTest 1: Invalid firstName (dengan angka)..." -ForegroundColor Yellow
    try {
        $invalidData = @{
            firstName = "John123"  # Invalid: mengandung angka
        }
        
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users/$userId" -Method PUT -Headers $headers -Body ($invalidData | ConvertTo-Json)
        Write-Host "Response: $($response.message)" -ForegroundColor Red
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
            Write-Host "Error Message: $($errorBody.message)" -ForegroundColor Red
            if ($errorBody.errors) {
                Write-Host "Validation Errors:" -ForegroundColor Red
                foreach ($error in $errorBody.errors) {
                    Write-Host "  - Field: $($error.field), Message: $($error.message)" -ForegroundColor Red
                }
            }
        } catch {
            Write-Host "Could not parse error response" -ForegroundColor Red
        }
    }
    
    # Test 2: Invalid email format
    Write-Host "`nTest 2: Invalid email format..." -ForegroundColor Yellow
    try {
        $invalidData = @{
            email = "invalid-email"  # Invalid email format
        }
        
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users/$userId" -Method PUT -Headers $headers -Body ($invalidData | ConvertTo-Json)
        Write-Host "Response: $($response.message)" -ForegroundColor Red
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
            Write-Host "Error Message: $($errorBody.message)" -ForegroundColor Red
            if ($errorBody.errors) {
                Write-Host "Validation Errors:" -ForegroundColor Red
                foreach ($error in $errorBody.errors) {
                    Write-Host "  - Field: $($error.field), Message: $($error.message)" -ForegroundColor Red
                }
            }
        } catch {
            Write-Host "Could not parse error response" -ForegroundColor Red
        }
    }
    
    # Test 3: Invalid country code (lebih dari 2 karakter)
    Write-Host "`nTest 3: Invalid country code..." -ForegroundColor Yellow
    try {
        $invalidData = @{
            country = "USA"  # Invalid: harus 2 karakter
        }
        
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users/$userId" -Method PUT -Headers $headers -Body ($invalidData | ConvertTo-Json)
        Write-Host "Response: $($response.message)" -ForegroundColor Red
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
            Write-Host "Error Message: $($errorBody.message)" -ForegroundColor Red
            if ($errorBody.errors) {
                Write-Host "Validation Errors:" -ForegroundColor Red
                foreach ($error in $errorBody.errors) {
                    Write-Host "  - Field: $($error.field), Message: $($error.message)" -ForegroundColor Red
                }
            }
        } catch {
            Write-Host "Could not parse error response" -ForegroundColor Red
        }
    }
    
    # Test 4: Invalid user ID (non-existent)
    Write-Host "`nTest 4: Invalid user ID (non-existent)..." -ForegroundColor Yellow
    try {
        $validData = @{
            firstName = "ValidName"
        }
        
        $fakeUserId = "99999999-9999-9999-9999-999999999999"
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users/$fakeUserId" -Method PUT -Headers $headers -Body ($validData | ConvertTo-Json)
        Write-Host "Response: $($response.message)" -ForegroundColor Red
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
            Write-Host "Error Message: $($errorBody.error)" -ForegroundColor Red
        } catch {
            Write-Host "Could not parse error response" -ForegroundColor Red
        }
    }
    
    Write-Host "`nAll error message tests completed!" -ForegroundColor Green
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
    exit 1
}