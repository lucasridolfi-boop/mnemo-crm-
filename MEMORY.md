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
| `supabase/schema.sql` | Schéma de synchronisation (table `mnemo_items` + RLS), à exécuter une fois dans Supabase |
| `mobile/` | Application iOS et Android (Capacitor 8) : coquille native autour de `index.html` |
| `.github/workflows/android.yml` | Compile l'APK Android de test à chaque changement |
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

## Application mobile (`mobile/`)

- **Un seul code** : l'app embarque `../index.html` tel quel. `npm run build` le copie dans `mobile/www/` (non versionné), `npx cap sync` le pousse dans `android/` et `ios/`. Ne jamais modifier `www/` ni les copies `public/`.
- Identifiant : `app.mnemo.crm` (à confirmer avant toute publication : il devient définitif sur les stores). Nom : Mnemo.
- Dans l'app, `NATIVE` est vrai : les fonctions sont appelées sur `https://mnemo-crm.netlify.app` (constante `API`), et le carnet d'adresses est lu par le plugin `@capacitor-community/contacts` (`A['ab-native']`).
- Les fonctions Netlify acceptent les origines de l'app (`capacitor://localhost`, `https://localhost`) **uniquement si `MNEMO_ACCESS_CODE` est défini** et fourni.
- Autorisations déclarées : micro et contacts (`AndroidManifest.xml`, `Info.plist`).
- Android : le workflow GitHub produit `mnemo-android-test` (APK de test, non signé pour le store). iOS : nécessite un Mac ou un service de compilation, et un compte Apple Developer ; jamais compilé à ce jour.
- Pas encore fait : icône et écran de démarrage, signature, fiches des stores, mises à jour à chaud.

## Contacts du téléphone

`S.li` contient tout le réseau hors Mnemo : relations LinkedIn et contacts du carnet d'adresses (`src:'ab'`). Sources : fichier vCard ou CSV (Google, Outlook), sélecteur de contacts du navigateur (Android), carnet natif dans l'app. Ils apparaissent dans l'anneau extérieur de la carte ; « Add to Mnemo » en fait une fiche. Les fiches existantes sont complétées (téléphone, e-mail, société, poste) sans rien écraser. `mergeBooks` évite les doublons LinkedIn/carnet.

## Garder le contact (inspiré de Dex, Clay, Salesforce)

- **Rythme** `c.cadence` (0, 14, 30, 90, 180 jours) → `dueIn(c)` ; la page Today liste « À relancer » (dus d'abord, puis les relations qui s'éteignent), bouton ✓ « Marquer comme contacté ».
- **Historique en un geste** : 5 tuiles sur la fiche (Appel, E-mail, SMS, WhatsApp, Réunion) qui notent un échange daté sans détails, avec Annuler ; `sms` est un canal à part entière.
- **Rappels** : relances avec dates rapides (demain, semaine prochaine, dans un mois) ; pastille rouge sur l'onglet Today (`remindersDue()`) ; notification système une fois par jour si autorisée dans Settings.
- **Anniversaires** `c.birthday` → section « À venir » (14 jours) et message rédigé par l'IA.
- **Groupes** `c.group` (un nom libre, suggestions existantes) → pastilles de filtre sur People et sur la fiche.
- **Années** : `yearsOf(c)` = année de rencontre (`c.metOn`) + années des échanges ; filtre `S.year` partagé par People et la carte.
- **Scan de carte de visite** (onglet Card de Capture) : photo réduite à 1600 px JPEG → Claude (vision) → fiche pré-remplie ; si la personne existe (e-mail ou nom), elle est complétée sans doublon.

## Carte du monde (onglet Map)

