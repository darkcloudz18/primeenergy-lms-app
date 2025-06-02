// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

// Name this export instead of exporting the array inline:
const eslintConfig = [
  // 1) Pull in Next’s default core rules for Web Vitals + TypeScript:
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // 2) Disable the “no-html-link-for-pages” rule under /app/**/*
  {
    files: ["app/**/*.ts", "app/**/*.tsx"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];

export default eslintConfig;
