<script setup lang="ts">
import { computed } from 'vue';
import { HttpAdapter, PackageManager } from '@nestjs-initializr/generator';
import { useProjectConfigStore } from '@/stores/projectConfig';
import { validateProjectName } from '@/utils/validate';
import SelectCardGroup from './SelectCardGroup.vue';

const store = useProjectConfigStore();

const ADAPTER_OPTIONS = [
  { value: HttpAdapter.Express, name: 'Express', desc: '默认适配器，生态成熟' },
  { value: HttpAdapter.Fastify, name: 'Fastify', desc: '高性能，低开销' },
];

const PM_OPTIONS = [
  { value: PackageManager.Npm, name: 'npm' },
  { value: PackageManager.Yarn, name: 'yarn' },
  { value: PackageManager.Pnpm, name: 'pnpm' },
];

const nameValidity = computed(() => {
  const v = store.state.name;
  if (!v) return { valid: false, msg: '项目名称不能为空' };
  if (!validateProjectName(v))
    return { valid: false, msg: '仅允许小写字母、数字、连字符、下划线和点' };
  return { valid: true, msg: '符合 npm 包名规范' };
});
</script>

<template>
  <div class="config-card">
    <div class="card-header">
      <div class="card-header-icon" style="background: var(--accent-soft); color: var(--accent)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </div>
      <h3>基础配置</h3>
    </div>

    <div class="card-body">
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">项目名称 <span class="required">*</span></label>
          <input
            v-model.trim="store.state.name"
            class="form-input"
            :class="{ invalid: !nameValidity.valid }"
            type="text"
            placeholder="my-nest-app"
            spellcheck="false"
          />
          <span class="form-hint" :class="{ error: !nameValidity.valid }">{{ nameValidity.msg }}</span>
        </div>
        <div class="form-group">
          <label class="form-label">项目描述</label>
          <input
            v-model="store.state.description"
            class="form-input"
            type="text"
            placeholder="A NestJS project"
            spellcheck="false"
            maxlength="500"
          />
        </div>
      </div>

      <SelectCardGroup
        label="HTTP 适配器"
        :options="ADAPTER_OPTIONS"
        v-model="store.state.adapter"
        :cols="2"
      />

      <SelectCardGroup
        label="包管理器"
        :options="PM_OPTIONS"
        v-model="store.state.packageManager"
        :cols="3"
      />
    </div>
  </div>
</template>
