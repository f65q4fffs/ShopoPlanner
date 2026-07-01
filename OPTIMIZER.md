# OPTIMIZER.md - Memory Blueprint : ShopoPlanner

## 1. Vision & Objectifs du Projet
**ShopoPlanner** est une application web Mobile-First d'optimisation de tournées de livraison de co-transportage (principalement pour les courses Shopopop). L'objectif absolu est de maximiser le gain net du livreur en calculant la rentabilité réelle de chaque trajet en temps réel.
L'application doit fonctionner à **100% gratuitement** pour l'utilisateur final et tourner intégralement sur son smartphone, sans aucun serveur ni base de données payante.

---

## 2. Contraintes Techniques (100% Gratuit & Client-Side)
- **Architecture :** 100% Client-Side (Frontend unique). Aucun backend persistent (pas de Node.js, Python, PostgreSQL, etc.). Tout s'exécute directement dans le navigateur du smartphone.
- **Hébergement :** GitHub Pages (gratuit, statique, HTTPS).
- **OCR / Vision par IA :** API Gemini 1.5 Flash (via le SDK web `@google/generative-ai` ou requêtes HTTP `fetch` directes). Utilisation exclusive du **Free Tier** de Google AI Studio. La clé API est fournie par l'utilisateur et stockée localement dans son navigateur via `localStorage`.
- **Moteur de Routage (GPS) & Géocodage :** 
  - API publique d'**OSRM** (Open Source Routing Machine) pour le calcul des distances de conduite réelles et la matrice de distances (TSP).
  - API **Nominatim (OpenStreetMap)** pour le géocodage des adresses textuelles en coordonnées GPS (latitude/longitude).
  - *Interdiction formelle d'utiliser l'API payante Google Maps (Directions/Distance Matrix).*
- **Données Persistantes :** Stockage local exclusif sur le téléphone de l'utilisateur via le `localStorage` (clé API Gemini, adresses fréquentes, historique).

---

## 3. Paramètres Métiers & Constantes Économiques
Les calculs financiers reposent sur le profil de véhicule (configurable) et la localisation de l'utilisateur :
- **Origine & Destination Finale (Immuable) :** Adresse de départ saisie par l'utilisateur. Toute boucle de livraison démarre et se termine à ce point fixe.
- **Profil Véhicule :** Configurable par l'utilisateur (nom du véhicule et coût de revient kilométrique CRK).
- **Coût de Revient Kilométrique (CRK) réel :** Saisi par l'utilisateur (ex: 0,25 € / km). Ce coût est utilisé pour déduire le coût routier de la tournée.

---

## 4. Logique Algorithmique & Formule de Rentabilité

### Étape 4.1 : OCR & Extraction structurée (Gemini)
1. L'utilisateur prend des captures d'écran de ses propositions de courses (Shopopop) et les importe dans l'application via un input de fichiers multiples.
2. L'application envoie ces images à l'API Gemini 1.5 Flash avec un prompt d'extraction strict.
3. L'API doit retourner un tableau d'objets au format JSON propre suivant :
   ```json
   [
     {
       "gain": 9.50,
       "magasin": "Intermarché, Avenue du Formans, Trévoux",
       "client": "12 Rue de la Paix, Lyon"
     }
   ]
   ```

### Étape 4.2 : Géocodage & Résolution du TSP
1. Les adresses des magasins et des clients sont converties en coordonnées GPS `[lat, lon]` via l'API Nominatim (OpenStreetMap).
2. Une matrice de distances routières réelles est demandée à l'API OSRM entre tous les points (Départ + Magasins + Clients).
3. Résolution du problème du voyageur de commerce (TSP) pour trouver l'ordre optimal de passage minimisant la distance totale de la boucle, en respectant la contrainte suivante : **le magasin associé à une livraison doit obligatoirement être visité avant le client final de cette même livraison**.
4. La boucle commence et se termine obligatoirement à l'adresse de départ.

### Étape 4.3 : Calcul du Bénéfice Net
Le bénéfice net de la tournée est calculé avec la formule suivante :
$$\text{Bénéfice Net} = \sum (\text{Gains de chaque course}) - (\text{Distance Totale de la boucle en km} \times \text{CRK}) - \text{Frais de péage}$$

### Étape 4.4 : Export Itinéraire
L'application génère un itinéraire Google Maps via une URL standardisée regroupant tous les points de passage ordonnés (Waypoints), permettant à l'utilisateur d'ouvrir la tournée optimisée directement dans l'application de navigation native de son smartphone (ex: Google Maps ou Apple Maps).

---

## 5. Architecture & Fichiers du Projet
Le projet est composé d'une structure minimaliste et performante à la racine :
1. `index.html` : Structure de la page web.
   - Interface Mobile-First, épurée, responsive, inspirée du style **Apple Glassmorphism / Minimaliste**.
   - Input d'upload de fichiers multiples pour charger les captures d'écran.
   - Section de configuration de la clé API Gemini (sauvegardée dans le `localStorage`).
   - Affichage interactif des résultats (gain brut, coût kilométrique, gain net, itinéraire suggéré).
2. `style.css` : Design moderne avec variables CSS.
   - Design System épuré (mode sombre / flou de verre / glassmorphism).
   - Polices modernes de type Inter / Outfit (chargées depuis Google Fonts).
   - Animations fluides pour l'état de chargement et l'affichage des résultats.
3. `app.js` : Logique de l'application.
   - Gestion du `localStorage` pour les paramètres.
   - Gestion de l'upload et conversion des images en base64 pour l'API Gemini.
   - Appels asynchrones aux APIs (Gemini, Nominatim, OSRM).
   - Résolveur TSP (Traveling Salesperson Problem) adapté aux contraintes de livraison.
   - Calcul financier et génération de l'URL Google Maps.

---

## 6. Journal de Bord & Suivi de la Trajectoire
*(À mettre à jour à la fin de chaque session de développement par l'IA)*
- **2026-07-01 (Session 1) :** Initialisation du fichier `OPTIMIZER.md` définissant le socle de l'application et les contraintes techniques.
