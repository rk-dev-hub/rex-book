import { defineConfig, devices } from "@playwright/test";

/**
 * E2E は RexCarte（API・DB）と Mailpit を起動し、seed_demo を投入した状態で実行する。
 *   cd ../rex-carte && docker compose --profile app up -d
 *   docker compose exec backend python -m scripts.seed_demo
 * 手順の詳細は README の「E2E テスト」を参照。
 */
const baseURL = process.env.APP_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "tests/e2e",
  // 同じデモデータ・同じ店舗の枠を使うため、テストは 1 本ずつ順に実行する
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  },
  // スマートフォン幅を基準にした設計のため、モバイルの端末で確認する
  projects: [
    // ログイン状態を先に作る（auth.setup.ts）
    { name: "setup", testMatch: /auth\.setup\.ts/, use: { ...devices["Pixel 7"] } },
    {
      name: "mobile-chromium",
      testIgnore: /auth\.setup\.ts/,
      use: { ...devices["Pixel 7"] },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    // Docker で起動済み（http://localhost:3100）ならそれを使う
    reuseExistingServer: true,
    env: {
      REXCARTE_API_URL: process.env.REXCARTE_API_URL ?? "http://localhost:8000",
      SESSION_COOKIE_SECURE: "false",
      APP_URL: baseURL,
    },
  },
});
