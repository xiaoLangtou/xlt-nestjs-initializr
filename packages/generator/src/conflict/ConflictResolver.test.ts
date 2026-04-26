import { describe, it, expect } from 'vitest';
import { ConflictResolver } from './ConflictResolver.js';
import type { FilePatch } from '../types/index.js';

describe('ConflictResolver', () => {
  const resolver = new ConflictResolver();

  describe('addImport', () => {
    it('should add a new named import', () => {
      const original = `import { Module } from '@nestjs/common';\n`;
      const patches: FilePatch[] = [{
        pluginName: 'config',
        filePath: 'src/app.module.ts',
        operation: 'addImport',
        params: { moduleSpecifier: '@nestjs/config', namedImports: ['ConfigModule'] },
      }];

      const result = resolver.resolve(original, patches);
      expect(result).toContain('ConfigModule');
      expect(result).toContain('@nestjs/config');
      expect(result).toMatch(/import\s*\{\s*ConfigModule\s*\}\s*from\s*['"]@nestjs\/config['"]/);
    });

    it('should not duplicate existing imports', () => {
      const original = `import { ConfigModule } from '@nestjs/config';\n`;
      const patches: FilePatch[] = [{
        pluginName: 'config',
        filePath: 'src/app.module.ts',
        operation: 'addImport',
        params: { moduleSpecifier: '@nestjs/config', namedImports: ['ConfigModule'] },
      }];

      const result = resolver.resolve(original, patches);
      const matches = result.match(/ConfigModule/g);
      expect(matches?.length).toBe(1);
    });

    it('should merge named imports into existing import declaration', () => {
      const original = `import { ConfigModule } from '@nestjs/config';\n`;
      const patches: FilePatch[] = [{
        pluginName: 'config',
        filePath: 'src/app.module.ts',
        operation: 'addImport',
        params: { moduleSpecifier: '@nestjs/config', namedImports: ['ConfigService'] },
      }];

      const result = resolver.resolve(original, patches);
      expect(result).toContain('ConfigModule');
      expect(result).toContain('ConfigService');
    });

    it('should add a default import', () => {
      const original = '';
      const patches: FilePatch[] = [{
        pluginName: 'test',
        filePath: 'src/main.ts',
        operation: 'addImport',
        params: { moduleSpecifier: 'helmet', defaultImport: 'helmet' },
      }];

      const result = resolver.resolve(original, patches);
      expect(result).toMatch(/import\s+helmet\s+from\s+['"]helmet['"]/);
    });
  });

  describe('addModuleImport', () => {
    const moduleTemplate = `
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`;

    it('should add a module to the @Module imports array', () => {
      const patches: FilePatch[] = [{
        pluginName: 'config',
        filePath: 'src/app.module.ts',
        operation: 'addModuleImport',
        params: { moduleName: 'ConfigModule', importCode: 'ConfigModule.forRoot({ isGlobal: true })' },
      }];

      const result = resolver.resolve(moduleTemplate, patches);
      expect(result).toContain('ConfigModule.forRoot({ isGlobal: true })');
    });

    it('should add multiple modules from different plugins', () => {
      const patches: FilePatch[] = [
        {
          pluginName: 'config',
          filePath: 'src/app.module.ts',
          operation: 'addModuleImport',
          params: { moduleName: 'ConfigModule', importCode: 'ConfigModule.forRoot({ isGlobal: true })' },
        },
        {
          pluginName: 'typeorm',
          filePath: 'src/app.module.ts',
          operation: 'addModuleImport',
          params: { moduleName: 'TypeOrmModule', importCode: 'TypeOrmModule.forRoot({})' },
        },
      ];

      const result = resolver.resolve(moduleTemplate, patches);
      expect(result).toContain('ConfigModule.forRoot({ isGlobal: true })');
      expect(result).toContain('TypeOrmModule.forRoot({})');
    });

    it('should not duplicate existing module imports', () => {
      const patches: FilePatch[] = [
        {
          pluginName: 'config',
          filePath: 'src/app.module.ts',
          operation: 'addModuleImport',
          params: { moduleName: 'ConfigModule', importCode: 'ConfigModule.forRoot({ isGlobal: true })' },
        },
        {
          pluginName: 'config-dup',
          filePath: 'src/app.module.ts',
          operation: 'addModuleImport',
          params: { moduleName: 'ConfigModule', importCode: 'ConfigModule.forRoot({ isGlobal: true })' },
        },
      ];

      const result = resolver.resolve(moduleTemplate, patches);
      const matches = result.match(/ConfigModule\.forRoot/g);
      expect(matches?.length).toBe(1);
    });

    it('should create imports array if it does not exist', () => {
      const noImportsModule = `
import { Module } from '@nestjs/common';

@Module({
  controllers: [],
  providers: [],
})
export class AppModule {}
`;
      const patches: FilePatch[] = [{
        pluginName: 'config',
        filePath: 'src/app.module.ts',
        operation: 'addModuleImport',
        params: { moduleName: 'ConfigModule' },
      }];

      const result = resolver.resolve(noImportsModule, patches);
      expect(result).toContain('imports: [ConfigModule]');
    });
  });

  describe('addProvider', () => {
    const moduleTemplate = `
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
`;

    it('should add a provider to the @Module providers array', () => {
      const patches: FilePatch[] = [{
        pluginName: 'prisma',
        filePath: 'src/app.module.ts',
        operation: 'addProvider',
        params: { providerName: 'PrismaService' },
      }];

      const result = resolver.resolve(moduleTemplate, patches);
      expect(result).toContain('PrismaService');
      expect(result).toContain('AppService');
    });

    it('should not duplicate existing providers', () => {
      const patches: FilePatch[] = [{
        pluginName: 'app',
        filePath: 'src/app.module.ts',
        operation: 'addProvider',
        params: { providerName: 'AppService' },
      }];

      const result = resolver.resolve(moduleTemplate, patches);
      const matches = result.match(/AppService/g);
      expect(matches?.length).toBe(1);
    });
  });

  describe('addBootstrapCode', () => {
    const mainTemplate = `
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
`;

    it('should add code before app.listen when beforeListen is true', () => {
      const patches: FilePatch[] = [{
        pluginName: 'swagger',
        filePath: 'src/main.ts',
        operation: 'addBootstrapCode',
        params: {
          code: `const config = new DocumentBuilder().setTitle('API').build();\nconst document = SwaggerModule.createDocument(app, config);\nSwaggerModule.setup('api/docs', app, document);`,
          beforeListen: true,
        },
      }];

      const result = resolver.resolve(mainTemplate, patches);
      const listenIndex = result.indexOf('app.listen');
      const swaggerIndex = result.indexOf('SwaggerModule.setup');
      expect(swaggerIndex).toBeGreaterThan(-1);
      expect(swaggerIndex).toBeLessThan(listenIndex);
    });

    it('should add code at the end when beforeListen is not specified', () => {
      const patches: FilePatch[] = [{
        pluginName: 'test',
        filePath: 'src/main.ts',
        operation: 'addBootstrapCode',
        params: { code: 'app.enableCors();' },
      }];

      const result = resolver.resolve(mainTemplate, patches);
      expect(result).toContain('app.enableCors()');
    });
  });

  describe('mixed operations', () => {
    it('should apply multiple different operations in sequence', () => {
      const original = `
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`;
      const patches: FilePatch[] = [
        {
          pluginName: 'config',
          filePath: 'src/app.module.ts',
          operation: 'addImport',
          params: { moduleSpecifier: '@nestjs/config', namedImports: ['ConfigModule'] },
        },
        {
          pluginName: 'config',
          filePath: 'src/app.module.ts',
          operation: 'addModuleImport',
          params: { moduleName: 'ConfigModule', importCode: 'ConfigModule.forRoot({ isGlobal: true })' },
        },
        {
          pluginName: 'prisma',
          filePath: 'src/app.module.ts',
          operation: 'addImport',
          params: { moduleSpecifier: './prisma/prisma.service', namedImports: ['PrismaService'] },
        },
        {
          pluginName: 'prisma',
          filePath: 'src/app.module.ts',
          operation: 'addProvider',
          params: { providerName: 'PrismaService' },
        },
      ];

      const result = resolver.resolve(original, patches);
      expect(result).toMatch(/import\s*\{\s*ConfigModule\s*\}\s*from\s*['"]@nestjs\/config['"]/);
      expect(result).toContain('ConfigModule.forRoot({ isGlobal: true })');
      expect(result).toMatch(/import\s*\{\s*PrismaService\s*\}\s*from\s*['"]\.\/prisma\/prisma\.service['"]/);
      expect(result).toContain('PrismaService');
    });
  });
});
