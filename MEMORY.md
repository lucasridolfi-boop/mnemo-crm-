# 🧠 Mnemo — Mémoire Projet pour Claude Code

> Fichier de référence persistant. Mis à jour au fil des sessions. Toujours charger en début de session.
> Dernière mise à jour : Novembre 2026.

---

## 👤 Qui est l'utilisateur ?

**Lucas Ridolfi** — basé à **Dubaï**. Développe Mnemo seul (sans co-fondateur technique), pilote le produit et la vision, s'appuie sur l'IA pour développer et structurer le projet.

---

## 🚀 Qu'est-ce que Mnemo ?

CRM de **mémoire relationnelle** pour dealmakers, M&A advisors, private bankers, family office managers et C-levels. Transforme chaque rencontre, réunion et appel en intelligence actionnable sur chaque contact — pour ne jamais perdre un deal parce qu'on a oublié ce qui a été dit.

**Tagline :** *The West built CRMs for inboxes. In MENA, deals are closed with a handshake and a voice note. Mnemo was built for the way you actually do business.*

**Origine du nom :** Mnémosyne, déesse grecque de la mémoire, mère des 9 Muses.

**URL de production :** https://crmlucasridolfi.netlify.app

---

## 🎯 ICP v1

- Dealmakers, M&A advisors, private bankers, family office managers, C-Levels
- 5–20 ans d'expérience, deals $500K–$10M, 15–40 meetings/mois, +100 contacts en parallèle
- Langues : EN / FR / AR — Marché prioritaire : Dubai, MENA
- Outils actuels : WhatsApp + Excel + Notes iPhone + LinkedIn (chaos total)
- Willingness to pay : $150–300/mois si ça sauve 1 deal par an

---

## 🛠️ Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | HTML/CSS/JS vanilla — **un seul fichier `index.html`** (~6 500+ lignes) |
| Base de données | Supabase (PostgreSQL) — localStorage fallback si non configuré |
| IA | API Anthropic Claude via proxy Netlify (`/.netlify/functions/claude`) |
| Transcription | Whisper OpenAI via proxy Netlify (`/.netlify/functions/whisper`) |
| PDF export | jsPDF |
| Hébergement | Netlify (auto-deploy depuis GitHub) |
| Fonts | Geist + Geist Mono |

**Repo GitHub :** `lucasridolfi-boop/mnemo-crm-` (noter le tiret final)
**Branche de travail :** `main-hd09fy`

**Workflow :** modifier `index.html` → `git add index.html` → `git commit` → `git push origin main-hd09fy` → Netlify redéploie automatiquement

**Netlify functions disponibles :**
- `netlify/functions/whisper.js` — proxy Whisper (audio → transcription)
- `netlify/functions/claude.js` — proxy Claude (IA)
- `netlify/functions/openai.js` — proxy OpenAI (générique)

---

## 🗄️ Structure Supabase

```sql
clients (id, name, company, email, phone, status, tags, avatar, color, ca, firstname, role, linkedin, location, context, project, target, followon, category)
interactions (id, client_id, title, source, transcript, summary, duration, date)
tasks (id, client_id, title, due_date, done, priority)
```

**Clés API à configurer dans l'app (Settings) :**
- Anthropic API Key (`ak`)
- OpenAI API Key (`oaKey`) — active Whisper
- Supabase URL (`sbUrl`) + Anon Key (`sbKey`)
- Microsoft Client ID (`msId`) — Teams/Outlook
- Fireflies API Key (`ffKey`)
- Plaud API Key (`plaudKey`)
- Google Calendar ID (`gcalId`)
- Zoom credentials (`zoomAccountId`, `zoomClientId`, `zoomClientSecret`)
- Aircall (`aircallId`, `aircallToken`)

