/* ═══════════════ MARCHÉS : moteur d'analyse technique (BTCUSD, XAUUSD) ═══════════════
   Entrée : barres { t (ms, heure du serveur MT5), o, h, l, c, v } par unité de temps.
   Tout est calculé dans le navigateur, à partir des cours exportés de MT5. */
const MK = {};

MK.TFS = ['M15', 'H1', 'H4', 'D1', 'W1'];
MK.TF_LABEL = { M15: '15 min', H1: '1 heure', H4: '4 heures', D1: 'Jour', W1: 'Semaine' };
MK.TF_WEIGHT = { H1: 0.2, H4: 0.3, D1: 0.35, W1: 0.15 };
MK.SYMS = ['BTCUSD', 'XAUUSD'];
MK.NAME = { BTCUSD: 'Bitcoin', XAUUSD: 'Or' };

/* ---------- outils ---------- */
const nz = v => (v === undefined || v === null || !isFinite(v) ? NaN : v);
MK.last = (a, k = 1) => a[a.length - k];
MK.sma = (x, n) => { const o = Array(x.length).fill(NaN); let s = 0; for (let i = 0; i < x.length; i++) { s += x[i]; if (i >= n) s -= x[i - n]; if (i >= n - 1) o[i] = s / n; } return o; };
MK.ema = (x, n) => { const o = Array(x.length).fill(NaN); const k = 2 / (n + 1); let e = NaN, s = 0; for (let i = 0; i < x.length; i++) { if (i < n) { s += x[i]; if (i === n - 1) { e = s / n; o[i] = e; } } else { e = x[i] * k + e * (1 - k); o[i] = e; } } return o; };
MK.rma = (x, n) => { const o = Array(x.length).fill(NaN); let e = NaN, s = 0, c = 0; for (let i = 0; i < x.length; i++) { const v = x[i]; if (!isFinite(v)) continue; if (c < n) { s += v; c++; if (c === n) { e = s / n; o[i] = e; } } else { e = (e * (n - 1) + v) / n; o[i] = e; } } return o; };
MK.stdev = (x, n) => { const m = MK.sma(x, n); return x.map((_, i) => { if (i < n - 1) return NaN; let s = 0; for (let k = i - n + 1; k <= i; k++) s += (x[k] - m[i]) ** 2; return Math.sqrt(s / n); }); };
MK.highest = (x, n, i) => { let m = -Infinity; for (let k = Math.max(0, i - n + 1); k <= i; k++) m = Math.max(m, x[k]); return m; };
MK.lowest = (x, n, i) => { let m = Infinity; for (let k = Math.max(0, i - n + 1); k <= i; k++) m = Math.min(m, x[k]); return m; };
MK.slope = (x, n) => { const i = x.length - 1; if (i < n || !isFinite(x[i]) || !isFinite(x[i - n])) return NaN; return (x[i] - x[i - n]) / Math.abs(x[i - n]) * 100; };
MK.pctRank = (arr, v) => { const a = arr.filter(isFinite); if (!a.length) return NaN; return a.filter(x => x <= v).length / a.length; };
MK.clamp = (v, a = -1, b = 1) => Math.max(a, Math.min(b, v));

