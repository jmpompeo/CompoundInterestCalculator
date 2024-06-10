param funcAppName string = 'compound-interest-calculator'
param appInsightsName string = 'ai-compound-interest'
param sgName string = 'rginterestcalculatob0b7'
param location string = resourceGroup().location

module funcApp 'modules/function-app.bicep' = {
  name: funcAppName
  params: {
    location: location
    sgName: storageAccount.name
    ai_name: appInsights.name
  }
}

module appInsights 'modules/app-insights.bicep' = {
  name: appInsightsName
  params: {
    location: location
  }  
}

module storageAccount 'modules/storage.bicep' = {
  name: sgName
  params: {
    location: location
  }
}

output func_app_name string = funcApp.name
output func_app_id string = funcApp.outputs.func_app_id
output func_url string = funcApp.outputs.url



