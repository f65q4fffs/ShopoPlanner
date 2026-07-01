// ShopoPlanner - Logique JavaScript de l'application (Optimisée pour Smartphone)

// --- États globaux ---
let uploadedFiles = []; // Stocke les fichiers sous format { id, file, base64, mimeType }
let fileCounter = 0;
let mapInstance = null;
let routePolyline = null;
let mapMarkers = [];
let cachedDeliveries = null;

// --- Sélections d'éléments HTML ---
const startAddressInput = document.getElementById('start-address');
const geminiKeyInput = document.getElementById('gemini-key');
const geminiModelSelect = document.getElementById('gemini-model');
const startTimeInput = document.getElementById('start-time');
const shopServiceTimeInput = document.getElementById('shop-service-time');
const clientServiceTimeInput = document.getElementById('client-service-time');
const tollPreferenceSelect = document.getElementById('toll-preference');
const tollCostGroup = document.getElementById('toll-cost-group');
const tollCostInput = document.getElementById('toll-cost');
const vehicleNameInput = document.getElementById('vehicle-name');
const vehicleCrkInput = document.getElementById('vehicle-crk');
const headerVehicleBadge = document.getElementById('header-vehicle-badge');
const fileInput = document.getElementById('file-input');
const dropzone = document.getElementById('dropzone');
const previewBox = document.getElementById('preview-box');
const previewCount = document.getElementById('preview-count');
const previewThumbnails = document.getElementById('preview-thumbnails');
const btnOptimize = document.getElementById('btn-optimize');

const resultsCard = document.getElementById('results-card');
const netProfitBadge = document.getElementById('net-profit-badge');
const netProfitVal = document.getElementById('net-profit-val');
const grossGainsVal = document.getElementById('gross-gains-val');
const roadCostVal = document.getElementById('road-cost-val');
const distanceVal = document.getElementById('distance-val');
const hourlyRateVal = document.getElementById('hourly-rate-val');
const stepsTimeline = document.getElementById('steps-timeline');
const btnGoogleMaps = document.getElementById('btn-google-maps');
const rejectedContainer = document.getElementById('rejected-courses-container');
const rejectedList = document.getElementById('rejected-list');

const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

// --- Modale d'aide ---
const btnOpenHelp = document.getElementById('btn-open-help');
const helpModal = document.getElementById('help-modal');
const btnCloseHelp = document.getElementById('btn-close-help');
const btnCloseHelpOk = document.getElementById('btn-close-help-ok');

// --- Initialisation ---
document.addEventListener('DOMContentLoaded', () => {
  // Charger les données stockées dans le téléphone
  const savedKey = localStorage.getItem('shopoplanner_gemini_key');
  if (savedKey) {
    geminiKeyInput.value = savedKey;
  }

  const savedModel = localStorage.getItem('shopoplanner_gemini_model');
  if (savedModel) {
    geminiModelSelect.value = savedModel;
  }

  const savedAddress = localStorage.getItem('shopoplanner_start_address');
  if (savedAddress) {
    startAddressInput.value = savedAddress;
  }

  // Déterminer l'heure actuelle pour le champ start-time
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  startTimeInput.value = `${hours}:${minutes}`;

  // Événements d'écouteurs de saisie
  geminiKeyInput.addEventListener('input', () => {
    localStorage.setItem('shopoplanner_gemini_key', geminiKeyInput.value.trim());
    updateUIState();
  });

  const savedShopTime = localStorage.getItem('shopoplanner_shop_time');
  if (savedShopTime) {
    shopServiceTimeInput.value = savedShopTime;
  }

  const savedClientTime = localStorage.getItem('shopoplanner_client_time');
  if (savedClientTime) {
    clientServiceTimeInput.value = savedClientTime;
  }

  startAddressInput.addEventListener('input', () => {
    localStorage.setItem('shopoplanner_start_address', startAddressInput.value.trim());
    updateUIState();
  });

  geminiModelSelect.addEventListener('change', () => {
    localStorage.setItem('shopoplanner_gemini_model', geminiModelSelect.value);
  });

  shopServiceTimeInput.addEventListener('input', () => {
    localStorage.setItem('shopoplanner_shop_time', shopServiceTimeInput.value);
  });

  clientServiceTimeInput.addEventListener('input', () => {
    localStorage.setItem('shopoplanner_client_time', clientServiceTimeInput.value);
  });

  // Chargement du véhicule et CRK
  const savedVehicleName = localStorage.getItem('shopoplanner_vehicle_name');
  if (savedVehicleName) {
    vehicleNameInput.value = savedVehicleName;
  }
  const savedVehicleCrk = localStorage.getItem('shopoplanner_vehicle_crk');
  if (savedVehicleCrk) {
    vehicleCrkInput.value = savedVehicleCrk;
  }

  function updateHeaderVehicle() {
    const name = vehicleNameInput.value.trim() || "Véhicule";
    const crk = parseFloat(vehicleCrkInput.value) || 0;
    headerVehicleBadge.textContent = `${name} (CRK : ${crk.toFixed(2)} €/km)`;
  }

  vehicleNameInput.addEventListener('input', () => {
    localStorage.setItem('shopoplanner_vehicle_name', vehicleNameInput.value.trim());
    updateHeaderVehicle();
  });

  vehicleCrkInput.addEventListener('input', () => {
    localStorage.setItem('shopoplanner_vehicle_crk', vehicleCrkInput.value);
    updateHeaderVehicle();
  });

  updateHeaderVehicle();

  const savedTollPref = localStorage.getItem('shopoplanner_toll_preference');
  if (savedTollPref) {
    tollPreferenceSelect.value = savedTollPref;
    if (savedTollPref === 'toll') {
      tollCostGroup.style.display = 'block';
    }
  }

  const savedTollCost = localStorage.getItem('shopoplanner_toll_cost');
  if (savedTollCost) {
    tollCostInput.value = savedTollCost;
  }

  tollPreferenceSelect.addEventListener('change', () => {
    if (tollPreferenceSelect.value === 'toll') {
      tollCostGroup.style.display = 'block';
    } else {
      tollCostGroup.style.display = 'none';
      tollCostInput.value = '0.00';
    }
    localStorage.setItem('shopoplanner_toll_preference', tollPreferenceSelect.value);
  });

  tollCostInput.addEventListener('input', () => {
    localStorage.setItem('shopoplanner_toll_cost', tollCostInput.value);
  });

  // Gestion de la modale d'aide
  btnOpenHelp.addEventListener('click', () => helpModal.classList.remove('hidden'));
  btnCloseHelp.addEventListener('click', () => helpModal.classList.add('hidden'));
  btnCloseHelpOk.addEventListener('click', () => helpModal.classList.add('hidden'));

  // Clic en dehors de la modale pour la fermer
  window.addEventListener('click', (e) => {
    if (e.target === helpModal) {
      helpModal.classList.add('hidden');
    }
  });

  // Importation de fichiers
  fileInput.addEventListener('change', handleFileSelection);

  // Drag and Drop (facultatif mais agréable pour PC)
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  });

  // Lancement de l'optimisation
  btnOptimize.addEventListener('click', startOptimizationProcess);
});