/* ---------- indicateurs ---------- */
MK.tr = B => B.map((b, i) => i ? Math.max(b.h - b.l, Math.abs(b.h - B[i - 1].c), Math.abs(b.l - B[i - 1].c)) : b.h - b.l);
MK.atr = (B, n = 14) => MK.rma(MK.tr(B), n);
MK.rsi = (c, n = 14) => {
  const up = c.map((v, i) => i ? Math.max(0, v - c[i - 1]) : NaN), dn = c.map((v, i) => i ? Math.max(0, c[i - 1] - v) : NaN);
  const au = MK.rma(up, n), ad = MK.rma(dn, n);
  return c.map((_, i) => !isFinite(au[i]) ? NaN : ad[i] === 0 ? 100 : 100 - 100 / (1 + au[i] / ad[i]));
};
MK.macd = (c, f = 12, s = 26, g = 9) => {
  const a = MK.ema(c, f), b = MK.ema(c, s);
  const m = c.map((_, i) => a[i] - b[i]);
  const first = m.findIndex(isFinite);
  const sig = Array(c.length).fill(NaN);
  if (first >= 0) { const e = MK.ema(m.slice(first), g); e.forEach((v, k) => { sig[first + k] = v; }); }
  return { macd: m, signal: sig, hist: m.map((v, i) => v - sig[i]) };
};
MK.stoch = (B, n = 14, k = 3, d = 3) => {
  const Hh = B.map(x => x.h), Ll = B.map(x => x.l);
  const raw = B.map((b, i) => { if (i < n - 1) return NaN; const hh = MK.highest(Hh, n, i), ll = MK.lowest(Ll, n, i); return hh === ll ? 50 : (b.c - ll) / (hh - ll) * 100; });
  const K = MK.smaNaN(raw, k); return { k: K, d: MK.smaNaN(K, d) };
};
MK.smaNaN = (x, n) => x.map((_, i) => { let s = 0, c = 0; for (let k = i - n + 1; k <= i; k++) { if (k < 0 || !isFinite(x[k])) return NaN; s += x[k]; c++; } return s / c; });
MK.willr = (B, n = 14) => B.map((b, i) => { if (i < n - 1) return NaN; let hh = -Infinity, ll = Infinity; for (let k = i - n + 1; k <= i; k++) { hh = Math.max(hh, B[k].h); ll = Math.min(ll, B[k].l); } return hh === ll ? -50 : (hh - b.c) / (hh - ll) * -100; });
MK.cci = (B, n = 20) => { const tp = B.map(b => (b.h + b.l + b.c) / 3), m = MK.sma(tp, n); return tp.map((v, i) => { if (i < n - 1) return NaN; let md = 0; for (let k = i - n + 1; k <= i; k++) md += Math.abs(tp[k] - m[i]); md /= n; return md ? (v - m[i]) / (0.015 * md) : 0; }); };
MK.roc = (c, n = 12) => c.map((v, i) => i >= n ? (v / c[i - n] - 1) * 100 : NaN);
MK.mfi = (B, n = 14) => { const tp = B.map(b => (b.h + b.l + b.c) / 3); return B.map((b, i) => { if (i < n) return NaN; let p = 0, q = 0; for (let k = i - n + 1; k <= i; k++) { const f = tp[k] * (B[k].v || 1); if (tp[k] > tp[k - 1]) p += f; else if (tp[k] < tp[k - 1]) q += f; } return q === 0 ? 100 : 100 - 100 / (1 + p / q); }); };
MK.obv = B => { let o = 0; return B.map((b, i) => { if (i) o += b.c > B[i - 1].c ? (b.v || 0) : b.c < B[i - 1].c ? -(b.v || 0) : 0; return o; }); };
MK.cmf = (B, n = 20) => B.map((_, i) => { if (i < n - 1) return NaN; let mfv = 0, vol = 0; for (let k = i - n + 1; k <= i; k++) { const b = B[k], r = b.h - b.l; mfv += r ? ((b.c - b.l) - (b.h - b.c)) / r * (b.v || 0) : 0; vol += (b.v || 0); } return vol ? mfv / vol : 0; });
MK.adx = (B, n = 14) => {
  const pdm = B.map((b, i) => { if (!i) return NaN; const u = b.h - B[i - 1].h, d = B[i - 1].l - b.l; return u > d && u > 0 ? u : 0; });
  const mdm = B.map((b, i) => { if (!i) return NaN; const u = b.h - B[i - 1].h, d = B[i - 1].l - b.l; return d > u && d > 0 ? d : 0; });
  const tr = MK.tr(B).map((v, i) => i ? v : NaN);
  const atr = MK.rma(tr, n), sp = MK.rma(pdm, n), sm = MK.rma(mdm, n);
  const pdi = atr.map((a, i) => a ? sp[i] / a * 100 : NaN), mdi = atr.map((a, i) => a ? sm[i] / a * 100 : NaN);
  const dx = pdi.map((p, i) => (p + mdi[i]) ? Math.abs(p - mdi[i]) / (p + mdi[i]) * 100 : NaN);
  return { adx: MK.rma(dx, n), pdi, mdi };
};
MK.boll = (c, n = 20, k = 2) => { const m = MK.sma(c, n), s = MK.stdev(c, n); const up = m.map((v, i) => v + k * s[i]), lo = m.map((v, i) => v - k * s[i]); return { mid: m, up, lo, width: m.map((v, i) => (up[i] - lo[i]) / v * 100), pb: c.map((v, i) => (v - lo[i]) / (up[i] - lo[i])) }; };
MK.keltner = (B, n = 20, k = 1.5) => { const m = MK.ema(B.map(b => b.c), n), a = MK.atr(B, 10); return { mid: m, up: m.map((v, i) => v + k * a[i]), lo: m.map((v, i) => v - k * a[i]) }; };
MK.donchian = (B, n = 20) => { const Hh = B.map(b => b.h), Ll = B.map(b => b.l); return { up: B.map((_, i) => i >= n ? MK.highest(Hh, n, i - 1) : NaN), lo: B.map((_, i) => i >= n ? MK.lowest(Ll, n, i - 1) : NaN) }; };
MK.ichimoku = B => {
  const Hh = B.map(b => b.h), Ll = B.map(b => b.l);
  const mid = (n, i) => (MK.highest(Hh, n, i) + MK.lowest(Ll, n, i)) / 2;
  const ten = B.map((_, i) => i >= 8 ? mid(9, i) : NaN), kij = B.map((_, i) => i >= 25 ? mid(26, i) : NaN);
  const sa = B.map((_, i) => (ten[i] + kij[i]) / 2), sb = B.map((_, i) => i >= 51 ? mid(52, i) : NaN);
  // nuage à l'instant i = valeurs calculées 26 barres plus tôt
  const cloudA = B.map((_, i) => i >= 26 ? sa[i - 26] : NaN), cloudB = B.map((_, i) => i >= 26 ? sb[i - 26] : NaN);
  return { ten, kij, sa, sb, cloudA, cloudB };
};
MK.supertrend = (B, n = 10, m = 3) => {
  const a = MK.atr(B, n); const dir = Array(B.length).fill(0), line = Array(B.length).fill(NaN);
  let ub = NaN, lb = NaN, d = 1;
  for (let i = 0; i < B.length; i++) {
    if (!isFinite(a[i])) continue;
    const hl = (B[i].h + B[i].l) / 2, bu = hl + m * a[i], bl = hl - m * a[i];
    ub = !isFinite(ub) || bu < ub || B[i - 1].c > ub ? bu : ub;
    lb = !isFinite(lb) || bl > lb || B[i - 1].c < lb ? bl : lb;
    if (d === 1 && B[i].c < lb) d = -1; else if (d === -1 && B[i].c > ub) d = 1;
    dir[i] = d; line[i] = d === 1 ? lb : ub;
  }
  return { dir, line };
};
MK.psar = (B, step = 0.02, max = 0.2) => {
  const out = Array(B.length).fill(NaN), dir = Array(B.length).fill(0);
  if (B.length < 3) return { sar: out, dir };
  let up = B[1].c >= B[0].c, sar = up ? B[0].l : B[0].h, ep = up ? B[1].h : B[1].l, af = step;
  for (let i = 2; i < B.length; i++) {
    sar = sar + af * (ep - sar);
    if (up) {
      sar = Math.min(sar, B[i - 1].l, B[i - 2].l);
      if (B[i].l < sar) { up = false; sar = ep; ep = B[i].l; af = step; }
      else if (B[i].h > ep) { ep = B[i].h; af = Math.min(max, af + step); }
    } else {
      sar = Math.max(sar, B[i - 1].h, B[i - 2].h);
      if (B[i].h > sar) { up = true; sar = ep; ep = B[i].h; af = step; }
      else if (B[i].l < ep) { ep = B[i].l; af = Math.min(max, af + step); }
    }
    out[i] = sar; dir[i] = up ? 1 : -1;
  }
  return { sar: out, dir };
};
MK.heikin = B => { const o = []; B.forEach((b, i) => { const c = (b.o + b.h + b.l + b.c) / 4, op = i ? (o[i - 1].o + o[i - 1].c) / 2 : (b.o + b.c) / 2; o.push({ o: op, c, h: Math.max(b.h, op, c), l: Math.min(b.l, op, c) }); }); return o; };
MK.vwapWeek = B => { let pv = 0, vv = 0, wk = -1; return B.map(b => { const d = new Date(b.t), w = Math.floor((b.t / 864e5 + 3) / 7); if (w !== wk) { wk = w; pv = 0; vv = 0; } const tp = (b.h + b.l + b.c) / 3, v = b.v || 1; pv += tp * v; vv += v; return pv / vv; }); };

