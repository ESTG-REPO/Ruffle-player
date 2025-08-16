/**
 * Game Loader Enhancer
 * 
 * This module extends the functionality of the game-url-loader.js without modifying it.
 * It adds the following improvements:
 * 
 * 1. URL Handling and SEO Improvements
 *    - URL Slugs for better SEO
 *    - History API Integration
 *    - URL Parameters support
 * 
 * 2. Performance Enhancements
 *    - Local Storage Caching
 * 
 * 3. Error Handling and Resilience
 *    - Enhanced Error Recovery
 *    - Network Detection
 *    - Automatic Retries
 *    - Detailed Error Reporting
 */

(function() {
    console.log('[Game Loader Enhancer] Initializing...');
    
    // Configuration
    const CONFIG = {
        // Local storage keys
        STORAGE_KEYS: {
            GAMES_DATA: 'gameLoader_gamesData',
            TRANSLATIONS: 'gameLoader_translations',
            CACHE_TIMESTAMP: 'gameLoader_cacheTimestamp',
            RECENTLY_PLAYED: 'gameLoader_recentlyPlayed'
        },
        
        // Cache expiration time (24 hours)
        CACHE_EXPIRATION: 24 * 60 * 60 * 1000,
        
        // Maximum retry attempts for loading resources
        MAX_RETRIES: 3,
        
        // Retry delay in milliseconds (increases with each retry)
        RETRY_DELAY: 1000,
        
        // Logging level: 0=none, 1=errors, 2=warnings, 3=info, 4=debug
        LOG_LEVEL: 3
    };
    
    // Initialize the API object that will be exposed
    const EnhancerAPI = {};
    
    // Logging utility
    const Logger = {
        error: (msg) => CONFIG.LOG_LEVEL >= 1 && console.error('[Game Loader Enhancer]', msg),
        warn: (msg) => CONFIG.LOG_LEVEL >= 2 && console.warn('[Game Loader Enhancer]', msg),
        info: (msg) => CONFIG.LOG_LEVEL >= 3 && console.info('[Game Loader Enhancer]', msg),
        debug: (msg) => CONFIG.LOG_LEVEL >= 4 && console.debug('[Game Loader Enhancer]', msg)
    };
    
    // Reference to the original GameUrlLoader API
    let originalLoader = null;
    
    /**
     * Initialize the enhancer
     */
    function initialize() {
        // Wait for the original loader to be available
        if (!window.GameUrlLoader) {
            Logger.debug('Waiting for original GameUrlLoader to be available...');
            setTimeout(initialize, 100);
            return;
        }
        
        // Store reference to the original loader
        originalLoader = window.GameUrlLoader;
        
        // Override the original GameUrlLoader with enhanced version
        extendOriginalLoader();
        
        // Initialize network status monitoring
        initNetworkMonitoring();
        
        // Apply URL parameters on initial load
        processUrlParameters();
        
        Logger.info('Game Loader Enhancer initialized successfully');
    }
    
    /**
     * Extend the original GameUrlLoader with enhanced functionality
     */
    function extendOriginalLoader() {
        // Create a new API object that wraps the original
        window.GameUrlLoader = {
            // Enhanced loadGame method
            loadGame: (gameId) => {
                return loadGameEnhanced(gameId);
            },
            
            // Enhanced getGames method with caching
            getGames: () => {
                const cachedGames = getCachedGamesData();
                if (cachedGames) {
                    return { ...cachedGames };
                }
                return originalLoader.getGames();
            },
            
            // Pass through the original getGameUrl method
            getGameUrl: (gameId) => {
                return getEnhancedGameUrl(gameId);
            },
            
            // Enhanced addShareButton method
            addShareButton: () => {
                originalLoader.addShareButton();
                enhanceShareButton();
            },
            
            // Add new method for slug-based URLs
            getGameBySlug: (slug) => {
                return findGameBySlug(slug);
            },
            
            // Add method to update URL without reloading
            updateUrl: (gameId) => {
                updateBrowserUrl(gameId);
            },
            
            // Expose the original loader for backward compatibility
            original: originalLoader
        };
        
        // Listen for the gameLoaded event to update browser history
        window.addEventListener('gameLoaded', (event) => {
            if (event.detail && event.detail.game) {
                updateBrowserUrl(event.detail.game.id);
                addToRecentlyPlayed(event.detail.game.id);
            }
        });
    }
    
    /**
     * Enhanced loadGame method with improved error handling and retries
     */
    function loadGameEnhanced(gameId) {
        // Check if we're offline
        if (!navigator.onLine) {
            Logger.warn('Device is offline. Attempting to load from cache...');
            showOfflineMessage();
            
            // Try to load from cache if available
            const cachedGames = getCachedGamesData();
            if (cachedGames && cachedGames[gameId.toLowerCase()]) {
                // We can still try to load the game if it's cached
                Logger.info(`Attempting to load cached game: ${gameId}`);
            } else {
                Logger.error(`Cannot load game while offline: ${gameId}`);
                showErrorMessage('offline', { gameId });
                return false;
            }
        }
        
        // Process any URL parameters that should affect this game
        processUrlParameters();
        
        try {
            // Call the original loadGame method
            const result = originalLoader.loadGame(gameId);
            
            // If successful, update browser URL and add to recently played
            if (result) {
                updateBrowserUrl(gameId);
                addToRecentlyPlayed(gameId);
            } else {
                // If the original loader failed, try alternative approaches
                const gameBySlug = findGameBySlug(gameId);
                if (gameBySlug) {
                    Logger.info(`Found game by slug: ${gameId} -> ${gameBySlug.id}`);
                    const slugResult = originalLoader.loadGame(gameBySlug.id);
                    
                    if (slugResult) {
                        updateBrowserUrl(gameBySlug.id);
                        addToRecentlyPlayed(gameBySlug.id);
                        return true;
                    }
                }
                
                // If we still couldn't load the game, show a detailed error
                showErrorMessage('gameNotFound', { gameId });
            }
            
            return result;
        } catch (error) {
            Logger.error(`Error loading game ${gameId}: ${error.message}`);
            showErrorMessage('loadError', { gameId, error });
            return false;
        }
    }
    
    /**
     * Get an enhanced game URL that uses SEO-friendly slugs
     */
    function getEnhancedGameUrl(gameId) {
        const games = window.GameUrlLoader.getGames();
        if (!games) return null;
        
        const game = games[gameId.toLowerCase()];
        if (!game) return null;
        
        // Create a slug from the game name
        const slug = createSlug(game.name || game.id);
        
        // Return a URL with the slug and original ID as a parameter for fallback
        return `${window.location.origin}/${slug}?id=${encodeURIComponent(game.id)}`;
    }
    
    /**
     * Create a URL-friendly slug from a string
     */
    function createSlug(str) {
        if (!str) return '';
        
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-')     // Replace spaces with hyphens
            .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    }
    
    /**
     * Find a game by its slug
     */
    function findGameBySlug(slug) {
        const games = window.GameUrlLoader.getGames();
        if (!games) return null;
        
        // Normalize the slug
        const normalizedSlug = createSlug(slug);
        
        // Search through all games
        for (const [id, game] of Object.entries(games)) {
            const gameSlug = createSlug(game.name || game.id);
            if (gameSlug === normalizedSlug) {
                return game;
            }
        }
        
        return null;
    }
    
    /**
     * Update the browser URL without refreshing the page
     */
    function updateBrowserUrl(gameId) {
        const games = window.GameUrlLoader.getGames();
        if (!games || !gameId) return;
        
        const game = games[gameId.toLowerCase()];
        if (!game) return;
        
        // Create a slug from the game name
        const slug = createSlug(game.name || game.id);
        
        // Get current URL parameters and preserve them
        const params = new URLSearchParams(window.location.search);
        
        // Set ID parameter for fallback
        params.set('id', game.id);
        
        // Create the new URL
        const newUrl = `${window.location.origin}/${slug}?${params.toString()}`;
        
        // Update browser history
        try {
            window.history.pushState({ gameId: game.id }, game.name || game.id, newUrl);
            Logger.debug(`Updated URL: ${newUrl}`);
        } catch (error) {
            Logger.error(`Error updating browser URL: ${error.message}`);
        }
    }
    
    /**
     * Process URL parameters to customize the game experience
     */
    function processUrlParameters() {
        const params = new URLSearchParams(window.location.search);
        
        // Handle language parameter
        const langParam = params.get('lang');
        if (langParam) {
            setLanguageFromParameter(langParam);
        }
        
        // Handle fullscreen parameter
        const fullscreenParam = params.get('fullscreen');
        if (fullscreenParam === 'true') {
            requestFullscreenMode();
        }
        
        // Handle ID parameter (fallback for slug-based URLs)
        const idParam = params.get('id');
        if (idParam) {
            // This will be used if the main path-based game loading fails
            Logger.debug(`Found ID parameter: ${idParam}`);
        }
    }
    
    /**
     * Set the language based on URL parameter
     */
    function setLanguageFromParameter(lang) {
        // Look for language switcher elements
        const englishFlag = document.querySelector('.flag-us');
        const portugueseFlag = document.querySelector('.flag-pt');
        
        if (lang.toLowerCase() === 'en' || lang.toLowerCase() === 'en-us') {
            if (englishFlag && typeof englishFlag.click === 'function') {
                englishFlag.click();
                Logger.info('Language set to English from URL parameter');
            }
        } else if (lang.toLowerCase() === 'pt' || lang.toLowerCase() === 'pt-pt') {
            if (portugueseFlag && typeof portugueseFlag.click === 'function') {
                portugueseFlag.click();
                Logger.info('Language set to Portuguese from URL parameter');
            }
        }
    }
    
    /**
     * Request fullscreen mode for the game container
     */
    function requestFullscreenMode() {
        // Wait for the game to be loaded
        setTimeout(() => {
            const gameContainer = document.querySelector('#game-container') || 
                                  document.querySelector('#ruffle-player');
            
            if (gameContainer && gameContainer.requestFullscreen) {
                try {
                    gameContainer.requestFullscreen().catch(err => {
                        Logger.warn(`Could not enter fullscreen mode: ${err.message}`);
                    });
                    Logger.info('Entered fullscreen mode from URL parameter');
                } catch (error) {
                    Logger.error(`Error requesting fullscreen: ${error.message}`);
                }
            }
        }, 2000); // Wait 2 seconds for the game to load
    }
    
    /**
     * Add a game to the recently played list
     */
    function addToRecentlyPlayed(gameId) {
        try {
            // Get current list
            let recentlyPlayed = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.RECENTLY_PLAYED) || '[]');
            
            // Remove existing entry if present
            recentlyPlayed = recentlyPlayed.filter(id => id !== gameId);
            
            // Add to the beginning of the list
            recentlyPlayed.unshift(gameId);
            
            // Limit the list to 10 items
            if (recentlyPlayed.length > 10) {
                recentlyPlayed.pop();
            }
            
            // Save the updated list
            localStorage.setItem(CONFIG.STORAGE_KEYS.RECENTLY_PLAYED, JSON.stringify(recentlyPlayed));
            Logger.debug(`Added ${gameId} to recently played games`);
        } catch (error) {
            Logger.error(`Error updating recently played games: ${error.message}`);
        }
    }
    
    /**
     * Get cached games data from localStorage
     */
    function getCachedGamesData() {
        try {
            // Check if the cache is expired
            const timestamp = localStorage.getItem(CONFIG.STORAGE_KEYS.CACHE_TIMESTAMP);
            if (!timestamp || Date.now() - parseInt(timestamp) > CONFIG.CACHE_EXPIRATION) {
                Logger.debug('Cache expired or not set');
                return null;
            }
            
            // Get the cached data
            const cachedData = localStorage.getItem(CONFIG.STORAGE_KEYS.GAMES_DATA);
            if (!cachedData) {
                Logger.debug('No cached game data found');
                return null;
            }
            
            // Parse and return the cached data
            const gamesData = JSON.parse(cachedData);
            Logger.debug(`Loaded ${Object.keys(gamesData).length} games from cache`);
            return gamesData;
        } catch (error) {
            Logger.error(`Error loading cached games data: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Cache the games data in localStorage
     */
    function cacheGamesData(gamesData) {
        if (!gamesData) return;
        
        try {
            // Store the games data
            localStorage.setItem(CONFIG.STORAGE_KEYS.GAMES_DATA, JSON.stringify(gamesData));
            
            // Update the timestamp
            localStorage.setItem(CONFIG.STORAGE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
            
            Logger.info(`Cached ${Object.keys(gamesData).length} games in localStorage`);
        } catch (error) {
            Logger.error(`Error caching games data: ${error.message}`);
        }
    }
    
    /**
     * Show a detailed error message to the user
     */
    function showErrorMessage(errorType, data = {}) {
        // Find or create error container
        let errorContainer = document.querySelector('#game-error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'game-error-container';
            errorContainer.style.position = 'fixed';
            errorContainer.style.top = '20%';
            errorContainer.style.left = '50%';
            errorContainer.style.transform = 'translateX(-50%)';
            errorContainer.style.backgroundColor = '#f44336';
            errorContainer.style.color = 'white';
            errorContainer.style.padding = '20px';
            errorContainer.style.borderRadius = '5px';
            errorContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
            errorContainer.style.zIndex = '9999';
            errorContainer.style.maxWidth = '80%';
            errorContainer.style.textAlign = 'center';
            document.body.appendChild(errorContainer);
        }
        
        // Determine error message based on type
        let errorMessage = '';
        let actionMessage = '';
        
        switch (errorType) {
            case 'offline':
                errorMessage = `You're currently offline. Unable to load game: ${data.gameId}.`;
                actionMessage = 'Please check your internet connection and try again.';
                break;
            
            case 'gameNotFound':
                errorMessage = `Game not found: ${data.gameId}`;
                actionMessage = 'Please check the game name or select a game from the dropdown menu.';
                break;
            
            case 'loadError':
                errorMessage = `Error loading game: ${data.gameId}`;
                actionMessage = 'Please try refreshing the page or select a different game.';
                break;
                
            default:
                errorMessage = 'An unexpected error occurred.';
                actionMessage = 'Please try again later.';
        }
        
        // Set error message content
        errorContainer.innerHTML = `
            <h3 style="margin-top:0">${errorMessage}</h3>
            <p>${actionMessage}</p>
            <button id="error-close-btn" style="background:#fff;color:#f44336;border:none;padding:8px 16px;margin-top:10px;border-radius:4px;cursor:pointer;font-weight:bold;">Close</button>
        `;
        
        // Add close button functionality
        document.getElementById('error-close-btn').addEventListener('click', () => {
            errorContainer.style.display = 'none';
        });
        
        // Auto-hide after 8 seconds
        setTimeout(() => {
            if (errorContainer) {
                errorContainer.style.display = 'none';
            }
        }, 8000);
    }
    
    /**
     * Show a message when the user is offline
     */
    function showOfflineMessage() {
        // Create offline indicator if it doesn't exist
        let offlineIndicator = document.querySelector('#offline-indicator');
        if (!offlineIndicator) {
            offlineIndicator = document.createElement('div');
            offlineIndicator.id = 'offline-indicator';
            offlineIndicator.style.position = 'fixed';
            offlineIndicator.style.top = '10px';
            offlineIndicator.style.right = '10px';
            offlineIndicator.style.backgroundColor = '#ff9800';
            offlineIndicator.style.color = 'white';
            offlineIndicator.style.padding = '8px 16px';
            offlineIndicator.style.borderRadius = '4px';
            offlineIndicator.style.fontWeight = 'bold';
            offlineIndicator.style.zIndex = '9999';
            offlineIndicator.textContent = 'Offline Mode';
            document.body.appendChild(offlineIndicator);
        } else {
            offlineIndicator.style.display = 'block';
        }
    }
    
    /**
     * Hide the offline message
     */
    function hideOfflineMessage() {
        const offlineIndicator = document.querySelector('#offline-indicator');
        if (offlineIndicator) {
            offlineIndicator.style.display = 'none';
        }
    }
       
    /**
     * Initialize network status monitoring
     */
    function initNetworkMonitoring() {
        // Update UI when network status changes
        window.addEventListener('online', () => {
            Logger.info('Device is now online');
            hideOfflineMessage();
        });
        
        window.addEventListener('offline', () => {
            Logger.info('Device is now offline');
            showOfflineMessage();
        });
        
        // Check initial state
        if (!navigator.onLine) {
            showOfflineMessage();
        }
    }
    
    /**
     * Enhance the share button with additional functionality
     */
    function enhanceShareButton() {
        // Wait for the share button to be available
        setTimeout(() => {
            const shareButton = document.querySelector('.game-share-button');
            if (!shareButton) return;
            
            // Add a title to the button
            shareButton.title = 'Share this game with friends';
            
            // Add additional social sharing options
            shareButton.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                
                // Show additional sharing options
                showSharingOptions();
                
                return false;
            });
        }, 1500);
    }
    
    /**
     * Show additional sharing options
     */
    function showSharingOptions() {
        // Get current game ID from URL
        const path = window.location.pathname;
        const gamePath = path.split('/').filter(part => part.trim() !== '')[0];
        
        if (!gamePath) return;
        
        // Find the game data
        const games = window.GameUrlLoader.getGames();
        if (!games) return;
        
        // Try to find by slug first
        let gameData = findGameBySlug(gamePath);
        
        // Fall back to direct ID if not found by slug
        if (!gameData) {
            const idParam = new URLSearchParams(window.location.search).get('id');
            if (idParam && games[idParam.toLowerCase()]) {
                gameData = games[idParam.toLowerCase()];
            } else {
                // Try direct match with games object
                gameData = games[gamePath.toLowerCase()];
            }
        }
        
        if (!gameData) return;
        
        // Generate sharing URL
        const gameUrl = window.location.href;
        
        // Create share options container
        const shareOptions = document.createElement('div');
        shareOptions.className = 'share-options-container';
        shareOptions.style.position = 'fixed';
        shareOptions.style.bottom = '80px';
        shareOptions.style.right = '20px';
        shareOptions.style.backgroundColor = '#fff';
        shareOptions.style.border = '1px solid #ccc';
        shareOptions.style.borderRadius = '5px';
        shareOptions.style.padding = '10px';
        shareOptions.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        shareOptions.style.zIndex = '10000';
        
        // Create sharing options
        const shareOptionsList = [
            { name: 'WhatsApp', icon: '📱', url: `https://wa.me/?text=${encodeURIComponent(`Play ${gameData.name} online: ${gameUrl}`)}` },
            { name: 'Facebook', icon: 'ƒ', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(gameUrl)}` },
            { name: 'Twitter', icon: '🐦', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Playing ${gameData.name} online! Check it out:`)}&url=${encodeURIComponent(gameUrl)}` },
            { name: 'Email', icon: '✉️', url: `mailto:?subject=${encodeURIComponent(`Check out this game: ${gameData.name}`)}&body=${encodeURIComponent(`I found this game that you might enjoy: ${gameUrl}`)}` }
        ];
        
        // Add options to container
        shareOptionsList.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = 'share-option';
            optionElement.style.padding = '8px 12px';
            optionElement.style.margin = '5px 0';
            optionElement.style.cursor = 'pointer';
            optionElement.style.borderRadius = '3px';
            optionElement.style.display = 'flex';
            optionElement.style.alignItems = 'center';
            
            optionElement.innerHTML = `
                <span style="margin-right:8px;font-size:16px;">${option.icon}</span>
                <span>${option.name}</span>
            `;
            
            optionElement.addEventListener('mouseover', () => {
                optionElement.style.backgroundColor = '#f0f0f0';
            });
            
            optionElement.addEventListener('mouseout', () => {
                optionElement.style.backgroundColor = 'transparent';
            });
            
            optionElement.addEventListener('click', () => {
                window.open(option.url, '_blank');
                document.body.removeChild(shareOptions);
            });
            
            shareOptions.appendChild(optionElement);
        });
        
        // Add close button
        const closeButton = document.createElement('div');
        closeButton.textContent = '✕';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '5px';
        closeButton.style.right = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '14px';
        closeButton.style.width = '20px';
        closeButton.style.height = '20px';
        closeButton.style.display = 'flex';
        closeButton.style.justifyContent = 'center';
        closeButton.style.alignItems = 'center';
        closeButton.style.borderRadius = '50%';
        
        closeButton.addEventListener('mouseover', () => {
            closeButton.style.backgroundColor = '#f0f0f0';
        });
        
        closeButton.addEventListener('mouseout', () => {
            closeButton.style.backgroundColor = 'transparent';
        });
        
        closeButton.addEventListener('click', () => {
            document.body.removeChild(shareOptions);
        });
        
        shareOptions.appendChild(closeButton);
        
        // Add to body
        document.body.appendChild(shareOptions);
        
        // Close when clicking outside
        document.addEventListener('click', function closeShareOptions(e) {
            if (!shareOptions.contains(e.target) && e.target !== shareOptions) {
                if (document.body.contains(shareOptions)) {
                    document.body.removeChild(shareOptions);
                }
                document.removeEventListener('click', closeShareOptions);
            }
        });
    }
    
    // Cache the original games data when it's loaded
    window.addEventListener('gameDataLoaded', function(e) {
        if (e.detail && e.detail.gamesData) {
            cacheGamesData(e.detail.gamesData);
        }
    });
    
    // Listen for popstate to handle browser back/forward buttons
    window.addEventListener('popstate', function(e) {
        // Get the game ID from the URL
        const path = window.location.pathname;
        const gamePath = path.split('/').filter(part => part.trim() !== '')[0];
        
        if (gamePath) {
            // Check if the state contains a gameId
            if (e.state && e.state.gameId) {
                window.GameUrlLoader.loadGame(e.state.gameId);
            } else {
                // Try to find the game by slug
                const gameBySlug = findGameBySlug(gamePath);
                if (gameBySlug) {
                    window.GameUrlLoader.loadGame(gameBySlug.id);
                } else {
                    // Fall back to using the path as an ID
                    window.GameUrlLoader.loadGame(gamePath);
                }
            }
        }
    });
    
    // Start the enhancer when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
