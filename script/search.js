// search.js
// Gère la logique de recherche (validation et redirection)

// === CONFIGURATION ===
const SEARCH_BUTTON_ID_HOME = "search-btn";
const DEPARTURE_INPUT_ID_HOME = "departure-city";
const DESTINATION_INPUT_ID_HOME = "destination-city";
const DATE_INPUT_ID_HOME = "departure-date";
const RETURN_DATE_INPUT_ID_HOME = "return-date";

const SEARCH_BUTTON_ID_RESULTS = "results-search-btn";
const DEPARTURE_INPUT_ID_RESULTS = "results-departure-city";
const DESTINATION_INPUT_ID_RESULTS = "results-destination-city";
const DATE_INPUT_ID_RESULTS = "results-departure-date";
const RETURN_DATE_INPUT_ID_RESULTS = "results-return-date";

const isResultsPage = document.getElementById(SEARCH_BUTTON_ID_RESULTS);

const SEARCH_BUTTON_ID = isResultsPage ? SEARCH_BUTTON_ID_RESULTS : SEARCH_BUTTON_ID_HOME;
const DEPARTURE_INPUT_ID = isResultsPage ? DEPARTURE_INPUT_ID_RESULTS : DEPARTURE_INPUT_ID_HOME;
const DESTINATION_INPUT_ID = isResultsPage ? DESTINATION_INPUT_ID_RESULTS : DESTINATION_INPUT_ID_HOME;
const DATE_INPUT_ID = isResultsPage ? DATE_INPUT_ID_RESULTS : DATE_INPUT_ID_HOME;
const RETURN_DATE_INPUT_ID = isResultsPage ? RETURN_DATE_INPUT_ID_RESULTS : RETURN_DATE_INPUT_ID_HOME;

// === FONCTION DE RECHERCHE ===
async function performSearch(includeTransfers = false) {
    const departureInput = document.getElementById(DEPARTURE_INPUT_ID);
    const destinationInput = document.getElementById(DESTINATION_INPUT_ID);
    const dateInput = document.getElementById(DATE_INPUT_ID);
    const returnDateInput = document.getElementById(RETURN_DATE_INPUT_ID);
    
    // Validation Départ
    if (!departureInput.value.trim() || !departureInput.dataset.id) {
        showAlert("Veuillez sélectionner une gare de départ dans la liste.");
        return;
    }

    // Validation Arrivée (Bloque si vide)
    if (!destinationInput.value.trim()) {
        showAlert("Veuillez sélectionner une destination ou l'option 'N'importe où'.");
        return;
    }

    // Validation Date aller
    if (!dateInput.value) {
        showAlert("Veuillez saisir une date de départ.");
        return;
    }

    const departureId = departureInput.dataset.id;
    const departureName = departureInput.value.trim();
    const dateValue = dateInput.value;
    
    // Logique de destination
    let destinationId = destinationInput.dataset.id;
    let destinationName = destinationInput.value.trim();
    let isAnywhere = (destinationInput.dataset.anywhere === "true");

    // Si l'utilisateur a tapé "N'importe où" à la main sans cliquer, on valide quand même
    if (destinationName.toLowerCase() === "n'importe où") {
        destinationId = "ANYWHERE";
        isAnywhere = true;
    }

    // Récupération du type de trajet (aller simple ou aller-retour)
    const tripType = window.getTripType ? window.getTripType() : 'roundtrip';
    console.log('🎫 Type de trajet:', tripType);

    // Validation date de retour pour aller-retour
    let returnDateValue = null;
    if (tripType === 'roundtrip') {
        if (!returnDateInput || !returnDateInput.value) {
            showAlert("Veuillez saisir une date de retour pour un trajet aller-retour.");
            return;
        }
        returnDateValue = returnDateInput.value;
        
        // Vérifier que la date de retour est après la date d'aller
        if (returnDateValue < dateValue) {
            showAlert("La date de retour doit être postérieure ou égale à la date de départ.");
            return;
        }
    }

    // Paramètres d'URL
    const params = new URLSearchParams({
        id: departureId,
        name: departureName,
        date: dateValue,
        lat: departureInput.dataset.lat || '',
        lon: departureInput.dataset.lon || '',
        destination_id: destinationId,
        destination_name: destinationName,
        transfer: includeTransfers ? 'true' : 'false',
        trip_type: tripType
    });

    // Ajouter la date de retour si aller-retour
    if (tripType === 'roundtrip' && returnDateValue) {
        params.append('return_date', returnDateValue);
    }

    // Redirection selon le type de destination
    if (isAnywhere) {
        window.location.href = `results.html?${params.toString()}`;
    } else {
        // Pour un trajet spécifique, on redirige vers train.html
        let trainUrl = `train.html?departure_id=${departureId}&departure_name=${encodeURIComponent(departureName)}&destination_id=${destinationId}&destination_name=${encodeURIComponent(destinationName)}&date=${dateValue}&trip_type=${tripType}`;
        
        if (tripType === 'roundtrip' && returnDateValue) {
            trainUrl += `&return_date=${returnDateValue}`;
        }
        
        window.location.href = trainUrl;
    }
}

