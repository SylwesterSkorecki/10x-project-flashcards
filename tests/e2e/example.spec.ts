import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load homepage successfully", async ({ page }) => {
    await page.goto("/");

    // Check if page title is correct
    await expect(page).toHaveTitle(/10x/);
  });

  test("should have navigation links", async ({ page }) => {
    await page.goto("/");

    // Check if main navigation elements are visible
    const navigation = page.locator("nav");
    await expect(navigation).toBeVisible();
  });

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/");

    // Click on login link/button (adjust selector based on actual implementation)
    const loginLink = page.getByRole("link", { name: /login|sign in/i });
    await loginLink.click();

    // Verify we're on the login page
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("Authentication Flow", () => {
  test("should display login form", async ({ page }) => {
    await page.goto("/auth/login");

    // Check for email and password inputs
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    const submitButton = page.getByRole("button", { name: /login|sign in/i });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test("should show validation errors for empty form", async ({ page }) => {
    await page.goto("/auth/login");

    // Try to submit empty form
    const submitButton = page.getByRole("button", { name: /login|sign in/i });
    await submitButton.click();

    // Wait for validation errors (adjust based on actual implementation)
    const errorMessage = page.getByText(/required|invalid/i).first();
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });
});
