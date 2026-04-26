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
/** 缓存是否有效（配置变更后置为 false） */
let cacheValid = false;

export function useCodePreview() {
  const store = useProjectConfigStore();

  /** 配置变更时使缓存失效 */
  function invalidateCache() {
    cacheValid = false;
    fileCache.value = new Map();
    activeContent.value = null;
    activeFile.value = null;
  }

  /** 调用后端生成接口，解压 ZIP，填充缓存 */
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
        // 去掉 ZIP 根目录前缀（如 "my-app/src/main.ts" → "src/main.ts"）
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

  /** 点击文件时调用 */
  async function openFile(path: string): Promise<void> {
    await fetchAndCache();
    activeFile.value = path;
    activeContent.value = fileCache.value.get(path) ?? null;
  }

  function closePreview() {
    activeFile.value = null;
    activeContent.value = null;
  }

  return {
    loading,
    error,
    activeFile,
    activeContent,
    fileCache,
    openFile,
    closePreview,
    invalidateCache,
  };
}
