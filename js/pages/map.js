// js/pages/map.js
// Interactive Map Page Controller (Google Maps JS SDK)

const MapPage = {
  map: null,
  markersGroup: [], // holds standard Google Maps markers
  heatmap: null, // Google Maps HeatmapLayer
  hotspotPolygons: [], // holds Google Maps Polygon objects
  markerClusterer: null, // Google Maps MarkerClusterer instance
  issues: [],
  predictions: [],
  activeLayers: {
    issues: true,
    heatmap: false,
    hotspots: false
  },
  filters: {
    category: 'all',
    status: 'all',
    dateRange: 'all'
  },

  async render() {
    return `
      <div class="map-page-container">
        <!-- Google Maps Container -->
        <div id="main-google-map" class="fullscreen-map" style="width: 100%; height: 100vh;"></div>

        <!-- Layer Toggle Panel (Top Right) -->
        <div class="map-layer-toggle card">
          <h4>Map Layers</h4>
          <label class="checkbox-container">
            <input type="checkbox" id="layer-issues" checked>
            <span class="checkmark"></span>
            Issues Layer
          </label>
          <label class="checkbox-container">
            <input type="checkbox" id="layer-heatmap">
            <span class="checkmark"></span>
            Heatmap Layer
          </label>
          <label class="checkbox-container">
            <input type="checkbox" id="layer-hotspots">
            <span class="checkmark"></span>
            AI Hotspots
          </label>
        </div>

        <!-- Floating Action Button -->
        <button class="fab-report" id="map-fab-report" title="Report Issue Here">
          <i data-lucide="plus"></i>
          <span>Report Here</span>
        </button>

        <!-- Slide Up Filter Panel -->
        <div class="map-filter-panel" id="map-filter-sheet">
          <div class="filter-panel-header" id="filter-sheet-drag">
            <div class="drag-handle"></div>
            <h3>Filter Map Pins</h3>
          </div>
          <div class="filter-panel-body">
            <div class="form-row">
              <div class="form-group half-width">
                <label for="map-filter-category">Category</label>
                <select id="map-filter-category" class="form-control">
                  <option value="all">All Categories</option>
                  <option value="pothole">Potholes</option>
                  <option value="streetlight">Streetlights</option>
                  <option value="water_leakage">Water Leakage</option>
                  <option value="garbage">Garbage Overflow</option>
                  <option value="flooding">Flooding</option>
                  <option value="road_damage">Road Damage</option>
                  <option value="vandalism">Vandalism</option>
                  <option value="encroachment">Encroachment</option>
                </select>
              </div>

              <div class="form-group half-width">
                <label for="map-filter-status">Status</label>
                <select id="map-filter-status" class="form-control">
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="map-filter-date">Date Range</label>
              <select id="map-filter-date" class="form-control">
                <option value="all">All Time</option>
                <option value="3days">Last 3 Days</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async mount() {
    this.map = null;
    this.markersGroup = [];
    this.hotspotPolygons = [];
    this.heatmap = null;
    this.markerClusterer = null;

    await this.loadMapData();
    this.initMap();
    this.setupListeners();
  },

  async loadMapData() {
    this.issues = await DB.getAll('issues');
    this.predictions = await DB.getAll('hotspot_predictions');
  },

  initMap() {
    const container = document.getElementById('main-google-map');
    if (!container) return;

    const lat = 12.9740;
    const lng = 77.6415;

    if (MapHelper.isGoogleMapsAvailable()) {
      container.innerHTML = '';
      const mapOptions = {
        center: { lat, lng },
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          {
            "featureType": "all",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#747d8c" }]
          },
          {
            "featureType": "administrative",
            "elementType": "background",
            "stylers": [{ "visibility": "off" }]
          },
          {
            "featureType": "landscape",
            "elementType": "all",
            "stylers": [{ "color": "#f1f2f6" }]
          },
          {
            "featureType": "road",
            "elementType": "all",
            "stylers": [{ "color": "#ffffff" }]
          },
          {
            "featureType": "water",
            "elementType": "all",
            "stylers": [{ "color": "#dfe4ea" }]
          }
        ]
      };

      if (document.documentElement.classList.contains('dark')) {
        mapOptions.styles = [
          { "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
          { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0f172a" }] },
          { "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
          { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#334155" }] },
          { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] }
        ];
      }

      this.map = new google.maps.Map(container, mapOptions);
    } else {
      if (this.map && typeof this.map.remove === 'function') {
        try { this.map.remove(); } catch(e) {}
      }
      container.innerHTML = '';

      this.map = L.map(container, {
        zoomControl: true,
        attributionControl: false
      }).setView([lat, lng], 14);

      const isDark = document.documentElement.classList.contains('dark');
      const tileUrl = isDark 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

      L.tileLayer(tileUrl, {
        maxZoom: 19
      }).addTo(this.map);
    }

    this.renderLayers();
  },

  renderLayers() {
    // 1. Clean previous layers
    if (MapHelper.isGoogleMapsAvailable()) {
      this.markersGroup.forEach(m => {
        if (m && typeof m.setMap === 'function') m.setMap(null);
      });
      this.markersGroup = [];

      this.hotspotPolygons.forEach(p => {
        if (p && typeof p.setMap === 'function') p.setMap(null);
      });
      this.hotspotPolygons = [];

      if (this.heatmap && typeof this.heatmap.setMap === 'function') {
        this.heatmap.setMap(null);
      }
      this.heatmap = null;

      if (this.markerClusterer && typeof this.markerClusterer.clearMarkers === 'function') {
        this.markerClusterer.clearMarkers();
      }
      this.markerClusterer = null;
    } else {
      this.markersGroup.forEach(m => {
        if (this.map && this.map.hasLayer(m)) this.map.removeLayer(m);
      });
      this.markersGroup = [];

      this.hotspotPolygons.forEach(p => {
        if (this.map && this.map.hasLayer(p)) this.map.removeLayer(p);
      });
      this.hotspotPolygons = [];

      if (this.heatmap && this.map && this.map.hasLayer(this.heatmap)) {
        this.map.removeLayer(this.heatmap);
      }
      this.heatmap = null;

      if (this.markerClusterer && this.map && this.map.hasLayer(this.markerClusterer)) {
        this.map.removeLayer(this.markerClusterer);
      }
      this.markerClusterer = null;
    }

    const activeMarkers = [];

    // 2. Render Issues Layer (Pins & Pulse Rings)
    if (this.activeLayers.issues) {
      let filteredIssues = [...this.issues];

      if (this.filters.category !== 'all') {
        filteredIssues = filteredIssues.filter(i => i.category === this.filters.category);
      }
      if (this.filters.status !== 'all') {
        filteredIssues = filteredIssues.filter(i => i.status === this.filters.status);
      }
      if (this.filters.dateRange !== 'all') {
        const now = Date.now();
        let limit = 0;
        if (this.filters.dateRange === '3days') limit = 3 * 24 * 60 * 60 * 1000;
        else if (this.filters.dateRange === 'week') limit = 7 * 24 * 60 * 60 * 1000;
        else if (this.filters.dateRange === 'month') limit = 30 * 24 * 60 * 60 * 1000;

        filteredIssues = filteredIssues.filter(i => (now - new Date(i.created_at).getTime()) <= limit);
      }

      filteredIssues.forEach(issue => {
        let color = '#EF4444'; // Red
        if (issue.status === 'in_progress') color = '#F59E0B'; // Amber
        if (issue.status === 'resolved') color = '#10B981'; // Green

        const popupContent = `
          <div class="map-popup-card" style="color:#0f172a; font-family:sans-serif;">
            <div class="popup-header" style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span class="status-pill status-${issue.status}" style="font-size:10px; padding:2px 6px;">${issue.status.toUpperCase()}</span>
              <span class="severity-badge severity-${issue.severity}" style="position:static; font-size:10px; padding:2px 6px;">Sev ${issue.severity}</span>
            </div>
            <h4 class="popup-title" style="margin:4px 0; font-size:13px; font-weight:700;">${issue.title.substring(0, 30)}...</h4>
            <p class="popup-address" style="margin:0; font-size:11px; color:#64748b;">${issue.address.substring(0, 45)}...</p>
            <button class="btn btn-primary btn-xs mt-2" style="width:100%;" onclick="MapPage.viewIssueDetails('${issue.id}')">View Details</button>
          </div>
        `;

        if (MapHelper.isGoogleMapsAvailable()) {
          const markerOpts = {
            position: { lat: issue.lat, lng: issue.lng },
            map: this.map,
            title: issue.title,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: color,
              fillOpacity: 0.9,
              scale: 8,
              strokeColor: '#FFFFFF',
              strokeWeight: 2
            }
          };

          const marker = new google.maps.Marker(markerOpts);

          if (issue.severity === 5) {
            const warnCircle = new google.maps.Circle({
              strokeColor: '#DC2626',
              strokeOpacity: 0.8,
              strokeWeight: 1.5,
              fillColor: '#DC2626',
              fillOpacity: 0.15,
              map: this.map,
              center: { lat: issue.lat, lng: issue.lng },
              radius: 80
            });
            this.markersGroup.push(warnCircle);
          }

          const infoWindow = new google.maps.InfoWindow({
            content: popupContent,
            disableAutoPan: false
          });

          marker.addListener('click', () => {
            infoWindow.open(this.map, marker);
          });

          this.markersGroup.push(marker);
          activeMarkers.push(marker);
        } else {
          // Leaflet marker rendering
          const marker = L.circleMarker([issue.lat, issue.lng], {
            radius: 8,
            fillColor: color,
            fillOpacity: 0.9,
            color: '#FFFFFF',
            weight: 2
          });
          marker.bindPopup(popupContent);

          if (issue.severity === 5) {
            const warnCircle = L.circle([issue.lat, issue.lng], {
              radius: 80,
              color: '#DC2626',
              weight: 1.5,
              opacity: 0.8,
              fillColor: '#DC2626',
              fillOpacity: 0.15
            }).addTo(this.map);
            this.markersGroup.push(warnCircle);
          }

          this.markersGroup.push(marker);
          activeMarkers.push(marker);
        }
      });

      if (activeMarkers.length > 0) {
        if (MapHelper.isGoogleMapsAvailable()) {
          if (typeof markerClusterer !== 'undefined') {
            this.markerClusterer = new markerClusterer.MarkerClusterer({
              map: this.map,
              markers: activeMarkers
            });
          }
        } else {
          if (typeof L.markerClusterGroup !== 'undefined') {
            this.markerClusterer = L.markerClusterGroup({
              showCoverageOnHover: false,
              maxClusterRadius: 40
            });
            activeMarkers.forEach(m => this.markerClusterer.addLayer(m));
            this.map.addLayer(this.markerClusterer);
          } else {
            activeMarkers.forEach(m => m.addTo(this.map));
          }
        }
      }
    }

    // 3. Render Heatmap Layer
    if (this.activeLayers.heatmap) {
      if (MapHelper.isGoogleMapsAvailable()) {
        const points = this.issues.map(issue => ({
          location: new google.maps.LatLng(issue.lat, issue.lng),
          weight: issue.upvote_count || 1
        }));

        if (points.length > 0) {
          this.heatmap = new google.maps.visualization.HeatmapLayer({
            data: points,
            map: this.map,
            radius: 30
          });
        }
      } else {
        const points = this.issues.map(issue => [issue.lat, issue.lng, (issue.upvote_count || 1) * 0.1]);
        if (points.length > 0 && typeof L.heatLayer !== 'undefined') {
          this.heatmap = L.heatLayer(points, { radius: 25, blur: 15 }).addTo(this.map);
        }
      }
    }

    // 4. Render AI Hotspots Layer
    if (this.activeLayers.hotspots) {
      this.predictions.forEach(pred => {
        const hotspotContent = `
          <div style="color:#0f172a; padding:6px; font-family:sans-serif;">
            <strong style="color:#F97316;">AI predicted Hotspot Zone</strong>
            <div>Category: ${pred.predicted_category.toUpperCase()}</div>
            <div>Risk Score: ${pred.risk_score}%</div>
            <div>Historical Recurrence: ${pred.historical_count}</div>
          </div>
        `;

        if (MapHelper.isGoogleMapsAvailable()) {
          const polygonPaths = pred.zone_polygon.coordinates[0].map(coord => ({
            lat: coord[1],
            lng: coord[0]
          }));

          const polygon = new google.maps.Polygon({
            paths: polygonPaths,
            strokeColor: '#F97316',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#F97316',
            fillOpacity: 0.2,
            map: this.map
          });

          const tooltip = new google.maps.InfoWindow({
            content: hotspotContent,
            position: polygonPaths[0]
          });

          polygon.addListener('click', () => {
            tooltip.open(this.map);
          });

          this.hotspotPolygons.push(polygon);
        } else {
          const polygonPaths = pred.zone_polygon.coordinates[0].map(coord => [coord[1], coord[0]]);
          const polygon = L.polygon(polygonPaths, {
            color: '#F97316',
            weight: 2,
            opacity: 0.8,
            fillColor: '#F97316',
            fillOpacity: 0.2
          }).addTo(this.map);
          polygon.bindPopup(hotspotContent);
          this.hotspotPolygons.push(polygon);
        }
      });
    }
  },

  setupListeners() {
    // Layers toggle checkbox listeners
    document.getElementById('layer-issues').addEventListener('change', (e) => {
      this.activeLayers.issues = e.target.checked;
      this.renderLayers();
    });

    document.getElementById('layer-heatmap').addEventListener('change', (e) => {
      this.activeLayers.heatmap = e.target.checked;
      this.renderLayers();
    });

    document.getElementById('layer-hotspots').addEventListener('change', (e) => {
      this.activeLayers.hotspots = e.target.checked;
      this.renderLayers();
    });

    // Filters listeners
    document.getElementById('map-filter-category').addEventListener('change', (e) => {
      this.filters.category = e.target.value;
      this.renderLayers();
    });

    document.getElementById('map-filter-status').addEventListener('change', (e) => {
      this.filters.status = e.target.value;
      this.renderLayers();
    });

    document.getElementById('map-filter-date').addEventListener('change', (e) => {
      this.filters.dateRange = e.target.value;
      this.renderLayers();
    });

    // Floating Report Button
    document.getElementById('map-fab-report').addEventListener('click', () => {
      if (!this.map) return;
      const center = this.map.getCenter();
      const lat = typeof center.lat === 'function' ? center.lat() : center.lat;
      const lng = typeof center.lng === 'function' ? center.lng() : center.lng;
      
      // Store coordinates to pre-fill report
      sessionStorage.setItem('civicfix_report_prefill', JSON.stringify({ lat, lng }));

      Router.navigate('#/report');
    });

    // Bottom Filter Sheet drag/toggle setup
    const filterSheet = document.getElementById('map-filter-sheet');
    const dragHeader = document.getElementById('filter-sheet-drag');
    let isOpen = false;

    dragHeader.addEventListener('click', () => {
      if (isOpen) {
        filterSheet.style.transform = 'translateY(calc(100% - 44px))';
      } else {
        filterSheet.style.transform = 'translateY(0)';
      }
      isOpen = !isOpen;
    });

    // Sync DB changes
    window.addEventListener('db-update', async () => {
      await this.loadMapData();
      this.renderLayers();
    });

    // Listen for Google Maps failures dynamically
    window.addEventListener('google-maps-failed', () => {
      console.warn("Re-initializing map screen with Leaflet fallback");
      this.initMap();
    });
  },

  viewIssueDetails(issueId) {
    Router.navigate(`#/issue/${issueId}`);
  }
};

// Expose globally
window.MapPage = MapPage;
