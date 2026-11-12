// Run against npm run preview after npm run build. Requires Playwright on NODE_PATH.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { clickVisible } = require('./layout-interactions.cjs');
const baseURL = process.env.DISPATCHER_HEADER_TEST_URL || 'http://127.0.0.1:4173';
const tabs = ['dashboard', 'queue', 'active_errands', 'exceptions', 'riders', 'messages', 'recent_chats', 'history', 'profile'];
const user = { id: 17, username: 'header-test', role: 'dispatcher', name: 'LongDispatcherNameForHeaderLayoutVerification Test', email: '', phone: '', avatar: '' };
const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
const notification = { id: 9001, type: 'RIDER_CHAT_MESSAGE', title: 'Layout test rider message', body: 'Open rider conversation', isRead: false, createdAt: new Date().toISOString(), priority: 'NORMAL', refKey: 'rider:7' };
const exceptionRows = Array.from({ length: 45 }, (_, index) => ({
  errandId: `test-errand-${String(index + 1).padStart(4, '0')}`, kind: 'CASH_VARIANCE', amountAtRisk: 100,
  detail: 'Local test cash discrepancy', riderId: index + 1, riderName: `Test Rider ${String(index + 1).padStart(2, '0')}`,
  occurredAt: new Date(Date.now() - index * 60000).toISOString(), resolvedAt: null, resolvedBy: null, resolutionReason: null,
}));

async function measure(page) {
  const bell = page.locator('[data-bell]');
  await bell.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 10000, polling: 100 });
  const box = await bell.boundingBox();
  assert.equal(await bell.count(), 1, 'one notification button per screen');
  assert.ok(Math.abs(box.width - 40) < 0.1, 'notification button width is 40px');
  assert.ok(Math.abs(box.height - 40) < 0.1, 'notification button height is 40px');
  const toolbar = await page.locator('[data-dispatcher-header-actions]').boundingBox();
  assert.ok(Math.abs(box.x + box.width - toolbar.x - toolbar.width) < 1, 'bell anchors to toolbar right edge');
  assert.ok(box.x >= 0 && box.x + box.width <= page.viewportSize().width, 'bell remains in viewport');
  const title = await page.locator('[data-dispatcher-page-header] h1').boundingBox();
  assert.ok(Math.abs(title.y + title.height / 2 - box.y - box.height / 2) < 1, 'screen title and notification button share the same vertical center');
  assert.ok(title.x + title.width <= box.x, 'title does not overlap notification controls');
  return box;
}

