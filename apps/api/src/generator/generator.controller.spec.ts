import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { GeneratorModule } from './generator.module';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';

const validDto = {
  name: 'my-project',
  description: 'A test project',
  adapter: 'express',
  packageManager: 'npm',
  linter: 'eslint-prettier',
  testRunner: 'jest',
  gitHooks: 'none',
  modules: [],
};

describe('GeneratorController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
        GeneratorModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/generate with valid DTO returns 200 with application/zip', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/generate')
      .send(validDto)
      .expect(200);

    expect(response.headers['content-type']).toMatch(/application\/zip/);
    expect(response.headers['content-disposition']).toContain('my-project.zip');
    expect(response.body).toBeDefined();
  });

  it('POST /api/generate with invalid DTO returns 400', async () => {
    const invalidDto = {
      ...validDto,
      name: 'INVALID NAME WITH SPACES',
    };

    await request(app.getHttpServer())
      .post('/api/generate')
      .send(invalidDto)
      .expect(400);
  });

  it('POST /api/generate with missing required field returns 400', async () => {
    const incompleteDto = {
      name: 'my-project',
      // missing adapter, packageManager, etc.
    };

    await request(app.getHttpServer())
      .post('/api/generate')
      .send(incompleteDto)
      .expect(400);
  });
});
