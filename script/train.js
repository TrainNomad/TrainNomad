// train.js - Version ADAPTÉE utilisant api_service.js
// Ce fichier gère UNIQUEMENT l'affichage des trajets spécifiques gare-à-gare

/**
 * RESPONSABILITÉS :
 * ✅ Mise en forme des horaires de trains
 * ✅ Calendrier 7 jours
 * ✅ Pagination
 * ✅ Filtres visuels
 * ❌ Récupération des données (délégué à api_service.js)
 */

// ==================== CONFIGURATION ====================

const DISPLAY_CONFIG = {
    ITEMS_PER_PAGE: 8,
    MAX_TRANSFERS: 1 
};

// Variables globales pour la pagination
let currentPage = 1;
let allJourneysData = [];

// ==================== PARAMÈTRES URL ====================

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        departureId: params.get('departure_id') || params.get('id'),
        departureName: params.get('departure_name') || params.get('name'),
        destinationId: params.get('destination_id'),
        destinationName: params.get('destination_name'),
        date: params.get('date')
    };
}

// ==================== FORMULAIRE DE RECHERCHE ====================

function fillSearchForm() {
    const params = getUrlParams();
    if (!params.departureId || !params.destinationId) return;

    const departureInput = document.getElementById('results-departure-city');
    const destinationInput = document.getElementById('results-destination-city');
    const dateInput = document.getElementById('results-departure-date');

    if (departureInput && params.departureName) {
        departureInput.value = params.departureName;
        departureInput.setAttribute('data-station-id', params.departureId);
    }
    if (destinationInput && params.destinationName) {
        destinationInput.value = params.destinationName;
        destinationInput.setAttribute('data-station-id', params.destinationId);
    }
    if (dateInput && params.date) {
        dateInput.value = params.date;
    }
}

function updateSearchAndRefresh() {
    const departureInput = document.getElementById('results-departure-city');
    const destinationInput = document.getElementById('results-destination-city');
    const dateInput = document.getElementById('results-departure-date');

    const depId = departureInput?.getAttribute('data-station-id');
    const depName = departureInput?.value;
    const destId = destinationInput?.getAttribute('data-station-id');
    const destName = destinationInput?.value;
    const date = dateInput?.value;

    if (!depId || !destId || !date) {
        console.log('❌ Données manquantes pour la recherche');
        return;
    }

    const newUrl = `${window.location.pathname}?departure_id=${encodeURIComponent(depId)}&departure_name=${encodeURIComponent(depName)}&destination_id=${encodeURIComponent(destId)}&destination_name=${encodeURIComponent(destName)}&date=${encodeURIComponent(date)}`;
    
    window.location.href = newUrl;
}

function setupSearchListeners() {
    const dateInput = document.getElementById('results-departure-date');
    
    if (dateInput) {
        dateInput.addEventListener('change', () => {
            updateSearchAndRefresh();
        });
    }
}

// ==================== LOGOS COMPAGNIES ====================

function getCompanyLogo(trip) {
    const entity = (trip.entity || '').toUpperCase();
    const axe = (trip.axe || '').toUpperCase();
    if (entity.startsWith('OUIGO')) return 'assets/Compagnie/ouigo.svg';
    if (axe.startsWith('IC')) return 'assets/Compagnie/intercite.png';
    return 'assets/Compagnie/inoui.svg';
}

// ==================== CRÉATION DES CARTES ====================

