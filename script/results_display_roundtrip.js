// results_display_roundtrip.js - Affichage des résultats ALLER-RETOUR

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
        .badge-roundtrip {
            background: #e3f2fd;
            color: #1565c0;
            font-size: 0.7rem;
            padding: 3px 8px;
            border-radius: 12px;
            font-weight: bold;
            margin-left: 8px;
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
        .roundtrip-summary {
            background: #f5f5f5;
            padding: 12px;
            border-radius: 8px;
            margin-top: 10px;
            font-size: 0.9rem;
        }
        .roundtrip-section {
            margin: 8px 0;
        }
        .roundtrip-section-title {
            font-weight: 600;
            color: #333;
            margin-bottom: 6px;
            font-size: 0.85rem;
            text-transform: uppercase;
        }
        .trip-direction-icon {
            display: inline-block;
            margin-right: 6px;
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
    const sortedDestinations = [...destinationsData].sort((a, b) => {
        const aTotal = (a.outboundCount || 0) * (a.returnCount || 0);
        const bTotal = (b.outboundCount || 0) * (b.returnCount || 0);
        return bTotal - aTotal;
    });

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

        const combinations = (dest.outboundCount || 0) * (dest.returnCount || 0);
        marker.bindPopup(`
            <b>Arrivée : ${dest.name}</b><br>
            ${dest.outboundCount} aller(s)<br>
            ${dest.returnCount} retour(s)<br>
            <strong>${combinations} combinaison(s)</strong>
        `);
        marker.addTo(markerGroup);
    });

    markerGroup.addTo(map);

    if (markerGroup.getLayers().length > 0) {
        map.fitBounds(markerGroup.getBounds(), { padding: [50, 50] });
    }
}

// ==================== OPTIMISATION DES TRAJETS ====================

function optimizeTrips(trips) {
    const tripsByDeparture = new Map();
    
    trips.forEach(trip => {
        const departureTime = trip.departure;
        
        if (!tripsByDeparture.has(departureTime)) {
            tripsByDeparture.set(departureTime, trip);
        } else {
            const existingTrip = tripsByDeparture.get(departureTime);
            if (trip.duration < existingTrip.duration) {
                tripsByDeparture.set(departureTime, trip);
            }
        }
    });
    
    return Array.from(tripsByDeparture.values())
        .sort((a, b) => a.departure.localeCompare(b.departure));
}

// ==================== CONSTRUCTION DES CARTES ALLER-RETOUR ====================

