// Rerender any mockup screen to PNG for review.
// Usage: node render.js <file.html> <out.png> [bodyClass]
//
// Requires Playwright with a Chromium binary available. If Chromium isn't
// installed yet, run `npx playwright install chromium` first.
const { chromium } = require('playwright');
const path = require('path');

const [, , file, out, bodyClass] = process.argv;
if (!file || !out) {
  console.error('Usage: node render.js <file.html> <out.png> [bodyClass]');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({
    args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--allow-file-access-from-files'],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 3 });
  await page.goto('file://' + path.resolve(__dirname, file));
  if (bodyClass) await page.evaluate((c) => { document.body.className = c; }, bodyClass);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  // Screens that carry a .sheet + fixed .tabbar are laid out with an
  // absolutely-positioned bottom bar; resize the viewport to the real
  // content height so the bar sits under the content instead of overlapping.
  const height = await page.evaluate(() => {
    const sheet = document.querySelector('.sheet');
    const bar = document.querySelector('.tabbar');
    if (!sheet || !bar) return null;
    const bottom = sheet.getBoundingClientRect().bottom;
    bar.style.top = Math.round(bottom + 22) + 'px';
    const total = Math.round(bottom + 22 + 64 + 26);
    document.documentElement.style.height = total + 'px';
    document.body.style.height = total + 'px';
    return total;
  });
  if (height) await page.setViewportSize({ width: 390, height });

  await page.evaluate(async () => { if (window.__applyGlass) await window.__applyGlass(); });
  await page.waitForTimeout(1800); // let the orb animation and glass settle
  await page.screenshot({ path: path.resolve(__dirname, out) });
  await browser.close();
  console.log('rendered', out);
})();
