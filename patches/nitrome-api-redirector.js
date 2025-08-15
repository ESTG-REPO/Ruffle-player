/**
 * Nitrome API Smart Patch Module
 * Redirects requests from https://cdn.nitrome.com/components/NitromeAPI.pkg to https://cdn.xperia.pt/NitromeAPI.pkg
 * 
 * This patch module intercepts XMLHttpRequest and fetch requests to redirect them properly.
 */

(function() {
    console.log('[Nitrome Patch] Module loaded and active');

    // Store the original XMLHttpRequest open method
    const originalXHROpen = XMLHttpRequest.prototype.open;

    // Override XMLHttpRequest open method
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        // Check if the URL matches the one we want to patch
        if (typeof url === 'string' && url.includes('https://cdn.nitrome.com/components/NitromeAPI.pkg')) {
            const newUrl = url.replace('https://cdn.nitrome.com/components/NitromeAPI.pkg', 'https://cdn.xperia.pt/NitromeAPI.pkg');
            console.log('[Nitrome Patch] Redirecting XMLHttpRequest:', url, '→', newUrl);
            
            // Call the original open method with the new URL
            return originalXHROpen.call(this, method, newUrl, async, user, password);
        }
        
        // Call the original open method for other URLs
        return originalXHROpen.call(this, method, url, async, user, password);
    };

    // Patch fetch requests if the browser supports it
    if (window.fetch) {
        const originalFetch = window.fetch;
        
        window.fetch = function(resource, init) {
            if (resource && typeof resource === 'string' && resource.includes('https://cdn.nitrome.com/components/NitromeAPI.pkg')) {
                const newUrl = resource.replace('https://cdn.nitrome.com/components/NitromeAPI.pkg', 'https://cdn.xperia.pt/NitromeAPI.pkg');
                console.log('[Nitrome Patch] Redirecting fetch request:', resource, '→', newUrl);
                resource = newUrl;
            } else if (resource && resource instanceof Request && resource.url.includes('https://cdn.nitrome.com/components/NitromeAPI.pkg')) {
                const newUrl = resource.url.replace('https://cdn.nitrome.com/components/NitromeAPI.pkg', 'https://cdn.xperia.pt/NitromeAPI.pkg');
                console.log('[Nitrome Patch] Redirecting fetch Request:', resource.url, '→', newUrl);
                resource = new Request(newUrl, resource);
            }
            
            return originalFetch.call(this, resource, init);
        };
    }

    // Additional patch for dynamically created script tags
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const element = originalCreateElement.call(document, tagName);
        
        if (tagName.toLowerCase() === 'script') {
            const originalSetter = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').set;
            
            Object.defineProperty(element, 'src', {
                set: function(url) {
                    if (typeof url === 'string' && url.includes('https://cdn.nitrome.com/components/NitromeAPI.pkg')) {
                        const newUrl = url.replace('https://cdn.nitrome.com/components/NitromeAPI.pkg', 'https://cdn.xperia.pt/NitromeAPI.pkg');
                        console.log('[Nitrome Patch] Redirecting script src:', url, '→', newUrl);
                        originalSetter.call(this, newUrl);
                    } else {
                        originalSetter.call(this, url);
                    }
                },
                get: Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').get
            });
        }
        
        return element;
    };

    console.log('[Nitrome Patch] All patching mechanisms initialized successfully');
})();
