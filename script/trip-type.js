// =============================================
// Gestion du Dropdown Type de Trajet
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    const tripTypeBtn = document.getElementById('tripTypeBtn');
    const tripTypeMenu = document.getElementById('tripTypeMenu');
    const selectedTripTypeSpan = document.getElementById('selectedTripType');
    const tripTypeOptions = document.querySelectorAll('.trip-type-option');
    const returnDateWrapper = document.getElementById('return-date-wrapper');
    const departureDateInput = document.getElementById('departure-date');
    const returnDateInput = document.getElementById('return-date');
    
    let currentTripType = 'roundtrip'; // Par défaut : aller-retour

    // On cible l'élément <i> qui est à l'intérieur du bouton principal
    const mainButtonIcon = tripTypeBtn.querySelector('i');

    // Toggle du menu au clic sur le bouton
    tripTypeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        tripTypeMenu.classList.toggle('hidden');
        tripTypeBtn.classList.toggle('active');
    });

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
        if (!tripTypeBtn.contains(e.target) && !tripTypeMenu.contains(e.target)) {
            tripTypeMenu.classList.add('hidden');
            tripTypeBtn.classList.remove('active');
        }
    });

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
    window.getTripType = function() {
        return currentTripType;
    };

    // Initialiser l'affichage au chargement (aller-retour par défaut)
    handleTripTypeChange(currentTripType);
});