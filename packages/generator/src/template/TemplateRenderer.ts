import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import type { ProjectConfig } from '../types/interfaces.js';
import { HttpAdapter, PackageManager, LinterOption, TestRunner, GitHooksOption } from '../types/enums.js';

// Resolve the directory of this file in both ESM and CJS environments.
// In CJS, __dirname is injected by tsup's --shims flag.
// In ESM, we derive it from import.meta.url.
// We use a function to defer evaluation so the wrong branch is never executed.
function getCurrentDir(): string {
  if (typeof __dirname === 'string') return __dirname;
  return path.dirname(fileURLToPath(import.meta.url));
}

/** Root of the generator package (packages/generator) */
const PACKAGE_ROOT = path.resolve(getCurrentDir(), '..');

/**
 * Handlebars-based template renderer for NestJS project generation.
 *
 * Compiles .hbs template files with project configuration context
 * and returns rendered file content.
 */
export class TemplateRenderer {
  private readonly handlebars: typeof Handlebars;
  private readonly templatesDir: string;

  constructor(templatesDir?: string) {
    this.handlebars = Handlebars.create();
    this.templatesDir = templatesDir ?? path.join(PACKAGE_ROOT, 'templates');
    this.registerHelpers();
  }

  /**
   * Render a single Handlebars template file.
   * @param templatePath Absolute or relative path to a .hbs template file
   * @param context Template context data
   * @returns Rendered file content
   */
  render(templatePath: string, context: Record<string, unknown>): string {
    const absolutePath = path.isAbsolute(templatePath)
      ? templatePath
      : path.resolve(templatePath);

    const source = fs.readFileSync(absolutePath, 'utf-8');
    const template = this.handlebars.compile(source, { strict: false });
    return template(context);
  }

  /**
   * Batch-render all .hbs templates under templates/base/.
   * Returns a Map of output file paths (with .hbs suffix removed) to rendered content.
   */
  renderBaseTemplates(config: ProjectConfig): Map<string, string> {
    const baseDir = path.join(this.templatesDir, 'base');
    const context = this.buildContext(config);
    const result = new Map<string, string>();

    const templateFiles = this.collectHbsFiles(baseDir);

    for (const absoluteTemplatePath of templateFiles) {
      const relativePath = path.relative(baseDir, absoluteTemplatePath);
      // Remove .hbs suffix from output path
      const outputPath = relativePath.replace(/\.hbs$/, '');

      const content = this.render(absoluteTemplatePath, context);
      result.set(outputPath, content);
    }

    return result;
  }

  /**
   * Build the full template context from a ProjectConfig.
   * Includes all config fields plus computed boolean helpers.
   */
  buildContext(config: ProjectConfig): Record<string, unknown> {
    return {
      // Spread all config fields
      name: config.name,
      description: config.description ?? '',
      adapter: config.adapter,
      packageManager: config.packageManager,
      linter: config.linter,
      testRunner: config.testRunner,
      gitHooks: config.gitHooks,
      modules: config.modules,
      databaseType: config.databaseType ?? '',

      // Computed boolean helpers for conditional rendering
      isExpress: config.adapter === HttpAdapter.Express,
      isFastify: config.adapter === HttpAdapter.Fastify,

      isNpm: config.packageManager === PackageManager.Npm,
      isYarn: config.packageManager === PackageManager.Yarn,
      isPnpm: config.packageManager === PackageManager.Pnpm,

      isEslint: config.linter === LinterOption.EslintPrettier,
      isBiome: config.linter === LinterOption.Biome,

      isJest: config.testRunner === TestRunner.Jest,
      isVitest: config.testRunner === TestRunner.Vitest,

      isHusky: config.gitHooks === GitHooksOption.Husky,
    };
  }

  /**
   * Register custom Handlebars helpers.
   */
  private registerHelpers(): void {
    // Equality comparison helper: {{#if (eq adapter "express")}}
    this.handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  }

  /**
   * Recursively collect all .hbs files under a directory.
   */
  private collectHbsFiles(dir: string): string[] {
    const results: string[] = [];

    if (!fs.existsSync(dir)) {
      return results;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.collectHbsFiles(fullPath));
      } else if (entry.name.endsWith('.hbs')) {
        results.push(fullPath);
      }
    }

    return results;
  }
}
