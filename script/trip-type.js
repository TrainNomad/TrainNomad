// =============================================
<<<<<<< HEAD
// Gestion du Dropdown Type de Trajet
=======
// Gestion du Dropdown Type de Trajet (Dynamique)
>>>>>>> e813469 (Fonction Aller/Retour)
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    const tripTypeBtn = document.getElementById('tripTypeBtn');
    const tripTypeMenu = document.getElementById('tripTypeMenu');
    const selectedTripTypeSpan = document.getElementById('selectedTripType');
    const tripTypeOptions = document.querySelectorAll('.trip-type-option');
    const returnDateWrapper = document.getElementById('return-date-wrapper');
    const departureDateInput = document.getElementById('departure-date');
    const returnDateInput = document.getElementById('return-date');
<<<<<<< HEAD
    
    let currentTripType = 'roundtrip'; // Par défaut : aller-retour

    // On cible l'élément <i> qui est à l'intérieur du bouton principal
    const mainButtonIcon = tripTypeBtn.querySelector('i');

    // Toggle du menu au clic sur le bouton
    tripTypeBtn.addEventListener('click', function(e) {
=======
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
>>>>>>> e813469 (Fonction Aller/Retour)
        e.stopPropagation();
        tripTypeMenu.classList.toggle('hidden');
        tripTypeBtn.classList.toggle('active');
    });

<<<<<<< HEAD
    // Sélection d'une option
    tripTypeOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const value = this.getAttribute('data-value');
            const text = this.textContent.trim();
            
            // Mise à jour du texte
            selectedTripTypeSpan.textContent = text;
            
            // Mise à jour de l'icône du bouton
            const optionIcon = this.querySelector('i');
            if (optionIcon && mainButtonIcon) {
                mainButtonIcon.className = optionIcon.className;
            }
            
            // Gestion des classes de sélection
            tripTypeOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            
            // Fermeture du menu
            tripTypeMenu.classList.add('hidden');
            tripTypeBtn.classList.remove('active');
            
            handleTripTypeChange(value);
        });
    });

    // Fermeture du menu au clic extérieur
    document.addEventListener('click', function(e) {
=======
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
>>>>>>> e813469 (Fonction Aller/Retour)
        if (!tripTypeBtn.contains(e.target) && !tripTypeMenu.contains(e.target)) {
            tripTypeMenu.classList.add('hidden');
            tripTypeBtn.classList.remove('active');
        }
    });

<<<<<<< HEAD
    // Fonction pour gérer le changement de type de trajet
    function handleTripTypeChange(type) {
        currentTripType = type;
        console.log('Type de trajet sélectionné:', type);
        
        if (type === 'roundtrip') {
            // Afficher le calendrier de retour
            returnDateWrapper.classList.remove('hidden');
            
            // S'assurer que la date de retour est au minimum égale à la date de départ
            if (departureDateInput.value && returnDateInput.value) {
                if (returnDateInput.value < departureDateInput.value) {
                    returnDateInput.value = departureDateInput.value;
                }
            }
        } else {
            // Masquer le calendrier de retour
            returnDateWrapper.classList.add('hidden');
            returnDateInput.value = ''; // Réinitialiser la date de retour
        }
    }

    // Événement sur le calendrier de départ pour mettre à jour le min du retour
    departureDateInput.addEventListener('change', function() {
        if (currentTripType === 'roundtrip') {
            // Définir la date minimum du calendrier de retour
            returnDateInput.min = this.value;
            
            // Si la date de retour est antérieure à la date de départ, l'ajuster
            if (returnDateInput.value && returnDateInput.value < this.value) {
                returnDateInput.value = this.value;
            }
        }
    });

    // Fonction pour obtenir le type de trajet actuel
=======
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
>>>>>>> e813469 (Fonction Aller/Retour)
    window.getTripType = function() {
        return currentTripType;
    };

<<<<<<< HEAD
    // Initialiser l'affichage au chargement (aller-retour par défaut)
    handleTripTypeChange(currentTripType);
=======
    // Lancement de la synchronisation au chargement
    syncUI(currentTripType);
>>>>>>> e813469 (Fonction Aller/Retour)
});