/* ---------- points pivots, structure, zones ---------- */
MK.swings = (B, k = 3) => {
  const out = [];
  for (let i = k; i < B.length - k; i++) {
    let hi = true, lo = true;
    for (let j = i - k; j <= i + k; j++) { if (j === i) continue; if (B[j].h >= B[i].h) hi = false; if (B[j].l <= B[i].l) lo = false; }
    if (hi) out.push({ i, t: B[i].t, p: B[i].h, type: 'H' });
    if (lo) out.push({ i, t: B[i].t, p: B[i].l, type: 'L' });
  }
  return out;
};
/* zigzag : retournements d'au moins `thr` (en prix) */
MK.zigzag = (B, thr) => {
  if (B.length < 3) return [];
  const pts = []; let dir = 0, ext = B[0].h, exti = 0, extl = B[0].l, extli = 0;
  for (let i = 1; i < B.length; i++) {
    const b = B[i];
    if (dir >= 0) { if (b.h > ext) { ext = b.h; exti = i; } if (ext - b.l >= thr && dir !== -1) { if (dir === 1 || pts.length === 0) pts.push({ i: exti, p: ext, type: 'H', t: B[exti].t }); dir = -1; extl = b.l; extli = i; continue; } }
    if (dir <= 0) { if (b.l < extl) { extl = b.l; extli = i; } if (b.h - extl >= thr && dir !== 1) { pts.push({ i: extli, p: extl, type: 'L', t: B[extli].t }); dir = 1; ext = b.h; exti = i; continue; } }
    if (dir === 1 && b.h > ext) { ext = b.h; exti = i; }
    if (dir === -1 && b.l < extl) { extl = b.l; extli = i; }
  }
  if (dir === 1) pts.push({ i: exti, p: ext, type: 'H', t: B[exti].t, open: true });
  if (dir === -1) pts.push({ i: extli, p: extl, type: 'L', t: B[extli].t, open: true });
  return pts;
};
MK.structure = (B, atr) => {
  const z = MK.zigzag(B, atr * 2);
  const H = z.filter(p => p.type === 'H' && !p.open), L = z.filter(p => p.type === 'L' && !p.open);
  const out = { zig: z, label: 'indéfinie', score: 0, lastH: MK.last(H), lastL: MK.last(L), bos: '' };
  if (H.length < 2 || L.length < 2) return out;
  const hh = MK.last(H).p > MK.last(H, 2).p, hl = MK.last(L).p > MK.last(L, 2).p;
  if (hh && hl) { out.label = 'Hausse (sommets et creux montants)'; out.score = 1; }
  else if (!hh && !hl) { out.label = 'Baisse (sommets et creux descendants)'; out.score = -1; }
  else if (hh && !hl) { out.label = 'Expansion (volatilité, pas de direction)'; out.score = 0; }
  else { out.label = 'Compression (triangle, marché qui se resserre)'; out.score = 0; }
  const c = MK.last(B).c;
  if (c > out.lastH.p) out.bos = out.score < 0 ? 'Changement de structure à la hausse (CHoCH) : le dernier sommet est cassé' : 'Cassure haussière du dernier sommet (BOS)';
  else if (c < out.lastL.p) out.bos = out.score > 0 ? 'Changement de structure à la baisse (CHoCH) : le dernier creux est cassé' : 'Cassure baissière du dernier creux (BOS)';
  if (/CHoCH/.test(out.bos)) { out.score = c > out.lastH.p ? 0.5 : -0.5; out.label = out.score > 0 ? 'Retournement haussier (CHoCH)' : 'Retournement baissier (CHoCH)'; }
  return out;
};
/* zones de support/résistance : regroupe les points pivots de plusieurs unités de temps */
MK.zones = (data, price, atrD) => {
  const pts = [];
  const add = (tf, w, k) => { const B = data[tf]; if (!B || B.length < 30) return; const n = B.length; MK.swings(B, k).forEach(s => { const age = (n - s.i) / n; pts.push({ p: s.p, w: w * (1.2 - age), type: s.type, tf, t: s.t }); }); };
  add('W1', 3, 2); add('D1', 2, 3); add('H4', 1, 4);
  pts.sort((a, b) => a.p - b.p);
  const tol = atrD * 0.45, Z = [];
  pts.forEach(p => { const z = Z.length && Math.abs(MK.last(Z).c - p.p) <= tol ? MK.last(Z) : null; if (z) { z.pts.push(p); z.c = z.pts.reduce((a, x) => a + x.p * x.w, 0) / z.pts.reduce((a, x) => a + x.w, 0); z.lo = Math.min(z.lo, p.p); z.hi = Math.max(z.hi, p.p); } else Z.push({ c: p.p, lo: p.p, hi: p.p, pts: [p] }); });
  Z.forEach(z => { z.score = z.pts.reduce((a, x) => a + x.w, 0); z.touches = z.pts.length; z.tfs = [...new Set(z.pts.map(x => x.tf))]; z.last = Math.max(...z.pts.map(x => x.t)); });
  const strong = Z.filter(z => z.score >= 2.2 || z.touches >= 2);
  const sup = strong.filter(z => z.c < price).sort((a, b) => b.c - a.c).slice(0, 4);
  const res = strong.filter(z => z.c > price).sort((a, b) => a.c - b.c).slice(0, 4);
  return { sup, res, all: strong };
};
MK.pivots = b => { // à partir de la barre précédente (jour ou semaine)
  const P = (b.h + b.l + b.c) / 3, r = b.h - b.l;
  return {
    classique: { R3: b.h + 2 * (P - b.l), R2: P + r, R1: 2 * P - b.l, P, S1: 2 * P - b.h, S2: P - r, S3: b.l - 2 * (b.h - P) },
    fibonacci: { R3: P + r, R2: P + 0.618 * r, R1: P + 0.382 * r, P, S1: P - 0.382 * r, S2: P - 0.618 * r, S3: P - r },
    camarilla: { R4: b.c + r * 1.1 / 2, R3: b.c + r * 1.1 / 4, R2: b.c + r * 1.1 / 6, R1: b.c + r * 1.1 / 12, S1: b.c - r * 1.1 / 12, S2: b.c - r * 1.1 / 6, S3: b.c - r * 1.1 / 4, S4: b.c - r * 1.1 / 2 }
  };
};
MK.fibo = (B, atr) => {
  const z = MK.zigzag(B, atr * 3).filter(p => !p.open);
  if (z.length < 2) return null;
  const a = MK.last(z, 2), b = MK.last(z);
  const up = b.p > a.p, rng = Math.abs(b.p - a.p);
  const lv = r => up ? b.p - rng * r : b.p + rng * r;
  const ext = r => up ? a.p + rng * r : a.p - rng * r;
  return { from: a, to: b, up, levels: [0.236, 0.382, 0.5, 0.618, 0.786].map(r => ({ r, p: lv(r) })), ext: [1.272, 1.618].map(r => ({ r, p: ext(r) })) };
};

/* ---------- divergences ---------- */
MK.divergences = (B, osc, name, k = 3) => {
  const sw = MK.swings(B, k).filter(s => s.i >= B.length - 80);
  const H = sw.filter(s => s.type === 'H'), L = sw.filter(s => s.type === 'L');
  const out = [];
  if (H.length >= 2) {
    const a = MK.last(H, 2), b = MK.last(H);
    if (isFinite(osc[a.i]) && isFinite(osc[b.i]) && B.length - b.i <= 25) {
      if (b.p > a.p && osc[b.i] < osc[a.i]) out.push({ sens: -1, kind: 'classique', txt: `Divergence baissière ${name} : le prix fait un plus haut, le ${name} non. Essoufflement des acheteurs.` });
      if (b.p < a.p && osc[b.i] > osc[a.i]) out.push({ sens: -1, kind: 'cachée', txt: `Divergence baissière cachée ${name} : la baisse a des chances de continuer.` });
    }
  }
  if (L.length >= 2) {
    const a = MK.last(L, 2), b = MK.last(L);
    if (isFinite(osc[a.i]) && isFinite(osc[b.i]) && B.length - b.i <= 25) {
      if (b.p < a.p && osc[b.i] > osc[a.i]) out.push({ sens: 1, kind: 'classique', txt: `Divergence haussière ${name} : le prix fait un plus bas, le ${name} non. Les vendeurs s'essoufflent.` });
      if (b.p > a.p && osc[b.i] < osc[a.i]) out.push({ sens: 1, kind: 'cachée', txt: `Divergence haussière cachée ${name} : la hausse a des chances de continuer.` });
    }
  }
  return out;
};

