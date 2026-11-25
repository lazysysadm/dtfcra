import { defineConfig } from "@playwright/test";

// E2E run inside the dtfcra-e2e container against the dev server container.
// Alpine uses the system Chromium via PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://dtfcra-app:3000",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
  },
});
