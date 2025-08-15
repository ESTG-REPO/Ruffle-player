/**
 * Game URL Loader
 * 
 * This script enables direct game loading via URLs like jogos.ipv7.pt/<gamename>
 * It automatically parses the URL, finds the corresponding game in the games list,
 * and loads it directly without requiring user selection.
 */

(function() {
    console.log('[Game URL Loader] Initializing...');
    
    // Configuration
    const CONFIG = {
        // Path to the JSON file containing game information
        gamesJsonPath: 'games.json',
        
        // The container element where games should be loaded
        gameContainerSelector: '#game-container',
        
        // Default game to load if none is specified in URL (optional)
        defaultGame: '',
        
        // Logging level: 0=none, 1=errors, 2=warnings, 3=info, 4=debug
        logLevel: 3
    };
    
    // Logging utility
    const Logger = {
        error: (msg) => CONFIG.logLevel >= 1 && console.error('[Game URL Loader]', msg),
        warn: (msg) => CONFIG.logLevel >= 2 && console.warn('[Game URL Loader]', msg),
        info: (msg) => CONFIG.logLevel >= 3 && console.info('[Game URL Loader]', msg),
        debug: (msg) => CONFIG.logLevel >= 4 && console.debug('[Game URL Loader]', msg)
    };
    
    // Store game data
    let gamesData = null;
    
    /**
     * Fetch and parse the games JSON file
     */
    async function loadGamesData() {
        try {
            const response = await fetch(CONFIG.gamesJsonPath);
            if (!response.ok) {
                throw new Error(`Failed to load games data (${response.status} ${response.statusText})`);
            }
            
            const jsonData = await response.json();
            
            // Process the games data from the nitromeGames array
            const processedGames = {};
            
            // Nitrome games array
            if (jsonData.nitromeGames && Array.isArray(jsonData.nitromeGames)) {
                jsonData.nitromeGames.forEach(game => {
                    if (game.id) {
                        processedGames[game.id.toLowerCase()] = game;
                    }
                });
            }
            
            // Process other game collections if they exist
            Object.keys(jsonData).forEach(collectionKey => {
                if (collectionKey !== 'nitromeGames' && Array.isArray(jsonData[collectionKey])) {
                    jsonData[collectionKey].forEach(game => {
                        if (game.id) {
                            processedGames[game.id.toLowerCase()] = game;
                        }
                    });
                }
            });
            
            Logger.info(`Loaded games data: ${Object.keys(processedGames).length} games found`);
            return processedGames;
        } catch (error) {
            Logger.error(`Error loading games data: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Parse the current URL to extract the game name
     */
    function getGameNameFromUrl() {
        // Get the path from the URL (after the domain)
        const path = window.location.pathname;
        
        // Split the path by '/' and filter out empty strings
        const pathParts = path.split('/').filter(part => part.trim() !== '');
        
        // The first part after the domain should be the game name
        const gameName = pathParts[0];
        
        Logger.debug(`URL path: ${path}, Extracted game name: ${gameName || 'none'}`);
        return gameName || CONFIG.defaultGame;
    }
    
    /**
     * Find a game in the games data by its URL name
     */
    function findGameByUrlName(urlName) {
        if (!gamesData) return null;
        
        if (!urlName) return null;
        
        // Convert to lowercase for case-insensitive matching
        const searchName = urlName.toLowerCase();
        
        // First try direct match with lowercase id
        if (gamesData[searchName]) {
            return gamesData[searchName];
        }
        
        // Try to find a game with matching id (case insensitive)
        for (const [id, game] of Object.entries(gamesData)) {
            // If the game has an id field that matches (case insensitive)
            if (game.id && game.id.toLowerCase() === searchName) {
                return game;
            }
            
            // Compare with URL-friendly versions of the game name
            if (game.name) {
                const gameUrlName = makeUrlFriendly(game.name);
                if (gameUrlName === searchName) {
                    return game;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Convert a string to a URL-friendly format
     */
    function makeUrlFriendly(str) {
        if (!str) return '';
        
        return str
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
            .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
            .trim();
    }
    
    /**
     * Load a game based on the current URL
     */
    async function loadGameFromUrl() {
        // Get the game name from the URL
        const urlGameName = getGameNameFromUrl();
        if (!urlGameName) {
            Logger.info('No game specified in URL');
            return;
        }
        
        // Make sure we have the games data
        if (!gamesData) {
            gamesData = await loadGamesData();
            if (!gamesData) {
                Logger.error('Could not load games data');
                return;
            }
        }
        
        // Find the game in our data
        const game = findGameByUrlName(urlGameName);
        if (!game) {
            Logger.warn(`Game not found: ${urlGameName}`);
            return;
        }
        
        // Load the game
        Logger.info(`Loading game: ${game.name || game.id}`);
        loadGame(game);
    }
    
    /**
     * Load a specific game into the page
     */
    function loadGame(game) {
        // Get the game container
        const container = document.querySelector(CONFIG.gameContainerSelector);
        if (!container) {
            Logger.error(`Game container not found: ${CONFIG.gameContainerSelector}`);
            return;
        }
        
        // Update page title with game name
        if (game.name) {
            document.title = `${game.name} - ${document.title.split(' - ')[1] || 'Flash Games'}`;
        }
        
        // Determine the game file path
        const gamePath = game.path || game.url || game.src || `games/${game.id}.swf`;
        
        // Check if we're using Ruffle
        if (typeof window.RufflePlayer !== 'undefined') {
            // Create a Ruffle player for the game
            Logger.debug('Using Ruffle to load the game');
            
            // Clear the container
            container.innerHTML = '';
            
            // Create and configure the ruffle player
            const player = window.RufflePlayer.newest().createPlayer();
            player.style.width = '100%';
            player.style.height = '100%';
            container.appendChild(player);
            
            // Configure the player options
            const playerOptions = {
                // Use game-specific configuration if available
                ...game.ruffleOptions,
                // Allow script access by default
                allowScriptAccess: true
            };
            
            // Load the SWF
            player.load(gamePath, playerOptions);
            
            // Create a game info element
            const infoElement = document.createElement('div');
            infoElement.className = 'game-info';
            infoElement.innerHTML = `
                <h2>${game.name || game.id}</h2>
                ${game.description ? `<p>${game.description}</p>` : ''}
                <p class="share-link">Share this game: <a href="${window.location.origin}/${encodeURIComponent(game.id)}">${window.location.origin}/${game.id}</a></p>
            `;
            
            // Find a place to put the info element (outside the container to not interfere with the game)
            const infoContainer = document.querySelector('#game-info') || document.createElement('div');
            if (!document.querySelector('#game-info')) {
                infoContainer.id = 'game-info';
                container.parentNode.insertBefore(infoContainer, container.nextSibling);
            }
            infoContainer.innerHTML = '';
            infoContainer.appendChild(infoElement);
            
            // Dispatch a custom event that the game was loaded
            window.dispatchEvent(new CustomEvent('gameLoaded', { detail: { game } }));
        } else {
            // Fallback for non-Ruffle loading
            Logger.debug('Using standard embed to load the game');
            
            // Create an embed element
            const embed = document.createElement('embed');
            embed.setAttribute('src', gamePath);
            embed.setAttribute('width', '100%');
            embed.setAttribute('height', '100%');
            embed.setAttribute('type', 'application/x-shockwave-flash');
            embed.setAttribute('quality', 'high');
            
            // Add game-specific parameters
            if (game.flashvars) {
                embed.setAttribute('flashvars', game.flashvars);
            }
            
            // Clear the container and add the embed
            container.innerHTML = '';
            container.appendChild(embed);
            
            // Create a game info element
            const infoElement = document.createElement('div');
            infoElement.className = 'game-info';
            infoElement.innerHTML = `
                <h2>${game.name || game.id}</h2>
                ${game.description ? `<p>${game.description}</p>` : ''}
                <p class="share-link">Share this game: <a href="${window.location.origin}/${encodeURIComponent(game.id)}">${window.location.origin}/${game.id}</a></p>
            `;
            
            // Find a place to put the info element
            const infoContainer = document.querySelector('#game-info') || document.createElement('div');
            if (!document.querySelector('#game-info')) {
                infoContainer.id = 'game-info';
                container.parentNode.insertBefore(infoContainer, container.nextSibling);
            }
            infoContainer.innerHTML = '';
            infoContainer.appendChild(infoElement);
            
            // Dispatch a custom event that the game was loaded
            window.dispatchEvent(new CustomEvent('gameLoaded', { detail: { game } }));
        }
    }
    
    /**
     * Initialize the loader
     */
    async function initialize() {
        Logger.info('Loading games data...');
        gamesData = await loadGamesData();
        
        if (gamesData) {
            Logger.info('Checking URL for game to load...');
            loadGameFromUrl();
            
            // Set up URL change monitoring (for single page apps)
            if ('onpopstate' in window) {
                window.addEventListener('popstate', loadGameFromUrl);
            }
        }
    }
    
    // Start the loader when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Export API to window for external access
    window.GameUrlLoader = {
        loadGame: (gameId) => {
            if (!gamesData) {
                Logger.error('Games data not loaded yet');
                return false;
            }
            
            const game = findGameByUrlName(gameId);
            if (game) {
                loadGame(game);
                return true;
            } else {
                Logger.warn(`Game not found: ${gameId}`);
                return false;
            }
        },
        getGames: () => gamesData ? {...gamesData} : null,
        getGameUrl: (gameId) => {
            const game = findGameByUrlName(gameId);
            if (game) {
                return `${window.location.origin}/${encodeURIComponent(game.id)}`;
            }
            return null;
        }
    };
    
    Logger.info('Initialization complete');
})();
