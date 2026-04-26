# 实施计划：NestJS Initializr

## 概述

按照项目规划的阶段划分，从生成引擎核心开始，逐步构建后端 API、前端 UI，最后扩展模块插件。采用 pnpm workspaces + Turborepo 的 Monorepo 结构，前后端与生成引擎共享类型定义。所有代码使用 TypeScript 实现。

## 任务

- [x] 1. 初始化 Monorepo 项目结构与共享类型
  - [x] 1.1 创建 Monorepo 根目录配置
    - 创建根 `package.json`（pnpm workspaces 配置）、`pnpm-workspace.yaml`、`turbo.json`
    - 创建 `apps/web/`、`apps/api/`、`packages/generator/` 目录骨架及各自的 `package.json` 和 `tsconfig.json`
    - _需求：项目规划 Phase 0_

  - [x] 1.2 定义共享类型包
    - 在 `packages/generator/src/types/` 下创建所有枚举类型（`HttpAdapter`、`PackageManager`、`LinterOption`、`TestRunner`、`GitHooksOption`、`ModuleId`、`DatabaseType`）
    - 创建 `ProjectConfig`、`GeneratedFile`、`FilePatch`、`PluginOutput`、`ApiErrorResponse`、`ConfigUrlParams` 等接口
    - 创建 `MODULE_DEPENDENCIES` 和 `MUTUAL_EXCLUSIONS` 常量定义
    - _需求：7.1, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 1.3 编写共享类型的单元测试
    - 验证枚举值完整性
    - 验证 `MODULE_DEPENDENCIES` 和 `MUTUAL_EXCLUSIONS` 数据结构正确性
    - _需求：5.6, 2.5_

- [x] 2. 实现虚拟文件系统（VirtualFileSystem）
  - [x] 2.1 实现 VirtualFileSystem 类
    - 基于 `memfs` 实现 `VirtualFileSystem` 接口（`get`、`set`、`has`、`delete`、`paths`、`entries` 方法）
    - 确保所有操作在内存中完成，不产生磁盘 IO
    - _需求：21.1_

  - [ ]* 2.2 编写 VirtualFileSystem 单元测试
    - 测试文件的增删改查操作
    - 测试路径列表和 entries 映射
    - _需求：21.1_

- [x] 3. 实现模板渲染器（TemplateRenderer）
  - [x] 3.1 实现 TemplateRenderer 类
    - 实现 `render` 方法：加载 `.hbs` 模板文件，使用 Handlebars 编译并渲染
    - 实现 `renderBaseTemplates` 方法：批量渲染 `templates/base/` 目录下的所有模板
    - 输出文件路径自动去除 `.hbs` 后缀
    - 配置 Handlebars `strict: false`，未定义变量使用空字符串替代
    - _需求：20.1, 20.2, 20.4_

  - [x] 3.2 创建基础项目模板文件
    - 创建 `templates/base/src/main.ts.hbs`（根据 adapter 条件渲染 Express/Fastify）
    - 创建 `templates/base/src/app.module.ts.hbs`（包含 AppController 和 AppService 导入注册）
    - 创建 `templates/base/src/app.controller.ts.hbs` 和 `templates/base/src/app.service.ts.hbs`
    - 创建 `templates/base/package.json.hbs`（根据 packageManager、linter、testRunner 条件渲染依赖和 scripts）
    - 创建 `templates/base/tsconfig.json.hbs` 和 `templates/base/README.md.hbs`
    - 创建 Lint 配置模板：`.eslintrc.js.hbs`、`.prettierrc.hbs`、`biome.json.hbs`
    - 创建测试配置模板：`jest.config.ts.hbs`、`vitest.config.ts.hbs`、`test/app.e2e-spec.ts.hbs`
    - _需求：8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 3.4_

  - [ ]* 3.3 编写模板渲染器属性测试
    - **属性 12：模板路径后缀转换** — 验证所有 `.hbs` 模板输出路径去除后缀
    - **验证需求：20.1**

  - [ ]* 3.4 编写模板渲染器属性测试
    - **属性 14：模板渲染无 undefined 泄漏** — 验证任意有效 ProjectConfig 渲染结果不含 "undefined" 字面量
    - **验证需求：20.4**

  - [ ]* 3.5 编写模板渲染器属性测试
    - **属性 3：基础文件不变量** — 验证任意有效 ProjectConfig 始终包含 7 个基础文件
    - **验证需求：3.4**

  - [ ]* 3.6 编写模板渲染器属性测试
    - **属性 11：app.module.ts 基础导入不变量** — 验证生成的 app.module.ts 始终包含 AppController 和 AppService
    - **验证需求：8.10**

  - [ ]* 3.7 编写基础模板单元测试
    - 测试 Express 适配器模板渲染（main.ts 包含 NestExpressApplication）
    - 测试 Fastify 适配器模板渲染（main.ts 包含 NestFastifyApplication）
    - 测试各包管理器的 scripts 格式
    - 测试 ESLint+Prettier 和 Biome 配置文件生成
    - 测试 Jest 和 Vitest 配置文件生成
    - _需求：8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

