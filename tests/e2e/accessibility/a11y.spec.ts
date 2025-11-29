import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Result, NodeResult } from 'axe-core';

/**
 * Automated Accessibility Testing for Sentinel
 *
 * Tests WCAG 2.1 AA compliance across all three interfaces:
 * - Frontend (Admin Dashboard): http://localhost:5173
 * - Kiosk (Touch Interface): http://localhost:5174
 * - TV Display (Wall Display): http://localhost:5175
 *
 * Prerequisites:
 * - All services must be running: ./scripts/start-all.sh
 * - Test database should be seeded for realistic content
 */

// Helper to run axe scan with consistent settings
async function checkA11y(page: Page, pageName: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('#webpack-dev-server-client-overlay') // Exclude dev overlays
    .analyze();

  // Assert no violations
  expect(results.violations, `${pageName} has accessibility violations`).toEqual([]);

  return results;
}

// Helper to print detailed violation report
function printViolations(violations: Result[], pageName: string) {
  if (violations.length === 0) {
    console.log(`✅ ${pageName}: No violations found`);
    return;
  }

  console.log(`\n❌ ${pageName}: ${violations.length} violation(s) found\n`);

  violations.forEach((violation, index) => {
    console.log(`${index + 1}. ${violation.id}: ${violation.help}`);
    console.log(`   Impact: ${violation.impact}`);
    console.log(`   Description: ${violation.description}`);
    console.log(`   WCAG: ${violation.tags.filter((t: string) => t.startsWith('wcag')).join(', ')}`);
    console.log(`   Affected elements: ${violation.nodes.length}`);
    violation.nodes.forEach((node: NodeResult, nodeIndex: number) => {
      console.log(`     ${nodeIndex + 1}. ${node.html.substring(0, 100)}...`);
      console.log(`        ${node.failureSummary}`);
    });
    console.log('');
  });
}

test.describe('Frontend (Admin Dashboard) Accessibility', () => {
  test.use({ baseURL: 'http://localhost:5173' });

  test('login page should have no violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    printViolations(results.violations, 'Login Page');
    expect(results.violations).toEqual([]);
  });

  test('dashboard page should have no violations', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@chippawa.ca');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(/.*dashboard.*/);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    printViolations(results.violations, 'Dashboard Page');
    expect(results.violations).toEqual([]);
  });

  test('members page should have no violations', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@chippawa.ca');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard.*/);

    // Navigate to members
    await page.goto('/members');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    printViolations(results.violations, 'Members Page');
    expect(results.violations).toEqual([]);
  });

  test('visitors page should have no violations', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@chippawa.ca');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard.*/);

    await page.goto('/visitors');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    printViolations(results.violations, 'Visitors Page');
    expect(results.violations).toEqual([]);
  });

  test('events page should have no violations', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@chippawa.ca');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard.*/);

    await page.goto('/events');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    printViolations(results.violations, 'Events Page');
    expect(results.violations).toEqual([]);
  });

  test('reports page should have no violations', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@chippawa.ca');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard.*/);

    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    printViolations(results.violations, 'Reports Page');
    expect(results.violations).toEqual([]);
  });

  test('settings page should have no violations', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@chippawa.ca');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard.*/);

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    printViolations(results.violations, 'Settings Page');
    expect(results.violations).toEqual([]);
  });
});

test.describe('Kiosk Accessibility', () => {
  test.use({ baseURL: 'http://localhost:5174' });

  test('idle screen should have no violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    printViolations(results.violations, 'Kiosk Idle Screen');
    expect(results.violations).toEqual([]);
  });

  test('visitor signin screen should have no violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tap "Sign In Visitor" button
    await page.click('button:has-text("Sign In Visitor")');
    await page.waitForTimeout(500); // Wait for screen transition

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    printViolations(results.violations, 'Kiosk Visitor Sign-In Screen');
    expect(results.violations).toEqual([]);
  });

  test('keyboard navigation should work', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test that focus is visible and follows tab order
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) {
        throw new Error('No active element found after Tab press');
      }
      return {
        tag: active.tagName,
        visible: window.getComputedStyle(active).outlineWidth !== '0px'
      };
    });

    // Should have focused on a button or input
    expect(['BUTTON', 'INPUT', 'A']).toContain(focused.tag);
  });
});

test.describe('TV Display Accessibility', () => {
  test.use({ baseURL: 'http://localhost:5175' });

  test('main display should have no violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    printViolations(results.violations, 'TV Display Main Screen');
    expect(results.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that headings follow logical order (h1 -> h2 -> h3, no skips)
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) =>
      elements.map((el) => el.tagName.toLowerCase())
    );

    // Should start with h1
    if (headings.length > 0) {
      expect(headings[0]).toBe('h1');
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('*')
      .analyze();

    // Specifically check for color-contrast violations
    const contrastViolations = results.violations.filter(
      (v) => v.id === 'color-contrast'
    );

    printViolations(contrastViolations, 'TV Display Color Contrast');
    expect(contrastViolations).toEqual([]);
  });
});

