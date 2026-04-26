<script setup lang="ts">
import { computed } from 'vue';
import { useCodePreview } from '@/composables/useCodePreview';

const { activeFile, activeContent, loading, error, closePreview } = useCodePreview();

const language = computed(() => {
  const f = activeFile.value ?? '';
  if (f.endsWith('.ts') || f.endsWith('.tsx')) return 'typescript';
  if (f.endsWith('.js')) return 'javascript';
  if (f.endsWith('.json')) return 'json';
  if (f.endsWith('.yml') || f.endsWith('.yaml')) return 'yaml';
  if (f.endsWith('.md')) return 'markdown';
  if (f.endsWith('.graphql')) return 'graphql';
  if (f.endsWith('.prisma')) return 'prisma';
  if (f === 'Dockerfile' || f.endsWith('.dockerignore')) return 'dockerfile';
  return 'text';
});

function handleBackdrop(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('modal-backdrop')) {
    closePreview();
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="activeFile !== null"
      class="modal-backdrop"
      @click="handleBackdrop"
    >
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-filename">{{ activeFile }}</span>
          <button class="modal-close" @click="closePreview" title="关闭">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="loading" class="modal-loading">生成中…</div>
          <div v-else-if="error" class="modal-error">{{ error }}</div>
          <div v-else-if="activeContent === null" class="modal-error">文件不存在</div>
          <pre v-else class="modal-code" :data-lang="language"><code>{{ activeContent }}</code></pre>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.modal-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 860px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.modal-filename {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
}
.modal-close:hover {
  color: var(--text-primary);
  background: var(--surface-hover);
}

.modal-body {
  overflow: auto;
  flex: 1;
}

.modal-loading,
.modal-error {
  padding: 2rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-muted);
}
.modal-error { color: var(--error); }

.modal-code {
  margin: 0;
  padding: 1.25rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.78rem;
  line-height: 1.65;
  color: var(--text-secondary);
  white-space: pre;
  overflow-x: auto;
  tab-size: 2;
}

.modal-code::before {
  content: attr(data-lang);
  display: block;
  font-size: 0.65rem;
  color: var(--text-dim);
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
</style>
