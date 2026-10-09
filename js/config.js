// js/config.js
// Frontend configuration. All secrets live on the server (server/.env).

const CONFIG = {
  API_BASE: '' // same origin as the FastAPI server
};
window.CONFIG = CONFIG;

const MapHelper = {
  isGoogleMapsAvailable() {
    return false; // Leaflet/OpenStreetMap only; no Maps key in the browser
  }
};
window.MapHelper = MapHelper;
