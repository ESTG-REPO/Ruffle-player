// Will store the list of Nitrome games loaded from JSON
let nitromeGames = [];
let translations = {};
let currentLanguage = 'en-us';

// Load translations
async function loadTranslations() {
    try {
        // First, check if there's a preferred language in localStorage
        const savedLanguage = localStorage.getItem('preferredLanguage');
        if (savedLanguage && (savedLanguage === 'en-us' || savedLanguage === 'pt-pt')) {
            currentLanguage = savedLanguage;
            console.log(`Using saved language preference: ${currentLanguage}`);
        } else {
            // Default to Portuguese instead of using browser language
            currentLanguage = 'pt-pt';
            console.log(`Using default Portuguese language`);
        }
        
        // Load translations file
        const response = await fetch('translations.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        translations = await response.json();
        console.log('Translations loaded successfully');
    } catch (error) {
        console.error('Error loading translations:', error);
        translations = {
            'en-us': {}, // Fallback empty translations
            'pt-pt': {}  // Fallback empty translations
        };
    }
}

// Get translation for a key
function _(key) {
    if (translations[currentLanguage] && translations[currentLanguage][key]) {
        return translations[currentLanguage][key];
    }
    // Fallback to English if translation not found
    if (translations['en-us'] && translations['en-us'][key]) {
        return translations['en-us'][key];
    }
    // Return the key if no translation found
    return key;
}

// Update all translatable elements on the page
function updatePageLanguage() {
    // Update static elements with their translations
    document.querySelector('.sample-file label').textContent = _('selectGame');
    
    // Update the first option in the game selector
    const firstOption = document.querySelector('#game-selector option:first-child');
    if (firstOption) {
        firstOption.textContent = _('selectGameOption');
    }
    
    document.querySelector('.author-info span:first-child').textContent = _('poweredBy');
    
    // Update any dynamic content
    if (currentGame) {
        // If a game is loaded, update its info panel
        const game = nitromeGames.find(g => g.id === currentGame);
        updateInfoPanel(currentGame, game?.path, game?.name);
    } else {
        // Otherwise update the default info panel
        updateInfoPanel(null, null, null);
    }
    
    // Update default overlay if it exists
    const overlay = document.querySelector('.default-overlay');
    if (overlay) {
        const imgAlt = overlay.querySelector('img');
        if (imgAlt) {
            imgAlt.alt = _('nitromeTitleArchive');
        }
        
        // Update or add the instruction text
        let instructionText = overlay.querySelector('p');
        if (!instructionText) {
            instructionText = document.createElement('p');
            overlay.appendChild(instructionText);
        }
        instructionText.textContent = _('selectGameToPlay');
    }
    
    // Store the language preference in localStorage for future visits
    localStorage.setItem('preferredLanguage', currentLanguage);
    
    // Update the active flag indicator
    document.querySelector('.flag-us').classList.toggle('active', currentLanguage === 'en-us');
    document.querySelector('.flag-pt').classList.toggle('active', currentLanguage === 'pt-pt');
}

// Function to load games from JSON file
async function loadGamesFromJSON() {
    try {
        const response = await fetch('games.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        nitromeGames = data.nitromeGames || [];
        console.log(`Loaded ${nitromeGames.length} games from JSON`);
        
        // After loading the games, populate the dropdown
        populateGameDropdown();
        
        // Check if on mobile
        const isMobile = window.innerWidth <= 768;
        
        // Update mobile class on the player container
        if (isMobile) {
            rufflePlayer.classList.add('mobile-view');
        } else {
            rufflePlayer.classList.remove('mobile-view');
        }
        
        // Load the Ruffle logo animation by default
        try {
            const ruffle = window.RufflePlayer.newest();
            const player = ruffle.createPlayer();
            player.id = 'ruffle-instance';
            rufflePlayer.innerHTML = ''; // Clear any existing content
            rufflePlayer.appendChild(player);
            
            // Load the logo animation SWF file
            player.load({ 
                url: 'ruffle-assets/logo-anim.swf', 
                backgroundColor: "#000000"
            });
            
            // Save reference to the player
            currentPlayer = player;
            
            // Add a message below the player
            const messageElement = document.createElement('div');
            messageElement.className = 'default-message';
            messageElement.textContent = _('selectGameToPlay');
            rufflePlayer.appendChild(messageElement);
        } catch (error) {
            console.error("Failed to initialize default Ruffle player:", error);
            // Fallback to the static image if loading the SWF fails
            if (isMobile) {
                // Mobile version with logo SVG
                rufflePlayer.innerHTML = `
                    <div class="default-overlay">
                        <img src="images/logo.svg" alt="${_('nitromeTitleArchive')}" class="logo-mobile">
                        <p>${_('selectGameToPlay')}</p>
                    </div>
                `;
            } else {
                // Desktop version with default.png
                rufflePlayer.innerHTML = `
                    <div class="default-overlay">
                        <img src="images/default.png" alt="${_('nitromeTitleArchive')}">
                        <p>${_('selectGameToPlay')}</p>
                    </div>
                `;
            }
        }
        
        // Update info panel with ready status
        updateInfoPanel(null, null, null);
    } catch (error) {
        console.error('Error loading games from JSON:', error);
        rufflePlayer.innerHTML = `<div class="error-message">${_('errorLoading')} ${error.message}</div>`;
    }
}

// DOM Elements
let currentPlayer = null;
let currentGame = null;
let rufflePlayer = null;
let infoButton = null;
let gameSelector = null;

// Load a game into the Ruffle player
async function loadGame(gameId) {
    // Track if this is the first game loaded
    const isFirstGameLoad = !currentPlayer;
    
    // Find the game in our list
    const game = nitromeGames.find(g => g.id === gameId);
    if (!game) {
        console.error("Game not found:", gameId);
        rufflePlayer.innerHTML = `<div class="error-message">${_('gameNotFound')} ${gameId}</div>`;
        return;
    }
    
    currentGame = gameId;
    
    // Use the game name from our JSON
    const gameName = game.name;
    
    // Use the path from our JSON
    const gamePath = game.path;
    
    // Check if the game file actually exists
    try {
        const checkResponse = await fetch(gamePath, { method: 'HEAD' });
        if (!checkResponse.ok) {
            console.error(`Game file not found: ${gamePath}`);
            rufflePlayer.innerHTML = `<div class="error-message">${_('fileNotFound')} ${gameName}</div>`;
            return;
        }
    } catch (error) {
        console.error(`Error checking game file: ${error}`);
        rufflePlayer.innerHTML = `<div class="error-message">${_('errorAccessing')} ${gameName}</div>`;
        return;
    }
    
    // Clear existing player and show loading message
    rufflePlayer.innerHTML = `<div class="loading-message">${_('loading')} ${gameName}...</div>`;
    
    // Create new Ruffle player
    try {
        const ruffle = window.RufflePlayer.newest();
        const player = ruffle.createPlayer();
        player.id = 'ruffle-instance';
        rufflePlayer.innerHTML = ''; // Clear the loading message
        rufflePlayer.appendChild(player);
        
        // Remove any mobile-specific classes from the player container
        // This ensures the game displays correctly regardless of mobile/desktop
        rufflePlayer.classList.remove('mobile-view');
        
        // Add event listeners for errors
        player.addEventListener('error', (event) => {
            console.error("Ruffle error:", event.error);
            rufflePlayer.innerHTML = `<div class="error-message">${_('failedLoad')} ${event.error}</div>`;
        });
        
        // Load the game SWF file from the path in our JSON
        player.load({ 
            url: gamePath, 
            backgroundColor: "#FFFFFF"
        });
        
        // Update the info panel
        updateInfoPanel(gameId, gamePath, gameName);
        
        // Save reference to the player
        currentPlayer = player;
    } catch (error) {
        console.error("Failed to initialize Ruffle player:", error);
        rufflePlayer.innerHTML = `<div class="error-message">${_('failedInit')} ${error.message}</div>`;
    }
}

// Update the information panel with game info
function updateInfoPanel(gameId, gamePath, gameName) {
    const infoPanel = document.querySelector('.info-panel');
    
    if (!gameId) {
        // Default info panel when no game is loaded
        const infoHTML = `
            <div class="info-row">
                <span class="info-label">${_('archive')}</span>
                <span class="info-value">${_('nitromeGames')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">${_('status')}</span>
                <span class="info-value">${_('ready')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">${_('player')}</span>
                <span class="info-value">Ruffle</span>
            </div>
            <div class="info-row">
                <span class="info-label">${_('source')}</span>
                <span class="info-value">cdn.xperia.pt</span>
            </div>
        `;
        infoPanel.innerHTML = infoHTML;
        return;
    }
    
    // Use the provided game name or format it from ID if not provided
    const displayName = gameName || gameId.replace(/_/g, ' ');
    
    // Update info panel values with basic info
    const infoHTML = `
        <div class="info-row">
            <span class="info-label">${_('game')}</span>
            <span class="info-value">${displayName}</span>
        </div>
        <div class="info-row">
            <span class="info-label">${_('swfPath')}</span>
            <span class="info-value">${gamePath}</span>
        </div>
        <div class="info-row">
            <span class="info-label">${_('source')}</span>
            <span class="info-value">cdn.xperia.pt</span>
        </div>
        <div class="info-row">
            <span class="info-label">${_('publisher')}</span>
            <span class="info-value">${_('nitrome')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">${_('player')}</span>
            <span class="info-value">Ruffle</span>
        </div>
    `;
    
    infoPanel.innerHTML = infoHTML;
}

// Toggle the info panel
function toggleInfoPanel() {
    const infoPanel = document.querySelector('.ruffle-info');
    if (infoPanel.style.display === "none") {
        infoPanel.style.display = "block";
    } else {
        infoPanel.style.display = "none";
    }
}

// Scan to check for game files
async function scanGameFiles() {
    console.log("Scanning for Nitrome games...");
    
    try {
        // We'll use HEAD requests to check if the files exist
        const foundGames = [];
        const missingGames = [];
        
        // Check each game in our JSON list
        for (const game of nitromeGames) {
            const gamePath = game.path;
            
            try {
                const response = await fetch(gamePath, { method: 'HEAD' });
                if (response.ok) {
                    foundGames.push(game.name);
                } else {
                    missingGames.push(game.name);
                }
            } catch (error) {
                missingGames.push(game.name);
            }
        }
        
        console.log(`Found ${foundGames.length} games`);
        console.log(`Missing ${missingGames.length} games`);
        
        // Update the info panel with scan results
        const infoPanel = document.querySelector('.info-panel');
        if (infoPanel) {
            const currentContent = infoPanel.innerHTML;
            infoPanel.innerHTML = currentContent + `
                <div class="info-row">
                    <span class="info-label">Found Games:</span>
                    <span class="info-value">${foundGames.length}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Missing Games:</span>
                    <span class="info-value">${missingGames.length}</span>
                </div>
            `;
        }
        
        // If we have missing games, log them to console
        if (missingGames.length > 0) {
            console.log('Missing games:', missingGames);
        }
        
    } catch (error) {
        console.error('Error scanning game files:', error);
    }
}

// Populate the game dropdown from the nitromeGames array
function populateGameDropdown() {
    const gameSelector = document.getElementById('game-selector');
    if (!gameSelector) return;
    
    // Clear existing options except the first one
    while (gameSelector.options.length > 1) {
        gameSelector.remove(1);
    }
    
    // Add the games to the dropdown
    nitromeGames.forEach(game => {
        const option = document.createElement('option');
        option.value = game.id;
        option.textContent = game.name; // Use the name from JSON
        gameSelector.appendChild(option);
    });
    
    console.log(`Populated dropdown with ${nitromeGames.length} games`);
}

// Handle game selection
function handleGameSelection() {
    const selectedGameId = this.value;
    if (selectedGameId) {
        loadGame(selectedGameId);
    }
}

    // Expose loadGame function globally so it can be used by game-url-loader.js
    window.loadGame = loadGame;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Set up Ruffle configuration
    window.RufflePlayer = window.RufflePlayer || {};
    window.RufflePlayer.config = {
        // Ruffle configuration options
        autoplay: "on",
        unmuteOverlay: "hidden",
        backgroundColor: "#FFFFFF",
        letterbox: "on",
        wmode: "direct"
    };
    
    // Initialize DOM elements
    rufflePlayer = document.getElementById('ruffle-player');
    infoButton = document.getElementById('info-btn');
    gameSelector = document.getElementById('game-selector');
    
    // Check if on mobile and add class to the player container
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        rufflePlayer.classList.add('mobile-view');
    } else {
        rufflePlayer.classList.remove('mobile-view');
    }
    
    // Load translations first
    await loadTranslations();
    
    // Set up language switchers
    document.querySelector('.flag-us').addEventListener('click', function() {
        if (currentLanguage !== 'en-us') {
            currentLanguage = 'en-us';
            updatePageLanguage();
        }
    });
    
    document.querySelector('.flag-pt').addEventListener('click', function() {
        if (currentLanguage !== 'pt-pt') {
            currentLanguage = 'pt-pt';
            updatePageLanguage();
        }
    });
    
    // Show the default animation while loading
    try {
        const ruffle = window.RufflePlayer.newest();
        const player = ruffle.createPlayer();
        player.id = 'ruffle-instance';
        rufflePlayer.innerHTML = ''; // Clear any existing content
        rufflePlayer.appendChild(player);
        
        // Add a loading message below the player
        const messageElement = document.createElement('div');
        messageElement.className = 'default-message';
        messageElement.textContent = _('loadingGames');
        rufflePlayer.appendChild(messageElement);
        
        // Load the logo animation SWF file
        player.load({ 
            url: 'ruffle-assets/logo-anim.swf', 
            backgroundColor: "#000000"
        });
        
        // Save reference to the player
        currentPlayer = player;
    } catch (error) {
        console.error("Failed to initialize default Ruffle player:", error);
        // Fallback to the static image if loading the SWF fails
        if (isMobile) {
            // Mobile version with logo SVG
            rufflePlayer.innerHTML = `
                <div class="default-overlay">
                    <img src="images/logo.svg" alt="${_('nitromeTitleArchive')}" class="logo-mobile">
                    <p>${_('loadingGames')}</p>
                </div>
            `;
        } else {
            // Desktop version with default.png
            rufflePlayer.innerHTML = `
                <div class="default-overlay">
                    <img src="images/default.png" alt="${_('nitromeTitleArchive')}">
                    <p>${_('loadingGames')}</p>
                </div>
            `;
        }
    }
    
    // Listen for window resize events to update the overlay and mobile class
    window.addEventListener('resize', function() {
        const isMobile = window.innerWidth <= 768;
        
        // Add or remove mobile-view class as needed
        if (isMobile) {
            rufflePlayer.classList.add('mobile-view');
        } else {
            rufflePlayer.classList.remove('mobile-view');
        }
        
        // Only update overlay if no game is loaded and we're showing the default image overlay
        if (!currentGame && rufflePlayer.querySelector('.default-overlay')) {
            const overlay = rufflePlayer.querySelector('.default-overlay');
            const img = overlay.querySelector('img');
            
            if (isMobile) {
                img.src = 'images/logo.svg';
                img.classList.add('logo-mobile');
            } else {
                img.src = 'images/default.png';
                img.classList.remove('logo-mobile');
            }
        }
        
        // Note: we don't need to reload the SWF on resize, Ruffle handles this automatically
    });
    
    // Show info panel by default
    const infoPanel = document.querySelector('.ruffle-info');
    infoPanel.style.display = "block";
    
    // Initialize info panel with loading status
    const infoPanel2 = document.querySelector('.info-panel');
    infoPanel2.innerHTML = `
        <div class="info-row">
            <span class="info-label">${_('archive')}</span>
            <span class="info-value">${_('nitromeGames')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">${_('status')}</span>
            <span class="info-value">${_('loadingGames')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">${_('player')}</span>
            <span class="info-value">Ruffle</span>
        </div>
        <div class="info-row">
            <span class="info-label">${_('source')}</span>
            <span class="info-value">cdn.xperia.pt</span>
        </div>
    `;
    
    // Setup event listeners
    gameSelector.addEventListener('change', handleGameSelection);
    infoButton.addEventListener('click', toggleInfoPanel);
    
    // Apply initial language to the UI
    updatePageLanguage();
    
    // Load games from JSON file
    loadGamesFromJSON();
});