function createTripCard(journey) {
    const numTransfers = journey.trips.length - 1;
    const firstTrip = journey.trips[0];
    const lastTrip = journey.trips[journey.trips.length - 1];
    
    const startTime = firstTrip.heure_depart;
    const endTime = lastTrip.heure_arrivee;
    
    // Utilisation du service centralisé pour formater la durée
    const duration = window.TGVMaxAPI 
        ? window.TGVMaxAPI.formatDuration(journey.duration || 0)
        : '—';
    
    const companyLogo = getCompanyLogo(firstTrip);

    const departureStationName = firstTrip.origine || 'Chargement...';
    const arrivalStationName = lastTrip.destination || 'Chargement...';

    // Informations de correspondance
    let transferInfoHTML = '';
    if (numTransfers > 0) {
        const transferStations = [];
        for (let i = 0; i < journey.trips.length - 1; i++) {
            const currentTrip = journey.trips[i];
            const nextTrip = journey.trips[i + 1];
            const waitTime = window.TGVMaxAPI 
                ? window.TGVMaxAPI.calculateMinutesDiff(currentTrip.heure_arrivee, nextTrip.heure_depart)
                : 0;
            
            transferStations.push({
                name: currentTrip.destination || 'Chargement...',
                iata: currentTrip.destination_iata,
                waitTime: waitTime
            });
        }
        
        const transferText = transferStations.map((t, idx) => 
            `<span data-station-type="transfer-${idx}" data-transfer-iata="${t.iata}">${t.name}</span> (${t.waitTime} min)`
        ).join(', ');
        
        transferInfoHTML = `<div class="transfer-info-text">Via ${transferText}</div>`;
    }

    // Badge
    let badgeHTML = '';
    if (numTransfers === 0) {
        badgeHTML = '<div class="direct-badge">Direct</div>';
    } else {
        badgeHTML = `<div class="transfer-badge">${numTransfers} Corresp.</div>`;
    }

    // Data attributes pour les IATA
    let dataAttributes = `data-departure-iata="${firstTrip.origine_iata}" data-arrival-iata="${lastTrip.destination_iata}"`;
    for (let i = 0; i < journey.trips.length - 1; i++) {
        dataAttributes += ` data-transfer-${i}-iata="${journey.trips[i].destination_iata}"`;
    }

    // Détails étendus (timeline)
    let detailsHTML = '<div class="trip-details" style="display: none;"><div class="trip-timeline">';
    
    journey.trips.forEach((trip, index) => {
        const tripLogo = getCompanyLogo(trip);
        const tripDuration = window.TGVMaxAPI 
            ? window.TGVMaxAPI.formatDuration(
                window.TGVMaxAPI.calculateMinutesDiff(trip.heure_depart, trip.heure_arrivee)
              )
            : '—';
        
        // Étape de départ
        detailsHTML += `
            <div class="timeline-step">
                <div class="timeline-icon">🚂</div>
                <div class="timeline-content">
                    <div class="timeline-time">${trip.heure_depart}</div>
                    <div class="timeline-station" data-station-type="detail-departure-${index}">${trip.origine || 'Chargement...'}</div>
                    <div class="timeline-train-info">
                        <img src="${tripLogo}" alt="Logo" class="timeline-train-logo">
                        <span class="timeline-train-number">${trip.numero_train || trip.train_no || ''}</span>
                        <span class="timeline-duration">${tripDuration}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Correspondance
        if (index < journey.trips.length - 1) {
            const nextTrip = journey.trips[index + 1];
            const waitTime = window.TGVMaxAPI 
                ? window.TGVMaxAPI.calculateMinutesDiff(trip.heure_arrivee, nextTrip.heure_depart)
                : 0;
            
            detailsHTML += `
                <div class="timeline-step transfer-step">
                    <div class="timeline-icon">⏱️</div>
                    <div class="timeline-content">
                        <div class="timeline-time">${trip.heure_arrivee}</div>
                        <div class="timeline-station" data-station-type="detail-transfer-${index}">${trip.destination || 'Chargement...'}</div>
                        <div class="timeline-transfer-info">Correspondance: ${waitTime} min</div>
                    </div>
                </div>
            `;
        }
    });
    
    // Étape d'arrivée finale
    detailsHTML += `
        <div class="timeline-step">
            <div class="timeline-icon">📍</div>
            <div class="timeline-content">
                <div class="timeline-time">${lastTrip.heure_arrivee}</div>
                <div class="timeline-station" data-station-type="detail-arrival">${lastTrip.destination || 'Chargement...'}</div>
                <div class="timeline-destination">Votre destination</div>
            </div>
        </div>
    `;
    
    detailsHTML += '</div></div>';

    return `
        <div class="train-trip-card ${numTransfers > 0 ? 'transfer-mode' : ''}" ${dataAttributes}>
            <div class="train-trip-item">
                <div class="train-company-section">
                    <img src="${companyLogo}" alt="Logo" class="train-company-logo">
                    <span class="train-number">${firstTrip.numero_train || firstTrip.train_no || ''}</span>
                </div>
                
                <div class="train-time-section">
                    <div class="train-time-row">
                        <span class="train-time">${startTime}</span>
                        <span class="train-separator">—</span>
                        <span class="train-time">${endTime}</span>
                    </div>
                    <div class="train-station-row">
                        <span class="train-station" data-station-type="departure">${departureStationName}</span>
                        <span class="train-separator">→</span>
                        <span class="train-station" data-station-type="arrival">${arrivalStationName}</span>
                    </div>
                    ${transferInfoHTML}
                </div>
                
                <div class="train-duration-section">${duration}</div>
                
                <div class="train-status-section">
                    ${badgeHTML}
                </div>
            </div>
            ${detailsHTML}
        </div>
    `;
}


// train.js - PARTIE 2 - Calendrier, Pagination et Affichage

// ==================== CALENDRIER 7 JOURS ====================

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateDisplay(date) {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    return `${dayName} ${day}`;
}

function createCalendarContainer() {
    let calendarContainer = document.getElementById('week-calendar');
    if (!calendarContainer) {
        calendarContainer = document.createElement('div');
        calendarContainer.id = 'week-calendar';
        calendarContainer.className = 'week-calendar';
        
        const schedulesContainer = document.getElementById('schedules-container');
        if (schedulesContainer && schedulesContainer.parentNode) {
            schedulesContainer.parentNode.insertBefore(calendarContainer, schedulesContainer);
        }
    }
    return calendarContainer;
}

async function loadWeekCalendar() {
    const params = getUrlParams();
    if (!params.departureId || !params.destinationId || !params.date) return;

    // Vérification que api_service.js est chargé
    if (typeof window.TGVMaxAPI === 'undefined') {
        console.warn('⚠️ api_service.js non chargé, calendrier désactivé');
        return;
    }

    const calendarContainer = createCalendarContainer();

    const selectedDate = new Date(params.date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isToday = selectedDate.getTime() === today.getTime();
    
    const startOffset = isToday ? 0 : -1;
    const days = [];
    for (let i = startOffset; i < startOffset + 7; i++) {
        const date = new Date(selectedDate);
        date.setDate(selectedDate.getDate() + i);
        days.push(date);
    }

    calendarContainer.innerHTML = days.map(date => {
        const dateStr = formatDate(date);
        const isSelected = dateStr === params.date;
        return `
            <div class="calendar-day ${isSelected ? 'selected' : ''}" data-date="${dateStr}">
                <div class="day-name">${formatDateDisplay(date)}</div>
                <div class="day-count">
                    <div class="loading-spinner"></div>
                </div>
            </div>
        `;
    }).join('');

    // 🎯 Récupération des compteurs pour chaque jour AVEC OPTIMISATION
    const countPromises = days.map(async (date) => {
        const dateStr = formatDate(date);
        try {
            const searchParams = {
                departureId: params.departureId,
                destinationId: params.destinationId,
                date: dateStr
            };
            
            const searchOptions = {
                includeTransfers: true,
                maxTransferLevels: DISPLAY_CONFIG.MAX_TRANSFERS
            };
            
            const results = await window.TGVMaxAPI.searchJourneys(searchParams, searchOptions);
            
            // 🎯 Aplatir tous les trajets dans le même format que displaySchedules
            let allJourneys = [];
            results.destinationsMap.forEach(dest => {
                if (dest.iata === params.destinationId || !params.destinationId) {
                    dest.trips.forEach(trip => {
                        allJourneys.push({
                            trips: trip.legs,
                            duration: trip.duration,
                            type: trip.type
                        });
                    });
                }
            });
            
            // 🎯 APPLIQUER LA MÊME OPTIMISATION que displaySchedules
            const optimizedJourneys = optimizeJourneys(allJourneys);
            
            console.log(`📅 ${dateStr}: ${allJourneys.length} → ${optimizedJourneys.length} trajets optimisés`);
            
            return { date: dateStr, count: optimizedJourneys.length };
        } catch (error) {
            console.warn(`⚠️ Erreur calendrier pour ${dateStr}:`, error);
            return { date: dateStr, count: 0 };
        }
    });

    const results = await Promise.all(countPromises);
    
    results.forEach(({ date, count }) => {
        const dayElement = calendarContainer.querySelector(`[data-date="${date}"]`);
        if (dayElement) {
            const countElement = dayElement.querySelector('.day-count');
            countElement.innerHTML = count > 0 ? count : '-';
        }
    });

    // Gestion des clics
    calendarContainer.querySelectorAll('.calendar-day').forEach(dayEl => {
        dayEl.addEventListener('click', () => {
            const newDate = dayEl.getAttribute('data-date');
            const depId = params.departureId;
            const depName = params.departureName;
            const destId = params.destinationId;
            const destName = params.destinationName;
            
            const newUrl = `${window.location.pathname}?departure_id=${encodeURIComponent(depId)}&departure_name=${encodeURIComponent(depName)}&destination_id=${encodeURIComponent(destId)}&destination_name=${encodeURIComponent(destName)}&date=${encodeURIComponent(newDate)}`;
            window.location.href = newUrl;
        });
    });
}

// ==================== PAGINATION ====================

function setupLoadMoreButton() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (!loadMoreBtn) return;
    
    loadMoreBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        currentPage++;
        window.currentPage = currentPage;
        
        const startIndex = (currentPage - 1) * DISPLAY_CONFIG.ITEMS_PER_PAGE;
        const endIndex = startIndex + DISPLAY_CONFIG.ITEMS_PER_PAGE;
        const newJourneys = allJourneysData.slice(startIndex, endIndex);
        const remainingCount = allJourneysData.length - endIndex;
        
        // Ajouter les nouvelles cartes
        const newCardsHTML = newJourneys.map(j => createTripCard(j)).join('');
        const loadMoreContainer = document.querySelector('.load-more-container:last-of-type');
        
        if (loadMoreContainer) {
            // Bouton précédent si page 2
            if (currentPage === 2) {
                const firstCard = document.querySelector('.train-trip-card');
                if (firstCard) {
                    const previousVisible = Math.min(DISPLAY_CONFIG.ITEMS_PER_PAGE, startIndex);
                    const loadPreviousHTML = `
                        <div class="load-more-container load-previous-container">
                            <button class="load-more-btn" id="load-previous-btn">
                                Voir les trajets précédents
                                
                            </button>
                        </div>
                    `;
                    firstCard.insertAdjacentHTML('beforebegin', loadPreviousHTML);
                    setupLoadPreviousButton();
                }
            }
            
            loadMoreContainer.insertAdjacentHTML('beforebegin', newCardsHTML);
            
            // Mettre à jour ou supprimer le bouton suivant
            if (remainingCount > 0) {
                loadMoreBtn.innerHTML = `
                    Voir les ${Math.min(DISPLAY_CONFIG.ITEMS_PER_PAGE, remainingCount)} trajets suivants
                    <span class="load-more-count">(${endIndex}/${allJourneysData.length})</span>
                `;
            } else {
                loadMoreContainer.remove();
            }
            
            // Mettre à jour les noms de gares
            updateStationNames();
            
            // Appliquer les filtres
            if (typeof applyClientSideFilters === 'function') {
                setTimeout(() => applyClientSideFilters(), 50);
            }
            
            // Scroll
            setTimeout(() => {
                const cards = document.querySelectorAll('.train-trip-card');
                const firstNewCard = cards[startIndex];
                if (firstNewCard) {
                    firstNewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    });
}

function setupLoadPreviousButton() {
    const loadPreviousBtn = document.getElementById('load-previous-btn');
    if (!loadPreviousBtn) return;
    
    loadPreviousBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        if (typeof window.showPreviousTimeSlot === 'function') {
            window.showPreviousTimeSlot();
        }
    });
}

// ==================== AFFICHAGE PRINCIPAL ====================

async function displaySchedules() {
    const container = document.getElementById('schedules-container');
    if (!container) return;

    const params = getUrlParams();
    if (!params.departureId || !params.destinationId || !params.date) return;

    container.innerHTML = `<div class="loading">🔍 Recherche des trajets (Direct + ${DISPLAY_CONFIG.MAX_TRANSFERS} corresp.)...</div>`;

    try {
        const results = await window.TGVMaxAPI.searchJourneys({
            departureId: params.departureId,
            destinationId: params.destinationId,
            date: params.date
        }, {
            includeTransfers: true,
            maxTransferLevels: DISPLAY_CONFIG.MAX_TRANSFERS
        });

        // Aplatir tous les trajets trouvés
        let allJourneys = [];
        results.destinationsMap.forEach(dest => {
            if (dest.iata === params.destinationId || !params.destinationId) {
                dest.trips.forEach(trip => {
                    allJourneys.push({
                        trips: trip.legs,
                        duration: trip.duration,
                        type: trip.type
                    });
                });
            }
        });

        // 🎯 OPTIMISATION : ne garder qu'un trajet par heure de départ (le meilleur)
        allJourneys = optimizeJourneys(allJourneys);
        
        console.log(`✅ Optimisation: ${allJourneys.length} trajets uniques affichés`);

        // Tri par heure de départ (déjà fait dans optimizeJourneys, mais par sécurité)
        allJourneys.sort((a, b) => a.trips[0].heure_depart.localeCompare(b.trips[0].heure_depart));
        allJourneysData = allJourneys;

        if (allJourneys.length === 0) {
            container.innerHTML = `<div class="no-results">❌ Aucun trajet trouvé (même avec correspondances).</div>`;
            return;
        }

        // RENDU INITIAL
        const visibleJourneys = allJourneys.slice(0, DISPLAY_CONFIG.ITEMS_PER_PAGE);
        const tripsHTML = visibleJourneys.map(j => createTripCard(j)).join('');
        
        let html = `
            <div class="trips-list">
                ${tripsHTML}
            </div>
        `;

        if (allJourneys.length > DISPLAY_CONFIG.ITEMS_PER_PAGE) {
            html += `
                <div class="load-more-container">
                    <button id="load-more-btn" class="load-more-btn">
                        Voir les suivants (${DISPLAY_CONFIG.ITEMS_PER_PAGE}/${allJourneys.length})
                    </button>
                </div>`;
        }

        container.innerHTML = html;
        
        setupLoadMoreButton();
        updateStationNames(); 

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="error">Erreur lors du chargement : ${error.message}</div>`;
    }
}

// ==================== MISE À JOUR DES NOMS DE GARES ====================

async function updateStationNames() {
    if (typeof window.TGVMaxAPI === 'undefined') return;
    
    const allCards = document.querySelectorAll('.train-trip-card');
    
    const iataSet = new Set();
    allCards.forEach(card => {
        const depIata = card.getAttribute('data-departure-iata');
        const arrIata = card.getAttribute('data-arrival-iata');
        
        if (depIata) iataSet.add(depIata);
        if (arrIata) iataSet.add(arrIata);
        
        for (let i = 0; i < DISPLAY_CONFIG.MAX_TRANSFERS; i++) {
            const transIata = card.getAttribute(`data-transfer-${i}-iata`);
            if (transIata) iataSet.add(transIata);
        }
    });
    
    const stationPromises = Array.from(iataSet).map(iata => 
        window.TGVMaxAPI.fetchStationByIata(iata).then(data => ({ iata, data }))
    );
    
    const stationResults = await Promise.all(stationPromises);
    
    const stationNamesMap = new Map();
    stationResults.forEach(({ iata, data }) => {
        if (data && data.name) {
            stationNamesMap.set(iata, data.name);
        }
    });
    
    // Mise à jour des noms
    allCards.forEach(card => {
        const depIata = card.getAttribute('data-departure-iata');
        const arrIata = card.getAttribute('data-arrival-iata');
        
        if (depIata && stationNamesMap.has(depIata)) {
            const depStation = card.querySelector('[data-station-type="departure"]');
            if (depStation) depStation.textContent = stationNamesMap.get(depIata);
        }
        
        if (arrIata && stationNamesMap.has(arrIata)) {
            const arrStation = card.querySelector('[data-station-type="arrival"]');
            if (arrStation) arrStation.textContent = stationNamesMap.get(arrIata);
        }
        
        for (let i = 0; i < DISPLAY_CONFIG.MAX_TRANSFERS; i++) {
            const transIata = card.getAttribute(`data-transfer-${i}-iata`);
            if (transIata && stationNamesMap.has(transIata)) {
                const transStation = card.querySelector(`[data-station-type="transfer-${i}"]`);
                if (transStation) transStation.textContent = stationNamesMap.get(transIata);
            }
        }
    });
}

// ==================== GESTION DES CLICS ====================

function setupCardClickHandlers() {
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.train-trip-card');
        if (!card) return;
        
        if (e.target.closest('button') || e.target.closest('a')) return;
        
        const details = card.querySelector('.trip-details');
        if (!details) return;
        
        const isExpanded = details.style.display !== 'none';
        
        if (isExpanded) {
            details.style.display = 'none';
            card.classList.remove('expanded');
        } else {
            // Fermer les autres
            document.querySelectorAll('.train-trip-card').forEach(otherCard => {
                const otherDetails = otherCard.querySelector('.trip-details');
                if (otherDetails) {
                    otherDetails.style.display = 'none';
                    otherCard.classList.remove('expanded');
                }
            });
            
            details.style.display = 'block';
            card.classList.add('expanded');
        }
    });
}

