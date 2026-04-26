import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
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

describe('TemplateRenderer', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmpl-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('render', () => {
    it('should compile and render a simple template', () => {
      const templateFile = path.join(tmpDir, 'hello.txt.hbs');
      fs.writeFileSync(templateFile, 'Hello, {{name}}!');

      const renderer = new TemplateRenderer(tmpDir);
      const result = renderer.render(templateFile, { name: 'World' });
      expect(result).toBe('Hello, World!');
    });

    it('should replace undefined variables with empty string (strict: false)', () => {
      const templateFile = path.join(tmpDir, 'test.hbs');
      fs.writeFileSync(templateFile, 'Value: {{missing}}');

      const renderer = new TemplateRenderer(tmpDir);
      const result = renderer.render(templateFile, {});
      expect(result).toBe('Value: ');
      expect(result).not.toContain('undefined');
    });

    it('should support the eq helper for conditional rendering', () => {
      const templateFile = path.join(tmpDir, 'cond.hbs');
      fs.writeFileSync(templateFile, '{{#if (eq adapter "express")}}EXPRESS{{else}}OTHER{{/if}}');

      const renderer = new TemplateRenderer(tmpDir);
      expect(renderer.render(templateFile, { adapter: 'express' })).toBe('EXPRESS');
      expect(renderer.render(templateFile, { adapter: 'fastify' })).toBe('OTHER');
    });
  });

  describe('renderBaseTemplates', () => {
    it('should render all .hbs files in templates/base/ and strip .hbs suffix', () => {
      // Set up a fake templates/base directory
      const baseDir = path.join(tmpDir, 'base');
      fs.mkdirSync(path.join(baseDir, 'src'), { recursive: true });

      fs.writeFileSync(path.join(baseDir, 'package.json.hbs'), '{"name": "{{name}}"}');
      fs.writeFileSync(path.join(baseDir, 'src', 'main.ts.hbs'), '// {{name}} main');

      const renderer = new TemplateRenderer(tmpDir);
      const config = makeConfig({ name: 'my-app' });
      const result = renderer.renderBaseTemplates(config);

      expect(result.has('package.json')).toBe(true);
      expect(result.has('src/main.ts')).toBe(true);
      expect(result.has('package.json.hbs')).toBe(false);

      expect(result.get('package.json')).toBe('{"name": "my-app"}');
      expect(result.get('src/main.ts')).toBe('// my-app main');
    });

    it('should return empty map when templates/base/ does not exist', () => {
      const renderer = new TemplateRenderer(path.join(tmpDir, 'nonexistent'));
      const config = makeConfig();
      const result = renderer.renderBaseTemplates(config);
      expect(result.size).toBe(0);
    });

    it('should include computed boolean helpers in context', () => {
      const baseDir = path.join(tmpDir, 'base');
      fs.mkdirSync(baseDir, { recursive: true });
      fs.writeFileSync(
        path.join(baseDir, 'test.txt.hbs'),
        '{{#if isExpress}}express{{/if}}{{#if isFastify}}fastify{{/if}}',
      );

      const renderer = new TemplateRenderer(tmpDir);

      const expressResult = renderer.renderBaseTemplates(makeConfig({ adapter: HttpAdapter.Express }));
      expect(expressResult.get('test.txt')).toBe('express');

      const fastifyResult = renderer.renderBaseTemplates(makeConfig({ adapter: HttpAdapter.Fastify }));
      expect(fastifyResult.get('test.txt')).toBe('fastify');
    });
  });

  describe('buildContext', () => {
    it('should compute all boolean helpers correctly', () => {
      const renderer = new TemplateRenderer(tmpDir);
      const config = makeConfig({
        adapter: HttpAdapter.Fastify,
        packageManager: PackageManager.Pnpm,
        linter: LinterOption.Biome,
        testRunner: TestRunner.Vitest,
        gitHooks: GitHooksOption.Husky,
      });

      const ctx = renderer.buildContext(config);

      expect(ctx.isExpress).toBe(false);
      expect(ctx.isFastify).toBe(true);
      expect(ctx.isNpm).toBe(false);
      expect(ctx.isYarn).toBe(false);
      expect(ctx.isPnpm).toBe(true);
      expect(ctx.isEslint).toBe(false);
      expect(ctx.isBiome).toBe(true);
      expect(ctx.isJest).toBe(false);
      expect(ctx.isVitest).toBe(true);
      expect(ctx.isHusky).toBe(true);
    });

    it('should default description and databaseType to empty string when undefined', () => {
      const renderer = new TemplateRenderer(tmpDir);
      const config = makeConfig({ description: undefined, databaseType: undefined });
      const ctx = renderer.buildContext(config);

      expect(ctx.description).toBe('');
      expect(ctx.databaseType).toBe('');
    });
  });
});
