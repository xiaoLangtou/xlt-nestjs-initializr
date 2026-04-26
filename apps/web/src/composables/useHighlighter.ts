import { ref } from 'vue';
import { createHighlighter, type Highlighter } from 'shiki';

let highlighter: Highlighter | null = null;
const ready = ref(false);

const LANGS = [
  'typescript', 'javascript', 'json', 'yaml', 'markdown',
  'graphql', 'dockerfile', 'shellscript', 'text',
];

// 深色/浅色各一套主题
const THEME_DARK = 'github-dark-dimmed';
const THEME_LIGHT = 'github-light';

export async function getHighlighter(): Promise<Highlighter> {
  if (highlighter) return highlighter;
  highlighter = await createHighlighter({
    themes: [THEME_DARK, THEME_LIGHT],
    langs: LANGS,
  });
  ready.value = true;
  return highlighter;
}

export function highlight(code: string, lang: string, isDark: boolean): string {
  if (!highlighter) return `<pre><code>${escapeHtml(code)}</code></pre>`;
  const safeLang = LANGS.includes(lang) ? lang : 'text';
  return highlighter.codeToHtml(code, {
    lang: safeLang,
    theme: isDark ? THEME_DARK : THEME_LIGHT,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export { ready };
