import { ConflictResolver } from '../conflict/ConflictResolver.js';
import type { FilePatch, GeneratedFile, ModulePlugin, ProjectConfig, VirtualFileSystem } from '../types/index.js';
import { ModuleId } from '../types/index.js';

export class I18nPlugin implements ModulePlugin {
  readonly name = ModuleId.I18n;
  readonly description = 'Adds nestjs-i18n for internationalization support';

  getDependencies(_config: ProjectConfig): {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } {
    return {
      dependencies: {
        'nestjs-i18n': '^10.0.0',
      },
      devDependencies: {},
    };
  }

  getFiles(_config: ProjectConfig): GeneratedFile[] {
    return [
      {
        path: 'src/i18n/en/common.json',
        content: JSON.stringify({ hello: 'Hello World' }, null, 2) + '\n',
      },
      {
        path: 'src/i18n/zh/common.json',
        content: JSON.stringify({ hello: '你好世界' }, null, 2) + '\n',
      },
    ];
  }

  getPatches(_config: ProjectConfig): FilePatch[] {
    return [
      {
        pluginName: ModuleId.I18n,
        filePath: 'src/app.module.ts',
        operation: 'addImport',
        params: {
          moduleSpecifier: 'nestjs-i18n',
          namedImports: ['I18nModule', 'QueryResolver'],
        },
      },
      {
        pluginName: ModuleId.I18n,
        filePath: 'src/app.module.ts',
        operation: 'addModuleImport',
        params: {
          moduleName: 'I18nModule',
          importCode: "I18nModule.forRoot({ fallbackLanguage: 'en', loaderOptions: { path: path.join(__dirname, '/i18n/'), watch: true }, resolvers: [{ use: QueryResolver, options: ['lang'] }] })",
        },
      },
    ];
  }

  patchFiles(vfs: VirtualFileSystem, config: ProjectConfig): VirtualFileSystem {
    const appModulePath = 'src/app.module.ts';
    const appModuleContent = vfs.get(appModulePath);
    if (appModuleContent !== undefined) {
      const resolver = new ConflictResolver();
      const patches = this.getPatches(config).filter(p => p.filePath === appModulePath);
      const patched = resolver.resolve(appModuleContent, patches);
      vfs.set(appModulePath, patched);
    }
    return vfs;
  }
}
