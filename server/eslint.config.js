import tseslint from "typescript-eslint";

// Minimal flat config: no React here, so just the typescript-eslint
// recommended set over the source and the two config files.
export default tseslint.config({
  files: ["**/*.ts", "**/*.js"],
  extends: [...tseslint.configs.recommended],
  rules: {
    // Express needs the 4-arg error-middleware signature even when an arg
    // goes unused — underscore-prefix those.
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
});
