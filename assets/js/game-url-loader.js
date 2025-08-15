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
        
        // Path to translations file
        translationsPath: 'translations.json',
        
        // The container element where games should be loaded
        gameContainerSelector: '#game-container',
        
        // Default game to load if none is specified in URL (optional)
        defaultGame: '',
        
        // Default language (will be detected from browser if possible)
        defaultLanguage: 'pt-pt',
        
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
    
    // Store translations
    let translations = null;
    let currentLanguage = CONFIG.defaultLanguage;
    
    /**
     * Load translations from the translations.json file
     */
    async function loadTranslations() {
        try {
            const response = await fetch(CONFIG.translationsPath);
            if (!response.ok) {
                throw new Error(`Failed to load translations (${response.status} ${response.statusText})`);
            }
            
            const data = await response.json();
            Logger.info('Translations loaded successfully');
            
            // Detect browser language
            const browserLang = navigator.language.toLowerCase();
            if (data[browserLang]) {
                currentLanguage = browserLang;
            } else if (browserLang.startsWith('pt')) {
                currentLanguage = 'pt-pt';
            } else {
                currentLanguage = 'en-us';
            }
            
            Logger.debug(`Using language: ${currentLanguage}`);
            return data;
        } catch (error) {
            Logger.error(`Error loading translations: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Get a translated string by key
     */
    function t(key, defaultValue = key) {
        if (!translations || !translations[currentLanguage]) {
            return defaultValue;
        }
        
        return translations[currentLanguage][key] || defaultValue;
    }
    
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
            
            // Handle different possible JSON structures
            
            // Case 1: Direct object with game IDs as keys
            if (typeof jsonData === 'object' && !Array.isArray(jsonData) && !jsonData.nitromeGames) {
                Logger.debug('Detected direct object with game IDs as keys');
                
                Object.entries(jsonData).forEach(([id, game]) => {
                    if (typeof game === 'object') {
                        processedGames[id.toLowerCase()] = {
                            id: id,
                            ...game
                        };
                    }
                });
            }
            
            // Case 2: Structure with nitromeGames array
            if (jsonData.nitromeGames && Array.isArray(jsonData.nitromeGames)) {
                Logger.debug('Detected nitromeGames array structure');
                
                jsonData.nitromeGames.forEach(game => {
                    if (game.id) {
                        processedGames[game.id.toLowerCase()] = game;
                    }
                });
            }
            
            // Case 3: Other arrays in the JSON
            Object.keys(jsonData).forEach(collectionKey => {
                if (collectionKey !== 'nitromeGames' && Array.isArray(jsonData[collectionKey])) {
                    Logger.debug(`Processing game collection: ${collectionKey}`);
                    
                    jsonData[collectionKey].forEach(game => {
                        if (game.id) {
                            processedGames[game.id.toLowerCase()] = game;
                        }
                    });
                }
            });
            
            // Case 4: JSON is directly an array of games
            if (Array.isArray(jsonData)) {
                Logger.debug('Detected direct array of games');
                
                jsonData.forEach(game => {
                    if (game.id) {
                        processedGames[game.id.toLowerCase()] = game;
                    }
                });
            }
            
            const gameCount = Object.keys(processedGames).length;
            if (gameCount === 0) {
                Logger.error('No games found in the JSON data. Check the format of your games.json file.');
                return null;
            }
            
            Logger.info(`Loaded games data: ${gameCount} games found`);
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
        // Determine the game file path
        const gamePath = game.path || game.url || game.src || `games/${game.id}.swf`;
        
        // Update page title with game name
        if (game.name) {
            document.title = `${game.name} - ${document.title.split(' - ')[1] || 'Flash Games'}`;
        }
        
        // Check if we're on the main page with the default Ruffle player
        const mainRufflePlayer = document.getElementById('ruffle-player');
        const mainLoadGameFunction = window.loadGame;
        
        if (mainRufflePlayer && typeof mainLoadGameFunction === 'function') {
            // We're on the main page, use the main site's loadGame function
            Logger.info('Using main page Ruffle player');
            
            // Call the main page's loadGame function
            mainLoadGameFunction(game.id);
            
            // Create a game info element
            createGameInfoElement(game);
            
            // Dispatch a custom event that the game was loaded
            window.dispatchEvent(new CustomEvent('gameLoaded', { detail: { game } }));
            return;
        }
        
        // Fallback to our own implementation if not on the main page
        // Get the game container or create it if it doesn't exist
        let container = document.querySelector(CONFIG.gameContainerSelector);
        if (!container) {
            Logger.warn(`Game container not found: ${CONFIG.gameContainerSelector}. Creating it now.`);
            
            // Create the container
            container = document.createElement('div');
            container.id = CONFIG.gameContainerSelector.replace('#', '');
            
            // Add some basic styling
            container.style.width = '800px';
            container.style.height = '600px';
            container.style.margin = '20px auto';
            container.style.backgroundColor = '#000';
            container.style.border = '2px solid #333';
            
            // Add it to the body or a more appropriate container if exists
            const mainContainer = document.querySelector('main') || document.querySelector('.container') || document.body;
            mainContainer.appendChild(container);
            
            Logger.info('Created game container element');
        }
        
        // Function to actually load the game
        const loadWithRuffle = () => {
            // Check if we're using Ruffle
            if (typeof window.RufflePlayer !== 'undefined') {
                // Create a Ruffle player for the game
                Logger.debug('Using Ruffle to load the game');
                
                // Clear the container
                container.innerHTML = '';
                
                try {
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
                    createGameInfoElement(game);
                    
                    // Dispatch a custom event that the game was loaded
                    window.dispatchEvent(new CustomEvent('gameLoaded', { detail: { game } }));
                } catch (error) {
                    Logger.error(`Error creating Ruffle player: ${error.message}`);
                    container.innerHTML = `<div style="color: white; padding: 20px; text-align: center;">
                        <h3>Error loading game</h3>
                        <p>${error.message}</p>
                        <p>Please check that Ruffle is properly installed.</p>
                    </div>`;
                }
            } else {
                // Fallback for non-Ruffle loading or wait for Ruffle to load
                if (document.querySelector('script[src*="ruffle"]')) {
                    // Ruffle script is in the page but not loaded yet
                    Logger.info('Waiting for Ruffle to load...');
                    container.innerHTML = '<div style="color: white; padding: 20px; text-align: center;">Loading Ruffle player...</div>';
                    
                    // Wait for Ruffle to be available
                    const checkRuffle = setInterval(() => {
                        if (typeof window.RufflePlayer !== 'undefined') {
                            clearInterval(checkRuffle);
                            loadWithRuffle();
                        }
                    }, 200);
                    
                    // Set a timeout to avoid waiting forever
                    setTimeout(() => {
                        clearInterval(checkRuffle);
                        if (typeof window.RufflePlayer === 'undefined') {
                            Logger.error('Ruffle failed to load within the timeout period');
                            container.innerHTML = `<div style="color: white; padding: 20px; text-align: center;">
                                <h3>Error loading Ruffle</h3>
                                <p>The Ruffle player did not load within the expected time.</p>
                                <p>Please refresh the page and try again.</p>
                            </div>`;
                        }
                    }, 10000); // 10 second timeout
                } else {
                    // No Ruffle script detected, use standard embed fallback
                    Logger.debug('Using standard embed to load the game (Ruffle not detected)');
                    
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
                    
                    // Add warning about Ruffle
                    const warning = document.createElement('div');
                    warning.style.color = 'red';
                    warning.style.padding = '10px';
                    warning.style.marginTop = '10px';
                    warning.style.backgroundColor = '#ffdddd';
                    warning.style.border = '1px solid #ff0000';
                    warning.innerHTML = 'Warning: Ruffle Flash emulator not detected. This game may not work in modern browsers without Ruffle.';
                    container.parentNode.insertBefore(warning, container.nextSibling);
                    
                    // Create a game info element
                    createGameInfoElement(game);
                    
                    // Dispatch a custom event that the game was loaded
                    window.dispatchEvent(new CustomEvent('gameLoaded', { detail: { game } }));
                }
            }
        };
        
        // Start the loading process
        loadWithRuffle();
    }
    
    /**
     * Helper function to create game info element
     */
    function createGameInfoElement(game) {
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
            const container = document.querySelector(CONFIG.gameContainerSelector);
            if (container && container.parentNode) {
                container.parentNode.insertBefore(infoContainer, container.nextSibling);
            } else {
                document.body.appendChild(infoContainer);
            }
        }
        infoContainer.innerHTML = '';
        infoContainer.appendChild(infoElement);
    }
    
    /**
     * Initialize the loader
     */
    async function initialize() {
        Logger.info('Loading translations...');
        translations = await loadTranslations();
        
        Logger.info('Loading games data...');
        gamesData = await loadGamesData();
        
        if (gamesData) {
            Logger.info('Checking URL for game to load...');
            
            // Wait a short time to ensure the DOM is fully loaded
            setTimeout(() => {
                loadGameFromUrl();
            }, 100);
            
            // Set up URL change monitoring (for single page apps)
            if ('onpopstate' in window) {
                window.addEventListener('popstate', loadGameFromUrl);
            }
        }
    }
    
    // More reliable DOM ready check
    function domReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }
    
    // Start the loader when DOM is loaded
    domReady(initialize);
    
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
        },
        /**
         * Add a share button to the page that copies the current game URL to clipboard
         */
        addShareButton: () => {
            // Get the current game from URL
            const gameName = getGameNameFromUrl();
            if (!gameName) {
                Logger.debug('No game in URL, not adding share button');
                return;
            }
            
            // Check if game exists
            if (!gamesData) {
                Logger.debug('Games data not loaded yet, waiting before adding share button');
                setTimeout(() => window.GameUrlLoader.addShareButton(), 1000);
                return;
            }
            
            const game = findGameByUrlName(gameName);
            if (!game) {
                Logger.debug(`Game not found: ${gameName}, not adding share button`);
                return;
            }
            
            // Remove any existing share button
            const existingButton = document.querySelector('.game-share-button');
            if (existingButton) {
                existingButton.remove();
            }
            
            // Create share button element
            const shareButton = document.createElement('div');
            shareButton.className = 'game-share-button';
            shareButton.innerHTML = `<span>${t('shareButton', 'Partilhar')}</span>`;
            
            // Style the button
            shareButton.style.position = 'fixed';
            shareButton.style.bottom = '20px';
            shareButton.style.right = '20px';
            shareButton.style.backgroundColor = '#4CAF50';
            shareButton.style.color = 'white';
            shareButton.style.padding = '10px 20px';
            shareButton.style.borderRadius = '5px';
            shareButton.style.cursor = 'pointer';
            shareButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            shareButton.style.zIndex = '9999';
            shareButton.style.display = 'flex';
            shareButton.style.alignItems = 'center';
            shareButton.style.justifyContent = 'center';
            shareButton.style.fontFamily = 'Arial, sans-serif';
            shareButton.style.fontWeight = 'bold';
            
            // Create icon using emoji
            const shareIcon = document.createElement('span');
            shareIcon.textContent = '🔗 ';
            shareIcon.style.marginRight = '5px';
            shareIcon.style.fontSize = '16px';
            shareButton.prepend(shareIcon);
            
            // Set hover effect
            shareButton.onmouseover = () => {
                shareButton.style.backgroundColor = '#45a049';
            };
            shareButton.onmouseout = () => {
                shareButton.style.backgroundColor = '#4CAF50';
            };
            
            // Add click handler
            shareButton.onclick = async () => {
                const gameUrl = window.location.href;
                
                try {
                    // Use Clipboard API to copy URL
                    await navigator.clipboard.writeText(gameUrl);
                    
                    // Show success message
                    const message = document.createElement('div');
                    message.className = 'game-share-message';
                    message.textContent = t('shareSuccess', "Jogo copiado para a área de transferência, partilha no WhatsApp com os teus amigos!!");
                    
                    // Style the message
                    message.style.position = 'fixed';
                    message.style.bottom = '80px';
                    message.style.right = '20px';
                    message.style.backgroundColor = '#333';
                    message.style.color = 'white';
                    message.style.padding = '10px 15px';
                    message.style.borderRadius = '5px';
                    message.style.maxWidth = '300px';
                    message.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
                    message.style.zIndex = '10000';
                    message.style.fontFamily = 'Arial, sans-serif';
                    message.style.fontSize = '14px';
                    message.style.textAlign = 'center';
                    
                    // Add message to body
                    document.body.appendChild(message);
                    
                    // Remove message after 3 seconds
                    setTimeout(() => {
                        message.style.opacity = '0';
                        message.style.transition = 'opacity 0.5s';
                        setTimeout(() => {
                            document.body.removeChild(message);
                        }, 500);
                    }, 3000);
                    
                    // Log success
                    Logger.info(`Game URL copied to clipboard: ${gameUrl}`);
                } catch (err) {
                    // Show error message (clipboard might be blocked for security reasons)
                    alert(`URL do jogo: ${gameUrl}\n\nCopia este link e partilha com os teus amigos!`);
                    Logger.error(`Error copying to clipboard: ${err}`);
                }
            };
            
            // Add button to the body
            document.body.appendChild(shareButton);
            Logger.info('Share button added to the page');
        }
    };
    
    // Initialize share button
    domReady(() => {
        setTimeout(() => {
            window.GameUrlLoader.addShareButton();
        }, 1000); // Wait 1 second to ensure games are loaded
    });
    
    Logger.info('Initialization complete');
})();
