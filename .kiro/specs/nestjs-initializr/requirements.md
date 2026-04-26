# 需求文档

## 简介

NestJS Initializr 是一个 Web 工具，类似于 Java 生态中的 Spring Initializr。开发者通过可视化界面选择项目配置（HTTP 适配器、包管理器、Lint 工具、测试框架、可选功能模块等），一键生成并下载一个结构完整、配置完备的 NestJS 项目 ZIP 压缩包。该工具旨在将 NestJS 项目初始化时间从数小时缩短到数秒，消除重复性脚手架工作，保证最佳实践的一致性。

## 术语表

- **Initializr**: NestJS Initializr Web 应用的简称，即本系统
- **配置面板 (ConfigPanel)**: 前端 UI 中供用户选择项目配置选项的左侧面板组件
- **文件树预览 (FileTreePreview)**: 前端 UI 中实时展示将要生成的文件目录结构的右侧面板组件
- **生成引擎 (GenerationEngine)**: 负责根据用户配置渲染模板、执行插件、合并文件并打包 ZIP 的核心模块
- **模块插件 (ModulePlugin)**: 实现统一接口的功能扩展单元，每个插件封装一个可选功能模块（如 Swagger、Docker 等）的依赖注入、文件生成和文件修改逻辑
- **插件注册表 (PluginRegistry)**: 管理所有已注册模块插件的组件，负责插件的查找、排序和依赖解析
- **模板渲染器 (TemplateRenderer)**: 基于 Handlebars 的模板引擎，将模板文件与配置数据结合生成最终文件内容
- **文件合并器 (FileComposer)**: 将基础模板文件与各插件产生的文件变更合并为最终文件集合的组件
- **冲突解决器 (ConflictResolver)**: 使用 ts-morph 进行 AST 级别操作，安全地合并多个插件对同一文件的修改
- **虚拟文件系统 (VirtualFileSystem)**: 基于 memfs 的内存文件系统，用于在不产生磁盘 IO 的情况下组装生成的项目文件
- **ZIP 构建器 (ZipBuilder)**: 基于 archiver 库将虚拟文件系统中的文件打包为 ZIP 格式的组件
- **项目配置 (ProjectConfig)**: 用户在前端选择的所有配置选项的数据结构，包含项目名称、适配器类型、包管理器、Lint 工具、测试框架和可选模块列表
- **DTO (Data Transfer Object)**: 后端用于接收和校验前端请求参数的数据传输对象
- **配置 URL (ConfigURL)**: 将项目配置序列化为 URL query string 的格式，用于配置分享


## 需求

### 需求 1：基础项目配置选择

**用户故事：** 作为开发者，我希望在配置面板中选择 NestJS 项目的基础配置选项，以便生成符合我需求的项目脚手架。

#### 验收标准

1. THE 配置面板 SHALL 提供项目名称输入框，接受符合 npm 包命名规范的字符串（小写字母、数字、连字符、下划线，长度 1-214 个字符）
2. THE 配置面板 SHALL 提供可选的项目描述输入框，接受最长 500 个字符的纯文本
3. THE 配置面板 SHALL 提供 HTTP 适配器选择，可选值为 Express 和 Fastify，默认选中 Express
4. THE 配置面板 SHALL 提供包管理器选择，可选值为 npm、Yarn 和 pnpm，默认选中 npm
5. THE 配置面板 SHALL 提供 Lint 与格式化工具选择，可选值为 "ESLint + Prettier" 和 "Biome"，默认选中 "ESLint + Prettier"
6. THE 配置面板 SHALL 提供测试框架选择，可选值为 Jest 和 Vitest，默认选中 Jest
7. THE 配置面板 SHALL 提供 Git Hooks 选择，可选值为 "无" 和 "Husky + lint-staged"，默认选中 "无"

### 需求 2：可选功能模块选择

**用户故事：** 作为开发者，我希望勾选需要的功能模块（如 Swagger、Docker、GraphQL 等），以便生成的项目包含这些预配置好的功能。

