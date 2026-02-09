import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // Parallel Claude Code sessions keep their git worktrees under .claude/worktrees/.
    // Without this, a test run in the main checkout would also run every worktree's copy of the tests.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.git/**', '.claude/**'],
  },
});
