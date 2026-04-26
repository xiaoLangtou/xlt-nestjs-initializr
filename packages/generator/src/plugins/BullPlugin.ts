import { ConflictResolver } from '../conflict/ConflictResolver.js';
import type { FilePatch, GeneratedFile, ModulePlugin, ProjectConfig, VirtualFileSystem } from '../types/index.js';
import { ModuleId } from '../types/index.js';

export class BullPlugin implements ModulePlugin {
  readonly name = ModuleId.Bull;
  readonly description = 'Adds Bull queue support with Redis for background job processing';
  readonly requires = [ModuleId.Config];

  getDependencies(_config: ProjectConfig): {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } {
    return {
      dependencies: {
        '@nestjs/bull': '^10.0.0',
        'bull': '^4.0.0',
      },
      devDependencies: {
        '@types/bull': '^4.0.0',
      },
    };
  }

  getFiles(_config: ProjectConfig): GeneratedFile[] {
    const processor = `import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('sample')
export class SampleProcessor {
  @Process()
  async handleJob(job: Job): Promise<void> {
    console.log('Processing job:', job.id, job.data);
  }
}
`;

    return [
      { path: 'src/queues/sample.processor.ts', content: processor },
    ];
  }

  getPatches(_config: ProjectConfig): FilePatch[] {
    return [
      {
        pluginName: ModuleId.Bull,
        filePath: 'src/app.module.ts',
        operation: 'addImport',
        params: {
          moduleSpecifier: '@nestjs/bull',
          namedImports: ['BullModule'],
        },
      },
      {
        pluginName: ModuleId.Bull,
        filePath: 'src/app.module.ts',
        operation: 'addModuleImport',
        params: {
          moduleName: 'BullModule',
          importCode: "BullModule.forRoot({ redis: { host: 'localhost', port: 6379 } })",
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
