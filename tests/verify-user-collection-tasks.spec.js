const { test, expect } = require('@playwright/test');
const path = require('path');

const OUT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\9a881d1a-1327-4db3-bf27-204c37f2a959\\.tempmediaStorage';

test('Desktop: 4 columns when filter open, 5 columns when filter collapsed, custom sort dropdown', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:9292/collections/all', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const workspace = page.locator('[data-plp-workspace]');
  const filterBtn = page.locator('[data-plp-filter-toggle]');
  const grid = page.locator('[data-plp-grid]');

  // Ensure filter is open
  let sidebarState = await workspace.getAttribute('data-sidebar');
  if (sidebarState !== 'open') {
    await filterBtn.click();
    await page.waitForTimeout(400);
  }

  // 1. Verify 4 columns when filter is open
  let cols = await grid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns.split(' ').length);
  console.log('Desktop Filter OPEN Columns count:', cols);
  expect(cols).toBe(4);
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop_filter_open_4cols.png'), fullPage: false });

  // 2. Click Filter button to collapse
  await filterBtn.click();
  await page.waitForTimeout(500);

  // Verify 5 columns when filter is collapsed
  cols = await grid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns.split(' ').length);
  console.log('Desktop Filter CLOSED Columns count:', cols);
  expect(cols).toBe(5);
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop_filter_closed_5cols.png'), fullPage: false });

  // 3. Test Custom Sort Dropdown (No native OS select)
  const sortTrigger = page.locator('[data-plp-custom-sort-trigger]');
  const sortMenu = page.locator('[data-plp-custom-sort-menu]');
  await expect(sortMenu).toBeHidden();

  // Click trigger to open custom dropdown
  await sortTrigger.click();
  await page.waitForTimeout(300);
  await expect(sortMenu).toBeVisible();
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop_custom_sort_menu_open.png'), fullPage: false });

  // Select an option, e.g., Alphabetically, A-Z
  const optAZ = page.locator('.wm-plp-custom-sort__option[data-sort-value="title-ascending"]');
  await optAZ.click();
  await page.waitForTimeout(1000);
  await expect(sortMenu).toBeHidden();

  const currentSortText = await page.locator('[data-plp-sort-current]').innerText();
  console.log('Selected sort text:', currentSortText);
  expect(currentSortText).toContain('Alphabetically, A-Z');
});

test('Tablet (820px): Filter Open is 2 columns, Filter Collapsed is 3 columns, subnav scroll padding', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('http://127.0.0.1:9292/collections/all', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const workspace = page.locator('[data-plp-workspace]');
  const filterBtn = page.locator('[data-plp-filter-toggle]');
  const grid = page.locator('[data-plp-grid]');
  const sidebar = page.locator('[data-plp-sidebar]');

  // Ensure filter is open
  let sidebarState = await workspace.getAttribute('data-sidebar');
  if (sidebarState !== 'open') {
    await filterBtn.click();
    await page.waitForTimeout(400);
  }

  // 1. Tablet Filter OPEN -> 2 columns & sidebar visible inline
  let cols = await grid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns.split(' ').length);
  const sidebarVisible = await sidebar.isVisible();
  console.log('Tablet Filter OPEN -> Columns:', cols, 'Sidebar Visible:', sidebarVisible);
  expect(cols).toBe(2);
  expect(sidebarVisible).toBe(true);
  await page.screenshot({ path: path.join(OUT_DIR, 'tablet_filter_open_2cols.png'), fullPage: false });

  // 2. Click Filter button to collapse
  await filterBtn.click();
  await page.waitForTimeout(500);

  // Tablet Filter COLLAPSED -> 3 columns & sidebar hidden
  cols = await grid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns.split(' ').length);
  const sidebarHidden = !(await sidebar.isVisible());
  console.log('Tablet Filter CLOSED -> Columns:', cols, 'Sidebar Hidden:', sidebarHidden);
  expect(cols).toBe(3);
  expect(sidebarHidden).toBe(true);
  await page.screenshot({ path: path.join(OUT_DIR, 'tablet_filter_closed_3cols.png'), fullPage: false });

  // 3. Category subnav padding check
  const subnavMetrics = await page.locator('.wm-plp-subnav__track').evaluate(el => {
    const s = window.getComputedStyle(el);
    return {
      paddingLeft: s.paddingLeft,
      paddingRight: s.paddingRight,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth
    };
  });
  console.log('Tablet Subnav metrics:', subnavMetrics);
  expect(parseInt(subnavMetrics.paddingLeft, 10)).toBeGreaterThanOrEqual(24);
});

test('Mobile (375px): Always 2 columns, smooth subnav padding, bottom sheets', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://127.0.0.1:9292/collections/all', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const grid = page.locator('[data-plp-grid]');
  const cols = await grid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns.split(' ').length);
  console.log('Mobile Grid Columns count:', cols);
  expect(cols).toBe(2);

  // Check subnav padding
  const subnavMetrics = await page.locator('.wm-plp-subnav__track').evaluate(el => {
    const s = window.getComputedStyle(el);
    return {
      paddingLeft: s.paddingLeft,
      paddingRight: s.paddingRight,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth
    };
  });
  console.log('Mobile Subnav metrics:', subnavMetrics);
  expect(parseInt(subnavMetrics.paddingLeft, 10)).toBe(16);

  // Test Mobile Sort Drawer
  const mobileSortTrigger = page.locator('[data-plp-mobile-sort-trigger]');
  const mobileSortDrawer = page.locator('[data-plp-mobile-sort-drawer]');
  await expect(mobileSortDrawer).toBeHidden();

  await mobileSortTrigger.click();
  await page.waitForTimeout(300);
  await expect(mobileSortDrawer).toBeVisible();
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile_sort_drawer_open.png'), fullPage: false });

  // Close mobile sort drawer
  const closeBtn = page.locator('.wm-plp-mobile-sort-drawer__close');
  await closeBtn.click();
  await page.waitForTimeout(300);
  await expect(mobileSortDrawer).toBeHidden();

  await page.screenshot({ path: path.join(OUT_DIR, 'mobile_2cols_final.png'), fullPage: false });
});
