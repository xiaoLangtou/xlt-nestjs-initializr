/**
 * Base error class for all generator engine errors.
 */
export class GeneratorError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'GeneratorError';
  }
}

/**
 * Error thrown when template rendering fails.
 * Wraps the original Handlebars compilation/rendering error with context.
 */
export class TemplateRenderError extends GeneratorError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TemplateRenderError';
  }
}

/**
 * Error thrown when a plugin execution fails.
 * Includes the plugin name for error reporting to the client.
 */
export class PluginExecutionError extends GeneratorError {
  constructor(
    message: string,
    public readonly pluginName: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'PluginExecutionError';
  }
}
