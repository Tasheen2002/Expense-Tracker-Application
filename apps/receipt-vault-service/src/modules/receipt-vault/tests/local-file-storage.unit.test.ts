import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, unlink, rmdir, writeFile, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalFileStorageAdapter } from '../infrastructure/adapters/local-file-storage.adapter';

describe('Managed private receipt storage', () => {
  let directory: string;
  let storage: LocalFileStorageAdapter;
  const pdf = Buffer.from('%PDF-1.7 synthetic storage fixture');
  beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'receipt-storage-test-')); storage = new LocalFileStorageAdapter(directory); });
  afterEach(async () => { for (const key of await readdir(directory)) await unlink(join(directory, key)); await rmdir(directory); });
  it('stores actual bytes with independent keys, ignoring caller paths', async () => {
    const first = await storage.upload(pdf, '../outside.pdf', 'application/pdf');
    const second = await storage.upload(pdf, 'same.pdf', 'application/pdf');
    expect(first.storageKey).not.toBe(second.storageKey);
    expect(await storage.download(first.storageKey, 'local')).toEqual(pdf);
    expect(await readFile(join(directory, second.storageKey))).toEqual(pdf);
  });
  it.each(['../outside.pdf', '/outside.pdf', '..\\outside.pdf', 'https://example.com/a.pdf'])('rejects traversal or arbitrary key %s', async key => {
    await expect(storage.download(key, 'local')).rejects.toThrow();
    await expect(storage.delete(key, 'local')).rejects.toThrow();
  });
  it('rejects empty bytes, MIME spoofing and unsigned public downloads', async () => {
    await expect(storage.upload(Buffer.alloc(0), 'a.pdf', 'application/pdf')).rejects.toThrow();
    await expect(storage.upload(pdf, 'a.jpg', 'image/jpeg')).rejects.toThrow();
    await expect(storage.generateSignedUrl('a.pdf', 'local')).rejects.toThrow();
    expect(await readdir(directory)).toEqual([]);
  });
  it('keeps referenced and recent files and recovers old orphan files', async () => {
    const referenced = await storage.upload(pdf, 'a.pdf', 'application/pdf');
    const orphan = await storage.upload(pdf, 'b.pdf', 'application/pdf');
    const recent = await storage.upload(pdf, 'c.pdf', 'application/pdf');
    const old = new Date(Date.now() - 48 * 3600000);
    await utimes(join(directory, referenced.storageKey), old, old);
    await utimes(join(directory, orphan.storageKey), old, old);
    await writeFile(join(directory, 'unmanaged.txt'), 'leave alone');
    expect(await storage.cleanupUnreferenced(async key => key === referenced.storageKey, new Date(Date.now() - 24 * 3600000))).toBe(1);
    expect((await readdir(directory)).sort()).toEqual([referenced.storageKey, recent.storageKey, 'unmanaged.txt'].sort());
  });
});
