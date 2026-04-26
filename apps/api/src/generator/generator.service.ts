import { Injectable } from '@nestjs/common';
import {
  GeneratorEngine,
  TemplateRenderer,
  PluginRegistry,
  FileComposer,
  ZipBuilder,
  ConfigPlugin,
  SwaggerPlugin,
  DockerPlugin,
  GraphQLPlugin,
  TypeORMPlugin,
  PrismaPlugin,
  I18nPlugin,
  BullPlugin,
  HealthCheckPlugin,
} from '@nestjs-initializr/generator';
import type { ProjectConfig } from '@nestjs-initializr/generator';
import { GenerateProjectDto } from './dto/generate-project.dto';

@Injectable()
export class GeneratorService {
  private readonly engine: GeneratorEngine;

  constructor() {
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
    this.engine = new GeneratorEngine(templateRenderer, pluginRegistry, fileComposer, zipBuilder);
  }

  async generate(dto: GenerateProjectDto): Promise<Buffer> {
    const config: ProjectConfig = {
      name: dto.name,
      description: dto.description,
      adapter: dto.adapter,
      packageManager: dto.packageManager,
      linter: dto.linter,
      testRunner: dto.testRunner,
      gitHooks: dto.gitHooks,
      modules: dto.modules,
      databaseType: dto.databaseType,
    };
    return this.engine.generate(config);
  }
}