**Clés côté serveur Netlify (env vars, pas dans l'app) :**
- `OPENAI_API_KEY` — pour Whisper en production
- `ANTHROPIC_API_KEY` — pour Claude en production

---

## ✅ Fonctionnalités Implémentées (état Novembre 2026)

### Vues principales (nav gauche)
- **Dashboard** — KPIs, pipeline visuel, activité récente, tâches du jour
- **Contacts** — sidebar filtres statut + catégorie dynamique
- **Pipeline** — Kanban 6 colonnes drag & drop (Lead → Gagné/Perdu)
- **Analytics** — graphiques statuts, sources, catégories
- **Follow-up IA** — détecte contacts inactifs +14j, génère messages de relance
- **Séquences** — templates email avec variables `{{prenom}}` `{{entreprise}}`
- **Location** — vue par lieu (map + liste des contacts rencontrés par endroit)

### Fiche Contact — 9 onglets
1. **Fiche** — infos structurées (nom, prénom, poste, société, email, tél, LinkedIn, catégorie, statut, lieu, contexte, projet, target, follow-on)
2. **Timeline** — interactions chronologiques
3. **Emails** — historique + composition
4. **Réunions** — physique/online/appel avec transcription audio
5. **Transcriptions** — toutes les transcriptions
6. **Tâches** — priorités + dates d'échéance
7. **Recherche IA** — questions en langage naturel sur le contact
8. **Lieu & Photo** — scan carte de visite, recherche par lieu/date
9. **Insights** — analyse IA du profil

### Fonctionnalités IA
- Transcription audio via **Whisper** (MediaRecorder + proxy Netlify) — remplace Web Speech API
- Résumé automatique notes vocales via Claude
- Recherche globale IA dans toutes les conversations
- Recherche par contact en langage naturel
- Enrichissement IA (insights, tags suggérés)
- Scan photo/carte de visite → pré-remplissage fiche

### Intégrations
- Fireflies.ai (import réunions via GraphQL)
- Microsoft Teams (sync via Graph API)
- Outlook (sync emails via Graph API)
- Google Calendar (sync)
- Gmail (sync)
- Zoom (note-taker)
- Plaud (enregistrements physiques)
- Aircall (appels)

### UX / Interface
- Mode sombre/clair
- **i18n 3 langues** : English / Français / العربية (RTL pour l'arabe)
- Command Palette ⌘K
- Raccourcis clavier : N (nouveau contact), D (dashboard), C (contacts), P (pipeline), A (analytics), L (location)
- PWA installable (manifest inline + service worker)
- **Topbar** : bouton Sync (dropdown), Team (dropdown), Langue (dropdown 🇬🇧/🇫🇷/🇸🇦)
- **Barre d'actions** : dropdown Intégrations (13 options consolidées)
- **Sélecteur de lieux** : dropdown 📍 Lieux & événements
- **Sélecteur de mois** : select avec mois lisibles (pas de tirets)
- Export PDF professionnel (5 sections)
- Score de relation (chaleur, fréquence)
- Notifications navigateur

---

## 📋 Ce Qui Reste À Faire (Backlog Priorisé)

| Priorité | Feature | Complexité | Notes |
|----------|---------|------------|-------|
| 🔴 P0 | Configurer Supabase | Faible | Entrer URL + Anon Key dans Settings |
| 🔴 P0 | Configurer `OPENAI_API_KEY` sur Netlify | Très faible | Netlify → Site Settings → Env Vars |
| 🔴 P0 | Multi-users complet (partage fiches + permissions) | Complexe | — |
| 🟠 P1 | Gmail sync | Moyenne | OAuth Google + Gmail API |
| 🟠 P1 | Email pixel tracking | Moyenne | Supabase Edge Function |
| 🟠 P1 | WhatsApp sync réel (QR ou forward) | Complexe | — |
| 🟠 P1 | Zoom integration note-taker | Moyenne | — |
| 🟡 P2 | Enregistrement appel téléphonique (Aircall) | Moyenne | — |
| 🟡 P2 | Slack sync | Moyenne | — |
| 🔵 P3 | App mobile native | Complexe | PWA couvre 80% du besoin |

---

## 🔧 Règles de Développement — CRITIQUES

### Toujours utiliser
- `locale()` au lieu de `'fr-FR'` hardcodé → retourne `'ar-SA'` / `'fr-FR'` / `'en-GB'` selon `CFG.lang`
- `openPane(id)` pour ouvrir un onglet de fiche contact (pas `swPane()` directement sauf depuis les boutons de tabs)
- L'Edit tool pour modifier `index.html` — ne jamais extraire du code depuis Word

### Bugs connus / pièges
- Les vues utilisent `position:absolute` + `.view.on{display:flex}` — les vues scrollables (dash, pipeline, analytics) nécessitent `display:block` via CSS spécifique
- La recherche globale (`#global-results`) doit être au niveau `#content`, PAS dans `#view-contacts`
- Éviter les doublons de fonctions (`gotoView`, `renderPipeline`, etc.) lors des ajouts
- Valider le JS après toute modification significative : `node -e "require('fs').readFileSync('index.html','utf8')" 2>&1`

### Objet CFG
```js
let CFG = {
  ak:'',        // Anthropic API key
  sbUrl:'',     // Supabase URL
  sbKey:'',     // Supabase Anon Key
  msId:'',      // Microsoft Client ID
  ffKey:'',     // Fireflies API Key
  plaudKey:'',  // Plaud API Key
  gcalId:'',    // Google Calendar ID
  zoomAccountId:'', zoomClientId:'', zoomClientSecret:'',
  aircallId:'', aircallToken:'',
  lang:'en',    // 'en' | 'fr' | 'ar'
  oaKey:''      // OpenAI API key (Whisper)
};
```

---

## 💰 Modèle Économique

| Plan | Prix | Cible |
|------|------|-------|
| Solo | $149/mois ou $1,200/an | Dealmaker indépendant |
| Team | $399/mois (3 users) | Boutique M&A, agence immo |
| Enterprise | Sur devis | Family offices, agences premium |

**Objectifs :** 50 users Solo → $7,500 MRR (6 mois) → 200 users → $30,000 MRR → Seed $3–6M

---

## 🏆 Positionnement Concurrentiel

| Critère | Folk | Clay | Fireflies | **Mnemo** |
|---------|------|------|-----------|-----------|
| Audio / Vocal First | ❌ | ❌ | Partiel | ✅ |
| Recherche dans transcripts PAR contact | ❌ | ❌ | Global seulement | ✅ |
| Conçu pour dealmakers indépendants | ❌ | Partiel | ❌ | ✅ |
| Marché MENA natif (FR/EN/AR) | ❌ | ❌ | ❌ | ✅ |

**Moat :** 1) Distribution réseau direct Dubai 2) Lock-in données conversationnelles 3) Focus vertical niche 4) Seul outil vocal + transcription réunion + recherche par contact combinés

