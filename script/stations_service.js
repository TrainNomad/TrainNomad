// stations_service.js
// Service côté CLIENT pour charger et rechercher les gares DIRECTEMENT depuis GitHub
// REMPLACE complètement server.js - Aucun serveur Node.js nécessaire !

const STATIONS_SERVICE = {
    CSV_URL: 'https://raw.githubusercontent.com/trainline-eu/stations/master/stations.csv',
    
    // Cache en mémoire
    cache: {
        data: [],
        map: new Map(),
        lastUpdate: null,
        isLoading: false
    },
    
    CACHE_DURATION: 30 * 60 * 1000, // 30 minutes

    // === CHARGEMENT DU CSV DEPUIS GITHUB ===
    async loadStations() {
        if (this.cache.isLoading) {
            console.log('⏳ Chargement déjà en cours...');
            // Attendre que le chargement se termine
            while (this.cache.isLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.cache.data;
        }

        console.log('📥 Téléchargement des stations depuis GitHub...');
        this.cache.isLoading = true;

        try {
            const response = await fetch(this.CSV_URL);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const csvText = await response.text();
            const lines = csvText.split("\n").filter(line => line.trim().length > 0);
            
            if (lines.length === 0) {
                throw new Error("Le fichier CSV est vide");
            }
            
            const headers = lines[0].split(";").map(h => h.trim());

            // Parser les données
            const stationsData = lines.slice(1).map(line => {
                const values = line.split(";");
                const obj = {};
                headers.forEach((h, i) => obj[h] = values[i]?.trim());
                return obj;
            }).filter(obj => Object.keys(obj).length === headers.length);
            
            // Créer la Map pour recherche rapide
            const stationsMap = new Map();
            stationsData.forEach(station => {
                if (station.sncf_id) {
                    stationsMap.set(station.sncf_id.toUpperCase(), station);
                }
            });

            // Mettre à jour le cache
            this.cache.data = stationsData;
            this.cache.map = stationsMap;
            this.cache.lastUpdate = Date.now();
            this.cache.isLoading = false;

            console.log(`✅ ${stationsData.length} stations chargées`);
            return stationsData;
            
        } catch (error) {
            console.error('❌ Erreur chargement stations:', error);
            this.cache.isLoading = false;
            throw error;
        }
    },

    // === VÉRIFICATION DU CACHE ===
    async ensureCacheValid() {
        const now = Date.now();
        
        // Si pas de cache ou cache expiré
        if (!this.cache.lastUpdate || (now - this.cache.lastUpdate) > this.CACHE_DURATION) {
            await this.loadStations();
        }
        
        return this.cache.data.length > 0;
    },

    // === RECHERCHE DE SUGGESTIONS ===
    async getSuggestions(query) {
        if (!query || query.length < 2) return [];
        
        await this.ensureCacheValid();
        
        const search = query.toLowerCase();
        
        const suggestions = this.cache.data.filter(station => {
            const name = station.name ? station.name.toLowerCase() : '';
            const slug = station.slug ? station.slug.toLowerCase() : '';
            const isSncfEnabled = station.sncf_is_enabled === 't';
            
            return isSncfEnabled && (name.includes(search) || slug.includes(search));
        }).slice(0, 15);

        return suggestions;
    },

    // === RÉCUPÉRATION PAR CODE IATA ===
    async getStationByIata(iataCode) {
        if (!iataCode) return null;
        
        await this.ensureCacheValid();
        
        const station = this.cache.map.get(iataCode.toUpperCase());
        return station || null;
    },

    // === FORCER LE RECHARGEMENT ===
    async reload() {
        console.log('🔄 Rechargement forcé...');
        this.cache.lastUpdate = null;
        return await this.loadStations();
    },

    // === STATUT DU CACHE ===
    getCacheStatus() {
        const cacheAge = this.cache.lastUpdate 
            ? Math.floor((Date.now() - this.cache.lastUpdate) / 1000)
            : null;
        
        return {
            isValid: cacheAge !== null && cacheAge < (this.CACHE_DURATION / 1000),
            stationCount: this.cache.data.length,
            lastUpdate: this.cache.lastUpdate ? new Date(this.cache.lastUpdate).toISOString() : null,
            cacheAgeSeconds: cacheAge,
            cacheExpiresIn: cacheAge ? Math.max(0, (this.CACHE_DURATION / 1000) - cacheAge) : 0,
            isLoading: this.cache.isLoading
        };
    }
};

// Export global pour compatibilité avec le code existant
window.STATIONS_SERVICE = STATIONS_SERVICE;

// Pré-charger au démarrage de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 Initialisation du service de gares...');
        STATIONS_SERVICE.loadStations().catch(err => {
            console.warn('⚠️ Erreur lors du pré-chargement:', err);
        });
    });
} else {
    console.log('🚀 Initialisation du service de gares...');
    STATIONS_SERVICE.loadStations().catch(err => {
        console.warn('⚠️ Erreur lors du pré-chargement:', err);
    });
}

console.log('✅ STATIONS_SERVICE chargé et prêt');