import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry } from './PluginRegistry.js';
import type { ModulePlugin, ProjectConfig } from '../types/interfaces.js';
import { ModuleId } from '../types/enums.js';

function createMockPlugin(name: string, requires?: string[]): ModulePlugin {
  return {
    name,
    description: `${name} plugin`,
    requires,
    getDependencies: () => ({ dependencies: {}, devDependencies: {} }),
    getFiles: () => [],
    patchFiles: (vfs) => vfs,
  };
}

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe('register', () => {
    it('should register a plugin and retrieve it via getActivePlugins', () => {
      const plugin = createMockPlugin(ModuleId.Swagger);
      registry.register(plugin);

      const active = registry.getActivePlugins([ModuleId.Swagger]);
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe(ModuleId.Swagger);
    });

    it('should allow registering multiple plugins', () => {
      registry.register(createMockPlugin(ModuleId.Config));
      registry.register(createMockPlugin(ModuleId.Swagger));
      registry.register(createMockPlugin(ModuleId.Docker));

      const active = registry.getActivePlugins([
        ModuleId.Swagger,
        ModuleId.Docker,
      ]);
      expect(active).toHaveLength(2);
    });
  });

  describe('topologicalSort', () => {
    it('should return modules in dependency order', () => {
      const sorted = registry.topologicalSort([ModuleId.GraphQL]);
      // GraphQL depends on Config, so Config should come first
      expect(sorted.indexOf(ModuleId.Config)).toBeLessThan(
        sorted.indexOf(ModuleId.GraphQL),
      );
    });

    it('should include transitive dependencies', () => {
      const sorted = registry.topologicalSort([ModuleId.TypeORM]);
      expect(sorted).toContain(ModuleId.Config);
      expect(sorted).toContain(ModuleId.TypeORM);
    });

    it('should handle modules with no dependencies', () => {
      const sorted = registry.topologicalSort([ModuleId.Docker]);
      expect(sorted).toEqual([ModuleId.Docker]);
    });

    it('should handle empty module list', () => {
      const sorted = registry.topologicalSort([]);
      expect(sorted).toEqual([]);
    });

    it('should handle multiple modules with shared dependencies', () => {
      const sorted = registry.topologicalSort([
        ModuleId.GraphQL,
        ModuleId.Bull,
      ]);
      // Both depend on Config
      expect(sorted).toContain(ModuleId.Config);
      expect(sorted).toContain(ModuleId.GraphQL);
      expect(sorted).toContain(ModuleId.Bull);
      // Config before both
      const configIdx = sorted.indexOf(ModuleId.Config);
      expect(configIdx).toBeLessThan(sorted.indexOf(ModuleId.GraphQL));
      expect(configIdx).toBeLessThan(sorted.indexOf(ModuleId.Bull));
    });

    it('should detect mutual exclusion conflicts', () => {
      expect(() =>
        registry.topologicalSort([ModuleId.TypeORM, ModuleId.Prisma]),
      ).toThrow(/Mutual exclusion conflict/);
    });

    it('should not throw for non-conflicting modules', () => {
      expect(() =>
        registry.topologicalSort([ModuleId.TypeORM, ModuleId.Swagger]),
      ).not.toThrow();
    });

    it('should return the original selection as a subset of the result', () => {
      const input = [ModuleId.GraphQL, ModuleId.Bull];
      const sorted = registry.topologicalSort(input);
      for (const mod of input) {
        expect(sorted).toContain(mod);
      }
    });
  });

  describe('getActivePlugins', () => {
    it('should return plugins in topological order', () => {
      registry.register(createMockPlugin(ModuleId.Config));
      registry.register(createMockPlugin(ModuleId.GraphQL));

      const plugins = registry.getActivePlugins([ModuleId.GraphQL]);
      expect(plugins).toHaveLength(2);
      expect(plugins[0].name).toBe(ModuleId.Config);
      expect(plugins[1].name).toBe(ModuleId.GraphQL);
    });

    it('should only return registered plugins', () => {
      // Only register GraphQL, not Config
      registry.register(createMockPlugin(ModuleId.GraphQL));

      const plugins = registry.getActivePlugins([ModuleId.GraphQL]);
      // Config is a dependency but not registered, so only GraphQL is returned
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe(ModuleId.GraphQL);
    });

    it('should return empty array for empty input', () => {
      const plugins = registry.getActivePlugins([]);
      expect(plugins).toEqual([]);
    });

    it('should include transitive dependency plugins', () => {
      registry.register(createMockPlugin(ModuleId.Config));
      registry.register(createMockPlugin(ModuleId.TypeORM));

      const plugins = registry.getActivePlugins([ModuleId.TypeORM]);
      expect(plugins).toHaveLength(2);
      expect(plugins.map((p) => p.name)).toContain(ModuleId.Config);
      expect(plugins.map((p) => p.name)).toContain(ModuleId.TypeORM);
    });

    it('should throw on mutual exclusion', () => {
      registry.register(createMockPlugin(ModuleId.TypeORM));
      registry.register(createMockPlugin(ModuleId.Prisma));

      expect(() =>
        registry.getActivePlugins([ModuleId.TypeORM, ModuleId.Prisma]),
      ).toThrow(/Mutual exclusion conflict/);
    });
  });
});
