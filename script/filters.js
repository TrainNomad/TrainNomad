// filters.js - Gestion des filtres optimisée avec recherche automatique

// Ajouter le style .hidden si nécessaire
if (!document.querySelector('style#filter-styles')) {
    const style = document.createElement('style');
    style.id = 'filter-styles';
    style.textContent = `
        .hidden {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
}

// État du filtre (sauvegardé dans localStorage)
const filterState = {
    stops: ['direct', '1'],  // Par défaut: direct et 1 correspondance
    departureTime: 'all',     // Par défaut: toutes les heures
    timeWindowStart: 0,       // Heure de début de la fenêtre affichée
    maxDuration: 'all'        // Par défaut: toutes les durées
};

// Charger l'état du filtre depuis localStorage
function loadFilterState() {
    const saved = localStorage.getItem('trainFilterStops');
    if (saved) {
        try {
            filterState.stops = JSON.parse(saved);
            console.log('Filtres chargés:', filterState.stops);
        } catch (e) {
            console.error('Erreur chargement filtre:', e);
        }
    }
    
    const savedTime = localStorage.getItem('trainFilterTime');
    if (savedTime) {
        filterState.departureTime = savedTime;
        console.log('Heure chargée:', filterState.departureTime);
    }
    
    const savedDuration = localStorage.getItem('trainFilterDuration');
    if (savedDuration) {
        filterState.maxDuration = savedDuration;
        console.log('Durée chargée:', filterState.maxDuration);
    }
}

// Sauvegarder l'état du filtre dans localStorage
function saveFilterState() {
    localStorage.setItem('trainFilterStops', JSON.stringify(filterState.stops));
    localStorage.setItem('trainFilterTime', filterState.departureTime);
    localStorage.setItem('trainFilterDuration', filterState.maxDuration);
    console.log('Filtres sauvegardés:', filterState.stops, 'Heure:', filterState.departureTime, 'Durée:', filterState.maxDuration);
}

// Initialisation des filtres
function initFilters() {
    console.log('Initialisation des filtres...');
    loadFilterState();
    setupFilterDropdowns();
    setupFilterListeners();
    setupTimeSelect();
    setupDurationSelect();
    updateFiltersUI();
    
    setTimeout(() => {
        applyClientSideFilters();
    }, 500);
}

// Configuration du select d'heure
function setupTimeSelect() {
    const selectElement = document.getElementById('start-hour-select');
    const labelElement = document.getElementById('selected-hour-label');
    
    if (!selectElement || !labelElement) return;
    
    // Initialiser le label
    updateHourLabel();
    
    selectElement.addEventListener('change', () => {
        const value = selectElement.value;
        filterState.departureTime = value;
        filterState.timeWindowStart = value === 'all' ? 0 : parseInt(value);
        
        updateHourLabel();
        saveFilterState();
        
        // Fermer le dropdown
        const dropdown = document.getElementById('time-filter-dropdown');
        const button = document.getElementById('time-filter-btn');
        if (dropdown) {
            dropdown.classList.add('hidden');
            dropdown.style.display = 'none';
        }
        if (button) button.classList.remove('active');
        
        // Déclencher la recherche automatique
        triggerAutoSearch();
    });
}

// Mettre à jour le label de l'heure sélectionnée
function updateHourLabel() {
    const labelElement = document.getElementById('selected-hour-label');
    const selectElement = document.getElementById('start-hour-select');
    
    if (!labelElement || !selectElement) return;
    
    if (filterState.departureTime === 'all') {
        labelElement.textContent = 'Toute la journée';
    } else {
        const hour = parseInt(filterState.departureTime);
        labelElement.textContent = `À partir de : ${String(hour).padStart(2, '0')}h`;
    }
}

// Configuration du select de durée
function setupDurationSelect() {
    const selectElement = document.getElementById('duration-select');
    const labelElement = document.getElementById('selected-duration-label');
    
    if (!selectElement || !labelElement) return;
    
    // Initialiser le label
    updateDurationLabel();
    
    selectElement.addEventListener('change', () => {
        const value = selectElement.value;
        filterState.maxDuration = value;
        
        updateDurationLabel();
        saveFilterState();
        
        // Fermer le dropdown
        const dropdown = document.getElementById('duration-filter-dropdown');
        const button = document.getElementById('duration-filter-btn');
        if (dropdown) {
            dropdown.classList.add('hidden');
            dropdown.style.display = 'none';
        }
        if (button) button.classList.remove('active');
        
        // Déclencher la recherche automatique
        triggerAutoSearch();
    });
}

// Mettre à jour le label de la durée sélectionnée
function updateDurationLabel() {
    const labelElement = document.getElementById('selected-duration-label');
    const selectElement = document.getElementById('duration-select');
    
    if (!labelElement || !selectElement) return;
    
    if (filterState.maxDuration === 'all') {
        labelElement.textContent = 'Toutes durées';
    } else {
        const hours = parseInt(filterState.maxDuration);
        labelElement.textContent = `Max ${hours}h`;
    }
}

// Gestion des dropdowns
function setupFilterDropdowns() {
    console.log('Setup des dropdowns...');
    
    // Dropdown correspondances
    const stopsButton = document.getElementById('stops-filter-btn');
    const stopsDropdown = document.getElementById('stops-filter-dropdown');
    
    if (stopsButton && stopsDropdown) {
        console.log('✓ Bouton et dropdown correspondances trouvés');
        
        stopsButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const isHidden = stopsDropdown.classList.contains('hidden');
            
            const timeDropdown = document.getElementById('time-filter-dropdown');
            if (timeDropdown) {
                timeDropdown.classList.add('hidden');
                timeDropdown.style.display = 'none';
            }
            const timeButton = document.getElementById('time-filter-btn');
            if (timeButton) timeButton.classList.remove('active');
            
            const durationDropdown = document.getElementById('duration-filter-dropdown');
            if (durationDropdown) {
                durationDropdown.classList.add('hidden');
                durationDropdown.style.display = 'none';
            }
            const durationButton = document.getElementById('duration-filter-btn');
            if (durationButton) durationButton.classList.remove('active');
            
            if (isHidden) {
                stopsDropdown.classList.remove('hidden');
                stopsDropdown.style.display = 'block';
                stopsButton.classList.add('active');
            } else {
                stopsDropdown.classList.add('hidden');
                stopsDropdown.style.display = 'none';
                stopsButton.classList.remove('active');
            }
        });
        
        stopsDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // Dropdown horaires
    const timeButton = document.getElementById('time-filter-btn');
    const timeDropdown = document.getElementById('time-filter-dropdown');
    
    if (timeButton && timeDropdown) {
        console.log('✓ Bouton et dropdown horaires trouvés');
        
        timeButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const isHidden = timeDropdown.classList.contains('hidden');
            
            if (stopsDropdown) {
                stopsDropdown.classList.add('hidden');
                stopsDropdown.style.display = 'none';
            }
            if (stopsButton) stopsButton.classList.remove('active');
            
            const durationDropdown = document.getElementById('duration-filter-dropdown');
            if (durationDropdown) {
                durationDropdown.classList.add('hidden');
                durationDropdown.style.display = 'none';
            }
            const durationButton = document.getElementById('duration-filter-btn');
            if (durationButton) durationButton.classList.remove('active');
            
            if (isHidden) {
                timeDropdown.classList.remove('hidden');
                timeDropdown.style.display = 'block';
                timeButton.classList.add('active');
            } else {
                timeDropdown.classList.add('hidden');
                timeDropdown.style.display = 'none';
                timeButton.classList.remove('active');
            }
        });
        
        timeDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // Dropdown durée
    const durationButton = document.getElementById('duration-filter-btn');
    const durationDropdown = document.getElementById('duration-filter-dropdown');
    
    if (durationButton && durationDropdown) {
        console.log('✓ Bouton et dropdown durée trouvés');
        
        durationButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const isHidden = durationDropdown.classList.contains('hidden');
            
            if (stopsDropdown) {
                stopsDropdown.classList.add('hidden');
                stopsDropdown.style.display = 'none';
            }
            if (stopsButton) stopsButton.classList.remove('active');
            
            if (timeDropdown) {
                timeDropdown.classList.add('hidden');
                timeDropdown.style.display = 'none';
            }
            if (timeButton) timeButton.classList.remove('active');
            
            if (isHidden) {
                durationDropdown.classList.remove('hidden');
                durationDropdown.style.display = 'block';
                durationButton.classList.add('active');
            } else {
                durationDropdown.classList.add('hidden');
                durationDropdown.style.display = 'none';
                durationButton.classList.remove('active');
            }
        });
        
        durationDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // Fermer en cliquant ailleurs
    document.addEventListener('click', function(e) {
        if (stopsDropdown && !stopsDropdown.classList.contains('hidden') && 
            stopsButton && !stopsButton.contains(e.target) && !stopsDropdown.contains(e.target)) {
            stopsDropdown.classList.add('hidden');
            stopsDropdown.style.display = 'none';
            stopsButton.classList.remove('active');
        }
        
        if (timeDropdown && !timeDropdown.classList.contains('hidden') && 
            timeButton && !timeButton.contains(e.target) && !timeDropdown.contains(e.target)) {
            timeDropdown.classList.add('hidden');
            timeDropdown.style.display = 'none';
            timeButton.classList.remove('active');
        }
        
        if (durationDropdown && !durationDropdown.classList.contains('hidden') && 
            durationButton && !durationButton.contains(e.target) && !durationDropdown.contains(e.target)) {
            durationDropdown.classList.add('hidden');
            durationDropdown.style.display = 'none';
            durationButton.classList.remove('active');
        }
    });
}

// Configuration des écouteurs de filtres
function setupFilterListeners() {
    console.log('Setup des listeners...');
    
    // Filtre Correspondances
    document.querySelectorAll('input[name="stops-filter"]').forEach(input => {
        input.addEventListener('change', () => {
            const previousStops = [...filterState.stops];
            filterState.stops = Array.from(
                document.querySelectorAll('input[name="stops-filter"]:checked')
            ).map(cb => cb.value);
            
            console.log('Filtres changés:', filterState.stops);
            saveFilterState();
            
            // Fermer le dropdown
            const dropdown = document.getElementById('stops-filter-dropdown');
            const button = document.getElementById('stops-filter-btn');
            if (dropdown) {
                dropdown.classList.add('hidden');
                dropdown.style.display = 'none';
            }
            if (button) button.classList.remove('active');
            
            // ✅ Déclencher la recherche automatique (simule le clic sur RECHERCHER)
            triggerAutoSearch();
        });
    });
}

// Obtenir le nombre max de correspondances depuis les filtres sélectionnés
function getMaxTransfersFromStops(stops) {
    const numericStops = stops
        .filter(s => s !== 'direct')
        .map(s => parseInt(s) || 0);
    
    return numericStops.length > 0 ? Math.max(...numericStops) : 0;
}

// ✅ Nouvelle fonction : Déclencher la recherche automatique
function triggerAutoSearch() {
    console.log('🔄 Déclenchement recherche automatique...');
    
    // Simuler le clic sur le bouton de recherche pour relancer toute la recherche
    const searchButton = document.getElementById('results-search-btn');
    if (searchButton) {
        console.log('🔘 Clic automatique sur le bouton RECHERCHER');
        searchButton.click();
    } else {
        // Fallback : appliquer les filtres côté client si le bouton n'existe pas
        console.log('⚠️ Bouton recherche non trouvé, filtrage côté client');
        applyClientSideFilters();
    }
}

// ✅ Filtrage pour les cartes de Train.html
function filterTrainCard(card) {
    let visible = true;
    
    // Filtre par nombre de correspondances
    const badge = card.querySelector('.direct-badge, .transfer-badge');
    let numTransfers = 0;
    
    if (badge) {
        if (badge.classList.contains('direct-badge')) {
            numTransfers = 0;
        } else {
            const text = badge.textContent;
            numTransfers = parseInt(text.match(/\d+/)?.[0] || '0');
        }
    }
    
    // Vérifier si ce trajet correspond aux filtres de correspondances
    let matchesStops = false;
    if (filterState.stops.includes('direct') && numTransfers === 0) matchesStops = true;
    if (filterState.stops.includes('1') && numTransfers <= 1) matchesStops = true;
    if (filterState.stops.includes('2') && numTransfers <= 2) matchesStops = true;
    
    if (!matchesStops) visible = false;
    
    // Filtre par heure de départ (gérer "all")
    if (visible && filterState.departureTime !== 'all') {
        const timeText = card.querySelector('.train-time')?.textContent || '';
        const hour = parseInt(timeText.split(':')[0]);
        
        if (isNaN(hour)) {
            visible = false;
        } else {
            const selectedHour = parseInt(filterState.departureTime);
            if (hour < selectedHour) visible = false;
        }
    }
    
    // Filtre par durée de trajet (gérer "all")
    if (visible && filterState.maxDuration !== 'all') {
        const durationText = card.querySelector('.train-duration-section')?.textContent || '';
        const match = durationText.match(/(\d+)h(\d+)/);
        
        if (match) {
            const hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const totalMinutes = hours * 60 + minutes;
            const maxMinutes = parseInt(filterState.maxDuration) * 60;
            
            if (totalMinutes > maxMinutes) visible = false;
        }
    }
    
    return visible;
}

// ✅ Filtrage pour les cartes de explorer.html
function filterResultCard(card) {
    let visible = true;
    
    const tripButtons = card.querySelectorAll('.result__car-hour-buton');
    const tripRows = card.querySelectorAll('.trip-row');
    
    const trips = tripButtons.length > 0 ? tripButtons : tripRows;
    
    if (trips.length === 0) return visible;
    
    let hasVisibleTrip = false;
    
    trips.forEach(trip => {
        let tripVisible = true;
        
        // Récupérer le type de trajet
        let isDirect = false;
        
        if (trip.classList.contains('result__car-hour-buton')) {
            const badge = trip.querySelector('.badge-direct, .badge-transfer');
            isDirect = badge && badge.classList.contains('badge-direct');
        } else if (trip.classList.contains('trip-row')) {
            const badge = trip.querySelector('span[style*="border-radius"]');
            isDirect = badge && badge.textContent.includes('DIRECT');
        }
        
        // Filtre par type de correspondances
        if (!filterState.stops.includes('direct') && isDirect) {
            tripVisible = false;
        }
        if (!filterState.stops.includes('1') && !isDirect) {
            tripVisible = false;
        }
        
        // Filtre par heure de départ (gérer "all")
        if (tripVisible && filterState.departureTime !== 'all') {
            let timeText = '';
            
            if (trip.classList.contains('result__car-hour-buton')) {
                timeText = trip.querySelector('p')?.textContent || '';
            } else if (trip.classList.contains('trip-row')) {
                const span = trip.querySelector('span[style*="font-weight"]');
                timeText = span ? span.textContent.split('➜')[0].trim() : '';
            }
            
            const hour = parseInt(timeText.split(':')[0]);
            
            if (!isNaN(hour) && hour < parseInt(filterState.departureTime)) {
                tripVisible = false;
            }
        }
        
        // Filtre par durée (gérer "all")
        if (tripVisible && filterState.maxDuration !== 'all') {
            const durationSpan = card.querySelector('.result__min-duration');
            if (durationSpan) {
                const durationText = durationSpan.textContent;
                const match = durationText.match(/(\d+)h(\d+)/);
                
                if (match) {
                    const hours = parseInt(match[1]);
                    const minutes = parseInt(match[2]);
                    const totalMinutes = hours * 60 + minutes;
                    const maxMinutes = parseInt(filterState.maxDuration) * 60;
                    
                    if (totalMinutes > maxMinutes) {
                        tripVisible = false;
                    }
                }
            }
        }
        
        trip.style.display = tripVisible ? '' : 'none';
        if (tripVisible) hasVisibleTrip = true;
    });
    
    return hasVisibleTrip;
}

// Fonction pour changer l'heure du filtre vers les trajets précédents
function showPreviousTimeSlot() {
    if (filterState.departureTime === 'all') {
        filterState.departureTime = '22';
        filterState.timeWindowStart = 22;
    } else {
        const currentHour = parseInt(filterState.departureTime);
        const selectElement = document.getElementById('start-hour-select');
        if (!selectElement) return;
        
        const options = Array.from(selectElement.options)
            .map(opt => opt.value)
            .filter(v => v !== 'all')
            .map(v => parseInt(v));
        const previousHour = options.filter(h => h < currentHour).pop();
        
        if (previousHour !== undefined) {
            filterState.departureTime = previousHour.toString();
            filterState.timeWindowStart = previousHour;
        } else {
            filterState.departureTime = 'all';
            filterState.timeWindowStart = 0;
        }
        
        if (filterState.departureTime !== 'all' && selectElement) {
            selectElement.value = filterState.departureTime;
        }
    }
    
    updateHourLabel();
    saveFilterState();
    applyClientSideFilters();
    updateLoadPreviousButtonVisibility();
}

// Vérifier s'il y a des trajets avant l'heure actuelle du filtre
function hasEarlierTrips() {
    if (!window.allJourneysData || window.allJourneysData.length === 0) return false;
    if (filterState.departureTime === 'all') return false;
    
    const currentHour = parseInt(filterState.departureTime);
    return window.allJourneysData.some(journey => {
        const timeStr = journey.trips[0].heure_depart;
        const hour = parseInt(timeStr.split(':')[0]);
        return hour < currentHour;
    });
}

// Mettre à jour la visibilité du bouton "Voir précédents"
function updateLoadPreviousButtonVisibility() {
    const loadPreviousContainer = document.querySelector('.load-previous-container');
    if (!loadPreviousContainer) return;
    
    if (hasEarlierTrips()) {
        loadPreviousContainer.style.display = 'flex';
    } else {
        loadPreviousContainer.style.display = 'none';
    }
}

// Rechargement des données avec nouvelle configuration
function reloadDataWithNewConfig() {
    console.log("🔄 Rechargement via clic sur le bouton RECHERCHER...");
    
    // Simuler le clic sur le bouton de recherche
    const searchButton = document.getElementById('results-search-btn');
    if (searchButton) {
        searchButton.click();
    } else {
        // Fallback : appeler les fonctions de chargement directement
        console.log("⚠️ Bouton non trouvé, rechargement direct...");
        
        if (typeof displaySchedules === 'function') {
            displaySchedules();
        } else if (typeof fetchAndDisplayTransferResults === 'function') {
            fetchAndDisplayTransferResults();
        } else if (typeof fetchAndDisplayResults === 'function') {
            fetchAndDisplayResults();
        }
    }
}

// ✅ Application des filtres côté client (CORRIGÉ)
function applyClientSideFilters() {
    // Détecter le type de cartes (Train.html vs explorer.html)
    const trainCards = document.querySelectorAll('.train-trip-card');
    const resultCards = document.querySelectorAll('.result__card-placeholder');
    
    let visibleCount = 0;
    
    // Pour Train.html - filtrer les cartes entières
    trainCards.forEach(card => {
        let isVisible = true;

        // 1. Filtre par type (Direct/Transfert)
        const hasTransfer = card.querySelector('.transfer-badge');
        
        if (!filterState.stops.includes('direct') && !hasTransfer) isVisible = false;
        if (!filterState.stops.includes('1') && hasTransfer) isVisible = false;

        // 2. Filtre par heure (gérer "all")
        if (isVisible && filterState.departureTime !== 'all') {
            const timeText = card.querySelector('.train-time')?.textContent || "";
            const hour = parseInt(timeText.split(':')[0]);
            if (!isNaN(hour) && hour < parseInt(filterState.departureTime)) isVisible = false;
        }

        // 3. Filtre par durée (gérer "all")
        if (isVisible && filterState.maxDuration !== 'all') {
            const durationText = card.querySelector('.train-duration-section')?.textContent || "";
            const match = durationText.match(/(\d+)h(\d+)/);
            
            if (match) {
                const hours = parseInt(match[1]);
                const minutes = parseInt(match[2]);
                const totalMinutes = hours * 60 + minutes;
                const maxMinutes = parseInt(filterState.maxDuration) * 60;
                
                if (totalMinutes > maxMinutes) isVisible = false;
            }
        }

        card.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
    });
    
    // Pour explorer.html - filtrer les trajets DANS les cartes (pas les cartes elles-mêmes)
    resultCards.forEach(card => {
        const tripButtons = card.querySelectorAll('.result__car-hour-buton');
        const tripRows = card.querySelectorAll('.trip-row');
        const trips = tripButtons.length > 0 ? tripButtons : tripRows;
        
        if (trips.length === 0) {
            // Pas de trajets individuels, filtrer la carte entière
            let isVisible = true;
            
            const hasTransfer = card.querySelector('.badge-transfer') || 
                               (card.textContent.includes('correspondance') || card.textContent.includes('CORRESPONDANCE'));
            
            if (!filterState.stops.includes('direct') && !hasTransfer) isVisible = false;
            if (!filterState.stops.includes('1') && hasTransfer) isVisible = false;
            
            card.style.display = isVisible ? '' : 'none';
            if (isVisible) visibleCount++;
            return;
        }
        
        // Filtrer les trajets individuels
        let hasVisibleTrip = false;
        
        trips.forEach(trip => {
            let tripVisible = true;
            
            // Type de trajet
            let isDirect = false;
            if (trip.classList.contains('result__car-hour-buton')) {
                const badge = trip.querySelector('.badge-direct, .badge-transfer');
                isDirect = badge && badge.classList.contains('badge-direct');
            } else if (trip.classList.contains('trip-row')) {
                const badge = trip.querySelector('span[style*="border-radius"]');
                isDirect = badge && badge.textContent.includes('DIRECT');
            }
            
            // Filtre par type
            if (!filterState.stops.includes('direct') && isDirect) tripVisible = false;
            if (!filterState.stops.includes('1') && !isDirect) tripVisible = false;
            
            // Filtre par heure (gérer "all")
            if (tripVisible && filterState.departureTime !== 'all') {
                let timeText = '';
                
                if (trip.classList.contains('result__car-hour-buton')) {
                    timeText = trip.querySelector('p')?.textContent || '';
                } else if (trip.classList.contains('trip-row')) {
                    const span = trip.querySelector('span[style*="font-weight"]');
                    timeText = span ? span.textContent.split('➜')[0].trim() : '';
                }
                
                const hour = parseInt(timeText.split(':')[0]);
                if (!isNaN(hour) && hour < parseInt(filterState.departureTime)) {
                    tripVisible = false;
                }
            }
            
            // Filtre par durée (gérer "all")
            if (tripVisible && filterState.maxDuration !== 'all') {
                const durationSpan = card.querySelector('.result__min-duration');
                if (durationSpan) {
                    const durationText = durationSpan.textContent;
                    const match = durationText.match(/(\d+)h(\d+)/);
                    
                    if (match) {
                        const hours = parseInt(match[1]);
                        const minutes = parseInt(match[2]);
                        const totalMinutes = hours * 60 + minutes;
                        const maxMinutes = parseInt(filterState.maxDuration) * 60;
                        
                        if (totalMinutes > maxMinutes) {
                            tripVisible = false;
                        }
                    }
                }
            }
            
            // Afficher/masquer le trajet individuel
            trip.style.display = tripVisible ? '' : 'none';
            if (tripVisible) hasVisibleTrip = true;
        });
        
        // Toujours afficher la carte, même si certains trajets sont masqués
        card.style.display = '';
        
        // Ajouter un message si tous les trajets sont masqués
        if (!hasVisibleTrip) {
            let noTripsMsg = card.querySelector('.no-trips-message');
            if (!noTripsMsg) {
                noTripsMsg = document.createElement('div');
                noTripsMsg.className = 'no-trips-message';
                noTripsMsg.style.cssText = 'padding: 15px; text-align: center; color: #999; font-style: italic;';
                noTripsMsg.textContent = 'Aucun trajet ne correspond aux filtres sélectionnés';
                
                const detailsContainer = card.querySelector('.result__card-details');
                if (detailsContainer) {
                    detailsContainer.appendChild(noTripsMsg);
                }
            }
            noTripsMsg.style.display = 'block';
        } else {
            const noTripsMsg = card.querySelector('.no-trips-message');
            if (noTripsMsg) {
                noTripsMsg.style.display = 'none';
            }
            visibleCount++;
        }
    });

    const debug = document.getElementById('filter-debug');
    if (debug) debug.textContent = `Filtres: ${visibleCount} destination(s) avec trajets visibles`;
    
    console.log(`✅ Filtrage appliqué: ${visibleCount} cartes avec trajets visibles`);
}

// Mise à jour du compteur de résultats
function updateResultsCounter(visible, total) {
    let counterElement = document.querySelector('.trip-count');
    
    if (!counterElement) {
        const header = document.querySelector('.section-header, .results-header');
        if (header) {
            counterElement = document.createElement('div');
            counterElement.className = 'trip-count';
            header.appendChild(counterElement);
        }
    }
    
    if (counterElement) {
        counterElement.textContent = `${total} option(s) trouvée(s)`;
    }
}

// Mise à jour intelligente du bouton "Voir plus"
function updateLoadMoreButtonSmart(visibleInDOM, totalJourneys) {
    const loadMoreContainer = document.querySelector('.load-more-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    if (!loadMoreContainer || !loadMoreBtn) return;
    
    if (totalJourneys <= 8) {
        loadMoreContainer.style.display = 'none';
    } else if (visibleInDOM >= totalJourneys) {
        loadMoreContainer.style.display = 'none';
    } else {
        loadMoreContainer.style.display = 'flex';
        
        const remaining = totalJourneys - visibleInDOM;
        const toShow = Math.min(8, remaining);
        
        loadMoreBtn.innerHTML = `
            Voir les ${toShow} trajets suivants
            <span class="load-more-count">(${visibleInDOM}/${totalJourneys})</span>
        `;
    }
}

// Mise à jour de l'interface des filtres selon l'état actuel
function updateFiltersUI() {
    console.log('Mise à jour UI des filtres...');
    
    document.querySelectorAll('input[name="stops-filter"]').forEach(cb => {
        cb.checked = filterState.stops.includes(cb.value);
    });
    
    const selectElement = document.getElementById('start-hour-select');
    if (selectElement) {
        selectElement.value = filterState.departureTime;
    }
    
    const durationSelect = document.getElementById('duration-select');
    if (durationSelect) {
        durationSelect.value = filterState.maxDuration;
    }
    
    updateHourLabel();
    updateDurationLabel();
}

// Initialiser au chargement de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFilters);
} else {
    initFilters();
}

// Export pour utilisation dans d'autres scripts
window.filterState = filterState;
window.applyClientSideFilters = applyClientSideFilters;
window.showPreviousTimeSlot = showPreviousTimeSlot;
window.updateLoadPreviousButtonVisibility = updateLoadPreviousButtonVisibility;
window.getMaxTransfersFromStops = getMaxTransfersFromStops;