---

## 🗒️ Insights Utilisateurs Clés

**Jonathan (14/03/2026) :** "Dans un monde parfait, sync : mailbox + video call (note taker) + phone calls (record line) + physical meeting (note taker/CR) + SMS + project management (Slack, Teams)" → la valeur est dans l'**agrégation de TOUTES les touchpoints en une fiche unifiée**.

---

## 🔗 Liens Utiles

- **Proto live :** https://crmlucasridolfi.netlify.app
- **Repo GitHub :** https://github.com/lucasridolfi-boop/mnemo-crm-
- **Notion — Vision & Stratégie :** https://www.notion.so/322dd3c8b0eb80e394dfd1f629ab622a
- **Notion — Coding & API :** https://www.notion.so/324dd3c8b0eb81e3a602f0ccf5392687
- **Notion — Plan d'Action :** https://www.notion.so/32add3c8b0eb81ffab02ff5e815cadd7
- **Notion — Analyse Concurrentielle :** https://www.notion.so/326dd3c8b0eb8141bc98dcaffb90dead
- **Survey (répondants) :** https://docs.google.com/forms/d/e/1FAIpQLScVL4RjdOFwHgySCIKAtpVixnbHn0-0t5lqWFc5n7XNZhytJQ/viewform

---

## 📜 Historique des Sessions

### Session 1–3 (Mars 2026 — Windows local)
- Création structure app, vues principales, fiche contact 8 onglets
- Intégrations Fireflies, Teams, Outlook
- Transcription Web Speech API (Chrome natif)
- Export PDF, Command Palette, raccourcis clavier
- Notes Notion (Vision, Coding, Plan d'action, Analyse concurrentielle)
- Survey discovery (FR + EN MENA)

### Session 4 (Octobre–Novembre 2026 — Cloud)
- **Audit code** : 9 problèmes trouvés et corrigés (`.ok` checks, `locale()` migration, ligne morte)
- **Migration vocale vers Whisper** : MediaRecorder + proxy Netlify — remplace Web Speech API
- **Refonte UX dropdowns** :
  - Bouton Sync → dropdown (Teams, Outlook, GCal, Gmail, Zoom + statut DB)
  - Bouton Team → dropdown (Se connecter / Rejoindre)
  - Bouton Langue → dropdown avec drapeaux 🇬🇧🇫🇷🇸🇦
  - Sélecteur Lieux → dropdown 📍
  - Sélecteur mois → select propre (sans tirets)
  - Bouton Intégrations → 1 dropdown (13 options)
- **MEMORY.md créé** dans le repo pour persistance inter-sessions