// --- Gestion des fichiers et aperçus ---
function handleFileSelection(e) {
  if (e.target.files.length > 0) {
    processFiles(e.target.files);
  }
}

function processFiles(files) {
  cachedDeliveries = null; // Réinitialiser le cache car de nouveaux fichiers sont ajoutés
  Array.from(files).forEach(file => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      alert('Veuillez sélectionner uniquement des images ou des vidéos.');
      return;
    }

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawBase64 = event.target.result.split(',')[1];
        const fileId = `file-${fileCounter++}`;
        
        uploadedFiles.push({
          id: fileId,
          file: file,
          base64: rawBase64,
          mimeType: file.type
        });

        renderThumbnails();
        updateUIState();
      };
      reader.readAsDataURL(file);
    } else if (isVideo) {
      const fileId = `file-${fileCounter++}`;
      uploadedFiles.push({
        id: fileId,
        file: file,
        base64: '', // sera extrait à la volée avant Gemini
        mimeType: file.type
      });

      renderThumbnails();
      updateUIState();
    }
  });
  
  // Réinitialiser la valeur de l'input pour pouvoir ré-importer le même fichier si supprimé
  fileInput.value = '';
}

function renderThumbnails() {
  if (uploadedFiles.length === 0) {
    previewBox.classList.add('hidden');
    return;
  }

  previewBox.classList.remove('hidden');
  previewCount.textContent = uploadedFiles.length;
  previewThumbnails.innerHTML = '';

  uploadedFiles.forEach(item => {
    const thumb = document.createElement('div');
    thumb.className = 'preview-item';

    if (item.mimeType.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(item.file);
      thumb.appendChild(img);
    } else if (item.mimeType.startsWith('video/')) {
      const videoIcon = document.createElement('div');
      videoIcon.className = 'video-preview-icon';
      videoIcon.innerHTML = `<i data-lucide="video" style="width: 24px; height: 24px; color: var(--primary-color);"></i><span style="font-size: 8px; margin-top: 2px; color: var(--text-muted);">Vidéo</span>`;
      thumb.appendChild(videoIcon);
    }

    const btnRemove = document.createElement('button');
    btnRemove.className = 'preview-remove';
    btnRemove.innerHTML = '&times;';
    btnRemove.addEventListener('click', () => {
      uploadedFiles = uploadedFiles.filter(x => x.id !== item.id);
      cachedDeliveries = null; // Réinitialiser le cache car un fichier est supprimé
      renderThumbnails();
      updateUIState();
    });
    thumb.appendChild(btnRemove);

    previewThumbnails.appendChild(thumb);
  });

  // Mettre à jour les icônes Lucide dans les vignettes d'aperçu
  lucide.createIcons();
}

function updateUIState() {
  const hasKey = geminiKeyInput.value.trim().length > 0;
  const hasAddress = startAddressInput.value.trim().length > 0;
  const hasFiles = uploadedFiles.length > 0;

  btnOptimize.disabled = !(hasKey && hasAddress && hasFiles);
}

