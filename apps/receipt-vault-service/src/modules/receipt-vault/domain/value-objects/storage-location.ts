import { StorageProvider } from "../enums/storage-provider";
import { InvalidStorageConfigurationError } from "../errors/receipt.errors";

export interface StorageLocationProps {
  provider: StorageProvider;
  bucket?: string;
  key?: string;
}

export class StorageLocation {
  private constructor(private readonly props: StorageLocationProps) {
    this.validate();
  }

  static create(props: StorageLocationProps): StorageLocation {
    return new StorageLocation(props);
  }

  static createLocal(): StorageLocation {
    return new StorageLocation({
      provider: StorageProvider.LOCAL,
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
    if (!this.props.provider) {
      throw new InvalidStorageConfigurationError(
        "Storage provider cannot be empty",
      );
    }

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