- [x] 4. 检查点 — 确保模板渲染核心测试通过
  - 确保所有测试通过，如有疑问请询问用户。

- [x] 5. 实现插件注册表与依赖解析（PluginRegistry）
  - [x] 5.1 实现 PluginRegistry 类
    - 实现 `register` 方法：注册 ModulePlugin 实例
    - 实现 `topologicalSort` 方法：基于 `MODULE_DEPENDENCIES` 进行拓扑排序，检测循环依赖并抛出错误
    - 实现 `getActivePlugins` 方法：根据用户选中的 moduleIds 返回拓扑排序后的插件列表（包含传递依赖）
    - _需求：7.1, 7.5, 7.6, 7.7_

  - [ ]* 5.2 编写插件注册表属性测试
    - **属性 2：模块依赖解析完整性** — 验证依赖解析结果包含所有传递依赖且为原始选择的超集
    - **验证需求：2.5**

  - [ ]* 5.3 编写插件注册表属性测试
    - **属性 9：拓扑排序顺序不变量** — 验证排序结果中每个插件的依赖都出现在它之前
    - **验证需求：7.5**

  - [ ]* 5.4 编写插件注册表属性测试
    - **属性 10：插件执行范围限定** — 验证执行的插件集合恰好等于用户选中模块及其传递依赖
    - **验证需求：7.7**

  - [ ]* 5.5 编写插件注册表单元测试
    - 测试循环依赖检测抛出错误
    - 测试空模块列表返回空结果
    - 测试互斥模块检测
    - _需求：7.5, 7.6_

- [x] 6. 实现冲突解决器（ConflictResolver）
  - [x] 6.1 实现 ConflictResolver 类
    - 使用 `ts-morph` 实现 AST 级别的文件合并
    - 支持 `addImport`（添加 import 语句）、`addModuleImport`（向 @Module imports 数组添加模块）、`addProvider`（向 providers 数组添加）、`addBootstrapCode`（向 bootstrap 函数添加代码）四种操作
    - _需求：7.4, 20.3_

  - [ ]* 6.2 编写冲突解决器单元测试
    - 测试多个插件同时向 app.module.ts 注入 imports 的合并
    - 测试向 main.ts 注入 bootstrap 代码
    - _需求：7.4_

- [x] 7. 实现文件合并器（FileComposer）
  - [x] 7.1 实现 FileComposer 类
    - 实现 `compose` 方法：将基础模板文件与各插件的 newFiles、patches、dependencies 合并
    - 对同一文件的多次修改调用 ConflictResolver 进行 AST 合并
    - 合并所有插件的 dependencies/devDependencies 到 package.json
    - _需求：7.2, 7.3, 7.4_

  - [ ]* 7.2 编写文件合并器单元测试
    - 测试新文件添加不冲突
    - 测试多插件依赖合并到 package.json
    - 测试 AST patch 合并
    - _需求：7.2, 7.3, 7.4_

- [x] 8. 实现 ZIP 构建器（ZipBuilder）
  - [x] 8.1 实现 ZipBuilder 类
    - 使用 `archiver` 库将 VirtualFileSystem 中的所有文件打包为 ZIP Buffer
    - ZIP 内以项目名称作为根目录名
    - 保留正确的目录层级结构
    - _需求：21.2, 21.3, 4.4_

  - [ ]* 8.2 编写 ZIP 构建器属性测试
    - **属性 15：ZIP 打包往返一致性** — 验证打包后解压得到相同的目录结构和文件内容
    - **验证需求：21.2, 21.3**

  - [ ]* 8.3 编写 ZIP 构建器属性测试
    - **属性 4：项目名称传播一致性** — 验证 ZIP 根目录名、package.json name 字段、README.md 内容均包含项目名称
    - **验证需求：4.4, 4.5, 4.7**

