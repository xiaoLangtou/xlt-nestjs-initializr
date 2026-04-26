import { describe, it, expect } from 'vitest';
import AdmZip from 'adm-zip';
import { ZipBuilder } from './ZipBuilder.js';
import { MemfsVirtualFileSystem } from '../vfs/VirtualFileSystem.js';

describe('ZipBuilder', () => {
  it('should produce a valid ZIP buffer with correct root directory', async () => {
    const vfs = new MemfsVirtualFileSystem();
    vfs.set('package.json', '{"name":"my-app"}');
    vfs.set('src/main.ts', 'console.log("hello")');

    const builder = new ZipBuilder();
    const buffer = await builder.build(vfs, 'my-app');

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    const zip = new AdmZip(buffer);
    const entries = zip.getEntries().map((e) => e.entryName);

    expect(entries).toContain('my-app/package.json');
    expect(entries).toContain('my-app/src/main.ts');
  });

  it('should preserve file content after round-trip', async () => {
    const vfs = new MemfsVirtualFileSystem();
    const content = '{"name":"test","version":"1.0.0"}';
    vfs.set('package.json', content);

    const builder = new ZipBuilder();
    const buffer = await builder.build(vfs, 'test-project');

    const zip = new AdmZip(buffer);
    const extracted = zip.readAsText('test-project/package.json');
    expect(extracted).toBe(content);
  });

  it('should preserve nested directory structure', async () => {
    const vfs = new MemfsVirtualFileSystem();
    vfs.set('src/main.ts', 'main');
    vfs.set('src/app/app.module.ts', 'module');
    vfs.set('src/app/controllers/app.controller.ts', 'controller');

    const builder = new ZipBuilder();
    const buffer = await builder.build(vfs, 'nested-app');

    const zip = new AdmZip(buffer);
    const entries = zip.getEntries().map((e) => e.entryName);

    expect(entries).toContain('nested-app/src/main.ts');
    expect(entries).toContain('nested-app/src/app/app.module.ts');
    expect(entries).toContain('nested-app/src/app/controllers/app.controller.ts');
  });

  it('should handle empty VFS', async () => {
    const vfs = new MemfsVirtualFileSystem();

    const builder = new ZipBuilder();
    const buffer = await builder.build(vfs, 'empty-project');

    expect(buffer).toBeInstanceOf(Buffer);
    const zip = new AdmZip(buffer);
    const fileEntries = zip.getEntries().filter((e) => !e.isDirectory);
    expect(fileEntries).toHaveLength(0);
  });

  it('should use rootDirName as the ZIP root folder', async () => {
    const vfs = new MemfsVirtualFileSystem();
    vfs.set('file.txt', 'hello');

    const builder = new ZipBuilder();
    const buffer = await builder.build(vfs, 'custom-root');

    const zip = new AdmZip(buffer);
    const entries = zip.getEntries().map((e) => e.entryName);

    // Every entry should start with the root dir name
    for (const entry of entries) {
      expect(entry.startsWith('custom-root/')).toBe(true);
    }
  });
});
