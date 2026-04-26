import { describe, it, expect, vi } from 'vitest';
import { GeneratorEngine } from './GeneratorEngine.js';
import { TemplateRenderError, PluginExecutionError, GeneratorError } from './errors.js';
import {
  HttpAdapter,
  PackageManager,
  LinterOption,
  TestRunner,
  GitHooksOption,
} from '../types/enums.js';
import type {
  ProjectConfig,
  ModulePlugin,
  VirtualFileSystem,
  FilePatch,
} from '../types/interfaces.js';
import type { TemplateRenderer } from '../template/TemplateRenderer.js';
import type { PluginRegistry } from '../plugin/PluginRegistry.js';
import type { IFileComposer } from '../composer/FileComposer.js';
import type { ZipBuilder } from '../zip/ZipBuilder.js';

function makeConfig(overrides?: Partial<ProjectConfig>): ProjectConfig {
  return {
    name: 'test-project',
    adapter: HttpAdapter.Express,
    packageManager: PackageManager.Npm,
    linter: LinterOption.EslintPrettier,
    testRunner: TestRunner.Jest,
    gitHooks: GitHooksOption.None,
    modules: [],
    ...overrides,
  };
}

function createMockTemplateRenderer(
  baseFiles?: Map<string, string>,
): TemplateRenderer {
  return {
    renderBaseTemplates: vi.fn().mockReturnValue(
      baseFiles ?? new Map([['package.json', '{}'], ['src/main.ts', 'bootstrap()']]),
    ),
    render: vi.fn(),
    buildContext: vi.fn(),
  } as unknown as TemplateRenderer;
}

function createMockPluginRegistry(plugins?: ModulePlugin[]): PluginRegistry {
  return {
    getActivePlugins: vi.fn().mockReturnValue(plugins ?? []),
    register: vi.fn(),
    topologicalSort: vi.fn(),
  } as unknown as PluginRegistry;
}

function createMockFileComposer(): IFileComposer {
  const vfs: VirtualFileSystem = {
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn().mockReturnValue(false),
    delete: vi.fn(),
    paths: vi.fn().mockReturnValue([]),
    entries: vi.fn().mockReturnValue(new Map()),
  };
  return {
    compose: vi.fn().mockReturnValue(vfs),
  };
}

function createMockZipBuilder(): ZipBuilder {
  return {
    build: vi.fn().mockResolvedValue(Buffer.from('fake-zip')),
  } as unknown as ZipBuilder;
}

