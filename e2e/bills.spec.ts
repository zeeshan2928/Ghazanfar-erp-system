import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: Bill Management
 *
 * Tests complete bill lifecycle: create, edit, status changes, and export
 */

test.describe('Bill Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'manager@test.com');
    await page.fill('input[name="password"]', 'Test@123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should navigate to bills page', async ({ page }) => {
    await page.click('a[href="/bills"]');
    await page.waitForURL('/bills');

    expect(page.url()).toContain('/bills');

    // Should show bills list
    const billsTable = page.locator('[data-testid="bills-table"]');
    await expect(billsTable).toBeVisible();

    // Should show create button
    const createButton = page.locator('button:has-text("Create Bill")');
    await expect(createButton).toBeVisible();
  });

  test('should create new bill with form validation', async ({ page }) => {
    await page.click('a[href="/bills"]');
    await page.waitForURL('/bills');

    // Click create button
    await page.click('button:has-text("Create Bill")');

    // Should open modal/form
    const billForm = page.locator('[data-testid="bill-form"]');
    await expect(billForm).toBeVisible();

    // Try to submit empty form
    await page.click('button:has-text("Save")');

    // Should show validation errors
    const customerError = page.locator('[data-testid="customer-error"]');
    await expect(customerError).toContainText('Customer is required');
  });

  test('should create bill with valid data', async ({ page }) => {
    await page.click('a[href="/bills"]');
    await page.waitForURL('/bills');

    // Click create button
    await page.click('button:has-text("Create Bill")');

    // Fill form
    await page.click('input[name="customerId"]');
    await page.click('text=Test Customer');

    await page.fill('select[name="channel"]', 'WALK_IN');
    await page.fill('select[name="paymentMethod"]', 'CASH');

    // Add line items
    await page.click('button:has-text("Add Item")');
    await page.click('input[name="lines[0].productId"]');
    await page.click('text=Test Product');

    await page.fill('input[name="lines[0].quantity"]', '5');
    await page.fill('input[name="lines[0].unitPrice"]', '1000');

    // Save
    await page.click('button:has-text("Save")');

    // Should show success message
    const successMessage = page.locator('[data-testid="success-message"]');
    await expect(successMessage).toContainText('Bill created successfully');

    // Should redirect to bills list
    await page.waitForURL('/bills');
  });

  test('should edit bill in DRAFT status', async ({ page }) => {
    await page.click('a[href="/bills"]');
    await page.waitForURL('/bills');

    // Find a DRAFT bill
    const draftBillRow = page.locator(
      'tr:has-text("DRAFT") >> [data-testid="edit-button"]',
    ).first();
    await draftBillRow.click();

    // Should open bill details
    const billDetails = page.locator('[data-testid="bill-details"]');
    await expect(billDetails).toBeVisible();

    // Edit bill
    const editButton = page.locator('button:has-text("Edit")');
    await editButton.click();

    // Modify bill
    await page.fill('input[name="remarks"]', 'Updated remarks');

    // Save changes
    await page.click('button:has-text("Save")');

    // Should show success
    const successMessage = page.locator('[data-testid="success-message"]');
    await expect(successMessage).toContainText('Bill updated');
  });

  test('should prevent editing finalized bills', async ({ page }) => {
    await page.click('a[href="/bills"]');
    await page.waitForURL('/bills');

    // Find a FINALIZED bill
    const finalizedBillRow = page.locator(
      'tr:has-text("FINALIZED") >> [data-testid="edit-button"]',
    ).first();

    if (await finalizedBillRow.isVisible()) {
      await finalizedBillRow.click();

      // Edit button should be disabled
      const editButton = page.locator('button:has-text("Edit")');
      await expect(editButton).toBeDisabled();
    }
  });

  test('should change bill status from DRAFT to FINALIZED', async ({
    page,
  }) => {
    await page.click('a[href="/bills"]');
    await page.waitForURL('/bills');

    // Find a DRAFT bill
    const draftBillRow = page.locator(
      'tr:has-text("DRAFT") >> [data-testid="status-button"]',
    ).first();
    await draftBillRow.click();

    // Should show status menu
    await page.click('text=Finalize');

    // Should show confirmation dialog
    const confirmButton = page.locator('button:has-text("Confirm")');
    await confirmButton.click();

    // Status should update
    const successMessage = page.locator('[data-testid="success-message"]');
    await expect(successMessage).toContainText('Status updated');
  });

  test('should change bill status from FINALIZED to PAID', async ({
    page,
  }) => {
    await page.click('a[href="/bills"]');
    await page.waitForURL('/bills');

    // Find a FINALIZED bill
    const finalizedBillRow = page.locator(
      'tr:has-text("FINALIZED") >> [data-testid="status-button"]',
    ).first();

    if (await finalizedBillRow.isVisible()) {
      await finalizedBillRow.click();
      await page.click('text=Mark as Paid');

      // Confirm
      const confirmButton = page.locator('button:has-text("Confirm")');
      await confirmButton.click();

      // Status should update
      const successMessage = page.locator('[data-testid="success-message"]');
      await expect(successMessage).toContainText('Marked as paid');
    }
  });

  test('should export bill as PDF', async ({ page }) => {
    await page.click('a[href="/bills"]');
    await page.waitForURL('/bills');

    // Find a bill
    const billRow = page.locator('[data-testid="bills-table"] tr').first();
    await billRow.click();

    // Should show bill details
    const billDetails = page.locator('[data-testid="bill-details"]');
    await expect(billDetails).toBeVisible();

    // Click export button
    const exportButton = page.locator('button:has-text("Export PDF")');
    await expect(exportButton).toBeVisible();

    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();

    const download = await downloadPromise;

    // Should download PDF file
    expect(download.suggestedFilename()).toContain('bill');
  });

  test('should delete bill with confirmation', async ({ page }) => {
    await page.click('a[href="/bills"]');
    await page.waitForURL('/bills');

    // Find a DRAFT bill
    const draftBillRow = page.locator(
      'tr:has-text("DRAFT") >> [data-testid="delete-button"]',
    ).first();

    if (await draftBillRow.isVisible()) {
      // Get bill number for verification
      const billNumber = await page.locator('td').first().textContent();

      await draftBillRow.click();

      // Should show confirmation dialog
      const confirmButton = page.locator('button:has-text("Delete")');
      await confirmButton.click();

      // Should show success message
      const successMessage = page.locator('[data-testid="success-message"]');
      await expect(successMessage).toContainText('Bill deleted');

      // Bill should no longer be visible
      const billRowAfter = page.locator(`text=${billNumber}`);
      await expect(billRowAfter).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should filter bills by status', async ({ page }) => {
    await page.click('a[href="/bills"]');
    await page.waitForURL('/bills');

    // Click status filter
    await page.click('[data-testid="status-filter"]');

    // Select PAID status
    await page.click('text=PAID');

    // Table should only show PAID bills
    const table = page.locator('[data-testid="bills-table"]');
    const rows = table.locator('tr');

    for (const row of await rows.all()) {
      const statusText = await row.locator('td:nth-child(5)').textContent();
      expect(statusText).toContain('PAID');
    }
  });

  test('should search bills by bill number', async ({ page }) => {
    await page.click('a[href="/bills"]');
    await page.waitForURL('/bills');

    // Enter search term
    await page.fill('input[placeholder="Search bills..."]', 'BILL-2024');

    // Should filter results
    const table = page.locator('[data-testid="bills-table"]');
    const rows = table.locator('tr');

    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // All visible bills should contain search term
    for (const row of await rows.all()) {
      const billNumberText = await row.locator('td:nth-child(2)').textContent();
      expect(billNumberText).toContain('BILL-2024');
    }
  });

  test('should paginate through bills', async ({ page }) => {
    await page.click('a[href="/bills"]');
    await page.waitForURL('/bills');

    // Change page size
    const pageSize = page.locator('select[name="pageSize"]');
    await pageSize.selectOption('25');

    // Verify pagination info
    const paginationInfo = page.locator('[data-testid="pagination-info"]');
    await expect(paginationInfo).toContainText('Page 1');

    // Go to next page if available
    const nextButton = page.locator('button:has-text("Next")');
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await expect(paginationInfo).toContainText('Page 2');
    }
  });
});
