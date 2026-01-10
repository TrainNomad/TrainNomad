// search.js
// Gère la logique de recherche (validation et redirection)

// === CONFIGURATION ===
const SEARCH_BUTTON_ID_HOME = "search-btn";
const DEPARTURE_INPUT_ID_HOME = "departure-city";
const DESTINATION_INPUT_ID_HOME = "destination-city";
const DATE_INPUT_ID_HOME = "departure-date";

const SEARCH_BUTTON_ID_RESULTS = "results-search-btn";
const DEPARTURE_INPUT_ID_RESULTS = "results-departure-city";
const DESTINATION_INPUT_ID_RESULTS = "results-destination-city";
const DATE_INPUT_ID_RESULTS = "results-departure-date";

const isResultsPage = document.getElementById(SEARCH_BUTTON_ID_RESULTS);

const SEARCH_BUTTON_ID = isResultsPage ? SEARCH_BUTTON_ID_RESULTS : SEARCH_BUTTON_ID_HOME;
const DEPARTURE_INPUT_ID = isResultsPage ? DEPARTURE_INPUT_ID_RESULTS : DEPARTURE_INPUT_ID_HOME;
const DESTINATION_INPUT_ID = isResultsPage ? DESTINATION_INPUT_ID_RESULTS : DESTINATION_INPUT_ID_HOME;
const DATE_INPUT_ID = isResultsPage ? DATE_INPUT_ID_RESULTS : DATE_INPUT_ID_HOME;

// === INITIALISATION DE L'OPTION "N'IMPORTE OÙ" ===
function initializeAnywhereOption() {
    // const destinationInput = document.getElementById(DESTINATION_INPUT_ID);
    // if (!destinationInput) return;
    
    // // Définir "N'importe où" par défaut
    // destinationInput.value = "N'importe où";
    // destinationInput.dataset.id = "ANYWHERE";
    // destinationInput.dataset.anywhere = "true";
    
    // // Mettre à jour le placeholder si nécessaire
    // destinationInput.setAttribute('placeholder', "N'importe où");
}

// === FONCTION DE RECHERCHE ===
function performSearch(includeTransfers = false) {
    const departureInput = document.getElementById(DEPARTURE_INPUT_ID);
    const destinationInput = document.getElementById(DESTINATION_INPUT_ID);
    const dateInput = document.getElementById(DATE_INPUT_ID);
    
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

    // Validation Date
    if (!dateInput.value) {
        showAlert("Veuillez saisir une date.");
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

    // Paramètres d'URL
    const params = new URLSearchParams({
        id: departureId,
        name: departureName,
        date: dateValue,
        lat: departureInput.dataset.lat || '',
        lon: departureInput.dataset.lon || '',
        destination_id: destinationId,
        destination_name: destinationName,
        transfer: includeTransfers ? 'true' : 'false'
    });

    // Redirection selon le type de destination
    if (isAnywhere) {
        window.location.href = `results.html?${params.toString()}`;
    } else {
        window.location.href = `train.html?departure_id=${departureId}&departure_name=${encodeURIComponent(departureName)}&destination_id=${destinationId}&destination_name=${encodeURIComponent(destinationName)}&date=${dateValue}`;
    }
}

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
    
    // Créer le bouton de basculement s'il n'existe pas
    let toggleBtn = document.getElementById('toggle-transfer-btn');
    
    if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggle-transfer-btn';
        toggleBtn.className = 'toggle-transfer-btn';
        
        const searchContainer = document.querySelector('.search__main');
        if (searchContainer) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'search__toggle-container';
            buttonContainer.appendChild(toggleBtn);
            searchContainer.parentNode.insertBefore(buttonContainer, searchContainer.nextSibling);
        }
    }
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
    
    // Si l'utilisateur efface tout, on remet "N'importe où"
    // destinationInput.addEventListener('blur', () => {
    //     if (destinationInput.value.trim() === "") {
    //         destinationInput.value = "N'importe où";
    //         destinationInput.dataset.id = "ANYWHERE";
    //         destinationInput.dataset.anywhere = "true";
    //     }
    // });
}

// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
    initializeAnywhereOption();
    setupSearchButton();
    setupToggleButton();
    setupDestinationField();
});