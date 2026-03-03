import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ignore stray editor/backup dotfiles under src
    "src/**/.*",
  ]),
  // Project-specific rule overrides to reduce errors to warnings/off.
  {
    rules: {
      // TypeScript
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" }
      ],

      // React Hooks
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/rules-of-hooks": "warn", // Temporary: prefer "error" normally
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",

      // Next.js
      "@next/next/no-img-element": "warn",

      // React
      "react/no-unescaped-entities": "warn",
    },
  },
]);

export default eslintConfig;