#### 验收标准

1. THE 配置面板 SHALL 以多选复选框形式展示以下可选功能模块：Config、Swagger、GraphQL、TypeORM、Prisma、Docker、i18n、Husky、Bull、Health Check
2. WHEN 用户勾选一个功能模块时，THE 配置面板 SHALL 立即将该模块标记为已选中状态
3. WHEN 用户取消勾选一个功能模块时，THE 配置面板 SHALL 立即将该模块标记为未选中状态
4. WHEN 用户选择 TypeORM 模块时，THE 配置面板 SHALL 额外展示数据库类型选择，可选值为 PostgreSQL、MySQL 和 SQLite
5. WHEN 用户选择的模块存在依赖关系（如 GraphQL 依赖 Config）时，THE 配置面板 SHALL 自动勾选被依赖的模块并显示依赖提示
6. THE 配置面板 SHALL 默认不选中任何可选功能模块

### 需求 3：实时文件树预览

**用户故事：** 作为开发者，我希望在调整配置时实时看到将要生成的文件目录结构，以便在下载前确认生成内容符合预期。

#### 验收标准

1. THE 文件树预览 SHALL 以树形结构展示当前配置下将要生成的所有文件和目录
2. WHEN 用户修改任意配置选项时，THE 文件树预览 SHALL 在 500 毫秒内更新展示的文件结构
3. THE 文件树预览 SHALL 对因可选模块而新增的文件使用视觉标记进行区分
4. THE 文件树预览 SHALL 始终展示基础项目文件（src/main.ts、src/app.module.ts、src/app.controller.ts、src/app.service.ts、package.json、tsconfig.json、README.md）
5. WHEN 用户勾选 Docker 模块时，THE 文件树预览 SHALL 在文件列表中新增 Dockerfile 和 docker-compose.yml
6. WHEN 用户勾选 Lint 工具为 "ESLint + Prettier" 时，THE 文件树预览 SHALL 在文件列表中展示 .eslintrc.js 和 .prettierrc 文件
7. WHEN 用户勾选 Lint 工具为 "Biome" 时，THE 文件树预览 SHALL 在文件列表中展示 biome.json 文件


### 需求 4：项目生成与 ZIP 下载

**用户故事：** 作为开发者，我希望点击生成按钮后快速下载一个完整的 NestJS 项目 ZIP 压缩包，以便立即开始开发工作。

#### 验收标准

1. WHEN 用户点击"生成项目"按钮时，THE Initializr SHALL 向后端发送包含完整项目配置的 POST 请求到 /api/generate 端点
2. WHEN 后端接收到有效的生成请求时，THE 生成引擎 SHALL 在 2 秒内完成 ZIP 文件的生成并返回
3. WHEN 后端返回 ZIP 文件时，THE Initializr SHALL 触发浏览器文件下载，文件名格式为 "{项目名称}.zip"
4. THE 生成引擎 SHALL 生成的 ZIP 文件包含一个以项目名称命名的根目录
5. THE 生成引擎 SHALL 生成的项目包含有效的 package.json 文件，其中 name 字段与用户输入的项目名称一致
6. THE 生成引擎 SHALL 生成的项目包含正确配置的 tsconfig.json 文件
7. THE 生成引擎 SHALL 生成的项目包含 README.md 文件，其中包含项目名称和基本使用说明
8. WHILE 生成请求正在处理中，THE Initializr SHALL 在界面上显示加载状态指示器，禁用生成按钮以防止重复提交

### 需求 5：后端 DTO 校验

**用户故事：** 作为系统运维人员，我希望后端对所有生成请求参数进行严格校验，以便拒绝无效或恶意的请求。

#### 验收标准

