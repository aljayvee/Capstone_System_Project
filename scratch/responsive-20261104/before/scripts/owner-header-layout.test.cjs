// Run after npm run build with npm run preview on port 4173.
// Requires Playwright (or the desktop runtime's packages on NODE_PATH).
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const baseURL = process.env.OWNER_HEADER_TEST_URL || 'http://127.0.0.1:4173';
const user = { id: 1, username: 'layout-test', role: 'owner', name: 'Layout Test', email: '', phone: '', avatar: '' };
const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
const modules = ['dashboard', 'users', 'riders', 'merchants', 'rates', 'reports', 'tracking', 'security'];

async function measure(page) {
  const bell = page.locator('[data-bell]');
  await bell.waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  const box = await bell.boundingBox();
  assert.ok(box);
  assert.equal(await page.locator('[data-bell]').count(), 1, 'one notification button per screen');
  assert.equal(box.width, 40);
  assert.equal(box.height, 40);
  return box;
}

function samePosition(actual, expected, context) {
  assert.ok(Math.abs(actual.x - expected.x) < 1, `${context}: x ${actual.x} vs ${expected.x}`);
  assert.ok(Math.abs(actual.y - expected.y) < 1, `${context}: y ${actual.y} vs ${expected.y}`);
}

async function run() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [360, 390, 640, 768, 1024, 1440, 1920]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const errors = [];
      const requests = [];
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => requests.push(new URL(request.url()).pathname));
      page.on('requestfailed', request => {
        if (request.url().includes('/auth/refresh')) console.error('Refresh fixture failed:', request.failure());
      });
      await context.addInitScript(({ user }) => {
        sessionStorage.setItem('errand_system_session_user', JSON.stringify(user));
      }, { user });
      // All data is local; no real account, API, Firebase or Maps is contacted.
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        const path = url.pathname;
        if (path.startsWith('/api/')) {
          let body = [];
          let status = 200;
          if (path === '/api/auth/refresh') body = { user, token };
          else if (path === '/api/maintenance/status') body = { isActive: false };
          else if (path === '/api/riders') body = { success: true, riders: [] };
          else if (path === '/api/account/sessions') body = { sessions: [] };
          else if (path.startsWith('/api/analytics/') || path.startsWith('/api/reports/') || path === '/api/rate-config' || path === '/api/auth/firebase-token') {
            status = 503;
            body = { error: 'Layout test: data unavailable' };
          }
          return route.fulfill({ status, json: body, headers: {
            'access-control-allow-origin': baseURL,
            'access-control-allow-credentials': 'true',
            'access-control-allow-headers': route.request().headers()['access-control-request-headers'] || '*',
            'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
            'x-total-count': '0',
          } });
        }
        if (url.origin === baseURL) return route.continue();
        return route.abort();
      });
      let reference;
      for (const module of modules) {
        console.log(`Checking ${width}px ${module}`);
        await page.goto(`${baseURL}/owner?module=${module}`);
        const box = await measure(page).catch(async error => {
          console.error({ width, module, url: page.url(), errors, requests, body: (await page.locator('body').innerText()).slice(0, 1400) });
          throw error;
        });
        reference ??= box;
        samePosition(box, reference, `${width}px ${module}`);
        const header = await page.locator('[data-owner-header]').boundingBox();
        assert.ok(box.x + box.width <= width, `${module}: bell stays in viewport`);
        assert.ok(Math.abs(box.x + box.width - header.x - header.width) < 1, `${module}: bell anchors to right edge`);
        await page.locator('[data-bell]').click();
        await page.getByRole('dialog', { name: 'Notifications', exact: true }).waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('dialog', { name: 'Notifications', exact: true }).waitFor({ state: 'hidden' });
        samePosition(await measure(page), reference, `${module}: after opening notifications`);

        if (module === 'merchants') {
          for (const tab of ['Location Stores', 'Archive', 'Merchant Categories']) {
            const button = page.getByRole('tab', { name: new RegExp(tab, 'i') });
            await button.click();
            samePosition(await measure(page), reference, `${width}px merchants ${tab}`);
          }
        }
        if (module === 'users') {
          await page.getByRole('button', { name: 'Add User', exact: true }).click();
          await page.getByRole('button', { name: 'Cancel', exact: true }).click();
          samePosition(await measure(page), reference, `${width}px after Add User`);
        }
      }
      // Exercise client navigation, including the mobile More menu.
      await page.goto(`${baseURL}/owner?module=dashboard`);
      await measure(page);
      await page.getByRole('button', { name: 'Reports', exact: true }).click();
      await page.waitForURL('**/owner?module=reports');
      samePosition(await measure(page), reference, `${width}px client navigation`);
      assert.deepEqual(errors, [], `${width}px: no uncaught page errors`);
      console.log(`${width}px: all eight owner modules, merchant tabs, notification popover and navigation passed`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
