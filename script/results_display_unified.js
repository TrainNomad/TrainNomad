// results_display_unified.js - Version unifiée avec gestion des correspondances

let map;

// ==================== INJECTION DES STYLES ====================

if (!document.getElementById('results-display-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'results-display-styles';
    styleSheet.textContent = `
        .badge-direct {
            background: #e8f5e9;
            color: #2e7d32;
        }
        .badge-transfer {
            background: #fff3e0;
            color: #ef6c00;
        }
        .result__car-hour-buton {
            position: relative;
            min-height: 50px;
        }
        .results-cards-container {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-top: 15px;
        }
        .trip-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f2f2f2;
        }
        .transfer-info {
            font-size: 0.85rem;
            color: #666;
            margin-top: 4px;
        }
    `;
    document.head.appendChild(styleSheet);
}

// ==================== INITIALISATION CARTE ====================

function initMap() {
    const franceCenter = [46.603354, 1.888334];

    if (typeof L !== 'undefined' && document.getElementById('map')) {
        map = L.map('map').setView(franceCenter, 6);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors, © CartoDB'
        }).addTo(map);
        
        setTimeout(() => { map.invalidateSize(); }, 100);
    }
}

// ==================== MARQUEURS CARTE ====================

function addMarkers(departureData, destinationsData) {
    if (!map) return;
    
    const markerGroup = L.featureGroup();
    
    const TRAIN_ICON_URL = "assets/Icons_Logo/Train_Marker.svg";
    const OTHER_COLOR = '#378B4E';
    const TARGET_COLOR_DEPART = 'rgb(192, 238, 209)';

    const trainIcon = L.icon({
        iconUrl: TRAIN_ICON_URL,
        iconSize: [25, 25],
        iconAnchor: [15, 15],
        popupAnchor: [0, -30]
    });

    // Marqueur de départ
    if (departureData?.lat && departureData?.lon) {
        L.circleMarker([departureData.lat, departureData.lon], {
            radius: 8,
            fillColor: TARGET_COLOR_DEPART,
            color: '#6e2b0e',
            weight: 1,
            fillOpacity: 0.9
        }).bindPopup(`<b>Départ : ${departureData.name}</b>`).addTo(markerGroup);
    }
    
    // Tri et affichage des destinations
    const sortedDestinations = [...destinationsData].sort((a, b) => 
        (b.tripCount || b.trips?.length || 0) - (a.tripCount || a.trips?.length || 0)
    );

    sortedDestinations.forEach((dest, index) => {
        const lat = dest.lat || dest.latitude;
        const lon = dest.lon || dest.longitude;
        
        if (!lat || !lon) return;

        let marker;
        if (index < 10) {
            marker = L.marker([lat, lon], { icon: trainIcon });
        } else {
            marker = L.circleMarker([lat, lon], {
                radius: 4,
                fillColor: OTHER_COLOR,
                color: '#ffffff',
                weight: 1,
                opacity: 1,
                fillOpacity: 1
            });
        }

        const tripCount = dest.tripCount || dest.trips?.length || 0;
        marker.bindPopup(`<b>Arrivée : ${dest.name}</b><br>${tripCount} trajet(s)`);
        marker.addTo(markerGroup);
    });

    markerGroup.addTo(map);

    if (markerGroup.getLayers().length > 0) {
        map.fitBounds(markerGroup.getBounds(), { padding: [50, 50] });
    }
}

// ==================== OPTIMISATION DES TRAJETS ====================

/**
 * Regroupe les trajets par heure de départ et ne garde que le plus rapide pour chaque heure
 */
function optimizeTrips(trips) {
    const tripsByDeparture = new Map();
    
    trips.forEach(trip => {
        const departureTime = trip.departure;
        
        if (!tripsByDeparture.has(departureTime)) {
            tripsByDeparture.set(departureTime, trip);
        } else {
            // Garder le trajet le plus rapide (durée la plus courte)
            const existingTrip = tripsByDeparture.get(departureTime);
            if (trip.duration < existingTrip.duration) {
                tripsByDeparture.set(departureTime, trip);
            }
        }
    });
    
    // Convertir en array et trier par heure de départ
    return Array.from(tripsByDeparture.values())
        .sort((a, b) => a.departure.localeCompare(b.departure));
}

