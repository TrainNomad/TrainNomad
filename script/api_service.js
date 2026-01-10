// api_service.js - Service centralisé pour toutes les recherches TGVmax
// Ce fichier gère UNIQUEMENT la récupération des données (pas l'affichage)

/**
 * SERVICE CENTRALISÉ DE RECHERCHE TGVmax
 * 
 * Architecture :
 * - api_service.js (ce fichier) : Récupération des données
 * - results_display.js : Mise en forme "n'importe où"
 * - results_display_transfert.js : Mise en forme avec correspondances
 * - Train.js : Mise en forme trajets spécifiques
 */

// ==================== CONFIGURATION ====================

const API_CONFIG = {
    BASE_URL: "https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/tgvmax/records",
    RECORDS_PER_PAGE: 100,
    TRANSFER: {
        MIN_WAIT: 10,
        MAX_WAIT: 180,
        MAX_TOTAL_HOURS: 10,
        MAX_LEVELS: 1 // Correspondances maximum par défaut
    }
};

// Cache pour éviter les requêtes répétées
const apiCache = new Map();

// ==================== UTILITAIRES TEMPS ====================

/**
 * Convertit une heure HH:MM en minutes
 */
function parseTimeToMinutes(timeString) {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Calcule la différence en minutes entre deux heures
 */
function calculateMinutesDiff(startTime, endTime) {
    const start = parseTimeToMinutes(startTime);
    let end = parseTimeToMinutes(endTime);
    if (end < start) end += 24 * 60; // Passage minuit
    return end - start;
}

/**
 * Formate une durée en minutes vers HHhMM
 */
function formatDuration(minutes) {
    if (minutes === Infinity || minutes < 0) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
}

// ==================== RÉCUPÉRATION DE DONNÉES ====================

/**
 * Récupère TOUS les trajets TGVmax avec pagination automatique
 * @param {string} originIata - Code IATA de la gare de départ
 * @param {string} date - Date au format YYYY-MM-DD
 * @param {string} destinationIata - Code IATA de destination (optionnel)
 * @returns {Promise<Array>} Liste complète des trajets
 */
async function fetchAllTGVMaxRecords(originIata, date, destinationIata = null) {
    let allRecords = [];
    let offset = 0;
    let hasMore = true;

    // Construction de l'URL de base
    let baseFilters = `origine_iata:${originIata}&refine=date:${date}&refine=od_happy_card:"OUI"`;
    if (destinationIata) {
        baseFilters += `&refine=destination_iata:${destinationIata}`;
    }

    while (hasMore) {
        const apiUrl = `${API_CONFIG.BASE_URL}?limit=${API_CONFIG.RECORDS_PER_PAGE}&offset=${offset}&refine=${baseFilters}`;
        
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
            
            const data = await response.json();
            const records = data.results || [];
            
            if (records.length === 0) {
                hasMore = false;
            } else {
                allRecords = allRecords.concat(records);
                offset += API_CONFIG.RECORDS_PER_PAGE;
                
                if (records.length < API_CONFIG.RECORDS_PER_PAGE) {
                    hasMore = false;
                }
            }
            
            console.log(`📥 Chargés : ${allRecords.length} trajets depuis ${originIata}`);
            
        } catch (error) {
            console.error(`❌ Erreur récupération depuis ${originIata}:`, error);
            hasMore = false;
        }
    }
    
    return allRecords;
}

/**
 * Récupère avec cache (évite les doublons de requêtes)
 */
async function fetchWithCache(url) {
    if (apiCache.has(url)) {
        console.log(`💾 Cache hit: ${url.substring(0, 80)}...`);
        return apiCache.get(url);
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        apiCache.set(url, data);
        return data;
    } catch (error) {
        console.error(`❌ Erreur fetch: ${url}`, error);
        return { results: [] };
    }
}

/**
 * Récupère les informations d'une gare par son code IATA
 */
