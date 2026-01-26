// roundtrip_handler.js - VERSION OPTIMISÉE avec calculs parallèles
// Prépare les données aller-retour pour results_display_unified.js

(function() {
    'use strict';

    // Vérification des dépendances
    if (typeof TGVMaxAPI === 'undefined') {
        console.error('❌ TGVMaxAPI non chargé - Charger api_service.js d\'abord');
        return;
    }

    console.log('🔄 Chargement du gestionnaire aller-retour optimisé...');

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
        
        const isAnywhereMode = params.get('destination_id') === 'ANYWHERE';
        const transferParam = params.get('transfer') === 'true';
        
        return {
            departureId: params.get('id'),
            departureName: decodeURIComponent(params.get('name') || ''),
            destinationId: isAnywhereMode ? null : params.get('destination_id'),
            destinationName: params.get('destination_name') ? decodeURIComponent(params.get('destination_name')) : null,
            outboundDate: params.get('date'),
            returnDate: params.get('return_date'),
            includeTransfers: isAnywhereMode ? true : transferParam,
            latitude: params.get('lat'),
            longitude: params.get('lon')
        };
    }

    /**
     * Optimise les trajets : ne garde qu'un trajet par heure de départ (le plus rapide)
     */
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

    /**
     * 🚀 RECHERCHE ALLER-RETOUR OPTIMISÉE
     * Parallélisation maximale des requêtes
     */
    async function performRoundTripSearch() {
        const params = getRoundTripParams();
        
        console.log('🔄 RECHERCHE ALLER-RETOUR OPTIMISÉE (calculs parallèles)');
        console.log(`   Départ: ${params.departureName} (${params.departureId})`);
        console.log(`   Destination: ${params.destinationName || "N'importe où"} (${params.destinationId || 'ANYWHERE'})`);
        console.log(`   Aller: ${params.outboundDate}`);
        console.log(`   Retour: ${params.returnDate}`);
        console.log(`   Correspondances: ${params.includeTransfers ? 'OUI' : 'NON'}`);

        const startTime = performance.now();

        try {
            const maxTransferLevels = params.includeTransfers ? 1 : 0;

            console.log(`📊 Configuration: maxTransferLevels=${maxTransferLevels}`);

            // ================== 1️⃣ RECHERCHE ALLER ==================
            console.log('➡️ Recherche des trajets ALLER...');
            const searchStartTime = performance.now();
            
            const outboundResults = await TGVMaxAPI.searchJourneysWithStations({
                departureId: params.departureId,
                destinationId: params.destinationId,
                date: params.outboundDate
            }, {
                includeTransfers: params.includeTransfers,
                maxTransferLevels: maxTransferLevels
            });

            const searchDuration = (performance.now() - searchStartTime) / 1000;
            console.log(`✅ Aller: ${outboundResults.destinationsMap.size} destination(s) en ${searchDuration.toFixed(2)}s`);

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

            // ================== 2️⃣ RECHERCHE RETOURS EN PARALLÈLE ==================
            console.log('⬅️ Recherche des trajets RETOUR (parallélisation maximale)...');
            const returnStartTime = performance.now();

            const destinationsList = Array.from(outboundResults.destinationsMap.keys());
            
            // 🚀 OPTIMISATION : Toutes les recherches retour en PARALLÈLE
            const returnSearchPromises = destinationsList.map(destIata => 
                TGVMaxAPI.searchJourneysWithStations({
                    departureId: destIata,
                    destinationId: params.departureId,
                    date: params.returnDate
                }, {
                    includeTransfers: params.includeTransfers,
                    maxTransferLevels: maxTransferLevels
                })
                .then(results => {
                    const returnData = results.destinationsMap.get(params.departureId);
                    const returnTrips = returnData ? returnData.trips : [];
                    
                    return {
                        destIata: destIata,
                        returnTrips: returnTrips,
                        outboundDest: outboundResults.destinationsMap.get(destIata)
                    };
                })
                .catch(err => {
                    console.warn(`⚠️ Erreur retour depuis ${destIata}:`, err);
                    return { 
                        destIata: destIata, 
                        returnTrips: [],
                        outboundDest: outboundResults.destinationsMap.get(destIata)
                    };
                })
            );

            // Attendre TOUTES les recherches retour
            const returnResults = await Promise.all(returnSearchPromises);
            
            const returnDuration = (performance.now() - returnStartTime) / 1000;
            console.log(`✅ ${returnResults.length} recherches retour en ${returnDuration.toFixed(2)}s (parallèles)`);

            // ================== 3️⃣ TRAITEMENT PARALLÈLE DES RÉSULTATS ==================
            console.log('🔄 Traitement des résultats...');
            const processingStartTime = performance.now();

            const validDestinations = new Map();
            let totalReturnOrigins = 0;
            let totalDirectReturns = 0;
            let totalTransferReturns = 0;

            // 🚀 OPTIMISATION : Traitement en parallèle avec Promise.all
            const processedResults = await Promise.all(
                returnResults.map(async ({ destIata, returnTrips, outboundDest }) => {
                    if (!outboundDest) {
                        console.warn(`⚠️ Destination ${destIata} non trouvée dans les allers`);
                        return null;
                    }

                    if (returnTrips.length === 0) {
                        return null;
                    }

                    totalReturnOrigins++;

                    // Compter les types de trajets
                    const directRet = returnTrips.filter(t => t.type === 'direct').length;
                    const transferRet = returnTrips.filter(t => t.type === 'transfer').length;

                    // 🚀 OPTIMISATION : Optimisations en parallèle
                    const [optimizedOutbound, optimizedReturn] = await Promise.all([
                        Promise.resolve(optimizeTrips(outboundDest.trips)),
                        Promise.resolve(optimizeTrips(returnTrips))
                    ]);

                    // Ajouter les métadonnées
                    const outboundWithMeta = optimizedOutbound.map(trip => ({
                        ...trip,
                        direction: 'outbound',
                        directionLabel: '➡️ ALLER',
                        date: params.outboundDate,
                        transferStation: trip.type === 'transfer' && trip.legs?.length >= 2 
                            ? trip.legs[0].destination 
                            : null
                    }));

                    const returnWithMeta = optimizedReturn.map(trip => ({
                        ...trip,
                        direction: 'return',
                        directionLabel: '⬅️ RETOUR',
                        date: params.returnDate,
                        transferStation: trip.type === 'transfer' && trip.legs?.length >= 2 
                            ? trip.legs[0].destination 
                            : null
                    }));

                    const allTrips = [...outboundWithMeta, ...returnWithMeta];

                    return {
                        destIata,
                        data: {
                            iata: destIata,
                            name: outboundDest.name,
                            latitude: outboundDest.latitude,
                            longitude: outboundDest.longitude,
                            trips: allTrips,
                            tripCount: allTrips.length,
                            outboundCount: optimizedOutbound.length,
                            returnCount: optimizedReturn.length,
                            totalCombinations: optimizedOutbound.length * optimizedReturn.length
                        },
                        stats: { directRet, transferRet }
                    };
                })
            );

            // Filtrer les résultats valides et construire la Map
            processedResults.forEach(result => {
                if (result) {
                    validDestinations.set(result.destIata, result.data);
                    totalDirectReturns += result.stats.directRet;
                    totalTransferReturns += result.stats.transferRet;
                }
            });

            const processingDuration = (performance.now() - processingStartTime) / 1000;
            console.log(`✅ Traitement en ${processingDuration.toFixed(2)}s`);

            const totalDuration = (performance.now() - startTime) / 1000;
            console.log(`🎯 RÉSULTAT FINAL: ${validDestinations.size} destination(s) en ${totalDuration.toFixed(2)}s TOTAL`);
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
                    performanceMetrics: {
                        totalDuration: totalDuration.toFixed(2),
                        searchDuration: searchDuration.toFixed(2),
                        returnDuration: returnDuration.toFixed(2),
                        processingDuration: processingDuration.toFixed(2)
                    },
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

            window.ROUNDTRIP_DATA = transformedResults;
            window.ROUNDTRIP_PARAMS = params;

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
        console.log('🔄 Initialisation du gestionnaire aller-retour optimisé...');

        if (isRoundTripMode()) {
            console.log('✅ Mode aller-retour détecté');
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', performRoundTripSearch);
            } else {
                performRoundTripSearch();
            }
        } else {
            console.log('ℹ️ Mode aller simple - gestionnaire aller-retour inactif');
        }
    }

    init();

    // Export global pour debug
    window.RoundTripHandler = {
        isRoundTripMode,
        getRoundTripParams,
        performRoundTripSearch,
        optimizeTrips
    };

    console.log('✅ Gestionnaire aller-retour optimisé chargé (calculs parallèles)');

})();