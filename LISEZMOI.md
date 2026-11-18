# Mini Boss Terminal · version en ligne

Le site : `https://sbbt94.github.io/mini-boss-terminal/`

## Comment ça marche
- **Le robot** (`.github/workflows/mise-a-jour.yml`) : GitHub le lance toutes les 15 min, même quand ton PC est éteint.
  1. `robot/collecte.py` récupère les cours de l'or (Yahoo, recalé sur le prix au comptant) et du bitcoin (Binance). Il prend aussi les taux (FRED), le COT (CFTC), la peur et l'avidité, le financement et l'open interest, les options, l'agenda ForexFactory et les news Google.
  2. `robot/analyse.js` calcule l'analyse avec le même moteur que le terminal et demande à Groq une note d'analyste, une fois par heure maximum.
  3. Le site est republié avec les nouvelles données dans `data/donnees.json` et `data/ia.json`.
- **La page** (`site/index.html`) :
  - elle lit ces fichiers toutes les 5 minutes ;
  - elle reçoit en direct le bitcoin (Binance) et l'or (gold-api.com, sinon Swissquote) ;
  - elle déclenche les alertes : plus haut et plus bas de la veille et de la semaine, support, résistance, tes alertes de prix, annonces fortes.

## Réglages GitHub (à faire une seule fois)
1. **Settings → Pages → Source :** choisis **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → New repository secret :**
   - Nom : `GROQ_API_KEY`
   - Valeur : ta clé Groq.
3. **Onglet Actions :** clique sur « Mise à jour du terminal », puis sur **Run workflow**.

## Si ça bloque
- **Une croix rouge dans Actions :** clique dessus pour voir l'étape en erreur, puis envoie une capture à Claude.
- **Une source manque :** le reste marche quand même. La liste des sources indisponibles est dans le log de l'étape « Collecter ».
- **Le robot s'arrête :** GitHub coupe les robots d'un dépôt resté 60 jours sans activité. Le robot laisse un petit signe de vie chaque lundi pour l'éviter. S'il s'arrête quand même, va dans Actions et clique sur **Enable workflow**.
- **Changer de modèle IA :** Settings → Secrets and variables → Actions → onglet Variables, ajoute `GROQ_MODEL` (exemple : `llama-3.3-70b-versatile`).

## Tes données
- **Tes trades, notes et alertes** restent dans ton navigateur. Elles ne sont jamais envoyées sur GitHub.
- **Le dépôt est public :** tout le monde peut voir le code et les données de marché, mais pas ta clé Groq, qui est gardée dans les secrets.
- Les mentions achat / vente / attendre sont une lecture automatique des indicateurs, pas un conseil en investissement.
