# -*- coding: utf-8 -*-
"""
MINI BOSS · ROBOT DE COLLECTE (version en ligne, lancée par GitHub toutes les 15 min)
Écrit un seul fichier JSON lu par le Mini Boss Terminal.

Sources :
  - Or : Yahoo Finance (contrat à terme GC=F) recalé sur le prix au comptant (gold-api.com / Swissquote)
  - Bitcoin : Binance (données publiques), sinon Yahoo Finance
  - Yahoo Finance : argent, cuivre, pétrole, dollar, euro, yen, taux, S&P, Nasdaq, VIX, crypto
  - FRED (taux américains, taux réel, inflation anticipée), CFTC (COT)
  - alternative.me (peur et avidité), Binance / OKX (financement, open interest, long/short), CoinGecko (dominance)
  - Deribit (options bitcoin), Yahoo (options GLD)
  - ForexFactory (agenda), Google Actualités (news)

Usage : python robot/collecte.py site/data/donnees.json
"""
import json, os, sys, time, datetime as dt, re, io, csv
from email.utils import parsedate_to_datetime
import xml.etree.ElementTree as ET
import requests

SORTIE = sys.argv[1] if len(sys.argv) > 1 else "donnees.json"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36", "Accept": "*/*"}
ERREURS = []
S = requests.Session()
S.headers.update(UA)

MARCHES = {
    "Or": "GC=F", "Argent": "SI=F", "Cuivre": "HG=F", "Pétrole WTI": "CL=F",
    "Dollar (DXY)": "DX-Y.NYB", "EUR/USD": "EURUSD=X", "USD/JPY": "JPY=X", "Taux 10 ans US": "^TNX",
    "S&P 500": "^GSPC", "Nasdaq": "^IXIC", "VIX": "^VIX", "Bitcoin": "BTC-USD", "Ethereum": "ETH-USD",
}
FRED = ["DFII10", "DGS3MO", "DGS6MO", "DGS1", "DGS2", "DGS5", "DGS7", "DGS10", "DGS20", "DGS30", "T10YIE"]


def log(*a):
    print(*a, flush=True)


def get(url, **kw):
    r = S.get(url, timeout=15, **kw)
    r.raise_for_status()
    return r


def essai(nom, fn, *a, defaut=None):
    t0 = time.time()
    try:
        v = fn(*a)
        log(f"  ✓ {nom} ({time.time() - t0:.1f} s)")
        return v
    except Exception as e:
        log(f"  ✗ {nom} : {str(e)[:140]}")
        ERREURS.append(nom)
        return defaut


# ---------------------------------------------------------------- Yahoo (API des graphiques, sans clé)
COUPE = set()   # sources qui refusent : on ne les rappelle plus pendant ce passage (le robot va plus vite)


def yahoo(tk, rng, itv):
    if "yahoo" in COUPE:
        raise RuntimeError("Yahoo refuse les serveurs de GitHub (ignoré pour ce passage)")
    der = None
    for hote in ("query1", "query2"):
        try:
            j = get(f"https://{hote}.finance.yahoo.com/v8/finance/chart/{requests.utils.quote(tk)}",
                    params={"range": rng, "interval": itv, "includePrePost": "false"}).json()
            res = j["chart"]["result"][0]
            ts, q = res.get("timestamp") or [], res["indicators"]["quote"][0]
            out = []
            for i, t in enumerate(ts):
                o, h, l, c = q["open"][i], q["high"][i], q["low"][i], q["close"][i]
                if None in (o, h, l, c):
                    continue
                out.append([int(t), round(o, 4), round(h, 4), round(l, 4), round(c, 4), int(q["volume"][i] or 0)])
            if out:
                return out
            der = RuntimeError("réponse vide")
        except Exception as e:
            der = e
        time.sleep(1)
    COUPE.add("yahoo")
    raise der


TF_YAHOO = {"M15": ("60d", "15m"), "H1": ("730d", "1h"), "D1": ("10y", "1d"), "W1": ("10y", "1wk"), "MN1": ("max", "1mo")}


def bougies_yahoo(tk):
    out = {}
    for tf, (rng, itv) in TF_YAHOO.items():
        try:
            out[tf] = yahoo(tk, rng, itv)
        except Exception as e:
            log(f"    Yahoo {tk} {tf} : {str(e)[:100]}")
            ERREURS.append(f"Yahoo {tk} {tf}")
    if not out:
        raise RuntimeError("aucune bougie")
    return out


# ---------------------------------------------------------------- Binance (données publiques, accessibles depuis les États-Unis)
def binance_klines(itv, total, symbole="BTCUSDT"):
    rows, fin = [], None
    while len(rows) < total:
        p = {"symbol": symbole, "interval": itv, "limit": 1000}
        if fin:
            p["endTime"] = fin
        lot = get("https://data-api.binance.vision/api/v3/klines", params=p).json()
        if not lot:
            break
        rows = lot + rows
        fin = int(lot[0][0]) - 1
        if len(lot) < 1000:
            break
    rows = rows[-total:]
    return [[int(r[0]) // 1000, float(r[1]), float(r[2]), float(r[3]), float(r[4]), int(float(r[5]))] for r in rows]


def bougies_btc():
    try:
        out = {"M15": binance_klines("15m", 4000), "H1": binance_klines("1h", 6000), "H4": binance_klines("4h", 2000),
               "D1": binance_klines("1d", 3200), "W1": binance_klines("1w", 600), "MN1": binance_klines("1M", 200)}
        return out, "Binance"
    except Exception as e:
        log("    Binance indisponible (" + str(e)[:80] + "), je prends Yahoo")
        return bougies_yahoo("BTC-USD"), "Yahoo"


# ---------------------------------------------------------------- or : contrat à terme recalé sur le comptant
def or_comptant():
    try:
        p = float(get("https://api.gold-api.com/price/XAU").json()["price"])
        if p > 100:
            return p, "gold-api.com"
    except Exception:
        pass
    j = get("https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD").json()
    pr = j[0]["spreadProfilePrices"][0]
    return (float(pr["bid"]) + float(pr["ask"])) / 2, "Swissquote"


def marche_or_ouvert(t):
    d = dt.datetime.fromtimestamp(t, dt.timezone.utc)
    wd, h = d.weekday(), d.hour
    return not (wd == 5 or (wd == 4 and h >= 22) or (wd == 6 and h < 23))


def bougies_paxg():
    """Or tokenisé PAXG (1 jeton = 1 once d'or) via l'API publique de Binance ; on retire les heures où le marché de l'or est fermé."""
    out = {}
    for tf, (itv, n) in {"M15": ("15m", 4000), "H1": ("1h", 6000), "H4": ("4h", 2000), "D1": ("1d", 2200), "W1": ("1w", 350), "MN1": ("1M", 80)}.items():
        rows = binance_klines(itv, n, "PAXGUSDT")
        if tf in ("M15", "H1", "H4"):
            rows = [r for r in rows if marche_or_ouvert(r[0])]
        elif tf == "D1":
            rows = [r for r in rows if dt.datetime.fromtimestamp(r[0], dt.timezone.utc).weekday() < 5]
        out[tf] = rows
    return out


def bougies_or():
    try:
        C = bougies_yahoo("GC=F")
    except Exception:
        C = {}
    info = {"source": "Yahoo GC=F"}
    if not C.get("D1") or not C.get("H1"):
        log("    Yahoo indisponible pour l'or : je prends l'or tokenisé PAXG (Binance), recalé sur le prix au comptant")
        for k in [e for e in ERREURS if e.startswith("Yahoo GC=F")]:
            ERREURS.remove(k)
        C = bougies_paxg()
        info = {"source": "PAXG (Binance)"}
    try:
        spot, src = or_comptant()
        dernier = C.get("M15", C.get("H1", C.get("D1")))[-1][4]
        ecart = dernier - spot
        if abs(ecart) < 120:
            for tf in C:
                C[tf] = [[b[0], round(b[1] - ecart, 2), round(b[2] - ecart, 2), round(b[3] - ecart, 2), round(b[4] - ecart, 2), b[5]] for b in C[tf]]
            info.update({"spot": round(spot, 2), "ecart_future": round(ecart, 2), "source_spot": src})
    except Exception as e:
        ERREURS.append("Or au comptant")
    return C, info


# ---------------------------------------------------------------- autres marchés
def marches():
    out = {}
    for nom, tk in MARCHES.items():
        try:
            d = [[b[0], b[4]] for b in yahoo(tk, "2y", "1d")]
            if nom == "Taux 10 ans US" and d and sorted(x[1] for x in d)[len(d) // 2] > 20:
                d = [[t, v / 10] for t, v in d]
            out[nom] = {"ticker": tk, "d": d}
        except Exception:
            ERREURS.append("Yahoo " + nom)
    for nom, sym in (("Bitcoin", "BTCUSDT"), ("Ethereum", "ETHUSDT")):
        if nom not in out:
            try:
                out[nom] = {"ticker": sym, "d": [[r[0], r[4]] for r in binance_klines("1d", 730, sym)]}
                ERREURS.remove("Yahoo " + nom)
            except Exception:
                pass
    # Si Yahoo refuse : séries officielles FRED (clé gratuite FRED_API_KEY dans les secrets GitHub)
    FRED_MARCHES = {"S&P 500": "SP500", "Nasdaq": "NASDAQCOM", "VIX": "VIXCLS", "Pétrole WTI": "DCOILWTICO",
                    "EUR/USD": "DEXUSEU", "USD/JPY": "DEXJPUS", "Dollar (DXY)": "DTWEXBGS", "Taux 10 ans US": "DGS10"}
    for nom, serie in FRED_MARCHES.items():
        if nom in out or not FRED_KEY:
            continue
        try:
            d = fred_api(serie)
            out[nom] = {"ticker": "FRED " + serie, "d": [[int(dt.datetime.fromisoformat(j).replace(tzinfo=dt.timezone.utc).timestamp()), v] for j, v in d]}
            ERREURS.remove("Yahoo " + nom)
        except Exception:
            pass
    return out


FRED_KEY = os.environ.get("FRED_API_KEY", "").strip()


def fred_api(serie):
    debut = (dt.date.today() - dt.timedelta(days=760)).isoformat()
    j = get("https://api.stlouisfed.org/fred/series/observations",
            params={"series_id": serie, "api_key": FRED_KEY, "file_type": "json", "observation_start": debut}).json()
    return [[o["date"], float(o["value"])] for o in j["observations"] if o["value"] not in (".", "")]


def tresor_us():
    """Courbe des taux et taux réels publiés par le Trésor américain (home.treasury.gov)."""
    out, an = {}, dt.date.today().year
    NOM = {"3 mo": "DGS3MO", "6 mo": "DGS6MO", "1 yr": "DGS1", "2 yr": "DGS2", "5 yr": "DGS5", "7 yr": "DGS7", "10 yr": "DGS10", "20 yr": "DGS20", "30 yr": "DGS30"}
    for typ, table in (("daily_treasury_yield_curve", NOM), ("daily_treasury_real_yield_curve", {"10 yr": "DFII10"})):
        for a in (an - 2, an - 1, an):
            try:
                txt = get(f"https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/{a}/all",
                          params={"type": typ, "field_tdr_date_value": a, "page": "", "_format": "csv"}).text
                rows = list(csv.reader(io.StringIO(txt)))
                tete = [h.strip().lower() for h in rows[0]]
                for col, serie in table.items():
                    if col not in tete:
                        continue
                    i = tete.index(col)
                    for r in rows[1:]:
                        if len(r) > i and r[i].strip():
                            m, j, y = r[0].split("/")
                            out.setdefault(serie, {})[f"{y}-{m}-{j}"] = float(r[i])
            except Exception:
                pass
    out = {k: [[d, v] for d, v in sorted(x.items())] for k, x in out.items()}
    if "DGS10" in out and "DFII10" in out:
        reel = dict(out["DFII10"])
        out["T10YIE"] = [[d, round(v - reel[d], 2)] for d, v in out["DGS10"] if d in reel]
    return out


def fred():
    out, debut = {}, (dt.date.today() - dt.timedelta(days=760)).isoformat()
    for s in FRED:
        try:
            if FRED_KEY:
                out[s] = fred_api(s)
            elif "fred" in COUPE:
                continue
            else:
                txt = get(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={s}&cosd={debut}").text
                rows = list(csv.reader(io.StringIO(txt)))
                out[s] = [[r[0], float(r[1])] for r in rows[1:] if len(r) > 1 and r[1] not in (".", "")]
        except Exception as e:
            if s == FRED[0]:
                log("    FRED : " + str(e)[:100])
            if not FRED_KEY:
                COUPE.add("fred")
    manque = [s for s in FRED if s not in out]
    if manque:
        tr = tresor_us()
        for s in manque:
            if s in tr:
                out[s] = tr[s]
        if tr:
            log("    Taux repris du Trésor américain : " + ", ".join(s for s in manque if s in tr))
    for s in FRED:
        if s not in out:
            ERREURS.append("Taux " + s)
    return out


def cot():
    out = {}
    try:
        r = get("https://publicreporting.cftc.gov/resource/72hh-3qpy.json", params={
            "$where": "market_and_exchange_names like 'GOLD - COMMODITY EXCHANGE INC.%'",
            "$order": "report_date_as_yyyy_mm_dd DESC", "$limit": "160"}).json()
        out["gold"] = [{"date": x["report_date_as_yyyy_mm_dd"][:10], "long": float(x.get("m_money_positions_long_all", 0)),
                        "short": float(x.get("m_money_positions_short_all", 0)), "oi": float(x.get("open_interest_all", 0))} for x in r][::-1]
    except Exception:
        ERREURS.append("CFTC or")
    try:
        r = get("https://publicreporting.cftc.gov/resource/gpe5-46if.json", params={
            "$where": "market_and_exchange_names = 'BITCOIN - CHICAGO MERCANTILE EXCHANGE'",
            "$order": "report_date_as_yyyy_mm_dd DESC", "$limit": "160"}).json()

        def champ(x, mot):
            k = next((k for k in x if mot in k), None)
            return float(x[k]) if k else 0.0
        out["btc"] = [{"date": x["report_date_as_yyyy_mm_dd"][:10], "long": champ(x, "lev_money_positions_long"),
                       "short": champ(x, "lev_money_positions_short"), "oi": champ(x, "open_interest_all")} for x in r][::-1]
    except Exception:
        ERREURS.append("CFTC bitcoin")
    return out


# ---------------------------------------------------------------- crypto (Binance, sinon OKX)
def crypto():
    out = {}
    try:
        d = get("https://api.alternative.me/fng/", params={"limit": 365}).json()["data"]
        out["fng"] = sorted([[int(x["timestamp"]) * 1000, int(x["value"])] for x in d])
    except Exception:
        ERREURS.append("Peur et avidité")

    def par_jour(points):
        jours = {}
        for t, v in points:
            jours.setdefault(t // 86400000 * 86400000, []).append(v)
        return [[j, sum(v) / len(v)] for j, v in sorted(jours.items())]

    try:
        d = get("https://fapi.binance.com/fapi/v1/fundingRate", params={"symbol": "BTCUSDT", "limit": 270}).json()
        out["funding"] = par_jour([(int(x["fundingTime"]), float(x["fundingRate"])) for x in d])
    except Exception:
        try:
            pts, apres = [], None
            for _ in range(3):
                p = {"instId": "BTC-USDT-SWAP", "limit": 100}
                if apres:
                    p["after"] = apres
                d = get("https://www.okx.com/api/v5/public/funding-rate-history", params=p).json()["data"]
                if not d:
                    break
                pts += [(int(x["fundingTime"]), float(x["realizedRate"] or x["fundingRate"])) for x in d]
                apres = d[-1]["fundingTime"]
            out["funding"] = par_jour(pts)
        except Exception:
            ERREURS.append("Financement")
    try:
        d = get("https://fapi.binance.com/futures/data/openInterestHist", params={"symbol": "BTCUSDT", "period": "1d", "limit": 90}).json()
        out["oi"] = [[int(x["timestamp"]), float(x["sumOpenInterestValue"])] for x in d]
    except Exception:
        try:
            d = get("https://www.okx.com/api/v5/rubik/stat/contracts/open-interest-volume", params={"ccy": "BTC", "period": "1D"}).json()["data"]
            out["oi"] = sorted([[int(x[0]), float(x[1])] for x in d])[-90:]
        except Exception:
            ERREURS.append("Open interest")
    try:
        d = get("https://fapi.binance.com/futures/data/globalLongShortAccountRatio", params={"symbol": "BTCUSDT", "period": "1d", "limit": 90}).json()
        out["lsr"] = [[int(x["timestamp"]), float(x["longShortRatio"])] for x in d]
    except Exception:
        try:
            d = get("https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio", params={"ccy": "BTC", "period": "1D"}).json()["data"]
            out["lsr"] = sorted([[int(x[0]), float(x[1])] for x in d])[-90:]
        except Exception:
            ERREURS.append("Long/short")
    try:
        out["dominance"] = float(get("https://api.coingecko.com/api/v3/global").json()["data"]["market_cap_percentage"]["btc"])
    except Exception:
        ERREURS.append("CoinGecko")
    return out


# ---------------------------------------------------------------- options
MOIS = {"JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6, "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12}


def options(prix_or):
    out = {}
    try:
        spot = float(get("https://www.deribit.com/api/v2/public/get_index_price", params={"index_name": "btc_usd"}).json()["result"]["index_price"])
        res = get("https://www.deribit.com/api/v2/public/get_book_summary_by_currency", params={"currency": "BTC", "kind": "option"}).json()["result"]
        par_ech = {}
        for x in res:
            m = re.match(r"BTC-(\d{1,2})([A-Z]{3})(\d{2})-(\d+)-([CP])", x["instrument_name"])
            if not m:
                continue
            ech = dt.date(2000 + int(m.group(3)), MOIS[m.group(2)], int(m.group(1)))
            if not (dt.date.today() < ech <= dt.date.today() + dt.timedelta(days=40)):
                continue
            k, cp, oi = int(m.group(4)), m.group(5), float(x.get("open_interest") or 0)
            s = par_ech.setdefault(ech, {}).setdefault(k, {"k": k, "call": 0.0, "put": 0.0})
            s["call" if cp == "C" else "put"] += oi
        if par_ech:
            ech = max(par_ech, key=lambda d: sum(s["call"] + s["put"] for s in par_ech[d].values()))
            st = [s for s in par_ech[ech].values() if 0.75 * spot <= s["k"] <= 1.25 * spot]
            out["btc"] = {"expiry": ech.isoformat(), "src": "Deribit (en BTC)", "spot": spot, "strikes": sorted(st, key=lambda s: s["k"])}
    except Exception:
        ERREURS.append("Options Deribit")
    try:
        import yfinance as yf
        g = yf.Ticker("GLD")
        gld = float(g.history(period="5d")["Close"].iloc[-1])
        ratio = (prix_or / gld) if prix_or else 10.9
        meilleur = None
        for ech in list(g.options)[:6]:
            ch = g.option_chain(ech)
            tot = float(ch.calls["openInterest"].fillna(0).sum() + ch.puts["openInterest"].fillna(0).sum())
            if meilleur is None or tot > meilleur[1] * 1.6:
                meilleur = (ech, tot, ch)
        if meilleur:
            ech, _, ch = meilleur
            st = {}
            for df, cp in ((ch.calls, "call"), (ch.puts, "put")):
                for _, r in df.iterrows():
                    k = float(r["strike"])
                    if 0.9 * gld <= k <= 1.1 * gld:
                        s = st.setdefault(k, {"k": round(k * ratio, 1), "call": 0.0, "put": 0.0})
                        s[cp] += float(r["openInterest"] or 0)
            if st and prix_or:
                out["gold"] = {"expiry": ech, "src": "GLD converti en prix de l'or", "spot": prix_or, "strikes": [st[k] for k in sorted(st)]}
    except Exception:
        ERREURS.append("Options GLD")
    return out


# ---------------------------------------------------------------- agenda et news
def agenda():
    out = []
    for semaine in ("thisweek", "nextweek"):
        try:
            for e in get(f"https://nfs.faireconomy.media/ff_calendar_{semaine}.json").json():
                out.append({"date": e.get("date"), "title": e.get("title"), "country": e.get("country"), "impact": e.get("impact"),
                            "forecast": e.get("forecast"), "previous": e.get("previous"), "actual": e.get("actual")})
        except Exception:
            if semaine == "thisweek":
                raise
    return out


def news():
    REQ = {"or": "prix de l'or OR \"once d'or\" OR \"cours de l'or\"", "btc": "bitcoin OR crypto", "macro": "Fed taux OR inflation OR dollar OR \"banque centrale\""}
    out, vus = [], set()
    for sujet, q in REQ.items():
        try:
            xml = get("https://news.google.com/rss/search", params={"q": q, "hl": "fr", "gl": "FR", "ceid": "FR:fr"}).content
            for it in ET.fromstring(xml).iter("item"):
                titre = (it.findtext("title") or "").strip()
                src = (it.findtext("source") or "").strip()
                if src and titre.endswith(" - " + src):
                    titre = titre[: -len(src) - 3]
                if not titre or titre in vus:
                    continue
                vus.add(titre)
                try:
                    t = int(parsedate_to_datetime(it.findtext("pubDate")).timestamp() * 1000)
                except Exception:
                    continue
                out.append({"t": t, "title": titre, "source": src, "link": it.findtext("link") or "", "topic": sujet})
        except Exception:
            ERREURS.append("News " + sujet)
    out.sort(key=lambda x: -x["t"])
    return out[:150]


# ---------------------------------------------------------------- principal
def main():
    log("Mini Boss · collecte du", dt.datetime.now(dt.timezone.utc).strftime("%d/%m/%Y %H:%M UTC"))
    data = {"app": "mini-boss-data", "v": 1, "generated": dt.datetime.now(dt.timezone.utc).isoformat(), "candles": {}, "quotes": {}}
    r = essai("Or (bougies)", bougies_or)
    if r:
        data["candles"]["XAUUSD"], data["quotes"]["XAUUSD"] = r[0], {**r[1], "contract": 100}
    r = essai("Bitcoin (bougies)", bougies_btc)
    if r:
        data["candles"]["BTCUSD"], data["quotes"]["BTCUSD"] = r[0], {"source": r[1], "contract": 1}
    data["source_candles"] = "Yahoo/Binance"
    data["markets"] = essai("Marchés (Yahoo)", marches, defaut={})
    if "Or" not in data["markets"] and data["candles"].get("XAUUSD", {}).get("D1"):
        data["markets"]["Or"] = {"ticker": "XAUUSD", "d": [[b[0], b[4]] for b in data["candles"]["XAUUSD"]["D1"][-520:]]}
        if "Yahoo Or" in ERREURS:
            ERREURS.remove("Yahoo Or")
    data["fred"] = essai("Taux (FRED)", fred, defaut={})
    if "Taux 10 ans US" not in data["markets"] and data["fred"].get("DGS10"):
        data["markets"]["Taux 10 ans US"] = {"ticker": "DGS10", "d": [[int(dt.datetime.fromisoformat(j).replace(tzinfo=dt.timezone.utc).timestamp()), v] for j, v in data["fred"]["DGS10"]]}
        if "Yahoo Taux 10 ans US" in ERREURS:
            ERREURS.remove("Yahoo Taux 10 ans US")
    data["cot"] = essai("COT (CFTC)", cot, defaut={})
    data["crypto"] = essai("Crypto", crypto, defaut={})
    data["calendar"] = essai("Agenda (ForexFactory)", agenda, defaut=[])
    data["news"] = essai("News (Google)", news, defaut=[])
    po = data["candles"].get("XAUUSD", {}).get("D1", [[0, 0, 0, 0, 0]])[-1][4]
    data["options"] = essai("Options", options, po, defaut={})
    data["errors"] = ERREURS[:]
    os.makedirs(os.path.dirname(os.path.abspath(SORTIE)), exist_ok=True)
    with open(SORTIE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    log(f"\nFichier écrit : {SORTIE} ({os.path.getsize(SORTIE) / 1e6:.1f} Mo)")
    if ERREURS:
        log("Sources indisponibles cette fois :", ", ".join(ERREURS))
    if not data["candles"]:
        sys.exit("Aucun cours récupéré : le terminal garde la version précédente.")


if __name__ == "__main__":
    main()
