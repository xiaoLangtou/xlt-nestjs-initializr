import { Volume, createFsFromVolume } from 'memfs';
import type { IFs } from 'memfs';
import type { VirtualFileSystem as IVirtualFileSystem } from '../types/interfaces.js';

/**
 * In-memory virtual file system implementation backed by memfs.
 * All operations happen in memory with zero disk IO.
 */
export class MemfsVirtualFileSystem implements IVirtualFileSystem {
  private readonly vol: InstanceType<typeof Volume>;
  private readonly fs: IFs;

  constructor() {
    this.vol = new Volume();
    this.fs = createFsFromVolume(this.vol);
  }

  /**
   * Normalize path to ensure it starts with /
   */
  private normalizePath(path: string): string {
    return path.startsWith('/') ? path : `/${path}`;
  }

  /**
   * Recursively ensure parent directories exist for a given file path.
   */
  private ensureDir(filePath: string): void {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    if (dir && dir !== '/') {
      this.fs.mkdirSync(dir, { recursive: true });
    }
  }

  get(path: string): string | undefined {
    const normalized = this.normalizePath(path);
    try {
      return this.fs.readFileSync(normalized, 'utf8') as string;
    } catch {
      return undefined;
    }
  }

  set(path: string, content: string): void {
    const normalized = this.normalizePath(path);
    this.ensureDir(normalized);
    this.fs.writeFileSync(normalized, content);
  }

  has(path: string): boolean {
    const normalized = this.normalizePath(path);
    return this.fs.existsSync(normalized);
  }

  delete(path: string): void {
    const normalized = this.normalizePath(path);
    try {
      this.fs.unlinkSync(normalized);
    } catch {
      // Silently ignore if file doesn't exist
    }
  }

  paths(): string[] {
    return this.collectFiles('/');
  }

  entries(): Map<string, string> {
    const result = new Map<string, string>();
    for (const filePath of this.paths()) {
      const content = this.get(filePath);
      if (content !== undefined) {
        result.set(filePath, content);
      }
    }
    return result;
  }

  /**
   * Recursively collect all file paths under a directory.
   */
  private collectFiles(dir: string): string[] {
    const results: string[] = [];
    let entries: ReturnType<IFs['readdirSync']>;
    try {
      entries = this.fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return results;
    }
    for (const entry of entries) {
      const dirent = entry as { name: string; isDirectory(): boolean };
      const fullPath = dir === '/' ? `/${dirent.name}` : `${dir}/${dirent.name}`;
      if (dirent.isDirectory()) {
        results.push(...this.collectFiles(fullPath));
      } else {
        results.push(fullPath);
      }
    }
    return results;
  }
}