1. THE DTO SHALL 校验项目名称为非空字符串且符合 npm 包命名规范
2. THE DTO SHALL 校验 HTTP 适配器值为 "express" 或 "fastify" 之一
3. THE DTO SHALL 校验包管理器值为 "npm"、"yarn" 或 "pnpm" 之一
4. THE DTO SHALL 校验 Lint 工具值为 "eslint-prettier" 或 "biome" 之一
5. THE DTO SHALL 校验测试框架值为 "jest" 或 "vitest" 之一
6. THE DTO SHALL 校验可选模块列表中的每个值为预定义的合法模块标识符之一
7. IF 请求参数校验失败，THEN THE 后端 API SHALL 返回 HTTP 400 状态码和包含具体校验错误信息的 JSON 响应
8. IF 请求包含互斥的配置组合（如同时选择 TypeORM 和 Prisma），THEN THE DTO SHALL 拒绝该请求并返回冲突说明

### 需求 6：配置分享

**用户故事：** 作为开发者，我希望通过 URL 分享我的项目配置，以便团队成员打开链接后自动还原相同的配置。

#### 验收标准

1. WHEN 用户修改任意配置选项时，THE Initializr SHALL 将当前完整配置序列化为 URL query string 并更新浏览器地址栏
2. WHEN 用户访问包含配置 query string 的 URL 时，THE Initializr SHALL 解析 URL 参数并自动还原所有配置选项到对应状态
3. THE Initializr SHALL 支持的 URL 参数包括：name（项目名称）、adapter（HTTP 适配器）、pm（包管理器）、linter（Lint 工具）、test（测试框架）、hooks（Git Hooks）、modules（逗号分隔的模块列表）
4. IF URL 中包含无法识别的参数值，THEN THE Initializr SHALL 忽略该无效参数并使用对应配置项的默认值
5. THE Initializr SHALL 生成的配置 URL 可被完整复制并在新浏览器窗口中正确还原配置


### 需求 7：模块插件系统

**用户故事：** 作为系统开发者，我希望每个可选功能模块以独立插件形式实现统一接口，以便新模块可以方便地扩展而不影响核心引擎。

#### 验收标准

1. THE 模块插件 SHALL 实现 ModulePlugin 接口，包含 name（唯一标识符）、description（描述文本）、requires（可选的依赖插件列表）三个属性
2. THE 模块插件 SHALL 实现 getDependencies 方法，返回需要添加到 package.json 的 dependencies 和 devDependencies 键值对
3. THE 模块插件 SHALL 实现 getFiles 方法，返回需要新增的文件列表（包含文件路径和内容）
4. THE 模块插件 SHALL 实现 patchFiles 方法，通过 AST 操作修改虚拟文件系统中的已有文件
5. WHEN 生成引擎加载插件时，THE 插件注册表 SHALL 按照依赖关系对插件进行拓扑排序，确保被依赖的插件先于依赖方执行
6. IF 插件之间存在循环依赖，THEN THE 插件注册表 SHALL 抛出明确的错误信息指出循环依赖链
7. THE 生成引擎 SHALL 仅执行用户选中的模块对应的插件

### 需求 8：基础模板渲染

**用户故事：** 作为开发者，我希望生成的项目根据我选择的 HTTP 适配器和包管理器正确配置，以便项目开箱即用。

#### 验收标准

1. WHEN 用户选择 Express 适配器时，THE 模板渲染器 SHALL 在 main.ts 中使用 NestExpressApplication 类型并导入 @nestjs/platform-express
2. WHEN 用户选择 Fastify 适配器时，THE 模板渲染器 SHALL 在 main.ts 中使用 NestFastifyApplication 类型并导入 @nestjs/platform-fastify
3. WHEN 用户选择 npm 作为包管理器时，THE 生成引擎 SHALL 在 package.json 的 scripts 中使用 npm run 命令格式，并生成 package-lock.json 相关配置
4. WHEN 用户选择 Yarn 作为包管理器时，THE 生成引擎 SHALL 在 package.json 的 scripts 中使用 yarn 命令格式
5. WHEN 用户选择 pnpm 作为包管理器时，THE 生成引擎 SHALL 在 package.json 的 scripts 中使用 pnpm 命令格式
6. WHEN 用户选择 Jest 作为测试框架时，THE 生成引擎 SHALL 在 package.json 中添加 jest 相关依赖和配置，并生成 test 目录下的示例测试文件
7. WHEN 用户选择 Vitest 作为测试框架时，THE 生成引擎 SHALL 在 package.json 中添加 vitest 相关依赖和配置，并生成 test 目录下的示例测试文件
8. WHEN 用户选择 "ESLint + Prettier" 时，THE 生成引擎 SHALL 生成 .eslintrc.js 和 .prettierrc 配置文件，并在 package.json 中添加对应依赖
9. WHEN 用户选择 "Biome" 时，THE 生成引擎 SHALL 生成 biome.json 配置文件，并在 package.json 中添加 @biomejs/biome 依赖
10. THE 模板渲染器 SHALL 生成的 app.module.ts 包含 AppController 和 AppService 的正确导入和注册

