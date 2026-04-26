/**
 * URL 配置分享集成验证
 * Validates: Requirements 6.1, 6.2, 6.4, 6.5
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useProjectConfigStore } from './projectConfig';
import {
  HttpAdapter,
  PackageManager,
  LinterOption,
  TestRunner,
  GitHooksOption,
  ModuleId,
  DatabaseType,
} from '@nestjs-initializr/generator';

// Mock browser APIs not available in jsdom
const mockReplaceState = vi.fn();
Object.defineProperty(window, 'history', {
  value: { replaceState: mockReplaceState },
  writable: true,
});
Object.defineProperty(window, 'location', {
  value: { pathname: '/' },
  writable: true,
});

describe('URL 配置分享集成验证', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockReplaceState.mockClear();
  });

  // Test 1: Default config produces empty query string
  it('默认配置序列化为空 query string', () => {
    const store = useProjectConfigStore();
    const qs = store.toQueryString();
    expect(qs).toBe('');
  });

  // Test 2: Non-default config serializes correctly
  it('非默认配置正确序列化', () => {
    const store = useProjectConfigStore();
    store.state.name = 'my-app';
    store.state.adapter = HttpAdapter.Fastify;
    store.state.packageManager = PackageManager.Pnpm;
    store.state.linter = LinterOption.Biome;
    store.state.testRunner = TestRunner.Vitest;

    const qs = store.toQueryString();
    const params = new URLSearchParams(qs);

    expect(params.get('name')).toBe('my-app');
    expect(params.get('adapter')).toBe('fastify');
    expect(params.get('pm')).toBe('pnpm');
    expect(params.get('linter')).toBe('biome');
    expect(params.get('test')).toBe('vitest');
  });

  // Test 3: Modules serialize as comma-separated list
  it('模块序列化为逗号分隔列表', () => {
    const store = useProjectConfigStore();
    store.state.modules.add(ModuleId.Docker);
    store.state.modules.add(ModuleId.Swagger);

    const qs = store.toQueryString();
    const params = new URLSearchParams(qs);
    const modules = params.get('modules')?.split(',') ?? [];

    expect(modules).toContain('docker');
    expect(modules).toContain('swagger');
    expect(modules).toHaveLength(2);
  });

  // Test 4: restoreFromUrl correctly restores all fields
  it('restoreFromUrl 正确还原所有字段', () => {
    const store = useProjectConfigStore();
    const params = new URLSearchParams(
      'name=my-app&adapter=fastify&pm=pnpm&linter=biome&test=vitest&hooks=husky&modules=docker,swagger&db=postgresql',
    );

    store.restoreFromUrl(params);

    expect(store.state.name).toBe('my-app');
    expect(store.state.adapter).toBe(HttpAdapter.Fastify);
    expect(store.state.packageManager).toBe(PackageManager.Pnpm);
    expect(store.state.linter).toBe(LinterOption.Biome);
    expect(store.state.testRunner).toBe(TestRunner.Vitest);
    expect(store.state.gitHooks).toBe(GitHooksOption.Husky);
    expect(store.state.modules.has(ModuleId.Docker)).toBe(true);
    expect(store.state.modules.has(ModuleId.Swagger)).toBe(true);
    expect(store.state.databaseType).toBe(DatabaseType.PostgreSQL);
  });

  // Test 5: Invalid adapter value falls back to default (Express)
  it('无效 adapter 值回退到默认值 Express', () => {
    const store = useProjectConfigStore();
    const params = new URLSearchParams('adapter=invalid-adapter');

    store.restoreFromUrl(params);

    expect(store.state.adapter).toBe(HttpAdapter.Express);
  });

  // Test 6: Invalid pm value falls back to default (npm)
  it('无效 pm 值回退到默认值 npm', () => {
    const store = useProjectConfigStore();
    const params = new URLSearchParams('pm=bun');

    store.restoreFromUrl(params);

    expect(store.state.packageManager).toBe(PackageManager.Npm);
  });

  // Test 7: Invalid module ID is ignored
  it('无效模块 ID 被忽略', () => {
    const store = useProjectConfigStore();
    const params = new URLSearchParams('modules=docker,invalid-module,swagger');

    store.restoreFromUrl(params);

    expect(store.state.modules.has(ModuleId.Docker)).toBe(true);
    expect(store.state.modules.has(ModuleId.Swagger)).toBe(true);
    expect(store.state.modules.has('invalid-module' as ModuleId)).toBe(false);
    expect(store.state.modules.size).toBe(2);
  });

  // Test 8: Empty URL params restore defaults
  it('空 URL 参数保持默认值', () => {
    const store = useProjectConfigStore();
    const params = new URLSearchParams('');

    store.restoreFromUrl(params);

    expect(store.state.name).toBe('my-nest-app');
    expect(store.state.adapter).toBe(HttpAdapter.Express);
    expect(store.state.packageManager).toBe(PackageManager.Npm);
    expect(store.state.linter).toBe(LinterOption.EslintPrettier);
    expect(store.state.testRunner).toBe(TestRunner.Jest);
    expect(store.state.gitHooks).toBe(GitHooksOption.None);
    expect(store.state.modules.size).toBe(0);
    expect(store.state.databaseType).toBeNull();
  });

  // Test 9: Round-trip: toQueryString → restoreFromUrl produces equivalent config
  it('往返一致性：toQueryString → restoreFromUrl 得到等价配置', () => {
    const store = useProjectConfigStore();

    // Set up a non-default config
    store.state.name = 'round-trip-app';
    store.state.adapter = HttpAdapter.Fastify;
    store.state.packageManager = PackageManager.Yarn;
    store.state.linter = LinterOption.Biome;
    store.state.testRunner = TestRunner.Vitest;
    store.state.gitHooks = GitHooksOption.Husky;
    store.state.modules.add(ModuleId.Docker);
    store.state.modules.add(ModuleId.Swagger);

    const qs = store.toQueryString();

    // Restore in a fresh store
    setActivePinia(createPinia());
    const store2 = useProjectConfigStore();
    store2.restoreFromUrl(new URLSearchParams(qs));

    expect(store2.state.name).toBe(store.state.name);
    expect(store2.state.adapter).toBe(store.state.adapter);
    expect(store2.state.packageManager).toBe(store.state.packageManager);
    expect(store2.state.linter).toBe(store.state.linter);
    expect(store2.state.testRunner).toBe(store.state.testRunner);
    expect(store2.state.gitHooks).toBe(store.state.gitHooks);
    expect([...store2.state.modules].sort()).toEqual([...store.state.modules].sort());
  });

  // Test 10: Default name is not included in query string
  it('默认项目名称不包含在 query string 中', () => {
    const store = useProjectConfigStore();
    // name is already 'my-nest-app' by default
    const qs = store.toQueryString();
    const params = new URLSearchParams(qs);
    expect(params.has('name')).toBe(false);
  });

  // Test 11: Database type serializes correctly
  it('数据库类型正确序列化', () => {
    const store = useProjectConfigStore();
    store.state.databaseType = DatabaseType.MySQL;

    const qs = store.toQueryString();
    const params = new URLSearchParams(qs);

    expect(params.get('db')).toBe('mysql');
  });

  // Test 12: Invalid linter value falls back to default
  it('无效 linter 值回退到默认值', () => {
    const store = useProjectConfigStore();
    const params = new URLSearchParams('linter=unknown-linter');

    store.restoreFromUrl(params);

    expect(store.state.linter).toBe(LinterOption.EslintPrettier);
  });

  // Test 13: Invalid test runner value falls back to default
  it('无效 test 值回退到默认值', () => {
    const store = useProjectConfigStore();
    const params = new URLSearchParams('test=mocha');

    store.restoreFromUrl(params);

    expect(store.state.testRunner).toBe(TestRunner.Jest);
  });
});
