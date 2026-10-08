// js/config.js
// Project API Keys Configurations

const CONFIG = {
  GOOGLE_AI_STUDIO_KEY: 'YOUR_GOOGLE_AI_STUDIO_KEY',
  GOOGLE_MAPS_KEY: 'YOUR_GOOGLE_MAPS_KEY'
};
window.CONFIG = CONFIG;

const MapHelper = {
  isGoogleMapsAvailable() {
    const key = (window.CONFIG && window.CONFIG.GOOGLE_MAPS_KEY) || '';
    const hasValidKey = key.length > 10 && !key.startsWith('YOUR_') && key !== 'REDACTED_GOOGLE_API_KEY';
    return hasValidKey && typeof google !== 'undefined' && typeof google.maps !== 'undefined' && !window.googleMapsFailed;
  }
};
window.MapHelper = MapHelper;


