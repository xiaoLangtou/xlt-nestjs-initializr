<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { Icon } from '@iconify/vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';
import { useProjectConfigStore } from '@/stores/projectConfig';
import { useThemeStore } from '@/stores/theme';
import { buildTree, buildElTree, computeFiles, type ElTreeNode } from '@/utils/fileTree';
import { useCodePreview } from '@/composables/useCodePreview';
import { getHighlighter, highlight } from '@/composables/useHighlighter';

const store = useProjectConfigStore();
const theme = useThemeStore();
const {
  openFile, invalidateCache, activeFile, activeContent,
  loading, error, closePreview, drawerOpen,
} = useCodePreview();

const files = computed(() => computeFiles(store.state));
const treeData = computed(() => buildElTree(buildTree(files.value)));
const highlightedCode = ref('');
const openTabs = ref<string[]>([]);
const downloading = ref(false);
const searchQuery = ref('');

onMounted(() => getHighlighter());
watch(() => store.toQueryString(), invalidateCache);

watch([activeContent, activeFile, () => theme.mode], async () => {
  if (!activeContent.value) { highlightedCode.value = ''; return; }
  await getHighlighter();
  highlightedCode.value = highlight(
    activeContent.value,
    getLang(activeFile.value ?? ''),
    theme.mode === 'dark',
  );
});

async function handleDownload() {
  downloading.value = true;
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
    ElMessage.success(`项目 "${store.state.name}" 已开始下载`);
  } catch {
    ElMessage.error('生成失败，请稍后重试');
  } finally {
    downloading.value = false;
  }
}

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

function getVscodeIcon(name: string, isDir = false): string {
  if (isDir) return 'vscode-icons:default-folder-opened';
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return 'vscode-icons:file-type-typescript';
  if (name.endsWith('.js') || name.endsWith('.jsx')) return 'vscode-icons:file-type-js';
  if (name.endsWith('.vue')) return 'vscode-icons:file-type-vue';
  if (name.endsWith('.json')) return 'vscode-icons:file-type-json';
  if (name.endsWith('.md')) return 'vscode-icons:file-type-markdown';
  if (name.endsWith('.yml') || name.endsWith('.yaml')) return 'vscode-icons:file-type-yaml';
  if (name.endsWith('.graphql')) return 'vscode-icons:file-type-graphql';
  if (name.endsWith('.prisma')) return 'vscode-icons:file-type-prisma';
  if (name === 'Dockerfile') return 'vscode-icons:file-type-docker';
  if (name === '.gitignore' || name === '.dockerignore') return 'vscode-icons:file-type-git';
  if (name.startsWith('.eslint')) return 'vscode-icons:file-type-eslint';
  if (name.startsWith('.prettier')) return 'vscode-icons:file-type-prettier';
  if (name === 'biome.json') return 'vscode-icons:file-type-biome';
  if (name.startsWith('.env')) return 'vscode-icons:file-type-dotenv';
  return 'vscode-icons:default-file';
}

async function handleNodeClick(data: ElTreeNode) {
  if (data.isDir) return;
  if (!openTabs.value.includes(data.id)) openTabs.value.push(data.id);
  await openFile(data.id);
}

function closeTab(path: string, e: Event) {
  e.stopPropagation();
  const idx = openTabs.value.indexOf(path);
  openTabs.value.splice(idx, 1);
  if (activeFile.value === path) {
    const next = openTabs.value[Math.min(idx, openTabs.value.length - 1)];
    if (next) openFile(next);
    else { activeFile.value = null; activeContent.value = null; }
  }
}

function handleDrawerClose() {
  openTabs.value = [];
  closePreview();
}

const treeRef = ref();
watch(searchQuery, (q) => { treeRef.value?.filter(q); });
function filterNode(value: string, data: ElTreeNode) {
  if (!value) return true;
  return data.label.toLowerCase().includes(value.toLowerCase());
}

