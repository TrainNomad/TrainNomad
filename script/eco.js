// eco.js - Calculateur d'empreinte carbone pour les trajets en train
// Version 1.0 - Support des trajets avec correspondances

/**
 * RESPONSABILITÉS :
 * ✅ Calcul des émissions CO2 par segment de trajet
 * ✅ Calcul du total pour les trajets avec correspondances
 * ✅ Affichage détaillé par segment
 * ✅ Comparaison avec d'autres modes de transport
 */

// ==================== CONFIGURATION ====================

const EMISSION_FACTORS = {
    // Émissions en g CO2 / km / passager
    TGV: 3.69,              // TGV / INOUI
    OUIGO: 3.69,            // Même technologie que TGV
    INTERCITE: 8.1,         // Intercités
    TER: 29.9,              // TER
    
    // Comparaison avec d'autres modes
    CAR: 193,               // Voiture thermique moyenne
    PLANE_SHORT: 258,       // Avion court-courrier
    PLANE_LONG: 195,        // Avion long-courrier
    BUS: 68                 // Autocar
};

// ==================== CALCUL DES DISTANCES ====================

/**
 * Calcule la distance entre deux points géographiques (formule de Haversine)
 * @param {number} lat1 - Latitude du point 1
 * @param {number} lon1 - Longitude du point 1
 * @param {number} lat2 - Latitude du point 2
 * @param {number} lon2 - Longitude du point 2
 * @returns {number} Distance en kilomètres
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Arrondi à 1 décimale
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

// ==================== DÉTERMINATION DU TYPE DE TRAIN ====================

/**
 * Détermine le type de train à partir des informations du trip
 * @param {Object} trip - Objet trip contenant entity, axe, numero_train
 * @returns {string} Type de train (TGV, OUIGO, INTERCITE, TER)
 */
function determineTrainType(trip) {
    const entity = (trip.entity || '').toUpperCase();
    const axe = (trip.axe || '').toUpperCase();
    const trainNumber = trip.numero_train || trip.train_no || '';
    
    // Détection OUIGO
    if (entity.includes('OUIGO')) {
        return 'OUIGO';
    }
    
    // Détection Intercités
    if (axe.startsWith('IC') || entity.includes('INTERCITE')) {
        return 'INTERCITE';
    }
    
    // Détection TER
    if (axe.startsWith('TER') || entity.includes('TER')) {
        return 'TER';
    }
    
    // Par défaut : TGV/INOUI
    return 'TGV';
}

// ==================== CALCUL DES ÉMISSIONS ====================

/**
 * Calcule les émissions CO2 pour un segment de trajet
 * @param {Object} trip - Segment de trajet avec coordonnées
 * @returns {Object} Résultat avec distance, émissions, type de train
 */
function calculateSegmentEmissions(trip) {
    // Extraction des coordonnées
    const depCoords = extractCoordinates(trip.origine_iata);
    const arrCoords = extractCoordinates(trip.destination_iata);
    
    if (!depCoords || !arrCoords) {
        console.warn('⚠️ Coordonnées manquantes pour:', trip);
        return null;
    }
    
    // Calcul de la distance
    const distance = calculateDistance(
        depCoords.lat, depCoords.lon,
        arrCoords.lat, arrCoords.lon
    );
    
    // Détermination du type de train
    const trainType = determineTrainType(trip);
    
    // Calcul des émissions
    const emissionFactor = EMISSION_FACTORS[trainType];
    const co2Emissions = (distance * emissionFactor) / 1000; // Conversion en kg
    
    return {
        origin: trip.origine || 'Inconnu',
        destination: trip.destination || 'Inconnu',
        originIata: trip.origine_iata,
        destinationIata: trip.destination_iata,
        distance: distance,
        trainType: trainType,
        trainNumber: trip.numero_train || trip.train_no || '',
        emissionFactor: emissionFactor,
        co2Kg: Math.round(co2Emissions * 100) / 100, // Arrondi à 2 décimales
        departureTime: trip.heure_depart,
        arrivalTime: trip.heure_arrivee
    };
}

/**
 * Calcule les émissions totales pour un trajet complet (avec correspondances)
 * @param {Object} journey - Trajet complet avec trips (segments)
 * @returns {Object} Résultat détaillé avec segments et total
 */