- **Aucune dépendance externe** : silhouette des terres Natural Earth 1:50m (domaine public, via `world-atlas` ISC), projection Equal Earth, intégrée dans `WORLD_D` (~128 Ko). Générée par un script (topojson → chemin SVG, découpage à l'antiméridien) ; pour la régénérer : `npm pack world-atlas@2`, décoder `land-50m.json`, simplifier à 1 unité.
- SVG avec `viewBox` : glisser, molette, pincement, double-clic, boutons +/−/recadrer ; pastilles à taille constante regroupées quand elles se chevauchent ; `eqEarth(lat,lng)` donne les coordonnées.
- Lieu = `c.city`, sinon « Where we met » ; ~75 villes résolues sur l'appareil (`GAZ`), le reste via Nominatim (1 req/s, 30 par session, cache `mnemo_geo`).
- Le clic sur une pastille est mémorisé à l'appui (`MAP.down`) car la capture du pointeur redirige le relâchement vers le SVG.

## Sessions programmées (développement continu)

Une tâche programmée « Mnemo — développement continu » relance cette session toutes les 4 h (minute 35) pour avancer sur le backlog, tester, mettre en ligne et faire un compte rendu. Backlog, dans l'ordre :
- [x] a) Deals : probabilité par étape (modifiable), pipeline pondéré, jours dans l'étape (orange > 30 j), date de clôture dépassée, deals sur la fiche contact.
- [x] b) Modèles de messages (e-mail/WhatsApp) avec variables, et relances en série. Modèles dans `S.cfg.tpls` (local à l'appareil, non synchronisés ; 4 modèles par défaut traduits tant que l'utilisateur n'en modifie aucun), variables {first} {name} {company} {project} {city} {last}. Envoi WhatsApp/e-mail = interaction `out:true` sur la fiche ; relances = tâches `seq/seqAt/step/of` ; `seqSweep()` (dans save) les coche (`auto:'reply'`) dès qu'une interaction non envoyée par Mnemo arrive après l'envoi ; renvoyer un message depuis Mnemo coche la relance suivante.
- [x] c) Résumé hebdomadaire des relations sur Today. Carte « Votre semaine » (7 jours glissants) : échanges vs semaine précédente, personnes (+ nouvelles via createdAt), relances faites (`doneAt` posé au cochage), deals avancés (`stageAt`) et gagnés, « Le plus de temps avec », « Ça refroidit » (≥ 3 échanges, silence 4 à 10 semaines). Bilan IA facultatif stocké dans localStorage `mnemo_week` (gardé 7 jours).
- [x] d) Export PDF d'une fiche. Bouton « PDF » sur la fiche → `pdfHtml(c)` (document A4 imprimable : coordonnées, brief, relances ouvertes, deals, « Connaît », 40 derniers échanges avec résumé) dans une iframe cachée + `print()` → « Enregistrer au format PDF ». Arabe en RTL (e-mail/téléphone forcés LTR). Limite : l'impression n'existe pas dans la WebView Android de l'app native (toast d'explication) — à traiter avec un plugin Capacitor si besoin.
- [x] e) Bouton micro dans « Dites-le à Mnemo ». État `TD` (idle/live/busy) : MediaRecorder → `transcribe()` (Whisper) → texte ajouté à la suite de ce qui est tapé, champ focalisé pour relire avant « Classer ». Arrêt auto à 3 min, chrono rouge, état conservé à chaque re-render, champ vidé après classement.
- [x] f) Premier lancement guidé (sans données d'exemple). Au tout premier lancement (aucun `ncrm3_clients` stocké), plus de données d'exemple : guide plein écran `#onb` (état `ONB`, `onbRender()` rappelé après chaque render) en 5 écrans : accueil (Commencer / Découvrir avec des exemples / « J'utilise déjà Mnemo — me connecter »), réseau (LinkedIn, contacts du téléphone, carte de visite, ajout manuel, avec compteurs), code d'accès, connexion Supabase (syncPanel), fin. Drapeau `mnemo_onb`. `?demo` dans l'URL ouvre directement l'espace d'exemple (utile pour les démos investisseurs : https://mnemo-crm.netlify.app/?demo) — les tests l'utilisent. Corrige aussi un bug : après « Repartir de zéro », un rechargement ramenait les exemples.
- [x] g) Audit indépendant et corrections (22 nov.). audit2.js étendu aux nouveautés (feuille de message, éditeur de modèles, bilan hebdo, PDF, 5 écrans du guide) × 5 configurations (desktop/mobile, clair/sombre, EN/FR/AR) + 1 500 contacts (réseau 0,97 s, carte 1,8 s, sauvegarde 25 ms). Corrigé : puces du bilan hebdo trop petites au doigt (36 px), PDF désactivé proprement dans toute app native (iOS aussi). Restent acceptés : cases à cocher 22 px avec zone tactile 44 px ; focus du champ « Dites-le » visible sur son conteneur.
- Backlog suivant (sessions programmées), dans l'ordre :
  - [x] h) Listes intelligentes enregistrées. Bouton « Filtrer » dans People (ville, sans contact depuis 30/60/90/180 j — « jamais » compte comme silencieux —, deal ouvert, relance due), combiné au cercle/groupe/année/recherche ; barre de résumé + « Enregistrer comme liste » ; listes dans `S.cfg.lists` (locales, comme les modèles), puces avec compteur vivant, un geste pour appliquer/retirer, suppression depuis la feuille Filtrer. `peopleList(f)` prend désormais un état de filtre. Corrigé au passage : colonne People plus large que l'écran sur mobile (bouton cachés, anneaux de score invisibles), bouton « N autres personnes chez… » et sélecteur de liens qui débordaient à 360 px, ligne Appel/E-mail/… qui débordait à 320 px. audit2.js détecte désormais les conteneurs plus larges que l'écran ; scratchpad/overflow.js balaie toutes les fiches à 320/360/390 px en EN/FR/AR.
  - [x] i) Fiche deal enrichie. Carte du deal : « Prochaine étape : relance · date » (rouge si en retard) ou « Dernier échange il y a… ». Fenêtre du deal : historique des étapes (`d.hist`, posé par `setStage` et à la création), bloc « Avec {prénom} » (`dealActivity`) : boutons Appel/E-mail/WhatsApp/Rendez-vous (l'échange est noté sur la personne avec le nom du deal en résumé), Écrire un message, rendez-vous à venir, 4 derniers échanges, relances ouvertes cochables, ajout d'une relance avec date (Entrée). Le bloc se rafraîchit seul (`#deal-act`) sans perdre la saisie du formulaire.
  - [x] j) Raccourcis clavier : / recherche, N nouvelle personne, T « Dites-le à Mnemo », R note vocale (sur la personne ouverte), M message, E modifier, J/K personne suivante/précédente, G puis T/P/N/M/D pour naviguer (1,5 s), ? aide (aussi dans Réglages sur les appareils à souris). Inactifs pendant la saisie, avec une fenêtre ouverte, pendant le guide ou une dictée.
  - [x] k) Performances à grande échelle. La carte était déjà rapide (affichage des épingles ~110 ms à 5 000 contacts ; les « 1,8 s » de l'audit étaient son propre délai d'attente — mesure corrigée dans audit2.js). Le vrai goulot était People : liste rendue par tranches (`PL_N`=200, bouton « Afficher 500 de plus », la personne sélectionnée toujours incluse, la recherche porte sur tout le monde) et sélecteur « Lier quelqu'un » rempli seulement à l'ouverture (`linkPickFill`). À 5 000 contacts : ouvrir une fiche 1 670 → 102 ms, People 678 → 159 ms, frappe dans la recherche 263 → 30 ms. Scripts : scratchpad/perf3.js, test-perf.js.
  - [x] l) Nouvel audit (22 nov., 21 h 35) : audit2.js étendu (feuille Filtrer, liste filtrée, liste enregistrée, activité du deal, raccourcis) × 5 configurations. Aucun nouveau défaut ; timings réalistes à 1 500 contacts (réseau 125 ms, carte 106 ms, People 78 ms). Restent acceptés : cases à cocher 22 px (zone 44 px), focus de « Dites-le » sur son conteneur.
