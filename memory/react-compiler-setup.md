---
name: react-compiler-setup
description: React Compiler is enabled client-side; do not hand-write memo/useCallback/useMemo
metadata:
  type: project
---

The client uses **React Compiler** for auto-memoization, so we do NOT hand-write `memo` / `useCallback` / `useMemo` (removed 2026-07-11 at the user's request).

**How to apply:**

- Wiring is in `client/vite.config.ts`: `@vitejs/plugin-react` v6 runs the compiler as a Babel preset via `@rolldown/plugin-babel` — `babel({ presets: [reactCompilerPreset()] })` (v6 dropped the old `babel` option).
- `eslint-plugin-react-hooks` `recommended-latest` enforces the Rules of React (incl. `incompatible-library`) so the compiler can optimize; `pnpm lint`.
- Compiler bails on any component/hook that breaks the rules. It caught writing refs during render in `useChatDemo` — sync "latest value" refs in a `useEffect`, not the render body. Verify optimization is happening by grepping the build for `useMemoCache`.

Note: the client's `typescript` was pinned to `5.9.3` (down from native `7.x`) on 2026-07-11 so that `typescript-eslint` (peer `<6.1.0`) can parse the code — the ESLint config uses the standard typescript-eslint parser.
