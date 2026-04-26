/**
 * @nestjs-initializr/generator
 *
 * Code generation engine for NestJS Initializr.
 * Shared between frontend (types) and backend (generation logic).
 */

export * from './types/index.js';
export { MemfsVirtualFileSystem } from './vfs/VirtualFileSystem.js';
export { TemplateRenderer } from './template/TemplateRenderer.js';
export { PluginRegistry } from './plugin/PluginRegistry.js';
export { ConflictResolver } from './conflict/ConflictResolver.js';
export type { IConflictResolver } from './conflict/ConflictResolver.js';
export { FileComposer } from './composer/FileComposer.js';
export type { IFileComposer } from './composer/FileComposer.js';
export { ZipBuilder } from './zip/ZipBuilder.js';
export { GeneratorEngine } from './engine/GeneratorEngine.js';
export { GeneratorError, TemplateRenderError, PluginExecutionError } from './engine/errors.js';
export { ConfigPlugin } from './plugins/ConfigPlugin.js';
export { SwaggerPlugin } from './plugins/SwaggerPlugin.js';
export { DockerPlugin } from './plugins/DockerPlugin.js';
export { GraphQLPlugin } from './plugins/GraphQLPlugin.js';
export { TypeORMPlugin } from './plugins/TypeORMPlugin.js';
export { PrismaPlugin } from './plugins/PrismaPlugin.js';
export { I18nPlugin } from './plugins/I18nPlugin.js';
export { BullPlugin } from './plugins/BullPlugin.js';
export { HealthCheckPlugin } from './plugins/HealthCheckPlugin.js';
