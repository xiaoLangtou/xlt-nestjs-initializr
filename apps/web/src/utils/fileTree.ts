import {
  GitHooksOption,
  LinterOption,
  type ModuleId,
  TestRunner,
} from '@nestjs-initializr/generator';
import { findModule } from '@/data/modules';
import type { ProjectConfigState } from '@/stores/projectConfig';

export interface FileEntry {
  path: string;
  /** 'base' 或模块名称 */
  source: string;
}

export function computeFiles(state: ProjectConfigState): FileEntry[] {
  const files: FileEntry[] = [];

  const base = [
    'src/main.ts',
    'src/app.module.ts',
    'src/app.controller.ts',
    'src/app.service.ts',
    'package.json',
    'tsconfig.json',
    'tsconfig.build.json',
    'README.md',
    '.gitignore',
  ];

  if (state.linter === LinterOption.EslintPrettier) {
    base.push('.eslintrc.js', '.prettierrc');
  } else {
    base.push('biome.json');
  }

  if (state.testRunner === TestRunner.Jest) {
    base.push('test/app.e2e-spec.ts', 'jest.config.ts');
  } else {
    base.push('test/app.e2e-spec.ts', 'vitest.config.ts');
  }

  if (state.gitHooks === GitHooksOption.Husky) {
    base.push('.husky/pre-commit', '.lintstagedrc.json');
  }

  for (const f of base) {
    files.push({ path: f, source: 'base' });
  }

  const allMods = new Set<ModuleId>([...state.modules, ...state.autoModules]);
  for (const id of allMods) {
    const mod = findModule(id);
    if (!mod) continue;
    for (const f of mod.files) {
      files.push({ path: f, source: mod.name });
    }
  }

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export interface TreeNode {
  name: string;
  isDir: boolean;
  children: TreeNode[];
  source?: string;
}

export function buildTree(files: FileEntry[]): TreeNode {
  const root: TreeNode = { name: '', isDir: true, children: [] };

  for (const f of files) {
    const parts = f.path.split('/');
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      let next = cur.children.find((c) => c.name === part);
      if (!next) {
        next = {
          name: part,
          isDir: !isLast,
          children: [],
          source: isLast ? f.source : undefined,
        };
        cur.children.push(next);
      }
      cur = next;
    }
  }

  // sort: dirs first, then alphabetical
  function sortTree(node: TreeNode): void {
    node.children.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortTree);
  }
  sortTree(root);

  return root;
}

export interface FlatNode {
  name: string;
  isDir: boolean;
  depth: number;
  source?: string;
}

export function flattenTree(root: TreeNode): FlatNode[] {
  const out: FlatNode[] = [];
  function walk(node: TreeNode, depth: number) {
    for (const child of node.children) {
      out.push({
        name: child.name,
        isDir: child.isDir,
        depth,
        source: child.source,
      });
      if (child.isDir) walk(child, depth + 1);
    }
  }
  walk(root, 0);
  return out;
}

export function getFileIcon(name: string): { char: string; cls: string } {
  if (name.endsWith('.ts')) return { char: '◇', cls: 'ts' };
  if (name.endsWith('.json')) return { char: '{ }', cls: 'json' };
  if (name.endsWith('.yml') || name.endsWith('.yaml')) return { char: '─', cls: 'yml' };
  if (name.endsWith('.md')) return { char: '¶', cls: 'md' };
  if (name.endsWith('.js')) return { char: '◇', cls: 'config' };
  if (
    name.startsWith('.env') ||
    name === '.gitignore' ||
    name === '.eslintrc.js' ||
    name === '.prettierrc' ||
    name === '.dockerignore'
  )
    return { char: '•', cls: 'config' };
  if (name === 'Dockerfile') return { char: '▬', cls: 'yml' };
  if (name.endsWith('.graphql')) return { char: '◇', cls: 'ts' };
  return { char: '◦', cls: 'file' };
}

/** el-tree 节点格式 */
export interface ElTreeNode {
  id: string;       // 完整路径，文件唯一标识
  label: string;    // 显示名称
  isDir: boolean;
  source?: string;
  children?: ElTreeNode[];
}

/** 将 TreeNode 转换为 el-tree 所需的节点数组 */
export function buildElTree(root: TreeNode, parentPath = ''): ElTreeNode[] {
  return root.children.map((node) => {
    const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    const elNode: ElTreeNode = {
      id: fullPath,
      label: node.name,
      isDir: node.isDir,
      source: node.source,
    };
    if (node.isDir && node.children.length > 0) {
      elNode.children = buildElTree(node, fullPath);
    }
    return elNode;
  });
}