### 需求 9：Swagger 模块插件

**用户故事：** 作为开发者，我希望勾选 Swagger 模块后生成的项目自动配置好 API 文档功能，以便启动项目后即可访问 Swagger UI。

#### 验收标准

1. WHEN 用户选择 Swagger 模块时，THE Swagger 插件 SHALL 向 package.json 的 dependencies 中添加 @nestjs/swagger 包
2. WHEN 用户选择 Swagger 模块时，THE Swagger 插件 SHALL 在 main.ts 中注入 SwaggerModule.setup() 调用代码，配置文档标题为项目名称
3. WHEN 用户选择 Swagger 模块时，THE Swagger 插件 SHALL 在 main.ts 中配置 Swagger 文档路径为 /api/docs

### 需求 10：Docker 模块插件

**用户故事：** 作为开发者，我希望勾选 Docker 模块后生成的项目包含 Docker 配置文件，以便快速容器化部署。

#### 验收标准

1. WHEN 用户选择 Docker 模块时，THE Docker 插件 SHALL 生成多阶段构建的 Dockerfile，包含 build 阶段和 production 阶段
2. WHEN 用户选择 Docker 模块时，THE Docker 插件 SHALL 生成 docker-compose.yml 文件，包含应用服务的定义
3. WHEN 用户同时选择 Docker 模块和 TypeORM 模块时，THE Docker 插件 SHALL 在 docker-compose.yml 中添加对应数据库服务的定义
4. WHEN 用户选择 Docker 模块时，THE Docker 插件 SHALL 生成 .dockerignore 文件，排除 node_modules、dist、.git 等目录


### 需求 11：GraphQL 模块插件

**用户故事：** 作为开发者，我希望勾选 GraphQL 模块后生成的项目包含 GraphQL 基础配置，以便快速开始 GraphQL API 开发。

#### 验收标准

1. WHEN 用户选择 GraphQL 模块时，THE GraphQL 插件 SHALL 向 package.json 的 dependencies 中添加 @nestjs/graphql、@nestjs/apollo 和 apollo-server-express 包
2. WHEN 用户选择 GraphQL 模块时，THE GraphQL 插件 SHALL 在 app.module.ts 中注入 GraphQLModule.forRoot() 配置
3. WHEN 用户选择 GraphQL 模块时，THE GraphQL 插件 SHALL 生成示例 resolver 文件和对应的 GraphQL schema 定义

### 需求 12：TypeORM 模块插件

**用户故事：** 作为开发者，我希望勾选 TypeORM 模块后生成的项目包含数据库 ORM 配置，以便快速连接数据库进行开发。

#### 验收标准

