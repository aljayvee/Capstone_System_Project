// Run against npm run preview. Playwright may be supplied through NODE_PATH.
// API, Firebase, Maps and WebSocket traffic is intercepted; fixtures never write to real accounts.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { clickVisible } = require('./layout-interactions.cjs');
const baseURL = process.env.PORTAL_LAYOUT_TEST_URL || 'http://127.0.0.1:4173';
const widths = (process.env.PORTAL_LAYOUT_WIDTHS || '320,360,390,640,767,768,1023,1024,1440').split(',').map(Number);
const permissions = ['dashboard.view','reports.view','users.view','users.manage','tracking.view','merchants.manage','rates.manage','queue.view','exceptions.resolve','copilot.use'];
const dispatcherTabs = ['dashboard','queue','active_errands','exceptions','riders','messages','recent_chats','history','profile'];
const ownerModules = ['dashboard','users','riders','merchants','rates','reports','tracking','settings'];
const name = 'Long operational account name for mobile layout verification';
const rider = { id: 7, name, phone: '09000000000', avatar: null, status: 'Active', activeOrdersCount: 1, online: true, availability: 'BUSY', presumed: false, impediments: [], riderStatus: 'ON_DELIVERY' };
const users = Array.from({ length: 16 }, (_, i) => ({ id: i + 2, username: `layout${i}`, role: i % 2 ? 'dispatcher' : 'rider', name: `${name} ${i}`, firstName: 'Layout', lastName: `Tester${i}`, email: `layout${i}@example.invalid`, phone: '09000000000', status: 'Active', version: 1, accessGroup: null }));
const errands = Array.from({ length: 14 }, (_, i) => ({ id: `layout-errand-${i}`, reference: `ER-20261104-${i}`, customerId: 50, customer: { name, phone: '09000000000' }, category: 'Grocery', description: 'Long shopping instructions and a complete address for layout testing', pickupAddress: 'A very long store name and street address in Tacurong City', deliveryAddress: 'A very long customer destination in Tacurong City', estimatedCost: 1000, deliveryFee: 70, totalCost: 1070, tip: 0, status: i % 2 ? 'ASSIGNED' : 'AVAILABLE', riderId: 7, rider, pinpoints: [], pabiliDetails: [], pabiliItemRequests: [], dispatchLogs: i % 2 ? [{ dispatcherId: 17 }] : [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
async function createPage(browser, role, viewport, options = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.bringToFront();
  await context.routeWebSocket('**/*', socket => socket.close());
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const user = { id: role === 'owner' ? 1 : 17, username: 'layout', role, name, email: 'layout@example.invalid', phone: '', avatar: '' };
  const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url')}.test`;
  await context.addInitScript(({ user, dark }) => {
    sessionStorage.setItem('errand_system_session_user', JSON.stringify(user));
    if (dark) localStorage.setItem(`sugo:owner-appearance:v1:${user.id}`, JSON.stringify({ v: 1, theme: 'dark', fontScale: 1.25, sidebarColor: '#17352B', accentColor: null }));
  }, { user, dark: options.dark });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.startsWith('/api/')) {
      let body = [], status = 200;
      if (route.request().method() === 'OPTIONS') body = {};
      else if (path === '/api/auth/refresh') body = { user, token };
      else if (path === '/api/account/permissions') body = { scope: role.toUpperCase(), isMainOwner: role === 'owner', group: { id: null, name: 'Full access' }, permissions: options.restricted ? (role === 'owner' ? ['users.view'] : ['queue.view']) : permissions };
      else if (path === '/api/access/catalog') body = { fullAccessName: 'Full access', scopes: [{ scope: 'OWNER', label: 'Admin' }, { scope: 'DISPATCHER', label: 'Dispatcher' }], permissions: [] };
      else if (path === '/api/access/groups') body = { groups: [] };
      else if (path === '/api/access/accounts') body = { accounts: [] };
      else if (path === '/api/maintenance/status') body = { isActive: false };
      else if (path === '/api/users') body = options.empty ? [] : users;
      else if (path === '/api/riders') body = { success: true, riders: options.empty ? [] : [rider] };
      else if (/\/photo$/.test(path)) { status = 404; body = {}; }
      else if (path === '/api/errands') { body = options.empty ? [] : errands; if (options.fail) { status = 503; body = { error: 'Local fixture unavailable' }; } }
      else if (path === '/api/errands/dispatcher-dashboard-summary') body = { unclaimedCount: 7, urgentUnclaimedCount: 1, activeInMotionCount: 7, deliveredTodayCount: 4, helpDeskCount: 1, pipeline: { claimed: 1, toStore: 2, bought: 1, onTheWay: 3, delivered: 4 }, attentionItems: [], topMerchantsToday: [], todayDeclines: [], myShiftStats: { myHandledToday: 5, myAvgClaimLatencySeconds: 30 } };
      else if (path === '/api/errands/exceptions') body = { exceptions: options.empty ? [] : [{ errandId: 'layout-errand-1', kind: 'CASH_VARIANCE', amountAtRisk: 100, detail: name, riderId: 7, riderName: name, occurredAt: new Date().toISOString(), resolvedAt: null }], summary: { openCount: 1, resolvedCount: 0, totalAtRisk: 100, byKind: [] }, riders: [], materialityPesos: 0 };
      else if (path === '/api/account/sessions') body = { sessions: [] };
      else if (path.startsWith('/api/account/')) body = { logs: [] };
      else if (path === '/api/system/kuya-sugo') body = { enabled: true };
      else if (path === '/api/auth/firebase-token') { status = 503; body = { error: 'Local fixture: realtime unavailable' }; }
      else if (path === '/api/analytics/dashboard' && !options.fail) body = { rangeLabel: 'Today', riders: { total: 1, active: 1, inactive: 0, signalLost: 0, offline: 0, offDuty: 0, disabledAccounts: 0 }, errands: { pending: 7, active: 7, completedAllTime: 100, cancelled: 0 }, revenue: { gross: 12000, estimatedCommission: 1000, estimatedRiderPayouts: 2000, orderCount: 14 }, trend: [{ label: 'Today', revenue: 12000 }] };
      else if (path === '/api/reports/sales' && !options.fail) body = { period: 'DAILY', rangeLabel: 'Today', start: '2026-11-04', end: '2026-11-04', totalRevenue: 12000, totalOrders: 14, byCategory: [{ category: name, revenue: 12000, itemCost: 10000, deliveryFee: 1000, tip: 1000, count: 14, orderCount: 14, touchedOrderCount: 14 }], reconciliation: { totalRevenue: 12000, allocatedRevenue: 12000, difference: 0 }, uncategorisedRevenue: 0, notes: [] };
      else if (path === '/api/reports/transactions' && !options.fail) body = { period: 'DAILY', rangeLabel: 'Today', start: '2026-11-04', end: '2026-11-04', transactions: errands.map((e,i) => ({ transactionId: i+1, errandId: e.id, category: name, categories: [name], riderName: name, customerName: name, deliveryAddress: e.deliveryAddress, amount: 1070, deliveryFee: 70, paymentMethod: 'COD', paymentReferenceNo: null, paymentTransactionId: null, paymentConfirmedBy: null, paymentEvidenceSource: null, paymentProofUrl: null, status: 'COMPLETED', errandStatus: 'COMPLETED', paymentStatus: 'PAID', createdAt: e.createdAt })), byPaymentMethod: [{ paymentMethod: 'COD', count: 14, amount: 14980 }], byErrandStatus: [{ status: 'COMPLETED', count: 14, amount: 14980 }], byPaymentStatus: [{ status: 'PAID', count: 14, amount: 14980 }], totals: { count: 14, amount: 14980, deliveryFee: 980 }, riderOptions: [{ riderId: 7, name }], notes: [] };
      else if (path.startsWith('/api/reports/') || path.startsWith('/api/analytics/') || path === '/api/rate-config') { status = 503; body = { error: 'Local fixture unavailable' }; }
      return route.fulfill({ status, json: body, headers: { 'access-control-allow-origin': baseURL, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': route.request().headers()['access-control-request-headers'] || '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'access-control-expose-headers': 'x-total-count', 'x-total-count': String(Array.isArray(body) ? body.length : 0) } });
    }
    if (url.origin !== baseURL) return route.abort();
    return route.continue();
  });
  return { context, page, errors };
}
async function fits(page, label) {
  await page.locator('[data-bell]').waitFor();
  if (process.env.PORTAL_LAYOUT_DEBUG) console.log('  bell ready');
  await page.getByText('Loading workspace...', { exact: true }).waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 10000, polling: 100 });
  if (process.env.PORTAL_LAYOUT_DEBUG) console.log('  fonts ready');
  const result = await page.evaluate(() => {
    const main = document.querySelector('main');
    const rect = main.getBoundingClientRect();
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, main: { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, height: rect.height }, mainScrollWidth: main.scrollWidth, mainClientWidth: main.clientWidth, h1s: main.querySelectorAll('h1').length };
  });
  assert.ok(result.scrollWidth <= result.width + 1, `${label}: document overflows horizontally ${JSON.stringify(result)}`);
  assert.ok(result.main.x >= -1 && result.main.right <= result.width + 1, `${label}: main fits width`);
  assert.ok(result.main.bottom <= result.height + 1 && result.main.height > 80, `${label}: main fits height ${JSON.stringify(result)}`);
  assert.ok(result.mainScrollWidth <= result.mainClientWidth + 1, `${label}: main content overflows ${JSON.stringify(result)}`);
  assert.equal(result.h1s, 1, `${label}: one screen heading`);
  const header = page.locator('[data-owner-header], [data-dispatcher-page-header]');
  assert.ok((await header.boundingBox()).width <= result.width, `${label}: header fits`);
}
async function drawer(page, role, width) {
  const trigger = page.getByRole('button', { name: 'Open navigation', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Navigation', exact: true });
  await clickVisible(trigger); await dialog.waitFor();
  await page.waitForFunction(() => Math.abs(document.querySelector('.portal-mobile-drawer').getBoundingClientRect().left) < 1);
  const box = await dialog.boundingBox();
  assert.ok(box.width <= width - 31 && box.x >= -1, 'drawer leaves room for backdrop');
  const style = await dialog.evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, surface: el.dataset.surface }));
  assert.equal(style.surface, role === 'owner' ? 'owner' : 'dispatch');
  assert.notEqual(style.bg, 'rgba(0, 0, 0, 0)', 'drawer has portal palette');
  await page.keyboard.press('End'); await page.keyboard.press('Tab');
  assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)), 'focus stays in drawer');
  await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
  assert.ok(await trigger.evaluate(el => el === document.activeElement), 'focus returns to menu trigger');
  await clickVisible(trigger); await dialog.waitFor();
  await clickVisible(dialog.getByRole('button', { name: role === 'owner' ? /^Users$/ : /^Dispatch Management/ }));
  await dialog.waitFor({ state: 'hidden' }); await fits(page, 'drawer destination');
  await clickVisible(trigger); await dialog.waitFor();
  await page.mouse.click(width - 8, 100); await dialog.waitFor({ state: 'hidden' });
  await clickVisible(trigger); await dialog.waitFor();
  await clickVisible(dialog.getByRole('button', { name: 'Close navigation' })); await dialog.waitFor({ state: 'hidden' });
  await clickVisible(trigger); await dialog.waitFor();
  await page.setViewportSize({ width: 1024, height: 900 }); await dialog.waitFor({ state: 'hidden' });
  await page.setViewportSize({ width, height: 900 });
  assert.equal(await dialog.isVisible(), false, 'drawer stays closed after resizing back');
}
async function run() {
 const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
 try {
  for (const role of ['dispatcher','owner']) for (const width of widths) {
   const { context, page, errors } = await createPage(browser, role, { width, height: 900 });
   try {
    for (const tab of role === 'owner' ? ownerModules : dispatcherTabs) {
     console.log(`Checking ${role} ${width}px ${tab}`);
     await page.goto(`${baseURL}/${role}?${role === 'owner' ? 'module' : 'tab'}=${tab}`, { waitUntil: 'domcontentloaded' });
     await fits(page, `${role} ${tab} ${width}`);
     if (role === 'owner' && tab === 'users' && width < 768) {
      const row = page.locator('main [role=button][aria-expanded]').first();
      await clickVisible(row);
      assert.equal(await row.getAttribute('aria-expanded'), 'true');
      await clickVisible(page.getByRole('button', { name: 'View Full Details', exact: true }));
      await page.getByRole('dialog').waitFor();
      await clickVisible(page.getByRole('button', { name: 'Back to Table' }));
      await clickVisible(page.getByRole('button', { name: 'Add User', exact: true }));
      const modal = page.getByRole('dialog'); await modal.waitFor();
      const box = await modal.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width, 'user form fits');
      await clickVisible(page.getByRole('button', { name: 'Cancel', exact: true }));
     }
     if (tab === 'reports') {
      for (const id of ['rider-performance','commission','settlement','transactions','exceptions','sales']) {
       await clickVisible(page.locator(`#reports-tab-${id}`));
       await fits(page, `report ${id} ${width}`);
      }
     }
     if (tab === 'settings') for (const id of ['groups','accounts','account','appearance']) {
      await page.goto(`${baseURL}/owner?module=settings&tab=${id}`, { waitUntil: 'domcontentloaded' }); await fits(page, `settings ${id} ${width}`);
     }
     if (tab === 'messages' && width < 1024) {
      const back = page.getByRole('button', { name: 'Back to conversations' });
      if (await back.isVisible()) await clickVisible(back);
      await clickVisible(page.getByRole('button', { name: /All Fleet/i }));
      await clickVisible(page.locator('[data-rider-list]').getByText(name, { exact: true }));
      await page.getByRole('button', { name: 'Back to conversations' }).waitFor();
      const input = page.locator('[data-rider-conversation] input');
      await input.fill('Draft stays while returning to the list');
      await clickVisible(page.getByRole('button', { name: 'Back to conversations' }));
      await clickVisible(page.locator('[data-rider-list]').getByText(name, { exact: true }));
      assert.equal(await input.inputValue(), 'Draft stays while returning to the list');
      await clickVisible(page.getByRole('button', { name: 'Back to conversations' }));
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('sugo:open-rider-chat', { detail: { riderId: '7' } })));
      await page.getByRole('button', { name: 'Back to conversations' }).waitFor();
      assert.equal(await input.inputValue(), 'Draft stays while returning to the list');
      const box = await page.locator('[data-rider-conversation]').boundingBox(); assert.ok(box.width > width / 2, 'conversation gets usable width');
     }
    }
    if (width < 768) { console.log(`Checking ${role} ${width}px drawer`); await drawer(page, role, width); }
    assert.deepEqual(errors, [], `${role} ${width}: no uncaught exceptions`);
    if ([390,768,1440].includes(width)) await page.screenshot({ path: `scratch/responsive-20261104/${role}-${width}.png` });
    console.log(`${role} ${width}px: all destinations and interactions passed`);
   } catch(e) { console.error(e); await page.screenshot({ path: `scratch/responsive-20261104/failure-${role}-${width}.png`, timeout: 3000, animations: 'disabled' }).catch(() => {}); throw e; }
   finally { await context.close(); }
  }
  for (const role of ['owner','dispatcher']) for (const viewport of [{ width: 667, height: 375 }, { width: 844, height: 390 }]) {
   const { context, page } = await createPage(browser, role, viewport, { dark: role === 'owner' });
   try { for (const tab of role === 'owner' ? ownerModules : dispatcherTabs) {
    await page.goto(`${baseURL}/${role}?${role === 'owner' ? 'module' : 'tab'}=${tab}`, { waitUntil: 'domcontentloaded' });
    await fits(page, `${role} landscape ${tab}`);
    if (role === 'owner' && tab === 'users') {
      const height = await page.locator('.owner-users-list-enter').evaluate(element => element.clientHeight);
      assert.ok(height >= 120, `landscape user list has usable height: ${height}px`);
      await page.screenshot({ path: `scratch/responsive-20261104/owner-landscape-${viewport.width}.png`, animations: 'disabled' });
    }
    if (role === 'dispatcher' && tab === 'messages') {
      await clickVisible(page.getByRole('button', { name: /All Fleet/i }));
      await clickVisible(page.locator('[data-rider-list]').getByText(name, { exact: true }));
      const composer = await page.locator('[data-rider-conversation] input').boundingBox();
      assert.ok(composer.y >= 0 && composer.y + composer.height <= viewport.height, 'landscape composer stays in viewport');
      await clickVisible(page.getByRole('button', { name: 'Back to conversations' }));
    }
   } }
   finally { await context.close(); }
  }
  for (const role of ['owner','dispatcher']) for (const state of ['empty', 'fail', 'dark']) {
   const { context, page, errors } = await createPage(browser, role, { width: 390, height: 844 }, { [state]: true });
   try {
    const tab = role === 'owner' ? (state === 'empty' ? 'users' : 'dashboard') : 'queue';
    await page.goto(`${baseURL}/${role}?${role === 'owner' ? 'module' : 'tab'}=${tab}`, { waitUntil: 'domcontentloaded' });
    await fits(page, `${role} ${state}`);
    if (role === 'owner' && state === 'dark') {
      assert.equal(await page.locator('html').getAttribute('data-owner-theme'), 'dark');
      await drawer(page, role, 390);
    }
    assert.deepEqual(errors, [], `${role} ${state}: no uncaught exceptions`);
   } finally { await context.close(); }
  }
  for (const role of ['owner','dispatcher']) {
   const { context, page } = await createPage(browser, role, { width: 390, height: 844 }, { restricted: true });
   try {
    await page.goto(`${baseURL}/${role}?${role === 'owner' ? 'module=users' : 'tab=dashboard'}`, { waitUntil: 'domcontentloaded' }); await fits(page, 'restricted');
    await clickVisible(page.getByRole('button', { name: 'Open navigation', exact: true }));
    const nav = page.getByRole('dialog', { name: 'Navigation', exact: true });
    assert.equal(await nav.getByRole('button', { name: role === 'owner' ? 'Reports' : 'Help Desk', exact: true }).count(), 0);
   } finally { await context.close(); }
  }
 } finally { await browser.close(); }
}
module.exports = { createPage, fits, drawer };
if (require.main === module) run().then(() => console.log('Responsive suite passed: both portals, width matrix, landscape, states, dark theme and restricted navigation.')).catch(error => { console.error(error); process.exitCode = 1; });
