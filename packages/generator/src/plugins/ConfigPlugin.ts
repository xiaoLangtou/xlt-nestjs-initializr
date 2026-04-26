import { ConflictResolver } from '../conflict/ConflictResolver.js';
import type { FilePatch, GeneratedFile, ModulePlugin, ProjectConfig, VirtualFileSystem } from '../types/index.js';
import { ModuleId } from '../types/index.js';

export class ConfigPlugin implements ModulePlugin {
  readonly name = ModuleId.Config;
  readonly description = 'Adds @nestjs/config for environment variable management';

  getDependencies(_config: ProjectConfig): {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } {
    return {
      dependencies: {
        '@nestjs/config': '^3.0.0',
      },
      devDependencies: {},
    };
  }

  getFiles(_config: ProjectConfig): GeneratedFile[] {
    return [
      {
        path: '.env.example',
        content: '# Environment variables\nNODE_ENV=development\nPORT=3000\n',
      },
    ];
  }

  getPatches(_config: ProjectConfig): FilePatch[] {
    return [
      {
        pluginName: ModuleId.Config,
        filePath: 'src/app.module.ts',
        operation: 'addImport',
        params: {
          moduleSpecifier: '@nestjs/config',
          namedImports: ['ConfigModule'],
        },
      },
      {
        pluginName: ModuleId.Config,
        filePath: 'src/app.module.ts',
        operation: 'addModuleImport',
        params: {
          moduleName: 'ConfigModule',
          importCode: 'ConfigModule.forRoot({ isGlobal: true })',
        },
      },
    ];
  }

  patchFiles(vfs: VirtualFileSystem, config: ProjectConfig): VirtualFileSystem {
    // Apply AST patches to app.module.ts
    const appModulePath = 'src/app.module.ts';
    const appModuleContent = vfs.get(appModulePath);
    if (appModuleContent !== undefined) {
      const resolver = new ConflictResolver();
      const patches = this.getPatches(config).filter(p => p.filePath === appModulePath);
      const patched = resolver.resolve(appModuleContent, patches);
      vfs.set(appModulePath, patched);
    }

    // Add .env to .gitignore if it exists
    const gitignorePath = '.gitignore';
    const gitignoreContent = vfs.get(gitignorePath);
    if (gitignoreContent !== undefined) {
      const lines = gitignoreContent.split('\n');
      if (!lines.some(line => line.trim() === '.env')) {
        const updated = gitignoreContent.trimEnd() + '\n.env\n';
        vfs.set(gitignorePath, updated);
      }
    }

    return vfs;
  }
}
