import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:4321",
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: [
    {
      command: "npm run dev",
      url: "http://localhost:4321",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
  reporter: process.env.CI ? [["junit", { outputFile: "test-results/e2e.xml" }]] : "list",
});