- Backlog suivant (proposé le 22 nov.), dans l'ordre :
  - [x] m) Pages Société (`companies()`, `A.company`, regroupement par `normCo` qui ignore LLC/Ltd/Holding…). Fenêtre : chiffres (dans Mnemo, relations LinkedIn/téléphone, pipeline ouvert), « Meilleure porte d'entrée » (contact le plus fort, sinon quelqu'un de Mnemo lié à l'un d'eux), dernier échange, personnes, deals, relances, mémoire récente, relations pas encore dans Mnemo. Ouverte depuis le nom de société sur la fiche, la puce « N autres personnes chez… » et la recherche (⌘K, rubrique Sociétés). `A.go` ferme désormais la fenêtre ouverte avant de naviguer.
  - [x] n) « Ajouter au calendrier » (`icsText`, `A.ics`) : fichier .ics RFC 5545 (texte échappé, lignes pliées) pour un rendez-vous à venir (1 h, rappel 30 min, heure locale convertie en UTC) ou une relance datée (journée entière, rappel 9 h). Boutons sur les rendez-vous à venir de la fiche, dans « À venir » sur Today et sur chaque relance datée de la fiche. Indisponible dans l'app native (toast).
  - [x] o) Liens sur une fiche (section « Liens ») et sur un deal (fenêtre du deal) : `files:[{id,url,label,at}]` sur la personne ou le deal (synchronisés avec eux), `linksBlock`, service reconnu (`service()` : DocSend, Google Docs/Sheets/Slides/Drive, Dropbox, Box, OneDrive/SharePoint, Notion, Figma, Pitch, data rooms Datasite/Intralinks/Ansarada/Firmex/iDeals, Zoom, Teams…), `safeUrl` refuse ce qui n'est pas http(s), ouverture en nouvel onglet noopener. Liens inclus dans le PDF.
  - [x] p) « Préparer ma journée » : bouton dans « À venir » sur Today (rendez-vous et appels datés du jour ; après 17 h sans rendez-vous restant : « Préparer demain »). Fenêtre avec chaque rendez-vous dans l'ordre et son brief (`briefPrompt`, réutilisé si < 12 h, sinon généré un par un et enregistré sur la fiche), bouton « Ouvrir la fiche ».
  - [x] q) Audit (23 nov., 13 h 35) étendu aux pages Société, liens et « Préparer ma journée ». Corrigé : nom de société et bouton « retirer le lien » trop petits au doigt sur mobile ; « 1 meetings » → singulier. Aucun autre défaut ; timings à 1 500 contacts ≤ 132 ms.