// --- Moteur de traitement de la tournée ---

// --- Helper pour obtenir tous les sous-ensembles triés par taille décroissante ---
function getAllSubsets(n) {
  let subsets = [];
  for (let i = 0; i < (1 << n); i++) {
    let subset = [];
    for (let j = 0; j < n; j++) {
      if ((i & (1 << j)) !== 0) {
        subset.push(j);
      }
    }
    subsets.push(subset);
  }
  subsets.sort((a, b) => b.length - a.length);
  return subsets;
}

// --- Helper pour découper les matrices de distances/durées selon les indices actifs ---
function sliceMatrix(fullMatrix, activeIndices) {
  const size = activeIndices.length;
  const newMatrix = Array(size).fill(0).map(() => Array(size).fill(0));
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      newMatrix[i][j] = fullMatrix[activeIndices[i]][activeIndices[j]];
    }
  }
  return newMatrix;
}

async function startOptimizationProcess() {
  const apiKey = geminiKeyInput.value.trim();
  const startAddress = startAddressInput.value.trim();
  const startTime = startTimeInput.value.trim() || "08:00";
  const modelName = geminiModelSelect.value;
  const shopServiceTime = parseInt(shopServiceTimeInput.value, 10) || 5;
  const clientServiceTime = parseInt(clientServiceTimeInput.value, 10) || 5;
  const tollPreference = tollPreferenceSelect.value;
  const tollCost = tollPreference === 'toll' ? (parseFloat(tollCostInput.value) || 0) : 0;

  try {
    // 1. Récupérer les données de courses (avec cache pour éviter de re-consommer l'API)
    let deliveries = null;
    if (cachedDeliveries) {
      deliveries = cachedDeliveries;
      console.log("Utilisation des courses en cache (évite l'appel Gemini)");
    } else {
      showLoading('Lecture des images par l\'IA...');
      deliveries = await extractDeliveriesWithGemini(apiKey, modelName, uploadedFiles);
      cachedDeliveries = deliveries;
    }
    
    if (!deliveries || deliveries.length === 0) {
      throw new Error('Aucune course n\'a été détectée dans vos captures.');
    }

    showLoading('Localisation des adresses (GPS)...');

    // 2. Géocodage de toutes les adresses (Départ + Magasins + Clients)
    const locations = await geocodeAllAddresses(startAddress, deliveries);

    showLoading('Calcul de l\'itinéraire optimal...');

    // 3. Calcul des matrices de distances et durées (OSRM ou Haversine fallback)
    const matrices = await getDistanceAndDurationMatrices(locations);

    const startTimeMinutes = timeToMinutes(startTime);

    // 4. Résolution du TSP par sous-ensembles pour trouver la meilleure option 100% faisable
    const allSubsets = getAllSubsets(deliveries.length);
    let bestRouteResult = null;
    let bestSubsetDeliveries = [];
    let rejectedDeliveries = [];
    
    for (const subset of allSubsets) {
      const nodeIndices = [0];
      subset.forEach(delIdx => {
        nodeIndices.push(2 * delIdx + 1);
        nodeIndices.push(2 * delIdx + 2);
      });
      
      const subDistances = sliceMatrix(matrices.distances, nodeIndices);
      const subDurations = sliceMatrix(matrices.durations, nodeIndices);
      
      // Si trajet gratuit sans péage, simuler des vitesses réduites (+25% de temps de trajet sur nationale/départementale)
      if (tollPreference === 'free') {
        for (let i = 0; i < subDurations.length; i++) {
          for (let j = 0; j < subDurations[i].length; j++) {
            subDurations[i][j] *= 1.25;
          }
        }
      }
      
      const subLocations = nodeIndices.map((origIdx, newIdx) => {
        const origLoc = locations[origIdx];
        return {
          ...origLoc,
          index: newIdx,
          deliveryIndex: newIdx > 0 ? Math.floor((newIdx - 1) / 2) : -1
        };
      });
      
      const subDeliveries = subset.map(delIdx => deliveries[delIdx]);
      const routeResult = solveTSP(subLocations, subDistances, subDurations, startTimeMinutes, subDeliveries, shopServiceTime, clientServiceTime);
      
      if (routeResult && routeResult.stats && routeResult.stats.delaysCount === 0) {
        bestRouteResult = {
          path: routeResult.path.map(subIdx => nodeIndices[subIdx]),
          distance: routeResult.distance,
          stats: routeResult.stats
        };
        bestSubsetDeliveries = subDeliveries;
        
        const activeSet = new Set(subset);
        deliveries.forEach((del, idx) => {
          if (!activeSet.has(idx)) {
            rejectedDeliveries.push(del);
          }
        });
        break;
      }
    }

    if (!bestRouteResult || bestRouteResult.path.length <= 2) {
      bestRouteResult = {
        path: [0, 0],
        distance: 0,
        stats: {
          duration: 0,
          stats: [
            { nodeIndex: 0, arrivalTime: startTimeMinutes, departureTime: startTimeMinutes, wait: 0, delay: 0 },
            { nodeIndex: 0, arrivalTime: startTimeMinutes, departureTime: startTimeMinutes, wait: 0, delay: 0 }
          ]
        }
      };
      bestSubsetDeliveries = [];
      rejectedDeliveries = [...deliveries];
    }

    // 5. Affichage des résultats
    displayResults(deliveries, bestSubsetDeliveries, rejectedDeliveries, bestRouteResult, locations, startAddress, startTimeMinutes, tollCost);

  } catch (error) {
    console.error(error);
    alert(`Erreur : ${error.message}`);
  } finally {
    hideLoading();
  }
}

