import type {
  DatabaseType,
  GitHooksOption,
  HttpAdapter,
  LinterOption,
  ModuleId,
  PackageManager,
  TestRunner,
} from './enums.js';

export interface ProjectConfig {
  name: string;
  description?: string;
  adapter: HttpAdapter;
  packageManager: PackageManager;
  linter: LinterOption;
  testRunner: TestRunner;
  gitHooks: GitHooksOption;
  modules: ModuleId[];
  databaseType?: DatabaseType;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface FilePatch {
  pluginName: string;
  filePath: string;
  operation: 'addImport' | 'addModuleImport' | 'addProvider' | 'addBootstrapCode';
  params: Record<string, unknown>;
}

export interface PluginOutput {
  pluginName: string;
  newFiles: GeneratedFile[];
  patches: FilePatch[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface ModulePlugin {
  readonly name: string;
  readonly description: string;
  readonly requires?: string[];

  getDependencies(config: ProjectConfig): {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };

  getFiles(config: ProjectConfig): GeneratedFile[];

  patchFiles(
    vfs: VirtualFileSystem,
    config: ProjectConfig,
  ): VirtualFileSystem;

  /** Optional method returning FilePatch[] for AST-based merging via FileComposer */
  getPatches?(config: ProjectConfig): FilePatch[];
}

export interface VirtualFileSystem {
  get(path: string): string | undefined;
  set(path: string, content: string): void;
  has(path: string): boolean;
  delete(path: string): void;
  paths(): string[];
  entries(): Map<string, string>;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  pluginName?: string;
}

export interface ConfigUrlParams {
  name?: string;
  adapter?: string;
  pm?: string;
  linter?: string;
  test?: string;
  hooks?: string;
  modules?: string;
  db?: string;
}