describe('GeneratorEngine', () => {
  it('should orchestrate the full generation pipeline', async () => {
    const config = makeConfig();
    const baseFiles = new Map([['package.json', '{}']]);
    const templateRenderer = createMockTemplateRenderer(baseFiles);
    const pluginRegistry = createMockPluginRegistry([]);
    const fileComposer = createMockFileComposer();
    const zipBuilder = createMockZipBuilder();

    const engine = new GeneratorEngine(
      templateRenderer,
      pluginRegistry,
      fileComposer,
      zipBuilder,
    );

    const result = await engine.generate(config);

    expect(templateRenderer.renderBaseTemplates).toHaveBeenCalledWith(config);
    expect(pluginRegistry.getActivePlugins).toHaveBeenCalledWith(config.modules);
    expect(fileComposer.compose).toHaveBeenCalledWith(baseFiles, [], config);
    expect(zipBuilder.build).toHaveBeenCalled();
    expect(result).toBeInstanceOf(Buffer);
  });

  it('should collect plugin outputs from active plugins', async () => {
    const config = makeConfig();
    const plugin: ModulePlugin = {
      name: 'test-plugin',
      description: 'A test plugin',
      getDependencies: vi.fn().mockReturnValue({
        dependencies: { 'some-pkg': '^1.0.0' },
        devDependencies: {},
      }),
      getFiles: vi.fn().mockReturnValue([
        { path: 'src/test.ts', content: 'export class Test {}' },
      ]),
      patchFiles: vi.fn((vfs) => vfs),
    };

    const templateRenderer = createMockTemplateRenderer();
    const pluginRegistry = createMockPluginRegistry([plugin]);
    const fileComposer = createMockFileComposer();
    const zipBuilder = createMockZipBuilder();

    const engine = new GeneratorEngine(
      templateRenderer,
      pluginRegistry,
      fileComposer,
      zipBuilder,
    );

    await engine.generate(config);

    expect(plugin.getDependencies).toHaveBeenCalledWith(config);
    expect(plugin.getFiles).toHaveBeenCalledWith(config);
    expect(fileComposer.compose).toHaveBeenCalledWith(
      expect.any(Map),
      [
        {
          pluginName: 'test-plugin',
          newFiles: [{ path: 'src/test.ts', content: 'export class Test {}' }],
          patches: [],
          dependencies: { 'some-pkg': '^1.0.0' },
          devDependencies: {},
        },
      ],
      config,
    );
  });

  it('should use getPatches when available on a plugin', async () => {
    const config = makeConfig();
    const patches: FilePatch[] = [
      {
        pluginName: 'patchy-plugin',
        filePath: 'src/app.module.ts',
        operation: 'addImport',
        params: { moduleSpecifier: '@nestjs/config', namedImports: ['ConfigModule'] },
      },
    ];
    const plugin: ModulePlugin = {
      name: 'patchy-plugin',
      description: 'Plugin with getPatches',
      getDependencies: vi.fn().mockReturnValue({ dependencies: {}, devDependencies: {} }),
      getFiles: vi.fn().mockReturnValue([]),
      patchFiles: vi.fn((vfs) => vfs),
      getPatches: vi.fn().mockReturnValue(patches),
    };

    const templateRenderer = createMockTemplateRenderer();
    const pluginRegistry = createMockPluginRegistry([plugin]);
    const fileComposer = createMockFileComposer();
    const zipBuilder = createMockZipBuilder();

    const engine = new GeneratorEngine(
      templateRenderer,
      pluginRegistry,
      fileComposer,
      zipBuilder,
    );

    await engine.generate(config);

    expect(plugin.getPatches).toHaveBeenCalledWith(config);
    expect(fileComposer.compose).toHaveBeenCalledWith(
      expect.any(Map),
      [expect.objectContaining({ patches })],
      config,
    );
  });

  describe('error handling', () => {
    it('should wrap template rendering errors in TemplateRenderError', async () => {
      const config = makeConfig();
      const templateRenderer = createMockTemplateRenderer();
      (templateRenderer.renderBaseTemplates as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Handlebars compilation failed');
      });

      const engine = new GeneratorEngine(
        templateRenderer,
        createMockPluginRegistry(),
        createMockFileComposer(),
        createMockZipBuilder(),
      );

      await expect(engine.generate(config)).rejects.toThrow(TemplateRenderError);
      await expect(engine.generate(config)).rejects.toThrow(
        /Failed to render base templates.*Handlebars compilation failed/,
      );
    });

    it('should wrap plugin execution errors in PluginExecutionError', async () => {
      const config = makeConfig();
      const plugin: ModulePlugin = {
        name: 'broken-plugin',
        description: 'A broken plugin',
        getDependencies: vi.fn().mockImplementation(() => {
          throw new Error('getDependencies failed');
        }),
        getFiles: vi.fn().mockReturnValue([]),
        patchFiles: vi.fn((vfs) => vfs),
      };

      const engine = new GeneratorEngine(
        createMockTemplateRenderer(),
        createMockPluginRegistry([plugin]),
        createMockFileComposer(),
        createMockZipBuilder(),
      );

      try {
        await engine.generate(config);
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PluginExecutionError);
        expect((error as PluginExecutionError).pluginName).toBe('broken-plugin');
        expect((error as PluginExecutionError).message).toContain('broken-plugin');
      }
    });

    it('TemplateRenderError and PluginExecutionError should extend GeneratorError', () => {
      const templateErr = new TemplateRenderError('test');
      const pluginErr = new PluginExecutionError('test', 'my-plugin');

      expect(templateErr).toBeInstanceOf(GeneratorError);
      expect(templateErr).toBeInstanceOf(Error);
      expect(pluginErr).toBeInstanceOf(GeneratorError);
      expect(pluginErr).toBeInstanceOf(Error);
      expect(pluginErr.pluginName).toBe('my-plugin');
    });
  });

  describe('conditional file filtering', () => {
    it('should remove ESLint/Prettier files when using Biome', async () => {
      const config = makeConfig({ linter: LinterOption.Biome });
      const vfs: VirtualFileSystem = {
        get: vi.fn(),
        set: vi.fn(),
        has: vi.fn().mockReturnValue(true),
        delete: vi.fn(),
        paths: vi.fn().mockReturnValue([]),
        entries: vi.fn().mockReturnValue(new Map()),
      };

      const fileComposer = { compose: vi.fn().mockReturnValue(vfs) };
      const engine = new GeneratorEngine(
        createMockTemplateRenderer(),
        createMockPluginRegistry(),
        fileComposer,
        createMockZipBuilder(),
      );

      await engine.generate(config);

      expect(vfs.delete).toHaveBeenCalledWith('.eslintrc.js');
      expect(vfs.delete).toHaveBeenCalledWith('.prettierrc');
      expect(vfs.delete).not.toHaveBeenCalledWith('biome.json');
    });

    it('should remove biome.json when using ESLint', async () => {
      const config = makeConfig({ linter: LinterOption.EslintPrettier });
      const vfs: VirtualFileSystem = {
        get: vi.fn(),
        set: vi.fn(),
        has: vi.fn().mockReturnValue(true),
        delete: vi.fn(),
        paths: vi.fn().mockReturnValue([]),
        entries: vi.fn().mockReturnValue(new Map()),
      };

      const fileComposer = { compose: vi.fn().mockReturnValue(vfs) };
      const engine = new GeneratorEngine(
        createMockTemplateRenderer(),
        createMockPluginRegistry(),
        fileComposer,
        createMockZipBuilder(),
      );

      await engine.generate(config);

      expect(vfs.delete).toHaveBeenCalledWith('biome.json');
      expect(vfs.delete).not.toHaveBeenCalledWith('.eslintrc.js');
    });

    it('should remove jest.config.ts when using Vitest', async () => {
      const config = makeConfig({ testRunner: TestRunner.Vitest });
      const vfs: VirtualFileSystem = {
        get: vi.fn(),
        set: vi.fn(),
        has: vi.fn().mockReturnValue(true),
        delete: vi.fn(),
        paths: vi.fn().mockReturnValue([]),
        entries: vi.fn().mockReturnValue(new Map()),
      };

      const fileComposer = { compose: vi.fn().mockReturnValue(vfs) };
      const engine = new GeneratorEngine(
        createMockTemplateRenderer(),
        createMockPluginRegistry(),
        fileComposer,
        createMockZipBuilder(),
      );

      await engine.generate(config);

      expect(vfs.delete).toHaveBeenCalledWith('jest.config.ts');
      expect(vfs.delete).not.toHaveBeenCalledWith('vitest.config.ts');
    });

    it('should remove vitest.config.ts when using Jest', async () => {
      const config = makeConfig({ testRunner: TestRunner.Jest });
      const vfs: VirtualFileSystem = {
        get: vi.fn(),
        set: vi.fn(),
        has: vi.fn().mockReturnValue(true),
        delete: vi.fn(),
        paths: vi.fn().mockReturnValue([]),
        entries: vi.fn().mockReturnValue(new Map()),
      };

      const fileComposer = { compose: vi.fn().mockReturnValue(vfs) };
      const engine = new GeneratorEngine(
        createMockTemplateRenderer(),
        createMockPluginRegistry(),
        fileComposer,
        createMockZipBuilder(),
      );

      await engine.generate(config);

      expect(vfs.delete).toHaveBeenCalledWith('vitest.config.ts');
      expect(vfs.delete).not.toHaveBeenCalledWith('jest.config.ts');
    });
  });
});
