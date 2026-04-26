import { describe, it, expect } from 'vitest';
import { MemfsVirtualFileSystem } from './VirtualFileSystem.js';

describe('MemfsVirtualFileSystem', () => {
  it('should set and get file content', () => {
    const vfs = new MemfsVirtualFileSystem();
    vfs.set('src/main.ts', 'console.log("hello")');
    expect(vfs.get('src/main.ts')).toBe('console.log("hello")');
  });

  it('should normalize paths without leading slash', () => {
    const vfs = new MemfsVirtualFileSystem();
    vfs.set('package.json', '{"name": "test"}');
    expect(vfs.get('/package.json')).toBe('{"name": "test"}');
    expect(vfs.get('package.json')).toBe('{"name": "test"}');
  });

  it('should normalize paths with leading slash', () => {
    const vfs = new MemfsVirtualFileSystem();
    vfs.set('/src/app.ts', 'app');
    expect(vfs.get('src/app.ts')).toBe('app');
    expect(vfs.get('/src/app.ts')).toBe('app');
  });

  it('should return undefined for nonexistent files', () => {
    const vfs = new MemfsVirtualFileSystem();
    expect(vfs.get('nonexistent')).toBeUndefined();
  });

  it('should check file existence with has()', () => {
    const vfs = new MemfsVirtualFileSystem();
    vfs.set('src/main.ts', 'content');
    expect(vfs.has('src/main.ts')).toBe(true);
    expect(vfs.has('/src/main.ts')).toBe(true);
    expect(vfs.has('nonexistent')).toBe(false);
  });

  it('should delete files', () => {
    const vfs = new MemfsVirtualFileSystem();
    vfs.set('src/main.ts', 'content');
    expect(vfs.has('src/main.ts')).toBe(true);
    vfs.delete('src/main.ts');
    expect(vfs.has('src/main.ts')).toBe(false);
    expect(vfs.get('src/main.ts')).toBeUndefined();
  });

  it('should not throw when deleting nonexistent files', () => {
    const vfs = new MemfsVirtualFileSystem();
    expect(() => vfs.delete('nonexistent')).not.toThrow();
  });

  it('should list all file paths recursively', () => {
    const vfs = new MemfsVirtualFileSystem();
    vfs.set('src/main.ts', 'main');
    vfs.set('src/app.module.ts', 'module');
    vfs.set('src/sub/deep.ts', 'deep');
    vfs.set('package.json', '{}');

    const paths = vfs.paths();
    expect(paths).toContain('/src/main.ts');
    expect(paths).toContain('/src/app.module.ts');
    expect(paths).toContain('/src/sub/deep.ts');
    expect(paths).toContain('/package.json');
    expect(paths).toHaveLength(4);
  });

  it('should return entries as a Map of path → content', () => {
    const vfs = new MemfsVirtualFileSystem();
    vfs.set('src/main.ts', 'main content');
    vfs.set('package.json', '{"name": "test"}');

    const entries = vfs.entries();
    expect(entries).toBeInstanceOf(Map);
    expect(entries.size).toBe(2);
    expect(entries.get('/src/main.ts')).toBe('main content');
    expect(entries.get('/package.json')).toBe('{"name": "test"}');
  });

  it('should overwrite existing file content', () => {
    const vfs = new MemfsVirtualFileSystem();
    vfs.set('file.txt', 'original');
    vfs.set('file.txt', 'updated');
    expect(vfs.get('file.txt')).toBe('updated');
  });

  it('should return empty paths for empty filesystem', () => {
    const vfs = new MemfsVirtualFileSystem();
    expect(vfs.paths()).toEqual([]);
  });

  it('should return empty entries for empty filesystem', () => {
    const vfs = new MemfsVirtualFileSystem();
    const entries = vfs.entries();
    expect(entries.size).toBe(0);
  });

  it('should create nested directories automatically', () => {
    const vfs = new MemfsVirtualFileSystem();
    vfs.set('a/b/c/d/file.ts', 'deep nested');
    expect(vfs.get('a/b/c/d/file.ts')).toBe('deep nested');
    expect(vfs.has('a/b/c/d/file.ts')).toBe(true);
  });
});
