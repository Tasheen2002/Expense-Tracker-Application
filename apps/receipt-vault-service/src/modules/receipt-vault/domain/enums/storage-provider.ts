export enum StorageProvider {
  LOCAL = 'LOCAL',
  S3 = 'S3',
  AZURE_BLOB = 'AZURE_BLOB',
  GCS = 'GCS',
}

export function isValidStorageProvider(provider: string): provider is StorageProvider {
  return Object.values(StorageProvider).includes(provider as StorageProvider)
}

export function getStorageProviderLabel(provider: StorageProvider): string {
  const labels: Record<StorageProvider, string> = {
    [StorageProvider.LOCAL]: 'Local File System',
    [StorageProvider.S3]: 'Amazon S3',
    [StorageProvider.AZURE_BLOB]: 'Azure Blob Storage',
    [StorageProvider.GCS]: 'Google Cloud Storage',
  }

  return labels[provider]
}

export function requiresCloudConfig(provider: StorageProvider): boolean {
  return provider !== StorageProvider.LOCAL
}
