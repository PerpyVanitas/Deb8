import { test, expect } from '@playwright/test';

test.describe('Authentication and Routing', () => {
  test('unauthenticated users are redirected to login', async ({ page }) => {
    // Attempting to visit dashboard without auth
    await page.goto('/dashboard');
    
    // Should be redirected to /auth/login
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });

  test('home page loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check if hero section exists
    await expect(page.getByText(/Debate AI/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Start Debating/i })).toBeVisible();
  });
});
