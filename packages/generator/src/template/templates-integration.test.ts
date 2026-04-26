import { describe, it, expect } from 'vitest';
import { TemplateRenderer } from './TemplateRenderer.js';
import { HttpAdapter, PackageManager, LinterOption, TestRunner, GitHooksOption } from '../types/enums.js';
import type { ProjectConfig } from '../types/interfaces.js';

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    name: 'test-project',
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

describe('Base templates integration', () => {
  const renderer = new TemplateRenderer();

  it('should render all 14 base template files', () => {
    const result = renderer.renderBaseTemplates(makeConfig());
    expect(result.size).toBe(14);
    const paths = [...result.keys()].sort();
    expect(paths).toContain('src/main.ts');
    expect(paths).toContain('src/app.module.ts');
    expect(paths).toContain('src/app.controller.ts');
    expect(paths).toContain('src/app.service.ts');
    expect(paths).toContain('package.json');
    expect(paths).toContain('tsconfig.json');
    expect(paths).toContain('README.md');
    expect(paths).toContain('.eslintrc.js');
    expect(paths).toContain('.prettierrc');
    expect(paths).toContain('biome.json');
    expect(paths).toContain('jest.config.ts');
    expect(paths).toContain('vitest.config.ts');
    expect(paths).toContain('test/app.e2e-spec.ts');
    expect(paths).toContain('.gitignore');
  });

  it('should not contain undefined in any rendered template', () => {
    const configs = [
      makeConfig(),
      makeConfig({ adapter: HttpAdapter.Fastify, packageManager: PackageManager.Pnpm, linter: LinterOption.Biome, testRunner: TestRunner.Vitest }),
      makeConfig({ packageManager: PackageManager.Yarn, gitHooks: GitHooksOption.Husky }),
    ];
    for (const config of configs) {
      const result = renderer.renderBaseTemplates(config);
      for (const [filePath, content] of result) {
        expect(content, `${filePath} should not contain "undefined"`).not.toContain('undefined');
      }
    }
  });

  describe('src/main.ts', () => {
    it('should use NestExpressApplication for Express adapter', () => {
      const result = renderer.renderBaseTemplates(makeConfig({ adapter: HttpAdapter.Express }));
      const mainTs = result.get('src/main.ts')!;
      expect(mainTs).toContain('NestExpressApplication');
      expect(mainTs).toContain('@nestjs/platform-express');
      expect(mainTs).not.toContain('FastifyAdapter');
    });

    it('should use NestFastifyApplication for Fastify adapter', () => {
      const result = renderer.renderBaseTemplates(makeConfig({ adapter: HttpAdapter.Fastify }));
      const mainTs = result.get('src/main.ts')!;
      expect(mainTs).toContain('NestFastifyApplication');
      expect(mainTs).toContain('FastifyAdapter');
      expect(mainTs).toContain('@nestjs/platform-fastify');
      expect(mainTs).not.toContain('NestExpressApplication');
    });
  });

  describe('src/app.module.ts', () => {
    it('should contain AppController and AppService imports and registration', () => {
      const result = renderer.renderBaseTemplates(makeConfig());
      const appModule = result.get('src/app.module.ts')!;
      expect(appModule).toContain('AppController');
      expect(appModule).toContain('AppService');
      expect(appModule).toContain("import { AppController } from './app.controller'");
      expect(appModule).toContain("import { AppService } from './app.service'");
      expect(appModule).toContain('controllers: [AppController]');
      expect(appModule).toContain('providers: [AppService]');
    });
  });

  describe('package.json', () => {
    it('should set name from config', () => {
      const result = renderer.renderBaseTemplates(makeConfig({ name: 'my-cool-app' }));
      const pkg = JSON.parse(result.get('package.json')!);
      expect(pkg.name).toBe('my-cool-app');
    });

    it('should include @nestjs/platform-express for Express adapter', () => {
      const result = renderer.renderBaseTemplates(makeConfig({ adapter: HttpAdapter.Express }));
      const pkg = JSON.parse(result.get('package.json')!);
      expect(pkg.dependencies['@nestjs/platform-express']).toBeDefined();
      expect(pkg.dependencies['@nestjs/platform-fastify']).toBeUndefined();
    });

    it('should include @nestjs/platform-fastify for Fastify adapter', () => {
      const result = renderer.renderBaseTemplates(makeConfig({ adapter: HttpAdapter.Fastify }));
      const pkg = JSON.parse(result.get('package.json')!);
      expect(pkg.dependencies['@nestjs/platform-fastify']).toBeDefined();
      expect(pkg.dependencies['@nestjs/platform-express']).toBeUndefined();
    });

    it('should include eslint deps when linter is eslint-prettier', () => {
      const result = renderer.renderBaseTemplates(makeConfig({ linter: LinterOption.EslintPrettier }));
      const pkg = JSON.parse(result.get('package.json')!);
      expect(pkg.devDependencies['eslint']).toBeDefined();
      expect(pkg.devDependencies['prettier']).toBeDefined();
      expect(pkg.devDependencies['@typescript-eslint/eslint-plugin']).toBeDefined();
    });

    it('should include biome dep when linter is biome', () => {
      const result = renderer.renderBaseTemplates(makeConfig({ linter: LinterOption.Biome }));
      const pkg = JSON.parse(result.get('package.json')!);
      expect(pkg.devDependencies['@biomejs/biome']).toBeDefined();
      expect(pkg.devDependencies['eslint']).toBeUndefined();
    });

    it('should include jest deps when testRunner is jest', () => {
      const result = renderer.renderBaseTemplates(makeConfig({ testRunner: TestRunner.Jest }));
      const pkg = JSON.parse(result.get('package.json')!);
      expect(pkg.devDependencies['jest']).toBeDefined();
      expect(pkg.devDependencies['ts-jest']).toBeDefined();
      expect(pkg.scripts['test']).toBe('jest');
    });

    it('should include vitest deps when testRunner is vitest', () => {
      const result = renderer.renderBaseTemplates(makeConfig({ testRunner: TestRunner.Vitest }));
      const pkg = JSON.parse(result.get('package.json')!);
      expect(pkg.devDependencies['vitest']).toBeDefined();
      expect(pkg.devDependencies['jest']).toBeUndefined();
      expect(pkg.scripts['test']).toBe('vitest run');
    });
  });

  describe('README.md', () => {
    it('should contain project name and description', () => {
      const result = renderer.renderBaseTemplates(makeConfig({ name: 'awesome-app', description: 'My awesome app' }));
      const readme = result.get('README.md')!;
      expect(readme).toContain('awesome-app');
      expect(readme).toContain('My awesome app');
    });

    it('should show correct package manager commands', () => {
      const npmResult = renderer.renderBaseTemplates(makeConfig({ packageManager: PackageManager.Npm }));
      expect(npmResult.get('README.md')!).toContain('npm install');

      const yarnResult = renderer.renderBaseTemplates(makeConfig({ packageManager: PackageManager.Yarn }));
      expect(yarnResult.get('README.md')!).toContain('yarn install');

      const pnpmResult = renderer.renderBaseTemplates(makeConfig({ packageManager: PackageManager.Pnpm }));
      expect(pnpmResult.get('README.md')!).toContain('pnpm install');
    });
  });
});
