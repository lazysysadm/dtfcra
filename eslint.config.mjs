import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  globalIgnores([
    ".next/**",
    "next-env.d.ts",
    "src/server/db/migrations/**",
    "src/server/db/auth-schema.ts",
    "coverage/**",
  ]),
  ...nextCoreWebVitals,
  ...nextTypescript,
]);