const codeLines = computed(() => activeContent.value?.split('\n').length ?? 0);
const breadcrumbParts = computed(() => activeFile.value?.split('/') ?? []);
</script>

<template>
  <el-drawer
    v-model="drawerOpen"
    direction="rtl"
    size="80%"
    class="cv-drawer"
    header-class="cv-drawer-header"
    body-class="cv-drawer-body"
    :close-on-press-escape="true"
    :close-on-click-modal="true"
    :destroy-on-close="false"
    :show-close="true"
    @close="handleDrawerClose"
  >
    <!-- 自定义 header -->
    <template #header>
      <div class="cv-header">
        <div class="cv-header-left">
          <div class="cv-logo">
            <span class="cv-logo-icon">&lt;/&gt;</span>
            <span class="cv-logo-text">代码预览</span>
          </div>
          <div v-if="activeFile" class="cv-breadcrumb">
            <template v-for="(part, i) in breadcrumbParts" :key="i">
              <span :class="i === breadcrumbParts.length - 1 ? 'cv-bc-active' : 'cv-bc-part'">{{ part }}</span>
              <span v-if="i < breadcrumbParts.length - 1" class="cv-bc-sep">/</span>
            </template>
          </div>
        </div>
        <div class="cv-header-actions">
          <button
            class="cv-download-btn"
            :class="{ loading: downloading }"
            :disabled="downloading"
            @click="handleDownload"
          >
            <span class="btn-text">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
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
        </div>
      </div>
    </template>

    <!-- 默认 slot：主体内容 -->
    <div class="cv-main">
      <!-- 左侧文件树 -->
      <div class="cv-sidebar">
        <div class="cv-sidebar-header">
          <span class="cv-sidebar-title">EXPLORER</span>
        </div>
        <div class="cv-search-wrap">
          <el-input
            v-model="searchQuery"
            placeholder="搜索文件..."
            size="small"
            clearable
          >
            <template #prefix>🔍</template>
          </el-input>
        </div>
        <div class="cv-tree-wrap">
          <el-tree
            ref="treeRef"
            :data="treeData"
            :default-expand-all="true"
            node-key="id"
            :highlight-current="true"
            :current-node-key="activeFile ?? ''"
            :filter-node-method="filterNode"
            @node-click="handleNodeClick"
          >
            <template #default="{ data }: { data: ElTreeNode }">
              <div class="cv-tree-node">
                <Icon :icon="getVscodeIcon(data.label, data.isDir)" width="15" class="cv-node-icon" />
                <span class="cv-node-label">{{ data.label }}</span>
                <span v-if="!data.isDir && data.source && data.source !== 'base'" class="cv-node-badge">
                  {{ data.source }}
                </span>
              </div>
            </template>
          </el-tree>
        </div>
        <div class="cv-sidebar-footer">
          <span class="cv-stat"><span class="cv-stat-dot" />{{ files.length }} files</span>
        </div>
      </div>

      <!-- 右侧代码区 -->
      <div class="cv-code-area">
        <!-- 标签页 -->
        <div class="cv-tabs">
          <div
            v-for="tab in openTabs"
            :key="tab"
            class="cv-tab"
            :class="{ 'cv-tab-active': activeFile === tab }"
            @click="openFile(tab)"
          >
            <Icon :icon="getVscodeIcon(tab.split('/').pop()!)" width="14" />
            <span>{{ tab.split('/').pop() }}</span>
            <span class="cv-tab-close" @click="closeTab(tab, $event)">×</span>
          </div>
        </div>

        <!-- 代码内容 -->
        <div class="cv-code-container">
          <div v-if="loading" class="cv-state">⏳ 生成中，请稍候…</div>
          <div v-else-if="error" class="cv-state cv-error">{{ error }}</div>
          <div v-else-if="!activeFile" class="cv-state cv-hint">← 点击左侧文件查看源代码</div>
          <div v-else-if="activeFile && !highlightedCode" class="cv-state">渲染中…</div>
          <template v-else>
            <div class="cv-gutter">
              <span v-for="n in codeLines" :key="n" class="cv-gutter-line">{{ n }}</span>
            </div>
            <div class="cv-code" v-html="highlightedCode" />
          </template>
        </div>

        <!-- 状态栏 -->
        <div class="cv-statusbar">
          <div class="cv-status-left">
            <span class="cv-status-item">
              <Icon icon="vscode-icons:file-type-git" width="12" />
              main
            </span>
            <span v-if="activeFile" class="cv-status-item">{{ codeLines }} 行</span>
          </div>
          <div class="cv-status-right">
            <span v-if="activeFile" class="cv-status-item">{{ getLang(activeFile) }}</span>
            <span class="cv-status-item">UTF-8</span>
            <span class="cv-status-item">Spaces: 2</span>
          </div>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
