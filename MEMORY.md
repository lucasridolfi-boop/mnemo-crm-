# Mnemo — Mémoire projet pour Claude Code

> Fichier de référence persistant. À lire en début de session. Dernière mise à jour : novembre 2026 (Mnemo 2).

## Utilisateur et produit

**Lucas Ridolfi**, basé à Dubaï, développe Mnemo seul (pas de co-fondateur technique) et s'appuie sur l'IA pour le code.

**Mnemo** : CRM de *mémoire relationnelle* pour dealmakers, M&A advisors, private bankers, family offices et C-levels du MENA. Chaque rencontre, réunion ou appel devient une intelligence actionnable par contact.

- Tagline : *The West built CRMs for inboxes. In MENA, deals are closed with a handshake and a voice note.*
- ICP : 5–20 ans d'expérience, deals $500K–$10M, 15–40 meetings/mois, +100 contacts, EN/FR/AR.
- Prix cible : Solo $149/mois, Team $399/mois (3 users), Enterprise sur devis.
- Insight clé (Jonathan, 14/03/2026) : la valeur est dans l'agrégation de *tous* les points de contact en une fiche unifiée.

## Dépôt et déploiement

- Repo : `lucasridolfi-boop/mnemo-crm-` (tiret final). Production : **https://mnemo-crm.netlify.app** (projet Netlify `mnemo-crm`, auto-deploy depuis `main`).
- Autres projets Netlify : `mnemodeals` (déploie le même dépôt, doublon) ; `crmlucasridolfi` = ancien dépôt manuel de mars 2026 (« NexusCRM v2 »), **jamais mis à jour — ne pas l'utiliser**.
- Branche de travail cloud : `main-hd09fy`. **Mnemo 2 n'est en production qu'après fusion dans `main`.**
- Variables Netlify (côté serveur) : `OPENAI_API_KEY` (Whisper), `ANTHROPIC_API_KEY` (Claude), `MNEMO_ACCESS_CODE` (code d'accès aux fonctions, à saisir aussi dans Settings de l'app).

| Fichier | Rôle |
|---|---|
| `index.html` | **Mnemo 2** — l'application actuelle (fichier unique, ~1 200 lignes) |
| `classic.html` | Ancienne version (6 500 lignes) conservée : intégrations Teams/Outlook/Gmail/Zoom/etc. Partage les mêmes données |
| `netlify/functions/whisper.js` | Proxy Whisper (JSON `{audioBase64, mimeType, language}`) |
| `netlify/functions/claude.js` | Proxy Anthropic Messages API (`model`, `messages`, `system`, `max_tokens` ≤ 4096 uniquement) |
| `manifest.webmanifest`, `icon.svg` | Installation PWA |

## Mnemo 2 — architecture (`index.html`)

Design : sobre, type Apple — clair par défaut (suit le système, sombre disponible), une seule couleur d'accent, police système/Inter, navigation givrée, feuilles modales.

Quatre vues + actions globales :
- **Today** — chiffres clés, relances dues, relations qui s'éteignent (brouillon de message IA), mémoire récente.
- **People** — liste triée par force de relation ; fiche en une seule page : force/cercle, brief IA, À propos, relances, mémoire (timeline unifiée), cercle, question IA.
- **Network** — carte des relations sur canvas : vous au centre, 3 anneaux (Inner ≥ 60, Active ≥ 30, Outer) selon la force, champ LinkedIn à l'extérieur, un secteur par société. Panneau : place dans le cercle, rang, chemin d'introduction (« warm path »), collègues.
- **Deals** — kanban 6 étapes, glisser-déposer.
- **Capture** (bouton global) — Vocal (MediaRecorder → Whisper → Claude → validation), Note, Contact.
- **⌘K / Ctrl K** — recherche contacts + mémoire + LinkedIn, actions, « Ask Mnemo » (IA sur tout le corpus).
- **Settings** — thème, langue EN/FR/AR (RTL), devise, clé Anthropic perso optionnelle, sauvegarde JSON, CSV, import LinkedIn.

### LinkedIn
LinkedIn n'offre **aucune API** pour lire les relations d'un membre. La voie officielle : export « Get a copy of your data » → `Connections.csv`, importé dans l'app (rien ne quitte l'appareil). L'export ne contient pas les relations mutuelles : les liens de la carte viennent de la société commune et du champ « Présenté par » (`introBy`).

### Données (localStorage, clés partagées avec `classic.html`)
- `ncrm3_clients` : `[{id, firstname, name, role, company, email, phone, linkedin, location, context, project, target, followon, status, tags, introBy, brief:{text,at}, sample, ints:[{id,title,date,src,tr,sum,dur}], tasks:[{id,title,due,pri,done}], meetings:[…legacy]}]`
- `ncrm3_deals` : `[{id,title,contactId,contactName,value,stage,closeDate,notes}]` — étapes `lead|qualified|proposal|negotiation|won|lost`
- `mnemo_li` : `[{f,l,url,email,co,pos,on}]` (relations LinkedIn)
- `ncrm3_cfg` : `{lang, cur, ak, …}` ; `ncrm3_theme` : `auto|light|dark`
- Premier lancement sans données : jeu d'exemple (`sample:true`), supprimable via « Start fresh ».

