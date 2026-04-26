import { ConflictResolver } from '../conflict/ConflictResolver.js';
import type { FilePatch, GeneratedFile, ModulePlugin, ProjectConfig, VirtualFileSystem } from '../types/index.js';
import { ModuleId } from '../types/index.js';

export class PrismaPlugin implements ModulePlugin {
  readonly name = ModuleId.Prisma;
  readonly description = 'Adds Prisma ORM with PrismaService and schema configuration';
  readonly requires = [ModuleId.Config];

  getDependencies(_config: ProjectConfig): {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } {
    return {
      dependencies: {
        '@prisma/client': '^5.0.0',
      },
      devDependencies: {
        'prisma': '^5.0.0',
      },
    };
  }

  getFiles(_config: ProjectConfig): GeneratedFile[] {
    const schema = `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
`;

    const prismaService = `import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
`;

    return [
      { path: 'prisma/schema.prisma', content: schema },
      { path: 'src/prisma/prisma.service.ts', content: prismaService },
    ];
  }

  getPatches(_config: ProjectConfig): FilePatch[] {
    return [
      {
        pluginName: ModuleId.Prisma,
        filePath: 'src/app.module.ts',
        operation: 'addImport',
        params: {
          moduleSpecifier: './prisma/prisma.service',
          namedImports: ['PrismaService'],
        },
      },
      {
        pluginName: ModuleId.Prisma,
        filePath: 'src/app.module.ts',
        operation: 'addProvider',
        params: {
          providerName: 'PrismaService',
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
