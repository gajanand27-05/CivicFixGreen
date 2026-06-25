// js/config.js
// Project API Keys Configurations

const CONFIG = {
  GOOGLE_AI_STUDIO_KEY: 'YOUR_GOOGLE_AI_STUDIO_KEY',
  GOOGLE_MAPS_KEY: 'YOUR_GOOGLE_MAPS_KEY'
};
window.CONFIG = CONFIG;

const MapHelper = {
  isGoogleMapsAvailable() {
    return typeof google !== 'undefined' && typeof google.maps !== 'undefined' && !window.googleMapsFailed;
  }
};
window.MapHelper = MapHelper;

