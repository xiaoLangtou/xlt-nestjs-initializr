/**
 * Unit tests for shared types: enums and constants
 * Validates: Requirements 5.6, 2.5
 */
import { describe, it, expect } from 'vitest';
import {
  HttpAdapter,
  PackageManager,
  LinterOption,
  TestRunner,
  GitHooksOption,
  ModuleId,
  DatabaseType,
} from './enums.js';
import { MODULE_DEPENDENCIES, MUTUAL_EXCLUSIONS } from './constants.js';

describe('Enums', () => {
  describe('HttpAdapter', () => {
    it('should have exactly 2 values: express and fastify', () => {
      const values = Object.values(HttpAdapter);
      expect(values).toHaveLength(2);
      expect(values).toContain('express');
      expect(values).toContain('fastify');
    });

    it('should have correct enum keys', () => {
      expect(HttpAdapter.Express).toBe('express');
      expect(HttpAdapter.Fastify).toBe('fastify');
    });
  });

  describe('PackageManager', () => {
    it('should have exactly 3 values: npm, yarn, pnpm', () => {
      const values = Object.values(PackageManager);
      expect(values).toHaveLength(3);
      expect(values).toContain('npm');
      expect(values).toContain('yarn');
      expect(values).toContain('pnpm');
    });

    it('should have correct enum keys', () => {
      expect(PackageManager.Npm).toBe('npm');
      expect(PackageManager.Yarn).toBe('yarn');
      expect(PackageManager.Pnpm).toBe('pnpm');
    });
  });

  describe('LinterOption', () => {
    it('should have exactly 2 values: eslint-prettier and biome', () => {
      const values = Object.values(LinterOption);
      expect(values).toHaveLength(2);
      expect(values).toContain('eslint-prettier');
      expect(values).toContain('biome');
    });

    it('should have correct enum keys', () => {
      expect(LinterOption.EslintPrettier).toBe('eslint-prettier');
      expect(LinterOption.Biome).toBe('biome');
    });
  });

  describe('TestRunner', () => {
    it('should have exactly 2 values: jest and vitest', () => {
      const values = Object.values(TestRunner);
      expect(values).toHaveLength(2);
      expect(values).toContain('jest');
      expect(values).toContain('vitest');
    });

    it('should have correct enum keys', () => {
      expect(TestRunner.Jest).toBe('jest');
      expect(TestRunner.Vitest).toBe('vitest');
    });
  });

  describe('GitHooksOption', () => {
    it('should have exactly 2 values: none and husky', () => {
      const values = Object.values(GitHooksOption);
      expect(values).toHaveLength(2);
      expect(values).toContain('none');
      expect(values).toContain('husky');
    });

    it('should have correct enum keys', () => {
      expect(GitHooksOption.None).toBe('none');
      expect(GitHooksOption.Husky).toBe('husky');
    });
  });

  describe('ModuleId', () => {
    it('should have exactly 10 module identifiers', () => {
      const values = Object.values(ModuleId);
      expect(values).toHaveLength(10);
    });

    it('should contain all expected module identifiers', () => {
      const values = Object.values(ModuleId);
      expect(values).toContain('config');
      expect(values).toContain('swagger');
      expect(values).toContain('graphql');
      expect(values).toContain('typeorm');
      expect(values).toContain('prisma');
      expect(values).toContain('docker');
      expect(values).toContain('i18n');
      expect(values).toContain('husky');
      expect(values).toContain('bull');
      expect(values).toContain('health-check');
    });

    it('should have correct enum keys', () => {
      expect(ModuleId.Config).toBe('config');
      expect(ModuleId.Swagger).toBe('swagger');
      expect(ModuleId.GraphQL).toBe('graphql');
      expect(ModuleId.TypeORM).toBe('typeorm');
      expect(ModuleId.Prisma).toBe('prisma');
      expect(ModuleId.Docker).toBe('docker');
      expect(ModuleId.I18n).toBe('i18n');
      expect(ModuleId.Husky).toBe('husky');
      expect(ModuleId.Bull).toBe('bull');
      expect(ModuleId.HealthCheck).toBe('health-check');
    });
  });

  describe('DatabaseType', () => {
    it('should have exactly 3 values: postgresql, mysql, sqlite', () => {
      const values = Object.values(DatabaseType);
      expect(values).toHaveLength(3);
      expect(values).toContain('postgresql');
      expect(values).toContain('mysql');
      expect(values).toContain('sqlite');
    });

    it('should have correct enum keys', () => {
      expect(DatabaseType.PostgreSQL).toBe('postgresql');
      expect(DatabaseType.MySQL).toBe('mysql');
      expect(DatabaseType.SQLite).toBe('sqlite');
    });
  });
});

