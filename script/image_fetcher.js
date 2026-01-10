// image_fetcher.js

const thumbnailSize = 300; 

/**
 * ÉTAPE 1: Recherche le titre exact de la page Wikipedia pour la ville donnée.
 * Utilise list=search pour gérer les homonymes et trouver le résultat le plus pertinent.
 * @param {string} query Le nom de la ville à rechercher.
 * @returns {Promise<string|null>} Le titre exact de la page ou null si non trouvé.
 */
async function searchPageTitle(query) {
    // API de recherche: srlimit=1 garantit un seul résultat (le plus pertinent)
    const searchApiUrl = `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`;
    
    try {
        const response = await fetch(searchApiUrl);
        const data = await response.json();
        
        if (data.query && data.query.search.length > 0) {
            return data.query.search[0].title;
        }
        return null;
    } catch (error) {
        console.error("Erreur lors de la recherche du titre de la page:", error);
        return null;
    }
}

/**
 * ÉTAPE 2: Récupère l'URL de la miniature de la page Wikipedia donnée par son titre exact.
 * @param {string} exactTitle Le titre exact de la page Wikipedia.
 * @returns {Promise<string|null>} L'URL de la miniature ou null.
 */
async function fetchWikipediaImageFromTitle(exactTitle) {
    // Utilise le titre exact pour obtenir l'image principale (prop=pageimages)
    const pagesApiUrl = `https://fr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(exactTitle)}&prop=pageimages&pithumbsize=${thumbnailSize}&format=json&origin=*`;

    try {
        const response = await fetch(pagesApiUrl);
        const data = await response.json();

        const pages = data.query?.pages;

        if (pages) {
            for (const pageId in pages) {
                const page = pages[pageId];
                if (page.thumbnail && page.thumbnail.source) {
                    return page.thumbnail.source; // Retourne l'URL de la miniature
                }
            }
        }
        return null;

    } catch (error) {
        console.error("Erreur lors de la récupération de l'image:", error);
        return null;
    }
}

/**
 * Fonction principale (publique) pour la récupération de l'image.
 * @param {string} cityName Le nom de la ville (destination) à rechercher.
 * @returns {Promise<string|null>} L'URL de la miniature de la première image trouvée, ou null.
 */
async function fetchWikimediaImage(cityName) {
    if (!cityName) return null;
    
    // 1. Trouver le titre exact
    const title = await searchPageTitle(cityName);
    
    if (title) {
        // 2. Récupérer l'image avec ce titre
        return await fetchWikipediaImageFromTitle(title);
    }
    
    return null;
}