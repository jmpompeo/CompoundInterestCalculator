function Start-InterestCalc {
    [CmdletBinding()]
    param (
        [Parameter()]
        [string]
        $uri = "http://localhost:7259",
        [Parameter()]
        [double]
        $StartingBalance,
        [Parameter()]
        [double]
        $InterestRate,
        [Parameter()]
        [int]
        $Years
    )

    $body = @{
        startingBalance = $StartingBalance
        interestRate = $InterestRate
        years = $Years
    } | ConvertTo-Json

    $token = (Get-AzAccessToken -ResourceUrl `
    "https://compound-interest-calculator.azurewebsites.net" ).Token

    Write-Host $token

    $headers = @{
        Authorization = "Bearer $token"
    }

    $response = Invoke-RestMethod "$uri/api/CompoundCalculator" `
    -Method "GET" -Body $body -Headers $headers -ContentType 'application/json'

    return $response
}