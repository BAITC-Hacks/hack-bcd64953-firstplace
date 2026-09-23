import { defineConfig } from "@playwright/test";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(
  process.cwd(),
  ".cache",
  "ms-playwright",
);
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "node tests/fixtures/server.mjs",
      url: "http://localhost:8011/__health",
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: "node node_modules/next/dist/bin/next dev --port 3100",
      url: "http://localhost:3100",
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:8011/api/v1",
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:8011",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "contract-fixture-anon-key",
        NEXT_PUBLIC_DEMO_MODE: "false",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
});
