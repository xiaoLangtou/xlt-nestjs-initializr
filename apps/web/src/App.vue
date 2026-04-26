<script setup lang="ts">
import { onMounted } from 'vue';
import AppHeader from '@/components/AppHeader.vue';
import BasicConfig from '@/components/BasicConfig.vue';
import QualityConfig from '@/components/QualityConfig.vue';
import ModuleSelector from '@/components/ModuleSelector.vue';
import CodeExplorer from '@/components/CodeExplorer.vue';
import SummaryCard from '@/components/SummaryCard.vue';
import GenerateButton from '@/components/GenerateButton.vue';
import ToastView from '@/components/ToastView.vue';
import { useProjectConfigStore } from '@/stores/projectConfig';

const store = useProjectConfigStore();

onMounted(() => {
  store.restoreFromUrl(new URLSearchParams(location.search));
});
</script>

<template>
  <AppHeader />

  <div class="main-wrap">
    <div class="page-title">
      <h1>Create your <em>NestJS</em> project</h1>
      <p>可视化配置项目脚手架，选择所需的模块与工具链，一键生成可运行的项目模板。</p>
    </div>

    <div class="content-grid">
      <div class="config-panel">
        <BasicConfig />
        <QualityConfig />
        <ModuleSelector />
      </div>

      <div class="sidebar">
        <SummaryCard />
        <CodeExplorer />
        <GenerateButton />
      </div>
    </div>
  </div>

  <ToastView />
</template>