- [x] 9. 实现生成引擎主流程（GeneratorService 引擎层）
  - [x] 9.1 实现引擎层 generate 方法
    - 编排完整生成流程：渲染基础模板 → 获取激活插件 → 执行插件 → 合并文件 → 打包 ZIP
    - 捕获模板渲染错误和插件执行错误，封装为带上下文的错误类型
    - _需求：4.2, 19.1, 19.2_

  - [ ]* 9.2 编写生成引擎属性测试
    - **属性 13：有效配置生成有效 TypeScript** — 验证任意有效 ProjectConfig 生成的 .ts 文件可通过 AST 解析
    - **验证需求：20.3**

  - [ ]* 9.3 编写生成引擎集成测试
    - 测试默认配置（Express + npm + ESLint + Jest）完整生成流程
    - 测试 Fastify + pnpm + Biome + Vitest 配置组合
    - _需求：4.2, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10. 检查点 — 确保生成引擎核心测试通过
  - 确保所有测试通过，如有疑问请询问用户。

- [x] 11. 实现后端 API 层
  - [x] 11.1 搭建 NestJS 后端应用
    - 在 `apps/api/` 下初始化 NestJS 应用
    - 配置 `@nestjs/throttler` 限流模块（每 IP 每分钟 10 次）
    - 配置全局 `ValidationPipe` 和 `GlobalExceptionFilter`
    - _需求：18.1, 18.2, 18.3, 19.1, 19.2_

  - [x] 11.2 实现 GenerateProjectDto 校验
    - 使用 `class-validator` 装饰器实现所有字段校验
    - 实现 `MutualExclusionConstraint` 自定义校验器（TypeORM 与 Prisma 互斥）
    - 项目名称正则校验：`/^[a-z0-9][a-z0-9._-]*$/`，长度 1-214
    - _需求：5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 11.3 实现 GeneratorController 和 GeneratorService
    - 实现 `POST /api/generate` 端点
    - 调用生成引擎获取 ZIP Buffer
    - 设置响应头：`Content-Type: application/zip`、`Content-Disposition: attachment; filename="{name}.zip"`
    - 流式返回 ZIP 文件
    - _需求：4.1, 4.3, 21.4_

  - [ ]* 11.4 编写 DTO 校验属性测试
    - **属性 1：npm 包名校验一致性** — 验证校验函数对合法/非法 npm 包名的接受/拒绝行为
    - **验证需求：1.1, 5.1**

  - [ ]* 11.5 编写 DTO 校验属性测试
    - **属性 5：DTO 模块标识符校验** — 验证 DTO 对合法/非法 ModuleId 数组的接受/拒绝行为
    - **验证需求：5.6**

  - [ ]* 11.6 编写后端 API 集成测试
    - 使用 Supertest 测试有效请求返回 ZIP 文件
    - 测试无效 DTO 返回 400 错误
    - 测试互斥配置返回 400 错误
    - 测试限流返回 429 错误
    - _需求：5.7, 5.8, 18.3, 21.4_

- [x] 12. 检查点 — 确保后端 API 测试通过
  - 确保所有测试通过，如有疑问请询问用户。

