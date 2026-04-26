import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GenerateProjectDto } from './generate-project.dto';
import {
  HttpAdapter,
  PackageManager,
  LinterOption,
  TestRunner,
  GitHooksOption,
  ModuleId,
} from '@nestjs-initializr/generator';

function buildValidDto(overrides: Partial<Record<string, unknown>> = {}): GenerateProjectDto {
  return plainToInstance(GenerateProjectDto, {
    name: 'my-project',
    adapter: HttpAdapter.Express,
    packageManager: PackageManager.Npm,
    linter: LinterOption.EslintPrettier,
    testRunner: TestRunner.Jest,
    gitHooks: GitHooksOption.None,
    modules: [],
    ...overrides,
  });
}

describe('GenerateProjectDto', () => {
  describe('valid DTO', () => {
    it('should pass validation with all required fields', async () => {
      const dto = buildValidDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with optional description', async () => {
      const dto = buildValidDto({ description: 'A test project' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation without optional fields (description, databaseType)', async () => {
      const dto = buildValidDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with databaseType when provided', async () => {
      const dto = buildValidDto({ modules: [ModuleId.TypeORM], databaseType: 'postgresql' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid project names', async () => {
      const validNames = ['my-project', 'project123', 'a', 'my.project', 'my_project'];
      for (const name of validNames) {
        const dto = buildValidDto({ name });
        const errors = await validate(dto);
        expect(errors.filter(e => e.property === 'name')).toHaveLength(0);
      }
    });
  });

  describe('project name validation', () => {
    it('should fail when name contains uppercase letters', async () => {
      const dto = buildValidDto({ name: 'MyProject' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });

    it('should fail when name starts with a hyphen', async () => {
      const dto = buildValidDto({ name: '-my-project' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });

    it('should fail when name starts with a dot', async () => {
      const dto = buildValidDto({ name: '.my-project' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });

    it('should fail when name contains special characters', async () => {
      const dto = buildValidDto({ name: 'my project!' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });

    it('should fail when name is empty', async () => {
      const dto = buildValidDto({ name: '' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });

    it('should fail when name exceeds 214 characters', async () => {
      const dto = buildValidDto({ name: 'a'.repeat(215) });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });
  });

  describe('adapter validation', () => {
    it('should fail when adapter is an invalid value', async () => {
      const dto = buildValidDto({ adapter: 'invalid-adapter' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'adapter')).toBe(true);
    });

    it('should pass with fastify adapter', async () => {
      const dto = buildValidDto({ adapter: HttpAdapter.Fastify });
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === 'adapter')).toHaveLength(0);
    });
  });

  describe('packageManager validation', () => {
    it('should fail when packageManager is an invalid value', async () => {
      const dto = buildValidDto({ packageManager: 'bower' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'packageManager')).toBe(true);
    });
  });

  describe('linter validation', () => {
    it('should fail when linter is an invalid value', async () => {
      const dto = buildValidDto({ linter: 'tslint' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'linter')).toBe(true);
    });
  });

  describe('testRunner validation', () => {
    it('should fail when testRunner is an invalid value', async () => {
      const dto = buildValidDto({ testRunner: 'mocha' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'testRunner')).toBe(true);
    });
  });

  describe('modules validation', () => {
    it('should fail when modules array contains an invalid ModuleId', async () => {
      const dto = buildValidDto({ modules: ['invalid-module'] });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'modules')).toBe(true);
    });

    it('should pass with valid module IDs', async () => {
      const dto = buildValidDto({ modules: [ModuleId.Swagger, ModuleId.Docker] });
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === 'modules')).toHaveLength(0);
    });
  });

  describe('mutual exclusion constraint', () => {
    it('should fail when both TypeORM and Prisma are selected', async () => {
      const dto = buildValidDto({ modules: [ModuleId.TypeORM, ModuleId.Prisma] });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === '_mutualExclusion')).toBe(true);
    });

    it('should pass when only TypeORM is selected', async () => {
      const dto = buildValidDto({ modules: [ModuleId.TypeORM] });
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === '_mutualExclusion')).toHaveLength(0);
    });

    it('should pass when only Prisma is selected', async () => {
      const dto = buildValidDto({ modules: [ModuleId.Prisma] });
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === '_mutualExclusion')).toHaveLength(0);
    });
  });
});
