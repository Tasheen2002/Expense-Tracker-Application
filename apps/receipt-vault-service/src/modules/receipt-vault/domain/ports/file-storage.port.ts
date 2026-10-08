export interface IFileStorageService {
  upload(
    file: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{
    storageKey: string;
    storageBucket: string;
  }>;
  download(key: string, bucket: string): Promise<Buffer>;
  delete(key: string, bucket: string): Promise<void>;
}

/** Optional capability implemented by remote storage providers, never by managed LOCAL storage. */
export interface ISignedFileStorageService extends IFileStorageService {
  generateSignedUrl(key: string, bucket: string): Promise<string>;
}