- [x] 13. 实现前端 UI
  - [x] 13.1 搭建前端应用与 Pinia Store
    - 在 `apps/web/` 下初始化 Vue 3 + Vite + Element Plus + Tailwind CSS 应用
    - 安装 `element-plus`、`pinia`、`@element-plus/icons-vue` 等依赖
    - 配置 Element Plus 按需导入（推荐使用 `unplugin-vue-components` + `unplugin-auto-import`）
    - 实现 `useProjectConfigStore`（Pinia）：包含所有配置状态和 setter 方法
    - 实现 `restoreFromUrl` 和 `toQueryString` 方法
    - _需求：6.1, 6.2, 6.3_

  - [ ]* 13.2 编写 URL 序列化属性测试
    - **属性 6：配置 URL 序列化往返一致性** — 验证序列化后反序列化得到等价的 ProjectConfig
    - **验证需求：6.1, 6.2, 6.5**

  - [ ]* 13.3 编写 URL 反序列化属性测试
    - **属性 7：无效 URL 参数默认值回退** — 验证无效参数使用默认值且不抛异常
    - **验证需求：6.4**

  - [x] 13.4 实现 ConfigPanel 组件
    - 使用 Vue 3 SFC（`<script setup lang="ts">`）开发所有组件
    - 实现 `BasicConfig.vue` 子组件：项目名称输入框（ElInput + npm 包名校验）、描述输入框（ElInput）、HTTP 适配器选择（ElSelect）、包管理器选择（ElSelect）
    - 实现 `QualityConfig.vue` 子组件：Lint 工具选择（ElSelect）、测试框架选择（ElSelect）、Git Hooks 选择（ElSelect）
    - 实现 `ModuleSelector.vue` 子组件：可选模块多选（ElCheckboxGroup + ElCheckbox）、依赖自动勾选提示（ElMessage）、互斥模块禁用
    - 选择 TypeORM 时展示数据库类型选择（ElSelect，使用 `v-if` 条件渲染）
    - 所有选项设置正确的默认值
    - _需求：1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 13.5 实现 FileTreePreview 组件
    - 使用 Element Plus 的 ElTree 组件展示文件树
    - 根据当前 Pinia 配置状态纯前端计算文件树（使用 `computed` 响应式计算）
    - 使用 `FILE_TREE_CONFIG` 映射动态计算文件列表
    - 以树形结构展示，对模块新增文件使用自定义 ElTree 节点样式进行视觉标记区分
    - 配置变更后 500ms 内更新（Vue 3 响应式系统天然支持）
    - _需求：3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 13.6 实现 GenerateButton 与下载逻辑
    - 使用 ElButton 组件实现生成按钮
    - 点击按钮发送 POST 请求到 `/api/generate`
    - 处理 ZIP Blob 响应，触发浏览器下载（文件名 `{name}.zip`）
    - 请求中显示加载状态（ElButton loading 属性），禁用按钮防止重复提交
    - 处理 400/429/500/网络错误，使用 ElMessage 显示对应错误提示
    - 错误后恢复按钮可点击状态
    - _需求：4.1, 4.3, 4.8, 19.3, 19.4_

  - [x] 13.7 实现响应式布局
    - 使用 Element Plus 的 ElRow + ElCol 栅格系统结合 Tailwind CSS 实现响应式布局
    - 桌面端左右分栏布局（配置面板 + 文件树预览）
    - 视口宽度 < 768px 时切换为上下堆叠布局（使用 Tailwind 响应式断点或 ElCol :span 动态绑定）
    - 1024px 及以上完整展示所有选项无需水平滚动
    - _需求：22.1, 22.2, 22.3_

  - [ ]* 13.8 编写前端组件单元测试
    - 使用 Vitest + @vue/test-utils 测试 Vue 3 组件
    - 测试 ConfigPanel 默认值渲染
    - 测试 ModuleSelector 依赖自动勾选和互斥禁用
    - 测试 FileTreePreview 文件树计算（computed 属性）
    - _需求：1.3, 1.4, 1.5, 1.6, 1.7, 2.5, 2.6, 3.4_

- [x] 14. 检查点 — 确保前端 UI 测试通过
  - 确保所有测试通过，如有疑问请询问用户。

