import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "**/dist/**",
      "coverage/**",
      "node_modules/**",
      "sample-godot-world/**",
      "plugins/**",
      "vitest.config.ts"
    ]
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
      { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
      ]
    }
  },
  {
    files: ["apps/desktop-organizer/src/public/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  }
);
