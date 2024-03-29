resource storage_account 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: 'rginterestcalculatob0b7'  
}

output storageId string = storage_account.id