- [x] 15. 实现模块插件
  - [x] 15.1 实现 Config 模块插件
    - 实现 `ConfigPlugin`：添加 `@nestjs/config` 依赖，注入 `ConfigModule.forRoot({ isGlobal: true })`，生成 `.env.example`，修改 `.gitignore`
    - _需求：14.1, 14.2, 14.3, 14.4_

  - [x] 15.2 实现 Swagger 模块插件
    - 实现 `SwaggerPlugin`：添加 `@nestjs/swagger` 依赖，向 main.ts 注入 `SwaggerModule.setup()` 调用，配置文档路径 `/api/docs`
    - _需求：9.1, 9.2, 9.3_

  - [x] 15.3 实现 Docker 模块插件
    - 实现 `DockerPlugin`：生成多阶段 Dockerfile、docker-compose.yml、.dockerignore
    - 当同时选择 TypeORM 时在 docker-compose.yml 中添加数据库服务
    - _需求：10.1, 10.2, 10.3, 10.4_

  - [x] 15.4 实现 GraphQL 模块插件
    - 实现 `GraphQLPlugin`：添加 `@nestjs/graphql`、`@nestjs/apollo`、`apollo-server-express` 依赖，注入 `GraphQLModule.forRoot()`，生成示例 resolver 和 schema
    - _需求：11.1, 11.2, 11.3_

  - [x] 15.5 实现 TypeORM 模块插件
    - 实现 `TypeORMPlugin`：根据数据库类型添加对应驱动依赖（pg/mysql2/better-sqlite3），注入 `TypeOrmModule.forRoot()`，生成示例 Entity
    - _需求：12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 15.6 实现 Prisma 模块插件
    - 实现 `PrismaPlugin`：添加 prisma（dev）和 @prisma/client 依赖，生成 `prisma/schema.prisma` 和 `PrismaService`，注册为全局 provider
    - _需求：13.1, 13.2, 13.3, 13.4_

  - [x] 15.7 实现 i18n 模块插件
    - 实现 `I18nPlugin`：添加 `nestjs-i18n` 依赖，注入 `I18nModule.forRoot()`，生成 `src/i18n/en/` 和 `src/i18n/zh/` 示例翻译文件
    - _需求：15.1, 15.2, 15.3_

  - [x] 15.8 实现 Bull 模块插件
    - 实现 `BullPlugin`：添加 `@nestjs/bull` 和 `bull` 依赖，注入 `BullModule.forRoot()` 含 Redis 配置，生成示例 Queue processor
    - _需求：16.1, 16.2, 16.3_

  - [x] 15.9 实现 Health Check 模块插件
    - 实现 `HealthCheckPlugin`：添加 `@nestjs/terminus` 依赖，生成 `HealthController`（GET /health），注入 TerminusModule 注册
    - _需求：17.1, 17.2, 17.3_

  - [ ]* 15.10 编写插件接口契约属性测试
    - **属性 8：插件接口契约** — 验证所有已注册插件的 getDependencies、getFiles、patchFiles 返回值符合接口规范
    - **验证需求：7.2, 7.3, 7.4**

  - [ ]* 15.11 编写各插件单元测试
    - 测试每个插件的 getDependencies 返回正确的依赖包
    - 测试每个插件的 getFiles 返回正确的文件列表
    - 测试每个插件的 patchFiles 正确修改 app.module.ts / main.ts
    - _需求：9.1-9.3, 10.1-10.4, 11.1-11.3, 12.1-12.5, 13.1-13.4, 14.1-14.4, 15.1-15.3, 16.1-16.3, 17.1-17.3_

- [x] 16. 检查点 — 确保所有插件测试通过
  - 确保所有测试通过，如有疑问请询问用户。

- [x] 17. 端到端集成与收尾
  - [x] 17.1 全链路集成验证
    - 编写完整生成流程的集成测试：前端配置 → 后端 API → 生成引擎 → ZIP 下载 → 解压验证
    - 验证多种配置组合（默认配置、全模块选中、Fastify+pnpm+Biome+Vitest 等）
    - _需求：4.2, 4.4, 4.5, 4.6, 4.7_

  - [x] 17.2 URL 配置分享集成验证
    - 验证配置序列化为 URL 后在新窗口中正确还原
    - 验证无效 URL 参数的默认值回退
    - _需求：6.1, 6.2, 6.4, 6.5_

  - [ ]* 17.3 编写 E2E 测试
    - 使用 Playwright 测试完整用户流程：打开页面 → 配置选项 → 生成下载 → 解压验证
    - 测试响应式布局在不同视口宽度下的表现
    - _需求：22.1, 22.2, 22.3_

- [x] 18. 最终检查点 — 确保所有测试通过
  - 确保所有测试通过，如有疑问请询问用户。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 交付
- 每个任务引用了具体的需求编号以确保可追溯性
- 检查点任务用于阶段性验证，确保增量开发的正确性
- 属性测试验证设计文档中定义的 15 个正确性属性
- 单元测试验证具体的示例和边界情况
