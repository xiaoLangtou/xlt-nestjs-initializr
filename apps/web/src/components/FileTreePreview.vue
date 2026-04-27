<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { Icon } from '@iconify/vue';
import { useProjectConfigStore } from '@/stores/projectConfig';
import { buildTree, buildElTree, computeFiles, type ElTreeNode } from '@/utils/fileTree';
import { useCodePreview } from '@/composables/useCodePreview';

const store = useProjectConfigStore();
const { openFile, invalidateCache, activeFile, drawerOpen } = useCodePreview();

const files = computed(() => computeFiles(store.state));
const treeData = computed(() => buildElTree(buildTree(files.value)));

watch(() => store.toQueryString(), invalidateCache);

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

async function handleNodeClick(node: ElTreeNode) {
  if (node.isDir) return;
  drawerOpen.value = true;
  await openFile(node.id);
}

// el-tree 默认展开所有节点
const defaultExpandAll = ref(true);
</script>

<template>
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
      <el-tree
        :data="treeData"
        :default-expand-all="defaultExpandAll"
        node-key="id"
        :highlight-current="true"
        :current-node-key="activeFile ?? ''"
        @node-click="handleNodeClick"
      >
        <template #default="{ node, data }: { node: any, data: ElTreeNode }">
          <div class="tree-node">
            <Icon
              :icon="getVscodeIcon(data.label, data.isDir)"
              width="15"
              class="node-icon"
            />
            <span class="node-label">{{ data.label }}</span>
            <span
              v-if="!data.isDir && data.source && data.source !== 'base'"
              class="node-badge"
            >{{ data.source }}</span>
          </div>
        </template>
      </el-tree>
    </div>
  </div>
</template>

<style scoped>
.ft-body {
  padding: 4px 0 8px;
}

/* el-tree 样式覆盖 */
:deep(.el-tree) {
  background: transparent;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
}

:deep(.el-tree-node__content) {
  height: 28px;
  border-radius: 0;
  padding-left: 4px !important;
}

:deep(.el-tree-node__content:hover) {
  background: var(--surface-hover);
}

:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content) {
  background: var(--accent-soft2);
  position: relative;
}

:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content::before) {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 2px;
  background: var(--accent);
  border-radius: 0 2px 2px 0;
}

:deep(.el-tree-node__expand-icon) {
  color: var(--text-muted);
  font-size: 11px;
}

:deep(.el-tree-node__expand-icon.is-leaf) {
  color: transparent;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  overflow: hidden;
}

.node-icon {
  flex-shrink: 0;
}

.node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.72rem;
}

.node-badge {
  font-size: 0.58rem;
  padding: 1px 5px;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 3px;
  flex-shrink: 0;
  margin-right: 4px;
}
</style>
