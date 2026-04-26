<script setup lang="ts">
import { computed } from 'vue';
import {
  GitHooksOption,
  HttpAdapter,
  LinterOption,
  PackageManager,
  TestRunner,
} from '@nestjs-initializr/generator';
import { findModule } from '@/data/modules';
import { useProjectConfigStore } from '@/stores/projectConfig';

const store = useProjectConfigStore();

const ADAPTER_LABEL: Record<HttpAdapter, string> = {
  [HttpAdapter.Express]: 'Express',
  [HttpAdapter.Fastify]: 'Fastify',
};
const PM_LABEL: Record<PackageManager, string> = {
  [PackageManager.Npm]: 'npm',
  [PackageManager.Yarn]: 'yarn',
  [PackageManager.Pnpm]: 'pnpm',
};
const LINTER_LABEL: Record<LinterOption, string> = {
  [LinterOption.EslintPrettier]: 'ESLint + Prettier',
  [LinterOption.Biome]: 'Biome',
};
const TEST_LABEL: Record<TestRunner, string> = {
  [TestRunner.Jest]: 'Jest',
  [TestRunner.Vitest]: 'Vitest',
};
const HOOKS_LABEL: Record<GitHooksOption, string> = {
  [GitHooksOption.None]: 'None',
  [GitHooksOption.Husky]: 'Husky',
};

const manualMods = computed(() =>
  [...store.state.modules].map((id) => ({ id, name: findModule(id)?.name ?? id })),
);
const autoMods = computed(() =>
  [...store.state.autoModules].map((id) => ({ id, name: findModule(id)?.name ?? id })),
);
const isEmpty = computed(() => manualMods.value.length + autoMods.value.length === 0);
</script>

<template>
  <div class="summary-card">
    <div class="summary-title">配置概览</div>
    <div class="summary-row"><span class="label">适配器</span><span class="value">{{ ADAPTER_LABEL[store.state.adapter] }}</span></div>
    <div class="summary-row"><span class="label">包管理器</span><span class="value">{{ PM_LABEL[store.state.packageManager] }}</span></div>
    <div class="summary-row"><span class="label">Lint</span><span class="value">{{ LINTER_LABEL[store.state.linter] }}</span></div>
    <div class="summary-row"><span class="label">测试</span><span class="value">{{ TEST_LABEL[store.state.testRunner] }}</span></div>
    <div class="summary-row"><span class="label">Git Hooks</span><span class="value">{{ HOOKS_LABEL[store.state.gitHooks] }}</span></div>
    <div class="summary-divider" />
    <div class="summary-row" style="align-items: flex-start">
      <span class="label">模块</span>
      <div class="summary-modules">
        <span v-if="isEmpty" class="summary-empty">未选择</span>
        <template v-else>
          <span
            v-for="m in manualMods"
            :key="m.id"
            class="summary-mod-tag removable"
            :title="`移除 ${m.name}`"
            @click="store.toggleModule(m.id)"
          >
            {{ m.name }}
            <svg class="tag-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </span>
          <span v-for="m in autoMods" :key="m.id" class="summary-mod-tag auto">{{ m.name }} (auto)</span>
        </template>
      </div>
    </div>
  </div>
</template>
