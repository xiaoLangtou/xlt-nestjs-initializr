import type { TemplateRenderer } from '../template/TemplateRenderer.js';
import type { PluginRegistry } from '../plugin/PluginRegistry.js';
import type { IFileComposer } from '../composer/FileComposer.js';
import type { ZipBuilder } from '../zip/ZipBuilder.js';
import type { ProjectConfig, PluginOutput, ModulePlugin, FilePatch } from '../types/interfaces.js';
import { LinterOption, TestRunner } from '../types/enums.js';
import { TemplateRenderError, PluginExecutionError } from './errors.js';

/**
 * Orchestrates the full project generation pipeline:
 * render base templates → get active plugins → execute plugins → compose files → build ZIP
 */
export class GeneratorEngine {
  constructor(
    private templateRenderer: TemplateRenderer,
    private pluginRegistry: PluginRegistry,
    private fileComposer: IFileComposer,
    private zipBuilder: ZipBuilder,
  ) {}

  /**
   * Generate a complete NestJS project ZIP from the given configuration.
   *
   * @param config Project configuration from the user
   * @returns ZIP file as a Buffer
   */
  async generate(config: ProjectConfig): Promise<Buffer> {
    // 1. Render base templates
    const baseFiles = this.renderBaseTemplates(config);

    // 2. Get active plugins (topological sort + transitive deps)
    const activePlugins = this.pluginRegistry.getActivePlugins(config.modules);

    // 3. Execute each plugin to collect PluginOutput
    const pluginOutputs = this.executePlugins(activePlugins, config);

    // 4. Compose files (merge base + plugin outputs)
    const vfs = this.fileComposer.compose(baseFiles, pluginOutputs, config);

    // 5. Filter out conditional files based on config
    this.filterConditionalFiles(vfs, config);

    // 6. Build ZIP and return buffer
    return this.zipBuilder.build(vfs, config.name);
  }

  /**
   * Step 1: Render base Handlebars templates.
   * Wraps errors in TemplateRenderError.
   */
  private renderBaseTemplates(config: ProjectConfig): Map<string, string> {
    try {
      return this.templateRenderer.renderBaseTemplates(config);
    } catch (error) {
      throw new TemplateRenderError(
        `Failed to render base templates: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Step 3: Execute each active plugin and collect PluginOutput.
   * Wraps individual plugin errors in PluginExecutionError.
   */
  private executePlugins(plugins: ModulePlugin[], config: ProjectConfig): PluginOutput[] {
    const outputs: PluginOutput[] = [];

    for (const plugin of plugins) {
      try {
        const { dependencies, devDependencies } = plugin.getDependencies(config);
        const newFiles = plugin.getFiles(config);

        // Collect patches: prefer getPatches() if available, otherwise empty
        const patches: FilePatch[] = plugin.getPatches
          ? plugin.getPatches(config)
          : [];

        outputs.push({
          pluginName: plugin.name,
          newFiles,
          patches,
          dependencies,
          devDependencies,
        });
      } catch (error) {
        throw new PluginExecutionError(
          `Plugin "${plugin.name}" execution failed: ${error instanceof Error ? error.message : String(error)}`,
          plugin.name,
          { cause: error },
        );
      }
    }

    return outputs;
  }

  /**
   * Step 5: Remove conditional files that don't apply to the current config.
   * For example, remove .eslintrc.js when using Biome, remove jest.config.ts when using Vitest.
   */
  private filterConditionalFiles(
    vfs: { has(path: string): boolean; delete(path: string): void },
    config: ProjectConfig,
  ): void {
    // Linter-specific files
    if (config.linter === LinterOption.Biome) {
      vfs.delete('.eslintrc.js');
      vfs.delete('.prettierrc');
    } else {
      vfs.delete('biome.json');
    }

    // Test runner-specific files
    if (config.testRunner === TestRunner.Vitest) {
      vfs.delete('jest.config.ts');
    } else {
      vfs.delete('vitest.config.ts');
    }
  }
}
