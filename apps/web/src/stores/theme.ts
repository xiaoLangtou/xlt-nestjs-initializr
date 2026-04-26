import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'nestjs-initializr.theme';

function readInitialTheme(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readInitialTheme());
  applyTheme(mode.value);

  function toggle(): void {
    mode.value = mode.value === 'dark' ? 'light' : 'dark';
  }

  function set(next: ThemeMode): void {
    mode.value = next;
  }

  watch(mode, (next) => {
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });

  return { mode, toggle, set };
});