// --- Appel API Gemini ---
// --- Helper pour extraire les images d'un fichier vidéo ---
function extractFramesFromVideo(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('preload', 'auto');
    
    video.addEventListener('loadedmetadata', async () => {
      const duration = video.duration;
      if (isNaN(duration) || duration <= 0) {
        reject(new Error("Impossible de lire la durée de la vidéo."));
        return;
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Redimensionnement à une largeur max de 480px pour économiser la mémoire/tokens
      const scale = Math.min(1, 480 / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      const frames = [];
      // Ajustement dynamique de l'intervalle selon la durée de la vidéo
      let interval = 0.5; // Par défaut, toutes les 500ms
      if (duration > 30) {
        interval = 1.5;   // Vidéos de plus de 30s : toutes les 1.5s
      } else if (duration > 15) {
        interval = 1.0;   // Vidéos de 15s à 30s : toutes les 1s
      }
      let currentTime = 0;
      
      const captureFrame = () => {
        return new Promise((resSeek) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.6);
            const base64Clean = jpegDataUrl.split(',')[1];
            frames.push(base64Clean);
            resSeek();
          };
          video.addEventListener('seeked', onSeeked);
          video.currentTime = currentTime;
        });
      };
      
      try {
        while (currentTime <= duration) {
          await captureFrame();
          currentTime += interval;
        }
        URL.revokeObjectURL(video.src);
        resolve(frames);
      } catch (err) {
        reject(err);
      }
    });
    
    video.addEventListener('error', (err) => {
      reject(new Error("Erreur de chargement du fichier vidéo."));
    });
    
    video.load();
  });
}

