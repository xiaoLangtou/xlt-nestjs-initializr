<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useProjectConfigStore } from '@/stores/projectConfig';
import { useThemeStore } from '@/stores/theme';
import { buildTree, computeFiles, flattenTree, getFileIcon, type FlatNode } from '@/utils/fileTree';
import { useCodePreview } from '@/composables/useCodePreview';
import { getHighlighter, highlight } from '@/composables/useHighlighter';

const store = useProjectConfigStore();
const theme = useThemeStore();
const { openFile, invalidateCache, activeFile, activeContent, loading, error, closePreview } = useCodePreview();

const files = computed(() => computeFiles(store.state));
const flat = computed(() => flattenTree(buildTree(files.value)));
const drawerOpen = ref(false);
const highlightedCode = ref('');

onMounted(() => getHighlighter());

watch(() => store.toQueryString(), invalidateCache);

// 内容或主题变化时重新高亮
watch([activeContent, activeFile, () => theme.mode], async () => {
  if (!activeContent.value) { highlightedCode.value = ''; return; }
  await getHighlighter();
  highlightedCode.value = highlight(
    activeContent.value,
    getLang(activeFile.value ?? ''),
    theme.mode === 'dark',
  );
});

function getLang(f: string): string {
  if (f.endsWith('.ts') || f.endsWith('.tsx')) return 'typescript';
  if (f.endsWith('.js')) return 'javascript';
  if (f.endsWith('.json')) return 'json';
  if (f.endsWith('.yml') || f.endsWith('.yaml')) return 'yaml';
  if (f.endsWith('.md')) return 'markdown';
  if (f.endsWith('.graphql')) return 'graphql';
  if (f === 'Dockerfile' || f.endsWith('.dockerignore')) return 'dockerfile';
  return 'text';
}

function getFullPath(nodes: FlatNode[], idx: number): string {
  const node = nodes[idx];
  const parts: string[] = [node.name];
  let depth = node.depth;
  for (let i = idx - 1; i >= 0 && depth > 0; i--) {
    if (nodes[i].isDir && nodes[i].depth === depth - 1) {
      parts.unshift(nodes[i].name);
      depth--;
    }
  }
  return parts.join('/');
}

async function handleFileClick(path: string) {
  drawerOpen.value = true;
  await openFile(path);
}

function handleClose() {
  drawerOpen.value = false;
  closePreview();
}
</script>

<template>
  <!-- 原位文件树卡片 -->
  <div class="file-tree-card">
    <div class="ft-header">
      <div class="ft-header-left">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <h3>文件预览</h3>
      </div>
      <span class="ft-count">{{ files.length }} files</span>
    </div>
    <div class="ft-body">
      <template v-for="(node, idx) in flat" :key="idx">
        <div
          class="ft-item"
          :class="{ clickable: !node.isDir }"
          :style="{ animationDelay: `${idx * 0.02}s` }"
          @click="!node.isDir && handleFileClick(getFullPath(flat, idx))"
        >
          <span class="ft-indent" :style="{ width: `${node.depth * 16}px` }" />
          <template v-if="node.isDir">
            <span class="ft-icon folder">▸</span>
            <span class="ft-name dir">{{ node.name }}/</span>
          </template>
          <template v-else>
            <span class="ft-icon" :class="getFileIcon(node.name).cls">{{ getFileIcon(node.name).char }}</span>
            <span class="ft-name">{{ node.name }}</span>
            <span class="ft-source" :class="node.source === 'base' ? 'base' : 'plugin'">
              {{ node.source === 'base' ? 'base' : node.source }}
            </span>
          </template>
        </div>
      </template>
    </div>
  </div>

  <!-- 右侧抽屉：左树右码 -->
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="drawerOpen" class="drawer-overlay" @click.self="handleClose">
        <div class="drawer">

          <!-- 抽屉顶栏 -->
          <div class="drawer-topbar">
            <span class="drawer-title">代码预览</span>
            <span v-if="activeFile" class="drawer-filepath">{{ activeFile }}</span>
            <button class="drawer-close" @click="handleClose" title="关闭 (Esc)">✕</button>
          </div>

          <!-- 左树 + 右码 -->
          <div class="drawer-body">

            <!-- 左侧文件树 -->
            <div class="drawer-tree">
              <template v-for="(node, idx) in flat" :key="idx">
                <div
                  class="dt-item"
                  :class="{
                    'dt-clickable': !node.isDir,
                    'dt-active': !node.isDir && activeFile === getFullPath(flat, idx),
                  }"
                  :style="{ paddingLeft: `${10 + node.depth * 14}px` }"
                  @click="!node.isDir && openFile(getFullPath(flat, idx))"
                >
                  <template v-if="node.isDir">
                    <span class="dt-icon folder">▸</span>
                    <span class="dt-name dir">{{ node.name }}/</span>
                  </template>
                  <template v-else>
                    <span class="dt-icon" :class="getFileIcon(node.name).cls">{{ getFileIcon(node.name).char }}</span>
                    <span class="dt-name">{{ node.name }}</span>
                  </template>
                </div>
              </template>
            </div>

            <!-- 右侧代码 -->
            <div class="drawer-code-panel">
              <div v-if="loading" class="dc-state">⏳ 生成中，请稍候…</div>
              <div v-else-if="error" class="dc-state dc-error">{{ error }}</div>
              <div v-else-if="!activeFile" class="dc-state dc-hint">← 点击左侧文件查看源代码</div>
              <div v-else-if="!highlightedCode" class="dc-state">渲染中…</div>
              <div v-else class="dc-code" v-html="highlightedCode" />
            </div>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ft-item.clickable { cursor: pointer; }
