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
    }

    $token = (Get-AzAccessToken -ResourceUrl `
    "https://compound-interest-calculator.azurewebsites.net" ).Token

    $headers = @{
        Authorization = "Bearer $token"
    }

    $response = Invoke-RestMethod "$uri/api/InterestCalculation" `
    -Method "GET" -Body ($body | ConvertTo-Json) -Headers $headers

    return $response


}