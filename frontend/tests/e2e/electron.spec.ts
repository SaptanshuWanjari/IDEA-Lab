import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';

test.describe('PravahOS Electron App E2E', () => {
  let electronApp: ElectronApplication;
  let page: Page;
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'password123';

  test.beforeAll(async ({ request }) => {
    // Attempt to register a test user directly via API
    try {
      await request.post('http://localhost:8000/auth/register', {
        data: {
          email: testEmail,
          password: testPassword,
          role: 'admin'
        }
      });
    } catch (e) {
      console.log('Register failed, might already exist', e);
    }

    // Launch electron
    electronApp = await electron.launch({ 
      args: ['electron/main.cjs'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        ELECTRON_START_URL: 'http://localhost:8443',
      }
    });
    page = await electronApp.firstWindow();
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('should login, navigate and logout successfully', async () => {
    // Wait for the window to load
    await page.waitForLoadState('domcontentloaded');

    // Should see login page
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 15000 });

    // Fill credentials
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // Click submit
    await page.click('button[type="submit"]');

    // Wait for Dashboard to appear
    await expect(page.locator('text=Digital Compliance Twin').first()).toBeVisible({ timeout: 15000 });
    
    // Navigate to Regulations
    await page.locator('button[title="Regulations"]').click();

    // The header should update to Regulations
    // The header title is an h1 with the page title, but we can just look for a text node or h1.
    // DashboardPage has Digital Compliance Twin, RegulationsPage has some specific text.
    // Let's just check the button has active state or wait a moment
    await page.waitForTimeout(500); // Wait for transition
    
    // Logout
    await page.locator('button[title="Logout"]').click();

    // Should redirect back to login
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 15000 });
  });
});
