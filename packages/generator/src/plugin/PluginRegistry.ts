import { MODULE_DEPENDENCIES, MUTUAL_EXCLUSIONS } from '../types/constants.js';
import type { ModulePlugin } from '../types/interfaces.js';

export class PluginRegistry {
  private plugins = new Map<string, ModulePlugin>();

  /**
   * Register a ModulePlugin instance by its name.
   */
  register(plugin: ModulePlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  /**
   * Resolve transitive dependencies and return a topologically sorted list of ModuleIds.
   * Throws if circular dependencies or mutual exclusions are detected.
   */
  topologicalSort(moduleIds: string[]): string[] {
    // 1. Check mutual exclusions
    for (const [a, b] of MUTUAL_EXCLUSIONS) {
      if (moduleIds.includes(a) && moduleIds.includes(b)) {
        throw new Error(
          `Mutual exclusion conflict: "${a}" and "${b}" cannot be selected together`,
        );
      }
    }

    // 2. Resolve all transitive dependencies
    const allModules = this.resolveTransitiveDependencies(moduleIds);

    // 3. Build adjacency list and in-degree map (Kahn's algorithm)
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const mod of allModules) {
      if (!inDegree.has(mod)) {
        inDegree.set(mod, 0);
      }
      if (!adjacency.has(mod)) {
        adjacency.set(mod, []);
      }
    }

    for (const mod of allModules) {
      const deps = MODULE_DEPENDENCIES[mod] ?? [];
      for (const dep of deps) {
        if (allModules.has(dep)) {
          adjacency.get(dep)!.push(mod);
          inDegree.set(mod, (inDegree.get(mod) ?? 0) + 1);
        }
      }
    }

    // 4. Kahn's algorithm
    const queue: string[] = [];
    for (const [mod, degree] of inDegree) {
      if (degree === 0) {
        queue.push(mod);
      }
    }
    // Sort the initial queue for deterministic output
    queue.sort();

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);

      const neighbors = adjacency.get(current) ?? [];
      // Sort neighbors for deterministic output
      neighbors.sort();
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          // Insert in sorted order to maintain determinism
          const insertIdx = queue.findIndex((q) => q > neighbor);
          if (insertIdx === -1) {
            queue.push(neighbor);
          } else {
            queue.splice(insertIdx, 0, neighbor);
          }
        }
      }
    }

    // 5. Detect circular dependency
    if (sorted.length !== allModules.size) {
      const remaining = [...allModules].filter((m) => !sorted.includes(m));
      throw new Error(
        `Circular dependency detected among modules: ${remaining.join(' -> ')}`,
      );
    }

    return sorted;
  }

  /**
   * Return topologically sorted plugins for the given moduleIds (including transitive deps).
   * Only returns plugins that are actually registered.
   */
  getActivePlugins(moduleIds: string[]): ModulePlugin[] {
    const sortedIds = this.topologicalSort(moduleIds);
    return sortedIds
      .map((id) => this.plugins.get(id))
      .filter((p): p is ModulePlugin => p !== undefined);
  }

  /**
   * Resolve all transitive dependencies for the given module IDs.
   */
  private resolveTransitiveDependencies(moduleIds: string[]): Set<string> {
    const resolved = new Set<string>();
    const stack = [...moduleIds];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (resolved.has(current)) continue;
      resolved.add(current);

      const deps = MODULE_DEPENDENCIES[current] ?? [];
      for (const dep of deps) {
        if (!resolved.has(dep)) {
          stack.push(dep);
        }
      }
    }

    return resolved;
  }
}
