import { ConflictResolver } from '../conflict/ConflictResolver.js';
import type { FilePatch, GeneratedFile, ModulePlugin, ProjectConfig, VirtualFileSystem } from '../types/index.js';
import { ModuleId } from '../types/index.js';

export class HealthCheckPlugin implements ModulePlugin {
  readonly name = ModuleId.HealthCheck;
  readonly description = 'Adds @nestjs/terminus for health check endpoints';

  getDependencies(_config: ProjectConfig): {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } {
    return {
      dependencies: {
        '@nestjs/terminus': '^10.0.0',
      },
      devDependencies: {},
    };
  }

  getFiles(_config: ProjectConfig): GeneratedFile[] {
    const controller = `import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }
}
`;

    return [
      { path: 'src/health/health.controller.ts', content: controller },
    ];
  }

  getPatches(_config: ProjectConfig): FilePatch[] {
    return [
      {
        pluginName: ModuleId.HealthCheck,
        filePath: 'src/app.module.ts',
        operation: 'addImport',
        params: {
          moduleSpecifier: '@nestjs/terminus',
          namedImports: ['TerminusModule'],
        },
      },
      {
        pluginName: ModuleId.HealthCheck,
        filePath: 'src/app.module.ts',
        operation: 'addImport',
        params: {
          moduleSpecifier: './health/health.controller',
          namedImports: ['HealthController'],
        },
      },
      {
        pluginName: ModuleId.HealthCheck,
        filePath: 'src/app.module.ts',
        operation: 'addModuleImport',
        params: {
          moduleName: 'TerminusModule',
          importCode: 'TerminusModule',
        },
      },
      {
        pluginName: ModuleId.HealthCheck,
        filePath: 'src/app.module.ts',
        operation: 'addProvider',
        params: {
          providerName: 'HealthController',
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