function buildRoundTripCard(destination, outboundTrips, returnTrips, lat, lon) {
    // Optimisation des trajets
    const optimizedOutbound = optimizeTrips(outboundTrips);
    const optimizedReturn = optimizeTrips(returnTrips);
    
    const totalCombinations = optimizedOutbound.length * optimizedReturn.length;
    
    console.log(`🔄 ${destination}: ${outboundTrips.length} allers → ${optimizedOutbound.length} | ${returnTrips.length} retours → ${optimizedReturn.length}`);
    
    // Calcul des durées minimales
    const minOutboundDuration = Math.min(...optimizedOutbound.map(t => t.duration));
    const minReturnDuration = Math.min(...optimizedReturn.map(t => t.duration));
    
    const minOutboundFormatted = window.TGVMaxAPI ? window.TGVMaxAPI.formatDuration(minOutboundDuration) : '';
    const minReturnFormatted = window.TGVMaxAPI ? window.TGVMaxAPI.formatDuration(minReturnDuration) : '';
    
    // Construction de la liste des trajets ALLER
    const outboundListHTML = optimizedOutbound.map(trip => {
        const isDirect = trip.type === 'direct';
        const badgeClass = isDirect ? 'badge-direct' : 'badge-transfer';
        const badgeText = isDirect ? 'DIRECT' : 'CORRESP.';
        
        const transferInfo = !isDirect && trip.transferStation
            ? `<div style="font-size:0.75rem; color:#666; margin-top:2px;">Via ${trip.transferStation}</div>`
            : '';
        
        return `
            <div class="result__car-hour-buton" data-trip-type="${trip.type}" data-departure-time="${trip.departure}">
                <span class="trip-direction-icon">➡️</span>
                <p style="margin-bottom:${transferInfo ? '4px' : '0'};">${trip.departure}</p>
                ${transferInfo}
                <span class="${badgeClass}" style="position:absolute; top:4px; right:4px; font-size:0.65rem; padding:2px 6px; border-radius:8px; font-weight:bold;">
                    ${badgeText}
                </span>
            </div>
        `;
    }).join('');
    
    // Construction de la liste des trajets RETOUR
    const returnListHTML = optimizedReturn.map(trip => {
        const isDirect = trip.type === 'direct';
        const badgeClass = isDirect ? 'badge-direct' : 'badge-transfer';
        const badgeText = isDirect ? 'DIRECT' : 'CORRESP.';
        
        const transferInfo = !isDirect && trip.transferStation
            ? `<div style="font-size:0.75rem; color:#666; margin-top:2px;">Via ${trip.transferStation}</div>`
            : '';
        
        return `
            <div class="result__car-hour-buton" data-trip-type="${trip.type}" data-departure-time="${trip.departure}">
                <span class="trip-direction-icon">⬅️</span>
                <p style="margin-bottom:${transferInfo ? '4px' : '0'};">${trip.departure}</p>
                ${transferInfo}
                <span class="${badgeClass}" style="position:absolute; top:4px; right:4px; font-size:0.65rem; padding:2px 6px; border-radius:8px; font-weight:bold;">
                    ${badgeText}
                </span>
            </div>
        `;
    }).join('');

    return `
        <div class="result__card-placeholder"
             data-destination-name="${destination}"
             data-lat="${lat}"
             data-lon="${lon}">
            
            <div class="result__card-header">
                <div class="result__card-destination">
                    <span class="mr-2">🔄</span>
                    <h4>${destination.toUpperCase()}</h4>
                    <span class="badge-roundtrip">${totalCombinations} combinaison(s)</span>
                </div>
                <div class="result__card-expand-info">
                    <img src="assets/results/fleche_card.png" alt="Dérouler" class="expand-arrow">
                </div>
            </div>
            
            <div class="result__card-details collapsed">
                <div class="roundtrip-summary">
                    <div class="roundtrip-section">
                        <div class="roundtrip-section-title">➡️ Aller (${optimizedOutbound.length} option${optimizedOutbound.length > 1 ? 's' : ''})${minOutboundFormatted ? ` - Min: ${minOutboundFormatted}` : ''}</div>
                        <div class="result__car-hour">${outboundListHTML}</div>
                    </div>
                    <div class="roundtrip-section">
                        <div class="roundtrip-section-title">⬅️ Retour (${optimizedReturn.length} option${optimizedReturn.length > 1 ? 's' : ''})${minReturnFormatted ? ` - Min: ${minReturnFormatted}` : ''}</div>
                        <div class="result__car-hour">${returnListHTML}</div>
                    </div>
                </div>
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

// ==================== FONCTION PRINCIPALE ALLER-RETOUR ====================

async function fetchAndDisplayRoundTripResults() {
    initMap();

    const resultsContainer = document.querySelector(".results__list-container");
    if (!resultsContainer) return;

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
            </p>`;
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const departureId = params.get('departure_id') || params.get('id');
    const departureName = params.get('departure_name') || params.get('name');
    const departureLat = params.get('lat');
    const departureLon = params.get('lon');
    const destinationId = params.get('destination_id');
    const destinationName = params.get('destination_name');
    const outboundDate = params.get('date');
    const returnDate = params.get('return_date');
    const tripType = params.get('trip_type');

    // Vérification du mode aller-retour
    if (tripType !== 'roundtrip' || !returnDate) {
        console.warn('⚠️ Pas un aller-retour, redirection vers affichage simple');
        if (typeof fetchAndDisplayResults === 'function') {
            fetchAndDisplayResults();
        }
        return;
    }

    // Pré-remplir les inputs si présents
    const departureInput = document.getElementById('results-departure-city');
    const destinationInput = document.getElementById('results-destination-city');
    const dateInput = document.getElementById('results-departure-date');
    
    if (departureInput) {
        departureInput.value = departureName || '';
        departureInput.dataset.id = departureId || '';
    }
    if (destinationInput) {
        const isAnywhereMode = destinationId === 'ANYWHERE' || destinationName === "N'importe où";
        if (isAnywhereMode) {
            destinationInput.value = "N'importe où";
            destinationInput.dataset.id = 'ANYWHERE';
        } else {
            destinationInput.value = destinationName || '';
            destinationInput.dataset.id = destinationId || '';
        }
    }
    if (dateInput) dateInput.value = outboundDate || '';

    // Message de chargement
    const isAnywhereMode = destinationId === 'ANYWHERE' || destinationName === "N'importe où";
    const loadingMessage = isAnywhereMode
        ? `Chargement des allers-retours depuis <strong>${departureName}</strong><br>
           Aller: <strong>${outboundDate}</strong> | Retour: <strong>${returnDate}</strong>...`
        : `Chargement de <strong>${departureName}</strong> ↔️ <strong>${destinationName}</strong><br>
           Aller: <strong>${outboundDate}</strong> | Retour: <strong>${returnDate}</strong>...`;
        
    cardsContainer.innerHTML = loadingMessage;

    if (!departureId || !outboundDate || !returnDate) {
        cardsContainer.innerHTML = "<p class='text-center p-5 text-red-500'>Paramètres de recherche incomplets.</p>";
        return;
    }

    try {
        console.log('🔄 Recherche ALLER-RETOUR via TGVMaxAPI...');
        
        const searchParams = {
            departureId: departureId,
            destinationId: isAnywhereMode ? null : destinationId,
            outboundDate: outboundDate,
            returnDate: returnDate
        };

        const searchOptions = {
            includeTransfers: true,
            maxTransferLevels: 1,
            minStayDuration: 60 // 1 heure minimum sur place
        };

        const results = await window.TGVMaxAPI.searchRoundTrip(searchParams, searchOptions);

        // Nettoyage du conteneur
        cardsContainer.innerHTML = "";
        
        if (results.validDestinations.size === 0) {
            cardsContainer.innerHTML = `<p class="text-center p-5 text-red-500">❌ Aucun aller-retour trouvé avec ces critères.</p>`;
            return;
        }
        
        console.log(`✅ ${results.validDestinations.size} destination(s) avec aller-retour`);
        
        // Conversion et tri des destinations
        const destinationsArray = Array.from(results.validDestinations.values())
            .sort((a, b) => {
                const aCombos = a.outboundCount * a.returnCount;
                const bCombos = b.outboundCount * b.returnCount;
                return bCombos - aCombos;
            });
        
        // Affichage des cartes
        destinationsArray.forEach(dest => {
            const cardHTML = buildRoundTripCard(
                dest.name,
                dest.outboundTrips,
                dest.returnTrips,
                dest.latitude,
                dest.longitude
            );
            cardsContainer.innerHTML += cardHTML;
        });
        
        // Configuration des listeners
        setupCardToggleListeners();
        
        // Affichage de la carte
        const departureData = {
            name: departureName,
            lat: parseFloat(departureLat),
            lon: parseFloat(departureLon)
        };
        
        addMarkers(departureData, destinationsArray);

        // Application des filtres côté client (si disponibles)
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

// ==================== EXPORT ET INITIALISATION ====================

window.fetchAndDisplayRoundTripResults = fetchAndDisplayRoundTripResults;

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const tripType = params.get('trip_type');
    
    if (tripType === 'roundtrip') {
        fetchAndDisplayRoundTripResults();
    } else if (typeof fetchAndDisplayResults === 'function') {
        fetchAndDisplayResults();
    }
});