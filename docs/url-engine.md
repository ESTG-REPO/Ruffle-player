# URL-ENGINE.js

This JavaScript module enables direct game loading via URLs like `jogos.ipv7.pt/<gamename>`, allowing users to share links to specific games without having to navigate through a game selection interface.

## Features

- **Direct URL Access**: Users can access games directly via URLs like `jogos.ipv7.pt/Aquanaut`
- **Case-Insensitive Matching**: URLs work regardless of capitalization
- **Game Information Display**: Shows game name and a shareable link
- **Works with Ruffle**: Fully compatible with the Ruffle Flash emulator
- **API for Developers**: JavaScript API for programmatic game loading

## Installation

1. Include the script in your HTML page before loading Ruffle:

```html
<script src="js/game-url-loader.js"></script>
```

2. Make sure you have a container element for the game with ID `game-container`:

```html
<div id="game-container"></div>
```

3. Ensure your `games.json` file is properly formatted and contains all your games.

## Configuration

You can modify the configuration at the top of the script to customize the behavior:

```javascript
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
```

## JavaScript API

The script exposes a global `GameUrlLoader` object with these methods:

- `loadGame(gameId)`: Loads a specific game by ID
- `getGames()`: Returns all available games
- `getGameUrl(gameId)`: Gets the shareable URL for a specific game

Example usage:

```javascript
// Load a game programmatically
GameUrlLoader.loadGame('Aquanaut');

// Get a list of all games
const games = GameUrlLoader.getGames();

// Get a shareable URL for a game
const shareUrl = GameUrlLoader.getGameUrl('Aquanaut');
```

## Games JSON Format

The loader is designed to work with the following JSON format:

```json
{
  "nitromeGames": [
    {
      "id": "Aquanaut",
      "name": "Aquanaut",
      "path": "https://cdn.xperia.pt/nitrone-games/Aquanaut.swf"
    },
    ...more games...
  ]
}
```

## URL Matching Logic

The loader tries to match the URL to a game in several ways:

1. Direct match with game ID (case-insensitive)
2. Match with URL-friendly version of the game name (spaces replaced with hyphens, etc.)

## Server Configuration

For this to work properly, your web server needs to be configured to redirect all requests to your main index page. Here's an example for Apache in .htaccess:

```
# Redirect all requests to index.html except for actual files and directories
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [L]
```

For Nginx:

```
location / {
    try_files $uri $uri/ /index.html;
}
```

## Example

See `game-loader-example.html` for a working example of how to implement the loader with a game gallery.

