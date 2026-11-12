const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createPage, fits, drawer } = require('../../../scripts/portal-responsive-layout.test.cjs');
const { clickVisible } = require('../../../scripts/layout-interactions.cjs');
(async () => {
 const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
 const results = [];
 try {
  for (const role of ['dispatcher', 'owner']) {
   const { context, page, errors } = await createPage(browser, role, { width: 390, height: 844 });
   try {
    await page.goto(`https://portal.sugo-express.org/${role}?${role === 'owner' ? 'module=users' : 'tab=queue'}`, { waitUntil: 'domcontentloaded' });
    await fits(page, `public ${role}`);
    await drawer(page, role, 390);
    await page.setViewportSize({ width: 390, height: 844 });
    await fits(page, `public ${role} after resize`);
    await page.screenshot({ path: path.join(__dirname, `live-${role}-390.png`), animations: 'disabled' });
    await clickVisible(page.locator('[data-bell]'));
    await page.getByRole('dialog', { name: 'Notifications', exact: true }).waitFor();
    assert.deepEqual(errors, [], `${role}: no uncaught browser errors`);
    results.push({ role, viewport: '390x844', liveAssets: true, privateApi: 'isolated fixtures; no production API or websocket traffic', layout: 'passed', drawer: 'passed', focusAndResize: 'passed', notifications: 'passed', uncaughtErrors: errors });
    console.log(`${role}: public assets render at 390px; drawer, focus, resizing and notifications passed.`);
   } finally { await context.close(); }
  }
 } finally { await browser.close(); }
 fs.writeFileSync(path.join(__dirname, 'browser-verification.json'), JSON.stringify(results, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
