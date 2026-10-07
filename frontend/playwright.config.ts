import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:5173",
    headless: true,
    viewport: { width: 1536, height: 1024 },
  },
  timeout: 30000,
});
