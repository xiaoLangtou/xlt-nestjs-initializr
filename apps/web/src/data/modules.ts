import { ModuleId, DatabaseType } from '@nestjs-initializr/generator';

export interface ModuleMeta {
  id: ModuleId;
  name: string;
  icon: string;
  color: string;
  bg: string;
  desc: string;
  files: string[];
  deps?: ModuleId[];
  exclusive?: ModuleId;
}

export const MODULES: ModuleMeta[] = [
  {
    id: ModuleId.Config,
    name: 'Config',
    icon: '⚙',
    color: 'var(--orange)',
    bg: 'var(--orange-soft)',
    desc: '环境变量与配置管理',
    files: ['.env.example'],
  },
  {
    id: ModuleId.Swagger,
    name: 'Swagger',
    icon: '📋',
    color: 'var(--green)',
    bg: 'var(--green-soft)',
    desc: 'API 文档自动生成',
    files: [],
  },
  {
    id: ModuleId.GraphQL,
    name: 'GraphQL',
    icon: '◆',
    color: 'var(--purple)',
    bg: 'var(--purple-soft)',
    desc: 'GraphQL API 支持',
    files: [
      'src/graphql/sample.resolver.ts',
      'src/graphql/sample.schema.graphql',
    ],
    deps: [ModuleId.Config],
  },
  {
    id: ModuleId.TypeORM,
    name: 'TypeORM',
    icon: '🗃',
    color: 'var(--blue)',
    bg: 'var(--blue-soft)',
    desc: 'ORM 数据库集成',
    files: ['src/entities/sample.entity.ts'],
    deps: [ModuleId.Config],
    exclusive: ModuleId.Prisma,
  },
  {
    id: ModuleId.Prisma,
    name: 'Prisma',
    icon: '▲',
    color: 'var(--cyan)',
    bg: 'var(--cyan-soft)',
    desc: '下一代 ORM',
    files: ['prisma/schema.prisma', 'src/prisma/prisma.service.ts'],
    deps: [ModuleId.Config],
    exclusive: ModuleId.TypeORM,
  },
  {
    id: ModuleId.Docker,
    name: 'Docker',
    icon: '🐳',
    color: 'var(--blue)',
    bg: 'var(--blue-soft)',
    desc: '容器化部署配置',
    files: ['Dockerfile', 'docker-compose.yml', '.dockerignore'],
  },
  {
    id: ModuleId.I18n,
    name: 'I18n',
    icon: '🌐',
    color: 'var(--yellow)',
    bg: 'var(--yellow-soft)',
    desc: '国际化支持',
    files: ['src/i18n/en/common.json', 'src/i18n/zh/common.json'],
  },
  {
    id: ModuleId.Bull,
    name: 'Bull MQ',
    icon: '📨',
    color: 'var(--orange)',
    bg: 'var(--orange-soft)',
    desc: '消息队列与任务调度',
    files: ['src/queues/sample.processor.ts'],
    deps: [ModuleId.Config],
  },
  {
    id: ModuleId.HealthCheck,
    name: 'Health Check',
    icon: '♥',
    color: 'var(--green)',
    bg: 'var(--green-soft)',
    desc: '健康检查端点',
    files: ['src/health/health.controller.ts'],
  },
];

export const DB_TYPES: { id: DatabaseType; name: string; icon: string }[] = [
  { id: DatabaseType.PostgreSQL, name: 'PostgreSQL', icon: '🐘' },
  { id: DatabaseType.MySQL, name: 'MySQL', icon: '🐬' },
  { id: DatabaseType.SQLite, name: 'SQLite', icon: '📎' },
];

export function findModule(id: ModuleId): ModuleMeta | undefined {
  return MODULES.find((m) => m.id === id);
}