describe('MODULE_DEPENDENCIES', () => {
  it('should be a non-empty object', () => {
    expect(MODULE_DEPENDENCIES).toBeDefined();
    expect(typeof MODULE_DEPENDENCIES).toBe('object');
    expect(Object.keys(MODULE_DEPENDENCIES).length).toBeGreaterThan(0);
  });

  it('should only use valid ModuleId values as keys', () => {
    const validModuleIds = Object.values(ModuleId) as string[];
    for (const key of Object.keys(MODULE_DEPENDENCIES)) {
      expect(validModuleIds).toContain(key);
    }
  });

  it('should only use valid ModuleId values in dependency arrays', () => {
    const validModuleIds = Object.values(ModuleId) as string[];
    for (const deps of Object.values(MODULE_DEPENDENCIES)) {
      for (const dep of deps) {
        expect(validModuleIds).toContain(dep);
      }
    }
  });

  it('should have GraphQL depending on Config', () => {
    expect(MODULE_DEPENDENCIES[ModuleId.GraphQL]).toContain(ModuleId.Config);
  });

  it('should have TypeORM depending on Config', () => {
    expect(MODULE_DEPENDENCIES[ModuleId.TypeORM]).toContain(ModuleId.Config);
  });

  it('should have Prisma depending on Config', () => {
    expect(MODULE_DEPENDENCIES[ModuleId.Prisma]).toContain(ModuleId.Config);
  });

  it('should have Bull depending on Config', () => {
    expect(MODULE_DEPENDENCIES[ModuleId.Bull]).toContain(ModuleId.Config);
  });

  it('should not have a module depending on itself', () => {
    for (const [moduleId, deps] of Object.entries(MODULE_DEPENDENCIES)) {
      expect(deps).not.toContain(moduleId);
    }
  });
});

describe('MUTUAL_EXCLUSIONS', () => {
  it('should be a non-empty array', () => {
    expect(MUTUAL_EXCLUSIONS).toBeDefined();
    expect(Array.isArray(MUTUAL_EXCLUSIONS)).toBe(true);
    expect(MUTUAL_EXCLUSIONS.length).toBeGreaterThan(0);
  });

  it('should contain tuples of exactly 2 elements', () => {
    for (const exclusion of MUTUAL_EXCLUSIONS) {
      expect(exclusion).toHaveLength(2);
    }
  });

  it('should only use valid ModuleId values', () => {
    const validModuleIds = Object.values(ModuleId) as string[];
    for (const [a, b] of MUTUAL_EXCLUSIONS) {
      expect(validModuleIds).toContain(a);
      expect(validModuleIds).toContain(b);
    }
  });

  it('should define TypeORM and Prisma as mutually exclusive', () => {
    const hasTypeORMPrisma = MUTUAL_EXCLUSIONS.some(
      ([a, b]) =>
        (a === ModuleId.TypeORM && b === ModuleId.Prisma) ||
        (a === ModuleId.Prisma && b === ModuleId.TypeORM),
    );
    expect(hasTypeORMPrisma).toBe(true);
  });

  it('should not have a module mutually exclusive with itself', () => {
    for (const [a, b] of MUTUAL_EXCLUSIONS) {
      expect(a).not.toBe(b);
    }
  });
});