// ==================== CONSTRUCTION DES CARTES ====================

function buildDestinationCard(destination, trips, lat, lon, displayMode = 'standard') {
    // Optimisation : ne garder qu'un trajet par heure de départ (le plus rapide)
    const optimizedTrips = optimizeTrips(trips);
    
    console.log(`📊 ${destination}: ${trips.length} trajets → ${optimizedTrips.length} trajets optimisés`);
    
    // Calcul de la durée minimale
    let minDurationMinutes = Infinity;
    optimizedTrips.forEach(trip => {
        if (trip.duration && trip.duration < minDurationMinutes) {
            minDurationMinutes = trip.duration;
        }
    });

    const minDurationFormatted = (minDurationMinutes !== Infinity && window.TGVMaxAPI)
        ? window.TGVMaxAPI.formatDuration(minDurationMinutes)
        : '';
    
    // Construction de la liste des trajets selon le mode d'affichage
    let tripsListHTML;
    
    if (displayMode === 'expanded') {
        // Mode étendu (pour mode Explorer/Transfert)
        tripsListHTML = optimizedTrips.map(trip => {
            const isDirect = trip.type === 'direct';
            const badgeStyle = isDirect 
                ? 'background:#e8f5e9; color:#2e7d32;' 
                : 'background:#fff3e0; color:#ef6c00;';
            const badgeText = isDirect ? 'DIRECT' : 'CORRESPONDANCE';
            
            const transferInfo = !isDirect && trip.transferStation
                ? `<div class="transfer-info">Via ${trip.transferStation}${trip.waitTime ? ` (${trip.waitTime} min)` : ''}</div>`
                : '';

            return `
                <div class="trip-row" data-trip-type="${trip.type}" data-departure-time="${trip.departure}">
                    <div style="flex:1;">
                        <span style="font-weight:600;">${trip.departure} ➜ ${trip.arrival}</span>
                        ${transferInfo}
                    </div>
                    <span style="font-size:0.7rem; padding:2px 8px; border-radius:12px; ${badgeStyle} font-weight:bold; white-space:nowrap;">
                        ${badgeText}
                    </span>
                </div>
            `;
        }).join('');
    } else {
        // Mode standard (pour recherche classique)
        tripsListHTML = optimizedTrips.map(trip => {
            const isDirect = trip.type === 'direct';
            const badgeClass = isDirect ? 'badge-direct' : 'badge-transfer';
            const badgeText = isDirect ? 'DIRECT' : 'CORRESP.';
            
            const transferInfo = !isDirect && trip.transferStation
                ? `<div style="font-size:0.75rem; color:#666; margin-top:2px;">Via ${trip.transferStation}</div>`
                : '';
            
            return `
                <div class="result__car-hour-buton" data-trip-type="${trip.type}" data-departure-time="${trip.departure}">
                    <p style="margin-bottom:${transferInfo ? '4px' : '0'};">${trip.departure}</p>
                    ${transferInfo}
                    <span class="${badgeClass}" style="position:absolute; top:4px; right:4px; font-size:0.65rem; padding:2px 6px; border-radius:8px; font-weight:bold;">
                        ${badgeText}
                    </span>
                </div>
            `;
        }).join('');
    }

    const detailsClass = 'result__card-details collapsed';
    const detailsStyle = displayMode === 'expanded' ? 'padding: 10px 15px;' : '';
    const detailsContent = displayMode === 'expanded' 
        ? tripsListHTML 
        : `<div class="result__car-hour">${tripsListHTML}</div>`;

    return `
        <div class="result__card-placeholder"
             data-destination-name="${destination}"
             data-lat="${lat}"
             data-lon="${lon}">
            
            <div class="result__card-header">
                <!-- <div class="result__card-image-container">
                    <img class="result__card-image" src="" alt="Image de ${destination}" loading="lazy">
                </div> -->
                
                <div class="result__card-destination">
                    <span class="mr-2">→</span>
                    <h4>${destination.toUpperCase()}</h4>
                    ${minDurationFormatted ? `<span class="result__min-duration">(${minDurationFormatted})</span>` : `<small style="color:#888;">${optimizedTrips.length} option(s)</small>`}
                </div>
                <div class="result__card-expand-info">
                    <img src="assets/results/fleche_card.png" alt="Dérouler" class="expand-arrow">
                </div>
            </div>
            
            <div class="${detailsClass}" style="${detailsStyle}">
                ${detailsContent}
            </div>
        </div>
    `;
}

