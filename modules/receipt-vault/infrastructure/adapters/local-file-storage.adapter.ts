import { IFileStorageService } from "../../domain/ports/file-storage.port";
import { InvalidStorageConfigurationError } from "../../domain/errors/receipt.errors";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

export class LocalFileStorageAdapter implements IFileStorageService {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(uploadDir: string, baseUrl: string) {
    this.uploadDir = uploadDir;
    this.baseUrl = baseUrl;
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async upload(
    file: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{
    storageKey: string;
    storageBucket: string;
    publicUrl?: string;
  }> {
    await this.ensureUploadDir();

    const hash = crypto.createHash("sha256").update(file).digest("hex");
    const ext = path.extname(fileName);
    const storageKey = `${hash}${ext}`;
    const filePath = path.join(this.uploadDir, storageKey);

    await fs.writeFile(filePath, file);

    return {
      storageKey,
      storageBucket: "local",
      publicUrl: `${this.baseUrl}/${storageKey}`,
    };
  }

  async download(key: string, bucket: string): Promise<Buffer> {
    if (bucket !== "local") {
      throw new InvalidStorageConfigurationError(
        `Invalid bucket for local storage: ${bucket}`,
      );
    }
    const filePath = path.join(this.uploadDir, key);
    return await fs.readFile(filePath);
  }

  async delete(key: string, bucket: string): Promise<void> {
    if (bucket !== "local") {
      throw new InvalidStorageConfigurationError(
        `Invalid bucket for local storage: ${bucket}`,
      );
    }
    const filePath = path.join(this.uploadDir, key);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file not found
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async generateSignedUrl(key: string, bucket: string): Promise<string> {
    if (bucket !== "local") {
      throw new InvalidStorageConfigurationError(
        `Invalid bucket for local storage: ${bucket}`,
      );
    }

    return `${this.baseUrl}/${key}`;
  }
}
