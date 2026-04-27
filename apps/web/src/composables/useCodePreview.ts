import { ref, shallowRef } from 'vue';
import axios from 'axios';
import { unzipSync, strFromU8 } from 'fflate';
import { useProjectConfigStore } from '@/stores/projectConfig';

/** 已解压的文件内容缓存：相对路径 → 内容 */
const fileCache = shallowRef<Map<string, string>>(new Map());
const loading = ref(false);
const error = ref<string | null>(null);
/** 当前展示的文件路径 */
const activeFile = ref<string | null>(null);
/** 当前展示的文件内容 */
const activeContent = ref<string | null>(null);
/** 抽屉是否打开 */
const drawerOpen = ref(false);
/** 缓存是否有效（配置变更后置为 false） */
let cacheValid = false;

export function useCodePreview() {
  const store = useProjectConfigStore();

  function invalidateCache() {
    cacheValid = false;
    fileCache.value = new Map();
    activeContent.value = null;
    activeFile.value = null;
  }

  async function fetchAndCache(): Promise<void> {
    if (cacheValid) return;
    loading.value = true;
    error.value = null;
    try {
      const res = await axios.post('/api/generate', store.toProjectConfig(), {
        responseType: 'arraybuffer',
      });
      const data = new Uint8Array(res.data as ArrayBuffer);
      const unzipped = unzipSync(data);
      const map = new Map<string, string>();
      for (const [fullPath, bytes] of Object.entries(unzipped)) {
        const parts = fullPath.split('/');
        const relativePath = parts.slice(1).join('/');
        if (relativePath) {
          map.set(relativePath, strFromU8(bytes));
        }
      }
      fileCache.value = map;
      cacheValid = true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '生成失败';
    } finally {
      loading.value = false;
    }
  }

  /** 点击文件时调用：先设置 activeFile 触发"渲染中"状态，再异步加载内容 */
  async function openFile(path: string): Promise<void> {
    // 立即设置 activeFile，让 UI 显示"渲染中"
    activeFile.value = path;
    activeContent.value = null;

    await fetchAndCache();

    // fetchAndCache 完成后再设置内容（此时 activeFile 可能已切换，需校验）
    if (activeFile.value === path) {
      activeContent.value = fileCache.value.get(path) ?? null;
    }
  }

  function closePreview() {
    drawerOpen.value = false;
    activeFile.value = null;
    activeContent.value = null;
  }

  return {
    loading,
    error,
    activeFile,
    activeContent,
    drawerOpen,
    fileCache,
    openFile,
    closePreview,
    invalidateCache,
  };
}
