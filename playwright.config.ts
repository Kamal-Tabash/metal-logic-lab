import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 6_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5181",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx vite preview --port 5181 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:5181",
    reuseExistingServer: true,
  },
});
