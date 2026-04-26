import archiver from 'archiver';
import type { VirtualFileSystem } from '../types/interfaces.js';

/**
 * Builds a ZIP buffer from a VirtualFileSystem.
 * Uses archiver to pack all files with the project name as root directory.
 */
export class ZipBuilder {
  /**
   * Pack all files in the VFS into a ZIP buffer.
   * @param vfs Virtual file system containing all generated files
   * @param rootDirName Root directory name inside the ZIP (project name)
   * @returns ZIP file as a Buffer
   */
  async build(vfs: VirtualFileSystem, rootDirName: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      for (const [filePath, content] of vfs.entries()) {
        // VFS paths start with '/', strip the leading slash
        const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
        archive.append(content, { name: `${rootDirName}/${relativePath}` });
      }

      archive.finalize();
    });
  }
}
