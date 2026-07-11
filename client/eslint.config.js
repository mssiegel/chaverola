import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// Flat config. The React Hooks plugin's `recommended-latest` preset turns on the
// React Compiler lints, including the `incompatible-library` rule that warns when
// the compiler would memoize a value passed into a library that breaks on it —
// https://react.dev/reference/eslint-plugin-react-hooks/lints/incompatible-library
export default tseslint.config(
  { ignores: ["dist"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  }
);