// ==================== OPTIMISATION DES TRAJETS ====================

/**
 * Optimise la liste des trajets en :
 * 1. Regroupant par heure de départ
 * 2. Ne gardant que le plus rapide pour chaque départ
 * 3. Privilégiant les directs sur les correspondances à durée égale
 */
function optimizeJourneys(journeys) {
    const journeysByDeparture = new Map();
    
    journeys.forEach(journey => {
        const departureTime = journey.trips[0].heure_depart;
        
        if (!journeysByDeparture.has(departureTime)) {
            // Premier trajet pour cette heure de départ
            journeysByDeparture.set(departureTime, journey);
        } else {
            // Comparer avec le trajet existant
            const existingJourney = journeysByDeparture.get(departureTime);
            const shouldReplace = isBetterJourney(journey, existingJourney);
            
            if (shouldReplace) {
                journeysByDeparture.set(departureTime, journey);
            }
        }
    });
    
    // Convertir en array et trier par heure de départ
    return Array.from(journeysByDeparture.values())
        .sort((a, b) => a.trips[0].heure_depart.localeCompare(b.trips[0].heure_depart));
}

/**
 * Détermine si un trajet est meilleur qu'un autre
 * Priorité :
 * 1. Trajet direct vs correspondance
 * 2. Durée la plus courte
 */
