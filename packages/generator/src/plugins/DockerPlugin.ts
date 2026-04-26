import type { FilePatch, GeneratedFile, ModulePlugin, ProjectConfig, VirtualFileSystem } from '../types/index.js';
import { DatabaseType, ModuleId } from '../types/index.js';

export class DockerPlugin implements ModulePlugin {
  readonly name = ModuleId.Docker;
  readonly description = 'Adds Docker support with multi-stage Dockerfile and docker-compose.yml';

  getDependencies(_config: ProjectConfig): {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } {
    return {
      dependencies: {},
      devDependencies: {},
    };
  }

  getFiles(config: ProjectConfig): GeneratedFile[] {
    const dockerfile = `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
`;

    const dockerignore = `node_modules
dist
.git
.env
*.log
`;

    const dockerCompose = this.buildDockerCompose(config);

    return [
      { path: 'Dockerfile', content: dockerfile },
      { path: 'docker-compose.yml', content: dockerCompose },
      { path: '.dockerignore', content: dockerignore },
    ];
  }

  private buildDockerCompose(config: ProjectConfig): string {
    const hasTypeORM = config.modules.includes(ModuleId.TypeORM);

    let services = `  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production`;

    if (hasTypeORM) {
      const dbService = this.getDatabaseService(config.databaseType);
      if (dbService) {
        services += `\n${dbService}`;
      }
    }

    return `version: '3.8'
services:
${services}
`;
  }

  private getDatabaseService(databaseType?: DatabaseType): string | null {
    switch (databaseType) {
      case DatabaseType.PostgreSQL:
        return `  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mydb
    ports:
      - "5432:5432"`;
      case DatabaseType.MySQL:
        return `  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: mydb
      MYSQL_USER: mysql
      MYSQL_PASSWORD: mysql
    ports:
      - "3306:3306"`;
      case DatabaseType.SQLite:
        return null;
      default:
        return null;
    }
  }

  getPatches(_config: ProjectConfig): FilePatch[] {
    return [];
  }

  patchFiles(vfs: VirtualFileSystem, _config: ProjectConfig): VirtualFileSystem {
    return vfs;
  }
}