/* ---------- chandeliers japonais (3 dernières bougies clôturées) ---------- */
MK.candles = (B, trendDir) => {
  const out = []; const n = B.length; if (n < 5) return out;
  const body = b => Math.abs(b.c - b.o), rng = b => b.h - b.l || 1e-9, up = b => b.c > b.o;
  const uw = b => b.h - Math.max(b.o, b.c), lw = b => Math.min(b.o, b.c) - b.l;
  const avgBody = MK.mean(B.slice(-15).map(body));
  const look = [n - 1, n - 2];
  look.forEach(i => {
    const b = B[i], p = B[i - 1], q = B[i - 2], ago = n - 1 - i;
    const tag = (nom, sens, expl) => out.push({ nom, sens, expl, i, ago });
    if (body(b) <= rng(b) * 0.1) tag('Doji', 0, 'Indécision : acheteurs et vendeurs à égalité.');
    if (lw(b) >= 2 * body(b) && uw(b) <= body(b) * 0.6 && body(b) > 0) tag(trendDir < 0 ? 'Marteau' : 'Pendu', trendDir < 0 ? 1 : -1, trendDir < 0 ? 'Longue mèche basse après une baisse : les acheteurs ont rejeté les prix bas.' : 'Longue mèche basse après une hausse : signal de fragilité.');
    if (uw(b) >= 2 * body(b) && lw(b) <= body(b) * 0.6 && body(b) > 0) tag(trendDir > 0 ? 'Étoile filante' : 'Marteau inversé', trendDir > 0 ? -1 : 1, trendDir > 0 ? 'Longue mèche haute après une hausse : les vendeurs ont rejeté les prix hauts.' : 'Mèche haute après une baisse : tentative de reprise des acheteurs.');
    if (up(b) && !up(p) && b.c >= p.o && b.o <= p.c && body(b) > body(p)) tag('Avalement haussier', 1, 'La bougie verte englobe la rouge précédente : les acheteurs reprennent la main.');
    if (!up(b) && up(p) && b.o >= p.c && b.c <= p.o && body(b) > body(p)) tag('Avalement baissier', -1, 'La bougie rouge englobe la verte précédente : les vendeurs reprennent la main.');
    if (b.h < p.h && b.l > p.l) tag('Inside bar', 0, 'Bougie contenue dans la précédente : compression avant un mouvement.');
    if (body(b) >= rng(b) * 0.9 && body(b) > avgBody * 1.4) tag(up(b) ? 'Marubozu haussier' : 'Marubozu baissier', up(b) ? 1 : -1, 'Bougie pleine, sans mèche : domination nette d\'un camp.');
    if (!up(q) && body(p) <= body(q) * 0.35 && up(b) && b.c > (q.o + q.c) / 2) tag('Étoile du matin', 1, 'Trois bougies de retournement haussier.');
    if (up(q) && body(p) <= body(q) * 0.35 && !up(b) && b.c < (q.o + q.c) / 2) tag('Étoile du soir', -1, 'Trois bougies de retournement baissier.');
    if (up(b) && up(p) && up(q) && b.c > p.c && p.c > q.c && body(b) > avgBody * 0.8 && body(p) > avgBody * 0.8) tag('Trois soldats blancs', 1, 'Trois bougies vertes solides d\'affilée.');
    if (!up(b) && !up(p) && !up(q) && b.c < p.c && p.c < q.c && body(b) > avgBody * 0.8 && body(p) > avgBody * 0.8) tag('Trois corbeaux noirs', -1, 'Trois bougies rouges solides d\'affilée.');
    if (Math.abs(b.l - p.l) <= rng(b) * 0.05 && !up(p) && up(b)) tag('Double creux (tweezer bottom)', 1, 'Deux bougies sur le même plus bas : support défendu.');
    if (Math.abs(b.h - p.h) <= rng(b) * 0.05 && up(p) && !up(b)) tag('Double sommet (tweezer top)', -1, 'Deux bougies sur le même plus haut : résistance défendue.');
  });
  return out;
};
MK.mean = a => { const x = a.filter(isFinite); return x.length ? x.reduce((s, v) => s + v, 0) / x.length : NaN; };

/* ---------- figures chartistes simples ---------- */
MK.patterns = (B, atr) => {
  const out = []; const sw = MK.swings(B, 3).filter(s => s.i >= B.length - 120);
  const H = sw.filter(s => s.type === 'H'), L = sw.filter(s => s.type === 'L'), c = MK.last(B).c;
  if (H.length >= 2) { const a = MK.last(H, 2), b = MK.last(H); if (Math.abs(a.p - b.p) <= atr * 0.6 && b.i - a.i >= 8) { const neck = Math.min(...B.slice(a.i, b.i + 1).map(x => x.l)); out.push({ nom: 'Double sommet', sens: -1, expl: `Deux sommets vers ${MK.fmt(Math.max(a.p, b.p))}. Confirmé si le prix casse ${MK.fmt(neck)} (ligne de cou).`, confirme: c < neck, niveau: neck }); } }
  if (L.length >= 2) { const a = MK.last(L, 2), b = MK.last(L); if (Math.abs(a.p - b.p) <= atr * 0.6 && b.i - a.i >= 8) { const neck = Math.max(...B.slice(a.i, b.i + 1).map(x => x.h)); out.push({ nom: 'Double creux', sens: 1, expl: `Deux creux vers ${MK.fmt(Math.min(a.p, b.p))}. Confirmé si le prix casse ${MK.fmt(neck)} (ligne de cou).`, confirme: c > neck, niveau: neck }); } }
  if (H.length >= 3 && L.length >= 3) {
    const hs = H.slice(-3).map(x => x.p), ls = L.slice(-3).map(x => x.p);
    const down = hs[2] < hs[1] && hs[1] < hs[0], upL = ls[2] > ls[1] && ls[1] > ls[0];
    if (down && upL) out.push({ nom: 'Triangle symétrique', sens: 0, expl: 'Sommets descendants et creux montants : le marché se resserre avant de choisir un sens.' });
    else if (down && Math.abs(ls[2] - ls[1]) <= atr * 0.6) out.push({ nom: 'Triangle descendant', sens: -1, expl: `Sommets de plus en plus bas sur un support plat vers ${MK.fmt(ls[2])} : pression vendeuse.` });
    else if (upL && Math.abs(hs[2] - hs[1]) <= atr * 0.6) out.push({ nom: 'Triangle ascendant', sens: 1, expl: `Creux de plus en plus hauts sous une résistance plate vers ${MK.fmt(hs[2])} : pression acheteuse.` });
  }
  const H3 = H.slice(-3);
  if (H3.length === 3 && H3[1].p > H3[0].p && H3[1].p > H3[2].p && Math.abs(H3[0].p - H3[2].p) <= atr * 1.2 && H3[1].p - Math.max(H3[0].p, H3[2].p) >= atr) out.push({ nom: 'Épaule-tête-épaule possible', sens: -1, expl: 'Trois sommets dont celui du milieu plus haut : figure de retournement baissier à confirmer.' });
  const L3 = L.slice(-3);
  if (L3.length === 3 && L3[1].p < L3[0].p && L3[1].p < L3[2].p && Math.abs(L3[0].p - L3[2].p) <= atr * 1.2 && Math.min(L3[0].p, L3[2].p) - L3[1].p >= atr) out.push({ nom: 'Épaule-tête-épaule inversée possible', sens: 1, expl: 'Trois creux dont celui du milieu plus bas : figure de retournement haussier à confirmer.' });
  return out;
};

MK.fmt = (v, d) => { if (!isFinite(v)) return '—'; const dec = d !== undefined ? d : Math.abs(v) >= 1000 ? 0 : Math.abs(v) >= 10 ? 2 : 4; return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v); };

