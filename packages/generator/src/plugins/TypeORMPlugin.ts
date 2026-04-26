import { ConflictResolver } from '../conflict/ConflictResolver.js';
import type { FilePatch, GeneratedFile, ModulePlugin, ProjectConfig, VirtualFileSystem } from '../types/index.js';
import { DatabaseType, ModuleId } from '../types/index.js';

export class TypeORMPlugin implements ModulePlugin {
  readonly name = ModuleId.TypeORM;
  readonly description = 'Adds TypeORM for database access with entity support';
  readonly requires = [ModuleId.Config];

  getDependencies(config: ProjectConfig): {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } {
    const base = {
      '@nestjs/typeorm': '^10.0.0',
      'typeorm': '^0.3.0',
    };

    let driver: Record<string, string>;
    switch (config.databaseType) {
      case DatabaseType.MySQL:
        driver = { 'mysql2': '^3.0.0' };
        break;
      case DatabaseType.SQLite:
        driver = { 'better-sqlite3': '^9.0.0' };
        break;
      case DatabaseType.PostgreSQL:
      default:
        driver = { 'pg': '^8.0.0' };
        break;
    }

    return {
      dependencies: { ...base, ...driver },
      devDependencies: {},
    };
  }

  getFiles(_config: ProjectConfig): GeneratedFile[] {
    const entity = `import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class SampleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}
`;

    return [
      { path: 'src/entities/sample.entity.ts', content: entity },
    ];
  }

  getPatches(config: ProjectConfig): FilePatch[] {
    const dbType = config.databaseType === DatabaseType.MySQL
      ? 'mysql'
      : config.databaseType === DatabaseType.SQLite
        ? 'sqlite'
        : 'postgres';

    const port = dbType === 'mysql' ? 3306 : 5432;
    const portLine = dbType === 'sqlite' ? '' : `, port: ${port}`;
    const hostLine = dbType === 'sqlite' ? '' : `, host: 'localhost'`;
    const credLine = dbType === 'sqlite'
      ? `, database: 'mydb.sqlite'`
      : `, username: 'postgres', password: 'postgres', database: 'mydb'`;

    const importCode = `TypeOrmModule.forRoot({ type: '${dbType}'${hostLine}${portLine}${credLine}, entities: [], synchronize: true })`;

    return [
      {
        pluginName: ModuleId.TypeORM,
        filePath: 'src/app.module.ts',
        operation: 'addImport',
        params: {
          moduleSpecifier: '@nestjs/typeorm',
          namedImports: ['TypeOrmModule'],
        },
      },
      {
        pluginName: ModuleId.TypeORM,
        filePath: 'src/app.module.ts',
        operation: 'addModuleImport',
        params: {
          moduleName: 'TypeOrmModule',
          importCode,
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
