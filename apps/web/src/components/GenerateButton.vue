<script setup lang="ts">
import axios, { AxiosError } from 'axios';
import { onMounted, onUnmounted, ref } from 'vue';
import { useProjectConfigStore } from '@/stores/projectConfig';
import { validateProjectName } from '@/utils/validate';
import { showToast } from '@/utils/toast';
import type { ApiErrorResponse } from '@nestjs-initializr/generator';

const store = useProjectConfigStore();
const loading = ref(false);

async function generate() {
  if (loading.value) return;
  if (!validateProjectName(store.state.name)) {
    showToast('请检查项目名称是否合法', 'error');
    return;
  }

  loading.value = true;
  try {
    const res = await axios.post('/api/generate', store.toProjectConfig(), {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${store.state.name}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`项目 "${store.state.name}" 生成成功！ZIP 已开始下载。`, 'success');
  } catch (err) {
    const ax = err as AxiosError;
    const status = ax.response?.status;
    let msg = '生成失败，请稍后重试';
    if (status === 400) {
      msg = await extractErrorMessage(ax) ?? '配置参数无效';
    } else if (status === 429) {
      msg = '请求过于频繁，请稍后再试';
    } else if (status && status >= 500) {
      msg = await extractErrorMessage(ax) ?? '服务器错误，请稍后重试';
    } else if (!ax.response) {
      msg = '网络连接错误';
    }
    showToast(msg, 'error');
  } finally {
    loading.value = false;
  }
}

async function extractErrorMessage(err: AxiosError): Promise<string | null> {
  if (!err.response?.data) return null;
  try {
    const data = err.response.data as Blob | ApiErrorResponse;
    let parsed: ApiErrorResponse | null = null;
    if (data instanceof Blob) {
      const text = await data.text();
      parsed = JSON.parse(text) as ApiErrorResponse;
    } else {
      parsed = data;
    }
    if (Array.isArray(parsed.message)) return parsed.message.join('；');
    return parsed.message ?? null;
  } catch {
    return null;
  }
}

function handleKey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    generate();
  }
}

onMounted(() => document.addEventListener('keydown', handleKey));
onUnmounted(() => document.removeEventListener('keydown', handleKey));
</script>

<template>
  <div class="generate-section">
    <button
      class="generate-btn"
      :class="{ loading }"
      :disabled="loading"
      @click="generate"
    >
      <span class="btn-text">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        生成项目
      </span>
      <span class="btn-spinner">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83" />
        </svg>
      </span>
    </button>
    <div class="generate-hint">Ctrl + Enter 快速生成</div>
  </div>
</template>