function setupCardToggleListeners() {
    const cards = document.querySelectorAll('.results-cards-container .result__card-placeholder');
    cards.forEach(card => {
        const header = card.querySelector('.result__card-header');
        if (header) {
            header.addEventListener('click', () => {
                const detailsContainer = card.querySelector('.result__card-details');
                card.classList.toggle('expanded');
                detailsContainer.classList.toggle('collapsed');
            });
        }
    });
}

// ==================== CHARGEMENT DES IMAGES WIKIPEDIA ====================

async function loadWikipediaImages(container) {
    // Vérifier que image_fetcher.js est chargé
    if (typeof fetchWikimediaImage !== 'function') {
        console.warn('⚠️ image_fetcher.js non chargé - images désactivées');
        return;
    }
    
    const allCards = container.querySelectorAll('.result__card-placeholder');
    
    for (const card of allCards) {
        const destinationName = card.dataset.destinationName;
        const imageElement = card.querySelector('.result__card-image');

        if (destinationName && imageElement && !imageElement.src) {
            try {
                const imageUrl = await fetchWikimediaImage(destinationName);
                
                if (imageUrl) {
                    imageElement.src = imageUrl;
                } else {
                    const imageContainer = card.querySelector('.result__card-image-container');
                    if (imageContainer) imageContainer.style.display = 'none';
                }
            } catch (error) {
                console.error(`Erreur image pour ${destinationName}:`, error);
                const imageContainer = card.querySelector('.result__card-image-container');
                if (imageContainer) imageContainer.style.display = 'none';
            }
        }
    }
}

// ==================== DÉTECTION DU MODE ====================

function detectSearchMode(params) {
    const destinationId = params.get('destination_id');
    const destinationName = params.get('destination_name');
    const isTransferParam = params.get('transfer') === 'true';
    
    // Mode "N'importe où"
    const isAnywhereMode = destinationId === 'ANYWHERE' || destinationName === "N'importe où";
    
    // Mode Explorer (avec filtres de correspondances)
    const isExplorerMode = window.filterState && typeof window.getMaxTransfersFromStops === 'function';
    
    return {
        isAnywhereMode,
        isExplorerMode,
        shouldIncludeTransfers: isTransferParam || isAnywhereMode || isExplorerMode,
        displayMode: isExplorerMode ? 'expanded' : 'standard'
    };
}

// ==================== FONCTION PRINCIPALE UNIFIÉE ====================

