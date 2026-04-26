import { ConflictResolver } from '../conflict/ConflictResolver.js';
import type { FilePatch, GeneratedFile, ModulePlugin, ProjectConfig, VirtualFileSystem } from '../types/index.js';
import { ModuleId } from '../types/index.js';

export class GraphQLPlugin implements ModulePlugin {
  readonly name = ModuleId.GraphQL;
  readonly description = 'Adds GraphQL support with @nestjs/graphql and Apollo Server';
  readonly requires = [ModuleId.Config];

  getDependencies(_config: ProjectConfig): {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } {
    return {
      dependencies: {
        '@nestjs/graphql': '^12.0.0',
        '@nestjs/apollo': '^12.0.0',
        '@apollo/server': '^4.0.0',
        'graphql': '^16.0.0',
      },
      devDependencies: {},
    };
  }

  getFiles(_config: ProjectConfig): GeneratedFile[] {
    const resolver = `import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class SampleResolver {
  @Query(() => String)
  hello(): string {
    return 'Hello World!';
  }
}
`;

    const schema = `type Query {
  hello: String!
}
`;

    return [
      { path: 'src/graphql/sample.resolver.ts', content: resolver },
      { path: 'src/graphql/sample.schema.graphql', content: schema },
    ];
  }

  getPatches(_config: ProjectConfig): FilePatch[] {
    return [
      {
        pluginName: ModuleId.GraphQL,
        filePath: 'src/app.module.ts',
        operation: 'addImport',
        params: {
          moduleSpecifier: '@nestjs/graphql',
          namedImports: ['GraphQLModule'],
        },
      },
      {
        pluginName: ModuleId.GraphQL,
        filePath: 'src/app.module.ts',
        operation: 'addImport',
        params: {
          moduleSpecifier: '@nestjs/apollo',
          namedImports: ['ApolloDriver', 'ApolloDriverConfig'],
        },
      },
      {
        pluginName: ModuleId.GraphQL,
        filePath: 'src/app.module.ts',
        operation: 'addModuleImport',
        params: {
          moduleName: 'GraphQLModule',
          importCode: "GraphQLModule.forRoot<ApolloDriverConfig>({ driver: ApolloDriver, autoSchemaFile: 'schema.gql' })",
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
