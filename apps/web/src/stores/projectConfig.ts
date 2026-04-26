import { defineStore } from 'pinia';
import { computed, reactive, watch } from 'vue';
import {
  DatabaseType,
  GitHooksOption,
  HttpAdapter,
  LinterOption,
  ModuleId,
  PackageManager,
  type ProjectConfig,
  TestRunner,
} from '@nestjs-initializr/generator';
import { findModule, MODULES } from '@/data/modules';

const DEFAULT_NAME = 'my-nest-app';

export interface ProjectConfigState {
  name: string;
  description: string;
  adapter: HttpAdapter;
  packageManager: PackageManager;
  linter: LinterOption;
  testRunner: TestRunner;
  gitHooks: GitHooksOption;
  modules: Set<ModuleId>;
  /** 因依赖被自动加入的模块 */
  autoModules: Set<ModuleId>;
  databaseType: DatabaseType | null;
}

const ENUM_VALUES = {
  adapter: Object.values(HttpAdapter) as string[],
  pm: Object.values(PackageManager) as string[],
  linter: Object.values(LinterOption) as string[],
  test: Object.values(TestRunner) as string[],
  hooks: Object.values(GitHooksOption) as string[],
  db: Object.values(DatabaseType) as string[],
};

const ALL_MODULE_IDS = new Set(MODULES.map((m) => m.id));

export const useProjectConfigStore = defineStore('projectConfig', () => {
  const state = reactive<ProjectConfigState>({
    name: DEFAULT_NAME,
    description: '',
    adapter: HttpAdapter.Express,
    packageManager: PackageManager.Npm,
    linter: LinterOption.EslintPrettier,
    testRunner: TestRunner.Jest,
    gitHooks: GitHooksOption.None,
    modules: new Set<ModuleId>(),
    autoModules: new Set<ModuleId>(),
    databaseType: null,
  });

  const allModules = computed<Set<ModuleId>>(
    () => new Set([...state.modules, ...state.autoModules]),
  );

  function resolveDependencies(): void {
    state.autoModules.clear();
    const queue: ModuleId[] = [...state.modules];
    while (queue.length) {
      const id = queue.shift()!;
      const mod = findModule(id);
      if (!mod?.deps) continue;
      for (const dep of mod.deps) {
        if (!state.modules.has(dep) && !state.autoModules.has(dep)) {
          state.autoModules.add(dep);
          queue.push(dep);
        }
      }
    }
  }

  function isConflict(id: ModuleId): boolean {
    const mod = findModule(id);
    if (!mod?.exclusive) return false;
    return state.modules.has(mod.exclusive);
  }

  function toggleModule(id: ModuleId): void {
    // auto-added 的依赖不允许手动取消
    if (state.autoModules.has(id) && !state.modules.has(id)) return;
    if (isConflict(id)) return;
    if (state.modules.has(id)) {
      state.modules.delete(id);
    } else {
      state.modules.add(id);
    }
    resolveDependencies();
    syncDatabaseType();
  }

  function syncDatabaseType(): void {
    const needDb =
      state.modules.has(ModuleId.TypeORM) || state.modules.has(ModuleId.Prisma);
    if (!needDb) state.databaseType = null;
  }

  function setDatabaseType(db: DatabaseType): void {
    state.databaseType = state.databaseType === db ? null : db;
  }

  /** 序列化为 URL query string */
  function toQueryString(): string {
    const params = new URLSearchParams();
    if (state.name && state.name !== DEFAULT_NAME) params.set('name', state.name);
    if (state.adapter !== HttpAdapter.Express) params.set('adapter', state.adapter);
    if (state.packageManager !== PackageManager.Npm) params.set('pm', state.packageManager);
    if (state.linter !== LinterOption.EslintPrettier) params.set('linter', state.linter);
    if (state.testRunner !== TestRunner.Jest) params.set('test', state.testRunner);
    if (state.gitHooks !== GitHooksOption.None) params.set('hooks', state.gitHooks);
    if (state.modules.size > 0) params.set('modules', [...state.modules].join(','));
    if (state.databaseType) params.set('db', state.databaseType);
    return params.toString();
  }

  function restoreFromUrl(params: URLSearchParams): void {
    const name = params.get('name');
    if (name) state.name = name;

    const adapter = params.get('adapter');
    if (adapter && ENUM_VALUES.adapter.includes(adapter)) state.adapter = adapter as HttpAdapter;

    const pm = params.get('pm');
    if (pm && ENUM_VALUES.pm.includes(pm)) state.packageManager = pm as PackageManager;

    const linter = params.get('linter');
    if (linter && ENUM_VALUES.linter.includes(linter)) state.linter = linter as LinterOption;

    const test = params.get('test');
    if (test && ENUM_VALUES.test.includes(test)) state.testRunner = test as TestRunner;

    const hooks = params.get('hooks');
    if (hooks && ENUM_VALUES.hooks.includes(hooks)) state.gitHooks = hooks as GitHooksOption;

    const modules = params.get('modules');
    if (modules) {
      for (const id of modules.split(',')) {
        if (ALL_MODULE_IDS.has(id as ModuleId)) {
          state.modules.add(id as ModuleId);
        }
      }
      resolveDependencies();
    }

    const db = params.get('db');
    if (db && ENUM_VALUES.db.includes(db)) state.databaseType = db as DatabaseType;
  }

  /** 当前可序列化为后端 DTO 的项目配置 */
  function toProjectConfig(): ProjectConfig {
    const cfg: ProjectConfig = {
      name: state.name,
      adapter: state.adapter,
      packageManager: state.packageManager,
      linter: state.linter,
      testRunner: state.testRunner,
      gitHooks: state.gitHooks,
      modules: [...allModules.value],
    };
    if (state.description) cfg.description = state.description;
    if (state.databaseType) cfg.databaseType = state.databaseType;
    return cfg;
  }

  // 自动同步 URL（任何状态变更后写入地址栏）
  watch(
    () => toQueryString(),
    (qs) => {
      const url = qs ? `${location.pathname}?${qs}` : location.pathname;
      history.replaceState(null, '', url);
    },
  );

  return {
    state,
    allModules,
    isConflict,
    toggleModule,
    setDatabaseType,
    toQueryString,
    restoreFromUrl,
    toProjectConfig,
  };
});
