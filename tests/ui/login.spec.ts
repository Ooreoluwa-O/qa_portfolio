import { test, expect } from '@playwright/test';

/**
 * UI test suite for the login flow.
 * Covers: successful login, invalid credentials, empty-field validation,
 * and logout.
 */

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows an error for empty fields', async ({ page }) => {
    await page.click('button[type="submit"]');
    await expect(page.locator('#message')).toHaveText('Username and password are required');
    await expect(page.locator('#message')).toHaveClass(/error/);
  });

  test('shows an error for invalid credentials', async ({ page }) => {
    await page.fill('#username', 'wrong_user');
    await page.fill('#password', 'wrong_pass');
    await page.click('button[type="submit"]');

    await expect(page.locator('#message')).toHaveText('Invalid username or password');
    await expect(page.locator('#message')).toHaveClass(/error/);
    await expect(page.locator('#dashboard')).toBeHidden();
  });

  test('logs in successfully with valid credentials', async ({ page }) => {
    await page.fill('#username', 'standard_user');
    await page.fill('#password', 'secret_sauce');
    await page.click('button[type="submit"]');

    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page.locator('#welcome-text')).toHaveText('Logged in as standard_user');
    await expect(page.locator('#login-form')).toBeHidden();
  });

  test('logs out and returns to the login form', async ({ page }) => {
    await page.fill('#username', 'standard_user');
    await page.fill('#password', 'secret_sauce');
    await page.click('button[type="submit"]');
    await expect(page.locator('#dashboard')).toBeVisible();

    await page.click('#logout-btn');

    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#dashboard')).toBeHidden();
    await expect(page.locator('#username')).toHaveValue('');
  });
});
