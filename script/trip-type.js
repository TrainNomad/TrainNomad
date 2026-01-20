// =============================================
// Gestion du Dropdown Type de Trajet (Dynamique)
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    const tripTypeBtn = document.getElementById('tripTypeBtn');
    const tripTypeMenu = document.getElementById('tripTypeMenu');
    const selectedTripTypeSpan = document.getElementById('selectedTripType');
    const tripTypeOptions = document.querySelectorAll('.trip-type-option');
    const returnDateWrapper = document.getElementById('return-date-wrapper');
    const departureDateInput = document.getElementById('departure-date');
    const returnDateInput = document.getElementById('return-date');
    const mainButtonIcon = tripTypeBtn.querySelector('i');

    /**
     * 1. DÉTERMINATION DU TYPE DE TRAJET INITIAL
     * On regarde d'abord l'URL, puis le HTML (classe selected), sinon par défaut roundtrip
     */
    const urlParams = new URLSearchParams(window.location.search);
    const tripTypeFromUrl = urlParams.get('trip_type');
    
    let currentTripType = 'roundtrip'; // Valeur de repli
    
    if (tripTypeFromUrl === 'oneway' || tripTypeFromUrl === 'roundtrip') {
        currentTripType = tripTypeFromUrl;
    } else {
        const initialOption = document.querySelector('.trip-type-option.selected');
        if (initialOption) {
            currentTripType = initialOption.getAttribute('data-value');
        }
    }

    /**
     * 2. MISE À JOUR VISUELLE INITIALE
     */
    function syncUI(type) {
        const targetOption = document.querySelector(`.trip-type-option[data-value="${type}"]`);
        if (targetOption) {
            // Update texte et icône
            selectedTripTypeSpan.textContent = targetOption.textContent.trim();
            const optionIcon = targetOption.querySelector('i');
            if (optionIcon && mainButtonIcon) {
                mainButtonIcon.className = optionIcon.className;
            }
            // Update classes
            tripTypeOptions.forEach(opt => opt.classList.remove('selected'));
            targetOption.classList.add('selected');
        }
        handleTripTypeChange(type);
    }

    /**
     * 3. GESTION DU CHANGEMENT (Affichage champs date)
     */
    function handleTripTypeChange(type) {
        currentTripType = type;
        if (type === 'roundtrip') {
            if (returnDateWrapper) returnDateWrapper.classList.remove('hidden');
            if (departureDateInput && departureDateInput.value) {
                returnDateInput.min = departureDateInput.value;
            }
        } else {
            if (returnDateWrapper) returnDateWrapper.classList.add('hidden');
            if (returnDateInput) returnDateInput.value = ''; 
        }
    }

    /**
     * 4. ÉVÉNEMENTS
     */
    tripTypeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        tripTypeMenu.classList.toggle('hidden');
        tripTypeBtn.classList.toggle('active');
    });

    tripTypeOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            const value = this.getAttribute('data-value');
            syncUI(value);
            tripTypeMenu.classList.add('hidden');
            tripTypeBtn.classList.remove('active');
        });
    });

    document.addEventListener('click', (e) => {
        if (!tripTypeBtn.contains(e.target) && !tripTypeMenu.contains(e.target)) {
            tripTypeMenu.classList.add('hidden');
            tripTypeBtn.classList.remove('active');
        }
    });

    if (departureDateInput) {
        departureDateInput.addEventListener('change', function() {
            if (currentTripType === 'roundtrip' && returnDateInput) {
                returnDateInput.min = this.value;
                if (returnDateInput.value && returnDateInput.value < this.value) {
                    returnDateInput.value = this.value;
                }
            }
        });
    }

    // Exportation pour search.js
    window.getTripType = function() {
        return currentTripType;
    };

    // Lancement de la synchronisation au chargement
    syncUI(currentTripType);
});