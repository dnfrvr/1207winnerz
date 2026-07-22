import globals from "globals";

// Config ESLint minimale, centrée sur `no-undef` : le filet qui attrape les
// symboles non définis/non importés (ex. une const « échouée » dans un module,
// ou un import oublié) — que Vite/esbuild laisse passer et qui crashent au runtime.
export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-undef": "error",
    },
  },
];
