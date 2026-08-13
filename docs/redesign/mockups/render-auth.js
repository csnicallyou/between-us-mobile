const { chromium } = require('playwright');
const path = require('path');
const jobs = [
  ['s-signin', 'auth-signin.png'],
  ['s-signup', 'auth-signup.png'],
  ['s-forgot', 'auth-forgot.png'],
  ['s-sent', 'auth-sent.png'],
  ['s-reset', 'auth-reset.png'],
  ['s-done', 'auth-done.png'],
  ['s-verify', 'auth-verify.png'],
  ['s-choose', 'auth-choose.png'],
  ['s-create', 'auth-create.png'],
  ['s-invite', 'auth-invite.png'],
  ['s-join', 'auth-join.png'],
  ['s-ready', 'auth-ready.png'],
  ['s-load', 'auth-load.png'],
];
(async () => {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--allow-file-access-from-files'],
  });
  for (const [cls, out] of jobs) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(__dirname, 'auth.html'));
    await p.evaluate(c => { document.body.className = c; window.__st(); window.__qr(); }, cls);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(250);
    const h = await p.evaluate(() => {
      const b = document.querySelector('.sheet').getBoundingClientRect().bottom;
      const t = Math.max(844, Math.round(b + 24));
      document.documentElement.style.height = t + 'px';
      document.body.style.height = t + 'px';
      return t;
    });
    await p.setViewportSize({ width: 390, height: h });
    await p.evaluate(async () => { if (window.__applyGlass) await window.__applyGlass(); });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.resolve(__dirname, out) });
    console.log(out, h, errs.length ? errs : 'ok');
    await p.close();
  }
  await b.close();
})();
