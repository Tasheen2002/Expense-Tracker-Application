export interface IFileStorageService {
  upload(
    file: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{
    storageKey: string;
    storageBucket: string;
    publicUrl?: string;
  }>;
  download(key: string, bucket: string): Promise<Buffer>;
  delete(key: string, bucket: string): Promise<void>;
  generateSignedUrl(key: string, bucket: string): Promise<string>;
}
