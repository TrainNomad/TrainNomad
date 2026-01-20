// train.js - Version avec support ALLER-RETOUR
// Ce fichier gère l'affichage des trajets spécifiques gare-à-gare (aller simple ET aller-retour)

/**
 * RESPONSABILITÉS :
 * ✅ Mise en forme des horaires de trains
 * ✅ Calendrier 7 jours
 * ✅ Pagination
 * ✅ Filtres visuels
 * ✅ Gestion aller-retour avec affichage séparé
 * ❌ Récupération des données (délégué à api_service.js)
 */

// ==================== CONFIGURATION ====================

const DISPLAY_CONFIG = {
    ITEMS_PER_PAGE: 8,
    MAX_TRANSFERS: 1 
};

// Variables globales pour la pagination
let currentPage = 1;
let allOutboundJourneys = []; // Trajets ALLER
let allReturnJourneys = [];   // Trajets RETOUR
let isRoundTrip = false;       // Mode aller-retour activé

// ==================== PARAMÈTRES URL ====================

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const tripType = params.get('trip_type') || 'oneway';
    
    return {
        departureId: params.get('departure_id') || params.get('id'),
        departureName: params.get('departure_name') || params.get('name'),
        destinationId: params.get('destination_id'),
        destinationName: params.get('destination_name'),
        date: params.get('date'),
        returnDate: params.get('return_date'),
        tripType: tripType
    };
}

// ==================== FORMULAIRE DE RECHERCHE ====================

function fillSearchForm() {
    const params = getUrlParams();
    if (!params.departureId || !params.destinationId) return;

    const departureInput = document.getElementById('departure-city');
    const destinationInput = document.getElementById('destination-city');
    const dateInput = document.getElementById('departure-date');
    const returnDateInput = document.getElementById('return-date');

    if (departureInput && params.departureName) {
        departureInput.value = params.departureName;
        departureInput.setAttribute('data-id', params.departureId);
    }
    if (destinationInput && params.destinationName) {
        destinationInput.value = params.destinationName;
        destinationInput.setAttribute('data-id', params.destinationId);
    }
    if (dateInput && params.date) {
        dateInput.value = params.date;
    }
    if (returnDateInput && params.returnDate) {
        returnDateInput.value = params.returnDate;
    }
}

function updateSearchAndRefresh() {
    const departureInput = document.getElementById('departure-city');
    const destinationInput = document.getElementById('destination-city');
    const dateInput = document.getElementById('departure-date');
    const returnDateInput = document.getElementById('return-date');

    const depId = departureInput?.dataset.id;
    const depName = departureInput?.value;
    const destId = destinationInput?.dataset.id;
    const destName = destinationInput?.value;
    const date = dateInput?.value;
    const tripType = window.getTripType ? window.getTripType() : 'roundtrip';

    if (!depId || !destId || !date) {
        console.log('❌ Données manquantes pour la recherche');
        return;
    }

    let newUrl = `${window.location.pathname}?departure_id=${encodeURIComponent(depId)}&departure_name=${encodeURIComponent(depName)}&destination_id=${encodeURIComponent(destId)}&destination_name=${encodeURIComponent(destName)}&date=${encodeURIComponent(date)}&trip_type=${tripType}`;
    
    if (tripType === 'roundtrip' && returnDateInput?.value) {
        newUrl += `&return_date=${encodeURIComponent(returnDateInput.value)}`;
    }
    
    window.location.href = newUrl;
}

