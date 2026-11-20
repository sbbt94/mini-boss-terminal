/* ═══════════════ MARCHÉS : dossier fondamental, données d'exemple, lecture des fichiers ═══════════════ */
const FONDA = {
  asof: '2026-11-18', maj: '18/11/2026',
  macro: [
    { k: 'Fed', v: '3,75–4,00 %', s: -1, d: 'Hausse en septembre, pause le 28/10 (10-2). Hausse de 0,25 pt attendue le 9/12 (≈ 95 %).' },
    { k: 'Inflation US', v: '≈ 4,1 %', s: -1, d: 'CPI d\'octobre +0,4 % sur le mois (attendu 0,3 %), sous-jacente +0,3 % pour le 3e mois.' },
    { k: '10 ans US', v: '5,10 %', s: -1, d: 'Au-dessus de 5 %. Taux réel ≈ 2,9 %.' },
    { k: 'Dollar DXY', v: '103,6', s: -1, d: 'Plus haut depuis 19 mois, +4 % sur un an.' },
    { k: 'Actions US', v: 'S&P ≈ 7 340', s: -1, d: 'Plus bas depuis fin juillet. Nvidia a battu les attentes le 17/11.' }
  ],
  XAUUSD: {
    biais: -0.5, label: 'Baissier à court terme · soutien de fond',
    resume: 'Correction de −31 % depuis le record de 5 595 $ (29/01/2026). Plus bas depuis septembre 2025, 6 séances de baisse.',
    pourquoi: ['La Fed remonte ses taux : l\'or, qui ne rapporte rien, perd de l\'attrait.', 'Taux réel à 10 ans vers 2,9 % et 10 ans au-dessus de 5 % : garder de l\'or coûte cher.', 'Dollar au plus haut depuis 19 mois : l\'or devient plus cher pour les acheteurs étrangers.', 'La chute des actions du 17/11 n\'a pas fait monter l\'or : l\'effet valeur refuge joue peu.'],
    moteurs: [
      { nom: 'Taux réels', etat: '≈ 2,9 %', sens: -1, poids: 3 }, { nom: 'Fed', etat: 'Hausse attendue', sens: -1, poids: 3 },
      { nom: 'Dollar', etat: '103,6', sens: -1, poids: 2 }, { nom: 'Banques centrales', etat: '321 t au T3', sens: 1, poids: 2 },
      { nom: 'ETF or', etat: 'Entrées au T3', sens: 1, poids: 1 }, { nom: 'Refuge', etat: 'Peu actif', sens: 0, poids: 1 }, { nom: 'Inflation', etat: '≈ 4 %', sens: 0, poids: 1 }
    ],
    niveaux: [{ p: 4000, t: 'Seuil perdu le 12/11' }, { p: 4262, t: 'Prix moyen du T3' }, { p: 5595, t: 'Record (29/01/2026)' }],
    chiffres: [['Record', '5 595 $', '29/01/2026'], ['Depuis le record', '≈ −31 %', ''], ['Achats banques centrales', '321 t', 'T3 2026, +42 % sur un an'], ['Prix moyen T3', '4 262 $', 'WGC']]
  },
  BTCUSD: {
    biais: -0.7, label: 'Baissier · peur extrême',
    resume: 'Environ −20 % en novembre : 80 443 $ le 5/11, plus bas vers 61 950 $ le 15/11. Sous la moyenne 200 semaines (≈ 67 800 $).',
    pourquoi: ['Paris sur une hausse des taux de la Fed : moins de liquidités pour les actifs risqués.', 'Sorties des ETF bitcoin : ≈ 1,07 Md$ la semaine au 13/11, ≈ 2,9 Md$ sur 30 jours.', 'Plus de 2 Md$ de positions à levier liquidées sur un week-end : ventes forcées.', 'Chute du Nasdaq : le bitcoin suit les actions tech.'],
    moteurs: [
      { nom: 'Fed', etat: 'Hausse attendue', sens: -1, poids: 3 }, { nom: 'Flux ETF', etat: '−2,9 Md$ / 30 j', sens: -1, poids: 3 },
      { nom: 'Nasdaq', etat: 'Plus bas depuis avril', sens: -1, poids: 2 }, { nom: 'Dollar', etat: '103,6', sens: -1, poids: 2 },
      { nom: 'Levier', etat: '> 2 Md$ liquidés', sens: -1, poids: 1 }, { nom: 'Sentiment', etat: 'Peur extrême (12)', sens: 0.5, poids: 1 }
    ],
    niveaux: [{ p: 67800, t: 'Moyenne 200 semaines' }, { p: 62000, t: 'Plus bas du 15/11' }, { p: 58570, t: 'Plus bas sur 12 mois' }, { p: 80443, t: 'Clôture du 5/11' }],
    chiffres: [['Fear & Greed', '12', 'peur extrême, 17/11'], ['ETF bitcoin', '−1,07 Md$', 'semaine au 13/11'], ['IBIT', '+76,5 M$', '16/11, fin de 11 séances de sorties'], ['Moyenne 200 sem.', '≈ 67 800 $', 'prix en dessous']]
  },
  // heures de Paris
  agenda: [
    { d: '2026-11-18T20:00', e: 'Minutes de la Fed (réunion d\'octobre)', imp: 3, type: 'FOMC', x: 'Ton dur → or et BTC sous pression' },
    { d: '2026-11-19T14:30', e: 'Inscriptions au chômage + Philly Fed', imp: 2, type: 'Emploi' },
    { d: '2026-11-20T16:00', e: 'Univ. Michigan : anticipations d\'inflation', imp: 2, type: 'Inflation' },
    { d: '2026-11-25T14:30', e: 'Inflation PCE d\'octobre + PIB T3', imp: 3, type: 'Inflation', x: 'L\'indice préféré de la Fed' },
    { d: '2026-11-26T00:00', e: 'Thanksgiving : marchés US fermés', imp: 1, type: 'Férié', x: 'Peu de liquidité' },
    { d: '2026-12-01T16:00', e: 'Offres d\'emploi JOLTS', imp: 2, type: 'Emploi' },
    { d: '2026-12-04T14:30', e: 'Emploi US (NFP) de novembre', imp: 3, type: 'NFP', x: 'Emploi fort → Fed plus dure' },
    { d: '2026-12-09T20:00', e: 'Décision de la Fed + projections', imp: 3, type: 'FOMC', x: '+0,25 pt attendu à ≈ 95 %' },
    { d: '2026-12-10T14:30', e: 'Inflation CPI de novembre', imp: 3, type: 'CPI' },
    { d: '2026-12-15T14:30', e: 'Prix à la production PPI', imp: 2, type: 'Inflation' },
    { d: '2026-12-23T14:30', e: 'Inflation PCE de novembre', imp: 3, type: 'Inflation' },
    { d: '2027-01-08T14:30', e: 'Emploi US (NFP) de décembre', imp: 3, type: 'NFP' },
    { d: '2027-01-13T14:30', e: 'Inflation CPI de décembre', imp: 3, type: 'CPI' }
  ],
  passe: [
    { d: '2026-11-10T14:30', e: 'CPI d\'octobre : +0,4 % (attendu 0,3 %)', imp: 3 },
    { d: '2026-11-12T12:00', e: 'L\'or repasse sous 4 000 $', imp: 2 },
    { d: '2026-11-15T03:00', e: 'Bitcoin à 62 000 $, > 2 Md$ liquidés', imp: 2 },
    { d: '2026-11-17T22:20', e: 'Nvidia bat les attentes, dollar au plus haut de 19 mois', imp: 2 }
  ],
  fomc: ['2025-01-29', '2025-03-19', '2025-05-07', '2025-06-18', '2025-07-30', '2025-09-17', '2025-10-29', '2025-12-10', '2026-01-28', '2026-03-18', '2026-04-29', '2026-06-17', '2026-07-29', '2026-09-16', '2026-10-28'],
  fed: [{ m: "9 déc. 2026", p25: 95.5, p50: 4.5, src: "CME FedWatch, 17/11" }],
  sources: [
    ['Fed : décision du 28/10/2026', 'https://www.federalreserve.gov/monetarypolicy/files/monetary20261028a1.pdf'],
    ['BLS : CPI d\'octobre 2026', 'https://www.bls.gov/news.release/archives/cpi_11102026.htm'],
    ['BLS : calendrier des publications', 'https://www.bls.gov/schedule/news_release/current_year.asp'],
    ['Yahoo Finance : or le 17/11/2026', 'https://finance.yahoo.com/personal-finance/investing/article/gold-price-today-tuesday-november-17-2026-gold-opens-at-lowest-price-since-september-29-2025-121421264.html'],
    ['WGC : banques centrales T3 2026', 'https://news.metal.com/newscontent/104205484-world-gold-council-gold-demand-near-record-levels-central-banks-buy-321-tonnes-etfs-boom'],
    ['Record de l\'or (EBC)', 'https://www.ebc.com/forex/gold-highest-price-ever-xauusd-record-2026'],
    ['Bitcoin : semaine du 16 au 22/11', 'https://cryptoticker.io/en/bitcoin-week-ahead-november-16-22-2026/'],
    ['Fear & Greed et ETF (17/11)', 'https://www.altcoinbuzz.io/crypto-fear-and-greed-index-hits-extreme-low-falls-to-12-as-btc-trades-at-64-500'],
    ['Taux, dollar, FedWatch (17/11)', 'https://theweekendspread.substack.com/p/the-close-tuesday-november-17-2026'],
    ['PCE du 25/11', 'https://www.financecalendar.com/event/us-personal-income-and-outlays-pce-november-2026/']
  ]
};
FONDA.events = FONDA.agenda.map(e => ({ ...e, ts: MKD_paris(e.d) })).concat(FONDA.passe.map(e => ({ ...e, ts: MKD_paris(e.d), past: true }))).sort((a, b) => a.ts - b.ts);
function MKD_paris(s) { // « 2026-11-18T20:00 » heure de Paris → ms UTC (heure d'hiver/été gérée)
  const [d, h] = s.split('T'), [y, m, j] = d.split('-').map(Number), [hh, mm] = (h || '00:00').split(':').map(Number);
  let t = Date.UTC(y, m - 1, j, hh, mm);
  for (let k = 0; k < 2; k++) { const p = MK.parisHour(t) - new Date(t).getUTCHours(); t = Date.UTC(y, m - 1, j, hh, mm) - ((p + 24) % 24) * 36e5; }
  return t;
}