- Backlog suivant (proposé le 23 nov.), dans l'ordre :
  - [x] r) Coller un fil d'e-mails : coller un texte multi-ligne (> 200 car.) dans « Dites-le à Mnemo » ouvre la fenêtre « Coller un e-mail » (`A.mail`, aussi dans ⌘K) qui garde les retours à la ligne ; `A.tell` en mode mail (16 000 car.) demande aussi `contacts` (en-têtes + signatures) ; `mailContacts` propose « Compléter X » (champs manquants : e-mail, téléphone, poste, société) ou « Ajouter Y » (nouvelle fiche liée à la personne principale), cases à cocher dans la relecture ; échange classé en type e-mail, daté du dernier message.
  - [x] s) Introductions à double accord : bouton « Présenter » sur la fiche → choix de B + raison → demande d'accord rédigée pour B (WhatsApp / e-mail / copier, notée sur B) + relance « B est-il d'accord… ? » à J+3 → « B est d'accord » → message de mise en relation pour les deux (e-mail aux deux adresses) → statut Présentés, lien A↔B (via 'intro'), échange noté sur les deux, relance fermée ; ou « B a refusé ». Stocké dans `A.intros[{id,to,why,status,at,ask}]`, section « Introductions » sur les deux fiches.
  - [x] t) Deals par projet : champ « Projet » dans la fenêtre du deal (`d.group`, suggestions des projets et groupes existants ; à défaut le groupe de la personne est utilisé — `dealGroup`). Puces au-dessus du tableau (« Tous les deals · n », puis chaque projet avec nombre et montant ouvert), filtre `S.dgrp`, totaux d'en-tête filtrés, nouveau deal pré-rempli avec le projet actif.
  - [x] u) Notes vocales hors ligne : sans réseau (ou si l'envoi échoue pour cause de réseau, `netDown`), l'enregistrement est gardé dans IndexedDB (`mnemo-voice`/`q`, `voiceQueue`) avec un échange « Note vocale · En attente de connexion » sur la fiche ; `voiceQueueRun` (au retour en ligne, au retour sur l'onglet, au démarrage) transcrit, résume, ajoute les relances, remplace l'attente et vide la file. Hors ligne, pas de relecture : tout est classé automatiquement. Les enregistrements eux-mêmes restent sur l'appareil (non synchronisés).
  - [x] v) Audit (24 nov., 5 h 35) étendu aux e-mails collés, introductions, projets de deals et notes en attente. Corrigé : champs « coller un e-mail » et message d'introduction sans nom accessible ; bouton « Supprimer » de l'historique trop petit au doigt (surtout en arabe). Aucun autre défaut ; ≤ 113 ms à 1 500 contacts.
- Backlog suivant (proposé le 24 nov.), dans l'ordre :
  - [x] w) Recherche en langage naturel dans People (`A['pq-ai']`) : Entrée dans la recherche avec ≥ 3 mots → l'IA (modèle rapide) reçoit villes, groupes et années existants et renvoie cercle/groupe/ville/silence/deal/relance/année/texte ; valeurs recalées sur les listes existantes ; résultat = filtres habituels + barre « Enregistrer comme liste ». Moins de 3 mots : recherche simple. Villes : `cityOf(c)` = ville saisie, sinon celle reconnue dans « où nous nous sommes rencontrés » (même gazetteer que la carte, `placeOf`) — utilisée par le filtre Ville, la fenêtre Filtrer et l'IA ; correspondance approchée (Riyad → Riyadh) et ville restée dans le texte libre déplacée vers le filtre.
  - [x] x) « Deals à surveiller » sur Today (`dealsToWatch`) : deals ouverts avec date de clôture dépassée (rouge), > 30 j dans l'étape (orange) ou sans prochaine étape (aucune relance ouverte pour la personne) ; triés par gravité puis montant, 5 max, un geste ouvre le deal ; section masquée quand tout va bien.
  - [x] y) Export du pipeline (boutons « Excel » et « Rapport » sur Deals, suivent le filtre de projet) : CSV UTF-8 avec BOM, « ; » en français (Excel FR) sinon « , », montants bruts, probabilité, pondéré, prochaine étape, jours dans l'étape ; rapport A4 d'une page (`pipeHtml`, imprimé via `printHtml` partagé avec le PDF de fiche) : chiffres clés, par étape, par projet, deals ouverts triés par pondéré, deals à surveiller.
  - [x] z) Assistant « Nettoyer » (`tidyList`, `A.tidy`, sans IA, règles déterministes) : noms tout en majuscules/minuscules → casse correcte (particules de/la/van… en minuscules, traits d'union gérés), e-mails en minuscules sans espaces, liens LinkedIn complétés en https, ville déduite du lieu de rencontre (gazetteer uniquement), une seule orthographe par société (la plus utilisée). Bandeau « N corrections proposées » dans People + ⌘K ; cases à décocher ; jamais appliqué aux données d'exemple ; 20 ms pour 3 000 contacts.
  - [x] aa) Audit (24 nov., 21 h 35) étendu aux deals à surveiller, nettoyage, rapport pipeline et boutons d'export. Corrigé : fond du rapport PDF non déclaré (contraste/rendu en mode sombre). Poids : index.html 492 Ko avant ab) (172 Ko gzip, dont ~128 Ko de carte) ; premier affichage 2,1 s en 4G lente + CPU ×4, puis cache du service worker.