// --- Appel API Gemini ---
async function extractDeliveriesWithGemini(apiKey, modelName, files) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  showLoading('Traitement des fichiers...');

  const imageParts = [];

  for (const item of files) {
    if (item.mimeType.startsWith('image/')) {
      imageParts.push({
        inlineData: {
          mimeType: item.mimeType,
          data: item.base64
        }
      });
    } else if (item.mimeType.startsWith('video/')) {
      showLoading('Extraction des images de la vidéo...');
      try {
        const videoFrames = await extractFramesFromVideo(item.file);
        videoFrames.forEach(base64Frame => {
          imageParts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Frame
            }
          });
        });
      } catch (err) {
        console.error("Erreur d'extraction vidéo :", err);
        throw new Error("Impossible d'extraire les images de votre vidéo d'enregistrement : " + err.message);
      }
    }
  }

  showLoading('Lecture par l\'IA Gemini...');

  const promptText = `
Tu es un extracteur de données spécialisé dans les captures d'écran de l'application Shopopop.
Analyse ces captures d'écran (ou cette séquence d'images extraites d'une vidéo) de propositions de courses de co-transportage et extrait pour chaque course distincte présente sur les images les informations sous la forme d'un tableau JSON d'objets.
Supprime les doublons de manière intelligente s'il y a plusieurs images similaires ou montrant la même offre.

Pour chaque course, trouve :
1. "gain": le gain financier proposé en euros (nombre décimal ou entier uniquement, exemple: 7.90)
2. "magasin": l'adresse de retrait du magasin de départ (ajoute la ville et le code postal si visible, exemple: "Carrefour Market, 169 Rue de Stalingrad, 69400 Villefranche-sur-Saône")
3. "client": l'adresse de livraison du client final (exemple: "Route de Lucenay, 69480 Anse")
4. "retrait_debut": l'heure de début du créneau de retrait au format "HH:MM" (exemple: "16:15")
5. "retrait_fin": l'heure de fin du créneau de retrait au format "HH:MM" (exemple: "17:00")
6. "livraison_debut": l'heure de début du créneau de livraison au format "HH:MM" (exemple: "16:30")
7. "livraison_fin": l'heure de fin du créneau de livraison au format "HH:MM" (exemple: "17:30")

Retourne uniquement le tableau JSON respectant ce schéma, sans aucun texte autour, sans bloc de code markdown. Exemple de format de retour direct attendu :
[{"gain": 7.90, "magasin": "Carrefour Market, Villefranche", "client": "Route de Lucenay, Anse", "retrait_debut": "16:15", "retrait_fin": "17:00", "livraison_debut": "16:30", "livraison_fin": "17:30"}]
  `.trim();

  const requestBody = {
    contents: [{
      parts: [
        { text: promptText },
        ...imageParts
      ]
    }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  let maxRetries = 3;
  let delayMs = 2000;
  let response = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error?.message || "";
        
        if (response.status === 429 || response.status === 503 || errMsg.toLowerCase().includes("demand") || errMsg.toLowerCase().includes("quota")) {
          throw new Error(errMsg || `Serveur surchargé (${response.status})`);
        }
        
        throw new Error(errMsg || `Erreur d'appel API Gemini (${response.status})`);
      }
      
      break;
    } catch (error) {
      const isTransient = error.message.toLowerCase().includes("demand") || 
                          error.message.toLowerCase().includes("quota") || 
                          error.message.toLowerCase().includes("surchargé") ||
                          error.message.includes("503") || 
                          error.message.includes("429") ||
                          error instanceof TypeError;

      if (!isTransient || attempt === maxRetries) {
        throw error;
      }
      
      console.warn(`Tentative ${attempt} échouée. Nouvelle tentative dans ${delayMs}ms...`, error);
      showLoading(`Serveur surchargé. Nouvelle tentative dans ${Math.round(delayMs/1000)}s (essai ${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs *= 2.5;
    }
  }

  const resJson = await response.json();
  const textResponse = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) {
    throw new Error('L\'IA n\'a pas retourné de résultat exploitable.');
  }

  try {
    return JSON.parse(textResponse.trim());
  } catch (e) {
    console.error('Erreur parsing JSON de Gemini:', textResponse);
    throw new Error('Les données renvoyées par l\'IA ne sont pas dans un format JSON valide.');
  }
}

// --- Géocodage avec Nominatim ---
async function geocodeAllAddresses(startAddress, deliveries) {
  // Liste ordonnée de tous les points à géocoder
  // Index 0: Départ
  // Index impair (2i - 1): Magasin de la course i
  // Index pair (2i): Client de la course i
  const addressList = [startAddress];
  
  deliveries.forEach(del => {
    addressList.push(del.magasin);
    addressList.push(del.client);
  });

  const locations = [];

  for (let i = 0; i < addressList.length; i++) {
    const addr = addressList[i];
    let lat = null;
    let lon = null;

    try {
      // Nominatim requiert d'être respectueux (petit délai ou user-agent simulé)
      // Appel direct avec format json
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`, {
        headers: { 'Accept-Language': 'fr' }
      });
      const data = await res.json();
      
      if (data && data.length > 0) {
        lat = parseFloat(data[0].lat);
        lon = parseFloat(data[0].lon);
      } else {
        console.warn(`Adresse non géocodée par Nominatim: "${addr}"`);
      }
    } catch (e) {
      console.warn(`Erreur de géocodage pour "${addr}":`, e);
    }

    // Informations associées au noeud pour s'y retrouver
    let type = 'start';
    let label = 'Départ / Arrivée';
    let deliveryIndex = -1;

    if (i > 0) {
      deliveryIndex = Math.floor((i - 1) / 2);
      const isMagasin = (i % 2 !== 0);
      type = isMagasin ? 'magasin' : 'client';
      label = isMagasin ? `Magasin (Course #${deliveryIndex + 1})` : `Client (Course #${deliveryIndex + 1})`;
    }

    // Coordonnées de secours si le géocodage Nominatim échoue
    const DEFAULT_LAT = 45.764043; // Lyon (par défaut)
    const DEFAULT_LON = 4.835659;

    if (i === 0 && (lat === null || lon === null)) {
      lat = DEFAULT_LAT;
      lon = DEFAULT_LON;
    } else if (lat === null || lon === null) {
      // S'il s'agit d'un magasin ou client, on le positionne proche du point de départ avec un léger décalage aléatoire
      const baseLat = locations[0]?.lat || DEFAULT_LAT;
      const baseLon = locations[0]?.lon || DEFAULT_LON;
      // Décalage aléatoire d'environ 1 à 3 km (0.015 degré de latitude/longitude)
      lat = baseLat + (Math.random() - 0.5) * 0.03;
      lon = baseLon + (Math.random() - 0.5) * 0.03;
      console.log(`Géocodage échoué pour "${addr}". Positionnement de secours appliqué : ${lat}, ${lon}`);
    }

    locations.push({
      index: i,
      address: addr,
      lat: lat,
      lon: lon,
      type: type,
      label: label,
      deliveryIndex: deliveryIndex
    });

    // Attendre 800ms entre chaque requête Nominatim pour respecter leur politique d'utilisation
    if (i < addressList.length - 1) {
      await new Promise(r => setTimeout(r, 800));
    }
  }

  return locations;
}

