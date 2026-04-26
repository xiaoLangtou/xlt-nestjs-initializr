# NestJS Initializr — 项目规划文档

> 一个类似 Spring Initializr 的 Web 工具，用于快速生成配置完备、开箱即用的 NestJS 项目脚手架。

---

## 目录

1. [项目背景与目标](#1-项目背景与目标)
2. [项目规划](#2-项目规划)
3. [核心功能](#3-核心功能)
4. [整体架构](#4-整体架构)
5. [技术选型](#5-技术选型)
6. [目录结构](#6-目录结构)
7. [数据流说明](#7-数据流说明)
8. [模块插件规范](#8-模块插件规范)
9. [里程碑与交付物](#9-里程碑与交付物)

---

## 1. 项目背景与目标

### 背景

每次开始一个新的 NestJS 项目，开发者都需要手动配置 HTTP 适配器、包管理器、Lint 工具、测试框架、Docker、国际化等基础设施，这个过程重复且耗时，通常需要数小时甚至数天。

Java 生态中的 [Spring Initializr](https://start.spring.io) 已很好地解决了这一痛点，但 Node.js / NestJS 生态尚缺乏同等质量的工具。

### 目标

构建一个 **NestJS Initializr** Web 工具，让开发者通过可视化界面完成项目配置选择，一键生成并下载一个结构完整、配置完备的 NestJS 项目压缩包，将项目初始化时间从数小时缩短到数秒。

### 核心价值

- 消除重复性脚手架工作
- 保证最佳实践的一致性
- 降低 NestJS 新手的上手门槛
- 支持团队标准化项目初始化流程

---

## 2. 项目规划

### 阶段划分

| 阶段 | 名称 | 周期 | 目标 |
|------|------|------|------|
| Phase 0 | 调研与设计 | 第 1-2 周 | 确定技术选型、完成系统设计文档 |
| Phase 1 | 生成引擎 MVP | 第 3-5 周 | 跑通核心生成链路（无 UI） |
| Phase 2 | 后端 API | 第 6-7 周 | RESTful 接口、参数校验、ZIP 流返回 |
| Phase 3 | 前端 UI | 第 8-10 周 | 配置面板、文件树预览、下载交互 |
| Phase 4 | 模块扩展 | 第 11-13 周 | 接入全部可选模块插件 |
| Phase 5 | 测试与优化 | 第 14-15 周 | E2E 测试、性能优化、文档完善 |
| Phase 6 | 上线部署 | 第 16 周 | 生产环境部署、用户反馈收集 |

### 优先级矩阵

| 功能 | 重要性 | 难度 | 优先级 |
|------|--------|------|--------|
| 基础项目生成（Express/npm/ESLint/Jest） | 高 | 中 | P0 |
| HTTP 适配器切换（Fastify） | 高 | 低 | P0 |
| 包管理器切换（Yarn/pnpm） | 高 | 低 | P0 |
| ZIP 下载 | 高 | 低 | P0 |
| Swagger 模块 | 高 | 中 | P1 |
| Docker 支持 | 高 | 中 | P1 |
| GraphQL 模块 | 中 | 高 | P1 |
| Vitest 集成 | 中 | 中 | P1 |
| Biome（替代 ESLint+Prettier） | 中 | 中 | P2 |
| i18n 模块 | 中 | 中 | P2 |
| Husky + lint-staged | 低 | 低 | P2 |
| GitHub 一键推送 | 低 | 高 | P3 |
| StackBlitz 在线预览 | 低 | 高 | P3 |

---

## 3. 核心功能

### 3.1 配置项选择

用户可以在以下维度自由组合配置：

#### 基础配置

| 配置项 | 可选值 |
|--------|--------|
| 项目名称 | 任意合法 npm 包名 |
| 项目描述 | 可选文本 |
| NestJS 版本 | latest / 指定版本 |
| HTTP 适配器 | Express（默认）/ Fastify |
| 包管理器 | npm / Yarn / pnpm |

#### 代码质量工具

| 配置项 | 可选值 |
|--------|--------|
| Lint + 格式化 | ESLint + Prettier（默认）/ Biome |
| 测试框架 | Jest（默认）/ Vitest |
| Git Hooks | 无 / Husky + lint-staged |

#### 可选功能模块

| 模块 | 说明 |
|------|------|
| Config | `@nestjs/config` + dotenv 环境变量管理 |
| Swagger | `@nestjs/swagger` API 文档自动生成 |
| GraphQL | `@nestjs/graphql` + Apollo Server |
| TypeORM | 数据库 ORM（可选 PostgreSQL / MySQL / SQLite） |
| Prisma | 现代 ORM 替代方案 |
| Docker | Dockerfile + docker-compose.yml |
| i18n | `nestjs-i18n` 国际化支持 |
| Husky | Git 提交钩子 + lint-staged |
| Bull | 基于 Redis 的任务队列 |
| Health Check | `@nestjs/terminus` 健康检查端点 |

### 3.2 实时文件树预览

用户在调整配置时，右侧面板实时更新展示将要生成的文件结构，让用户在下载前清楚知道会得到什么。

```
my-project/
├── src/
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts
├── test/
│   └── app.e2e-spec.ts
├── .eslintrc.js          ← 根据 Lint 选项生成
├── .prettierrc           ← 根据格式化选项生成
├── Dockerfile            ← 勾选 Docker 后生成
├── docker-compose.yml    ← 勾选 Docker 后生成
├── package.json
├── tsconfig.json
└── README.md
```

### 3.3 项目生成与下载

- 点击"生成项目"按钮，后端即时生成 ZIP 包
- 浏览器直接触发文件下载
- 生成时间目标：< 2 秒

### 3.4 配置分享

- 所有配置序列化为 URL query string
- 用户可以直接分享 URL，接收者打开后自动还原配置
- 例如：`/?name=my-app&adapter=fastify&pm=pnpm&modules=swagger,docker`

---

## 4. 整体架构

### 4.1 系统层次图

```
┌─────────────────────────────────────────────────────┐
│                    前端 UI 层                        │
│   React / Vue  ·  配置面板  ·  文件树预览  ·  下载   │
└──────────────────────┬──────────────────────────────┘
                       │  POST /api/generate
                       ▼
┌─────────────────────────────────────────────────────┐
│                   后端 API 层                        │
│    NestJS  ·  DTO 校验  ·  限流  ·  错误处理          │
└──────────────────────┬──────────────────────────────┘
                       │  调用生成服务
                       ▼
┌─────────────────────────────────────────────────────┐
│                  代码生成引擎（核心）                  │
│  模板渲染  ·  插件系统  ·  文件合并  ·  ZIP 打包       │
└──────────────────────┬──────────────────────────────┘
                       │  返回 ZIP Buffer
                       ▼
┌─────────────────────────────────────────────────────┐
│                     输出层                           │
│         ZIP 下载  ·  GitHub 推送  ·  在线预览         │
└─────────────────────────────────────────────────────┘
```

### 4.2 前端架构

```
Frontend
├── pages/
│   └── index.tsx              # 主页面
├── components/
│   ├── ConfigPanel/           # 左侧配置面板
│   │   ├── BasicConfig.tsx    # 基础配置（名称、适配器、包管理器）
│   │   ├── QualityConfig.tsx  # 代码质量（Lint、测试）
│   │   └── ModuleSelector.tsx # 模块选择（多选复选框）
│   ├── FileTreePreview/       # 右侧文件树预览
│   └── GenerateButton/        # 生成 & 下载按钮
├── hooks/
│   ├── useProjectConfig.ts    # 配置状态管理
│   └── useFileTree.ts         # 文件树计算逻辑
├── utils/
│   ├── configToUrl.ts         # 配置 ↔ URL 序列化
│   └── api.ts                 # 后端接口调用
└── types/
    └── config.ts              # 配置类型定义
```

### 4.3 后端架构

```
Backend (NestJS)
├── src/
│   ├── app.module.ts
│   ├── generator/
│   │   ├── generator.module.ts
│   │   ├── generator.controller.ts   # POST /api/generate
│   │   ├── generator.service.ts      # 协调生成引擎
│   │   └── dto/
│   │       └── generate-project.dto.ts  # 参数校验 DTO
│   └── main.ts
```

### 4.4 生成引擎架构

```
Generation Engine
├── engine/
│   ├── TemplateRenderer          # 模板渲染器（Handlebars）
│   ├── PluginRegistry            # 插件注册表
│   ├── FileComposer              # 文件合并器
│   ├── ConflictResolver          # AST 冲突解决（ts-morph）
│   └── ZipBuilder                # ZIP 打包器（archiver）
├── templates/
│   ├── base/                     # 基础项目模板
│   │   ├── src/
│   │   │   ├── main.ts.hbs
│   │   │   ├── app.module.ts.hbs
│   │   │   └── app.controller.ts.hbs
│   │   ├── package.json.hbs
│   │   └── tsconfig.json.hbs
│   └── modules/                  # 各模块模板
│       ├── swagger/
│       ├── graphql/
│       ├── docker/
│       └── ...
└── plugins/
    ├── SwaggerPlugin.ts
    ├── GraphQLPlugin.ts
    ├── DockerPlugin.ts
    └── ...
```

---

## 5. 技术选型

### 前端

| 技术 | 选型 | 原因 |
|------|------|------|
| 框架 | React + TypeScript | 生态成熟，组件化强 |
| 构建工具 | Vite | 开发速度快 |
| 样式 | Tailwind CSS | 快速 UI 开发 |
| 状态管理 | Zustand / URL state | 轻量，配置可分享 |
| HTTP 客户端 | Axios | 支持二进制 Blob 下载 |

### 后端

| 技术 | 选型 | 原因 |
|------|------|------|
| 框架 | NestJS + TypeScript | 吃自己的狗粮，展示项目能力 |
| HTTP 适配器 | Express | 默认，稳定 |
| 参数校验 | class-validator + class-transformer | NestJS 标准方案 |
| 限流 | @nestjs/throttler | 防止滥用 |
| ZIP 打包 | archiver | Node.js 流式 ZIP 生成 |

### 生成引擎

| 技术 | 选型 | 原因 |
|------|------|------|
| 模板引擎 | Handlebars | 逻辑与模板分离，语法简洁 |
| AST 操作 | ts-morph | 安全地修改 TypeScript 文件 |
| 文件系统 | memfs | 内存虚拟文件系统，无磁盘 IO |

### 基础设施

| 技术 | 选型 | 原因 |
|------|------|------|
| 容器化 | Docker + docker-compose | 环境一致性 |
| 部署 | Vercel（前端）+ Railway/Fly.io（后端） | 低成本快速部署 |
| CI/CD | GitHub Actions | 自动测试与部署 |

---

## 6. 目录结构

```
nestjs-initializr/
├── apps/
│   ├── web/                   # 前端应用（React）
│   └── api/                   # 后端应用（NestJS）
├── packages/
│   └── generator/             # 生成引擎（共享包）
│       ├── src/
│       │   ├── engine/        # 核心引擎
│       │   ├── plugins/       # 模块插件
│       │   └── templates/     # Handlebars 模板
│       └── package.json
├── docker-compose.yml
├── package.json               # Monorepo 根配置（pnpm workspaces）
└── turbo.json                 # Turborepo 构建配置
```

> 采用 **Monorepo** 结构（pnpm workspaces + Turborepo），前端、后端、生成引擎共享类型定义，生成引擎可独立测试。

---

## 7. 数据流说明

### 生成请求完整流程

```
用户点击"生成项目"
    │
    ▼
前端将配置序列化为 JSON
    │
    ▼
POST /api/generate
{
  "name": "my-app",
  "adapter": "fastify",
  "packageManager": "pnpm",
  "linter": "biome",
  "testRunner": "vitest",
  "modules": ["swagger", "docker", "config"]
}
    │
    ▼
DTO 校验（class-validator）
- 检查非法配置组合（如 Jest + Vitest 不能同时选）
- 检查模块依赖关系（如 GraphQL 需要先选 Config）
    │
    ▼
GeneratorService.generate(dto)
    │
    ├─→ 加载基础模板（base templates）
    │
    ├─→ 遍历激活的插件列表
    │       每个插件执行：
    │       · getDependencies() → 注入 package.json 依赖
    │       · getFiles()        → 添加新文件到虚拟文件系统
    │       · patchFiles()      → 修改已有文件（AST 操作）
    │
    ├─→ FileComposer 合并所有文件变更
    │
    ├─→ TemplateRenderer 渲染最终内容
    │
    └─→ ZipBuilder 打包为 ZIP Buffer
    │
    ▼
返回 ZIP 文件流（Content-Type: application/zip）
    │
    ▼
浏览器触发文件下载
```

---

## 8. 模块插件规范

每个功能模块封装为一个独立插件，实现以下统一接口：

```typescript
interface ModulePlugin {
  /** 插件唯一标识 */
  readonly name: string;

  /** 插件描述（显示在 UI 上） */
  readonly description: string;

  /** 依赖的其他插件（安装顺序） */
  readonly requires?: string[];

  /**
   * 返回需要添加到 package.json 的依赖
   * key 为包名，value 为版本号
   */
  getDependencies(config: ProjectConfig): {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };

  /**
   * 返回需要新增的文件列表
   */
  getFiles(config: ProjectConfig): GeneratedFile[];

  /**
   * 修改已有文件（通过 AST 操作）
   * 例如：向 app.module.ts 注入 imports
   */
  patchFiles(
    existingFiles: VirtualFileSystem,
    config: ProjectConfig
  ): VirtualFileSystem;
}
```

### 示例：Swagger 插件

```typescript
class SwaggerPlugin implements ModulePlugin {
  name = 'swagger';
  description = 'API 文档自动生成（@nestjs/swagger）';

  getDependencies() {
    return {
      dependencies: { '@nestjs/swagger': '^7.0.0' },
      devDependencies: {}
    };
  }

  getFiles() {
    return []; // Swagger 不需要新增文件，只修改 main.ts
  }

  patchFiles(vfs, config) {
    // 用 ts-morph 向 main.ts 注入 SwaggerModule.setup() 调用
    const mainTs = vfs.get('src/main.ts');
    const sourceFile = project.createSourceFile('main.ts', mainTs);
    // ... AST 操作
    return vfs.set('src/main.ts', sourceFile.getFullText());
  }
}
```

---

## 9. 里程碑与交付物

### Milestone 1：生成引擎 MVP（第 5 周末）

- [ ] 基础模板（Express + npm + ESLint + Jest）可正常渲染
- [ ] 生成引擎单元测试覆盖率 > 80%
- [ ] CLI 命令行可本地调用生成器

### Milestone 2：后端 API 完成（第 7 周末）

- [ ] `POST /api/generate` 接口完整实现
- [ ] DTO 校验涵盖所有配置项
- [ ] 接口返回有效的 ZIP 文件
- [ ] API 文档（Swagger）自动生成

### Milestone 3：前端 UI 完成（第 10 周末）

- [ ] 配置面板所有选项可用
- [ ] 文件树预览实时响应配置变化
- [ ] 下载功能正常工作
- [ ] URL 配置分享功能可用

### Milestone 4：全模块支持（第 13 周末）

- [ ] 所有计划模块插件完成并通过集成测试
- [ ] 模块组合冲突检测完善

### Milestone 5：上线（第 16 周末）

- [ ] 生产环境部署完成
- [ ] CI/CD 流水线正常运行
- [ ] README 文档完善
- [ ] 论文答辩材料准备完毕

---

*文档版本：v1.0 · 最后更新：2026*
