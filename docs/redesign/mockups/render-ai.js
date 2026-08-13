const { chromium } = require('playwright');
const path = require('path');
const jobs = [
  { cls: 'm-chat', out: 'ai-chat.png' },
  { cls: 'm-chat s-full', out: 'ai-chat-full.png' },
  { cls: 'm-chat s-empty', out: 'ai-chat-empty.png' },
  { cls: 'm-quiet', out: 'ai-quiet.png' },
  { cls: 'm-quiet s-send', out: 'ai-quiet-send.png' },
  { cls: 'm-obs', out: 'ai-obs.png' },
  { cls: 'm-info', out: 'ai-info.png' },
];
(async () => {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--allow-file-access-from-files'],
  });
  for (const j of jobs) {
    const p = await b.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 3 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(__dirname, 'ai.html'));
    await p.evaluate((c) => { document.body.className = c; }, j.cls);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    const h = await p.evaluate(() => {
      const bottom = document.querySelector('.sheet').getBoundingClientRect().bottom;
      document.querySelector('.tabbar').style.top = Math.round(bottom + 22) + 'px';
      const t = Math.round(bottom + 22 + 64 + 26);
      document.documentElement.style.height = t + 'px';
      document.body.style.height = t + 'px';
      return t;
    });
    await p.setViewportSize({ width: 390, height: h });
    await p.evaluate(async () => { if (window.__applyGlass) await window.__applyGlass(); });
    await p.waitForTimeout(1800);
    await p.screenshot({ path: path.resolve(__dirname, j.out) });
    console.log(j.out, h, 'errors:', errs.length ? errs : 'none');
    await p.close();
  }
  await b.close();
})();