/* ===== Header ===== */
.cv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 16px;
  height: 46px;
}

.cv-header-left { display: flex; align-items: center; gap: 16px; }

.cv-logo { display: flex; align-items: center; gap: 8px; }
.cv-logo-icon {
  width: 22px; height: 22px;
  background: var(--accent);
  border-radius: 5px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: white;
  font-family: 'JetBrains Mono', monospace;
}
.cv-logo-text { font-size: 13px; font-weight: 600; color: var(--text-primary); }

.cv-breadcrumb {
  display: flex; align-items: center; gap: 4px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
}
.cv-bc-part { color: var(--text-muted); }
.cv-bc-sep { color: var(--text-dim); }
.cv-bc-active { color: var(--accent); }

.cv-header-actions { display: flex; align-items: center; gap: 8px; }

/* 生成按钮（和主页面一致） */
.cv-download-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 1.1rem;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm, 7px);
  color: white;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
  overflow: hidden;
}
.cv-download-btn:hover:not(:disabled) {
  background: var(--accent-bright, #f05256);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(224, 58, 62, 0.25);
}
.cv-download-btn:active:not(:disabled) { transform: translateY(0); }
.cv-download-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.cv-download-btn.loading { pointer-events: none; }
.cv-download-btn.loading .btn-text { opacity: 0; }
.cv-download-btn.loading .btn-spinner { opacity: 1; }
.cv-download-btn .btn-text {
  display: flex; align-items: center; gap: 0.35rem;
  transition: opacity 0.2s;
}
.cv-download-btn .btn-spinner {
  position: absolute; opacity: 0; transition: opacity 0.2s;
}
.cv-download-btn .btn-spinner svg {
  width: 16px; height: 16px;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 主体布局 ===== */
.cv-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0; /* 关键：让 flex 子元素可以收缩 */
}

/* ===== 左侧文件树 ===== */
.cv-sidebar {
  width: 260px; flex-shrink: 0;
  background: var(--bg);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column; overflow: hidden;
}
.cv-sidebar-header { padding: 10px 14px 6px; flex-shrink: 0; }
.cv-sidebar-title {
  font-size: 10px; font-weight: 600; letter-spacing: 0.1em;
  color: var(--text-muted); text-transform: uppercase;
}
.cv-search-wrap { padding: 4px 10px 6px; flex-shrink: 0; }

.cv-tree-wrap { flex: 1; overflow-y: auto; overflow-x: hidden; }
.cv-tree-wrap::-webkit-scrollbar { width: 4px; }
.cv-tree-wrap::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

/* el-tree 样式覆盖 */
:deep(.el-tree) {
  background: transparent;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}
:deep(.el-tree-node__content) { height: 28px; border-radius: 0; }
:deep(.el-tree-node__content:hover) { background: var(--surface-hover); }
:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content) {
  background: var(--accent-soft2);
  position: relative;
}
:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content::before) {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 2px; background: var(--accent);
  border-radius: 0 2px 2px 0;
}
:deep(.el-tree-node__expand-icon) { color: var(--text-muted); font-size: 11px; }
:deep(.el-tree-node__expand-icon.is-leaf) { color: transparent; }

