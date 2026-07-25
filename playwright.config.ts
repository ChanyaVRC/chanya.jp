import { defineConfig, devices } from "@playwright/test";

const port = 5173;
const previewPort = 5174;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `npx vite --host 127.0.0.1 --port ${port}`,
      url: `http://127.0.0.1:${port}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Dev mode injects CSS through the module graph, so keep one built
      // preview running to verify production manifest and hashed asset links.
      command: `npm run preview -- --host 127.0.0.1 --port ${previewPort}`,
      url: `http://127.0.0.1:${previewPort}`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
