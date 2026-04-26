export enum HttpAdapter {
  Express = 'express',
  Fastify = 'fastify',
}

export enum PackageManager {
  Npm = 'npm',
  Yarn = 'yarn',
  Pnpm = 'pnpm',
}

export enum LinterOption {
  EslintPrettier = 'eslint-prettier',
  Biome = 'biome',
}

export enum TestRunner {
  Jest = 'jest',
  Vitest = 'vitest',
}

export enum GitHooksOption {
  None = 'none',
  Husky = 'husky',
}

export enum ModuleId {
  Config = 'config',
  Swagger = 'swagger',
  GraphQL = 'graphql',
  TypeORM = 'typeorm',
  Prisma = 'prisma',
  Docker = 'docker',
  I18n = 'i18n',
  Husky = 'husky',
  Bull = 'bull',
  HealthCheck = 'health-check',
}

export enum DatabaseType {
  PostgreSQL = 'postgresql',
  MySQL = 'mysql',
  SQLite = 'sqlite',
}