- Backlog suivant (proposé le 24 nov. soir), dans l'ordre :
  - [x] ab) Carte à la demande : le tracé des terres est dans `world.js` (128 Ko, `window.WORLD_D`), chargé par `loadWorld()` à l'ouverture de la carte ou en tâche de fond 3 s après le démarrage ; ajouté au cache du service worker (`mnemo-shell-v3`) et à la copie de l'app mobile (`mobile/scripts/build-www.mjs`). index.html : 172 → 121 Ko gzip. Pour régénérer la carte, écrire le nouveau tracé dans world.js.
  - [x] ac) Actions groupées dans People : bouton « Sélectionner » (`S.pick`, `pickRows`, barre flottante `#pickbar`, sur une ligne défilante au-dessus des onglets sur mobile), « Tout sélectionner » sur la liste filtrée ; actions : Message (modèle au choix → une fenêtre par personne pré-remplie, « 2/3 », Passer, l'envoi enchaîne sur la suivante, Échap arrête — file `BULK`), Groupe (ou le retirer), Rythme de contact, CSV des sélectionnés. Quitter People termine la sélection.
  - [ ] ad) Trames de rendez-vous : premier rendez-vous, préparation de comité, appel de due diligence — questions à couvrir, notes guidées, brief à la fin.
  - [ ] ae) Rappels « il y a un an » sur Today (rencontré il y a 1 an, dernier deal signé…), à la Dex, pour relancer avec une bonne raison.
  - [ ] af) Audit indépendant + corrections.
  - Décision Lucas : espace d'équipe partagé (plusieurs utilisateurs sur les mêmes contacts/deals) — demande un changement du schéma Supabase et une gestion des invitations ; à valider avant de commencer.
  - Bloqué par Lucas : synchronisation des modèles de messages et des listes enregistrées (il faut ajouter 'cfg' au CHECK de `mnemo_items.kind` dans Supabase — une ligne SQL à exécuter).