// === RECHERCHE DE TRAJET RETOUR ===
/**
 * Recherche un trajet retour (destination -> origine)
 * @param {string} destinationId - Code IATA de la destination (devient l'origine du retour)
 * @param {string} departureId - Code IATA du départ (devient la destination du retour)
 * @param {string} returnDate - Date du retour
 * @param {Object} options - Options de recherche
 * @returns {Promise<Object>} Résultats de la recherche retour
 */
async function searchReturnJourney(destinationId, departureId, returnDate, options = {}) {
    if (!window.TGVMaxAPI) {
        console.error('❌ TGVMaxAPI non disponible');
        return null;
    }

    console.log(`🔄 Recherche trajet retour: ${destinationId} -> ${departureId} le ${returnDate}`);

    try {
        const returnResults = await window.TGVMaxAPI.searchJourneysWithStations({
            departureId: destinationId,  // La destination devient le départ
            destinationId: departureId,  // Le départ devient la destination
            date: returnDate
        }, {
            includeTransfers: options.includeTransfers || false,
            maxTransferLevels: options.maxTransferLevels || 1
        });

        console.log('✅ Résultats trajet retour:', returnResults);
        return returnResults;

    } catch (error) {
        console.error('❌ Erreur recherche trajet retour:', error);
        return null;
    }
}

// Exposition globale pour utilisation dans d'autres scripts
window.searchReturnJourney = searchReturnJourney;

// === BOUTON DE RECHERCHE ===
function setupSearchButton() {
    const btn = document.getElementById(SEARCH_BUTTON_ID);
    if (!btn) return;
    
    btn.addEventListener("click", (e) => {
        e.preventDefault();
        performSearch(false); // Recherche directe par défaut
    });
}

// === BOUTON DE BASCULEMENT (POUR LA PAGE RESULTS) ===
function setupToggleButton() {
    if (!isResultsPage) return;
    
    const params = new URLSearchParams(window.location.search);
    const isTransferMode = params.get('transfer') === 'true';
}

// === GESTION DES ÉVÉNEMENTS DU CHAMP DESTINATION ===
function setupDestinationField() {
    const destinationInput = document.getElementById(DESTINATION_INPUT_ID);
    if (!destinationInput) return;
    
    // Quand l'utilisateur commence à taper, on enlève le marqueur "anywhere"
    destinationInput.addEventListener('input', () => {
        if (destinationInput.value.trim() !== "N'importe où") {
            destinationInput.dataset.anywhere = "false";
        }
    });
}

// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
    setupSearchButton();
    setupToggleButton();
    setupDestinationField();
    
    console.log('✅ Search.js initialisé avec support aller-retour');
});