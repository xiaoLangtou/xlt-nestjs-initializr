import { describe, it, expect } from 'vitest';
import { FileComposer } from './FileComposer.js';
import type { PluginOutput } from '../types/index.js';
import {
  HttpAdapter,
  PackageManager,
  LinterOption,
  TestRunner,
  GitHooksOption,
} from '../types/index.js';
import type { ProjectConfig } from '../types/index.js';

const baseConfig: ProjectConfig = {
  name: 'test-project',
  adapter: HttpAdapter.Express,
  packageManager: PackageManager.Npm,
  linter: LinterOption.EslintPrettier,
  testRunner: TestRunner.Jest,
  gitHooks: GitHooksOption.None,
  modules: [],
};

describe('FileComposer', () => {
  it('should write all base files into VFS', () => {
    const composer = new FileComposer();
    const baseFiles = new Map<string, string>([
      ['src/main.ts', 'console.log("hello");'],
      ['package.json', '{"name":"test"}'],
    ]);

    const vfs = composer.compose(baseFiles, [], baseConfig);

    expect(vfs.get('src/main.ts')).toBe('console.log("hello");');
    const pkg = JSON.parse(vfs.get('package.json')!);
    expect(pkg.name).toBe('test');
  });

  it('should add new files from plugin outputs', () => {
    const composer = new FileComposer();
    const baseFiles = new Map<string, string>([
      ['package.json', '{"name":"test"}'],
    ]);

    const pluginOutputs: PluginOutput[] = [
      {
        pluginName: 'docker',
        newFiles: [
          { path: 'Dockerfile', content: 'FROM node:20' },
          { path: 'docker-compose.yml', content: 'version: "3"' },
        ],
        patches: [],
        dependencies: {},
        devDependencies: {},
      },
    ];

    const vfs = composer.compose(baseFiles, pluginOutputs, baseConfig);

    expect(vfs.get('Dockerfile')).toBe('FROM node:20');
    expect(vfs.get('docker-compose.yml')).toBe('version: "3"');
  });

  it('should not overwrite existing files with newFiles', () => {
    const composer = new FileComposer();
    const baseFiles = new Map<string, string>([
      ['package.json', '{"name":"test"}'],
      ['README.md', '# Original'],
    ]);

    const pluginOutputs: PluginOutput[] = [
      {
        pluginName: 'plugin-a',
        newFiles: [{ path: 'README.md', content: '# Overwritten' }],
        patches: [],
        dependencies: {},
        devDependencies: {},
      },
    ];

    const vfs = composer.compose(baseFiles, pluginOutputs, baseConfig);

    expect(vfs.get('README.md')).toBe('# Original');
  });

  it('should merge dependencies into package.json', () => {
    const composer = new FileComposer();
    const baseFiles = new Map<string, string>([
      ['package.json', JSON.stringify({
        name: 'test',
        dependencies: { '@nestjs/core': '^10.0.0' },
        devDependencies: { typescript: '^5.0.0' },
      })],
    ]);

    const pluginOutputs: PluginOutput[] = [
      {
        pluginName: 'swagger',
        newFiles: [],
        patches: [],
        dependencies: { '@nestjs/swagger': '^7.0.0' },
        devDependencies: {},
      },
      {
        pluginName: 'config',
        newFiles: [],
        patches: [],
        dependencies: { '@nestjs/config': '^3.0.0' },
        devDependencies: { 'cross-env': '^7.0.0' },
      },
    ];

    const vfs = composer.compose(baseFiles, pluginOutputs, baseConfig);

    const pkg = JSON.parse(vfs.get('package.json')!);
    expect(pkg.dependencies['@nestjs/core']).toBe('^10.0.0');
    expect(pkg.dependencies['@nestjs/swagger']).toBe('^7.0.0');
    expect(pkg.dependencies['@nestjs/config']).toBe('^3.0.0');
    expect(pkg.devDependencies.typescript).toBe('^5.0.0');
    expect(pkg.devDependencies['cross-env']).toBe('^7.0.0');
  });

  it('should apply AST patches via ConflictResolver', () => {
    const composer = new FileComposer();
    const appModuleContent = `
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`.trim();

    const baseFiles = new Map<string, string>([
      ['src/app.module.ts', appModuleContent],
      ['package.json', '{"name":"test"}'],
    ]);

    const pluginOutputs: PluginOutput[] = [
      {
        pluginName: 'config',
        newFiles: [],
        patches: [
          {
            pluginName: 'config',
            filePath: 'src/app.module.ts',
            operation: 'addImport',
            params: {
              moduleSpecifier: '@nestjs/config',
              namedImports: ['ConfigModule'],
            },
          },
          {
            pluginName: 'config',
            filePath: 'src/app.module.ts',
            operation: 'addModuleImport',
            params: {
              moduleName: 'ConfigModule',
              importCode: 'ConfigModule.forRoot({ isGlobal: true })',
            },
          },
        ],
        dependencies: { '@nestjs/config': '^3.0.0' },
        devDependencies: {},
      },
    ];

    const vfs = composer.compose(baseFiles, pluginOutputs, baseConfig);

    const result = vfs.get('src/app.module.ts')!;
    expect(result).toContain('@nestjs/config');
    expect(result).toContain('ConfigModule.forRoot');
  });

  it('should merge patches from multiple plugins on the same file', () => {
    const composer = new FileComposer();
    const appModuleContent = `
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}
`.trim();

    const baseFiles = new Map<string, string>([
      ['src/app.module.ts', appModuleContent],
      ['package.json', '{"name":"test"}'],
    ]);

    const pluginOutputs: PluginOutput[] = [
      {
        pluginName: 'config',
        newFiles: [],
        patches: [
          {
            pluginName: 'config',
            filePath: 'src/app.module.ts',
            operation: 'addImport',
            params: {
              moduleSpecifier: '@nestjs/config',
              namedImports: ['ConfigModule'],
            },
          },
          {
            pluginName: 'config',
            filePath: 'src/app.module.ts',
            operation: 'addModuleImport',
            params: { moduleName: 'ConfigModule', importCode: 'ConfigModule.forRoot()' },
          },
        ],
        dependencies: {},
        devDependencies: {},
      },
      {
        pluginName: 'swagger',
        newFiles: [],
        patches: [
          {
            pluginName: 'swagger',
            filePath: 'src/app.module.ts',
            operation: 'addImport',
            params: {
              moduleSpecifier: '@nestjs/swagger',
              namedImports: ['SwaggerModule'],
            },
          },
        ],
        dependencies: {},
        devDependencies: {},
      },
    ];

    const vfs = composer.compose(baseFiles, pluginOutputs, baseConfig);

    const result = vfs.get('src/app.module.ts')!;
    expect(result).toContain('@nestjs/config');
    expect(result).toContain('@nestjs/swagger');
    expect(result).toContain('ConfigModule.forRoot()');
  });

  it('should handle empty plugin outputs', () => {
    const composer = new FileComposer();
    const baseFiles = new Map<string, string>([
      ['package.json', '{"name":"test"}'],
    ]);

    const vfs = composer.compose(baseFiles, [], baseConfig);

    const pkg = JSON.parse(vfs.get('package.json')!);
    expect(pkg.name).toBe('test');
    expect(vfs.paths()).toHaveLength(1);
  });

  it('should skip patches for files not in VFS', () => {
    const composer = new FileComposer();
    const baseFiles = new Map<string, string>([
      ['package.json', '{"name":"test"}'],
    ]);

    const pluginOutputs: PluginOutput[] = [
      {
        pluginName: 'test',
        newFiles: [],
        patches: [
          {
            pluginName: 'test',
            filePath: 'nonexistent.ts',
            operation: 'addImport',
            params: { moduleSpecifier: 'foo', namedImports: ['Bar'] },
          },
        ],
        dependencies: {},
        devDependencies: {},
      },
    ];

    // Should not throw
    const vfs = composer.compose(baseFiles, pluginOutputs, baseConfig);
    expect(vfs.has('nonexistent.ts')).toBe(false);
  });

  it('should create dependencies/devDependencies if missing in package.json', () => {
    const composer = new FileComposer();
    const baseFiles = new Map<string, string>([
      ['package.json', '{"name":"test"}'],
    ]);

    const pluginOutputs: PluginOutput[] = [
      {
        pluginName: 'swagger',
        newFiles: [],
        patches: [],
        dependencies: { '@nestjs/swagger': '^7.0.0' },
        devDependencies: { 'some-dev-dep': '^1.0.0' },
      },
    ];

    const vfs = composer.compose(baseFiles, pluginOutputs, baseConfig);

    const pkg = JSON.parse(vfs.get('package.json')!);
    expect(pkg.dependencies['@nestjs/swagger']).toBe('^7.0.0');
    expect(pkg.devDependencies['some-dev-dep']).toBe('^1.0.0');
  });
});
