// script.js
// Gère l'autocomplétion des gares - VERSION SANS SERVEUR
// Utilise directement STATIONS_SERVICE pour accéder aux données

// === UTILS ===
function showAlert(message) {
    console.error("ALERTE :", message);
    alert(message); 
}

// === API SUGGESTIONS (CLIENT-SIDE) ===
async function getSuggestions(input) {
    if (!input || input.length < 2) return [];
    
    // Vérifier que stations_service.js est chargé
    if (typeof STATIONS_SERVICE === 'undefined') {
        console.error('❌ STATIONS_SERVICE non disponible. Assurez-vous que stations_service.js est chargé AVANT script.js');
        return [];
    }
    
    try {
        return await STATIONS_SERVICE.getSuggestions(input);
    } catch (error) {
        console.error('Erreur lors de la récupération des suggestions:', error);
        return [];
    }
}

// === AFFICHAGE DES SUGGESTIONS ===
function showSuggestions(inputId, containerId) {
    const inputElement = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    
    if (!inputElement || !container) return; 

    async function updateSuggestions() {
        const value = inputElement.value.trim();
        let suggestions = await getSuggestions(value);

        container.innerHTML = "";
        
        // AJOUT : Suggestion "N'importe où" pour le champ Arrivée uniquement
        if (inputId === "destination-city" || inputId === "results-destination-city") {
            const anywhereDiv = document.createElement('div');
            anywhereDiv.className = "suggestion-item everywhere-option";
            anywhereDiv.setAttribute('data-name', "N'importe où");
            anywhereDiv.setAttribute('data-id', "ANYWHERE");
            anywhereDiv.setAttribute('data-anywhere', "true");
            anywhereDiv.innerHTML = `<strong>🌍 N'importe où</strong>`;
            container.appendChild(anywhereDiv);
        }

        if (suggestions.length === 0 && container.innerHTML === "") {
            container.classList.add("hidden");
            return;
        }
        
        // Ajout des suggestions classiques
        suggestions.forEach(station => {
            const stationId = station.sncf_id ? station.sncf_id.toUpperCase() : '';
            const item = document.createElement('div');
            item.className = "suggestion-item";
            item.setAttribute('data-name', station.name);
            item.setAttribute('data-id', stationId);
            item.setAttribute('data-lat', station.latitude || '');
            item.setAttribute('data-lon', station.longitude || '');
            
            let typeLabels = [];
            if (station.is_city === 't') typeLabels.push('Ville');
            if (station.sncf_is_enabled === 't') typeLabels.push('Gare');
            let suffix = typeLabels.length > 0 ? ` (${typeLabels.join(' / ')})` : '';
            
            item.innerHTML = `<strong>${station.name}${suffix}</strong>`;
            container.appendChild(item);
        });

        container.classList.remove("hidden");

        // Gestion du clic sur une suggestion
        container.querySelectorAll(".suggestion-item").forEach(div => {
            div.addEventListener("click", () => {
                inputElement.value = div.dataset.name;
                inputElement.dataset.id = div.dataset.id;
                inputElement.dataset.lat = div.dataset.lat || '';
                inputElement.dataset.lon = div.dataset.lon || '';
                inputElement.dataset.anywhere = (div.dataset.anywhere === "true") ? "true" : "false";
                container.classList.add("hidden");
            });
        });
    }
    
    inputElement.addEventListener("input", updateSuggestions);
    
    // Fermeture du conteneur au clic extérieur
    document.addEventListener("click", (e) => {
        if (!container.contains(e.target) && e.target !== inputElement) {
            container.classList.add("hidden");
        }
    });
}

// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
    // Vérification que stations_service.js est chargé
    if (typeof STATIONS_SERVICE === 'undefined') {
        console.error('❌ ERREUR CRITIQUE: stations_service.js doit être chargé AVANT script.js');
        console.error('📝 Ajoutez dans votre HTML:');
        console.error('   <script src="stations_service.js"></script>');
        console.error('   <script src="script.js"></script>');
        return;
    }

    console.log('✅ Initialisation de l\'autocomplétion (mode client-side)');
    
    // Initialisation pour la page index.html
    showSuggestions("departure-city", "departure-suggestions");
    showSuggestions("destination-city", "destination-suggestions");
    
    // Initialisation pour la page explorer.html
    showSuggestions("results-departure-city", "results-departure-suggestions");
    showSuggestions("results-destination-city", "results-destination-suggestions");
});