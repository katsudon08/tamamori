import { loadEnvConfig } from '@next/env';
import { defineConfig, devices } from '@playwright/test';

loadEnvConfig(process.cwd());

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
// 外部 URL (ngrok 等) を使うときは playwright が dev server を起動しないようにする。
// ユーザーが手動で `npm run dev` + `ngrok http 3000` を立てる前提。
const isExternalBaseURL = !!process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL,
        trace: 'on-first-retry',
        // ngrok-free は Mozilla UA に interstitial を返すため、ヘッダで bypass する。
        // localhost 実行時は不要なので外部 URL のときだけ付与。
        extraHTTPHeaders: isExternalBaseURL ? { 'ngrok-skip-browser-warning': 'true' } : undefined,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: isExternalBaseURL
        ? undefined
        : {
              command: 'npm run dev',
              url: 'http://localhost:3000',
              reuseExistingServer: !process.env.CI,
          },
});
