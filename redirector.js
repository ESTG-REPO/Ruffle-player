/**
 * URL Redirector Module
 * Redirects requests from various URLs to their new locations
 * 
 * This module intercepts XMLHttpRequest and fetch requests to redirect them properly.
 */

(function() {
    console.log('[URL Redirector] Module loaded and active');

    // Define URL mappings
    const urlMappings = [
        {
            from: 'https://cdn.nitrome.com/components/NitromeAPI.pkg',
            to: 'https://cdn.xperia.pt/NitromeAPI.pkg'
        },
        {
            from: 'https://jogos.ipv7.pt/txtGDE.swf',
            to: 'https://cdn.xperia.pt/laserquest/txtGDE.swf'
        },
        {
            from: 'https://jogos.ipv7.pt/faq.swf',
            to: 'https://cdn.xperia.pt/laserquest/faq.swf'
        },
        {
            from: 'https://jogos.ipv7.pt/hora.swf',
            to: 'https://cdn.xperia.pt/laserquest/hora.swf'
        },
        {
            from: 'https://jogos.ipv7.pt/nov.swf',
            to: 'https://cdn.xperia.pt/laserquest/nov.swf'
        }
    ];

    // Helper function to redirect URLs
    function redirectUrl(url) {
        if (typeof url !== 'string') return url;
        
        for (const mapping of urlMappings) {
            if (url.includes(mapping.from)) {
                const newUrl = url.replace(mapping.from, mapping.to);
                console.log(`[URL Redirector] Redirecting: ${url} → ${newUrl}`);
                return newUrl;
            }
        }
        
        return url;
    }

    // Store the original XMLHttpRequest open method
    const originalXHROpen = XMLHttpRequest.prototype.open;

    // Override XMLHttpRequest open method
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        const newUrl = redirectUrl(url);
        return originalXHROpen.call(this, method, newUrl, async, user, password);
    };

    // Patch fetch requests if the browser supports it
    if (window.fetch) {
        const originalFetch = window.fetch;
        
        window.fetch = function(resource, init) {
            if (resource && typeof resource === 'string') {
                resource = redirectUrl(resource);
            } else if (resource && resource instanceof Request) {
                const newUrl = redirectUrl(resource.url);
                if (newUrl !== resource.url) {
                    resource = new Request(newUrl, resource);
                }
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
                    const newUrl = redirectUrl(url);
                    originalSetter.call(this, newUrl);
                },
                get: Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').get
            });
        }
        
        // Also patch embed and object tags for SWF files
        if (tagName.toLowerCase() === 'embed' || tagName.toLowerCase() === 'object') {
            const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLEmbedElement.prototype, 'src') 
                ? Object.getOwnPropertyDescriptor(HTMLEmbedElement.prototype, 'src').set 
                : null;
            
            const originalDataSetter = Object.getOwnPropertyDescriptor(HTMLObjectElement.prototype, 'data') 
                ? Object.getOwnPropertyDescriptor(HTMLObjectElement.prototype, 'data').set 
                : null;
            
            if (originalSrcSetter) {
                Object.defineProperty(element, 'src', {
                    set: function(url) {
                        const newUrl = redirectUrl(url);
                        originalSrcSetter.call(this, newUrl);
                    },
                    get: Object.getOwnPropertyDescriptor(HTMLEmbedElement.prototype, 'src').get
                });
            }
            
            if (originalDataSetter) {
                Object.defineProperty(element, 'data', {
                    set: function(url) {
                        const newUrl = redirectUrl(url);
                        originalDataSetter.call(this, newUrl);
                    },
                    get: Object.getOwnPropertyDescriptor(HTMLObjectElement.prototype, 'data').get
                });
            }
        }
        
        return element;
    };

    // Patch for existing embed and object elements
    function patchExistingElements() {
        // Patch existing embed elements
        document.querySelectorAll('embed').forEach(embed => {
            const originalSrc = embed.getAttribute('src');
            if (originalSrc) {
                const newSrc = redirectUrl(originalSrc);
                if (newSrc !== originalSrc) {
                    embed.setAttribute('src', newSrc);
                }
            }
        });
        
        // Patch existing object elements
        document.querySelectorAll('object').forEach(object => {
            const originalData = object.getAttribute('data');
            if (originalData) {
                const newData = redirectUrl(originalData);
                if (newData !== originalData) {
                    object.setAttribute('data', newData);
                }
            }
        });
    }

    // Run the patch for existing elements when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchExistingElements);
    } else {
        patchExistingElements();
    }

    console.log('[URL Redirector] started');
})();
