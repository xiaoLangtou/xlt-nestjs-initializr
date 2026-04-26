import { ConflictResolver } from '../conflict/ConflictResolver.js';
import type { FilePatch, GeneratedFile, ModulePlugin, ProjectConfig, VirtualFileSystem } from '../types/index.js';
import { ModuleId } from '../types/index.js';

export class SwaggerPlugin implements ModulePlugin {
  readonly name = ModuleId.Swagger;
  readonly description = 'Adds @nestjs/swagger for API documentation with Swagger UI';

  getDependencies(_config: ProjectConfig): {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } {
    return {
      dependencies: {
        '@nestjs/swagger': '^7.0.0',
      },
      devDependencies: {},
    };
  }

  getFiles(_config: ProjectConfig): GeneratedFile[] {
    return [];
  }

  getPatches(config: ProjectConfig): FilePatch[] {
    const description = config.description || `${config.name} API`;
    const bootstrapCode = [
      `const config = new DocumentBuilder()`,
      `  .setTitle('${config.name}')`,
      `  .setDescription('${description}')`,
      `  .setVersion('1.0')`,
      `  .build();`,
      `const document = SwaggerModule.createDocument(app, config);`,
      `SwaggerModule.setup('api/docs', app, document);`,
    ].join('\n');

    return [
      {
        pluginName: ModuleId.Swagger,
        filePath: 'src/main.ts',
        operation: 'addImport',
        params: {
          moduleSpecifier: '@nestjs/swagger',
          namedImports: ['SwaggerModule', 'DocumentBuilder'],
        },
      },
      {
        pluginName: ModuleId.Swagger,
        filePath: 'src/main.ts',
        operation: 'addBootstrapCode',
        params: {
          code: bootstrapCode,
          beforeListen: true,
        },
      },
    ];
  }

  patchFiles(vfs: VirtualFileSystem, config: ProjectConfig): VirtualFileSystem {
    const mainPath = 'src/main.ts';
    const mainContent = vfs.get(mainPath);
    if (mainContent !== undefined) {
      const resolver = new ConflictResolver();
      const patches = this.getPatches(config).filter(p => p.filePath === mainPath);
      const patched = resolver.resolve(mainContent, patches);
      vfs.set(mainPath, patched);
    }
    return vfs;
  }
}
