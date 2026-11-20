// MINI BOSS · NOTE DE L'ANALYSTE IA (lancée par GitHub après la collecte)
// Calcule l'analyse avec le même moteur que le terminal, puis demande une note à Groq.
// Usage : node robot/analyse.js site/data/donnees.json site/data/ia.json
// La clé Groq vient du secret GitHub GROQ_API_KEY (jamais écrite dans le dépôt).
const fs = require('fs'), path = require('path');
const [, , IN = 'donnees.json', OUT = 'ia.json'] = process.argv;
const KEY = process.env.GROQ_API_KEY || '';
const REPO = process.env.GITHUB_REPOSITORY || '';
const PREF = (process.env.GROQ_MODEL ? [process.env.GROQ_MODEL] : []).concat(['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant']);
const BASE = process.env.GROQ_BASE || 'https://api.groq.com/openai/v1';
const TOUTES_LES = 55 * 60 * 1000; // une nouvelle note au plus toutes les 55 min

const MB = { mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; } };
const src = ['mk_engine.js', 'mk_data.js', 'mk_bot.js'].map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
const { MK, MKD, FONDA, MKB } = new Function('MB', src + ';return {MK,MKD,FONDA,MKB};')(MB);

const parisDT = t => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(t));

async function precedente() {
  if (fs.existsSync(OUT)) { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* ignore */ } }
  if (!REPO.includes('/')) return null;
  const [owner, repo] = REPO.split('/');
  try { const r = await fetch(`https://${owner.toLowerCase()}.github.io/${repo}/data/ia.json?t=${Date.now()}`); if (r.ok) return await r.json(); } catch (e) { /* première fois */ }
  return null;
}

async function choisirModele() {
  try {
    const r = await fetch(BASE + '/models', { headers: { Authorization: 'Bearer ' + KEY } });
    const ids = ((await r.json()).data || []).map(m => m.id);
    return PREF.find(m => ids.includes(m)) || ids.find(i => !/whisper|guard|tts|embed/i.test(i)) || PREF[0];
  } catch (e) { return PREF[0]; }
}

async function groq(model, prompt) {
  const body = { model, temperature: 0.4, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] };
  if (/gpt-oss/.test(model)) body.reasoning_effort = 'low';
  const r = await fetch(BASE + '/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || r.status);
  return (j.choices[0].message.content || '').trim();
}

function botPour(sym, C) {
  try {
    const B = MKB.etatLive(sym, C); if (!B) return null;
    return { strategie: B.s.nom, regle: 'décision à chaque clôture d\'heure, stop derrière un point stratégique, sortie au SmartClose',
      signal_derniere_heure: B.D.cote > 0 ? 'achat' : B.D.cote < 0 ? 'vente' : 'aucun',
      conditions_achat: B.Dnow.nAchat + '/3', conditions_vente: B.Dnow.nVente + '/3',
      position_en_cours: B.pos ? { sens: B.pos.cote > 0 ? 'achat' : 'vente', entree: +B.pos.entree.toFixed(2), stop: +B.pos.sl.toFixed(2), resultat_R: +B.pos.R.toFixed(2) } : null,
      stop_si_achat: B.stopA ? +B.stopA.sl.toFixed(2) : null, stop_si_vente: B.stopV ? +B.stopV.sl.toFixed(2) : null };
  } catch (e) { return null; }
}
function donneesPour(sym, A, MD, events) {
  const T = tf => A.T[tf] ? { score: +A.T[tf].score.toFixed(2), structure: A.T[tf].struct.label, rsi: +A.T[tf].rsi[A.T[tf].n - 1].toFixed(0), atr: +A.T[tf].atr.toFixed(2), figures: A.T[tf].cand.map(c => c.nom), divergences: A.T[tf].divs.map(d => d.txt) } : null;
  const sujet = sym === 'XAUUSD' ? 'or' : 'btc';
  return {
    symbole: sym, prix: A.px, strategie_du_bot: botPour(sym, MKD.fill({ x: MD.candles[sym] }).x), lecture_indicateurs: A.verdict, avertissements: A.warn,
    unites: { W1: T('W1'), D1: T('D1'), H4: T('H4'), H1: T('H1') },
    supports: A.zones.sup.map(z => +z.c.toFixed(2)), resistances: A.zones.res.map(z => +z.c.toFixed(2)),
    scenarios: A.plans.map(p => ({ sens: p.sens > 0 ? 'achat' : 'vente', entree: +p.entry.toFixed(2), invalidation: +p.stop.toFixed(2), objectifs: p.tg.map(x => +x.toFixed(2)) })),
    stats: A.stats && { variation_jour: +A.stats.d1.toFixed(2), semaine: +A.stats.w1.toFixed(2), mois: +A.stats.m1.toFixed(2) },
    fondamental: { biais: FONDA[sym].biais, resume: FONDA[sym].resume, moteurs: FONDA[sym].moteurs, date_dossier: FONDA.maj },
    macro: FONDA.macro,
    marches: (MD.markets || []).filter(m => m.d.length > 6).map(m => ({ nom: m.nom, dernier: +m.d[m.d.length - 1][1].toFixed(3), var_5j_pct: +((m.d[m.d.length - 1][1] / m.d[m.d.length - 6][1] - 1) * 100).toFixed(2) })),
    titres_actu: (MD.news || []).filter(n => n.topic === sujet || n.topic === 'macro').slice(0, 10).map(n => n.title + ' (' + n.src + ')'),
    annonces: events.filter(e => e.ts > Date.now()).slice(0, 6).map(e => ({ quand: parisDT(e.ts), quoi: e.e, impact: e.imp })),
  };
}