/* ---------- lecture du fichier du collecteur (ou d'un export de barres MT5) ---------- */
const MKD = {};
MKD.normBars = arr => (arr || []).map(r => Array.isArray(r) ? { t: r[0] < 1e12 ? r[0] * 1000 : r[0], o: +r[1], h: +r[2], l: +r[3], c: +r[4], v: +(r[5] || 0) } : r).filter(b => isFinite(b.c) && b.h >= b.l).sort((a, b) => a.t - b.t);
MKD.fromCollector = o => {
  const D = { kind: 'collecteur', generated: Date.parse(o.generated) || Date.now(), src: o.source_candles || 'MT5', candles: {}, markets: [], fred: {}, cot: o.cot || {}, crypto: o.crypto || {}, options: o.options || {}, calendar: [], news: [], quotes: o.quotes || {}, errors: o.errors || [] };
  Object.keys(o.candles || {}).forEach(sym => { const s = sym.toUpperCase().includes('XAU') || sym.toUpperCase().includes('GOLD') ? 'XAUUSD' : sym.toUpperCase().includes('BTC') ? 'BTCUSD' : sym; D.candles[s] = {}; Object.keys(o.candles[sym]).forEach(tf => { D.candles[s][tf] = MKD.normBars(o.candles[sym][tf]); }); });
  Object.keys(o.markets || {}).forEach(k => { const m = o.markets[k]; D.markets.push({ nom: k, tk: m.ticker, d: (m.d || []).map(x => [x[0] < 1e12 ? x[0] * 1000 : x[0], +x[1]]).filter(x => isFinite(x[1])) }); });
  Object.keys(o.fred || {}).forEach(k => { D.fred[k] = (o.fred[k] || []).map(x => [typeof x[0] === 'string' ? Date.parse(x[0]) : x[0], +x[1]]).filter(x => isFinite(x[1])); });
  D.calendar = (o.calendar || []).map(e => ({ ts: Date.parse(e.date), e: e.title, pays: e.country, imp: /high/i.test(e.impact) ? 3 : /medium/i.test(e.impact) ? 2 : /holiday/i.test(e.impact) ? 1 : 1, prev: e.previous, prev_: e.previous, fc: e.forecast, act: e.actual })).filter(e => isFinite(e.ts));
  const pd = x => [typeof x[0] === 'string' ? Date.parse(x[0] + (x[0].length <= 10 ? 'T00:00:00Z' : '')) : x[0], +x[1]];
  D.macro = {}; Object.keys(o.macro || {}).forEach(k => { D.macro[k] = (o.macro[k] || []).map(pd).filter(x => isFinite(x[1])); });
  D.encheres = o.encheres || {}; D.fedRss = o.fed_rss || []; D.gld = (o.gld || []).map(pd).filter(x => isFinite(x[1]));
  D.calHist = (o.calendar_hist || []).map(e => ({ ts: Date.parse(e.date), e: e.title, pays: e.country, imp: /high/i.test(e.impact) ? 3 : /medium/i.test(e.impact) ? 2 : 1, fc: e.forecast, prev_: e.previous, act: e.actual })).filter(e => isFinite(e.ts));
  D.news = (o.news || []).map(n => ({ t: typeof n.t === 'number' ? n.t : Date.parse(n.t), title: n.title, src: n.source || '', link: n.link || '', topic: n.topic || 'macro' })).filter(n => isFinite(n.t)).sort((a, b) => b.t - a.t);
  return D;
};
MKD.fromMT5csv = (text, name) => {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  if (!/<OPEN>|<CLOSE>/i.test(lines[0])) return null;
  const head = lines[0].split(/\t|,|;/).map(h => h.replace(/[<>]/g, '').toUpperCase());
  const ix = k => head.indexOf(k);
  const bars = lines.slice(1).map(l => { const c = l.split(/\t|,|;/); const d = (c[ix('DATE')] || '').replace(/\./g, '-'), t = ix('TIME') >= 0 ? c[ix('TIME')] : '00:00:00'; return { t: Date.parse(d + 'T' + t + 'Z'), o: +c[ix('OPEN')], h: +c[ix('HIGH')], l: +c[ix('LOW')], c: +c[ix('CLOSE')], v: +(c[ix('TICKVOL')] || c[ix('VOL')] || 0) }; }).filter(b => isFinite(b.t) && isFinite(b.c));
  const N = name.toUpperCase();
  const sym = /XAU|GOLD/.test(N) ? 'XAUUSD' : /BTC/.test(N) ? 'BTCUSD' : null;
  const tf = /M15/.test(N) ? 'M15' : /H4/.test(N) ? 'H4' : /H1/.test(N) ? 'H1' : /W1|WEEK/.test(N) ? 'W1' : /MN|MONTH/.test(N) ? 'MN1' : /D1|DAILY/.test(N) ? 'D1' : null;
  return sym && tf ? { sym, tf, bars } : { sym, tf, bars, needInfo: true };
};
/* complète les unités de temps manquantes (H4 ← H1, W1 ← D1, MN1 ← D1) */
MKD.fill = C => {
  const agg = (B, ms, alignWeek) => { if (!B) return null; const m = new Map(); B.forEach(b => { let k = Math.floor(b.t / ms) * ms; if (alignWeek) k = Math.floor((b.t - 4 * 864e5) / ms) * ms + 4 * 864e5; const o = m.get(k); if (!o) m.set(k, { t: k, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }); else { o.h = Math.max(o.h, b.h); o.l = Math.min(o.l, b.l); o.c = b.c; o.v += b.v; } }); return [...m.values()]; };
  Object.keys(C).forEach(s => { const c = C[s]; if (!c.H4 && c.H1) c.H4 = agg(c.H1, 4 * 36e5); if (!c.W1 && c.D1) c.W1 = agg(c.D1, 7 * 864e5, true); if (!c.MN1 && c.D1) c.MN1 = MK.toMonthly(c.D1); });
  return C;
};

