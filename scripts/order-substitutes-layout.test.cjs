// Local fixture test: renders the real Stage 2 component and blocks external traffic.
// Run with Playwright on NODE_PATH: node scripts/order-substitutes-layout.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const fixture = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Stage3ConfirmItems } from '/src/portals/dispatcher/components/order-chat/stages/Stage3ConfirmItems';
import { itemLines } from '/src/portals/dispatcher/components/order-chat/itemOwnership';
import { apiService } from '/src/services/apiService';
import '/src/styles/index.css';
const params = new URLSearchParams(location.search);
const initial = [
  { id: 11, itemKey: 'cake', itemName: 'Ube Cake', quantity: 1, storeCategory: '0', fulfillmentStatus: 'OUT_OF_STOCK' },
  { id: 12, itemKey: 'jam', itemName: 'Ube Halaya Jam', size: '250g', quantity: 2, storeCategory: '0', fulfillmentStatus: 'OUT_OF_STOCK' },
  { id: 13, itemKey: 'bread', itemName: 'Cheese Bread', quantity: 1, storeCategory: '0', fulfillmentStatus: 'PENDING' },
  { id: 21, itemKey: 'milk', itemName: 'Fresh Milk', quantity: 1, storeCategory: '1', fulfillmentStatus: 'OUT_OF_STOCK' },
];
const pins = [{ storeName: 'Purple Yam Tacurong Branch', latitude: 6.69, longitude: 124.67 }, { storeName: 'Local Grocery', latitude: 6.69, longitude: 124.67 }];
window.testState = { sent: [], fetched: [], swaps: [], declined: [], rows: initial };
const attempts = {};
apiService.suggestItemSubstitutes = async (_, id) => {
  window.testState.fetched.push(id);
  attempts[id] = (attempts[id] || 0) + 1;
  await new Promise(resolve => setTimeout(resolve, params.has('slow') ? 1800 : 80));
  if (params.has('error') && id === 12 && attempts[id] === 1) return null;
  const substitutes = id === 11 ? ['Purple Yam Classic Ube Cake', 'Special Ube Ensaymada (Box of 4)'] : id === 12 ? ['Ube Jam', 'Coconut Jam'] : params.has('empty') ? [] : ['Low Fat Milk'];
  return { substitutes, chatMessage: 'Individual legacy message', source: 'catalog' };
};
apiService.updateItemFulfillmentStatus = async (_, id, status) => {
  window.testState.swaps.push({ id, status });
  if (params.has('swapSlow')) await new Promise(resolve => setTimeout(resolve, 500));
  return params.has('swapError') ? null : { item: { id } };
};
apiService.declineItemSubstitute = async (_, id) => {
  window.testState.declined.push(id);
  return params.has('declineError') && id === 12 ? null : { success: true };
};
function App() {
  const [rows, setRows] = useState(initial);
  const [message, setMessage] = useState(null);
  const storeIndexOf = row => row.storeCategory === '0' ? 0 : row.storeCategory === '1' ? 1 : null;
  const noop = () => {};
  window.testState.rows = rows;
  const items = {
    savedItems: initial, editableItems: rows, isEditing: true, hasUnsentChanges: false,
    isSaving: false, hasSentConfirmationCard: true, isCustomerConfirmed: true,
    storesChangedSinceSent: false, sentAt: Date.now(),
    feedback: { message, dismiss: () => setMessage(null), showSuccess: text => setMessage({ text, variant: 'success' }), showError: text => setMessage({ text, variant: 'error' }) },
    categoryNameForPin: () => 'Bakery', storeIndexOf, lines: itemLines(rows, { storeIndexOf }),
    recommendationsReady: false, categoryGuesses: {}, unassignedCount: 0,
    parseStoreAndCat: () => ({ category: 'Bakery', store: 'Purple Yam' }),
    updateItem: (index, patch) => setRows(prev => prev.map((row, i) => i === index ? { ...row, ...patch } : row)),
    removeItem: key => setRows(prev => prev.filter(row => row.itemKey !== key)),
    pushMessage: payload => window.testState.sent.push(payload), onOrderUpdated: noop,
    startEditing: noop, cancelEditing: noop, addItem: noop, addCatalogItem: noop,
    setItemOwned: noop, setStoreOwnsAll: noop, editItemFields: noop, guessCategoryFor: noop,
    stopIndexFor: () => 0, applyCategoryGuess: noop,
  };
  return <main data-surface="dispatch" style={{ padding: 16, maxWidth: 1200, margin: 'auto' }}>
    <h2 style={{ marginBottom: 16 }}>Stage 2 · Confirm items and payment</h2>
    <Stage3ConfirmItems orderId="fixture-order" orderDetails={{ id: 'fixture-order' }} items={items} pinpoints={pins} merchantCategories={[]} customerFirstName="Arnalyn" onNudge={noop} onNeedStores={noop} readOnly={params.has('readOnly')} />
  </main>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
`;

async function run() {
  const root = path.resolve(__dirname, '..');
  const directory = path.join(root, 'scratch', 'order-substitutes-check');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'index.html'), '<div id="root"></div><script type="module" src="./fixture.tsx"></script>');
  await fs.writeFile(path.join(directory, 'fixture.tsx'), fixture);
  const { createServer } = await import('vite');
  const server = await createServer({ root, server: { host: '127.0.0.1', port: 5175, strictPort: true } });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://127.0.0.1:5175' || url.pathname.startsWith('/api/')) return route.abort();
      return route.continue();
    });
    const open = async (query = '') => {
      await page.goto('http://127.0.0.1:5175/scratch/order-substitutes-check/index.html' + query);
      if (!query.includes('readOnly')) await page.locator('[data-substitute-group]').first().waitFor();
      else await page.getByText('No items on this order.', { exact: true }).or(page.getByText('Cheese Bread', { exact: false }).first()).waitFor();
    };
    const first = page.locator('[data-substitute-group]').first();
    const send = () => first.getByRole('button', { name: 'Send options to customer chat', exact: true });
    const composer = () => first.getByRole('textbox', { name: 'Message to Arnalyn' });
    const waitReady = () => send().waitFor().then(() => page.waitForFunction(() => !document.querySelector('[data-substitute-composer] textarea').disabled));

    await open();
    await waitReady();
    assert.equal(await page.locator('[data-substitute-group]').count(), 2, 'one panel per store');
    assert.equal(await first.locator('[data-substitute-item]').count(), 2, 'out-of-stock items grouped together');
    assert.deepEqual((await page.evaluate(() => window.testState.fetched)).sort(), [11, 12, 21], 'strict mode does not duplicate fetches or fetch pending items');
    const text = await composer().inputValue();
    assert.ok(text.includes('Ube Cake') && text.includes('Ube Halaya Jam') && text.includes('2 ×') && text.includes('250g'));
    assert.ok(!text.includes('Fresh Milk') && !text.includes('Cheese Bread'), 'message contains only the current store out-of-stock items');
    for (const width of [390, 768, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      const options = await first.locator('[data-substitute-item]').first().boundingBox();
      const message = await composer().boundingBox();
      assert.ok(message.x >= 0 && message.x + message.width <= width, 'composer fits at ' + width);
      assert.ok(message.height >= 224, 'dedicated message area at ' + width);
      if (width === 1280) assert.ok(message.x > options.x + options.width, 'side-by-side at desktop');
      if (width === 390) assert.ok(message.y > options.y, 'stacked on phone');
      await first.screenshot({ path: path.join(root, 'scratch', 'order-substitutes-' + width + '.png') });
    }
    await composer().fill(text + '\nPlease reply with your choices.');
    await first.getByRole('button', { name: 'Hide', exact: true }).click();
    await first.getByRole('button', { name: 'Show options', exact: true }).click();
    assert.ok((await composer().inputValue()).endsWith('Please reply with your choices.'), 'hide preserves edits');
    await send().click();
    assert.equal(await page.evaluate(() => window.testState.sent.length), 1, 'one grouped chat message');
    assert.ok(await first.getByRole('button', { name: 'Sent to customer chat', exact: true }).isDisabled(), 'no duplicate send');
    await first.getByRole('button', { name: 'Swap Ube Cake with Purple Yam Classic Ube Cake', exact: true }).click();
    await page.waitForFunction(() => window.testState.rows[0].fulfillmentStatus === 'PENDING');
    assert.equal(await first.locator('[data-substitute-item]').count(), 1, 'swap removes only selected item');
    assert.ok(!(await composer().inputValue()).includes('Ube Cake'), 'group message excludes swapped item');
    assert.equal(await page.evaluate(() => window.testState.rows[1].itemName), 'Ube Halaya Jam');
    await first.getByRole('button', { name: 'Customer declined substitutes', exact: true }).click();
    assert.equal(await page.evaluate(() => window.testState.declined.length), 0, 'group decline asks before notifying');
    await first.getByRole('button', { name: 'Cancel', exact: true }).click();

    await open('?error');
    await first.getByText('Could not load alternatives for this item.', { exact: true }).waitFor();
    assert.ok(await send().isDisabled(), 'incomplete group cannot be sent');
    await first.getByRole('button', { name: 'Retry unavailable suggestions' }).click();
    await waitReady();
    assert.equal(await page.evaluate(() => window.testState.fetched.filter(id => id === 12).length), 2);

    await open('?swapError');
    await waitReady();
    await first.getByRole('button', { name: 'Swap Ube Cake with Purple Yam Classic Ube Cake' }).click();
    await page.getByRole('alert').filter({ hasText: 'Could not swap' }).waitFor();
    assert.equal(await page.evaluate(() => window.testState.rows[0].itemName), 'Ube Cake', 'failed swap keeps original');

    await open('?swapSlow');
    await waitReady();
    await first.getByRole('button', { name: 'Swap Ube Halaya Jam with Coconut Jam', exact: true }).click();
    await page.getByRole('button', { name: 'Remove Ube Cake from the order', exact: true }).click();
    await page.waitForFunction(() => window.testState.rows[0].itemName === 'Coconut Jam');
    assert.equal(await page.evaluate(() => window.testState.rows[0].id), 12, 'swap follows item id after another row is removed');
    assert.equal(await page.evaluate(() => window.testState.rows[1].itemName), 'Cheese Bread', 'unrelated item stays intact');

    await open('?declineError');
    await waitReady();
    await first.getByRole('button', { name: 'Customer declined all substitutes', exact: true }).click();
    await first.getByRole('button', { name: 'Confirm decline', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: '1 of 2 items' }).waitFor();
    assert.equal(await first.locator('[data-substitute-item]').count(), 1, 'partial decline retains failed item');

    await open('?slow');
    assert.ok(await send().isDisabled(), 'loading cannot send');
    await first.getByRole('button', { name: 'Customer declined substitutes for Ube Cake', exact: true }).click();
    await page.waitForFunction(() => window.testState.declined.length === 1);
    await waitReady();
    assert.equal(await first.locator('[data-substitute-item="11"]').count(), 0, 'late fetch does not restore declined item');

    await open('?empty');
    await waitReady();
    await page.getByText('No local alternatives found.', { exact: false }).waitFor();
    await open();
    await waitReady();
    await first.getByRole('button', { name: 'Customer declined all substitutes', exact: true }).click();
    await first.getByRole('button', { name: 'Confirm decline', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('[data-substitute-group]').length === 1);
    assert.deepEqual(await page.evaluate(() => window.testState.declined), [11, 12], 'group decline notifies for every item once');
    await open('?readOnly');
    assert.equal(await page.locator('[data-substitute-group]').count(), 0);
    assert.deepEqual(errors, [], 'no uncaught browser errors');
    console.log('PASS: grouped store suggestions, edited single message, swapping, decline, partial failure, retry, race, read-only and responsive layout.');
  } finally {
    await browser?.close();
    await server.close();
    await fs.unlink(path.join(directory, 'index.html'));
    await fs.unlink(path.join(directory, 'fixture.tsx'));
    await fs.rmdir(directory);
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