async function fetchStationByIata(iataCode) {
    if (!iataCode) return null;
    
    // Utiliser l'API_BASE_URL globale si elle existe
    const baseUrl = typeof API_BASE_URL !== 'undefined' 
        ? API_BASE_URL 
        : 'https://tgvmax.fr/api'; // Fallback
    
    try {
        const url = `${baseUrl}/station/${iataCode}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            console.warn(`⚠️ Gare non trouvée: ${iataCode}`);
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error(`❌ Erreur fetch gare ${iataCode}:`, error);
        return null;
    }
}

// ==================== RECHERCHE DE TRAJETS ====================

/**
 * FONCTION PRINCIPALE : Recherche intelligente de trajets
 * 
 * @param {Object} params - Paramètres de recherche
 * @param {string} params.departureId - Code IATA départ
 * @param {string} params.destinationId - Code IATA destination (ou null pour "n'importe où")
 * @param {string} params.date - Date YYYY-MM-DD
 * @param {Object} options - Options de recherche
 * @param {boolean} options.includeTransfers - Inclure les correspondances
 * @param {number} options.maxTransferLevels - Nombre max de correspondances (0-3)
 * @returns {Promise<Object>} Résultats structurés
 */
// api_service.js - Remplacer la fonction searchJourneys
async function searchJourneys(params, options = {}) {
    const { departureId, destinationId, date } = params;
    
    // On lit le niveau de correspondance demandé (0 = direct, 1 = 1 stop, etc.)
    const maxLevels = options.maxTransferLevels !== undefined ? options.maxTransferLevels : 1;
    const includeTransfers = options.includeTransfers !== undefined ? options.includeTransfers : true;

    console.log(`🔍 API: Recherche ${departureId} -> ${destinationId || 'Partout'} | Max Stops: ${maxLevels}`);

    const results = {
        direct: [],
        transfers: [],
        destinationsMap: new Map(),
        metadata: { searchDate: date, departureId, maxLevels }
    };

    try {
        // 1. RECHERCHE DIRECTE
        const directTrips = await fetchAllTGVMaxRecords(departureId, date, destinationId);
        
        directTrips.forEach(trip => {
            const destIata = trip.destination_iata;
            if (!results.destinationsMap.has(destIata)) {
                results.destinationsMap.set(destIata, { iata: destIata, name: trip.destination, trips: [] });
            }
            results.destinationsMap.get(destIata).trips.push({
                type: 'direct',
                departure: trip.heure_depart,
                arrival: trip.heure_arrivee,
                duration: calculateMinutesDiff(trip.heure_depart, trip.heure_arrivee),
                legs: [trip]
            });
            results.direct.push(trip);
        });

        // 2. RECHERCHE CORRESPONDANCES (Récursive)
        if (includeTransfers && maxLevels > 0) {
            // Pour les correspondances, on part de TOUS les départs possibles de la gare d'origine
            const firstLegsSource = destinationId ? await fetchAllTGVMaxRecords(departureId, date, null) : directTrips;
            
            await searchRecursiveTransfers({
                departureId,
                finalDestinationId: destinationId,
                date,
                currentLegs: firstLegsSource,
                results,
                currentLevel: 1,
                maxLevels: maxLevels
            });
        }

        return results;
    } catch (error) {
        console.error('❌ Erreur API:', error);
        throw error;
    }
}

/**
 * Logique récursive pour trouver N correspondances
 */
async function searchRecursiveTransfers({ departureId, finalDestinationId, date, currentLegs, results, currentLevel, maxLevels }) {
    if (currentLevel > maxLevels || currentLegs.length === 0) return;

    const hubs = [...new Set(currentLegs.map(trip => trip.destination_iata || trip.legs[trip.legs.length-1].destination_iata))];
    const nextLegsPromises = hubs.map(hubIata => fetchAllTGVMaxRecords(hubIata, date, finalDestinationId));
    const allNextLegs = (await Promise.all(nextLegsPromises)).flat();

    const nextLevelLegs = [];

    currentLegs.forEach(prevTrip => {
        const lastLeg = prevTrip.legs ? prevTrip.legs[prevTrip.legs.length - 1] : prevTrip;
        
        allNextLegs.filter(next => next.origine_iata === lastLeg.destination_iata).forEach(next => {
            const waitTime = calculateMinutesDiff(lastLeg.heure_arrivee, next.heure_depart);
            const firstDeparture = prevTrip.legs ? prevTrip.legs[0].heure_depart : prevTrip.heure_depart;
            const totalDuration = calculateMinutesDiff(firstDeparture, next.heure_arrivee);

            if (waitTime >= API_CONFIG.TRANSFER.MIN_WAIT && waitTime <= API_CONFIG.TRANSFER.MAX_WAIT) {
                const path = prevTrip.legs ? [...prevTrip.legs, next] : [prevTrip, next];
                const finalDest = next.destination_iata;

                if (!finalDestinationId || finalDest === finalDestinationId) {
                    if (!results.destinationsMap.has(finalDest)) {
                        results.destinationsMap.set(finalDest, { iata: finalDest, name: next.destination, trips: [] });
                    }
                    results.destinationsMap.get(finalDest).trips.push({
                        type: 'transfer',
                        stops: currentLevel,
                        departure: firstDeparture,
                        arrival: next.heure_arrivee,
                        duration: totalDuration,
                        legs: path
                    });
                }
                nextLevelLegs.push({ legs: path });
            }
        });
    });

    if (currentLevel < maxLevels) {
        await searchRecursiveTransfers({ departureId, finalDestinationId, date, currentLegs: nextLevelLegs, results, currentLevel: currentLevel + 1, maxLevels });
    }
}

/**
 * Recherche des correspondances
 */
async function searchTransferJourneys(
    departureId,
    finalDestinationId,
    date,
    firstLegs,
    results,
    maxLevels
) {
    console.log(`🔄 Recherche de correspondances (max ${maxLevels} niveau(x))...`);
    
    // Si pas de destination finale spécifiée, on cherche partout
    const isAnywhereMode = !finalDestinationId;
    console.log(`📍 Mode: ${isAnywhereMode ? "N'importe où" : `Vers ${finalDestinationId}`}`);

    // Récupération des hubs (gares intermédiaires)
    const hubs = [...new Set(firstLegs.map(trip => trip.destination_iata))];
    console.log(`📍 ${hubs.length} hub(s) potentiel(s): ${hubs.join(', ')}`);

    // Pour chaque hub, récupérer les trains au départ
    const secondLegsPromises = hubs.map(hubIata => 
        fetchAllTGVMaxRecords(hubIata, date, finalDestinationId)
            .catch(err => {
                console.warn(`⚠️ Erreur hub ${hubIata}:`, err);
                return [];
            })
    );

    const secondLegsResults = await Promise.all(secondLegsPromises);
    const allSecondLegs = secondLegsResults.flat();

    console.log(`🔗 ${allSecondLegs.length} connexion(s) potentielle(s) trouvée(s)`);

    // Recherche des correspondances valides
    let validTransfers = 0;

    firstLegs.forEach(leg1 => {
        const connections = allSecondLegs.filter(leg2 => {
            // Le train suivant doit partir du hub où arrive le premier train
            if (leg2.origine_iata !== leg1.destination_iata) return false;
            
            // Ne pas retourner au point de départ
            if (leg2.destination_iata === departureId) return false;
            
            // Si destination spécifique, vérifier qu'on y va
            if (finalDestinationId && leg2.destination_iata !== finalDestinationId) return false;
            
            return true;
        });

        console.log(`   ${leg1.origine} → ${leg1.destination}: ${connections.length} connexion(s) possible(s)`);

        connections.forEach(leg2 => {
            const waitTime = calculateMinutesDiff(leg1.heure_arrivee, leg2.heure_depart);
            const totalDuration = calculateMinutesDiff(leg1.heure_depart, leg2.heure_arrivee);

            // Validation de la correspondance
            if (
                waitTime >= API_CONFIG.TRANSFER.MIN_WAIT &&
                waitTime <= API_CONFIG.TRANSFER.MAX_WAIT &&
                totalDuration <= API_CONFIG.TRANSFER.MAX_TOTAL_HOURS * 60
            ) {
                const destIata = leg2.destination_iata;

                if (!results.destinationsMap.has(destIata)) {
                    results.destinationsMap.set(destIata, {
                        iata: destIata,
                        name: leg2.destination,
                        trips: []
                    });
                }

                results.destinationsMap.get(destIata).trips.push({
                    type: 'transfer',
                    departure: leg1.heure_depart,
                    arrival: leg2.heure_arrivee,
                    duration: totalDuration,
                    waitTime: waitTime,
                    transferStation: leg1.destination,
                    transferIata: leg1.destination_iata,
                    legs: [leg1, leg2]
                });

                results.transfers.push({ leg1, leg2, waitTime, totalDuration });
                validTransfers++;
            }
        });
    });

    console.log(`✅ ${validTransfers} correspondance(s) valide(s) ajoutée(s)`);

    // TODO: Implémenter niveaux 2 et 3 si maxLevels > 1
    if (maxLevels >= 2) {
        console.log('⚠️ Correspondances niveau 2+ non implémentées dans cette version');
    }
}

/**
 * Recherche enrichie avec données de gares
 * @returns {Promise<Object>} Résultats + coordonnées GPS
 */
async function searchJourneysWithStations(params, options = {}) {
    const results = await searchJourneys(params, options);

    // Récupération des données de gares
    const iataSet = new Set();
    results.destinationsMap.forEach((dest, iata) => {
        iataSet.add(iata);
    });

    console.log(`📍 Récupération des coordonnées de ${iataSet.size} gare(s)...`);

    const stationPromises = Array.from(iataSet).map(iata =>
        fetchStationByIata(iata).then(data => ({ iata, data }))
    );

    const stationResults = await Promise.all(stationPromises);

    // Enrichissement des destinations
    stationResults.forEach(({ iata, data }) => {
        if (data && results.destinationsMap.has(iata)) {
            const dest = results.destinationsMap.get(iata);
            dest.name = data.name || dest.name; // Nom officiel
            dest.latitude = data.latitude ? parseFloat(data.latitude) : null;
            dest.longitude = data.longitude ? parseFloat(data.longitude) : null;
        }
    });

    return results;
}

// ==================== EXPORTS ====================

// Exposition globale pour compatibilité avec code existant
window.TGVMaxAPI = {
    // Fonctions principales
    searchJourneys,
    searchJourneysWithStations,
    
    // Fonctions de bas niveau (pour compatibilité)
    fetchAllTGVMaxRecords,
    fetchStationByIata,
    fetchWithCache,
    
    // Utilitaires
    parseTimeToMinutes,
    calculateMinutesDiff,
    formatDuration,
    
    // Configuration
    config: API_CONFIG,
    clearCache: () => apiCache.clear()
};

// Export pour modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.TGVMaxAPI;
}
// window.TGVMaxAPI = { /* ... */ searchJourneys, searchJourneysWithStations /* ... */ };
console.log('✅ TGVMaxAPI chargé et prêt');