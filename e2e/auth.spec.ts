import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: Authentication Flow
 *
 * Tests login, logout, session persistence, and token expiry
 */

test.describe('Authentication Flow', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Test@123456');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('/dashboard');
    expect(page.url()).toContain('/dashboard');

    // Verify user is logged in
    const userMenu = page.locator('[data-testid="user-menu"]');
    await expect(userMenu).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill login form with wrong password
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'WrongPassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Should stay on login page
    expect(page.url()).toContain('/login');

    // Should show error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toContainText('Invalid credentials');
  });

  test('should show error for non-existent user', async ({ page }) => {
    await page.goto('/login');

    // Fill login form with non-existent email
    await page.fill('input[name="email"]', 'nonexistent@test.com');
    await page.fill('input[name="password"]', 'Test@123456');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toContainText('User not found');
  });

  test('should logout and redirect to login', async ({ page, context }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Test@123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Logout
    const userMenu = page.locator('[data-testid="user-menu"]');
    await userMenu.click();
    const logoutButton = page.locator('[data-testid="logout-button"]');
    await logoutButton.click();

    // Should redirect to login
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');

    // Token should be cleared from localStorage
    const token = await context.storageState();
    expect(token).not.toHaveProperty('cookies');
  });

  test('should persist session on page reload', async ({ page, context }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Test@123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Store token
    const token = await page.evaluate(() =>
      localStorage.getItem('auth_token'),
    );
    expect(token).toBeTruthy();

    // Reload page
    await page.reload();

    // Should still be on dashboard (session persisted)
    expect(page.url()).toContain('/dashboard');

    // User menu should still be visible
    const userMenu = page.locator('[data-testid="user-menu"]');
    await expect(userMenu).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login');

    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // Should show validation errors
    const emailError = page.locator('[data-testid="email-error"]');
    const passwordError = page.locator('[data-testid="password-error"]');

    await expect(emailError).toContainText('Email is required');
    await expect(passwordError).toContainText('Password is required');
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/login');

    // Fill with invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');

    // Should show validation error
    const emailError = page.locator('[data-testid="email-error"]');
    await expect(emailError).toContainText('Valid email required');
  });

  test('should handle network errors gracefully', async ({
    page,
    context,
  }) => {
    // Simulate network error
    await context.setOffline(true);

    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Test@123456');
    await page.click('button[type="submit"]');

    // Should show network error
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toContainText('Network error');

    // Restore network
    await context.setOffline(false);
  });

  test('should handle slow network', async ({ page }) => {
    // Simulate slow network (4G)
    await page.route('**/*', (route) =>
      setTimeout(() => route.continue(), 1000),
    );

    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Test@123456');

    const submitButton = page.locator('button[type="submit"]');
    expect(submitButton).not.toBeDisabled();

    await page.click('button[type="submit"]');

    // Should show loading state
    expect(submitButton).toBeDisabled();

    // Eventually should redirect
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });
});