// --- Calcul des matrices de distances et durées (OSRM ou Haversine) ---
async function getDistanceAndDurationMatrices(locations) {
  const size = locations.length;
  const hasAllCoords = locations.every(loc => loc.lat !== null && loc.lon !== null);

  let distances = null;
  let durations = null;

  if (hasAllCoords) {
    try {
      const coordsString = locations.map(loc => `${loc.lon},${loc.lat}`).join(';');
      const url = `https://router.project-osrm.org/table/v1/driving/${coordsString}?annotations=distance,duration`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.distances && data.durations) {
          distances = data.distances.map(row => row.map(d => d / 1000));
          durations = data.durations.map(row => row.map(t => t / 60)); // secondes en minutes
        }
      }
    } catch (e) {
      console.warn('Échec de la récupération OSRM, basculement en mode estimé...', e);
    }
  }

  if (!distances || !durations) {
    distances = Array(size).fill(0).map(() => Array(size).fill(0));
    durations = Array(size).fill(0).map(() => Array(size).fill(0));

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (i === j) {
          distances[i][j] = 0;
          durations[i][j] = 0;
        } else {
          const coord1 = locations[i];
          const coord2 = locations[j];
          if (coord1.lat !== null && coord2.lat !== null) {
            const dist = haversineDistance(coord1, coord2) * 1.3;
            distances[i][j] = dist;
            durations[i][j] = dist * (60 / 45); // 45 km/h de moyenne
          } else {
            distances[i][j] = 10;
            durations[i][j] = 15;
          }
        }
      }
    }
  }

  return { distances, durations };
}

