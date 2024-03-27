resource asp 'Microsoft.Web/serverfarms@2023-01-01' existing = {
  name: 'ASP-rgInterestCalculator-976d'
}

resource func_app 'Microsoft.Web/sites@2023-01-01' existing = {
  name: 'compound-interest-calculator'
}

resource app_insights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: 'ai-compound-interest'
}