function samePosition(actual, expected, label) {
  assert.ok(Math.abs(actual.x - expected.x) < 1, `${label}: x ${actual.x} vs ${expected.x}`);
  assert.ok(Math.abs(actual.y - expected.y) < 1, `${label}: y ${actual.y} vs ${expected.y}`);
}

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  try {
    for (const width of [320, 360, 390, 640, 768, 1024, 1440, 1920]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
  await page.bringToFront();
  await context.routeWebSocket('**/*', socket => socket.close());
      page.setDefaultTimeout(15000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      let delayQueue = false;
      let failErrands = false;
      let read = false;
      let releaseQueue;
      const queueGate = new Promise(resolve => { releaseQueue = resolve; });
      await context.addInitScript(({ user, baseURL }) => {
        if (window.location.origin === baseURL) sessionStorage.setItem('errand_system_session_user', JSON.stringify(user));
      }, { user, baseURL });
      // Local fixtures only; external API, sockets, Firebase and Maps never receive traffic.
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        const path = url.pathname;
        if (path.startsWith('/api/')) {
          let body;
          let status = 200;
          if (path === '/api/auth/refresh') body = { user, token };
          else if (path === '/api/account/permissions') body = { scope: user.role.toUpperCase(), isMainOwner: user.role === 'owner', group: { id: null, name: 'Full access' }, permissions: ['dashboard.view', 'reports.view', 'users.view', 'users.manage', 'tracking.view', 'merchants.manage', 'rates.manage', 'queue.view', 'exceptions.resolve', 'copilot.use'] };
          else if (path === '/api/maintenance/status') body = { isActive: false };
          else if (path === '/api/riders') body = { success: true, riders: [] };
          else if (path === '/api/errands' && !failErrands) body = [];
          else if (path === '/api/errands/exceptions') body = { exceptions: exceptionRows, summary: { openCount: 45, resolvedCount: 0, totalAtRisk: 4500, byKind: [] }, riders: [], materialityPesos: 0 };
          else if (path === '/api/notifications') body = url.searchParams.get('unread') && read ? [] : [{ ...notification, isRead: read }];
          else if (path === '/api/notifications/9001/read') { read = true; body = { ...notification, isRead: true }; }
          else if (path === '/api/account/sessions') body = { sessions: [] };
          else if (path.startsWith('/api/account/')) body = { logs: [] };
          else { status = 503; body = { error: 'Local layout test: service unavailable' }; }
          return route.fulfill({ status, json: body, headers: {
            'access-control-allow-origin': baseURL,
            'access-control-allow-credentials': 'true',
            'access-control-allow-headers': route.request().headers()['access-control-request-headers'] || '*',
            'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
            'access-control-expose-headers': 'x-total-count',
            'x-total-count': String(Array.isArray(body) ? body.length : 0),
          } });
        }
        if (url.origin !== baseURL) return route.abort();
        if (delayQueue && /\/assets\/DispatchManagementWorkspace-[^/]+\.js$/.test(path)) await queueGate;
        return route.continue();
      });
      try {
        let reference;
        for (const tab of tabs) {
          await page.goto(`${baseURL}/dispatcher?tab=${tab}`, { waitUntil: 'domcontentloaded' });
          const box = await measure(page);
          await page.getByText('Loading workspace...', { exact: true }).waitFor({ state: 'hidden' });
          const titleText = await page.locator('[data-dispatcher-page-header] h1').textContent();
          assert.equal(await page.getByRole('heading', { name: titleText, exact: true }).count(), 1, 'screen title is not duplicated inside the workspace');
          reference ??= box;
          samePosition(box, reference, `${width}px ${tab}`);
          if (['exceptions', 'active_errands', 'recent_chats', 'riders', 'history'].includes(tab)) {
            const filters = page.locator('[data-dispatcher-filter-toolbar]');
            assert.equal(await filters.count(), 1, `${tab}: one list toolbar`);
            assert.equal(await page.locator('main [data-on-field]').count(), 0, `${tab}: redundant blue header count removed`);
            const search = filters.getByRole('textbox');
            const searchBox = await search.boundingBox();
            assert.ok(searchBox.x >= 0 && searchBox.x + searchBox.width <= width, `${tab}: search fits viewport`);
            assert.ok(searchBox.width >= 200, `${tab}: search remains usable`);
            const sort = filters.getByRole('combobox');
            if (await sort.count()) {
              if (width >= 768) {
                const sortBox = await sort.boundingBox();
                assert.ok(searchBox.x + searchBox.width < sortBox.x, `${tab}: search is left of Sort`);
                assert.ok(Math.abs(searchBox.y + searchBox.height / 2 - sortBox.y - sortBox.height / 2) < 1, `${tab}: search and Sort align`);
              }
              const options = await sort.locator('option').evaluateAll(nodes => nodes.map(node => node.value));
              await sort.selectOption(options[1]);
              assert.equal(await sort.inputValue(), options[1], `${tab}: sorting still changes`);
            }
            await search.fill(tab === 'exceptions' ? 'Test Rider 45' : 'layout query');
            assert.equal(await search.inputValue(), tab === 'exceptions' ? 'Test Rider 45' : 'layout query');
            if (tab === 'exceptions') await page.getByText('1 of 45 shown', { exact: true }).waitFor();
            await search.fill('');
            if (tab === 'exceptions') {
              await page.getByTestId('helpdesk-view-open').filter({ hasText: '45' }).waitFor();
              await clickVisible(page.getByRole('button', { name: 'Refresh the queue', exact: true }));
              if (width === 390 || width === 1440) await page.screenshot({ path: `scratch/dispatcher-search-toolbar-${width}.png` });
            }
          }
          await clickVisible(page.locator('[data-bell]'));
          const dialog = page.getByRole('dialog', { name: 'Notifications', exact: true });
          await dialog.waitFor();
          await dialog.getByText(notification.title, { exact: true }).waitFor();
          const dialogBox = await dialog.boundingBox();
          assert.ok(dialogBox.x >= 0 && dialogBox.x + dialogBox.width <= width, 'notification panel fits viewport');
          await page.keyboard.press('Escape');
          await dialog.waitFor({ state: 'hidden' });
          samePosition(await measure(page), reference, `${tab} after notifications`);
        }
        console.log(`${width}px: all nine direct tabs and notification panels passed`);

        delayQueue = true;
        await page.goto(`${baseURL}/dispatcher?tab=dashboard`, { waitUntil: 'domcontentloaded' });
        await measure(page);
        const persistentBell = await page.locator('[data-bell]').elementHandle();
        if (width < 768) {
        await clickVisible(page.getByRole('button', { name: 'Open navigation', exact: true }));
        await page.waitForFunction(() => Math.abs(document.querySelector('.portal-mobile-drawer').getBoundingClientRect().left) < 1);
      }
        assert.ok(await page.getByRole('button', { name: 'Dispatch Management', exact: true }).isVisible(), 'navigation destination is visible');
      await clickVisible(page.getByRole('button', { name: 'Dispatch Management', exact: true }));
        await page.getByText('Loading workspace...', { exact: true }).waitFor();
        samePosition(await measure(page), reference, 'while next workspace chunk is loading');
        assert.ok(await persistentBell.evaluate(el => el.isConnected), 'same bell stays mounted during navigation');
        await page.evaluate(() => window.addEventListener('sugo:open-rider-chat', event => { window.__testRiderLink = event.detail.riderId; }));
        await clickVisible(page.locator('[data-bell]'));
        await clickVisible(page.getByRole('dialog', { name: 'Notifications', exact: true }).getByText(notification.title, { exact: true }));
        releaseQueue();
        await page.waitForURL(/tab=messages/);
        assert.equal(await page.evaluate(() => window.__testRiderLink), '7');
        assert.ok(await persistentBell.evaluate(el => el.isConnected), 'notification click retains shared bell');
        samePosition(await measure(page), reference, 'after notification opens Rider Messages');
        await page.waitForFunction(() => document.querySelector('[data-bell]')?.getAttribute('aria-label') === 'Notifications, none unread');

        failErrands = true;
        await page.goto(`${baseURL}/dispatcher?tab=queue`, { waitUntil: 'domcontentloaded' });
        await page.getByText('The board did not load', { exact: true }).waitFor();
        samePosition(await measure(page), reference, 'when errands API fails');
        assert.deepEqual(errors, [], `${width}px: no uncaught page errors`);
        if (width === 390 || width === 1440) await page.screenshot({ path: `scratch/dispatcher-notification-header-${width}.png` });
        console.log(`${width}px: persistent bell, delayed navigation, unread update, rider link and error state passed`);
      } catch (error) {
        console.error({ width, url: page.url(), errors, body: (await page.locator('body').innerText()).slice(0, 1200) });
        throw error;
      } finally {
        releaseQueue();
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