function isBetterJourney(newJourney, existingJourney) {
    const newIsDirect = newJourney.trips.length === 1;
    const existingIsDirect = existingJourney.trips.length === 1;
    
    // Privilégier les directs
    if (newIsDirect && !existingIsDirect) {
        return true; // Le nouveau est direct, l'ancien non
    }
    if (!newIsDirect && existingIsDirect) {
        return false; // L'ancien est direct, on le garde
    }
    
    // Même type (direct/correspondance) : comparer la durée
    return newJourney.duration < existingJourney.duration;
}

// ==================== MODIFICATION DE displaySchedules ====================

async function displaySchedules() {
    const container = document.getElementById('schedules-container');
    if (!container) return;

    const params = getUrlParams();
    if (!params.departureId || !params.destinationId || !params.date) return;

    container.innerHTML = `<div class="loading">🔍 Recherche des trajets (Direct + ${DISPLAY_CONFIG.MAX_TRANSFERS} corresp.)...</div>`;

    try {
        const results = await window.TGVMaxAPI.searchJourneys({
            departureId: params.departureId,
            destinationId: params.destinationId,
            date: params.date
        }, {
            includeTransfers: true,
            maxTransferLevels: DISPLAY_CONFIG.MAX_TRANSFERS
        });

        // Aplatir tous les trajets trouvés
        let allJourneys = [];
        results.destinationsMap.forEach(dest => {
            if (dest.iata === params.destinationId || !params.destinationId) {
                dest.trips.forEach(trip => {
                    allJourneys.push({
                        trips: trip.legs,
                        duration: trip.duration,
                        type: trip.type
                    });
                });
            }
        });

        // 🎯 OPTIMISATION : ne garder qu'un trajet par heure de départ (le meilleur)
        allJourneys = optimizeJourneys(allJourneys);
        
        console.log(`✅ Optimisation: ${allJourneys.length} trajets uniques affichés`);

        // Tri par heure de départ (déjà fait dans optimizeJourneys, mais par sécurité)
        allJourneys.sort((a, b) => a.trips[0].heure_depart.localeCompare(b.trips[0].heure_depart));
        allJourneysData = allJourneys;

        if (allJourneys.length === 0) {
            container.innerHTML = `<div class="no-results">❌ Aucun trajet trouvé (même avec correspondances).</div>`;
            return;
        }

        // RENDU INITIAL
        const visibleJourneys = allJourneys.slice(0, DISPLAY_CONFIG.ITEMS_PER_PAGE);
        const tripsHTML = visibleJourneys.map(j => createTripCard(j)).join('');
        
        let html = `
            <div class="trips-list">
                ${tripsHTML}
            </div>
        `;

        if (allJourneys.length > DISPLAY_CONFIG.ITEMS_PER_PAGE) {
            html += `
                <div class="load-more-container">
                    <button id="load-more-btn" class="load-more-btn">
                        Voir les suivants 
                    </button>
                </div>`;
        }

        container.innerHTML = html;
        
        setupLoadMoreButton();
        updateStationNames(); 

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="error">Erreur lors du chargement : ${error.message}</div>`;
    }
}

// ==================== INITIALISATION ====================

document.addEventListener('DOMContentLoaded', () => {
    fillSearchForm();
    setupSearchListeners();
    setupCardClickHandlers();
    loadWeekCalendar();
    displaySchedules();
});

// Exports globaux pour compatibilité
window.allJourneysData = allJourneysData;
window.currentPage = currentPage;
window.ITEMS_PER_PAGE = DISPLAY_CONFIG.ITEMS_PER_PAGE;
