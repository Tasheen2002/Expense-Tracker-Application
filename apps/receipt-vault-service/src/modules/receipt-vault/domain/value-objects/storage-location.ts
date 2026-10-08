import { StorageProvider, isValidStorageProvider } from "../enums/storage-provider";
import { InvalidStorageConfigurationError } from "../errors/receipt.errors";

export interface StorageLocationProps {
  provider: StorageProvider;
  bucket?: string;
  key?: string;
}

export class StorageLocation {
  private constructor(private readonly props: StorageLocationProps) {
    this.props = Object.freeze({ ...props });
    this.validate();
  }

  static create(props: StorageLocationProps): StorageLocation {
    return new StorageLocation(props);
  }

  static createLocal(key: string): StorageLocation {
    return new StorageLocation({
      provider: StorageProvider.LOCAL,
      bucket: 'local',
      key,
    });
  }

  static createS3(bucket: string, key: string): StorageLocation {
    return new StorageLocation({
      provider: StorageProvider.S3,
      bucket,
      key,
    });
  }

  static createAzureBlob(container: string, blobName: string): StorageLocation {
    return new StorageLocation({
      provider: StorageProvider.AZURE_BLOB,
      bucket: container,
      key: blobName,
    });
  }

  static createGCS(bucket: string, objectName: string): StorageLocation {
    return new StorageLocation({
      provider: StorageProvider.GCS,
      bucket,
      key: objectName,
    });
  }

  private validate(): void {
    if (!isValidStorageProvider(this.props.provider)) {
      throw new InvalidStorageConfigurationError(
        "Storage provider cannot be empty",
      );
    }

    if (!this.props.key || this.props.key.length > 500 || !this.props.key.trim()) throw new InvalidStorageConfigurationError('A storage key of at most 500 characters is required');
    if (this.props.bucket !== undefined && (!this.props.bucket.trim() || this.props.bucket.length > 255)) throw new InvalidStorageConfigurationError('Invalid storage bucket');
    if (this.props.provider === StorageProvider.LOCAL && this.props.bucket !== undefined && this.props.bucket !== 'local') throw new InvalidStorageConfigurationError('LOCAL bucket must be local');
    // Cloud providers require bucket and key
    if (this.props.provider !== StorageProvider.LOCAL) {
      if (!this.props.bucket || this.props.bucket.trim().length === 0) {
        throw new InvalidStorageConfigurationError(
          `Bucket/container name is required for ${this.props.provider}`,
        );
      }

      if (!this.props.key || this.props.key.trim().length === 0) {
        throw new InvalidStorageConfigurationError(
          `Storage key/blob name is required for ${this.props.provider}`,
        );
      }
    }
  }

  getProvider(): StorageProvider {
    return this.props.provider;
  }

  getBucket(): string | undefined {
    return this.props.bucket;
  }

  getKey(): string | undefined {
    return this.props.key;
  }

  isLocal(): boolean {
    return this.props.provider === StorageProvider.LOCAL;
  }

  isCloud(): boolean {
    return this.props.provider !== StorageProvider.LOCAL;
  }

  getFullPath(): string {
    if (this.isLocal()) {
      return "local-storage";
    }

    return `${this.props.provider}://${this.props.bucket}/${this.props.key}`;
  }
}