function calculateJourneyEmissions(journey) {
    if (!journey || !journey.trips || journey.trips.length === 0) {
        console.error('❌ Trajet invalide');
        return null;
    }
    
    const segments = [];
    let totalCO2 = 0;
    let totalDistance = 0;
    let hasErrors = false;
    
    // Calcul pour chaque segment
    journey.trips.forEach((trip, index) => {
        const segmentResult = calculateSegmentEmissions(trip);
        
        if (segmentResult) {
            segments.push({
                segmentNumber: index + 1,
                ...segmentResult
            });
            totalCO2 += segmentResult.co2Kg;
            totalDistance += segmentResult.distance;
        } else {
            hasErrors = true;
            console.error(`❌ Erreur calcul segment ${index + 1}`);
        }
    });
    
    return {
        segments: segments,
        totalSegments: journey.trips.length,
        totalDistance: Math.round(totalDistance * 10) / 10,
        totalCO2: Math.round(totalCO2 * 100) / 100,
        hasErrors: hasErrors,
        isDirect: journey.trips.length === 1,
        
        // Comparaisons avec d'autres modes
        comparisons: calculateComparisons(totalDistance, totalCO2)
    };
}

/**
 * Calcule les comparaisons avec d'autres modes de transport
 * @param {number} distance - Distance totale en km
 * @param {number} trainCO2 - Émissions train en kg CO2
 * @returns {Object} Comparaisons détaillées
 */
function calculateComparisons(distance, trainCO2) {
    const carCO2 = (distance * EMISSION_FACTORS.CAR) / 1000;
    const planeCO2 = (distance * (distance < 1000 ? EMISSION_FACTORS.PLANE_SHORT : EMISSION_FACTORS.PLANE_LONG)) / 1000;
    const busCO2 = (distance * EMISSION_FACTORS.BUS) / 1000;
    
    return {
        car: {
            co2Kg: Math.round(carCO2 * 100) / 100,
            saved: Math.round((carCO2 - trainCO2) * 100) / 100,
            percentage: Math.round((1 - trainCO2 / carCO2) * 100)
        },
        plane: {
            co2Kg: Math.round(planeCO2 * 100) / 100,
            saved: Math.round((planeCO2 - trainCO2) * 100) / 100,
            percentage: Math.round((1 - trainCO2 / planeCO2) * 100)
        },
        bus: {
            co2Kg: Math.round(busCO2 * 100) / 100,
            saved: Math.round((busCO2 - trainCO2) * 100) / 100,
            percentage: Math.round((1 - trainCO2 / busCO2) * 100)
        }
    };
}

// ==================== EXTRACTION DES COORDONNÉES ====================

/**
 * Extrait les coordonnées depuis le code IATA
 * Utilise la base de données StationsData si disponible
 */
function extractCoordinates(iataCode) {
    if (!iataCode) return null;
    
    // Utilisation de la base de données StationsData si disponible
    if (window.StationsData && window.StationsData.getStationCoordinates) {
        return window.StationsData.getStationCoordinates(iataCode);
    }
    
    console.warn('⚠️ StationsData non chargé - Chargez stations-data.js avant eco.js');
    return null;
}

// ==================== AFFICHAGE DES RÉSULTATS ====================

/**
 * Génère le HTML pour afficher les résultats d'émissions
 * @param {Object} emissionsData - Données retournées par calculateJourneyEmissions
 * @returns {string} HTML formaté
 */
