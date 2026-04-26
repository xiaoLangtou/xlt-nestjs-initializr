<script setup lang="ts">
import { GitHooksOption, LinterOption, TestRunner } from '@nestjs-initializr/generator';
import { useProjectConfigStore } from '@/stores/projectConfig';
import SelectCardGroup from './SelectCardGroup.vue';

const store = useProjectConfigStore();

const LINTER_OPTIONS = [
  { value: LinterOption.EslintPrettier, name: 'ESLint + Prettier', desc: '经典组合，规则丰富' },
  { value: LinterOption.Biome, name: 'Biome', desc: 'Rust 驱动，极速一体化' },
];

const TEST_OPTIONS = [
  { value: TestRunner.Jest, name: 'Jest', desc: 'NestJS 默认测试框架' },
  { value: TestRunner.Vitest, name: 'Vitest', desc: 'Vite 原生，ESM 友好' },
];

const HOOK_OPTIONS = [
  { value: GitHooksOption.None, name: '不启用' },
  { value: GitHooksOption.Husky, name: 'Husky + lint-staged', desc: '提交前自动校验' },
];
</script>

<template>
  <div class="config-card">
    <div class="card-header">
      <div class="card-header-icon" style="background: var(--green-soft); color: var(--green)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <h3>代码质量</h3>
    </div>
    <div class="card-body">
      <SelectCardGroup label="Lint 工具" :options="LINTER_OPTIONS" v-model="store.state.linter" :cols="2" />
      <SelectCardGroup label="测试框架" :options="TEST_OPTIONS" v-model="store.state.testRunner" :cols="2" />
      <SelectCardGroup label="Git Hooks" :options="HOOK_OPTIONS" v-model="store.state.gitHooks" :cols="2" />
    </div>
  </div>
</template>
