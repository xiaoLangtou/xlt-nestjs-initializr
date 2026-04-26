/**
 * Full end-to-end integration tests for the generation pipeline.
 * Tests: frontend config → GeneratorEngine → ZIP buffer → unzip → verify files
 *
 * Validates: Requirements 4.2, 4.4, 4.5, 4.6, 4.7
 */
import { describe, it, expect } from 'vitest';
import AdmZip from 'adm-zip';
import { GeneratorEngine } from './GeneratorEngine.js';
import { TemplateRenderer } from '../template/TemplateRenderer.js';
import { PluginRegistry } from '../plugin/PluginRegistry.js';
import { FileComposer } from '../composer/FileComposer.js';
import { ZipBuilder } from '../zip/ZipBuilder.js';
import { ConfigPlugin } from '../plugins/ConfigPlugin.js';
import { SwaggerPlugin } from '../plugins/SwaggerPlugin.js';
import { DockerPlugin } from '../plugins/DockerPlugin.js';
import { GraphQLPlugin } from '../plugins/GraphQLPlugin.js';
import { TypeORMPlugin } from '../plugins/TypeORMPlugin.js';
import { PrismaPlugin } from '../plugins/PrismaPlugin.js';
import { I18nPlugin } from '../plugins/I18nPlugin.js';
import { BullPlugin } from '../plugins/BullPlugin.js';
import { HealthCheckPlugin } from '../plugins/HealthCheckPlugin.js';
import {
  HttpAdapter,
  PackageManager,
  LinterOption,
  TestRunner,
  GitHooksOption,
  ModuleId,
  DatabaseType,
} from '../types/enums.js';
import type { ProjectConfig } from '../types/interfaces.js';

function createEngine(): GeneratorEngine {
  const templateRenderer = new TemplateRenderer();
  const pluginRegistry = new PluginRegistry();
  pluginRegistry.register(new ConfigPlugin());
  pluginRegistry.register(new SwaggerPlugin());
  pluginRegistry.register(new DockerPlugin());
  pluginRegistry.register(new GraphQLPlugin());
  pluginRegistry.register(new TypeORMPlugin());
  pluginRegistry.register(new PrismaPlugin());
  pluginRegistry.register(new I18nPlugin());
  pluginRegistry.register(new BullPlugin());
  pluginRegistry.register(new HealthCheckPlugin());
  const fileComposer = new FileComposer();
  const zipBuilder = new ZipBuilder();
  return new GeneratorEngine(templateRenderer, pluginRegistry, fileComposer, zipBuilder);
}

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    name: 'my-app',
    description: 'A test project',
    adapter: HttpAdapter.Express,
    packageManager: PackageManager.Npm,
    linter: LinterOption.EslintPrettier,
    testRunner: TestRunner.Jest,
    gitHooks: GitHooksOption.None,
    modules: [],
    ...overrides,
  };
}

/**
 * Unzip a buffer and return a map of { filePath -> content }
 * All paths are relative to the ZIP root directory.
 */
function unzipBuffer(buffer: Buffer): Map<string, string> {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const files = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.isDirectory) {
      // Strip the root directory prefix (e.g. "my-app/src/main.ts" -> "src/main.ts")
      const parts = entry.entryName.split('/');
      const relativePath = parts.slice(1).join('/');
      files.set(relativePath, entry.getData().toString('utf-8'));
    }
  }
  return files;
}

/**
 * Get the root directory name from the ZIP buffer.
 */
function getZipRootDir(buffer: Buffer): string {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  if (entries.length === 0) return '';
  return entries[0].entryName.split('/')[0];
}

