// Run after npm run build with npm run preview on port 4173.
// Requires Playwright (or the desktop runtime's packages on NODE_PATH).
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { clickVisible } = require('./layout-interactions.cjs');

const baseURL = process.env.OWNER_HEADER_TEST_URL || 'http://127.0.0.1:4173';
const user = { id: 1, username: 'layout-test', role: 'owner', name: 'Layout Test', email: '', phone: '', avatar: '' };
const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
const modules = ['dashboard', 'users', 'riders', 'merchants', 'rates', 'reports', 'tracking', 'settings', 'security'];

async function measure(page) {
  const bell = page.locator('[data-bell]');
  await bell.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 10000, polling: 100 });
  const box = await bell.boundingBox();
  assert.ok(box);
  assert.equal(await page.locator('[data-bell]').count(), 1, 'one notification button per screen');
  assert.ok(Math.abs(box.width - 40) < 0.1, 'notification button width is 40px');
  assert.ok(Math.abs(box.height - 40) < 0.1, 'notification button height is 40px');
  return box;
}

function samePosition(actual, expected, context) {
  assert.ok(Math.abs(actual.x - expected.x) < 1, `${context}: x ${actual.x} vs ${expected.x}`);
  assert.ok(Math.abs(actual.y - expected.y) < 1, `${context}: y ${actual.y} vs ${expected.y}`);
}

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  try {
    for (const width of [360, 390, 640, 768, 1024, 1440, 1920]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const errors = [];
      const requests = [];
      const page = await context.newPage();
  await page.bringToFront();
  await context.routeWebSocket('**/*', socket => socket.close());
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
          else if (path === '/api/account/permissions') body = { scope: user.role.toUpperCase(), isMainOwner: user.role === 'owner', group: { id: null, name: 'Full access' }, permissions: ['dashboard.view', 'reports.view', 'users.view', 'users.manage', 'tracking.view', 'merchants.manage', 'rates.manage', 'queue.view', 'exceptions.resolve', 'copilot.use'] };
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
        await page.goto(`${baseURL}/owner?module=${module}`, { waitUntil: 'domcontentloaded' });
        const box = await measure(page).catch(async error => {
          console.error({ width, module, url: page.url(), errors, requests, body: (await page.locator('body').innerText()).slice(0, 1400) });
          throw error;
        });
        reference ??= box;
        samePosition(box, reference, `${width}px ${module}`);
        const header = await page.locator('[data-owner-header]').boundingBox();
        assert.ok(box.x + box.width <= width, `${module}: bell stays in viewport`);
        assert.ok(Math.abs(box.x + box.width - header.x - header.width) < 1, `${module}: bell anchors to right edge`);
        await clickVisible(page.locator('[data-bell]'));
        await page.getByRole('dialog', { name: 'Notifications', exact: true }).waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('dialog', { name: 'Notifications', exact: true }).waitFor({ state: 'hidden' });
        samePosition(await measure(page), reference, `${module}: after opening notifications`);

        if (module === 'merchants') {
          for (const tab of ['Location Stores', 'Archive', 'Merchant Categories']) {
            const button = page.getByRole('tab', { name: new RegExp(tab, 'i') });
            await clickVisible(button);
            samePosition(await measure(page), reference, `${width}px merchants ${tab}`);
          }
        }
        if (module === 'users') {
          await clickVisible(page.getByRole('button', { name: 'Add User', exact: true }));
          await clickVisible(page.getByRole('button', { name: 'Cancel', exact: true }));
          samePosition(await measure(page), reference, `${width}px after Add User`);
        }
      }
      // Exercise client navigation through the mobile drawer or desktop sidebar.
      await page.goto(`${baseURL}/owner?module=dashboard`, { waitUntil: 'domcontentloaded' });
      await measure(page);
      if (width < 768) {
        await clickVisible(page.getByRole('button', { name: 'Open navigation', exact: true }));
        await page.waitForFunction(() => Math.abs(document.querySelector('.portal-mobile-drawer').getBoundingClientRect().left) < 1);
      }
      assert.ok(await page.getByRole('button', { name: 'Reports', exact: true }).isVisible(), 'navigation destination is visible');
      await clickVisible(page.getByRole('button', { name: 'Reports', exact: true }));
      await page.waitForURL('**/owner?module=reports');
      samePosition(await measure(page), reference, `${width}px client navigation`);
      assert.deepEqual(errors, [], `${width}px: no uncaught page errors`);
      console.log(`${width}px: all owner modules, merchant tabs, notification popover and navigation passed`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
