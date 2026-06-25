// js/pages/public.js
// Public Transparency Page and Shareable Issue Page (Google Maps JS SDK)

const PublicPage = {
  isPublic: true,
  map: null,
  markersGroup: [],

  async render() {
    return `
      <div class="public-container">
        <!-- Hero Section -->
        <div class="public-hero">
          <h1>City Transparency Board</h1>
          <p>Real-time civic status, operational metrics, and verified issue resolutions in MetroCity.</p>
          <button class="btn btn-primary mt-3" onclick="Router.navigate('#/report')">
            <i data-lucide="plus-circle"></i> Report a New Issue
          </button>
        </div>

        <!-- City Statistics -->
        <div class="metrics-grid mt-4">
          <div class="metric-card card">
            <div class="metric-header">
              <span class="m-title">Reported This Month</span>
            </div>
            <div class="metric-value color-primary" id="pub-total">0</div>
          </div>
          <div class="metric-card card">
            <div class="metric-header">
              <span class="m-title font-bold text-success">Total Resolved</span>
            </div>
            <div class="metric-value color-success" id="pub-resolved">0</div>
          </div>
          <div class="metric-card card">
            <div class="metric-header">
              <span class="m-title">Average Fix SLA</span>
            </div>
            <div class="metric-value" style="color:#8B5CF6;">26.4 hrs</div>
          </div>
        </div>

        <!-- Public Map -->
        <div class="public-map-card card mt-4">
          <h3>Live Issues Map</h3>
          <p class="text-muted small mb-3">Map pins representing active and resolved community reports.</p>
          <div id="public-google-map" style="width:100%; height:320px; border-radius:12px;"></div>
        </div>

        <!-- Visual Resolutions Showcase -->
        <div class="public-gallery-card card mt-4">
          <h3>Recently Resolved Issues</h3>
          <p class="text-muted mb-4">Compare before-and-after photo evidence of successful resolutions.</p>
          <div class="resolutions-showcase-row" id="public-resolutions-row">
            <!-- Populated dynamically -->
          </div>
        </div>

        <!-- Transparency Reports Downloads -->
        <div class="reports-downloads-card card mt-4 mb-5">
          <h3>Published Monthly Reports</h3>
          <p class="text-muted mb-3">Official compliance audits published by authority boards.</p>
          <div class="reports-list-grid" id="public-reports-grid">
            <!-- Populated dynamically -->
          </div>
        </div>
      </div>
    `;
  },

  async mount() {
    await this.loadPublicData();
    this.initPublicMap();
    if (window.lucide) window.lucide.createIcons();
  },

  async loadPublicData() {
    const issues = await DB.getAll('issues');
    const reports = await DB.getAll('monthly_reports');

    const total = issues.length;
    const resolved = issues.filter(i => i.status === 'resolved').length;

    document.getElementById('pub-total').innerText = total;
    document.getElementById('pub-resolved').innerText = resolved;

    // Load reports
    const reportsGrid = document.getElementById('public-reports-grid');
    const publicReports = reports.filter(r => r.is_public);
    
    if (publicReports.length === 0) {
      reportsGrid.innerHTML = '<p class="text-muted">No monthly reports published yet.</p>';
    } else {
      reportsGrid.innerHTML = publicReports.map(r => `
        <div class="report-download-item">
          <div style="display:flex; align-items:center; gap:12px;">
            <div class="pdf-icon-placeholder"><i data-lucide="file-text" style="color:#EF4444;"></i></div>
            <div>
              <strong>Report for ${r.month === 5 ? 'May 2026' : 'June 2026'}</strong>
              <div class="text-muted small">${r.total_reported} issues / ${r.total_resolved} resolved</div>
            </div>
          </div>
          <button class="btn btn-outline btn-xs" onclick="App.showToast('Downloaded PDF', 'Mock PDF download trigger.', 'success')">
            <i data-lucide="download"></i> PDF
          </button>
        </div>
      `).join('');
    }

    // Load before-after gallery
    const resolvedIssues = issues.filter(i => i.status === 'resolved' && i.after_photo_url);
    const galleryRow = document.getElementById('public-resolutions-row');

    if (resolvedIssues.length === 0) {
      galleryRow.innerHTML = '<p class="text-muted">No resolved comparisons available yet.</p>';
    } else {
      galleryRow.innerHTML = resolvedIssues.slice(0, 3).map(i => `
        <div class="resolution-showcase-card card">
          <div class="side-by-side-gallery">
            <img src="${i.before_photo_url}" class="col-photo" title="Before fix">
            <img src="${i.after_photo_url}" class="col-photo" title="After fix">
          </div>
          <div class="showcase-content">
            <h4>${i.title.substring(0, 25)}...</h4>
            <span class="category-tag mt-2">${i.category.toUpperCase()}</span>
            <p class="text-muted small mt-1">Resolved: ${new Date(i.resolved_at).toLocaleDateString()}</p>
          </div>
        </div>
      `).join('');
    }
  },

  initPublicMap() {
    const container = document.getElementById('public-google-map');
    if (!container) return;

    if (MapHelper.isGoogleMapsAvailable()) {
      container.innerHTML = '';
      this.map = new google.maps.Map(container, {
        center: { lat: 12.9740, lng: 77.6415 },
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true
      });

      this.markersGroup = [];

      // Add pins
      DB.getAll('issues').then(issues => {
        issues.forEach(issue => {
          let color = '#EF4444';
          if (issue.status === 'in_progress') color = '#F59E0B';
          if (issue.status === 'resolved') color = '#10B981';

          const marker = new google.maps.Marker({
            position: { lat: issue.lat, lng: issue.lng },
            map: this.map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: color,
              fillOpacity: 0.9,
              scale: 7,
              strokeColor: '#FFFFFF',
              strokeWeight: 1.5
            }
          });

          const popupContent = `
            <div class="map-popup-card" style="color:#0f172a; font-family:sans-serif;">
              <h4 style="margin:2px 0; font-size:12px; font-weight:700;">${issue.title.substring(0, 30)}...</h4>
              <span class="popup-status status-${issue.status}" style="font-size:9px; padding:1px 4px;">${issue.status.toUpperCase()}</span>
              <button class="btn btn-primary btn-xs mt-2" style="width:100%; display:block;" onclick="PublicPage.viewIssueDetails('${issue.id}')">View Details</button>
            </div>
          `;

          const infoWindow = new google.maps.InfoWindow({
            content: popupContent
          });

          marker.addListener('click', () => {
            infoWindow.open(this.map, marker);
          });

          this.markersGroup.push(marker);
        });
      });
    } else {
      if (this.map && typeof this.map.remove === 'function') {
        try { this.map.remove(); } catch(e) {}
      }
      container.innerHTML = '';

      const lat = 12.9740;
      const lng = 77.6415;

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

      this.markersGroup = [];

      DB.getAll('issues').then(issues => {
        issues.forEach(issue => {
          let color = '#EF4444';
          if (issue.status === 'in_progress') color = '#F59E0B';
          if (issue.status === 'resolved') color = '#10B981';

          const marker = L.circleMarker([issue.lat, issue.lng], {
            radius: 7,
            fillColor: color,
            fillOpacity: 0.9,
            color: '#FFFFFF',
            weight: 1.5
          });

          const popupContent = `
            <div class="map-popup-card" style="color:#0f172a; font-family:sans-serif;">
              <h4 style="margin:2px 0; font-size:12px; font-weight:700;">${issue.title.substring(0, 30)}...</h4>
              <span class="popup-status status-${issue.status}" style="font-size:9px; padding:1px 4px;">${issue.status.toUpperCase()}</span>
              <button class="btn btn-primary btn-xs mt-2" style="width:100%; display:block;" onclick="PublicPage.viewIssueDetails('${issue.id}')">View Details</button>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.addTo(this.map);
          this.markersGroup.push(marker);
        });
      });
    }

    // Register maps failed event listener
    window.addEventListener('google-maps-failed', () => {
      this.map = null;
      this.initPublicMap();
    });
  },

  viewIssueDetails(id) {
    Router.navigate(`#/issue/${id}`);
  }
};


// Standalone Shareable Issue Details View (#/issue/:id)
const PublicIssuePage = {
  isPublic: true,

  async render(params) {
    return `
      <div class="public-issue-container mt-4 mb-5">
        <div id="public-issue-details-card">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;
  },

  async mount(params) {
    const issueId = params.id;
    const issue = await DB.get('issues', issueId);

    const card = document.getElementById('public-issue-details-card');
    if (!card) return;

    if (!issue) {
      card.innerHTML = `
        <div class="error-panel card">
          <i data-lucide="alert-circle" style="width:48px;height:48px;color:#EF4444;"></i>
          <h2>Issue Not Found</h2>
          <p>The shared issue ticket does not exist or has been removed.</p>
          <a href="#/public" class="btn btn-primary mt-3">Back to Transparency Board</a>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Set Dynamic Open Graph Tags inside head
    this.updateOpenGraphTags(issue);

    const users = await DB.getAll('users');
    const reporter = users.find(u => u.id === issue.reporter_id);
    const timeline = await DB.getAll('issue_timeline');
    const issueTimeline = timeline.filter(t => t.issue_id === issueId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    let photosHtml = `<img src="${issue.media_urls[0]}" class="issue-main-image">`;
    if (issue.status === 'resolved' && issue.after_photo_url) {
      photosHtml = `
        <div class="before-after-container">
          <div class="photo-side">
            <span class="side-badge danger">BEFORE</span>
            <img src="${issue.before_photo_url}" class="side-img">
          </div>
          <div class="photo-side">
            <span class="side-badge success">RESOLVED FIX</span>
            <img src="${issue.after_photo_url}" class="side-img">
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="issue-public-card card">
        <div class="pane-header mb-3">
          <button class="btn btn-outline btn-xs" onclick="Router.navigate('#/public')"><i data-lucide="arrow-left"></i> Back</button>
          <span class="status-pill status-${issue.status}">${issue.status.toUpperCase()}</span>
        </div>

        ${photosHtml}

        <div class="mt-4">
          <span class="category-tag">${issue.category.toUpperCase().replace('_', ' ')}</span>
          <span class="severity-badge severity-${issue.severity} ml-2">Severity ${issue.severity}</span>
          
          <h1 class="mt-3" style="font-size:24px; font-weight:700; line-height:1.2;">${issue.title}</h1>
          <p class="description-box mt-3">${issue.description}</p>
          <p class="text-muted mt-2"><i data-lucide="map-pin" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i>${issue.address}</p>
          
          <div class="reporter-pill mt-3">
            <img src="${reporter ? reporter.avatar_url : 'https://api.dicebear.com/7.x/bottts/svg?seed=system'}" class="reporter-avatar">
            <div class="reporter-info">
              <span class="rep-name">Reported by ${reporter ? reporter.name : 'Citizen'}</span>
              <span class="rep-time">${new Date(issue.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <!-- Location mini-map -->
        <div class="mt-4">
          <h3>Issue Coordinates</h3>
          <div id="public-issue-google-map" class="details-mini-map mt-2" style="height:200px; border-radius:12px;"></div>
        </div>

        <!-- Timeline -->
        <div class="mt-4">
          <h3>Resolution Progress</h3>
          <div class="text-timeline-logs mt-3">
            ${issueTimeline.map(log => `
              <div class="log-entry">
                <span class="log-dot"></span>
                <div class="log-details">
                  <div class="log-title">${log.action.toUpperCase()}</div>
                  <div class="log-note">${log.note}</div>
                  <div class="log-time">${new Date(log.created_at).toLocaleString()}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="mt-4 border-top pt-4 text-center">
          <p class="text-muted">Want to upvote or co-report this issue? <a href="#/login">Login to CivicFix</a></p>
          <button class="btn btn-primary mt-3" onclick="HomePage.shareIssue('${issue.id}')"><i data-lucide="share-2"></i> Share Report</button>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Map pin
    setTimeout(() => {
      const mapContainer = document.getElementById('public-issue-google-map');
      if (!mapContainer) return;

      let color = '#EF4444';
      if (issue.status === 'in_progress') color = '#F59E0B';
      if (issue.status === 'resolved') color = '#10B981';

      if (MapHelper.isGoogleMapsAvailable()) {
        mapContainer.innerHTML = '';
        const map = new google.maps.Map(mapContainer, {
          center: { lat: issue.lat, lng: issue.lng },
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: false
        });

        new google.maps.Marker({
          position: { lat: issue.lat, lng: issue.lng },
          map: map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 0.9,
            scale: 8,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
          }
        });
      } else {
        if (window.publicIssueMap && typeof window.publicIssueMap.remove === 'function') {
          try { window.publicIssueMap.remove(); } catch(e) {}
        }
        mapContainer.innerHTML = '';

        const map = L.map(mapContainer, {
          zoomControl: false,
          attributionControl: false
        }).setView([issue.lat, issue.lng], 15);
        window.publicIssueMap = map;

        const isDark = document.documentElement.classList.contains('dark');
        const tileUrl = isDark 
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

        L.tileLayer(tileUrl, {
          maxZoom: 19
        }).addTo(map);

        L.circleMarker([issue.lat, issue.lng], {
          radius: 8,
          fillColor: color,
          fillOpacity: 0.9,
          color: '#FFFFFF',
          weight: 2
        }).addTo(map);
      }
    }, 100);
  },

  updateOpenGraphTags(issue) {
    // Dynamic Meta Head Injector
    document.title = `${issue.title} | CivicFix Transparency`;
    
    // Set Open Graph tags
    this.setMetaTag('og:title', issue.title);
    this.setMetaTag('og:description', issue.description);
    this.setMetaTag('og:image', issue.media_urls[0]);
    this.setMetaTag('og:url', window.location.href);
    this.setMetaTag('twitter:card', 'summary_large_image');
  },

  setMetaTag(property, content) {
    let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(property.startsWith('og:') ? 'property' : 'name', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }
};

// Expose globally
window.PublicPage = PublicPage;
window.PublicIssuePage = PublicIssuePage;