describe('GeneratorEngine integration tests', () => {
  describe('Default config (Express + npm + ESLint + Jest, no modules)', () => {
    it('should generate a valid ZIP with correct root directory name', async () => {
      const config = makeConfig({ name: 'hello-world' });
      const engine = createEngine();
      const buffer = await engine.generate(config);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      const rootDir = getZipRootDir(buffer);
      expect(rootDir).toBe('hello-world');
    });

    it('should contain all required base files', async () => {
      const config = makeConfig();
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      expect(files.has('src/main.ts')).toBe(true);
      expect(files.has('src/app.module.ts')).toBe(true);
      expect(files.has('src/app.controller.ts')).toBe(true);
      expect(files.has('src/app.service.ts')).toBe(true);
      expect(files.has('package.json')).toBe(true);
      expect(files.has('tsconfig.json')).toBe(true);
      expect(files.has('README.md')).toBe(true);
    });

    it('should have package.json name matching project name', async () => {
      const config = makeConfig({ name: 'my-nest-app' });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      const pkg = JSON.parse(files.get('package.json')!);
      expect(pkg.name).toBe('my-nest-app');
    });

    it('should have README.md containing project name', async () => {
      const config = makeConfig({ name: 'my-nest-app' });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      expect(files.get('README.md')).toContain('my-nest-app');
    });

    it('should have src/main.ts containing NestExpressApplication', async () => {
      const config = makeConfig({ adapter: HttpAdapter.Express });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      expect(files.get('src/main.ts')).toContain('NestExpressApplication');
    });

    it('should contain .eslintrc.js and .prettierrc (not biome.json)', async () => {
      const config = makeConfig({ linter: LinterOption.EslintPrettier });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      expect(files.has('.eslintrc.js')).toBe(true);
      expect(files.has('.prettierrc')).toBe(true);
      expect(files.has('biome.json')).toBe(false);
    });

    it('should contain jest.config.ts (not vitest.config.ts)', async () => {
      const config = makeConfig({ testRunner: TestRunner.Jest });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      expect(files.has('jest.config.ts')).toBe(true);
      expect(files.has('vitest.config.ts')).toBe(false);
    });
  });

  describe('Fastify + pnpm + Biome + Vitest config', () => {
    it('should have src/main.ts containing NestFastifyApplication', async () => {
      const config = makeConfig({
        adapter: HttpAdapter.Fastify,
        packageManager: PackageManager.Pnpm,
        linter: LinterOption.Biome,
        testRunner: TestRunner.Vitest,
      });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      expect(files.get('src/main.ts')).toContain('NestFastifyApplication');
    });

    it('should contain biome.json (not .eslintrc.js)', async () => {
      const config = makeConfig({
        adapter: HttpAdapter.Fastify,
        packageManager: PackageManager.Pnpm,
        linter: LinterOption.Biome,
        testRunner: TestRunner.Vitest,
      });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      expect(files.has('biome.json')).toBe(true);
      expect(files.has('.eslintrc.js')).toBe(false);
    });

    it('should contain vitest.config.ts (not jest.config.ts)', async () => {
      const config = makeConfig({
        adapter: HttpAdapter.Fastify,
        packageManager: PackageManager.Pnpm,
        linter: LinterOption.Biome,
        testRunner: TestRunner.Vitest,
      });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      expect(files.has('vitest.config.ts')).toBe(true);
      expect(files.has('jest.config.ts')).toBe(false);
    });
  });

  describe('Config with Swagger module', () => {
    it('should have src/main.ts containing SwaggerModule.setup', async () => {
      const config = makeConfig({ modules: [ModuleId.Swagger] });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      expect(files.get('src/main.ts')).toContain('SwaggerModule.setup');
    });

    it('should have package.json containing @nestjs/swagger', async () => {
      const config = makeConfig({ modules: [ModuleId.Swagger] });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      const pkg = JSON.parse(files.get('package.json')!);
      expect(pkg.dependencies['@nestjs/swagger']).toBeDefined();
    });
  });

  describe('Config with Docker module', () => {
    it('should contain Dockerfile', async () => {
      const config = makeConfig({ modules: [ModuleId.Docker] });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      expect(files.has('Dockerfile')).toBe(true);
    });

    it('should contain docker-compose.yml', async () => {
      const config = makeConfig({ modules: [ModuleId.Docker] });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      expect(files.has('docker-compose.yml')).toBe(true);
    });

    it('should contain .dockerignore', async () => {
      const config = makeConfig({ modules: [ModuleId.Docker] });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      expect(files.has('.dockerignore')).toBe(true);
    });
  });

  describe('Config with TypeORM + Config modules (PostgreSQL)', () => {
    it('should contain src/entities/sample.entity.ts', async () => {
      const config = makeConfig({
        modules: [ModuleId.Config, ModuleId.TypeORM],
        databaseType: DatabaseType.PostgreSQL,
      });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      expect(files.has('src/entities/sample.entity.ts')).toBe(true);
    });

    it('should have package.json containing @nestjs/typeorm and pg', async () => {
      const config = makeConfig({
        modules: [ModuleId.Config, ModuleId.TypeORM],
        databaseType: DatabaseType.PostgreSQL,
      });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      const pkg = JSON.parse(files.get('package.json')!);
      expect(pkg.dependencies['@nestjs/typeorm']).toBeDefined();
      expect(pkg.dependencies['pg']).toBeDefined();
    });

    it('should have src/app.module.ts containing TypeOrmModule', async () => {
      const config = makeConfig({
        modules: [ModuleId.Config, ModuleId.TypeORM],
        databaseType: DatabaseType.PostgreSQL,
      });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      expect(files.get('src/app.module.ts')).toContain('TypeOrmModule');
    });
  });

  describe('Config with Prisma + Config modules', () => {
    it('should contain prisma/schema.prisma', async () => {
      const config = makeConfig({ modules: [ModuleId.Config, ModuleId.Prisma] });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      expect(files.has('prisma/schema.prisma')).toBe(true);
    });

    it('should contain src/prisma/prisma.service.ts', async () => {
      const config = makeConfig({ modules: [ModuleId.Config, ModuleId.Prisma] });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      expect(files.has('src/prisma/prisma.service.ts')).toBe(true);
    });

    it('should have package.json containing @prisma/client', async () => {
      const config = makeConfig({ modules: [ModuleId.Config, ModuleId.Prisma] });
      const engine = createEngine();
      const buffer = await engine.generate(config);
      const files = unzipBuffer(buffer);

      const pkg = JSON.parse(files.get('package.json')!);
      expect(pkg.dependencies['@prisma/client']).toBeDefined();
    });
  });
});
