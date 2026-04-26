<script setup lang="ts">
import { computed, watch } from 'vue';
import { useProjectConfigStore } from '@/stores/projectConfig';
import { buildTree, computeFiles, flattenTree, getFileIcon, type FlatNode } from '@/utils/fileTree';
import { useCodePreview } from '@/composables/useCodePreview';

const store = useProjectConfigStore();
const { openFile, invalidateCache, activeFile } = useCodePreview();

const files = computed(() => computeFiles(store.state));
const flat = computed(() => flattenTree(buildTree(files.value)));

// 配置变更时使预览缓存失效
watch(() => store.toQueryString(), invalidateCache);

// 根据 flat 列表和当前索引，重建完整路径
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
      <template v-for="(node, idx) in flat" :key="idx">
        <div
          class="ft-item"
          :class="{ clickable: !node.isDir, 'ft-active': !node.isDir && activeFile === getFullPath(flat, idx) }"
          :style="{ animationDelay: `${idx * 0.02}s` }"
          @click="!node.isDir && openFile(getFullPath(flat, idx))"
        >
          <span class="ft-indent" :style="{ width: `${node.depth * 16}px` }" />
          <template v-if="node.isDir">
            <span class="ft-icon folder">▸</span>
            <span class="ft-name dir">{{ node.name }}/</span>
          </template>
          <template v-else>
            <span class="ft-icon" :class="getFileIcon(node.name).cls">{{ getFileIcon(node.name).char }}</span>
            <span class="ft-name">{{ node.name }}</span>
            <span
              class="ft-source"
              :class="node.source === 'base' ? 'base' : 'plugin'"
            >{{ node.source === 'base' ? 'base' : node.source }}</span>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ft-item.clickable { cursor: pointer; }
.ft-item.clickable:hover { background: var(--surface-hover); }
.ft-item.ft-active { background: var(--accent-soft2); }
.ft-item.ft-active .ft-name { color: var(--accent); }
</style>
