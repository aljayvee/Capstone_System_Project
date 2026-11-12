const assert = require('node:assert/strict');

// Exercise a real pointer click without depending on headless animation-frame scheduling.
// Poll the hit target so closing overlays and async React commits can finish normally.
async function clickVisible(locator) {
  await locator.waitFor({ state: 'visible' });
  assert.ok(await locator.isEnabled(), 'click target is enabled');
  await locator.evaluate(element => element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }));
  const deadline = Date.now() + 10000;
  let point;
  let receivesClick = false;
  do {
    const box = await locator.boundingBox();
    assert.ok(box && box.width > 0 && box.height > 0, 'click target has visible geometry');
    point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    receivesClick = await locator.evaluate((element, point) => {
      const hit = document.elementFromPoint(point.x, point.y);
      return Boolean(hit && (hit === element || element.contains(hit)));
    }, point);
    if (receivesClick) break;
    await locator.page().waitForTimeout(100);
  } while (Date.now() < deadline);
  assert.ok(receivesClick, 'click target is in the viewport and unobscured');
  await locator.page().mouse.click(point.x, point.y);
}
module.exports = { clickVisible };
