/* ═══════════════ STRATÉGIE DU BOT v2 (BTC 1 · XAU 3) — mêmes règles que mtf_indicators.py / mtf_niveaux.py / mtf_bot.py ═══════════════ */
const MKB = {};
MKB.SEC = { M5: 300, M15: 900, H1: 3600, H4: 14400, D1: 86400 };
MKB.STRAT = {
  BTCUSD: {
    nom: 'BTC 1 · repli dans la tendance H1', court: 'BTC 1', risque: 1.0, cout: 20,
    conditions: [['M15:stoch_ext', 1], ['H1:ema50', 1], ['H1:er_haut', 1]],
    stop: { marge: 0.2, dmin: 1.0, dmax: 4.0, histH: 72, rond: 1000 },
    smart: { conditions: ['M15:bb_ext', 'M15:stoch_ext'], enGain: false }, dureeM15: 48,
    backtest: { periode: '2019 → oct. 2026', trades: 1450, R: 238.9, gagnants: 61, pf: 1.46, dd: -10 },
  },
  XAUUSD: {
    nom: 'XAU 3 · momentum M15 + H4', court: 'XAU 3', risque: 0.5, cout: 0.35,
    conditions: [['M15:roc10', 1], ['H4:roc10@1', 1], ['H4:vol_haute@1', 1]],
    stop: { marge: 0.2, dmin: 1.5, dmax: 5.0, histH: 72, rond: 50 },
    smart: { conditions: ['M15:ema20', 'M15:pente50', 'H4:roc10'], enGain: true }, dureeM15: 96,
    backtest: { periode: '2019 → oct. 2026', trades: 1317, R: 160.9, gagnants: 43, pf: 1.24, dd: -32 },
  },
};
MKB.LIB = {
  stoch_ext: ['Stochastique', 'survente < 20 → achat · surachat > 80 → vente'], ema50: ['Prix / EMA 50', 'au-dessus → achat · en dessous → vente'],
  er_haut: ['Marché directionnel', 'efficacité > 0,30'], roc10: ['Momentum 10 bougies', 'positif → achat · négatif → vente'],
  vol_haute: ['Volatilité haute', 'ATR au-dessus de sa médiane 200'], bb_ext: ['Bollinger', 'clôture hors de la bande'],
  ema20: ['Prix / EMA 20', ''], pente50: ['Pente EMA 50', ''],
};
// ---------- outils (mêmes formules que pandas) ----------
MKB.ema = (x, n) => { const a = 2 / (n + 1), o = new Array(x.length); let p = x[0]; for (let i = 0; i < x.length; i++) { p = i ? a * x[i] + (1 - a) * p : x[0]; o[i] = p; } return o; };
MKB.wilder = (x, n) => { const a = 1 / n, o = new Array(x.length); let p = x[0]; for (let i = 0; i < x.length; i++) { p = i ? a * x[i] + (1 - a) * p : x[0]; o[i] = p; } return o; };
MKB.roll = (x, n, f) => x.map((_, i) => i < n - 1 ? NaN : f(x.slice(i - n + 1, i + 1)));
MKB.etats = B => {
  const n = B.length, c = B.map(b => b.c), h = B.map(b => b.h), l = B.map(b => b.l), sg = v => (v > 0 ? 1 : v < 0 ? -1 : 0);
  const e20 = MKB.ema(c, 20), e50 = MKB.ema(c, 50);
  const S = { ema20: [], ema50: [], pente50: [], stoch_ext: [], bb_ext: [], roc10: [] }, F = { er_haut: [], vol_haute: [] };
  const tr = c.map((_, i) => { const pc = i ? c[i - 1] : c[0]; return Math.max(h[i] - l[i], Math.abs(h[i] - pc), Math.abs(l[i] - pc)); });
  const a14 = MKB.wilder(tr, 14);
  const med = new Array(n).fill(NaN);
  for (let i = 199; i < n; i++) { const w = a14.slice(i - 199, i + 1).sort((p, q) => p - q); med[i] = (w[99] + w[100]) / 2; }
  let ad = new Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    S.ema20.push(sg(c[i] - e20[i])); S.ema50.push(sg(c[i] - e50[i]));
    S.pente50.push(i >= 5 ? sg(e50[i] - e50[i - 5]) : 0);
    let k = NaN; if (i >= 13) { let lo = Infinity, hi = -Infinity; for (let j = i - 13; j <= i; j++) { lo = Math.min(lo, l[j]); hi = Math.max(hi, h[j]); } k = hi - lo === 0 ? NaN : 100 * (c[i] - lo) / (hi - lo); }
    S.stoch_ext.push(k < 20 ? 1 : k > 80 ? -1 : 0);
    let bb = 0; if (i >= 19) { const w = c.slice(i - 19, i + 1), m = w.reduce((s, v) => s + v, 0) / 20, sd = Math.sqrt(w.reduce((s, v) => s + (v - m) ** 2, 0) / 20); bb = c[i] < m - 2 * sd ? 1 : c[i] > m + 2 * sd ? -1 : 0; }
    S.bb_ext.push(bb);
    S.roc10.push(i >= 10 ? sg(c[i] / c[i - 10] - 1) : 0);
    let er = NaN; if (i >= 14) { let s = 0; for (let j = i - 13; j <= i; j++) s += Math.abs(c[j] - c[j - 1]); er = Math.abs(c[i] - c[i - 14]) / s; }
    ad[i] = er;
    F.er_haut.push(er > 0.30);
    F.vol_haute.push(a14[i] > med[i]);
  }
  return { S, F, a14, er: ad };
};
// ---------- contexte : états calculés une fois par unité de temps ----------
MKB.contexte = C => {
  const X = {};
  ['M15', 'H1', 'H4', 'D1'].forEach(tf => { const B = C[tf]; if (!B || B.length < 60) return; X[tf] = { B, ends: B.map(b => b.t / 1000 + MKB.SEC[tf]), ...MKB.etats(B) }; });
  return X;
};
MKB.idx = (arr, T) => { let lo = 0, hi = arr.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= T) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
MKB.val = (X, nom, T) => {
  const [tf, ind0] = nom.split(':'), prec = ind0.endsWith('@1'), ind = ind0.replace('@1', ''), x = X[tf];
  if (!x) return null;
  const i = MKB.idx(x.ends, prec ? T - 900 : T); if (i < 0) return null;
  return ind in x.F ? !!x.F[ind][i] : x.S[ind][i];
};
MKB.ok = (v, pol, cote) => v === null || v === undefined ? false : typeof v === 'boolean' ? v : v * pol === cote;
// ---------- stop sur point stratégique ----------
MKB.pivots = (B, look, sec, t0, T) => {
  const out = [], n = B.length;
  for (let i = look; i < n - look; i++) {
    const conf = B[i + look].t / 1000 + sec; if (conf < t0 || conf > T) continue;
    let mx = -Infinity, mn = Infinity; for (let j = i - look; j <= i + look; j++) { mx = Math.max(mx, B[j].h); mn = Math.min(mn, B[j].l); }
    if (B[i].h === mx) out.push({ p: B[i].h, src: 'sommet ' + (sec === 900 ? 'M15' : 'H1') });
    if (B[i].l === mn) out.push({ p: B[i].l, src: 'creux ' + (sec === 900 ? 'M15' : 'H1') });
  }
  return out;
};
MKB.niveaux = (X, T, prix, cfg) => {
  const t0 = T - cfg.histH * 3600, out = [];
  [['M15', 5, 900], ['H1', 3, 3600]].forEach(([tf, look, sec]) => { const x = X[tf]; if (!x) return; const i = MKB.idx(x.ends, T); const B = x.B.slice(Math.max(0, i - (tf === 'M15' ? 400 : 120) + 1), i + 1); out.push(...MKB.pivots(B, look, sec, t0, T)); });
  const d = X.D1; if (d) { const i = MKB.idx(d.ends, T); if (i >= 0) out.push({ p: d.B[i].h, src: 'plus haut de la veille' }, { p: d.B[i].l, src: 'plus bas de la veille' }); }
  const base = Math.floor(prix / cfg.rond) * cfg.rond; for (let k = -5; k <= 6; k++) out.push({ p: base + cfg.rond * k, src: 'chiffre rond' });
  return out;
};
MKB.stop = (X, T, prix, cote, atr, cfg) => {
  if (!(atr > 0)) return null;
  const lv = MKB.niveaux(X, T, prix, cfg), buf = cfg.marge * atr, dmin = cfg.dmin * atr, dmax = cfg.dmax * atr;
  const cand = (cote === 1 ? lv.filter(x => x.p < prix).sort((a, b) => b.p - a.p) : lv.filter(x => x.p > prix).sort((a, b) => a.p - b.p));
  for (const x of cand) { const s = x.p - cote * buf, d = (prix - s) * cote; if (d >= dmin) return d <= dmax ? { sl: s, niveau: x.p, src: x.src, dAtr: d / atr } : null; }
  return null;
};
// ---------- décision à une clôture d'heure ----------
MKB.decision = (sym, X, T) => {
  const s = MKB.STRAT[sym], conds = s.conditions.map(([nm, pol]) => { const v = MKB.val(X, nm, T); return { nm, pol, v, achat: MKB.ok(v, pol, 1), vente: MKB.ok(v, pol, -1) }; });
  const a = conds.every(c => c.achat), v = conds.every(c => c.vente);
  const cote = a && !v ? 1 : v && !a ? -1 : 0;
  const h1 = X.H1, ia = h1 ? MKB.idx(h1.ends, T) : -1, atr = ia >= 0 ? h1.a14[ia] : NaN;
  const m = X.M15, im = m ? MKB.idx(m.ends, T) : -1, prix = im >= 0 ? m.B[im].c : NaN;
  return { T, cote, conds, atr, prix, nAchat: conds.filter(c => c.achat).length, nVente: conds.filter(c => c.vente).length };
};
// ---------- rejeu (backtest et position en cours) ----------
MKB.rejoue = (sym, C, debutMs, finMs, o = {}) => {
  const s = MKB.STRAT[sym], X = o.X || MKB.contexte(C), m = X.M15; if (!m || !X.H1) return null;
  const cout = o.cout != null ? o.cout : s.cout, debut = debutMs / 1000, fin = finMs / 1000;
  const fine = (C.M5 && C.M5.length ? C.M5 : null), trades = [], journal = []; let pos = null, j = 0, refus = 0;
  const sortir = (prix, T, raison) => { const R = ((prix - pos.entree) * pos.cote - cout) / Math.abs(pos.entree - pos.sl); trades.push({ ...pos, sortie: prix, fin: T * 1000, raison, R }); pos = null; };
  const stopBars = (from, to) => { // bougies plus fines (M5) si présentes, sinon la bougie M15 elle-même
    if (!fine) return;
    while (j < fine.length && fine[j].t / 1000 + 300 <= to) { const b = fine[j++]; if (!pos || b.t / 1000 < pos.debut) continue; const c = pos.cote; if ((c > 0 && b.l <= pos.sl) || (c < 0 && b.h >= pos.sl)) sortir(c > 0 ? Math.min(b.o, pos.sl) : Math.max(b.o, pos.sl), b.t / 1000 + 300, 'stop'); }
  };
  for (let k = 0; k < m.B.length; k++) {
    const T = m.ends[k]; if (T <= debut) { if (fine) while (j < fine.length && fine[j].t / 1000 + 300 <= T) j++; continue; } if (T > fin) break;
    const b = m.B[k], px = b.c;
    if (fine) stopBars(T - 900, T);
    else if (pos && T - 900 >= pos.debut) { const c = pos.cote; if ((c > 0 && b.l <= pos.sl) || (c < 0 && b.h >= pos.sl)) sortir(c > 0 ? Math.min(b.o, pos.sl) : Math.max(b.o, pos.sl), T, 'stop'); }
    if (T % 3600 === 0 && !(sym === 'XAUUSD' && T % 86400 === 0)) {
      const D = MKB.decision(sym, X, T);
      if (o.journal) journal.push({ T: T * 1000, cote: D.cote, prix: px });
      if (D.cote && !pos) {
        const st = MKB.stop(X, T, px, D.cote, D.atr, s.stop);
        if (!st) refus++;
        else pos = { sym, cote: D.cote, debut: T, t: T * 1000, entree: px, sl: st.sl, stopSrc: st.src, stopAtr: st.dAtr, n15: 0 };
      }
    }
    if (pos && T > pos.debut) {
      const c = pos.cote, contre = s.smart.conditions.every(nm => { const v = MKB.val(X, nm, T); return v !== null && typeof v !== 'boolean' && v * c === -1; });
      const enGain = (px - pos.entree) * c > 0; pos.n15++;
      if (contre && (enGain || !s.smart.enGain)) sortir(px, T, 'SmartClose');
      else if (pos.n15 >= s.dureeM15) sortir(px, T, 'temps');
    }
  }
  const dernier = m.B[Math.min(m.B.length - 1, MKB.idx(m.ends, fin))];
  let ouvert = null;
  if (pos) { ouvert = { ...pos, prix: dernier.c, R: ((dernier.c - pos.entree) * pos.cote - cout) / Math.abs(pos.entree - pos.sl) }; trades.push({ ...ouvert, fin: null, raison: 'ouvert', sortie: dernier.c }); }
  return { sym, trades, refus, ouvert, journal, X };
};
// état complet pour l'affichage (signal de la dernière heure, position virtuelle, SmartClose)
MKB.etatLive = (sym, C) => {
  const X = MKB.contexte(C), m = X.M15; if (!m || !X.H1 || !X.H4) return null;
  const s = MKB.STRAT[sym], ic = MKB.idx(m.ends, Date.now() / 1000), last = m.ends[Math.max(0, ic)], Th = Math.floor(last / 3600) * 3600;
  const D = MKB.decision(sym, X, Th), Dnow = MKB.decision(sym, X, last);
  const R = MKB.rejoue(sym, C, (last - 6 * 86400) * 1000, last * 1000, { X });
  const pos = R.ouvert;
  const sc = pos ? s.smart.conditions.map(nm => { const v = MKB.val(X, nm, last); return { nm, v, contre: v !== null && typeof v !== 'boolean' && v * pos.cote === -1 }; }) : null;
  const stop = D.cote ? MKB.stop(X, Th, D.prix, D.cote, D.atr, s.stop) : null;
  const stopA = MKB.stop(X, last, Dnow.prix, 1, Dnow.atr, s.stop), stopV = MKB.stop(X, last, Dnow.prix, -1, Dnow.atr, s.stop);
  return { sym, s, D, Dnow, pos, sc, stop, stopA, stopV, recents: R.trades.filter(t => t.raison !== 'ouvert').slice(-6).reverse(), prochaine: (Th + 3600) * 1000, X };
};
