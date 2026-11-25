import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 20000,
    coverage: {
      provider: "v8",
      // Pure logic modules only (client hooks / logger / formatters excluded).
      include: [
        "src/lib/holidays/**",
        "src/lib/timesheet/**",
        "src/lib/validation/**",
        "src/lib/uuid.ts",
        "src/lib/utils.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