function haversineDistance(coord1, coord2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// --- Résolution du TSP (Brute Force optimisé avec contraintes horaires) ---
function solveTSP(locations, distances, durations, startTimeMinutes, deliveries, shopServiceTime, clientServiceTime) {
  const numNodes = locations.length;
  let bestPath = [];
  let bestDistance = Infinity;
  let bestRouteStats = null;

  function search(currentPath, currentDistance, currentTime, visitedSet, currentWaitTime, pathStats) {
    if (currentPath.length === numNodes) {
      const lastNode = currentPath[currentPath.length - 1];
      const returnDist = distances[lastNode][0];
      const returnDuration = durations[lastNode][0];
      
      const totalDistance = currentDistance + returnDist;
      const totalTime = currentTime + returnDuration;
      
      if (totalDistance < bestDistance) {
        bestDistance = totalDistance;
        bestPath = [...currentPath, 0];
        
        const finalStats = [...pathStats, {
          nodeIndex: 0,
          arrivalTime: totalTime,
          departureTime: totalTime,
          wait: 0,
          delay: 0
        }];
        
        bestRouteStats = {
          distance: totalDistance,
          duration: totalTime - startTimeMinutes,
          stats: finalStats,
          totalWait: currentWaitTime,
          totalDelay: 0,
          delaysCount: 0
        };
      }
      return;
    }

    for (let nextNode = 1; nextNode < numNodes; nextNode++) {
      if (!visitedSet.has(nextNode)) {
        const isClient = (nextNode % 2 === 0);
        if (isClient) {
          const targetMagasin = nextNode - 1;
          if (!visitedSet.has(targetMagasin)) {
            continue;
          }
        } else {
          const delIdx = Math.floor((nextNode - 1) / 2);
          const currentLoc = locations[nextNode];
          let hasConflict = false;
          
          for (let otherDelIdx = 0; otherDelIdx < deliveries.length; otherDelIdx++) {
            if (otherDelIdx === delIdx) continue;
            
            const otherMagasinNode = 2 * otherDelIdx + 1;
            const otherClientNode = 2 * otherDelIdx + 2;
            
            if (visitedSet.has(otherMagasinNode) && !visitedSet.has(otherClientNode)) {
              const otherLoc = locations[otherMagasinNode];
              const isSameStore = (currentLoc.lat === otherLoc.lat && currentLoc.lon === otherLoc.lon) || (currentLoc.address === otherLoc.address);
              if (isSameStore) {
                hasConflict = true;
                break;
              }
            }
          }
          if (hasConflict) {
            continue;
          }
        }

        const lastNode = currentPath[currentPath.length - 1];
        const stepDist = distances[lastNode][nextNode];
        const stepDur = durations[lastNode][nextNode];

        const arrivalTime = currentTime + stepDur;
        
        let wait = 0;
        let delay = 0;
        let targetStart = -1;
        let targetEnd = -1;

        const loc = locations[nextNode];
        const delIdx = loc.deliveryIndex;
        const delData = deliveries[delIdx];

        if (loc.type === 'magasin') {
          targetStart = timeToMinutes(delData.retrait_debut);
          targetEnd = timeToMinutes(delData.retrait_fin);
        } else if (loc.type === 'client') {
          targetStart = timeToMinutes(delData.livraison_debut);
          targetEnd = timeToMinutes(delData.livraison_fin);
        }

        if (targetStart !== -1 && arrivalTime < targetStart) {
          wait = targetStart - arrivalTime;
        }
        if (targetEnd !== -1 && arrivalTime > targetEnd) {
          delay = arrivalTime - targetEnd;
        }

        if (delay > 0) {
          continue;
        }

        const serviceStart = Math.max(arrivalTime, targetStart);
        const serviceDuration = loc.type === 'magasin' ? shopServiceTime : clientServiceTime;
        const departureTime = serviceStart + serviceDuration;

        visitedSet.add(nextNode);
        currentPath.push(nextNode);
        
        pathStats.push({
          nodeIndex: nextNode,
          arrivalTime: arrivalTime,
          departureTime: departureTime,
          wait: wait,
          delay: delay
        });

        search(
          currentPath, 
          currentDistance + stepDist, 
          departureTime, 
          visitedSet, 
          currentWaitTime + wait, 
          pathStats
        );

        pathStats.pop();
        currentPath.pop();
        visitedSet.delete(nextNode);
      }
    }
  }

  const path = [0];
  const visited = new Set([0]);
  const initialStats = [{
    nodeIndex: 0,
    arrivalTime: startTimeMinutes,
    departureTime: startTimeMinutes,
    wait: 0,
    delay: 0
  }];

  search(path, 0, startTimeMinutes, visited, 0, initialStats);

  return {
    path: bestPath,
    distance: bestDistance,
    stats: bestRouteStats
  };
}

// --- Affichage des résultats ---
async function displayResults(allDeliveries, bestSubsetDeliveries, rejectedDeliveries, routeResult, locations, startAddress, startTimeMinutes, tollCost) {
  const totalGains = bestSubsetDeliveries.reduce((sum, del) => sum + del.gain, 0);
  
  // 2. Calculer le coût routier réel (CRK dynamique + frais de péage)
  const crk = parseFloat(vehicleCrkInput.value) || 0.25;
  const fuelCost = routeResult.distance * crk;
  const roadCost = fuelCost + tollCost;

  // 3. Calculer le bénéfice net
  const netProfit = totalGains - roadCost;

  // Calculer le taux horaire net
  const durationHours = (routeResult.stats?.duration || 0) / 60;
  let hourlyRate = 0;
  if (durationHours > 0) {
    hourlyRate = netProfit / durationHours;
  }

  // Formatter pour affichage
  netProfitVal.textContent = `${netProfit.toFixed(2)} €`;
  grossGainsVal.textContent = `${totalGains.toFixed(2)} €`;
  distanceVal.textContent = `${routeResult.distance.toFixed(1)} km`;
  hourlyRateVal.textContent = `${hourlyRate.toFixed(2)} €/h`;

  if (tollCost > 0) {
    roadCostVal.innerHTML = `${roadCost.toFixed(2)} € <span style="font-size:10px; font-weight:normal; color:var(--text-muted);">(dont ${tollCost.toFixed(2)} € péage)</span>`;
  } else {
    roadCostVal.textContent = `${roadCost.toFixed(2)} €`;
  }

  // Mettre en évidence si perte ou gain
  if (netProfit >= 0) {
    netProfitBadge.className = 'profit-badge success';
    netProfitVal.className = 'profit-val';
  } else {
    netProfitBadge.className = 'profit-badge danger';
    netProfitVal.className = 'profit-val negative';
  }

  if (hourlyRate >= 0) {
    hourlyRateVal.className = 'detail-val text-primary';
  } else {
    hourlyRateVal.className = 'detail-val text-danger';
  }

  // Affiche ou masque la liste des courses rejetées
  if (rejectedDeliveries.length > 0) {
    rejectedList.innerHTML = '';
    rejectedDeliveries.forEach(del => {
      const li = document.createElement('li');
      li.textContent = `Course à ${del.gain.toFixed(2)} € (Magasin : ${del.magasin} - Retrait max : ${del.retrait_fin})`;
      rejectedList.appendChild(li);
    });
    rejectedContainer.classList.remove('hidden');
  } else {
    rejectedContainer.classList.add('hidden');
  }

  // 4. Générer la liste des étapes dans l'interface
  stepsTimeline.innerHTML = '';
  
  routeResult.path.forEach((nodeIndex, stepNumber) => {
    const node = locations[nodeIndex];
    const stat = routeResult.stats.stats[stepNumber];
    
    let stepTitle = '';
    let stepDesc = node.address;
    let stepClass = node.type;
    let timeStatusHtml = '';

    const arrTimeStr = minutesToTime(stat.arrivalTime);
    const depTimeStr = minutesToTime(stat.departureTime);

    if (nodeIndex === 0) {
      if (stepNumber === 0) {
        stepTitle = `Départ de chez vous à ${depTimeStr}`;
        stepDesc = `Point d'origine : ${node.address}`;
      } else {
        stepTitle = `Retour chez vous estimé à ${arrTimeStr}`;
        stepDesc = `Point final : ${node.address}`;
      }
      stepClass = 'start';
    } else {
      const isMagasin = (node.type === 'magasin');
      const deliveryNum = node.deliveryIndex + 1;
      const gain = allDeliveries[node.deliveryIndex].gain;
      const delData = allDeliveries[node.deliveryIndex];
      
      if (isMagasin) {
        stepTitle = `Retrait Magasin (Course #${deliveryNum}) - Gain : +${gain.toFixed(2)} €`;
        stepDesc = `${node.address}<br><span class="step-time-info">Créneau : ${delData.retrait_debut} - ${delData.retrait_fin} • Arrivée : ${arrTimeStr}</span>`;
      } else {
        stepTitle = `Livraison Client (Course #${deliveryNum})`;
        stepDesc = `${node.address}<br><span class="step-time-info">Créneau : ${delData.livraison_debut} - ${delData.livraison_fin} • Arrivée : ${arrTimeStr}</span>`;
      }

      // Générer le badge de ponctualité
      if (stat.delay > 0) {
        timeStatusHtml = `<span class="time-status-badge late"><i data-lucide="alert-triangle"></i> Retard de ${stat.delay} min</span>`;
      } else if (stat.wait > 0) {
        timeStatusHtml = `<span class="time-status-badge waiting"><i data-lucide="clock"></i> En avance (+${stat.wait} min d'attente)</span>`;
      } else {
        timeStatusHtml = `<span class="time-status-badge on-time"><i data-lucide="check"></i> À l'heure</span>`;
      }
    }

    const stepNodeDiv = document.createElement('div');
    stepNodeDiv.className = `step-node ${stepClass}`;
    
    stepNodeDiv.innerHTML = `
      <div class="step-marker"></div>
      <div class="step-info">
        <span class="step-title">${stepTitle}</span>
        <span class="step-desc">${stepDesc}</span>
        ${timeStatusHtml}
      </div>
    `;
    
    stepsTimeline.appendChild(stepNodeDiv);
  });

  // 5. Afficher la carte des résultats immédiatement (requis pour que Leaflet puisse calculer la taille du conteneur #map-view)
  resultsCard.classList.remove('hidden');

  // 6. Rendu de la carte interactive Leaflet
  if (typeof L !== 'undefined' && routeResult.path.length > 1) {
    try {
      // Supprimer l'ancienne carte pour éviter l'erreur "Map container is already initialized"
      if (mapInstance) {
        try {
          mapInstance.remove();
        } catch (e) {
          console.warn("Erreur suppression mapInstance:", e);
        }
        mapInstance = null;
      }

      mapInstance = L.map('map-view', { zoomControl: false });
      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(mapInstance);

      mapMarkers = [];
      routePolyline = null;

      const activeNodes = routeResult.path.map(idx => locations[idx]);
      const validCoords = activeNodes.filter(loc => loc.lat !== null && loc.lon !== null);

      validCoords.forEach(loc => {
        let color = '#2563eb';
        let radius = 8;
        if (loc.type === 'magasin') {
          color = '#f59e0b';
          radius = 6;
        } else if (loc.type === 'client') {
          color = '#16a34a';
          radius = 6;
        }

        const marker = L.circleMarker([loc.lat, loc.lon], {
          color: color,
          fillColor: color,
          fillOpacity: 0.9,
          radius: radius
        }).addTo(mapInstance);

        let popupText = `<b>${loc.label}</b><br>${loc.address}`;
        marker.bindPopup(popupText);
        mapMarkers.push(marker);
      });

      if (validCoords.length >= 2) {
        const coordsString = validCoords.map(loc => `${loc.lon},${loc.lat}`).join(';');
        const routeUrl = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
        
        try {
          const rResponse = await fetch(routeUrl);
          if (rResponse.ok) {
            const rData = await rResponse.json();
            if (rData.routes && rData.routes.length > 0) {
              routePolyline = L.geoJSON(rData.routes[0].geometry, {
                style: {
                  color: '#2563eb',
                  weight: 4,
                  opacity: 0.75
                }
              }).addTo(mapInstance);
            }
          }
        } catch (e) {
          console.warn("OSRM routing failed:", e);
        }
      }

      if (!routePolyline && validCoords.length >= 2) {
        const latLns = validCoords.map(loc => [loc.lat, loc.lon]);
        routePolyline = L.polyline(latLns, {
          color: '#2563eb',
          weight: 4,
          opacity: 0.75
        }).addTo(mapInstance);
      }

      if (routePolyline) {
        mapInstance.fitBounds(routePolyline.getBounds(), { padding: [30, 30] });
      } else if (validCoords.length > 0) {
        mapInstance.setView([validCoords[0].lat, validCoords[0].lon], 12);
      }

    } catch (err) {
      console.warn('Erreur lors du rendu Leaflet :', err);
    }
  } else if (typeof L === 'undefined') {
    const mapView = document.getElementById('map-view');
    if (mapView) {
      mapView.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">
        <i data-lucide="wifi-off" style="width: 24px; height: 24px; margin-bottom: 8px; color: var(--danger-color);"></i>
        <span>Carte indisponible (erreur chargement Leaflet).</span>
      </div>`;
      lucide.createIcons();
    }
  }

  // 7. Générer le lien Google Maps
  const waypointNodes = routeResult.path.slice(1, -1).map(idx => locations[idx].address);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startAddress)}&destination=${encodeURIComponent(startAddress)}&waypoints=${waypointNodes.map(addr => encodeURIComponent(addr)).join('%7C')}`;
  
  btnGoogleMaps.href = mapsUrl;
  
  // Recréer les icônes Lucide fraîchement insérées
  lucide.createIcons();
  
  if (mapInstance) {
    setTimeout(() => {
      mapInstance.invalidateSize();
    }, 200);
  }
}

// --- Fonctions utilitaires de calcul d'heures ---
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return h * 60 + m;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// --- Helpers pour l'overlay de chargement ---
function showLoading(text) {
  loadingText.textContent = text;
  loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  loadingOverlay.classList.add('hidden');
}