async function fetchAndDisplayResults() {
    initMap();

    const resultsContainer = document.querySelector(".results__list-container");
    if (!resultsContainer) return;

    // Créer ou récupérer le conteneur de cartes
    let cardsContainer = resultsContainer.querySelector('.results-cards-container');
    if (!cardsContainer) {
        cardsContainer = document.createElement('div');
        cardsContainer.className = 'results-cards-container';
        resultsContainer.appendChild(cardsContainer);
    }

    // Vérification que api_service.js est chargé
    if (typeof window.TGVMaxAPI === 'undefined') {
        console.error('❌ api_service.js non chargé');
        cardsContainer.innerHTML = `
            <p class="text-center p-5 text-red-500">
                Erreur: Le service de recherche n'est pas disponible. 
                Assurez-vous que api_service.js est chargé avant results_display.js
            </p>`;
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const departureId = params.get('id');
    const departureName = params.get('name');
    const dateValue = params.get('date');
    const departureLat = params.get('lat');
    const departureLon = params.get('lon');
    const destinationId = params.get('destination_id');
    const destinationName = params.get('destination_name');
    const tripType = params.get('trip_type') || 'oneway'; 
    const returnDateValue = params.get('return_date');

    // 🔄 NOUVEAU : Détection du mode aller-retour
    const isRoundTrip = tripType === 'roundtrip' && returnDateValue;

    // Pré-remplir les inputs
    const departureInput = document.getElementById('departure-city');
    const destinationInput = document.getElementById('destination-city');
    const dateInput = document.getElementById('departure-date');
    const returnDateInput = document.getElementById('return-date');
    const returnDateWrapper = document.getElementById('return-date-wrapper');
    
    if (departureInput) {
        departureInput.value = departureName || '';
        departureInput.dataset.id = departureId || '';
        departureInput.dataset.lat = departureLat || '';
        departureInput.dataset.lon = departureLon || '';
    }

    const mode = detectSearchMode(params);
    
    if (destinationInput) {
        if (mode.isAnywhereMode) {
            destinationInput.value = "N'importe où";
            destinationInput.dataset.id = 'ANYWHERE';
            destinationInput.dataset.anywhere = 'true';
        } else {
            destinationInput.value = destinationName || '';
            destinationInput.dataset.id = destinationId || '';
        }
    }

    if (dateInput) dateInput.value = dateValue || '';
    if (returnDateInput && returnDateValue) {
        returnDateInput.value = returnDateValue;
    }

    if (typeof handleTripTypeChange === 'function') {
        handleTripTypeChange(tripType);
    } else if (returnDateWrapper) {
        if (tripType === 'roundtrip') {
            returnDateWrapper.classList.remove('hidden');
        } else {
            returnDateWrapper.classList.add('hidden');
        }
    }

    // 🔄 MODE ALLER-RETOUR : Attendre les données de roundtrip_handler.js
    if (isRoundTrip) {
        console.log('🔄 Mode aller-retour détecté - Attente des données...');
        
        cardsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h3>🔄 Recherche d'aller-retours...</h3>
                <p>Aller : ${dateValue}</p>
                <p>Retour : ${returnDateValue}</p>
                <div style="margin: 20px auto; width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            </div>
        `;

        // Écouter l'événement de données prêtes
        const handleRoundTripData = (event) => {
            console.log('✅ Données aller-retour reçues:', event.detail);
            displayRoundTripResults(event.detail.data, event.detail.params, cardsContainer);
        };

        // Si les données sont déjà disponibles
        if (window.ROUNDTRIP_DATA) {
            console.log('✅ Données aller-retour déjà disponibles');
            displayRoundTripResults(window.ROUNDTRIP_DATA, window.ROUNDTRIP_PARAMS, cardsContainer);
        } else {
            // Sinon, attendre l'événement
            window.addEventListener('roundtripDataReady', handleRoundTripData, { once: true });
        }

        return; // Ne pas continuer avec la recherche normale
    }

    // MODE NORMAL (aller simple) - Code existant inchangé
    let maxTransferLevels = 0;
    if (mode.isExplorerMode) {
        maxTransferLevels = window.getMaxTransfersFromStops(window.filterState.stops);
        console.log(`🚀 Mode Explorer : Max ${maxTransferLevels} correspondance(s)`);
    } else if (mode.shouldIncludeTransfers) {
        maxTransferLevels = 1;
        console.log("🔄 Mode avec correspondances activé");
    } else {
        console.log("🚄 Mode Direct uniquement");
    }

    const loadingMessage = mode.isAnywhereMode
        ? `Chargement de tous les TGVmax depuis <strong>${departureName}</strong> le <strong>${dateValue}</strong>...`
        : mode.isExplorerMode
        ? `<div class="text-center p-10">
               <div class="spinner"></div>
               <p>Exploration des trajets (Max: ${maxTransferLevels} corresp.)...</p>
           </div>`
        : `Chargement des TGVmax de <strong>${departureName}</strong> à <strong>${destinationName}</strong> le <strong>${dateValue}</strong>...`;
        
    cardsContainer.innerHTML = loadingMessage;

    if (!departureId || !dateValue) {
        cardsContainer.innerHTML = "<p class='text-center p-5 text-red-500'>Paramètres de recherche incomplets.</p>";
        return;
    }
    
    try {
        const searchParams = {
            departureId: departureId,
            destinationId: mode.isAnywhereMode ? null : destinationId,
            date: dateValue
        };

        const searchOptions = {
            includeTransfers: mode.shouldIncludeTransfers,
            maxTransferLevels: maxTransferLevels
        };

        console.log('🔍 Recherche via TGVMaxAPI...', searchParams, searchOptions);
        const results = await window.TGVMaxAPI.searchJourneysWithStations(searchParams, searchOptions);

        cardsContainer.innerHTML = "";
        
        if (results.destinationsMap.size === 0) {
            cardsContainer.innerHTML = `<p class="text-center p-5 text-red-500">❌ Aucun TGVmax trouvé avec ces critères.</p>`;
            return;
        }
        
        console.log(`✅ ${results.destinationsMap.size} destination(s) trouvée(s)`);
        
        const destinationsArray = Array.from(results.destinationsMap.values())
            .sort((a, b) => a.name.localeCompare(b.name));
        
        destinationsArray.forEach(dest => {
            const cardHTML = buildDestinationCard(
                dest.name,
                dest.trips,
                dest.latitude,
                dest.longitude,
                mode.displayMode
            );
            cardsContainer.innerHTML += cardHTML;
        });
        
        setupCardToggleListeners();
        
        const departureData = {
            name: departureName,
            lat: parseFloat(departureLat),
            lon: parseFloat(departureLon)
        };
        
        addMarkers(departureData, destinationsArray);

        await loadWikipediaImages(cardsContainer);

        if (typeof window.applyClientSideFilters === 'function') {
            setTimeout(() => {
                window.applyClientSideFilters();
            }, 100);
        }

    } catch (err) {
        console.error("❌ Erreur:", err);
        cardsContainer.innerHTML = `<p class="text-center p-5 text-red-500">Erreur: ${err.message}</p>`;
    }
}

// ==================== FONCTION PRINCIPALE A/R ====================
// Affichage des résultats aller-retour
function displayRoundTripResults(data, params, container) {
    if (!data || data.error) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: red;">
                <h3>❌ Erreur</h3>
                <p>${data?.error || 'Erreur inconnue'}</p>
            </div>
        `;
        return;
    }

    if (data.metadata?.empty || data.destinationsMap.size === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h3>Aucun aller-retour trouvé</h3>
                <p>Aucune destination avec un aller ET un retour valide</p>
                <p>Dates : ${params.outboundDate} → ${params.returnDate}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    // Trier par durée minimale aller (comme les trajets simples)
    const sortedDestinations = Array.from(data.destinationsMap.values())
        .sort((a, b) => {
            const minDurationA = Math.min(...a.trips.filter(t => t.direction === 'outbound').map(t => t.duration));
            const minDurationB = Math.min(...b.trips.filter(t => t.direction === 'outbound').map(t => t.duration));
            return minDurationA - minDurationB;
        });

    // Afficher chaque destination
    sortedDestinations.forEach(dest => {
        const cardHTML = buildRoundTripCard(dest, params);
        container.innerHTML += cardHTML;
    });

    setupCardToggleListeners();

    // Carte
    if (typeof window.addMarkers === 'function') {
        const departureData = {
            name: params.departureName,
            lat: parseFloat(params.latitude),
            lon: parseFloat(params.longitude)
        };
        addMarkers(departureData, sortedDestinations);
    }
}

// Construction de carte aller-retour
function buildRoundTripCard(dest, params) {
    const outboundTrips = dest.trips.filter(t => t.direction === 'outbound');
    const returnTrips = dest.trips.filter(t => t.direction === 'return');

    const minOutboundDuration = Math.min(...outboundTrips.map(t => t.duration));
    const minOutboundFormatted = window.TGVMaxAPI.formatDuration(minOutboundDuration);

    // On prépare l'affichage HTML pour l'aller (Top 3)
    const outboundHTML = outboundTrips.slice(0, 3).map(trip => renderTripSmall(trip)).join('');
    
    // On prépare l'affichage HTML pour le retour (Top 3)
    const returnHTML = returnTrips.slice(0, 3).map(trip => renderTripSmall(trip)).join('');

    return `
        <div class="result__card-placeholder" data-destination-name="${dest.name}">
            <div class="result__card-header">
                <div class="result__card-destination">
                    <span class="mr-2"><i class="fa-solid fa-arrow-right-arrow-left"></i></span>
                    <h4>${dest.name.toUpperCase()}</h4>
                    <span class="result__min-duration">(${minOutboundFormatted})</span>
                </div>
                <div class="result__card-expand-info">
                    <img src="assets/results/fleche_card.png" class="expand-arrow">
                </div>
            </div>
            <div class="result__card-details collapsed">
                <div style="padding: 10px;">
                    <div style="font-weight: bold; margin-bottom: 5px; color: #2e7d32;">➡️ ALLER (${params.outboundDate})</div>
                    <div class="result__car-hour">${outboundHTML}</div>
                    
                    <div style="font-weight: bold; margin-top: 15px; margin-bottom: 5px; color: #ef6c00;">⬅️ RETOUR (${params.returnDate})</div>
                    <div class="result__car-hour">${returnHTML}</div>
                </div>
            </div>
        </div>
    `;
}

// Fonction utilitaire pour éviter la répétition de code
function renderTripSmall(trip) {
    const isDirect = trip.type === 'direct';
    const badgeClass = isDirect ? 'badge-direct' : 'badge-transfer';
    const badgeText = isDirect ? 'DIRECT' : 'CORRESP.';
    const transferInfo = !isDirect && trip.transferStation
        ? `<div style="font-size:0.75rem;color:#666;margin-top:2px;">Via ${trip.transferStation}</div>`
        : '';
    
    return `
        <div class="result__car-hour-buton">
            <p>${trip.departure}</p>
            ${transferInfo}
            <span class="${badgeClass}" style="position:absolute; top:4px; right:4px; font-size:0.65rem; padding:2px 6px; border-radius:8px; font-weight:bold;">
                ${badgeText}
            </span>
        </div>
    `;
}

// Construction d'une ligne de trajet (utilisée par aller-retour)
// function buildTripRow(trip) {
//     const isDirect = trip.type === 'direct';
//     const badgeStyle = isDirect ? 'background:#e8f5e9;color:#2e7d32;' : 'background:#fff3e0;color:#ef6c00;';
//     const badgeText = isDirect ? 'DIRECT' : `${trip.stops} CORRESP.`;
    
//     const transferInfo = !isDirect && trip.transferStation
//         ? `<div style="font-size:0.75rem;color:#666;margin-top:2px;">Via ${trip.transferStation}</div>`
//         : '';

//     return `
//         <div class="trip-row" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f2f2f2;">
//             <div style="flex:1;">
//                 <span style="font-weight:600;">${trip.departure} → ${trip.arrival}</span>
//                 <span style="color:#888;margin-left:8px;">(${TGVMaxAPI.formatDuration(trip.duration)})</span>
//                 ${transferInfo}
//             </div>
//             <span style="font-size:0.7rem;padding:2px 8px;border-radius:12px;${badgeStyle}font-weight:bold;white-space:nowrap;">
//                 ${badgeText}
//             </span>
//         </div>
//     `;
// }

// Formatage de date
function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}
// ==================== EXPORT ET INITIALISATION ====================

window.fetchAndDisplayResults = fetchAndDisplayResults;
window.addMarkers = addMarkers;

document.addEventListener("DOMContentLoaded", () => {
    fetchAndDisplayResults();
});