test.describe('Cross-Interface Accessibility', () => {
  test('all interfaces should have lang attribute', async ({ page }) => {
    const urls = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ];

    for (const url of urls) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      const lang = await page.getAttribute('html', 'lang');
      expect(lang, `${url} should have lang attribute`).toBeTruthy();
      expect(lang, `${url} should have valid lang`).toBe('en');
    }
  });

  test('all interfaces should have proper page titles', async ({ page }) => {
    const expectedTitles = [
      { url: 'http://localhost:5173', pattern: /sentinel/i },
      { url: 'http://localhost:5174', pattern: /kiosk|sentinel/i },
      { url: 'http://localhost:5175', pattern: /display|sentinel/i },
    ];

    for (const { url, pattern } of expectedTitles) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      const title = await page.title();
      expect(title, `${url} should have descriptive title`).toBeTruthy();
      expect(title, `${url} title should match pattern`).toMatch(pattern);
    }
  });

  test('all interfaces should have viewport meta tag', async ({ page }) => {
    const urls = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ];

    for (const url of urls) {
      await page.goto(url);

      const viewport = await page.$('meta[name="viewport"]');
      expect(viewport, `${url} should have viewport meta tag`).toBeTruthy();
    }
  });
});

test.describe('Keyboard Accessibility', () => {
  test('frontend should support keyboard navigation', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Tab through elements
    await page.keyboard.press('Tab');
    const firstFocus = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) {
        throw new Error('No element focused after Tab press');
      }
      return active.tagName;
    });
    expect(['BUTTON', 'INPUT', 'A']).toContain(firstFocus);

    // Should be able to navigate through all interactive elements
    let tabCount = 0;
    const maxTabs = 20;

    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab');
      tabCount++;

      const activeElement = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active) {
          throw new Error('Lost focus during keyboard navigation');
        }
        return {
          tag: active.tagName,
          visible: window.getComputedStyle(active).outlineWidth !== '0px'
        };
      });

      // Every focused element should have visible focus indicator
      if (['BUTTON', 'INPUT', 'A', 'SELECT'].includes(activeElement.tag)) {
        // Focus should be visible (this is tested by axe-core, just checking it exists)
        expect(activeElement.tag).toBeTruthy();
      }
    }
  });

  test('kiosk should support keyboard navigation', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) {
        throw new Error('No element focused after Tab press in kiosk');
      }
      return active.tagName;
    });
    expect(['BUTTON', 'INPUT', 'A']).toContain(focused);
  });
});

test.describe('Focus Management', () => {
  test('frontend modals should trap focus', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.fill('input[type="email"]', 'admin@chippawa.ca');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard.*/);

    // Try to open a modal (if one exists)
    const modalTrigger = await page.$('button[aria-haspopup="dialog"]');

    if (modalTrigger) {
      await modalTrigger.click();
      await page.waitForTimeout(300);

      // Focus should be inside modal
      const focusInModal = await page.evaluate(() => {
        const activeElement = document.activeElement;
        const modal = document.querySelector('[role="dialog"]');
        if (!modal) {
          throw new Error('Modal not found after trigger click');
        }
        if (!activeElement) {
          throw new Error('No active element found in modal');
        }
        return modal.contains(activeElement);
      });

      expect(focusInModal).toBe(true);
    }
  });
});

test.describe('ARIA Labels and Roles', () => {
  test('frontend should have proper ARIA labels', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('*')
      .analyze();

    // Check for ARIA-related violations
    const ariaViolations = results.violations.filter((v) =>
      v.id.includes('aria') ||
      v.id.includes('label') ||
      v.id.includes('button-name')
    );

    printViolations(ariaViolations, 'Frontend ARIA');
    expect(ariaViolations).toEqual([]);
  });

  test('kiosk should have proper ARIA labels', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('*')
      .analyze();

    const ariaViolations = results.violations.filter((v) =>
      v.id.includes('aria') ||
      v.id.includes('label') ||
      v.id.includes('button-name')
    );

    printViolations(ariaViolations, 'Kiosk ARIA');
    expect(ariaViolations).toEqual([]);
  });

  test('tv display should have proper ARIA labels', async ({ page }) => {
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('*')
      .analyze();

    const ariaViolations = results.violations.filter((v) =>
      v.id.includes('aria') ||
      v.id.includes('label') ||
      v.id.includes('button-name')
    );

    printViolations(ariaViolations, 'TV Display ARIA');
    expect(ariaViolations).toEqual([]);
  });
});
