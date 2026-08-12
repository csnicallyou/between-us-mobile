/*
  Нейроны внутри шара.

  Узлы живут в объёме сферы, а не на плоскости: у каждого есть координата
  глубины. Сфера медленно поворачивается, ближние узлы крупнее и ярче,
  дальние мельчают и гаснут — отсюда ощущение, что они внутри, а не нарисованы
  на поверхности. Связи тускнеют вместе с глубиной, импульсы бегут по ним.
*/
document.querySelectorAll('canvas.neurons').forEach(function (c) {
  const S = 62, DPR = 3;
  c.width = S * DPR; c.height = S * DPR;
  c.style.width = S + 'px'; c.style.height = S + 'px';
  const ctx = c.getContext('2d');
  ctx.scale(DPR, DPR);

  const cx = S / 2, cy = S / 2;
  const R = S / 2 - 4;
  const N = 16, LINK = 0.82;

  // монохром: только светлые и тёмные узлы, без цвета
  const palette = ['#FFFFFF', '#FFFFFF', '#EDEAF2', '#221E2A', '#221E2A', '#3B3644'];

  const nodes = Array.from({ length: N }, function (_, i) {
    // равномерно по объёму шара
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const r = Math.cbrt(Math.random()) * 0.92;
    const s = Math.sqrt(1 - u * u);
    return {
      x: r * s * Math.cos(th),
      y: r * s * Math.sin(th),
      z: r * u,
      vx: (Math.random() - .5) * 0.0038,
      vy: (Math.random() - .5) * 0.0038,
      vz: (Math.random() - .5) * 0.0038,
      col: palette[i % palette.length],
      ph: Math.random() * Math.PI * 2,
    };
  });

  const pulses = [];
  let ay = 0, ax = 0;

  function frame(now) {
    const t = now / 1000;
    ctx.clearRect(0, 0, S, S);

    ay += 0.0032;
    ax = Math.sin(t * 0.18) * 0.30;
    const ca = Math.cos(ay), sa = Math.sin(ay);
    const cb = Math.cos(ax), sb = Math.sin(ax);

    // дрейф с отражением от внутренней стенки
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy; n.z += n.vz;
      const d = Math.hypot(n.x, n.y, n.z);
      if (d > 0.94) {
        const k = 0.94 / d;
        n.x *= k; n.y *= k; n.z *= k;
        const dot = (n.vx * n.x + n.vy * n.y + n.vz * n.z) / (0.94 * 0.94);
        n.vx -= 2 * dot * n.x; n.vy -= 2 * dot * n.y; n.vz -= 2 * dot * n.z;
      }
    }

    // проекция: поворот вокруг Y, затем небольшой наклон
    const P = nodes.map(function (n) {
      const x1 = n.x * ca + n.z * sa;
      const z1 = -n.x * sa + n.z * ca;
      const y2 = n.y * cb - z1 * sb;
      const z2 = n.y * sb + z1 * cb;
      const depth = (z2 + 1) / 2;              // 0 — дальний, 1 — ближний
      const k = 0.78 + 0.22 * depth;           // лёгкая перспектива
      return {
        px: cx + x1 * R * k,
        py: cy + y2 * R * k,
        d: depth,
        col: n.col,
        ph: n.ph,
        v3: [x1, y2, z2],
      };
    });

    // связи
    ctx.lineWidth = 0.7;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const a = P[i], b = P[j];
        const dd = Math.hypot(a.v3[0] - b.v3[0], a.v3[1] - b.v3[1], a.v3[2] - b.v3[2]);
        if (dd < LINK) {
          const near = (a.d + b.d) / 2;
          const al = (1 - dd / LINK) * (0.16 + 0.50 * near);
          ctx.strokeStyle = 'rgba(255,255,255,' + al.toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(b.px, b.py); ctx.stroke();
        }
      }
    }

    // узлы: дальние мельче и тусклее
    for (const p of P) {
      const flick = 0.82 + 0.18 * Math.sin(t * 1.6 + p.ph);
      const rad = (1.05 + 1.85 * p.d) * flick;
      const al = (0.45 + 0.55 * p.d) * flick;
      ctx.save();
      ctx.globalAlpha = al;
      ctx.shadowColor = p.col;
      ctx.shadowBlur = 7 * p.d + 2;
      ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.px, p.py, rad, 0, 6.2832); ctx.fill();
      // ядро посветлее, чтобы точка читалась как источник
      ctx.shadowBlur = 0;
      ctx.globalAlpha = al * 0.75;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(p.px, p.py, rad * 0.42, 0, 6.2832); ctx.fill();
      ctx.restore();
    }

    // импульсы по связям
    if (Math.random() < 0.05 && pulses.length < 4) {
      const i = (Math.random() * N) | 0;
      const j = (Math.random() * N) | 0;
      if (i !== j) pulses.push({ i: i, j: j, t: 0, col: nodes[i].col });
    }
    for (let k = pulses.length - 1; k >= 0; k--) {
      const p = pulses[k];
      p.t += 0.018;
      if (p.t >= 1) { pulses.splice(k, 1); continue; }
      const a = P[p.i], b = P[p.j];
      const x = a.px + (b.px - a.px) * p.t;
      const y = a.py + (b.py - a.py) * p.t;
      const near = a.d + (b.d - a.d) * p.t;
      const al = Math.sin(p.t * Math.PI) * (0.35 + 0.65 * near);
      ctx.save();
      ctx.globalAlpha = al;
      ctx.shadowColor = p.col; ctx.shadowBlur = 6;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(x, y, 1.15, 0, 6.2832); ctx.fill();
      ctx.restore();
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
});