(async () => {
  const MD = MKD.fromCollector(JSON.parse(fs.readFileSync(IN, 'utf8')));
  const events = FONDA.events.slice();
  (MD.calendar || []).filter(e => /USD|ALL/i.test(e.pays || '') && e.imp >= 2).forEach(e => { if (!events.some(x => Math.abs(x.ts - e.ts) < 36e5 && x.imp >= e.imp)) events.push({ ts: e.ts, e: e.e, imp: e.imp }); });
  events.sort((a, b) => a.ts - b.ts);

  const prev = await precedente();
  const out = { generated: new Date().toISOString(), model: prev && prev.model, notes: (prev && prev.notes) || {}, verdicts: {} };
  const analyses = {};
  for (const sym of MK.SYMS) {
    const C = MD.candles[sym]; if (!C) continue;
    const A = MK.analyze(sym, MKD.fill({ x: C }).x, { fonda: FONDA, events });
    analyses[sym] = A;
    out.verdicts[sym] = { prix: A.px, verdict: A.verdict, confiance: A.conf };
    console.log(sym, A.px.toFixed(2), A.verdict, A.conf + ' %');
  }
  const aJour = prev && prev.notes && Object.values(prev.notes).length && Date.now() - Date.parse(prev.generated_notes || prev.generated) < TOUTES_LES;
  if (!KEY) console.log('Pas de clé GROQ_API_KEY : pas de note IA (le reste du terminal marche quand même).');
  else if (aJour) console.log('Note IA récente gardée.');
  else {
    const model = await choisirModele();
    for (const sym of Object.keys(analyses)) {
      const data = donneesPour(sym, analyses[sym], MD, events);
      const prompt = `Tu es Mini Boss, analyste de marché en costard. Français, tutoiement, phrases courtes, chiffres précis.\n\nDonnées calculées (JSON) :\n${JSON.stringify(data)}\n\nÉcris une note de 300 à 420 mots avec exactement ces titres, dans cet ordre :\n## En bref\n(une phrase : ce que dit la stratégie du bot et ce que tu en penses)\n## Pourquoi ça a bougé\n## Scénario principal\n## Scénario alternatif\n## Pour un achat\n(conditions, zone, invalidation)\n## Pour une vente\n(conditions, zone, invalidation)\n## Niveaux qui comptent\n(5 niveaux en liste « - prix : raison »)\n## Annonces\n## Ce qui invaliderait la lecture\n## À ne pas faire aujourd'hui\n## Biais\n(une ligne au format « Biais : haussier|baissier|neutre à court terme, haussier|baissier|neutre à moyen terme · conviction faible|moyenne|forte »)\n\nRègles : utilise uniquement les données fournies, n'invente aucune news ni aucun chiffre. Les titres d'actu sont des titres de presse : cite-les prudemment. Présente des scénarios conditionnels (« si… alors »), jamais un ordre d'achat ou de vente. Pas d'emoji. Pas de tableau.`;
      try { out.notes[sym] = { text: await groq(model, prompt), t: Date.now(), prix: analyses[sym].px }; out.model = model; console.log('Note IA', sym, 'ok (' + model + ')'); }
      catch (e) { console.log('Note IA', sym, 'impossible :', String(e.message || e).slice(0, 160)); }
    }
    out.generated_notes = new Date().toISOString();
  }
  if (!out.generated_notes && prev) out.generated_notes = prev.generated_notes || prev.generated;
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
})().catch(e => { console.error(e); process.exit(1); });