function generateEmissionsHTML(emissionsData) {
    if (!emissionsData) {
        return '<div class="eco-error">❌ Impossible de calculer les émissions</div>';
    }
    
    let html = '<div class="eco-results">';
    
    // En-tête
    html += `
        <div class="eco-header">
            <h3>🌱 Empreinte Carbone</h3>
            <div class="eco-total">
                <span class="eco-total-value">${emissionsData.totalCO2} kg CO₂</span>
                <span class="eco-total-distance">${emissionsData.totalDistance} km</span>
            </div>
        </div>
    `;
    
    // Détail par segment (si correspondances)
    if (!emissionsData.isDirect) {
        html += '<div class="eco-segments">';
        html += '<h4>Détail par segment :</h4>';
        
        emissionsData.segments.forEach(segment => {
            html += `
                <div class="eco-segment">
                    <div class="eco-segment-header">
                        <span class="eco-segment-number">Segment ${segment.segmentNumber}</span>
                        <span class="eco-segment-train">${segment.trainType} ${segment.trainNumber}</span>
                    </div>
                    <div class="eco-segment-route">
                        ${segment.origin} → ${segment.destination}
                    </div>
                    <div class="eco-segment-details">
                        <span>${segment.distance} km</span>
                        <span class="eco-segment-co2">${segment.co2Kg} kg CO₂</span>
                    </div>
                    <div class="eco-segment-times">
                        ${segment.departureTime} - ${segment.arrivalTime}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    // Comparaisons
    html += '<div class="eco-comparisons">';
    html += '<h4>Vous économisez vs :</h4>';
    
    const comparisons = [
        { mode: 'Voiture', data: emissionsData.comparisons.car, icon: '🚗' },
        { mode: 'Avion', data: emissionsData.comparisons.plane, icon: '✈️' },
        { mode: 'Bus', data: emissionsData.comparisons.bus, icon: '🚌' }
    ];
    
    comparisons.forEach(comp => {
        if (comp.data.saved > 0) {
            html += `
                <div class="eco-comparison">
                    <span class="eco-comparison-icon">${comp.icon}</span>
                    <span class="eco-comparison-mode">${comp.mode}</span>
                    <span class="eco-comparison-saved">-${comp.data.saved} kg CO₂</span>
                    <span class="eco-comparison-percent">${comp.data.percentage}%</span>
                </div>
            `;
        }
    });
    
    html += '</div>';
    html += '</div>';
    
    return html;
}

/**
 * Affiche les émissions dans un conteneur
 * @param {string} containerId - ID du conteneur HTML
 * @param {Object} journey - Trajet à analyser
 */
function displayEmissions(containerId, journey) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ Conteneur ${containerId} introuvable`);
        return;
    }
    
    const emissionsData = calculateJourneyEmissions(journey);
    container.innerHTML = generateEmissionsHTML(emissionsData);
}

// ==================== INTÉGRATION AVEC TRAIN.JS ====================

/**
 * Ajoute les calculs d'émissions à toutes les cartes de trajets
 */
function addEmissionsToAllCards() {
    const cards = document.querySelectorAll('.trip-card');
    
    cards.forEach((card, index) => {
        const journey = getJourneyFromCard(card, index);
        if (journey) {
            const emissionsData = calculateJourneyEmissions(journey);
            if (emissionsData) {
                addEmissionsBadgeToCard(card, emissionsData);
            }
        }
    });
}

/**
 * Ajoute un badge d'émissions à une carte de trajet
 */
function addEmissionsBadgeToCard(card, emissionsData) {
    const badge = document.createElement('div');
    badge.className = 'eco-badge';
    badge.innerHTML = `🌱 ${emissionsData.totalCO2} kg CO₂`;
    badge.title = `Distance: ${emissionsData.totalDistance} km`;
    
    const badgeContainer = card.querySelector('.trip-badges') || card.querySelector('.trip-header');
    if (badgeContainer) {
        badgeContainer.appendChild(badge);
    }
}

/**
 * Récupère les données de trajet depuis une carte
 * NOTE: À adapter selon votre structure de données
 */
function getJourneyFromCard(card, index) {
    // À implémenter selon votre structure
    // Exemple : récupérer depuis window.allOutboundJourneys[index]
    if (window.allOutboundJourneys && window.allOutboundJourneys[index]) {
        return window.allOutboundJourneys[index];
    }
    return null;
}

// ==================== EXPORTS ====================

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateDistance,
        calculateSegmentEmissions,
        calculateJourneyEmissions,
        generateEmissionsHTML,
        displayEmissions,
        addEmissionsToAllCards,
        EMISSION_FACTORS
    };
}

// Export global pour utilisation dans le navigateur
window.EcoCalculator = {
    calculateDistance,
    calculateSegmentEmissions,
    calculateJourneyEmissions,
    generateEmissionsHTML,
    displayEmissions,
    addEmissionsToAllCards,
    EMISSION_FACTORS
};

console.log('✅ eco.js chargé - Calculateur d\'empreinte carbone initialisé');