/* ---------- analyse d'une unité de temps ---------- */
MK.analyzeTF = (B, tf) => {
  if (!B || B.length < 60) return null;
  const c = B.map(b => b.c), n = B.length, i = n - 1, px = c[i];
  const E = { e9: MK.ema(c, 9), e20: MK.ema(c, 20), e50: MK.ema(c, 50), e100: MK.ema(c, 100), e200: MK.ema(c, 200), s20: MK.sma(c, 20), s50: MK.sma(c, 50), s200: MK.sma(c, 200) };
  const atrA = MK.atr(B, 14), atr = atrA[i];
  const rsi = MK.rsi(c, 14), mac = MK.macd(c), st = MK.stoch(B), adx = MK.adx(B), bb = MK.boll(c), kc = MK.keltner(B), don = MK.donchian(B, 20), ich = MK.ichimoku(B);
  const sup = MK.supertrend(B), sar = MK.psar(B), cci = MK.cci(B), wr = MK.willr(B), roc = MK.roc(c), mfi = MK.mfi(B), obv = MK.obv(B), cmf = MK.cmf(B), ha = MK.heikin(B);
  const vwap = ['M15', 'H1', 'H4'].includes(tf) ? MK.vwapWeek(B) : null;
  const struct = MK.structure(B, atr);
  const V = []; // votes { groupe, nom, val (-1..1), txt }
  const vote = (g, nom, val, txt) => V.push({ g, nom, val: MK.clamp(val), txt });
  const has = x => isFinite(x);
  // TENDANCE
  if (has(E.e200[i])) vote('tendance', 'Prix / EMA 200', px > E.e200[i] ? 1 : -1, `Prix ${px > E.e200[i] ? 'au-dessus' : 'en dessous'} de la moyenne 200 (${MK.fmt(E.e200[i])})`);
  if (has(E.e50[i]) && has(E.e200[i])) vote('tendance', 'EMA 50 / 200', E.e50[i] > E.e200[i] ? 1 : -1, E.e50[i] > E.e200[i] ? 'Moyenne 50 au-dessus de la 200 (tendance de fond haussière)' : 'Moyenne 50 sous la 200 (tendance de fond baissière)');
  if (has(E.e20[i]) && has(E.e50[i])) vote('tendance', 'EMA 20 / 50', E.e20[i] > E.e50[i] ? 1 : -1, `Moyenne 20 ${E.e20[i] > E.e50[i] ? 'au-dessus' : 'sous'} la 50`);
  const sl50 = MK.slope(E.e50, 10); if (has(sl50)) vote('tendance', 'Pente EMA 50', MK.clamp(sl50 / (atr / px * 100 * 1.5)), `Moyenne 50 ${sl50 > 0 ? 'montante' : 'descendante'}`);
  vote('tendance', 'Supertrend', sup.dir[i], `Supertrend ${sup.dir[i] > 0 ? 'acheteur' : 'vendeur'} (${MK.fmt(sup.line[i])})`);
  if (has(sar.sar[i])) vote('tendance', 'Parabolic SAR', sar.dir[i], `SAR ${sar.dir[i] > 0 ? 'sous le prix (hausse)' : 'au-dessus du prix (baisse)'}`);
  const cTop = Math.max(ich.cloudA[i], ich.cloudB[i]), cBot = Math.min(ich.cloudA[i], ich.cloudB[i]);
  if (has(cTop)) vote('tendance', 'Ichimoku', px > cTop ? 1 : px < cBot ? -1 : 0, px > cTop ? 'Prix au-dessus du nuage Ichimoku' : px < cBot ? 'Prix sous le nuage Ichimoku' : 'Prix dans le nuage Ichimoku (zone neutre)');
  if (has(ich.ten[i]) && has(ich.kij[i])) vote('tendance', 'Tenkan / Kijun', ich.ten[i] > ich.kij[i] ? 0.6 : -0.6, `Tenkan ${ich.ten[i] > ich.kij[i] ? 'au-dessus' : 'sous'} la Kijun`);
  if (has(adx.adx[i])) { const s = adx.adx[i] >= 25 ? 1 : adx.adx[i] >= 20 ? 0.6 : 0.25; vote('tendance', 'ADX / DI', (adx.pdi[i] > adx.mdi[i] ? 1 : -1) * s, `ADX ${MK.fmt(adx.adx[i], 0)} (${adx.adx[i] >= 25 ? 'tendance forte' : adx.adx[i] >= 20 ? 'tendance en place' : 'pas de vraie tendance'}), ${adx.pdi[i] > adx.mdi[i] ? 'acheteurs' : 'vendeurs'} dominants`); }
  vote('tendance', 'Structure', struct.score, `Structure : ${struct.label}`);
  const haUp = ha.slice(-3).filter(x => x.c > x.o).length; vote('tendance', 'Heikin Ashi', (haUp - 1.5) / 1.5, `${haUp}/3 dernières bougies Heikin Ashi vertes`);
  if (vwap) vote('tendance', 'VWAP semaine', px > vwap[i] ? 0.6 : -0.6, `Prix ${px > vwap[i] ? 'au-dessus' : 'sous'} le VWAP de la semaine (${MK.fmt(vwap[i])})`);
  // MOMENTUM
  const r = rsi[i];
  vote('momentum', 'RSI 14', r >= 70 ? 0.3 : r <= 30 ? -0.3 : (r - 50) / 15, `RSI ${MK.fmt(r, 0)}${r >= 70 ? ' : surachat' : r <= 30 ? ' : survente' : ''}`);
  vote('momentum', 'MACD', (mac.macd[i] > mac.signal[i] ? 0.6 : -0.6) + (mac.hist[i] > mac.hist[i - 1] ? 0.4 : -0.4), `MACD ${mac.macd[i] > mac.signal[i] ? 'au-dessus' : 'sous'} son signal, histogramme ${mac.hist[i] > mac.hist[i - 1] ? 'en hausse' : 'en baisse'}`);
  vote('momentum', 'Stochastique', st.k[i] >= 80 ? 0.2 : st.k[i] <= 20 ? -0.2 : (st.k[i] > st.d[i] ? 0.5 : -0.5), `Stochastique ${MK.fmt(st.k[i], 0)}${st.k[i] >= 80 ? ' (surachat)' : st.k[i] <= 20 ? ' (survente)' : ''}`);
  vote('momentum', 'CCI 20', MK.clamp(cci[i] / 150), `CCI ${MK.fmt(cci[i], 0)}`);
  vote('momentum', 'ROC 12', MK.clamp(roc[i] / (atr / px * 100 * 3)), `Variation sur 12 barres : ${roc[i] >= 0 ? '+' : ''}${MK.fmt(roc[i], 2)} %`);
  vote('momentum', 'Williams %R', (wr[i] + 50) / 50 * 0.6, `Williams %R ${MK.fmt(wr[i], 0)}`);
  // VOLUME (volume en ticks de MT5)
  const obvS = MK.slope(MK.ema(obv, 10).map(x => x + 1e9), 10);
  vote('volume', 'OBV', obv[i] > MK.ema(obv, 20)[i] ? 0.6 : -0.6, `OBV ${obv[i] > MK.ema(obv, 20)[i] ? 'au-dessus' : 'sous'} sa moyenne (flux ${obv[i] > MK.ema(obv, 20)[i] ? 'acheteur' : 'vendeur'})`);
  if (has(cmf[i])) vote('volume', 'CMF 20', MK.clamp(cmf[i] * 5), `Chaikin Money Flow ${MK.fmt(cmf[i], 2)}`);
  if (has(mfi[i])) vote('volume', 'MFI 14', mfi[i] >= 80 ? 0.2 : mfi[i] <= 20 ? -0.2 : (mfi[i] - 50) / 30, `Money Flow Index ${MK.fmt(mfi[i], 0)}`);
  const grp = g => MK.mean(V.filter(v => v.g === g).map(v => v.val));
  const trend = grp('tendance'), mom = grp('momentum'), vol = grp('volume');
  // volatilité
  const atrPct = atr / px * 100, atrRank = MK.pctRank(atrA.slice(-250), atr), bbw = bb.width[i], bbRank = MK.pctRank(bb.width.slice(-250), bbw);
  const squeeze = bb.up[i] < kc.up[i] && bb.lo[i] > kc.lo[i];
  const volLab = atrRank >= 0.9 ? 'extrême' : atrRank >= 0.7 ? 'élevée' : atrRank <= 0.2 ? 'basse' : 'normale';
  const vAvg = MK.mean(B.slice(-21, -1).map(b => b.v)), vSd = Math.sqrt(MK.mean(B.slice(-21, -1).map(b => (b.v - vAvg) ** 2))) || 1, vZ = (B[i].v - vAvg) / vSd;
  const divs = [...MK.divergences(B, rsi, 'RSI'), ...MK.divergences(B, mac.hist, 'MACD')];
  const cand = MK.candles(B, trend > 0.15 ? 1 : trend < -0.15 ? -1 : 0);
  const pat = MK.patterns(B, atr);
  let bonus = 0; divs.forEach(d => bonus += d.sens * 0.08); cand.forEach(x => bonus += x.sens * 0.04); pat.forEach(p => bonus += p.sens * (p.confirme ? 0.08 : 0.03));
  const score = MK.clamp(0.55 * trend + 0.35 * mom + 0.1 * (isFinite(vol) ? vol : 0) + bonus);
  const ext = (px - E.e20[i]) / atr; // éloignement de la moyenne 20 en ATR
  return {
    tf, n, px, t: B[i].t, atr, atrPct, atrRank, volLab, squeeze, bbw, bbRank, vZ,
    E, rsi, mac, st, adx, bb, kc, don, ich, sup, sar, cci, wr, roc, mfi, obv, cmf, vwap, ha, atrA,
    V, trend, mom, vol, score, struct, divs, cand, pat, ext,
    dir: score > 0.15 ? 1 : score < -0.15 ? -1 : 0
  };
};