1. WHEN 用户选择 TypeORM 模块并指定 PostgreSQL 数据库时，THE TypeORM 插件 SHALL 向 package.json 添加 @nestjs/typeorm、typeorm 和 pg 依赖
2. WHEN 用户选择 TypeORM 模块并指定 MySQL 数据库时，THE TypeORM 插件 SHALL 向 package.json 添加 @nestjs/typeorm、typeorm 和 mysql2 依赖
3. WHEN 用户选择 TypeORM 模块并指定 SQLite 数据库时，THE TypeORM 插件 SHALL 向 package.json 添加 @nestjs/typeorm、typeorm 和 better-sqlite3 依赖
4. WHEN 用户选择 TypeORM 模块时，THE TypeORM 插件 SHALL 在 app.module.ts 中注入 TypeOrmModule.forRoot() 配置
5. WHEN 用户选择 TypeORM 模块时，THE TypeORM 插件 SHALL 生成示例 Entity 文件

### 需求 13：Prisma 模块插件

**用户故事：** 作为开发者，我希望勾选 Prisma 模块后生成的项目包含 Prisma ORM 配置，以便使用现代 ORM 方案进行数据库开发。

#### 验收标准

1. WHEN 用户选择 Prisma 模块时，THE Prisma 插件 SHALL 向 package.json 添加 prisma（devDependencies）和 @prisma/client（dependencies）依赖
2. WHEN 用户选择 Prisma 模块时，THE Prisma 插件 SHALL 生成 prisma/schema.prisma 文件，包含基础数据源配置
3. WHEN 用户选择 Prisma 模块时，THE Prisma 插件 SHALL 生成 PrismaService 文件，实现 OnModuleInit 接口
4. WHEN 用户选择 Prisma 模块时，THE Prisma 插件 SHALL 在 app.module.ts 中注册 PrismaService 为全局 provider

### 需求 14：Config 模块插件

**用户故事：** 作为开发者，我希望勾选 Config 模块后生成的项目包含环境变量管理配置，以便安全地管理不同环境的配置。

#### 验收标准

1. WHEN 用户选择 Config 模块时，THE Config 插件 SHALL 向 package.json 添加 @nestjs/config 依赖
2. WHEN 用户选择 Config 模块时，THE Config 插件 SHALL 在 app.module.ts 中注入 ConfigModule.forRoot({ isGlobal: true }) 配置
3. WHEN 用户选择 Config 模块时，THE Config 插件 SHALL 生成 .env.example 文件，包含常用环境变量模板
4. WHEN 用户选择 Config 模块时，THE Config 插件 SHALL 在 .gitignore 中添加 .env 条目

### 需求 15：i18n 模块插件

**用户故事：** 作为开发者，我希望勾选 i18n 模块后生成的项目包含国际化支持配置，以便快速实现多语言功能。

#### 验收标准

1. WHEN 用户选择 i18n 模块时，THE i18n 插件 SHALL 向 package.json 添加 nestjs-i18n 依赖
2. WHEN 用户选择 i18n 模块时，THE i18n 插件 SHALL 在 app.module.ts 中注入 I18nModule.forRoot() 配置
3. WHEN 用户选择 i18n 模块时，THE i18n 插件 SHALL 生成 src/i18n/ 目录，包含 en 和 zh 两个语言的示例翻译文件


### 需求 16：Bull 模块插件

**用户故事：** 作为开发者，我希望勾选 Bull 模块后生成的项目包含基于 Redis 的任务队列配置，以便快速实现异步任务处理。

#### 验收标准

1. WHEN 用户选择 Bull 模块时，THE Bull 插件 SHALL 向 package.json 添加 @nestjs/bull 和 bull 依赖
2. WHEN 用户选择 Bull 模块时，THE Bull 插件 SHALL 在 app.module.ts 中注入 BullModule.forRoot() 配置，包含 Redis 连接配置
3. WHEN 用户选择 Bull 模块时，THE Bull 插件 SHALL 生成示例 Queue processor 文件

### 需求 17：Health Check 模块插件

**用户故事：** 作为开发者，我希望勾选 Health Check 模块后生成的项目包含健康检查端点，以便监控系统运行状态。

#### 验收标准