.cv-tree-node { display: flex; align-items: center; gap: 6px; width: 100%; overflow: hidden; }
.cv-node-icon { flex-shrink: 0; }
.cv-node-label {
  flex: 1; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; font-size: 12px;
}
.cv-node-badge {
  font-size: 9px; padding: 1px 5px;
  background: var(--accent-soft); color: var(--accent);
  border-radius: 3px; flex-shrink: 0; margin-right: 4px;
}

.cv-sidebar-footer { padding: 8px 14px; border-top: 1px solid var(--border); flex-shrink: 0; }
.cv-stat {
  display: flex; align-items: center; gap: 5px;
  font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted);
}
.cv-stat-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }

/* ===== 右侧代码区 ===== */
.cv-code-area {
  flex: 1; display: flex; flex-direction: column;
  overflow: hidden; background: var(--surface);
}

.cv-tabs {
  display: flex; align-items: center; height: 38px;
  background: var(--bg); border-bottom: 1px solid var(--border);
  padding: 0 6px; gap: 2px; flex-shrink: 0; overflow-x: auto;
}
.cv-tabs::-webkit-scrollbar { height: 0; }
.cv-tab {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 12px;
  font-family: 'JetBrains Mono', monospace; font-size: 11.5px;
  color: var(--text-muted); background: transparent;
  border: none; border-radius: 5px 5px 0 0;
  cursor: pointer; white-space: nowrap; transition: all 0.15s;
  position: relative;
}
.cv-tab:hover { color: var(--text-secondary); background: var(--surface-hover); }
.cv-tab.cv-tab-active { color: var(--text-primary); background: var(--surface); }
.cv-tab.cv-tab-active::after {
  content: ''; position: absolute;
  bottom: -1px; left: 0; right: 0; height: 1px; background: var(--surface);
}
.cv-tab-close {
  font-size: 15px; opacity: 0; margin-left: 2px;
  color: var(--text-muted); transition: opacity 0.15s; line-height: 1;
}
.cv-tab:hover .cv-tab-close { opacity: 1; }
.cv-tab-close:hover { color: var(--text-primary); }

.cv-code-container { flex: 1; overflow: auto; display: flex; }
.cv-code-container::-webkit-scrollbar { width: 7px; height: 7px; }
.cv-code-container::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

.cv-state {
  flex: 1; display: flex; align-items: center; justify-content: center;
  font-size: 13px; color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
}
.cv-error { color: var(--error); }
.cv-hint { color: var(--text-dim); }

.cv-gutter {
  padding: 16px 0; text-align: right; user-select: none;
  flex-shrink: 0; position: sticky; left: 0;
  background: var(--bg); border-right: 1px solid var(--border); z-index: 2;
}
.cv-gutter-line {
  display: block; padding: 0 14px 0 18px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
  line-height: 22px; color: var(--text-dim);
}

.cv-code { flex: 1; min-width: 0; }
.cv-code :deep(pre) {
  margin: 0; padding: 16px 20px;
  background: transparent !important;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px; line-height: 22px;
  overflow-x: visible; tab-size: 2;
}
.cv-code :deep(code) { font-family: inherit; }
.cv-code :deep(.shiki) { background: transparent !important; }

.cv-statusbar {
  display: flex; align-items: center; justify-content: space-between;
  height: 26px; padding: 0 12px;
  background: var(--accent); flex-shrink: 0;
}
.cv-status-left, .cv-status-right { display: flex; align-items: center; gap: 12px; }
.cv-status-item {
  display: flex; align-items: center; gap: 4px;
  font-family: 'JetBrains Mono', monospace; font-size: 10.5px;
  font-weight: 500; color: rgba(0,0,0,0.75);
}
</style>