/* ---------- données d'exemple (fictives, calées sur les niveaux de mi-novembre 2026) ---------- */
MKD.demo = () => {
  const R = MB.mulberry(1118);
  const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const end = Date.UTC(2026, 10, 17, 22, 0);
  const walk = (last, n, stepMs, vol, drift, path) => { // remonte le temps depuis le dernier prix
    const out = []; let c = last;
    for (let k = 0; k < n; k++) {
      const t = end - k * stepMs; const dr = path ? path(k, n) : drift;
      const r = gauss() * vol + dr; const o = c / Math.exp(r);
      const hi = Math.max(o, c) * (1 + Math.abs(gauss()) * vol * 0.3), lo = Math.min(o, c) * (1 - Math.abs(gauss()) * vol * 0.3);
      out.push({ t, o, h: hi, l: lo, c, v: Math.round(800 + R() * 2400 * (1 + Math.abs(r) / vol)) });
      c = o;
    }
    return out.reverse();
  };
  const mk = (px, dvol, bias) => {
    const D1 = walk(px, 1100, 864e5, dvol, 0, (k) => k < 20 ? bias * 2.2 : k < 120 ? bias * 0.6 : k < 300 ? -bias * 0.4 : -bias * 0.3);
    const H1 = walk(px, 1200, 36e5, dvol / 4.9, 0, (k) => k < 120 ? bias * 0.45 / 4.9 : -bias * 0.05 / 4.9);
    const M15 = walk(px, 600, 9e5, dvol / 9.8, 0, (k) => k < 80 ? -bias * 0.1 / 9.8 : 0);
    return MKD.fill({ x: { D1, H1, M15 } }).x;
  };
  const C = { XAUUSD: mk(3856.6, 0.0105, -0.0016), BTCUSD: mk(64210, 0.024, -0.0045) };
  const dAsset = (nom, last, vol, drift, rel) => { const B = walk(last, 520, 864e5, vol, drift); return { nom, d: B.map(b => [b.t, b.c]), rel, tk: '' }; };
  const markets = [
    { nom: 'Or', d: C.XAUUSD.D1.slice(-520).map(b => [b.t, b.c]), rel: 0, tk: '' }, dAsset('Argent', 47.4, 0.022, -0.0012, 1), dAsset('Cuivre', 4.92, 0.016, 0.0003, 0.5),
    dAsset('Dollar (DXY)', 103.6, 0.004, 0.0004, -1), dAsset('EUR/USD', 1.10, 0.004, -0.0003, 1), dAsset('USD/JPY', 159.2, 0.006, 0.0005, -0.5),
    dAsset('Taux 10 ans US', 5.10, 0.012, 0.0008, -1), dAsset('S&P 500', 7342, 0.009, -0.0004, 0.3), dAsset('Nasdaq', 24328, 0.012, -0.0004, 0.3),
    dAsset('Pétrole WTI', 71.5, 0.02, 0.0002, 0.3), dAsset('VIX', 24.5, 0.06, 0.004, -0.3), { nom: 'Bitcoin', d: C.BTCUSD.D1.slice(-520).map(b => [b.t, b.c]), rel: 0.2, tk: '' }, dAsset('Ethereum', 1786, 0.03, -0.0012, 0.2)
  ];
  const fredS = (last, n, vol, drift) => { const out = []; let v = last; for (let k = 0; k < n; k++) { out.push([end - k * 864e5, +v.toFixed(3)]); v = v - gauss() * vol + drift; } return out.reverse(); };
  const fred = { DFII10: fredS(2.91, 520, 0.012, -0.0012), DGS3MO: fredS(4.12, 520, 0.01, 0), DGS6MO: fredS(4.25, 520, 0.012, 0), DGS1: fredS(4.4, 520, 0.015, -0.0005), DGS2: fredS(4.79, 520, 0.012, -0.001), DGS5: fredS(4.9, 520, 0.012, -0.0012), DGS7: fredS(5.0, 520, 0.012, -0.0012), DGS10: fredS(5.10, 520, 0.012, -0.0013), DGS20: fredS(5.32, 520, 0.012, -0.0012), DGS30: fredS(5.38, 520, 0.012, -0.0012), T10YIE: fredS(2.31, 520, 0.012, 0) };
  const weeks = 156, cot = { gold: [], btc: [] };
  let nl = 150000; for (let k = weeks; k > 0; k--) { nl += gauss() * 9000 - (k < 20 ? -3500 : 600); cot.gold.push({ date: new Date(end - k * 7 * 864e5).toISOString().slice(0, 10), long: 180000 + nl * 0.6, short: 180000 + nl * 0.6 - nl, oi: 520000 + gauss() * 20000 }); }
  let nb = -800; for (let k = weeks; k > 0; k--) { nb += gauss() * 700; cot.btc.push({ date: new Date(end - k * 7 * 864e5).toISOString().slice(0, 10), long: 9000 + Math.max(0, nb), short: 9000 + Math.max(0, -nb) + 3000, oi: 30000 + gauss() * 2000 }); }
  const fng = []; let fg = 63; for (let k = 365; k >= 0; k--) { fg = Math.max(5, Math.min(92, fg + gauss() * 5 - (k < 30 ? 1.6 : 0))); fng.push([end - k * 864e5, Math.round(k === 0 ? 12 : fg)]); }
  const funding = [], oi = [], lsr = []; for (let k = 90; k >= 0; k--) { funding.push([end - k * 864e5, (gauss() * 0.00006 + (k < 15 ? -0.00004 : 0.00008))]); oi.push([end - k * 864e5, 8.5e9 + gauss() * 3e8 - (k < 15 ? (15 - k) * 1.2e8 : 0)]); lsr.push([end - k * 864e5, 1 + gauss() * 0.12 + (k < 15 ? 0.25 : 0)]); }
  const opt = (spot, step, n) => { const st = []; for (let k = -n; k <= n; k++) { const K = Math.round(spot / step) * step + k * step; st.push({ k: K, call: Math.round(Math.max(0, 9000 * Math.exp(-(((K - spot * 1.04) / (step * 4)) ** 2)) + R() * 1500)), put: Math.round(Math.max(0, 11000 * Math.exp(-(((K - spot * 0.96) / (step * 4)) ** 2)) + R() * 1500)) }); } return st; };
  const options = { gold: { expiry: '2026-11-20', src: 'GLD (converti en prix de l\'or)', spot: 3856, strikes: opt(3856, 25, 14) }, btc: { expiry: '2026-11-27', src: 'Deribit', spot: 64210, strikes: opt(64210, 1000, 14) } };
  const news = [
    ['Les minutes de la Fed attendues ce soir, les marchés parient sur une hausse en décembre', 'macro', 1], ['L\'or au plus bas depuis septembre 2025 face au dollar', 'or', 3], ['Bitcoin : le fonds de BlackRock renoue avec les entrées', 'btc', 5],
    ['Nvidia dépasse les attentes, rebond des valeurs tech après la clôture', 'macro', 6], ['Banques centrales : achats d\'or record au troisième trimestre', 'or', 9], ['Crypto : plus de 2 milliards de dollars de positions liquidées', 'btc', 26],
    ['Le dollar touche un sommet de 19 mois', 'macro', 14], ['Taux américains : le 10 ans au-dessus de 5 %', 'macro', 18], ['L\'indice de la peur crypto au plus bas depuis juin', 'btc', 20]
  ].map(([title, topic, h]) => ({ t: end + 2 * 36e5 - h * 36e5, title, src: 'Exemple', link: '', topic }));
  return { kind: 'exemple', generated: end + 3 * 36e5, src: 'Exemple', candles: C, markets, fred, cot, crypto: { fng, funding, oi, lsr, dominance: 61.2 }, options, calendar: [], news, quotes: {}, errors: [] };
};
