function Export-ResourceTemplate {
    [CmdletBinding()]
    param (
        [string]
        $RgName,
        [string]
        $ResourceType
    )

    $resources = Get-AzResource -ResourceGroupName $RgName `
     -ResourceType $ResourceType

     foreach ($resource in $resources) {
        $outputFilePath = "C:\Users\joeyp\source\repos\CompoundInterestCalculator\Scripts\arm-templates\$($resource.Name).json"

        $armTemplate = Export-AzResourceGroup -ResourceGroupName $RgName -Resource $resource.Id -Path $outputFilePath
        ConvertTo-Bicep -Path $armTemplate -OutputDirectory 'C:\Users\joeyp\source\repos\CompoundInterestCalculator\.infrastructure\templates'
        
        Write-Host "Exported an ARM template for $($resource.Name) to $($outputFilePath)"
     }    
}