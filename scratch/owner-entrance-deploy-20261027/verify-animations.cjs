const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Capstone/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin = 'http://127.0.0.1:4178';
const user = { id: 1, username: 'animation-test', role: 'owner', name: 'Animation Test', email: '', phone: '', avatar: '' };
const token = `e30.${Buffer.from(JSON.stringify({exp: Math.floor(Date.now()/1000)+3600})).toString('base64url')}.test`;
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [390, 1440]) for (const reducedMotion of ['no-preference', 'reduce']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion });
      await context.addInitScript(({ user }) => {
        sessionStorage.setItem('errand_system_session_user', JSON.stringify(user));
        window.entrances = [];
        document.addEventListener('animationstart', event => {
          if (event.animationName === 'owner-screen-enter') window.entrances.push(event.target.className);
        });
      }, { user });
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith('/api/')) {
          let status = 200;
          let body = [];
          if (url.pathname === '/api/auth/refresh') body = { user, token };
          else if (url.pathname === '/api/maintenance/status') body = { isActive: false };
          else if (url.pathname === '/api/riders') body = { success: true, riders: [] };
          else if (url.pathname.startsWith('/api/analytics/') || url.pathname.startsWith('/api/reports/') || url.pathname === '/api/auth/firebase-token') { status = 503; body = { error: 'Local verification: data unavailable' }; }
          return route.fulfill({ status, json: body, headers: { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'x-total-count': '0' } });
        }
        return url.origin === origin ? route.continue() : route.abort();
      });
      const page = await context.newPage();
      for (const module of ['dashboard', 'reports', 'users']) {
        await page.goto(`${origin}/owner?module=${module}`);
        await page.locator('[data-owner-header]').waitFor();
        const elements = module === 'users' ? '.owner-users-header-enter, .owner-users-controls-enter, .owner-users-list-enter' : module === 'reports' ? '.owner-reports-enter > :first-child > *, .owner-report-enter' : '.owner-dashboard-enter > :first-child, .owner-dashboard-sections > *';
        const animated = page.locator(elements);
        await animated.first().waitFor();
        await page.waitForTimeout(650);
        const states = await animated.evaluateAll(nodes => nodes.map(node => { const s=getComputedStyle(node); return { name:s.animationName, opacity:s.opacity, transform:s.transform }; }));
        assert.equal(states.length, module === 'dashboard' ? 4 : 3);
        assert.ok(states.every(state => state.opacity === '1' && state.transform === 'none'));
        assert.ok(states.every(state => state.name === (reducedMotion === 'reduce' ? 'none' : 'owner-screen-enter')));
        const before = await page.evaluate(() => window.entrances.length);
        if (module === 'users') {
          await page.getByRole('textbox', { name: 'Search user accounts' }).fill('test');
          await page.getByRole('combobox', { name: 'Filter by role' }).selectOption('rider');
          await page.getByRole('button', { name: 'Add User', exact: true }).click();
          await page.getByRole('button', { name: 'Cancel', exact: true }).click();
          await page.waitForTimeout(100);
          assert.equal(await page.evaluate(() => window.entrances.length), before);
        }
        console.log(`${width}px ${reducedMotion} ${module}: passed`);
      }
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

