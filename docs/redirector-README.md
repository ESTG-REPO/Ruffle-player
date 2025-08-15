# URL Redirector Module

This module intercepts and redirects requests from various URLs to their new locations for use with Ruffle JS emulator games.

## Redirected URLs

The redirector handles the following URL redirections:

1. `https://cdn.nitrome.com/components/NitromeAPI.pkg` → `https://cdn.xperia.pt/NitromeAPI.pkg`
2. `https://jogos.ipv7.pt/txtGDE.swf` → `https://cdn.xperia.pt/laserquest/txtGDE.swf`
3. `https://jogos.ipv7.pt/faq.swf` → `https://cdn.xperia.pt/laserquest/faq.swf`
4. `https://jogos.ipv7.pt/hora.swf` → `https://cdn.xperia.pt/laserquest/hora.swf`
5. `https://jogos.ipv7.pt/nov.swf` → `https://cdn.xperia.pt/laserquest/nov.swf`

## How It Works

The redirector module intercepts four types of requests:

1. **XMLHttpRequest** calls
2. **Fetch API** requests 
3. **Script tag src** attributes
4. **Embed/Object tag src/data** attributes (for SWF files)

When any of these methods try to access the original URLs, the module transparently redirects them to your custom URLs.

## Installation

1. Add the script to your HTML page **before** loading any game files or Ruffle:

```html
<script src="js/redirector.js"></script>
```

2. Make sure this script loads before any game scripts that might request the redirected URLs.

## Usage with Ruffle

When using with Ruffle emulator:

```html
<!-- First load the redirector -->
<script src="js/redirector.js"></script>

<!-- Then load Ruffle -->
<script src="path/to/ruffle.js"></script>

<!-- Then load or embed your Flash games -->
<div id="game-container">
    <!-- Your game embed code here -->
</div>
```

## Verifying It Works

Open your browser's developer console (F12) to see log messages showing when requests are intercepted and redirected. You should see messages like:

```
[URL Redirector] Module loaded and active
[URL Redirector] All redirection mechanisms initialized successfully
[URL Redirector] Redirecting: https://jogos.ipv7.pt/faq.swf → https://cdn.xperia.pt/laserquest/faq.swf
```

## Troubleshooting

If the redirector doesn't seem to be working:

1. Check that the redirector script is loaded before any game scripts
2. Verify in the console that the "[URL Redirector] Module loaded and active" message appears
3. Clear your browser cache and reload the page
4. Make sure your custom URLs are actually serving the content needed by the games

## Customization

You can modify the script to redirect additional URLs by editing the `urlMappings` array at the top of the file. Each mapping should have a `from` and `to` property representing the original and new URLs.