/* ---------- statistiques sur données journalières / horaires ---------- */
MK.stats = (D, H, sym) => {
  if (!D || D.length < 30) return null;
  const c = D.map(b => b.c), n = c.length, px = c[n - 1];
  const chg = k => n > k ? (px / c[n - 1 - k] - 1) * 100 : NaN;
  const lr = c.slice(1).map((v, i) => Math.log(v / c[i]));
  const ann = sym === 'BTCUSD' ? 365 : 252;
  const vol30 = Math.sqrt(MK.mean(lr.slice(-30).map(x => x * x))) * Math.sqrt(ann) * 100;
  const vol90 = Math.sqrt(MK.mean(lr.slice(-90).map(x => x * x))) * Math.sqrt(ann) * 100;
  const y = D.slice(-Math.min(n, sym === 'BTCUSD' ? 365 : 260));
  const hi52 = Math.max(...y.map(b => b.h)), lo52 = Math.min(...y.map(b => b.l));
  const ath = Math.max(...D.map(b => b.h));
  const yr = new Date(D[n - 1].t).getUTCFullYear(); const jan = D.find(b => new Date(b.t).getUTCFullYear() === yr);
  const ytd = jan ? (px / jan.o - 1) * 100 : NaN;
  // jour de la semaine (rendement moyen) et heure (amplitude moyenne)
  const wd = Array(7).fill(0).map(() => []); for (let k = Math.max(1, n - 260); k < n; k++) wd[new Date(D[k].t).getUTCDay()].push((D[k].c / D[k - 1].c - 1) * 100);
  const hr = Array(24).fill(0).map(() => []); (H || []).slice(-24 * 90).forEach(b => hr[new Date(b.t).getUTCHours()].push((b.h - b.l) / b.o * 100));
  // plus forte série
  let up = 0, dn = 0; for (let k = n - 1; k > 0; k--) { if (c[k] > c[k - 1] && dn === 0) up++; else if (c[k] < c[k - 1] && up === 0) dn++; else break; }
  return {
    px, d1: chg(1), w1: chg(sym === 'BTCUSD' ? 7 : 5), m1: chg(sym === 'BTCUSD' ? 30 : 21), m3: chg(sym === 'BTCUSD' ? 90 : 63), y1: chg(sym === 'BTCUSD' ? 365 : 252), ytd,
    vol30, vol90, hi52, lo52, ath, fromAth: (px / ath - 1) * 100, fromHi52: (px / hi52 - 1) * 100, fromLo52: (px / lo52 - 1) * 100,
    wd: wd.map(a => ({ n: a.length, m: MK.mean(a), up: a.length ? a.filter(x => x > 0).length / a.length : NaN })),
    hr: hr.map(a => MK.mean(a)), streak: up ? `${up} hausse${up > 1 ? 's' : ''} de suite` : dn ? `${dn} baisse${dn > 1 ? 's' : ''} de suite` : ''
  };
};
MK.corr = (A, B, k = 30) => {
  if (!A || !B) return NaN;
  const mapB = new Map(B.map(b => [Math.floor(b.t / 864e5), b.c]));
  const pairs = []; A.forEach(a => { const d = Math.floor(a.t / 864e5); if (mapB.has(d)) pairs.push([a.c, mapB.get(d)]); });
  if (pairs.length < k + 2) return NaN;
  const p = pairs.slice(-(k + 1)), ra = p.slice(1).map((x, i) => Math.log(x[0] / p[i][0])), rb = p.slice(1).map((x, i) => Math.log(x[1] / p[i][1]));
  const ma = MK.mean(ra), mb = MK.mean(rb);
  let s = 0, sa = 0, sb = 0; ra.forEach((x, i) => { s += (x - ma) * (rb[i] - mb); sa += (x - ma) ** 2; sb += (rb[i] - mb) ** 2; });
  return s / Math.sqrt(sa * sb);
};

/* ---------- niveaux clés ---------- */
MK.keyLevels = (data, px, atrD, sym) => {
  const D = data.D1, W = data.W1, L = [];
  const add = (p, nom, src, poids) => { if (isFinite(p)) L.push({ p, nom, src, poids }); };
  if (D && D.length > 2) { const y = D[D.length - 2]; add(y.h, 'Plus haut d\'hier', 'jour', 2); add(y.l, 'Plus bas d\'hier', 'jour', 2); add(y.c, 'Clôture d\'hier', 'jour', 1); }
  if (W && W.length > 2) { const w = W[W.length - 2]; add(w.h, 'Plus haut de la semaine dernière', 'semaine', 3); add(w.l, 'Plus bas de la semaine dernière', 'semaine', 3); }
  if (D && D.length > 25) { const m = D.slice(-22, -1); add(Math.max(...m.map(b => b.h)), 'Plus haut sur 1 mois', 'mois', 2); add(Math.min(...m.map(b => b.l)), 'Plus bas sur 1 mois', 'mois', 2); }
  if (D && D.length > 60) { const y = D.slice(-(sym === 'BTCUSD' ? 365 : 260)); add(Math.max(...y.map(b => b.h)), 'Plus haut sur 12 mois', 'année', 3); add(Math.min(...y.map(b => b.l)), 'Plus bas sur 12 mois', 'année', 3); }
  const step = sym === 'BTCUSD' ? (px > 50000 ? 5000 : 1000) : 100;
  const r0 = Math.floor(px / step) * step; [r0 - step, r0, r0 + step, r0 + 2 * step].forEach(p => add(p, 'Chiffre rond', 'psychologique', 1));
  const ema200D = data.D1 ? MK.last(MK.ema(data.D1.map(b => b.c), 200)) : NaN; add(ema200D, 'Moyenne 200 jours', 'moyenne', 3);
  const ma200W = data.W1 && data.W1.length >= 200 ? MK.last(MK.sma(data.W1.map(b => b.c), 200)) : NaN; add(ma200W, 'Moyenne 200 semaines', 'moyenne', 3);
  return L.filter(x => Math.abs(x.p - px) <= atrD * 8).sort((a, b) => b.p - a.p);
};