.ft-item.clickable:hover { background: var(--surface-hover); }

/* ===== 遮罩 ===== */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(3px);
  z-index: 600;
  display: flex;
  justify-content: flex-end;
}

/* ===== 抽屉主体 ===== */
.drawer {
  width: min(1000px, 80vw);
  height: 100%;
  background: var(--surface);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  box-shadow: -16px 0 48px rgba(0, 0, 0, 0.35);
}

/* ===== 顶栏 ===== */
.drawer-topbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1.25rem;
  height: 48px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
  flex-shrink: 0;
}

.drawer-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.drawer-filepath {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  color: var(--text-muted);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-close {
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.2rem 0.55rem;
  transition: color 0.2s, background 0.2s;
}
.drawer-close:hover { color: var(--text-primary); background: var(--surface-hover); }

/* ===== 左树右码布局 ===== */
.drawer-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧文件树 */
.drawer-tree {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 0.5rem 0;
  background: var(--surface-2);
}

.dt-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding-top: 0.28rem;
  padding-bottom: 0.28rem;
  padding-right: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.71rem;
  color: var(--text-secondary);
  white-space: nowrap;
  transition: background 0.12s;
}
.dt-item.dt-clickable { cursor: pointer; }
.dt-item.dt-clickable:hover { background: var(--surface-hover); }
.dt-item.dt-active { background: var(--accent-soft2); }
.dt-item.dt-active .dt-name { color: var(--accent); }

.dt-icon { flex-shrink: 0; font-size: 0.72rem; }
.dt-icon.folder { color: var(--yellow); }
.dt-icon.ts { color: var(--blue); }
.dt-icon.json { color: var(--green); }
.dt-icon.config { color: var(--orange); }
.dt-icon.yml { color: var(--purple); }
.dt-icon.md { color: var(--text-muted); }

.dt-name { overflow: hidden; text-overflow: ellipsis; }
.dt-name.dir { color: var(--text-primary); font-weight: 500; }

/* 右侧代码面板 */
.drawer-code-panel {
  flex: 1;
  overflow: auto;
  min-width: 0;
}

.dc-state {
  padding: 3rem 2rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-muted);
}
.dc-error { color: var(--error); }
.dc-hint { color: var(--text-dim); }

.dc-code :deep(pre) {
  margin: 0;
  padding: 1.25rem 1.5rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.76rem;
  line-height: 1.7;
  overflow-x: auto;
  tab-size: 2;
  /* 让 shiki 背景色透明，使用系统主题背景 */
  background: transparent !important;
}
.dc-code :deep(code) { font-family: inherit; }

/* shiki 容器背景跟随主题 */
.dc-code :deep(.shiki) {
  background: var(--bg) !important;
}

/* ===== 抽屉动画 ===== */
.drawer-enter-active { transition: opacity 0.22s ease; }
.drawer-leave-active { transition: opacity 0.2s ease; }
.drawer-enter-active .drawer { transition: transform 0.26s cubic-bezier(0.4, 0, 0.2, 1); }
.drawer-leave-active .drawer { transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1); }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .drawer, .drawer-leave-to .drawer { transform: translateX(100%); }
</style>
