/** Real standalone smoke test. Run the preview server, then pass its HTML URL. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = process.argv[2];
if (!url) throw new Error('Usage: node tools/real-client-check.mjs <standalone-client-url>');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const results = [];
const check = (name, value) => { assert.ok(value, name); results.push(name); console.log(`PASS ${name}`); };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [], failed = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('requestfailed', request => failed.push(`${request.url()}: ${request.failure()?.errorText}`));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('/WARN]')) errors.push(message.text());
  });
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__eaglerMenuReady === true && window.EaglerHacks, null, { timeout: 120000 });
  check('real game reaches menu-ready state', await page.evaluate(() => window.__eaglerGameReady === true));
  check('one HUD canvas is mounted', await page.locator('#eaghacks-hud-canvas').count() === 1);
  check('real game canvas exists', await page.locator('#game_frame canvas').count() > 0);
  await page.keyboard.press('ShiftRight');
  check('Right Shift opens real-client ClickGUI', await page.evaluate(() => window.EaglerHacks.client.clickgui.open));
  check('all nine GUI windows exist', await page.locator('.mt-window').count() === 9);
  const search = page.getByRole('textbox', { name: 'Search modules', exact: true });
  await search.pressSequentially('wasd test');
  check('real-client search accepts movement letters and spaces', await search.inputValue() === 'wasd test');
  await search.fill('FPS');
  await page.locator('.mt-search-win .mt-row').filter({ hasText: 'FPS' }).first().click();
  check('FPS HUD module toggles in real client', await page.evaluate(() => window.EaglerHacks.client.modules.get('fps-display').active));
  await page.keyboard.press('Escape');
  check('Escape closes real-client ClickGUI', await page.evaluate(() => !window.EaglerHacks.client.clickgui.open));
  await page.setViewportSize({ width: 800, height: 600 });
  check('HUD viewport follows resize', await page.evaluate(() => window.EaglerHacks.adapter.getViewport().width === 800));
  check('no required asset requests failed', failed.length === 0);
  check('no uncaught or error-level game failures', errors.length === 0);
  if (process.env.REAL_CLIENT_SCREENSHOT) await page.screenshot({ path: process.env.REAL_CLIENT_SCREENSHOT });
  console.log(`${results.length}/${results.length} real-client startup/UI checks passed. Loaded-world and native-module behavior are separate tests.`);
} finally {
  await browser.close();
}
