# Patch 1.0: URL Engine Enhancement

## Overview
This patch introduces significant improvements to the URL engine system (formerly known as Game URL Loader), enhancing user experience, SEO, and error handling. It provides a non-invasive extension of the original functionality while maintaining full compatibility with existing features.

## Release Date
August 16, 2025

## Changelog

### URL Handling and SEO Improvements

#### SEO-Friendly URL Slugs
- **Added**: Automatic conversion of game names to URL-friendly slugs
- **Before**: `jogos.ipv7.pt/Bad_Ice_Cream`
- **After**: `jogos.ipv7.pt/bad-ice-cream?id=Bad_Ice_Cream`
- **Benefits**: Improved search engine visibility and more user-friendly URLs

#### Browser History Integration
- **Added**: History API integration to update URLs without page refresh
- **Added**: Full support for browser back/forward navigation between games
- **Added**: State preservation when navigating between games

#### URL Parameters Support
- **Added**: Support for `?lang=pt-pt` or `?lang=en-us` to control site language
- **Added**: Support for `?fullscreen=true` parameter to start games in fullscreen mode
- **Added**: Automatic language switching based on URL parameters
- **Added**: Backward compatibility with original ID-based URLs

### Performance Enhancements

#### Local Storage Caching
- **Added**: Client-side caching of game data in localStorage
- **Added**: Cache expiration after 24 hours to ensure fresh data
- **Added**: Recently played games tracking for quicker access to favorites
- **Added**: Automatic cache invalidation when games are updated

### Error Handling and Resilience

#### Enhanced Error Recovery
- **Added**: Improved fallback mechanisms when a game fails to load
- **Added**: Multiple loading strategies (by ID, by slug, direct path)
- **Added**: Clear, user-friendly error messages with suggested actions

#### Network Status Detection
- **Added**: Real-time monitoring of online/offline status
- **Added**: Visual indicator when device goes offline
- **Added**: Graceful handling of offline state with appropriate messaging

#### Detailed Error Reporting
- **Added**: User-friendly error messages for various failure scenarios
- **Added**: Visual error display with actionable information
- **Added**: Auto-dismissing error notifications after 8 seconds
- **Added**: Option to manually dismiss error messages

### Sharing Enhancements

#### Improved Social Sharing
- **Added**: Extended share options via right-click on the share button
- **Added**: Direct sharing to WhatsApp, Facebook, Twitter, and Email
- **Added**: Proper sharing messages with game name and URL
- **Added**: Mobile-friendly sharing interface

## Technical Details

### Integration Method
- Non-invasive wrapper around the original url-engine API
- No modifications to core files required
- Backward compatible with all existing features

### Browser Compatibility
- Compatible with all modern browsers: Chrome, Firefox, Safari, Edge
- Graceful degradation in older browsers

### Dependencies
- No additional libraries required
- Pure vanilla JavaScript implementation

## Known Issues
- Custom fullscreen mode may not work on iOS due to browser restrictions
- Twitter sharing now uses "X" branding but the API endpoint remains unchanged

## Credits
- Development: XperiaCDN Team
- Testing: Flash Game Preservation Group
- Special thanks to the Ruffle Project contributors
