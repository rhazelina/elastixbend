import { defineConfig, devices } from "@playwright/test";

// Firefox and WebKit need system libraries that are not on every dev machine.
// Opt in with E2E_ALL_BROWSERS=1; CI installs the deps and sets it.
const allBrowsers = process.env.E2E_ALL_BROWSERS === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ...(allBrowsers
      ? [
          { name: "firefox", use: { ...devices["Desktop Firefox"] } },
          { name: "webkit", use: { ...devices["Desktop Safari"] } },
        ]
      : []),
  ],
  webServer: {
    command: "npx vite --port 4173 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:4173/edge.html",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