### Force de relation (0–100)
`55·e^(−jours/45)` (récence) + `min(30, 9·log2(1+échanges))` (fréquence) + 8 si deal ouvert + jusqu'à 7 (relances/projet).

### Règles de code Mnemo 2
- Actions : `data-a="nom"` → `A['nom'](el)` (délégation). Saisie : `data-i` → `I[…]`. Entrée : `data-enter`.
- Textes : `t('English string')` — l'anglais est la clé ; ajouter FR **et** AR dans `L`.
- Toujours `esc()` pour tout contenu inséré en HTML ; `safeUrl()` pour les liens.
- Après toute mutation : `save()` puis `render()`.
- Modèles IA dans la constante `MODEL` ; appels via `ai()` (proxy Netlify par défaut).
- Valider après modification : extraire le `<script>` final et `new Function(js)`, puis test navigateur (Playwright).

## Sécurité des fonctions Netlify

Chaque fonction (`guard()` dupliqué dans les deux fichiers, volontairement sans module partagé) :
1. refuse tout appel dont l'en-tête `Origin` n'est pas le site lui-même (hôte de la requête, `URL`/`DEPLOY_PRIME_URL` Netlify, ou `localhost`) — plus aucun en-tête CORS ;
2. si `MNEMO_ACCESS_CODE` est défini, exige l'en-tête `X-Mnemo-Code` identique (comparaison à temps constant), sinon `401 {error:{code:'access_code'}}` ;
3. `claude.js` ne transmet qu'une liste blanche de champs et plafonne `max_tokens` ; `whisper.js` valide type MIME et langue.

La vérification d'origine seule arrête les autres sites web, pas un script qui falsifie l'en-tête : c'est le code d'accès qui protège réellement les clés. Les deux apps envoient `cfg.code` (clé `code` de `ncrm3_cfg`).

## Audit de l'ancienne version (novembre 2026)

Bugs constatés dans `classic.html` : nom affiché en double (« Sophie Sophie Martin ») ; mobile inutilisable (sidebar fixe) ; langues mélangées ; `saveClients()` inexistant → notes d'équipe et import de contact partagé jamais enregistrés (corrigé) ; `addSequenceStep()` inexistant ; service worker enregistré depuis une URL `blob:` → jamais actif (pas de mode hors ligne) ; Zoom/Aircall/Plaud appelés depuis le navigateur (bloqués par CORS, secrets en localStorage) ; `esc()` n'échappait pas les guillemets et liens `javascript:` possibles ; sync Supabase partielle (tâches, deals, suppressions non synchronisés) ; enregistrements longs > 6 Mo rejetés par Netlify ; audio iPhone envoyé comme `.webm` → rejeté par Whisper (corrigé dans `whisper.js`).

## À faire

| Priorité | Sujet |
|---|---|
| P0 | Fusionner `main-hd09fy` dans `main` pour mettre Mnemo 2 en production |
| P0 | Vérifier `OPENAI_API_KEY` et `ANTHROPIC_API_KEY` sur Netlify, tester vocal + IA en réel |
| P0 | Définir `MNEMO_ACCESS_CODE` sur Netlify puis le saisir dans Settings (sans lui, seule la vérification d'origine protège les fonctions) |
| P1 | Synchronisation cloud + comptes (Supabase, avec RLS) — Mnemo 2 est 100 % local pour l'instant |
| P1 | Réintégrer dans Mnemo 2 les synchronisations utiles (Outlook/Gmail/Calendar) via fonctions serveur |
| P2 | Multi-utilisateurs, export PDF, séquences email |

## Liens

- Notion — Vision : https://www.notion.so/322dd3c8b0eb80e394dfd1f629ab622a
- Notion — Coding & API : https://www.notion.so/324dd3c8b0eb81e3a602f0ccf5392687
- Notion — Plan d'action : https://www.notion.so/32add3c8b0eb81ffab02ff5e815cadd7
- Notion — Analyse concurrentielle : https://www.notion.so/326dd3c8b0eb8141bc98dcaffb90dead
- Survey : https://docs.google.com/forms/d/e/1FAIpQLScVL4RjdOFwHgySCIKAtpVixnbHn0-0t5lqWFc5n7XNZhytJQ/viewform

## Historique

- **Mars 2026 (local)** — version classique : vues, fiche 8 onglets, intégrations, PDF, ⌘K, notes Notion, survey.
- **Oct.–nov. 2026** — audit, migration vocale vers Whisper, dropdowns, `MEMORY.md`.
- **Nov. 2026 (cloud)** — **Mnemo 2** : réécriture complète (design sobre, 4 vues, carte des relations + import LinkedIn, vocal segmenté, FR/EN/AR, mobile). Ancienne version conservée dans `classic.html`.