function setupSearchListeners() {
    const dateInput = document.getElementById('departure-date');
    const returnDateInput = document.getElementById('return-date');
    
    if (dateInput) {
        dateInput.addEventListener('change', () => {
            updateSearchAndRefresh();
        });
    }
    
    if (returnDateInput) {
        returnDateInput.addEventListener('change', () => {
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

function createTripCard(journey, direction = 'outbound') {
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
    let dataAttributes = `data-departure-iata="${firstTrip.origine_iata}" data-arrival-iata="${lastTrip.destination_iata}" data-direction="${direction}"`;
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
                <div class="timeline-time">${endTime}</div>
                <div class="timeline-station" data-station-type="arrival">${arrivalStationName}</div>
            </div>
        </div>
    `;
    
    detailsHTML += '</div></div>';

    // Structure de la carte
    return `
        <div class="train-trip-card" ${dataAttributes}>
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


            <!--<div class="train-trip-item">
                <div class="trip-times">
                    <div class="time-group">
                        <div class="time-large">${startTime}</div>
                        <div class="station-name" data-station-type="departure">${departureStationName}</div>
                    </div>
                    <div class="trip-middle">
                        <img src="${companyLogo}" alt="Logo" class="company-logo-small">
                        <div class="duration-text">${duration}</div>
                        ${badgeHTML}
                    </div>
                    <div class="time-group">
                        <div class="time-large">${endTime}</div>
                        <div class="station-name" data-station-type="arrival">${arrivalStationName}</div>
                    </div>
                </div>
                ${transferInfoHTML}
            </div>-->
            ${detailsHTML}
        </div>
    `;
}

// ==================== AFFICHAGE DES HORAIRES ====================

/**
 * Affiche les trajets en mode aller-retour avec deux sections séparées
 */
function displayRoundTripSchedules(outboundJourneys, returnJourneys) {
    const container = document.getElementById('schedules-container');
    if (!container) return;

    const params = getUrlParams();
    
    // Créer les cartes pour l'aller
    const outboundHTML = outboundJourneys.slice(0, DISPLAY_CONFIG.ITEMS_PER_PAGE)
        .map(j => createTripCard(j, 'outbound'))
        .join('');
    
    // Créer les cartes pour le retour
    const returnHTML = returnJourneys.slice(0, DISPLAY_CONFIG.ITEMS_PER_PAGE)
        .map(j => createTripCard(j, 'return'))
        .join('');

    // Structure HTML avec deux colonnes
    let html = `
        <div class="roundtrip-container">
            <div class="trip-section outbound-section">
                <div class="section-header">
                    <h2 class="section-title"><i class="fa-solid fa-arrow-right"></i>  ALLER</h2>
                    <p class="section-subtitle">${params.departureName} → ${params.destinationName}</p>
                    <p class="section-date">${formatDate(params.date)}</p>
                </div>
                <div class="trips-list">
                    ${outboundHTML || '<div class="no-results">Aucun trajet aller trouvé</div>'}
                </div>
                ${outboundJourneys.length > DISPLAY_CONFIG.ITEMS_PER_PAGE ? `
                    <div class="load-more-container">
                        <button class="load-more-btn" data-direction="outbound">
                            Voir plus de trajets aller
                        </button>
                    </div>
                ` : ''}
            </div>
            
            <div class="trip-section return-section">
                <div class="section-header">
                    <h2 class="section-title"><i class="fa-solid fa-arrow-left"></i> RETOUR</h2>
                    <p class="section-subtitle">${params.destinationName} → ${params.departureName}</p>
                    <p class="section-date">${formatDate(params.returnDate)}</p>
                </div>
                <div class="trips-list">
                    ${returnHTML || '<div class="no-results">Aucun trajet retour trouvé</div>'}
                </div>
                ${returnJourneys.length > DISPLAY_CONFIG.ITEMS_PER_PAGE ? `
                    <div class="load-more-container">
                        <button class="load-more-btn" data-direction="return">
                            Voir plus de trajets retour
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    container.innerHTML = html;
    
    setupLoadMoreButtons();
    updateStationNames();
}

/**
 * Affiche les trajets en mode aller simple (comportement original)
 */
function displayOneWaySchedules(journeys) {
    const container = document.getElementById('schedules-container');
    if (!container) return;

    const visibleJourneys = journeys.slice(0, DISPLAY_CONFIG.ITEMS_PER_PAGE);
    const tripsHTML = visibleJourneys.map(j => createTripCard(j, 'outbound')).join('');
    
    let html = `
        <div class="trips-list">
            ${tripsHTML}
        </div>
    `;

    if (journeys.length > DISPLAY_CONFIG.ITEMS_PER_PAGE) {
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
}

// ==================== PAGINATION ====================

let outboundPage = 1;
let returnPage = 1;

/**
 * Configuration des boutons "Voir plus" en mode aller-retour
 */
function setupLoadMoreButtons() {
    document.querySelectorAll('.load-more-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const direction = this.dataset.direction;
            
            if (direction === 'outbound') {
                outboundPage++;
                loadMoreTrips('outbound');
            } else if (direction === 'return') {
                returnPage++;
                loadMoreTrips('return');
            }
        });
    });
}

/**
 * Charge plus de trajets pour une direction spécifique
 */
function loadMoreTrips(direction) {
    const section = document.querySelector(`.${direction}-section .trips-list`);
    if (!section) return;
    
    const journeys = direction === 'outbound' ? allOutboundJourneys : allReturnJourneys;
    const page = direction === 'outbound' ? outboundPage : returnPage;
    
    const start = (page - 1) * DISPLAY_CONFIG.ITEMS_PER_PAGE;
    const end = start + DISPLAY_CONFIG.ITEMS_PER_PAGE;
    const newJourneys = journeys.slice(start, end);
    
    if (newJourneys.length === 0) return;
    
    const newHTML = newJourneys.map(j => createTripCard(j, direction)).join('');
    
    // Ajouter le bouton "Voir précédents" si on est en page 2
    if (page === 2) {
        const loadPreviousHTML = `
            <div class="load-more-container load-previous-container">
                <button class="load-more-btn load-previous-btn" data-direction="${direction}">
                    Voir les trajets précédents
                </button>
            </div>
        `;
        section.insertAdjacentHTML('afterbegin', loadPreviousHTML);
        setupLoadPreviousButtons();
    }
    
    section.insertAdjacentHTML('beforeend', newHTML);
    
    // Masquer le bouton si plus de résultats
    if (end >= journeys.length) {
        const btn = document.querySelector(`.${direction}-section .load-more-container:last-child .load-more-btn`);
        if (btn && !btn.classList.contains('load-previous-btn')) {
            btn.closest('.load-more-container').style.display = 'none';
        }
    }
    
    updateStationNames();
    
    // Appliquer les filtres si disponibles
    if (typeof applyClientSideFilters === 'function') {
        setTimeout(() => applyClientSideFilters(), 50);
    }
    
    // Scroll vers les nouveaux trajets
    setTimeout(() => {
        const cards = section.querySelectorAll('.train-trip-card');
        const firstNewCard = cards[start];
        if (firstNewCard) {
            firstNewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

/**
 * Configuration des boutons "Voir précédents"
 */
function setupLoadPreviousButtons() {
    document.querySelectorAll('.load-previous-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const direction = this.dataset.direction;
            
            if (direction === 'outbound' && outboundPage > 1) {
                outboundPage--;
                loadPreviousTrips('outbound');
            } else if (direction === 'return' && returnPage > 1) {
                returnPage--;
                loadPreviousTrips('return');
            }
        });
    });
}

/**
 * Charge les trajets précédents pour une direction spécifique
 */
function loadPreviousTrips(direction) {
    const section = document.querySelector(`.${direction}-section .trips-list`);
    if (!section) return;
    
    const journeys = direction === 'outbound' ? allOutboundJourneys : allReturnJourneys;
    const page = direction === 'outbound' ? outboundPage : returnPage;
    
    const start = (page - 1) * DISPLAY_CONFIG.ITEMS_PER_PAGE;
    const end = start + DISPLAY_CONFIG.ITEMS_PER_PAGE;
    const previousJourneys = journeys.slice(start, end);
    
    if (previousJourneys.length === 0) return;
    
    const newHTML = previousJourneys.map(j => createTripCard(j, direction)).join('');
    
    const loadPreviousContainer = section.parentNode.querySelector('.load-previous-container');
    
    if (loadPreviousContainer) {
        loadPreviousContainer.insertAdjacentHTML('afterend', newHTML);
        
        // Si on est revenu à la page 1, supprimer le bouton précédent
        if (page === 1) {
            loadPreviousContainer.remove();
        }
        
        // Réafficher le bouton "Voir plus" si nécessaire
        const loadMoreContainer = section.parentNode.querySelector('.load-more-container:last-child');
        if (loadMoreContainer && end < journeys.length) {
            loadMoreContainer.style.display = 'block';
        }
        
        updateStationNames();
        
        if (typeof applyClientSideFilters === 'function') {
            setTimeout(() => applyClientSideFilters(), 50);
        }
    }
}

/**
 * Configuration du bouton "Voir plus" en mode aller simple
 */
function setupLoadMoreButton() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (!loadMoreBtn) return;
    
    loadMoreBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        currentPage++;
        window.currentPage = currentPage;
        
        const startIndex = (currentPage - 1) * DISPLAY_CONFIG.ITEMS_PER_PAGE;
        const endIndex = startIndex + DISPLAY_CONFIG.ITEMS_PER_PAGE;
        const newJourneys = allOutboundJourneys.slice(startIndex, endIndex);
        const remainingCount = allOutboundJourneys.length - endIndex;
        
        // Ajouter les nouvelles cartes
        const newCardsHTML = newJourneys.map(j => createTripCard(j, 'outbound')).join('');
        const loadMoreContainer = document.querySelector('.load-more-container:last-of-type');
        
        if (loadMoreContainer) {
            // Bouton précédent si page 2
            if (currentPage === 2) {
                const firstCard = document.querySelector('.train-trip-card');
                if (firstCard) {
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
                    <span class="load-more-count">(${endIndex}/${allOutboundJourneys.length})</span>
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

/**
 * Configuration du bouton "Voir précédents" en mode aller simple
 */
function setupLoadPreviousButton() {
    const loadPreviousBtn = document.getElementById('load-previous-btn');
    if (!loadPreviousBtn) return;
    
    loadPreviousBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (currentPage > 1) {
            currentPage--;
            window.currentPage = currentPage;
            
            const startIndex = (currentPage - 1) * DISPLAY_CONFIG.ITEMS_PER_PAGE;
            const endIndex = startIndex + DISPLAY_CONFIG.ITEMS_PER_PAGE;
            const previousJourneys = allOutboundJourneys.slice(startIndex, endIndex);
            
            const newCardsHTML = previousJourneys.map(j => createTripCard(j, 'outbound')).join('');
            
            const loadPreviousContainer = document.querySelector('.load-previous-container');
            
            if (loadPreviousContainer) {
                loadPreviousContainer.insertAdjacentHTML('afterend', newCardsHTML);
                
                if (currentPage === 1) {
                    loadPreviousContainer.remove();
                }
                
                const loadMoreContainer = document.querySelector('.load-more-container:last-of-type');
                const loadMoreBtn = loadMoreContainer?.querySelector('#load-more-btn');
                
                if (loadMoreBtn && endIndex < allOutboundJourneys.length) {
                    const remainingCount = allOutboundJourneys.length - endIndex;
                    loadMoreBtn.innerHTML = `
                        Voir les ${Math.min(DISPLAY_CONFIG.ITEMS_PER_PAGE, remainingCount)} trajets suivants
                        <span class="load-more-count">(${endIndex}/${allOutboundJourneys.length})</span>
                    `;
                    if (loadMoreContainer) loadMoreContainer.style.display = 'block';
                }
                
                updateStationNames();
                
                if (typeof applyClientSideFilters === 'function') {
                    setTimeout(() => applyClientSideFilters(), 50);
                }
                
                setTimeout(() => {
                    const cards = document.querySelectorAll('.train-trip-card');
                    const firstCard = cards[startIndex];
                    if (firstCard) {
                        firstCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            }
        }
    });
}

// ==================== CALENDRIER 7 JOURS ====================

function formatDateCalendar(date) {
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

    // En mode aller-retour, afficher deux lignes de calendrier
    if (isRoundTrip && params.returnDate) {
        calendarContainer.innerHTML = `
            <div class="calendar-section outbound-calendar">
                <div class="calendar-header">➡️ Aller</div>
                <div class="calendar-days">
                    ${days.map(date => {
                        const dateStr = formatDateCalendar(date);
                        const isSelected = dateStr === params.date;
                        return `
                            <div class="calendar-day ${isSelected ? 'selected' : ''}" data-date="${dateStr}" data-direction="outbound">
                                <div class="day-name">${formatDateDisplay(date)}</div>
                                <div class="day-count">
                                    <div class="loading-spinner"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            <div class="calendar-section return-calendar">
                <div class="calendar-header">⬅️ Retour</div>
                <div class="calendar-days">
                    ${days.map(date => {
                        const dateStr = formatDateCalendar(date);
                        const isSelected = dateStr === params.returnDate;
                        return `
                            <div class="calendar-day ${isSelected ? 'selected' : ''}" data-date="${dateStr}" data-direction="return">
                                <div class="day-name">${formatDateDisplay(date)}</div>
                                <div class="day-count">
                                    <div class="loading-spinner"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

<<<<<<< HEAD
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
        e.stopPropagation(); // Empêcher la propagation
        
        // Décrémenter la page
        if (currentPage > 1) {
            currentPage--;
            window.currentPage = currentPage;
            
            // Recalculer les indices
            const startIndex = (currentPage - 1) * DISPLAY_CONFIG.ITEMS_PER_PAGE;
            const endIndex = startIndex + DISPLAY_CONFIG.ITEMS_PER_PAGE;
            const previousJourneys = allJourneysData.slice(startIndex, endIndex);
            
            // Créer les nouvelles cartes
            const newCardsHTML = previousJourneys.map(j => createTripCard(j)).join('');
            
            // Trouver le conteneur du bouton précédent
            const loadPreviousContainer = document.querySelector('.load-previous-container');
            
            if (loadPreviousContainer) {
                // Insérer les cartes après le bouton précédent
                loadPreviousContainer.insertAdjacentHTML('afterend', newCardsHTML);
                
                // Si on est revenu à la page 1, supprimer le bouton précédent
                if (currentPage === 1) {
                    loadPreviousContainer.remove();
                }
                
                // Mettre à jour le bouton suivant
                const loadMoreContainer = document.querySelector('.load-more-container:not(.load-previous-container)');
                const loadMoreBtn = document.getElementById('load-more-btn');
                const remainingCount = allJourneysData.length - endIndex;
                
                if (loadMoreBtn && remainingCount > 0) {
                    loadMoreBtn.innerHTML = `
                        Voir les ${Math.min(DISPLAY_CONFIG.ITEMS_PER_PAGE, remainingCount)} trajets suivants
                        <span class="load-more-count">(${endIndex}/${allJourneysData.length})</span>
                    `;
                }
                
                // Mettre à jour les noms de gares
                updateStationNames();
                
                // Appliquer les filtres
                if (typeof applyClientSideFilters === 'function') {
                    setTimeout(() => applyClientSideFilters(), 50);
                }
                
                // Scroll vers le premier trajet ajouté
                setTimeout(() => {
                    const cards = document.querySelectorAll('.train-trip-card');
                    const firstNewCard = cards[startIndex];
                    if (firstNewCard) {
                        firstNewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            }
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
=======
        // Récupération des compteurs pour l'ALLER
        const outboundCountPromises = days.map(async (date) => {
            const dateStr = formatDateCalendar(date);
            try {
                const results = await window.TGVMaxAPI.searchJourneys({
                    departureId: params.departureId,
                    destinationId: params.destinationId,
                    date: dateStr
                }, {
                    includeTransfers: true,
                    maxTransferLevels: DISPLAY_CONFIG.MAX_TRANSFERS
>>>>>>> e813469 (Fonction Aller/Retour)
                });
                
                let allJourneys = [];
                results.destinationsMap.forEach(dest => {
                    if (dest.iata === params.destinationId) {
                        dest.trips.forEach(trip => {
                            allJourneys.push({
                                trips: trip.legs,
                                duration: trip.duration,
                                type: trip.type
                            });
                        });
                    }
                });
                
                const optimizedJourneys = optimizeJourneys(allJourneys);
                return { date: dateStr, count: optimizedJourneys.length, direction: 'outbound' };
            } catch (error) {
                console.warn(`⚠️ Erreur calendrier aller ${dateStr}:`, error);
                return { date: dateStr, count: 0, direction: 'outbound' };
            }
        });

        // Récupération des compteurs pour le RETOUR
        const returnCountPromises = days.map(async (date) => {
            const dateStr = formatDateCalendar(date);
            try {
                const results = await window.TGVMaxAPI.searchJourneys({
                    departureId: params.destinationId,  // Inversé
                    destinationId: params.departureId,  // Inversé
                    date: dateStr
                }, {
                    includeTransfers: true,
                    maxTransferLevels: DISPLAY_CONFIG.MAX_TRANSFERS
                });
                
                let allJourneys = [];
                results.destinationsMap.forEach(dest => {
                    if (dest.iata === params.departureId) {
                        dest.trips.forEach(trip => {
                            allJourneys.push({
                                trips: trip.legs,
                                duration: trip.duration,
                                type: trip.type
                            });
                        });
                    }
                });
                
                const optimizedJourneys = optimizeJourneys(allJourneys);
                return { date: dateStr, count: optimizedJourneys.length, direction: 'return' };
            } catch (error) {
                console.warn(`⚠️ Erreur calendrier retour ${dateStr}:`, error);
                return { date: dateStr, count: 0, direction: 'return' };
            }
        });

        // Attendre tous les résultats
        const allResults = await Promise.all([...outboundCountPromises, ...returnCountPromises]);
        
        allResults.forEach(({ date, count, direction }) => {
            const dayElement = calendarContainer.querySelector(`[data-date="${date}"][data-direction="${direction}"]`);
            if (dayElement) {
                const countElement = dayElement.querySelector('.day-count');
                countElement.innerHTML = count > 0 ? count : '-';
            }
        });

        // Gestion des clics - ALLER
        calendarContainer.querySelectorAll('.outbound-calendar .calendar-day').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                const newDate = dayEl.getAttribute('data-date');
                const newUrl = `${window.location.pathname}?departure_id=${encodeURIComponent(params.departureId)}&departure_name=${encodeURIComponent(params.departureName)}&destination_id=${encodeURIComponent(params.destinationId)}&destination_name=${encodeURIComponent(params.destinationName)}&date=${encodeURIComponent(newDate)}&return_date=${encodeURIComponent(params.returnDate)}&trip_type=roundtrip`;
                window.location.href = newUrl;
            });
        });

        // Gestion des clics - RETOUR
        calendarContainer.querySelectorAll('.return-calendar .calendar-day').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                const newDate = dayEl.getAttribute('data-date');
                const newUrl = `${window.location.pathname}?departure_id=${encodeURIComponent(params.departureId)}&departure_name=${encodeURIComponent(params.departureName)}&destination_id=${encodeURIComponent(params.destinationId)}&destination_name=${encodeURIComponent(params.destinationName)}&date=${encodeURIComponent(params.date)}&return_date=${encodeURIComponent(newDate)}&trip_type=roundtrip`;
                window.location.href = newUrl;
            });
        });

    } else {
        // Mode ALLER SIMPLE (calendrier classique)
        calendarContainer.innerHTML = days.map(date => {
            const dateStr = formatDateCalendar(date);
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

        // Récupération des compteurs pour chaque jour avec optimisation
        const countPromises = days.map(async (date) => {
            const dateStr = formatDateCalendar(date);
            try {
                const results = await window.TGVMaxAPI.searchJourneys({
                    departureId: params.departureId,
                    destinationId: params.destinationId,
                    date: dateStr
                }, {
                    includeTransfers: true,
                    maxTransferLevels: DISPLAY_CONFIG.MAX_TRANSFERS
                });
                
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
                const newUrl = `${window.location.pathname}?departure_id=${encodeURIComponent(params.departureId)}&departure_name=${encodeURIComponent(params.departureName)}&destination_id=${encodeURIComponent(params.destinationId)}&destination_name=${encodeURIComponent(params.destinationName)}&date=${encodeURIComponent(newDate)}&trip_type=oneway`;
                window.location.href = newUrl;
            });
        });
    }
}

// ==================== MISE À JOUR DES NOMS DE GARES ====================

function updateStationNames() {
    if (!window.StationsService) return;
    
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
    
    const iataArray = Array.from(iataSet);
    
    if (iataArray.length === 0) return;
    
    const stationNamesMap = new Map();
    const promises = iataArray.map(iata => {
        return window.StationsService.getStationInfo(iata)
            .then(info => {
                if (info && info.name) {
                    stationNamesMap.set(iata, info.name);
                }
            })
            .catch(err => {
                console.warn(`Erreur récupération nom station ${iata}:`, err);
            });
    });
    
    Promise.all(promises).then(() => {
        if (stationNamesMap.size === 0) {
            console.warn('Aucun nom de station récupéré');
            return;
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
            // Fermer les autres cartes dans la même section
            const section = card.closest('.trip-section');
            if (section) {
                section.querySelectorAll('.train-trip-card').forEach(otherCard => {
                    const otherDetails = otherCard.querySelector('.trip-details');
                    if (otherDetails && otherCard !== card) {
                        otherDetails.style.display = 'none';
                        otherCard.classList.remove('expanded');
                    }
                });
            } else {
                // Mode aller simple : fermer toutes les autres cartes
                document.querySelectorAll('.train-trip-card').forEach(otherCard => {
                    const otherDetails = otherCard.querySelector('.trip-details');
                    if (otherDetails && otherCard !== card) {
                        otherDetails.style.display = 'none';
                        otherCard.classList.remove('expanded');
                    }
                });
            }
            
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

// ==================== UTILITAIRES ====================

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
}

// ==================== RECHERCHE DES TRAJETS ====================

async function displaySchedules() {
    const container = document.getElementById('schedules-container');
    if (!container) return;

    const params = getUrlParams();
    if (!params.departureId || !params.destinationId || !params.date) return;

    // Vérifier si mode aller-retour
    isRoundTrip = (params.tripType === 'roundtrip' && params.returnDate);

    if (isRoundTrip) {
        console.log('🔄 Mode ALLER-RETOUR détecté');
        container.innerHTML = `<div class="loading">🔍 Recherche des trajets aller et retour...</div>`;
        
        try {
            // Recherche ALLER
            console.log('➡️ Recherche trajets ALLER...');
            const outboundResults = await window.TGVMaxAPI.searchJourneys({
                departureId: params.departureId,
                destinationId: params.destinationId,
                date: params.date
            }, {
                includeTransfers: true,
                maxTransferLevels: DISPLAY_CONFIG.MAX_TRANSFERS
            });

            // Aplatir les trajets aller
            let outboundJourneys = [];
            outboundResults.destinationsMap.forEach(dest => {
                if (dest.iata === params.destinationId) {
                    dest.trips.forEach(trip => {
                        outboundJourneys.push({
                            trips: trip.legs,
                            duration: trip.duration,
                            type: trip.type
                        });
                    });
                }
            });

            outboundJourneys = optimizeJourneys(outboundJourneys);
            console.log(`✅ ${outboundJourneys.length} trajets aller optimisés`);

            // Recherche RETOUR
            console.log('⬅️ Recherche trajets RETOUR...');
            const returnResults = await window.TGVMaxAPI.searchJourneys({
                departureId: params.destinationId,  // Depuis la destination
                destinationId: params.departureId,  // Vers le départ
                date: params.returnDate
            }, {
                includeTransfers: true,
                maxTransferLevels: DISPLAY_CONFIG.MAX_TRANSFERS
            });

            // Aplatir les trajets retour
            let returnJourneys = [];
            returnResults.destinationsMap.forEach(dest => {
                if (dest.iata === params.departureId) {
                    dest.trips.forEach(trip => {
                        returnJourneys.push({
                            trips: trip.legs,
                            duration: trip.duration,
                            type: trip.type
                        });
                    });
                }
            });

            returnJourneys = optimizeJourneys(returnJourneys);
            console.log(`✅ ${returnJourneys.length} trajets retour optimisés`);

            // Stocker les trajets
            allOutboundJourneys = outboundJourneys;
            allReturnJourneys = returnJourneys;

            // Afficher les résultats
            if (outboundJourneys.length === 0 && returnJourneys.length === 0) {
                container.innerHTML = `<div class="no-results">❌ Aucun trajet aller-retour trouvé.</div>`;
                return;
            }

            displayRoundTripSchedules(outboundJourneys, returnJourneys);

        } catch (error) {
            console.error('❌ Erreur recherche aller-retour:', error);
            container.innerHTML = `<div class="error">Erreur lors du chargement : ${error.message}</div>`;
        }
    } else {
        // Mode ALLER SIMPLE (comportement original)
        console.log('➡️ Mode ALLER SIMPLE');
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

            // Optimisation
            allJourneys = optimizeJourneys(allJourneys);
            console.log(`✅ ${allJourneys.length} trajets uniques affichés`);

            allOutboundJourneys = allJourneys;

            if (allJourneys.length === 0) {
                container.innerHTML = `<div class="no-results">❌ Aucun trajet trouvé (même avec correspondances).</div>`;
                return;
            }

            displayOneWaySchedules(allJourneys);

        } catch (error) {
            console.error('❌ Erreur recherche:', error);
            container.innerHTML = `<div class="error">Erreur lors du chargement : ${error.message}</div>`;
        }
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
window.allOutboundJourneys = allOutboundJourneys;
window.allReturnJourneys = allReturnJourneys;
window.currentPage = currentPage;
window.ITEMS_PER_PAGE = DISPLAY_CONFIG.ITEMS_PER_PAGE;