1. WHEN 用户选择 Health Check 模块时，THE Health Check 插件 SHALL 向 package.json 添加 @nestjs/terminus 依赖
2. WHEN 用户选择 Health Check 模块时，THE Health Check 插件 SHALL 生成 HealthController，暴露 GET /health 端点
3. WHEN 用户选择 Health Check 模块时，THE Health Check 插件 SHALL 在 app.module.ts 中注入 TerminusModule 和 HealthController 的注册

### 需求 18：API 限流保护

**用户故事：** 作为系统运维人员，我希望后端 API 具备限流能力，以便防止恶意请求导致服务过载。

#### 验收标准

1. THE 后端 API SHALL 使用 @nestjs/throttler 对 /api/generate 端点实施请求频率限制
2. THE 后端 API SHALL 将默认限流策略设置为每个 IP 地址每分钟最多 10 次生成请求
3. IF 客户端请求超过限流阈值，THEN THE 后端 API SHALL 返回 HTTP 429 状态码和包含重试等待时间的响应头

### 需求 19：错误处理

**用户故事：** 作为开发者，我希望在生成过程中遇到错误时获得清晰的错误提示，以便了解问题原因并采取纠正措施。

#### 验收标准

1. IF 生成引擎在模板渲染过程中发生错误，THEN THE 后端 API SHALL 返回 HTTP 500 状态码和包含错误类型描述的 JSON 响应（不暴露内部堆栈信息）
2. IF 生成引擎在插件执行过程中发生错误，THEN THE 后端 API SHALL 返回 HTTP 500 状态码和指明出错插件名称的 JSON 响应
3. WHEN 后端返回错误响应时，THE Initializr SHALL 在界面上显示用户可理解的错误提示信息
4. WHEN 后端返回错误响应时，THE Initializr SHALL 恢复生成按钮为可点击状态，允许用户修改配置后重试

### 需求 20：Handlebars 模板渲染与往返一致性

**用户故事：** 作为系统开发者，我希望模板渲染引擎能正确地将 Handlebars 模板与配置数据结合生成有效的源代码文件，以便生成的项目代码语法正确且可编译。

#### 验收标准

1. THE 模板渲染器 SHALL 将 Handlebars 模板文件（.hbs 后缀）与项目配置数据结合，输出去除 .hbs 后缀的目标文件
2. THE 模板渲染器 SHALL 正确处理 Handlebars 条件语句（{{#if}}）、循环语句（{{#each}}）和变量插值（{{variable}}）
3. FOR ALL 有效的项目配置组合，THE 生成引擎 SHALL 生成语法正确的 TypeScript 文件（可通过 tsc --noEmit 编译检查）
4. THE 模板渲染器 SHALL 对模板中未定义的变量使用空字符串替代，避免输出 "undefined" 字面量

### 需求 21：虚拟文件系统与 ZIP 打包

**用户故事：** 作为系统开发者，我希望生成过程完全在内存中完成，不产生磁盘 IO，以便支持高并发生成请求且避免文件系统清理问题。

#### 验收标准

1. THE 生成引擎 SHALL 使用虚拟文件系统在内存中组装所有生成的文件，整个生成过程不写入服务器磁盘
2. THE ZIP 构建器 SHALL 将虚拟文件系统中的所有文件打包为有效的 ZIP 格式
3. THE ZIP 构建器 SHALL 在 ZIP 文件中保留正确的目录层级结构和文件权限
4. THE 后端 API SHALL 以流式方式返回 ZIP 文件，设置 Content-Type 为 application/zip，Content-Disposition 为 attachment 并包含文件名

### 需求 22：前端 UI 响应式布局

**用户故事：** 作为开发者，我希望在不同屏幕尺寸的设备上都能正常使用配置面板，以便在桌面和平板设备上都能生成项目。

#### 验收标准

1. THE Initializr SHALL 采用左右分栏布局，左侧为配置面板，右侧为文件树预览
2. WHEN 浏览器视口宽度小于 768 像素时，THE Initializr SHALL 切换为上下堆叠布局，配置面板在上，文件树预览在下
3. THE Initializr SHALL 在 1024 像素及以上宽度的视口中完整展示所有配置选项，无需水平滚动