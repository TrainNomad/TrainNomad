// roundtrip_handler.js - Prépare les données aller-retour pour results_display_unified.js
// Utilise searchJourneysWithStations() dans les deux sens avec optimisation

(function() {
    'use strict';

    // Vérification des dépendances
    if (typeof TGVMaxAPI === 'undefined') {
        console.error('❌ TGVMaxAPI non chargé - Charger api_service.js d\'abord');
        return;
    }

    console.log('🔄 Chargement du gestionnaire aller-retour...');

    /**
     * Détecte si on est en mode aller-retour depuis l'URL
     */
    function isRoundTripMode() {
        const params = new URLSearchParams(window.location.search);
        return params.get('trip_type') === 'roundtrip' && params.get('return_date');
    }

    /**
     * Extrait les paramètres aller-retour de l'URL
     */
    function getRoundTripParams() {
        const params = new URLSearchParams(window.location.search);
        
        // Déterminer si on doit inclure les correspondances
        const isAnywhereMode = params.get('destination_id') === 'ANYWHERE';
        const transferParam = params.get('transfer') === 'true';
        
        return {
            departureId: params.get('id'),
            departureName: decodeURIComponent(params.get('name') || ''),
            destinationId: isAnywhereMode ? null : params.get('destination_id'),
            destinationName: params.get('destination_name') ? decodeURIComponent(params.get('destination_name')) : null,
            outboundDate: params.get('date'),
            returnDate: params.get('return_date'),
            // IMPORTANT : En mode "N'importe où", forcer les correspondances
            includeTransfers: isAnywhereMode ? true : transferParam,
            latitude: params.get('lat'),
            longitude: params.get('lon')
        };
    }

    /**
     * Optimise les trajets : ne garde qu'un trajet par heure de départ (le plus rapide)
     * Même logique que dans results_display_unified.js
     */
    function optimizeTrips(trips) {
        const tripsByDeparture = new Map();
        
        trips.forEach(trip => {
            const departureTime = trip.departure;
            
            if (!tripsByDeparture.has(departureTime)) {
                tripsByDeparture.set(departureTime, trip);
            } else {
                // Garder le trajet le plus rapide
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

    /**
     * Recherche aller-retour en utilisant searchJourneysWithStations() deux fois
     * 1. Départ → Destinations (aller)
     * 2. Destinations → Départ (retour)
     * Croise les résultats pour ne garder que les destinations avec aller ET retour
     */
    async function performRoundTripSearch() {
        const params = getRoundTripParams();
        
        console.log('🔄 RECHERCHE ALLER-RETOUR avec searchJourneysWithStations()');
        console.log(`   Départ: ${params.departureName} (${params.departureId})`);
        console.log(`   Destination: ${params.destinationName || "N'importe où"} (${params.destinationId || 'ANYWHERE'})`);
        console.log(`   Aller: ${params.outboundDate}`);
        console.log(`   Retour: ${params.returnDate}`);
        console.log(`   Correspondances: ${params.includeTransfers ? 'OUI' : 'NON'}`);

        try {
            // Déterminer le niveau max de correspondances
            const maxTransferLevels = params.includeTransfers ? 1 : 0;

            console.log(`📊 Configuration: maxTransferLevels=${maxTransferLevels}, includeTransfers=${params.includeTransfers}`);

            // ================== 1️⃣ RECHERCHE ALLER ==================
            console.log('➡️ Recherche des trajets ALLER...');
            
            const outboundResults = await TGVMaxAPI.searchJourneysWithStations({
                departureId: params.departureId,
                destinationId: params.destinationId, // null si "N'importe où"
                date: params.outboundDate
            }, {
                includeTransfers: params.includeTransfers,
                maxTransferLevels: maxTransferLevels
            });

            console.log(`✅ Aller: ${outboundResults.destinationsMap.size} destination(s) trouvée(s)`);
            
            // Debug : compter les trajets directs vs avec correspondances
            let directCount = 0;
            let transferCount = 0;
            outboundResults.destinationsMap.forEach(dest => {
                dest.trips.forEach(trip => {
                    if (trip.type === 'direct') directCount++;
                    else transferCount++;
                });
            });
            console.log(`   📊 Aller: ${directCount} directs, ${transferCount} avec correspondances`);

            if (outboundResults.destinationsMap.size === 0) {
                console.warn('⚠️ Aucun trajet aller trouvé');
                window.ROUNDTRIP_DATA = {
                    destinationsMap: new Map(),
                    metadata: {
                        searchDate: params.outboundDate,
                        returnDate: params.returnDate,
                        departureId: params.departureId,
                        mode: 'roundtrip',
                        empty: true,
                        reason: 'no_outbound'
                    }
                };
                triggerDataReadyEvent();
                return;
            }

            // ================== 2️⃣ RECHERCHE RETOURS ==================
            console.log('⬅️ Recherche des trajets RETOUR depuis chaque destination...');

            const returnSearchPromises = [];
            const destinationsList = Array.from(outboundResults.destinationsMap.keys());

            // Pour chaque destination accessible à l'aller, chercher le retour
            for (const destIata of destinationsList) {
                returnSearchPromises.push(
                    TGVMaxAPI.searchJourneysWithStations({
                        departureId: destIata,           // Depuis la destination
                        destinationId: params.departureId, // Vers le point de départ
                        date: params.returnDate
                    }, {
                        // IMPORTANT : Passer les MÊMES options que pour l'aller
                        includeTransfers: params.includeTransfers,
                        maxTransferLevels: maxTransferLevels
                    }).then(results => {
                        // Extraire les trajets retour vers le point de départ
                        const returnData = results.destinationsMap.get(params.departureId);
                        const returnTrips = returnData ? returnData.trips : [];
                        
                        // Debug
                        if (returnTrips.length > 0) {
                            const directRet = returnTrips.filter(t => t.type === 'direct').length;
                            const transferRet = returnTrips.filter(t => t.type === 'transfer').length;
                            console.log(`   🔍 ${destIata}: ${returnTrips.length} retours (${directRet} directs, ${transferRet} corresp.)`);
                        }
                        
                        return {
                            destIata: destIata,
                            returnTrips: returnTrips
                        };
                    }).catch(err => {
                        console.warn(`⚠️ Erreur retour depuis ${destIata}:`, err);
                        return { destIata: destIata, returnTrips: [] };
                    })
                );
            }

            const returnResults = await Promise.all(returnSearchPromises);
            
            console.log(`✅ Retours recherchés pour ${returnResults.length} destination(s)`);

            // ================== 3️⃣ CROISEMENT DES RÉSULTATS ==================
            console.log('🔄 Croisement des résultats (aller ∩ retour)...');

            const validDestinations = new Map();
            let totalReturnOrigins = 0;
            let totalDirectReturns = 0;
            let totalTransferReturns = 0;

            returnResults.forEach(({ destIata, returnTrips }) => {
                const outboundDest = outboundResults.destinationsMap.get(destIata);
                
                if (!outboundDest) {
                    console.warn(`⚠️ Destination ${destIata} non trouvée dans les allers`);
                    return;
                }

                if (returnTrips.length > 0) {
                    totalReturnOrigins++;

                    // Compter les types de trajets retour
                    const directRet = returnTrips.filter(t => t.type === 'direct').length;
                    const transferRet = returnTrips.filter(t => t.type === 'transfer').length;
                    totalDirectReturns += directRet;
                    totalTransferReturns += transferRet;

                    // Optimiser les trajets aller (pas de doublons d'horaires)
                    const optimizedOutbound = optimizeTrips(outboundDest.trips);
                    
                    // Optimiser les trajets retour (pas de doublons d'horaires)
                    const optimizedReturn = optimizeTrips(returnTrips);

                    console.log(`   ✓ ${outboundDest.name}: ${outboundDest.trips.length}→${optimizedOutbound.length} allers, ${returnTrips.length}→${optimizedReturn.length} retours`);

                    // Ajouter les métadonnées de direction et transferStation
                    const outboundWithMeta = optimizedOutbound.map(trip => {
                        // Extraire la gare de correspondance si c'est un trajet avec correspondance
                        let transferStation = null;
                        if (trip.type === 'transfer' && trip.legs && trip.legs.length >= 2) {
                            transferStation = trip.legs[0].destination;
                        }
                        
                        return {
                            ...trip,
                            direction: 'outbound',
                            directionLabel: '➡️ ALLER',
                            date: params.outboundDate,
                            transferStation: transferStation
                        };
                    });

                    const returnWithMeta = optimizedReturn.map(trip => {
                        // Extraire la gare de correspondance si c'est un trajet avec correspondance
                        let transferStation = null;
                        if (trip.type === 'transfer' && trip.legs && trip.legs.length >= 2) {
                            transferStation = trip.legs[0].destination;
                        }
                        
                        return {
                            ...trip,
                            direction: 'return',
                            directionLabel: '⬅️ RETOUR',
                            date: params.returnDate,
                            transferStation: transferStation
                        };
                    });

                    // Combiner et trier (allers d'abord, puis retours)
                    const allTrips = [...outboundWithMeta, ...returnWithMeta];

                    validDestinations.set(destIata, {
                        iata: destIata,
                        name: outboundDest.name,
                        latitude: outboundDest.latitude,
                        longitude: outboundDest.longitude,
                        trips: allTrips,
                        tripCount: allTrips.length,
                        outboundCount: optimizedOutbound.length,
                        returnCount: optimizedReturn.length,
                        totalCombinations: optimizedOutbound.length * optimizedReturn.length
                    });
                } else {
                    console.log(`   ✗ ${outboundDest.name}: Aucun retour disponible`);
                }
            });

            console.log(`🎯 RÉSULTAT FINAL: ${validDestinations.size} destination(s) avec aller ET retour`);
            console.log(`📊 Retours: ${totalDirectReturns} directs, ${totalTransferReturns} avec correspondances`);

            if (validDestinations.size === 0) {
                console.warn('⚠️ Aucune destination avec aller ET retour valides');
                window.ROUNDTRIP_DATA = {
                    destinationsMap: new Map(),
                    metadata: {
                        searchDate: params.outboundDate,
                        returnDate: params.returnDate,
                        departureId: params.departureId,
                        mode: 'roundtrip',
                        empty: true,
                        reason: 'no_matching_returns',
                        stats: {
                            outboundDestinations: outboundResults.destinationsMap.size,
                            returnOrigins: totalReturnOrigins
                        }
                    }
                };
                triggerDataReadyEvent();
                return;
            }

            // ================== 4️⃣ INJECTION DES DONNÉES ==================
            const transformedResults = {
                destinationsMap: validDestinations,
                metadata: {
                    searchDate: params.outboundDate,
                    returnDate: params.returnDate,
                    departureId: params.departureId,
                    mode: 'roundtrip',
                    stats: {
                        totalDestinations: validDestinations.size,
                        outboundDestinations: outboundResults.destinationsMap.size,
                        returnOrigins: totalReturnOrigins,
                        totalCombinations: Array.from(validDestinations.values())
                            .reduce((sum, dest) => sum + dest.totalCombinations, 0),
                        directReturns: totalDirectReturns,
                        transferReturns: totalTransferReturns
                    }
                }
            };

            console.log('✅ Données transformées:', transformedResults);
            console.log(`📊 Stats: ${transformedResults.metadata.stats.totalCombinations} combinaisons au total`);

            // Injecter dans window
            window.ROUNDTRIP_DATA = transformedResults;
            window.ROUNDTRIP_PARAMS = params;

            // Déclencher l'événement
            triggerDataReadyEvent();

        } catch (error) {
            console.error('❌ Erreur recherche aller-retour:', error);
            window.ROUNDTRIP_DATA = { 
                error: error.message,
                metadata: { mode: 'roundtrip' }
            };
            triggerDataReadyEvent();
        }
    }

    /**
     * Déclenche l'événement pour notifier results_display_unified.js
     */
    function triggerDataReadyEvent() {
        const event = new CustomEvent('roundtripDataReady', { 
            detail: { 
                data: window.ROUNDTRIP_DATA,
                params: window.ROUNDTRIP_PARAMS
            } 
        });
        window.dispatchEvent(event);
        console.log('📡 Événement roundtripDataReady déclenché');
    }

    // ==================== INITIALISATION ====================

    /**
     * Point d'entrée principal
     */
    function init() {
        console.log('🔄 Initialisation du gestionnaire aller-retour...');

        // Vérifier si on est en mode aller-retour
        if (isRoundTripMode()) {
            console.log('✅ Mode aller-retour détecté');
            
            // Lancer la recherche
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', performRoundTripSearch);
            } else {
                performRoundTripSearch();
            }
        } else {
            console.log('ℹ️ Mode aller simple - gestionnaire aller-retour inactif');
        }
    }

    // Lancer l'initialisation
    init();

    // Export global pour debug
    window.RoundTripHandler = {
        isRoundTripMode,
        getRoundTripParams,
        performRoundTripSearch,
        optimizeTrips
    };

    console.log('✅ Gestionnaire aller-retour chargé (utilise searchJourneysWithStations)');

})();