/* ---------- analyse complète d'un marché ---------- */
MK.analyze = (sym, data, opts = {}) => {
  const T = {}; MK.TFS.forEach(tf => { T[tf] = MK.analyzeTF(data[tf], tf); });
  const base = T.H1 || T.H4 || T.D1; if (!base) return null;
  const lastBar = (data.M15 || data.H1 || data.H4 || data.D1).slice(-1)[0];
  const px = lastBar.c;
  const atrD = T.D1 ? T.D1.atr : base.atr * 4;
  // score multi-unités de temps
  let s = 0, w = 0; Object.keys(MK.TF_WEIGHT).forEach(tf => { if (T[tf]) { s += T[tf].score * MK.TF_WEIGHT[tf]; w += MK.TF_WEIGHT[tf]; } });
  const tech = w ? s / w : 0;
  const zones = MK.zones(data, px, atrD);
  const fibo = T.D1 ? MK.fibo(data.D1, T.D1.atr) : null;
  const piv = { jour: data.D1 && data.D1.length > 1 ? MK.pivots(data.D1[data.D1.length - 2]) : null, semaine: data.W1 && data.W1.length > 1 ? MK.pivots(data.W1[data.W1.length - 2]) : null };
  const keys = MK.keyLevels(data, px, atrD, sym);
  const stats = MK.stats(data.D1, data.H1, sym);
  // fondamental
  const F = opts.fonda && opts.fonda[sym];
  const fonda = F ? F.biais : 0;
  // verdict
  const why = [], warn = [];
  const d1 = T.D1 ? T.D1.score : 0, h4 = T.H4 ? T.H4.score : 0, h1 = T.H1 ? T.H1.score : 0;
  let verdict = 'ATTENDRE', sens = 0;
  if (tech >= 0.2) { verdict = 'ACHAT'; sens = 1; } else if (tech <= -0.2) { verdict = 'VENTE'; sens = -1; }
  if (sens && T.D1 && T.H4 && Math.sign(d1) !== Math.sign(h4) && Math.abs(d1) > 0.2 && Math.abs(h4) > 0.2) { warn.push('Le graphique jour et le graphique 4 h vont dans des sens opposés : signal peu fiable.'); verdict = 'ATTENDRE'; }
  const ref = T.H4 || base;
  if (sens > 0 && (ref.rsi[ref.n - 1] >= 72 || ref.ext >= 2.2)) warn.push('Le prix est déjà loin au-dessus de sa moyenne (surachat) : mieux vaut attendre un repli que courir après.');
  if (sens < 0 && (ref.rsi[ref.n - 1] <= 28 || ref.ext <= -2.2)) warn.push('Le prix est déjà très loin sous sa moyenne (survente) : un rebond technique peut arriver à tout moment, ne pas vendre au plus bas.');
  const nextEv = opts.events ? opts.events.find(e => e.ts > Date.now() && e.ts - Date.now() <= 3 * 36e5 && e.imp >= 3) : null;
  if (nextEv) { warn.push(`Annonce importante dans moins de 3 h (${nextEv.e}) : forte volatilité possible.`); }
  if (T.H1 && T.H1.volLab === 'extrême') warn.push('Volatilité extrême en ce moment : les stops sautent facilement.');
  const nuance = sens && warn.length ? (verdict === 'ATTENDRE' ? '' : 'avec prudence') : '';
  if (sens > 0 && warn.some(x => /surachat|Annonce/.test(x)) && verdict !== 'ATTENDRE') verdict = 'ATTENDRE';
  if (sens < 0 && warn.some(x => /survente|Annonce/.test(x)) && verdict !== 'ATTENDRE') verdict = 'ATTENDRE';
  const conf = Math.round(Math.min(95, Math.abs(tech) * 100 * (1 - 0.15 * warn.length) + (Object.values(T).filter(t => t && Math.sign(t.score) === Math.sign(tech)).length >= 4 ? 10 : 0)));
  // raisons principales : votes les plus forts du D1 et du H4
  const top = [];
  ['D1', 'H4'].forEach(tf => { if (!T[tf]) return; T[tf].V.filter(v => Math.sign(v.val) === Math.sign(tech || 1) && Math.abs(v.val) >= 0.6).slice(0, 3).forEach(v => top.push(`${MK.TF_LABEL[tf]} : ${v.txt}`)); });
  // plans (scénarios)
  const sup = zones.sup[0], res = zones.res[0];
  const atrH4 = T.H4 ? T.H4.atr : base.atr * 2;
  const plan = sd => {
    if (sd > 0) {
      const entry = sup && px - sup.hi <= atrD * 1.5 ? sup.hi : (T.H4 ? T.H4.E.e20[T.H4.n - 1] : px);
      const stop = (sup ? Math.min(sup.lo, entry - atrH4) : entry - 1.5 * atrH4) - 0.3 * atrH4;
      const R1 = entry - stop, tg = zones.res.filter(z => z.lo - entry >= 1.2 * R1).slice(0, 2).map(z => z.lo);
      if (!tg.length) tg.push(entry + 2 * R1);
      return { sens: 1, entry, stop, tg, rr: (tg[0] - entry) / (entry - stop), trig: `Clôture 1 h au-dessus de ${MK.fmt(Math.max(entry, T.H1 ? MK.last(data.H1.slice(-6).map(b => b.h)) : entry))} avec bougie verte franche` };
    }
    const entry = res && res.lo - px <= atrD * 1.5 ? res.lo : (T.H4 ? T.H4.E.e20[T.H4.n - 1] : px);
    const stop = (res ? Math.max(res.hi, entry + atrH4) : entry + 1.5 * atrH4) + 0.3 * atrH4;
    const R1 = stop - entry, tg = zones.sup.filter(z => entry - z.hi >= 1.2 * R1).slice(0, 2).map(z => z.hi);
    if (!tg.length) tg.push(entry - 2 * R1);
    return { sens: -1, entry, stop, tg, rr: (entry - tg[0]) / (stop - entry), trig: `Clôture 1 h sous ${MK.fmt(Math.min(entry, T.H1 ? Math.min(...data.H1.slice(-6).map(b => b.l)) : entry))} avec bougie rouge franche` };
  };
  return { sym, px, t: lastBar.t, T, tech, fonda, global: MK.clamp(0.75 * tech + 0.25 * fonda), verdict, sens, conf, warn, top, zones, fibo, piv, keys, stats, atrD, plans: [plan(1), plan(-1)], nextEv };
};

/* ---------- « pourquoi ça bouge » (règles, à partir des chiffres) ---------- */
MK.why = (A, F, events) => {
  const out = []; if (!A || !A.stats) return out;
  const s = A.stats, d = A.T.D1, nm = MK.NAME[A.sym];
  const atrPct = d ? d.atrPct : NaN;
  if (isFinite(s.d1)) {
    const ratio = Math.abs(s.d1) / (atrPct || 1);
    out.push(`${nm} ${s.d1 >= 0 ? 'gagne' : 'perd'} ${MK.fmt(Math.abs(s.d1), 2)} % sur la dernière séance : un mouvement ${ratio >= 1.6 ? 'anormalement fort' : ratio >= 0.9 ? 'normal à soutenu' : 'calme'} pour ce marché (amplitude moyenne ${MK.fmt(atrPct, 2)} %).`);
  }
  if (isFinite(s.w1)) out.push(`Sur une semaine : ${s.w1 >= 0 ? '+' : ''}${MK.fmt(s.w1, 1)} %, sur un mois : ${s.m1 >= 0 ? '+' : ''}${MK.fmt(s.m1, 1)} %. ${s.streak ? 'Séries : ' + s.streak + '.' : ''}`);
  if (d && d.struct.bos) out.push(d.struct.bos + ' sur le graphique jour.');
  const crossed = (A.keys || []).filter(k => { const D = A.T.D1; if (!D) return false; const prev = D.px / (1 + (s.d1 || 0) / 100); return (prev - k.p) * (A.px - k.p) < 0; });
  crossed.slice(0, 2).forEach(k => out.push(`Le prix vient de ${A.px > k.p ? 'repasser au-dessus' : 'casser sous'} ${k.nom.toLowerCase()} (${MK.fmt(k.p)}) : beaucoup de traders réagissent à ce niveau.`));
  if (A.T.H1 && A.T.H1.vZ >= 2) out.push('Volume (ticks) nettement supérieur à la normale sur la dernière heure : le mouvement est suivi.');
  if (F) F.pourquoi.slice(0, 3).forEach(x => out.push(x));
  const recent = (events || []).filter(e => e.ts <= Date.now() && Date.now() - e.ts <= 4 * 864e5 && e.imp >= 3).slice(-2);
  recent.forEach(e => out.push(`Annonce récente : ${e.e}${e.res ? ' (' + e.res + ')' : ''}.`));
  return out;
};