Bloqué en attente de Lucas : compte Apple Developer + Mac/service de build (iOS), compte Google Play, identifiants OAuth Google/Microsoft (sync e-mails/agenda), compte Stripe (abonnements), suppression des projets Netlify `mnemodeals` et `crmlucasridolfi`, crochets du deck, identifiant d'app.

## IA : réflexion des modèles

Les modèles Claude actuels réfléchissent avant de répondre, et cette réflexion compte dans `max_tokens`. `ai()` envoie `output_config.effort` (low pour l'extraction rapide, medium sinon), ajoute 3 000 jetons de marge, et lève une erreur si la réponse est vide ou coupée. Le proxy laisse passer `effort` (low/medium/high) et jusqu'à 8 000 jetons.

## Nouveautés du 21/11/2026

- **Import audio** (Capture → Voice → Import an audio file) : notes vocales WhatsApp `.opus`, mémos iPhone, MP3… Au-delà de 4 Mo ou format non accepté par Whisper : décodage sur l'appareil, 16 kHz mono, morceaux WAV de 100 s.
- **Rendez-vous à venir** : un échange daté dans le futur est « Upcoming », n'entre pas dans le dernier contact ni la force (`pastEvents`), apparaît dans « Coming up » avec « Brief me ». Bouton « Plan a meeting » sur la fiche.
- **Dites-le à Mnemo** (champ sur Today) : une phrase → l'IA identifie la personne (ou en propose une nouvelle), le type, la date, les relances et les personnes mentionnées → écran de validation.
- **Doublons** : même e-mail, téléphone ou nom ; fusion qui conserve tout (échanges, relances, deals, présentations, liens) ; « Pas la même personne » mémorisé (`notDup`).
- **Enregistrer dans les contacts** : export vCard d'une fiche.
- **Hors ligne** : `sw.js` (réseau d'abord, cache ensuite), enregistré seulement sur le site en HTTPS, jamais dans l'app native.

## Accessibilité (audit du 17/11/2026)

Contraste AA vérifié automatiquement (texte secondaire `#5f5f64`, tertiaire `#6e6e73`, surfaces bleues `--accent-fill` sous texte blanc, couleurs d'avatar foncées), libellés sur tous les champs, zones tactiles ≥ 34 px sur téléphone (cases à cocher : cercle 22 px, zone 44 px). Script : audit en boîte noire sur 5 configurations (ordinateur/téléphone, clair/sombre, EN/FR/AR).

## Qui connaît qui (liens entre contacts)

- `linkMap()` réunit trois sources, lues dans les deux sens : liens déclarés (`c.links=[{id,why,via}]`), présentations (`introBy`), et personnes nommées dans les notes (nom complet n'importe où, ou prénom seul s'il est unique dans Mnemo, écrit avec sa majuscule et pas en début de phrase). `c.unlinks` supprime une mention détectée à tort. Cache `LKM`, vidé à chaque `save()`.
- Affichage : section « Circle » de la fiche (liste, « N en commun », ajout, retrait, meilleure porte d'entrée pour un lien faible), arêtes sur la carte, « Vos connecteurs » dans la vue d'ensemble.
- La capture vocale envoie à l'IA la liste des 150 contacts les plus proches et propose de lier ceux mentionnés.
- LinkedIn ne fournit pas les relations en commun : ce graphe est construit uniquement à partir des données de l'utilisateur.

## Synchronisation Supabase (Mnemo 2)

- Projet Supabase : « CRM », `https://bokgaovvctreikgcggwf.supabase.co` (URL et clé publique `sb_publishable_…` inscrites dans `SB_DEFAULT` ; cette clé est publique par conception, la protection vient de la RLS — ne jamais y mettre la clé `secret`/`service_role`).
- Local d'abord : l'app lit et écrit toujours dans localStorage. Connecté (e-mail + mot de passe Supabase), chaque contact, chaque deal et la liste LinkedIn sont répliqués en une ligne de `mnemo_items` (`user_id, kind, id, data jsonb, deleted, updated_ms, server_at`).
- Algorithme (`syncRun`) : marquer les changements locaux (hash par enregistrement, tombstone pour les suppressions) → tirer les lignes modifiées depuis le curseur `server_at` → pousser les enregistrements modifiés. Conflit : **la modification la plus récente d'un enregistrement gagne** (par contact entier, pas par note). Au tout premier sync d'un appareil, la copie du compte gagne sur une copie locale de même identifiant.
- Déclencheurs : 1,5 s après chaque `save()`, au chargement, au retour sur l'onglet, au retour en ligne, toutes les 60 s.
- Jamais synchronisés : données d'exemple (`sample:true`), réglages, clés, code d'accès.
- État local dans `mnemo_sync` (session, méta par enregistrement, curseur). Réglages dans `ncrm3_cfg` : `syncUrl`, `syncKey` (distincts de `sbUrl`/`sbKey` de la version classique, dont le schéma est différent).
- Appels REST directs (`sbFetch`), sans bibliothèque supabase-js.

## Audit de l'ancienne version (novembre 2026)

Bugs constatés dans `classic.html` : nom affiché en double (« Sophie Sophie Martin ») ; mobile inutilisable (sidebar fixe) ; langues mélangées ; `saveClients()` inexistant → notes d'équipe et import de contact partagé jamais enregistrés (corrigé) ; `addSequenceStep()` inexistant ; service worker enregistré depuis une URL `blob:` → jamais actif (pas de mode hors ligne) ; Zoom/Aircall/Plaud appelés depuis le navigateur (bloqués par CORS, secrets en localStorage) ; `esc()` n'échappait pas les guillemets et liens `javascript:` possibles ; sync Supabase partielle (tâches, deals, suppressions non synchronisés) ; enregistrements longs > 6 Mo rejetés par Netlify ; audio iPhone envoyé comme `.webm` → rejeté par Whisper (corrigé dans `whisper.js`).

## À faire

| Priorité | Sujet |
|---|---|
| P0 | Fusionner `main-hd09fy` dans `main` pour mettre Mnemo 2 en production |
| P0 | Vérifier `OPENAI_API_KEY` et `ANTHROPIC_API_KEY` sur Netlify, tester vocal + IA en réel |
| P0 | Définir `MNEMO_ACCESS_CODE` sur Netlify puis le saisir dans Settings (sans lui, seule la vérification d'origine protège les fonctions) |
| P0 | Exécuter `supabase/schema.sql` dans Supabase, puis valider la synchronisation en réel sur deux appareils (testée seulement contre un serveur simulé) |
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
