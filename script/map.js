// Coordonnées pour centrer sur la France (approximatif)
        const franceCenter = [46.603354, 1.888334]; 
        const initialZoom = 6; 

        // Initialisation de la carte sur l'élément avec l'ID 'mapid'
        const map = L.map('mapid').setView(franceCenter, initialZoom);

        // Ajout des tuiles OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Exemple d'ajout d'un marqueur (Paris)
        L.marker([48.8566, 2.3522]).addTo(map)
            .bindPopup('Paris')
            .openPopup();