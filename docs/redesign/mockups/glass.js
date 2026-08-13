/*
  Настоящее преломление: карта смещений из геометрии фигуры.

  Для каждой стеклянной поверхности считается знаковое поле расстояний
  до её скруглённой границы. В полосе фаски пиксели фона сдвигаются вдоль
  нормали к границе — фон реально изгибается у кромки, как в толстом стекле.
  Красный канал карты кодирует сдвиг по X, зелёный — по Y, 128 = без сдвига.

  Дисперсия берётся из того же преломления: R, G и B смещаются на разную
  величину, потому что стекло преломляет их под разными углами.
*/
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;overflow:hidden;pointer-events:none';
  const defs = document.createElementNS(NS, 'defs');
  svg.appendChild(defs);
  document.body.appendChild(svg);


  /* --------------------------------------------------------------
     Фон в канвас: из него берём цвет теней и бликов.
     Тень окрашивается тем, на что падает; блик — тем, что отражает.
     -------------------------------------------------------------- */
  let wallCv = null, wallCtx = null;

  function loadWall() {
    return new Promise(function (resolve) {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--wall').trim();
      const m = raw.match(/url\((['"]?)(.*?)\1\)/);
      if (!m) return resolve(false);
      const img = new Image();
      img.onload = function () {
        const w = document.documentElement.clientWidth;
        const h = Math.max(document.documentElement.scrollHeight, window.innerHeight);
        wallCv = document.createElement('canvas');
        wallCv.width = w; wallCv.height = h;
        wallCtx = wallCv.getContext('2d', { willReadFrequently: true });
        wallCtx.drawImage(img, 0, 0, w, h);   // обои растянуты на вьюпорт
        resolve(true);
      };
      img.onerror = function () { resolve(false); };
      img.src = m[2];
    });
  }

  function sample(x, y, w, h) {
    if (!wallCtx) return null;
    const X = Math.max(0, Math.round(x)), Y = Math.max(0, Math.round(y));
    const W = Math.min(wallCv.width - X, Math.round(w));
    const H = Math.min(wallCv.height - Y, Math.round(h));
    if (W < 1 || H < 1) return null;
    const d = wallCtx.getImageData(X, Y, W, H).data;
    let r = 0, g = 0, b = 0, n = 0;
    const step = 4 * Math.max(1, Math.floor(d.length / 4 / 900));
    for (let i = 0; i < d.length; i += step) { r += d[i]; g += d[i+1]; b += d[i+2]; n++; }
    return [r / n, g / n, b / n];
  }

  function shade(c, k) {
    return [c[0] * k, c[1] * k, c[2] * k].map(function (v) { return Math.round(Math.max(0, Math.min(255, v))); });
  }
  function lift(c, k) {
    return c.map(function (v) { return Math.round(v + (255 - v) * k); });
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  function tintFromBackdrop(el) {
    const r = el.getBoundingClientRect();
    const sc = window.scrollY || 0;

    // цвет тени берём из того, на что она ложится — из-под нижней кромки
    const under = sample(r.left - 6, r.bottom + sc - 4, r.width + 12, Math.max(10, r.height * 0.35));
    // цвет блика — из того, что стекло отражает сверху
    const above = sample(r.left, r.top + sc - 10, r.width, Math.max(10, r.height * 0.3));
    if (!under && !above) return;

    if (under) {
      const c = shade(under, 0.42);
      // геометрия тени пропорциональна объекту: маленький лежит ближе
      // к поверхности и отбрасывает короткую тень, а не облако в свой рост
      const s = Math.min(r.width, r.height);
      const cl = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
      // тень не должна доставать до соседней карточки: зазор в макете 11 px,
      // иначе сосед подхватит её своим backdrop-filter и размажет по кромке
      const y1 = 0.5,                    b1 = 1;
      const y2 = cl(s * 0.02, 1.5, 3),   b2 = cl(s * 0.045, 2.5, 6);
      const y3 = cl(s * 0.05, 2.5, 7),   b3 = cl(s * 0.11, 5, 14);
      el.style.setProperty('--shadow',
        '0 ' + y1 + 'px ' + b1 + 'px ' + rgba(c, 0.10) + ', ' +
        '0 ' + y2 + 'px ' + b2 + 'px -1px ' + rgba(c, 0.08) + ', ' +
        '0 ' + y3 + 'px ' + b3 + 'px -' + (b3 * 0.4).toFixed(1) + 'px ' + rgba(c, 0.10));
    }
    if (above) {
      el.style.setProperty('--spec', rgba(lift(above, 0.86), 1));
      el.style.setProperty('--spec-soft', rgba(lift(above, 0.72), 0.55));
    }
  }

  // знаковое расстояние до скруглённого прямоугольника (<0 внутри)
  function sdRoundRect(px, py, hw, hh, r) {
    const qx = Math.abs(px) - hw + r;
    const qy = Math.abs(py) - hh + r;
    const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
    return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
  }

  function buildMap(w, h, radius, band, POW) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(w, h);
    const px = img.data;
    const hw = w / 2, hh = h / 2;
    const r = Math.min(radius, hw, hh);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cx = x + 0.5 - hw, cy = y + 0.5 - hh;
        const sd = sdRoundRect(cx, cy, hw, hh, r);
        const depth = -sd;                       // насколько глубоко внутри
        let dx = 0, dy = 0;

        if (depth >= 0 && depth < band) {
          // нормаль к границе — градиент поля расстояний
          const e = 1;
          const nx = sdRoundRect(cx + e, cy, hw, hh, r) - sdRoundRect(cx - e, cy, hw, hh, r);
          const ny = sdRoundRect(cx, cy + e, hw, hh, r) - sdRoundRect(cx, cy - e, hw, hh, r);
          const len = Math.hypot(nx, ny) || 1;

          // Горб: на самой границе смещение = 0, максимум чуть внутрь.
          // Chromium обрезает фон по границе объекта ДО фильтра, поэтому
          // тянуть пиксели снаружи нельзя — оттуда приходит пустота
          // и по углам вылезают тёмные крючки.
          const u = depth / band;
          const k = Math.sin(Math.PI * Math.pow(u, POW));

          dx = (nx / len) * k;
          dy = (ny / len) * k;
        }

        const i = (y * w + x) * 4;
        px[i]     = Math.max(0, Math.min(255, Math.round(128 + dx * 127)));
        px[i + 1] = Math.max(0, Math.min(255, Math.round(128 + dy * 127)));
        px[i + 2] = 128;
        px[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL();
  }

  function channelMatrix(ch) {
    const m = { r: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
                g: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
                b: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0' };
    return m[ch];
  }

  let uid = 0;
  function makeFilter(href, w, h, scale, spreadAmt) {
    const id = 'lg' + (uid++);
    const f = document.createElementNS(NS, 'filter');
    f.setAttribute('id', id);
    f.setAttribute('color-interpolation-filters', 'sRGB');
    // Область фильтра строго по объекту. Шире делать нельзя: карта смещений
    // покрывает только сам объект, а за её краем feImage даёт прозрачность,
    // то есть R=G=0 — это МАКСИМАЛЬНОЕ смещение, а не нулевое. Именно оттуда
    // бралась тёмная кайма по периметру. Выход за границу уже невозможен:
    // профиль-горб обнуляет смещение на самой кромке.
    f.setAttribute('x', '0%'); f.setAttribute('y', '0%');
    f.setAttribute('width', '100%'); f.setAttribute('height', '100%');

    const im = document.createElementNS(NS, 'feImage');
    im.setAttribute('href', href);
    im.setAttribute('x', '0'); im.setAttribute('y', '0');
    im.setAttribute('width', String(w)); im.setAttribute('height', String(h));
    im.setAttribute('preserveAspectRatio', 'none');
    im.setAttribute('result', 'map');
    f.appendChild(im);

    // три канала преломляются под разными углами — отсюда дисперсия
    const s = spreadAmt;
    const spread = { r: 1.00, g: 1 - s, b: 1 - 2 * s };
    ['r', 'g', 'b'].forEach(function (ch) {
      const d = document.createElementNS(NS, 'feDisplacementMap');
      d.setAttribute('in', 'SourceGraphic');
      d.setAttribute('in2', 'map');
      d.setAttribute('scale', String(scale * spread[ch]));
      d.setAttribute('xChannelSelector', 'R');
      d.setAttribute('yChannelSelector', 'G');
      d.setAttribute('result', 'd' + ch);
      f.appendChild(d);

      const cm = document.createElementNS(NS, 'feColorMatrix');
      cm.setAttribute('in', 'd' + ch);
      cm.setAttribute('type', 'matrix');
      cm.setAttribute('values', channelMatrix(ch));
      cm.setAttribute('result', 'c' + ch);
      f.appendChild(cm);
    });

    const b1 = document.createElementNS(NS, 'feBlend');
    b1.setAttribute('in', 'cr'); b1.setAttribute('in2', 'cg');
    b1.setAttribute('mode', 'screen'); b1.setAttribute('result', 'rg');
    f.appendChild(b1);

    const b2 = document.createElementNS(NS, 'feBlend');
    b2.setAttribute('in', 'rg'); b2.setAttribute('in2', 'cb');
    b2.setAttribute('mode', 'screen');
    f.appendChild(b2);

    defs.appendChild(f);
    return id;
  }

  function apply(el, opts) {
    const host = el.parentElement;
    const rect = host.getBoundingClientRect();
    const w = Math.round(rect.width), h = Math.round(rect.height);
    if (w < 8 || h < 8) return;

    // Преломление в макете больше не эмулируем: в приложении его считает
    // нативный GlassView, а в Chromium любая попытка упирается в обрезку
    // фона по границе элемента и даёт артефакты по кромке.
    const blur = Math.max(5, Math.min(opts.blur, Math.min(w, h) * 0.22));
    const fx = 'blur(' + blur.toFixed(1) + 'px) saturate(' + opts.sat + ') brightness(' + opts.bright + ')';
    el.style.backdropFilter = fx;
    el.style.webkitBackdropFilter = fx;
  }

  window.__applyGlass = function () {
    return loadWall().then(function () {
      document.querySelectorAll('.glass__lens').forEach(function (lens) {
        apply(lens, { bandRatio: 0.10, bandMax: 16, pow: 0.65, spread: 0.05, blur: 16, sat: 1.62, bright: 1.02 });
      });
      // цвет теней и бликов выводим из фона под каждым объектом
      document.querySelectorAll('.glass').forEach(tintFromBackdrop);
    });
  };

  if (document.readyState === 'complete') window.__applyGlass();
  else window.addEventListener('load', window.__applyGlass);
})();
