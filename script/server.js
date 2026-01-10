// server.js
// --- Prérequis : npm install express ---

const cors = require('cors');
app.use(cors()); // Autorise les requêtes provenant d'autres domaines

const express = require('express');
const app = express();
const PORT = 3000;

const CSV_URL = 'https://raw.githubusercontent.com/trainline-eu/stations/master/stations.csv';

let stationsData = [];
// NOUVEAU: Map pour un accès rapide par sncf_id (IATA)
let stationsMap = new Map(); 

// === CHARGEMENT DES DONNÉES CSV DEPUIS GITHUB ===
async function loadStations() {
    console.log("Téléchargement et chargement des stations depuis GitHub...");
    
    try {
        // UTILISATION DE LA FONCTION FETCH NATIVE DE NODE.JS
        const response = await fetch(CSV_URL); 
        
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
        
        const csvText = await response.text();
        const lines = csvText.split("\n").filter(line => line.trim().length > 0);
        
        const headers = lines[0].split(";").map(h => h.trim());

        stationsData = lines.slice(1).map(line => {
            const values = line.split(";");
            const obj = {};
            headers.forEach((h, i) => obj[h] = values[i]?.trim());
            return obj;
        }).filter(obj => Object.keys(obj).length === headers.length); 
        
        // NOUVEAU: Remplir la Map pour la recherche rapide par IATA
        stationsData.forEach(station => {
            if (station.sncf_id) {
                // Stockage en MAJUSCULES pour la cohérence
                stationsMap.set(station.sncf_id.toUpperCase(), station); 
            }
        });

        console.log(`Chargement terminé. ${stationsData.length} stations chargées.`);
        
    } catch (error) {
        console.error("Erreur critique lors du chargement des données de stations :", error);
        throw error; 
    }
}

// Middleware CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// === API 1: SUGGESTIONS DE GARES UNIQUEMENT ===
app.get('/api/suggestions', (req, res) => {
    const search = req.query.q ? req.query.q.toLowerCase() : '';

    if (!search || search.length < 2) {
        return res.json([]);
    }

    const suggestions = stationsData.filter(station => {
        const name = station.name ? station.name.toLowerCase() : '';
        const slug = station.slug ? station.slug.toLowerCase() : '';
        
        const isSncfEnabled = station.sncf_is_enabled === 't';
        
        return isSncfEnabled && (name.includes(search) || slug.includes(search));
    }).slice(0, 15);

    res.json(suggestions);
});


// === API 2: DONNÉES DE GARE PAR IATA ===

app.get('/api/station/:id', (req, res) => {
    // Assure que l'ID est en majuscule, comme les clés stockées dans stationsMap.
    const iataId = req.params.id.toUpperCase(); 

    if (!iataId) {
        return res.status(400).json({ error: "ID de gare manquant." });
    }

    // stationsMap est peuplée avec station.sncf_id comme clé (e.g., 'FRMPL')
    const station = stationsMap.get(iataId);
    
    if (station) {
        // Retourne l'objet complet de la gare trouvé (qui contient la colonne 'name' exacte)
        res.json(station); 
    } else {
        res.status(404).json({ 
            error: "Gare non trouvée pour l'ID IATA : " + iataId 
        });
    }
});


// Démarrage du Serveur
loadStations().then(() => {
    app.listen(PORT, () => {
        console.log(`Serveur d'API démarré sur http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("Le serveur n'a pas pu démarrer.");
});