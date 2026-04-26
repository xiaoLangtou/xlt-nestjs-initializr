import type { ProjectConfig, PluginOutput, FilePatch } from '../types/index.js';
import type { VirtualFileSystem } from '../types/interfaces.js';
import { MemfsVirtualFileSystem } from '../vfs/VirtualFileSystem.js';
import { ConflictResolver } from '../conflict/ConflictResolver.js';

export interface IFileComposer {
  compose(
    baseFiles: Map<string, string>,
    pluginOutputs: PluginOutput[],
    config: ProjectConfig,
  ): VirtualFileSystem;
}

export class FileComposer implements IFileComposer {
  private readonly conflictResolver: ConflictResolver;

  constructor(conflictResolver?: ConflictResolver) {
    this.conflictResolver = conflictResolver ?? new ConflictResolver();
  }

  compose(
    baseFiles: Map<string, string>,
    pluginOutputs: PluginOutput[],
    config: ProjectConfig,
  ): VirtualFileSystem {
    const vfs = new MemfsVirtualFileSystem();

    // 1. Write all base files into VFS
    for (const [path, content] of baseFiles) {
      vfs.set(path, content);
    }

    // 2. Collect patches grouped by filePath
    const patchesByFile = new Map<string, FilePatch[]>();

    for (const output of pluginOutputs) {
      // 2a. Add new files (skip if file already exists)
      for (const file of output.newFiles) {
        if (!vfs.has(file.path)) {
          vfs.set(file.path, file.content);
        }
      }

      // 2b. Group patches by target file
      for (const patch of output.patches) {
        const existing = patchesByFile.get(patch.filePath) ?? [];
        existing.push(patch);
        patchesByFile.set(patch.filePath, existing);
      }
    }

    // 3. Apply patches using ConflictResolver for AST merging
    for (const [filePath, patches] of patchesByFile) {
      const originalContent = vfs.get(filePath);
      if (originalContent === undefined) {
        continue;
      }
      const merged = this.conflictResolver.resolve(originalContent, patches);
      vfs.set(filePath, merged);
    }

    // 4. Merge all plugin dependencies/devDependencies into package.json
    this.mergeDependencies(vfs, pluginOutputs);

    return vfs;
  }

  private mergeDependencies(vfs: VirtualFileSystem, pluginOutputs: PluginOutput[]): void {
    const pkgJsonPath = 'package.json';
    const raw = vfs.get(pkgJsonPath);
    if (raw === undefined) {
      return;
    }

    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const deps = (pkg.dependencies ?? {}) as Record<string, string>;
    const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;

    for (const output of pluginOutputs) {
      for (const [name, version] of Object.entries(output.dependencies)) {
        deps[name] = version;
      }
      for (const [name, version] of Object.entries(output.devDependencies)) {
        devDeps[name] = version;
      }
    }

    pkg.dependencies = deps;
    pkg.devDependencies = devDeps;

    vfs.set(pkgJsonPath, JSON.stringify(pkg, null, 2));
  }
}
