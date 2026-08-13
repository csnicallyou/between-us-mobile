// Псевдо-QR для макета: настоящий код рисует react-native-qrcode-svg из
// ссылки приглашения. Здесь важна только фактура — плотность модулей и
// три позиционных маркера, чтобы карточка выглядела так, как будет.
(function () {
  function draw(cv) {
    const N = 25, S = 6, pad = 0;
    const dpr = 3;
    cv.width = N * S * dpr; cv.height = N * S * dpr;
    cv.style.width = N * S + 'px'; cv.style.height = N * S + 'px';
    const x = cv.getContext('2d');
    x.scale(dpr, dpr);
    x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, N * S, N * S);
    x.fillStyle = '#211E29';

    let seed = 20260813;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

    const inFinder = (r, c) =>
      (r < 8 && c < 8) || (r < 8 && c >= N - 8) || (r >= N - 8 && c < 8);

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (inFinder(r, c)) continue;
        if (r === 6 || c === 6) { if ((r + c) % 2 === 0) x.fillRect(c * S + pad, r * S + pad, S, S); continue; }
        if (rnd() > 0.52) x.fillRect(c * S + pad, r * S + pad, S, S);
      }
    }
    // позиционные маркеры
    const finder = (r, c) => {
      x.fillRect(c * S, r * S, 7 * S, 7 * S);
      x.clearRect((c + 1) * S, (r + 1) * S, 5 * S, 5 * S);
      x.fillStyle = '#FFFFFF'; x.fillRect((c + 1) * S, (r + 1) * S, 5 * S, 5 * S);
      x.fillStyle = '#211E29'; x.fillRect((c + 2) * S, (r + 2) * S, 3 * S, 3 * S);
    };
    finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
  }
  window.__qr = () => document.querySelectorAll('canvas.qr').forEach(draw);
  if (document.readyState !== 'loading') window.__qr(); else addEventListener('DOMContentLoaded', window.__qr);
})();
