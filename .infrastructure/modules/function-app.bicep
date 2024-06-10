param func_app_name string = 'compound-interest-calculator'
param location string = resourceGroup().location
param app_service_plan string = 'ASP-rgInterestCalculator-976d'
param sgName string
param ai_name string

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-04-01' existing = {
   name: sgName
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: ai_name
}

resource func_app 'Microsoft.Web/sites@2023-01-01' = {
  name: func_app_name
  location: location
  tags: {
    'hidden-link: /app-insights-resource-id': '/subscriptions/626071f1-7242-4b4f-b53e-27503f20db66/resourceGroups/rgInterestCalculator/providers/Microsoft.Insights/components/ai-compound-interest'
  }

  resource bindings 'hostNameBindings@2023-01-01' = {
    name: '${func_app_name}.azurewebsites.net'
    properties: {
      siteName: func_app.name
      hostNameType: 'Verified'
    }
  }
  kind: 'functionapp'
  properties: {
    enabled: true    
    serverFarmId: asp.id    
    siteConfig: {
      numberOfWorkers: 1
      acrUseManagedIdentityCreds: false
      alwaysOn: false
      http20Enabled: false
      functionAppScaleLimit: 200
      minimumElasticInstanceCount: 0
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${sgName};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${sgName};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'APPINSIGHTS_CONNECTION_STRING'
          value: 'InstrumentationKey=${appInsights.properties.InstrumentationKey};IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'dotnet'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: 'compound-interest-calculator92de'
        }
      ]
    }    
    clientAffinityEnabled: false
    hostNamesDisabled: false    
    httpsOnly: true
    keyVaultReferenceIdentity: 'SystemAssigned'
  }
}

resource funcAppConfig 'Microsoft.Web/sites/config@2023-01-01' = {
  parent: func_app
  name: 'web'
  properties: {
    webSocketsEnabled: false
    alwaysOn: false
    cors: {
      allowedOrigins: [
        'https://localhost:5001'
        'http://localhost:8000'
        'https://functions.azure.com'
        func_app.properties.defaultHostName
      ]
      supportCredentials: false
    }
    netFrameworkVersion: 'v8.0'
    keyVaultReferenceIdentity: 'SystemAssigned'
  }
}

resource asp 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: app_service_plan
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
    size: 'Y1'
    family: 'Y'
    capacity: 0
  }
  kind: 'functionapp'
  properties: {
    perSiteScaling: false
    elasticScaleEnabled: false
    maximumElasticWorkerCount: 1
    isSpot: false
    reserved: false
    isXenon: false
    hyperV: false
    targetWorkerCount: 0
    targetWorkerSizeId: 0
    zoneRedundant: false
  }
}

output func_app_id string = func_app.id
output func_app_name string = func_app.name
output url string = func_app.properties.defaultHostName
