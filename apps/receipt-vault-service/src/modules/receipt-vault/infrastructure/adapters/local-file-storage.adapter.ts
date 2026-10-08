import { IFileStorageService } from '../../domain/ports/file-storage.port';
import { InvalidFileError, InvalidStorageConfigurationError, FileSizeExceededError } from '../../domain/errors/receipt.errors';
import { MAX_FILE_SIZE } from '../../domain/constants/receipt.constants';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

/** Private managed objects. Original filenames never become filesystem paths. */
export class LocalFileStorageAdapter implements IFileStorageService {
  private readonly uploadDir: string;
  constructor(uploadDir: string, _baseUrl = '') {
    this.uploadDir = path.resolve(uploadDir);
  }

  private resolveKey(key: string, bucket = 'local'): string {
    if (bucket !== 'local' || !/^(?:[a-f0-9-]{36}|[a-f0-9]{64})\.(?:pdf|jpg|jpeg|png|gif|webp|bmp|tiff?)$/i.test(key)) {
      throw new InvalidFileError('Invalid managed storage key or bucket');
    }
    const target = path.resolve(this.uploadDir, key);
    if (path.dirname(target) !== this.uploadDir) throw new InvalidFileError('Storage key escapes upload directory');
    return target;
  }

  async upload(file: Buffer, _fileName: string, mimeType: string) {
    if (!Buffer.isBuffer(file) || file.length === 0) throw new InvalidFileError('File is empty');
    if (file.length > MAX_FILE_SIZE) throw new FileSizeExceededError(file.length, MAX_FILE_SIZE);
    const actual = this.detectType(file);
    const normalized = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
    if (!actual || actual.mimeType !== normalized) throw new InvalidFileError('File signature does not match an allowed MIME type');
    await fs.mkdir(this.uploadDir, { recursive: true });
    const storageKey = randomUUID() + '.' + actual.extension;
    await fs.writeFile(this.resolveKey(storageKey), file, { flag: 'wx', mode: 0o600 });
    return { storageKey, storageBucket: 'local' };
  }

  private detectType(file: Buffer): { mimeType: string; extension: string } | undefined {
    const prefix = file.subarray(0, 16);
    if (prefix.subarray(0, 5).toString() === '%PDF-') return { mimeType: 'application/pdf', extension: 'pdf' };
    if (prefix.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return { mimeType: 'image/jpeg', extension: 'jpg' };
    if (prefix.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { mimeType: 'image/png', extension: 'png' };
    if (['GIF87a','GIF89a'].includes(prefix.subarray(0,6).toString())) return { mimeType: 'image/gif', extension: 'gif' };
    if (prefix.subarray(0,4).toString() === 'RIFF' && prefix.subarray(8,12).toString() === 'WEBP') return { mimeType: 'image/webp', extension: 'webp' };
    if (prefix.subarray(0,2).toString() === 'BM') return { mimeType: 'image/bmp', extension: 'bmp' };
    if (prefix.subarray(0,4).equals(Buffer.from([73,73,42,0])) || prefix.subarray(0,4).equals(Buffer.from([77,77,0,42]))) return { mimeType: 'image/tiff', extension: 'tiff' };
    return undefined;
  }

  async download(key: string, bucket: string): Promise<Buffer> {
    const target = this.resolveKey(key, bucket);
    const info = await fs.lstat(target);
    if (!info.isFile() || info.isSymbolicLink()) throw new InvalidFileError('Storage object is not a regular file');
    return fs.readFile(target);
  }

  async delete(key: string, bucket: string): Promise<void> {
    const target = this.resolveKey(key, bucket);
    try { await fs.unlink(target); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }

  async generateSignedUrl(_key: string, _bucket: string): Promise<string> {
    throw new InvalidStorageConfigurationError('Local files require the authenticated receipt download endpoint');
  }

  /** Grace period protects uploads whose database transaction has not committed yet. */
  async cleanupUnreferenced(isReferenced: (key: string) => Promise<boolean>, before: Date): Promise<number> {
    let entries: string[];
    try { entries = await fs.readdir(this.uploadDir); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0; throw error; }
    let removed = 0;
    for (const key of entries) {
      let target: string;
      try { target = this.resolveKey(key); } catch { continue; }
      try {
        const info = await fs.lstat(target);
        if (!info.isFile() || info.isSymbolicLink() || info.mtimeMs >= before.getTime()) continue;
        if (await isReferenced(key)) continue;
        await this.delete(key, 'local');
        removed++;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    return removed;
  }
}