/* ---------- zones institutionnelles : FVG, order blocks, liquidité ---------- */
MK.fvg = (B, atr, maxAge = 150) => {
  const out = [], n = B.length, px = B[n - 1].c;
  for (let i = Math.max(2, n - maxAge); i < n; i++) {
    const a = B[i - 2], c = B[i];
    let z = null;
    if (a.h < c.l && c.l - a.h >= atr * 0.15) z = { sens: 1, lo: a.h, hi: c.l, i, t: c.t };
    if (a.l > c.h && a.l - c.h >= atr * 0.15) z = { sens: -1, lo: c.h, hi: a.l, i, t: c.t };
    if (!z) continue;
    let filled = false;
    for (let k = i + 1; k < n; k++) { if (z.sens > 0 && B[k].l <= z.lo) { filled = true; break; } if (z.sens < 0 && B[k].h >= z.hi) { filled = true; break; } }
    if (!filled) { z.dist = (z.sens > 0 ? px - z.hi : z.lo - px); out.push(z); }
  }
  return out.filter(z => Math.abs(z.dist) <= atr * 6).sort((x, y) => Math.abs(x.dist) - Math.abs(y.dist)).slice(0, 6);
};
MK.orderBlocks = (B, atr, maxAge = 200) => {
  const out = [], n = B.length, px = B[n - 1].c;
  for (let i = Math.max(1, n - maxAge); i < n - 3; i++) {
    const b = B[i], mv = B[i + 3].c - b.c;
    let z = null;
    if (b.c < b.o && mv >= atr * 2) z = { sens: 1, lo: b.l, hi: Math.max(b.o, b.c), i, t: b.t };
    if (b.c > b.o && -mv >= atr * 2) z = { sens: -1, lo: Math.min(b.o, b.c), hi: b.h, i, t: b.t };
    if (!z) continue;
    let used = false;
    for (let k = i + 4; k < n; k++) { if (z.sens > 0 && B[k].c < z.lo) { used = true; break; } if (z.sens < 0 && B[k].c > z.hi) { used = true; break; } }
    if (!used) { z.dist = z.sens > 0 ? px - z.hi : z.lo - px; out.push(z); }
  }
  const dedup = []; out.sort((x, y) => Math.abs(x.dist) - Math.abs(y.dist)).forEach(z => { if (!dedup.some(d => d.sens === z.sens && Math.abs(d.lo - z.lo) < atr * 0.5)) dedup.push(z); });
  return dedup.filter(z => Math.abs(z.dist) <= atr * 8).slice(0, 5);
};
MK.liquidity = (B, atr) => {
  const sw = MK.swings(B, 3).filter(s => s.i >= B.length - 200), px = MK.last(B).c, pools = [];
  ['H', 'L'].forEach(tp => {
    const S = sw.filter(s => s.type === tp).sort((a, b) => a.p - b.p);
    S.forEach(s => { const g = pools.find(p => p.type === tp && Math.abs(p.p - s.p) <= atr * 0.25); if (g) { g.n++; g.p = (g.p * (g.n - 1) + s.p) / g.n; } else pools.push({ type: tp, p: s.p, n: 1 }); });
  });
  return pools.filter(p => (p.type === 'H' ? p.p > px : p.p < px)).map(p => ({ ...p, force: p.n + (p.n >= 2 ? 1 : 0) })).sort((a, b) => Math.abs(a.p - px) - Math.abs(b.p - px)).slice(0, 10);
};

/* ---------- heure de Paris ---------- */
MK.parisFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' });
MK.parisHour = ms => +MK.parisFmt.format(new Date(ms));
MK.parisDay = ms => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date(ms));
MK.session = ms => { const h = new Date(ms).getUTCHours(); return h >= 23 || h < 7 ? 'Asie' : h < 12 ? 'Londres' : h < 16 ? 'Londres + NY' : h < 21 ? 'New York' : 'Fermeture'; };

/* ---------- statistiques de sessions, d'heures et de saison ---------- */
MK.sessionStats = (H, days = 90) => {
  if (!H || H.length < 48) return null;
  const from = MK.last(H).t - days * 864e5, by = new Map();
  H.filter(b => b.t >= from).forEach(b => { const d = MK.parisDay(b.t); if (!by.has(d)) by.set(d, []); by.get(d).push(b); });
  const S = { Asie: [], Londres: [], 'New York': [] }, hiH = Array(24).fill(0), loH = Array(24).fill(0), rngH = Array(24).fill(0).map(() => []), adr = [];
  by.forEach(list => {
    if (list.length < 12) return;
    const hi = list.reduce((a, b) => b.h > a.h ? b : a), lo = list.reduce((a, b) => b.l < a.l ? b : a);
    hiH[MK.parisHour(hi.t)]++; loH[MK.parisHour(lo.t)]++;
    adr.push(Math.max(...list.map(b => b.h)) - Math.min(...list.map(b => b.l)));
    const grp = { Asie: [], Londres: [], 'New York': [] };
    list.forEach(b => { rngH[MK.parisHour(b.t)].push(b.h - b.l); const s = MK.session(b.t); if (s === 'Asie') grp.Asie.push(b); else if (s === 'Londres') grp.Londres.push(b); else if (s === 'New York' || s === 'Londres + NY') grp['New York'].push(b); });
    Object.keys(grp).forEach(k => { if (grp[k].length) S[k].push(Math.max(...grp[k].map(b => b.h)) - Math.min(...grp[k].map(b => b.l))); });
  });
  const nd = adr.length || 1;
  return { days: adr.length, adr: MK.mean(adr), sess: Object.keys(S).map(k => ({ k, avg: MK.mean(S[k]), last: MK.last(S[k]) })), hiP: hiH.map(v => v / nd), loP: loH.map(v => v / nd), rngH: rngH.map(a => MK.mean(a)) };
};
MK.today = (H, adr) => {
  if (!H || !H.length) return null;
  const d = MK.parisDay(MK.last(H).t), list = H.filter(b => MK.parisDay(b.t) === d);
  if (!list.length) return null;
  const hi = Math.max(...list.map(b => b.h)), lo = Math.min(...list.map(b => b.l));
  return { hi, lo, open: list[0].o, rng: hi - lo, used: adr ? (hi - lo) / adr : NaN };
};
MK.seasonality = (M) => { // M = barres mensuelles
  if (!M || M.length < 24) return null;
  const by = Array(12).fill(0).map(() => []);
  M.forEach((b, i) => { if (!i) return; by[new Date(b.t).getUTCMonth()].push((b.c / M[i - 1].c - 1) * 100); });
  return by.map(a => ({ n: a.length, avg: MK.mean(a), up: a.length ? a.filter(x => x > 0).length / a.length : NaN }));
};
MK.toMonthly = D => { if (!D) return null; const m = new Map(); D.forEach(b => { const k = new Date(b.t).toISOString().slice(0, 7); const o = m.get(k); if (!o) m.set(k, { t: Date.parse(k + '-01T00:00:00Z'), o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }); else { o.h = Math.max(o.h, b.h); o.l = Math.min(o.l, b.l); o.c = b.c; o.v += b.v; } }); return [...m.values()]; };

/* ---------- historique des dernières séances ---------- */
MK.sessionsHistory = (D, atrPct, markets, k = 7) => {
  if (!D || D.length < k + 2) return [];
  const out = [];
  for (let i = D.length - k; i < D.length; i++) {
    const b = D[i], p = D[i - 1], pct = (b.c / p.c - 1) * 100, r = Math.abs(pct) / (atrPct || 1);
    const lab = r < 0.45 ? 'CALME' : r < 0.9 ? (pct > 0 ? 'HAUSSE' : 'BAISSE') : r < 1.6 ? (pct > 0 ? 'FORTE HAUSSE' : 'FORTE BAISSE') : (pct > 0 ? 'HAUSSE VIOLENTE' : 'CHUTE VIOLENTE');
    const day = new Date(b.t).toISOString().slice(0, 10), drv = [];
    (markets || []).forEach(m => { const s = m.d; const j = s.findIndex(x => new Date(x[0]).toISOString().slice(0, 10) === day); if (j > 0) drv.push({ nom: m.nom, ch: (s[j][1] / s[j - 1][1] - 1) * 100, rel: m.rel }); });
    out.push({ t: b.t, pct, abs: b.c - p.c, rng: b.h - b.l, lab, drv });
  }
  return out;
};
