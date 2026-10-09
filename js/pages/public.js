// js/pages/public.js
// Public Transparency Page and Shareable Issue Page (Google Maps JS SDK)

const PublicPage = {
  isPublic: true,
  map: null,
  markersGroup: [],

  async render() {
    return `
      <div class="public-container">
        <section class="pub-hero">
          <h1>Bengaluru Clean City Board</h1>
          <p>How fast garbage dumps reported on EcoSort are being cleaned up.</p>
          <button class="btn btn-primary" onclick="Router.navigate('#/report')">
            <i data-lucide="camera"></i> Report a garbage dump
          </button>
        </section>

        <div class="pub-stats">
          <div class="off-stat is-closed"><span class="off-stat-label">kg of waste cleared</span><span class="off-stat-value" id="pub-kg">0</span></div>
          <div class="off-stat"><span class="off-stat-label">Complaints closed</span><span class="off-stat-value" id="pub-resolved">0</span></div>
          <div class="off-stat"><span class="off-stat-label">Avg days to close</span><span class="off-stat-value" id="pub-days">0</span></div>
        </div>

        <ul class="pub-facts" id="pub-facts" hidden></ul>

        <section class="off-card">
          <div class="pub-section-head">
            <h3>Dumps on the map</h3>
            <div class="map-legend">
              <span><i class="map-legend-dot is-open"></i>Open</span>
              <span><i class="map-legend-dot is-progress"></i>In progress</span>
              <span><i class="map-legend-dot is-closed"></i>Cleaned</span>
            </div>
          </div>
          <div id="public-google-map" class="pub-map"></div>
        </section>

        <section class="off-card">
          <h3>Recent cleanups</h3>
          <p class="text-muted small">Before and after photos of spots the city has cleaned.</p>
          <div class="pub-cleanups" id="public-resolutions-row"></div>
        </section>
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

    const closed = issues.filter(i => i.status === 'resolved');
    const kg = closed.reduce((sum, i) => sum + (Number(i.est_weight_kg) || 0), 0);
    const avgDays = closed.length ? closed.reduce((s, i) => s + Green.daysOpen(i), 0) / closed.length : 0;
    document.getElementById('pub-resolved').innerText = closed.length;

    // City facts from the latest published report (if any)
    try {
      const reports = await DB.getAll('monthly_reports');
      const ctx = (reports.find(r => r.city_context) || {}).city_context;
      const factsEl = document.getElementById('pub-facts');
      if (ctx && factsEl) {
        const n = (v) => Number(v).toLocaleString('en-IN');
        const facts = [];
        if (ctx.daily_waste_tonnes) facts.push(`Bengaluru produces about <strong>${n(ctx.daily_waste_tonnes)} tonnes</strong> of waste a day.`);
        if (ctx.garbage_blackspots_sep_2025 && ctx.garbage_blackspots_feb_2026) facts.push(`Garbage black spots fell from <strong>${n(ctx.garbage_blackspots_sep_2025)}</strong> (Sep 2025) to <strong>${n(ctx.garbage_blackspots_feb_2026)}</strong> (Feb 2026).`);
        if (facts.length) {
          factsEl.innerHTML = facts.map(f => `<li><i data-lucide="info"></i><span>${f}</span></li>`).join('');
          factsEl.hidden = false;
        }
      }
    } catch (e) { /* facts are optional */ }
    document.getElementById('pub-kg').innerText = Math.round(kg).toLocaleString('en-IN');
    document.getElementById('pub-days').innerText = avgDays.toFixed(1);

    // Load before-after gallery
    const resolvedIssues = issues
      .filter(i => i.status === 'resolved' && i.after_photo_url)
      .sort((a, b) => new Date(b.resolved_at) - new Date(a.resolved_at));
    const galleryRow = document.getElementById('public-resolutions-row');

    if (resolvedIssues.length === 0) {
      galleryRow.innerHTML = '<p class="text-muted">No cleanups yet.</p>';
    } else {
      galleryRow.innerHTML = resolvedIssues.slice(0, 6).map(i => `
        <article class="pub-cleanup" onclick="PublicPage.viewIssueDetails('${i.id}')">
          <div class="pub-before-after">
            <figure><img src="${i.before_photo_url}" alt="Before cleanup" loading="lazy"><figcaption>Before</figcaption></figure>
            <figure><img src="${i.after_photo_url}" alt="After cleanup" loading="lazy"><figcaption>After</figcaption></figure>
          </div>
          <div class="pub-cleanup-body">
            <strong>${i.title}</strong>
            <span class="text-muted small">${Green.label(i.category)} · cleaned ${i.resolved_at ? new Date(i.resolved_at).toLocaleDateString('en-IN') : ''}</span>
          </div>
        </article>
      `).join('');
    }
  },

  initPublicMap() {
    const container = document.getElementById('public-google-map');
    if (!container) return;

    if (MapHelper.isGoogleMapsAvailable()) {
      container.innerHTML = '';
      this.map = new google.maps.Map(container, {
        center: { lat: 12.97, lng: 77.62 },
        zoom: 11,
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
            <div class="map-popup-card" style="color:var(--text-color); font-family:sans-serif;">
              <h4 style="margin:2px 0; font-size:12px; font-weight:700;">${issue.title.substring(0, 30)}...</h4>
              <span class="popup-status status-${issue.status}" style="font-size:9px; padding:1px 4px;">${Green.statusLabel(issue.status)}</span>
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
        if (window.fitMapToIssues) window.fitMapToIssues(this.map, issues, 14);
      });
    } else {
      if (this.map && typeof this.map.remove === 'function') {
        try { this.map.remove(); } catch(e) {}
      }
      container.innerHTML = '';

      const lat = 12.97;
      const lng = 77.62;

      this.map = L.map(container, {
        zoomControl: true,
        attributionControl: false
      }).setView([lat, lng], 11);

      const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

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
            <div class="map-popup-card" style="color:var(--text-color); font-family:sans-serif;">
              <h4 style="margin:2px 0; font-size:12px; font-weight:700;">${issue.title.substring(0, 30)}...</h4>
              <span class="popup-status status-${issue.status}" style="font-size:9px; padding:1px 4px;">${Green.statusLabel(issue.status)}</span>
              <button class="btn btn-primary btn-xs mt-2" style="width:100%; display:block;" onclick="PublicPage.viewIssueDetails('${issue.id}')">View Details</button>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.addTo(this.map);
          this.markersGroup.push(marker);
        });
        if (window.fitMapToIssues) window.fitMapToIssues(this.map, issues, 14);
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
          <h2>Complaint Not Found</h2>
          <p>The shared complaint does not exist or has been removed.</p>
          <a href="#/public" class="btn btn-primary mt-3">Back to City Board</a>
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
            <span class="side-badge success">AFTER CLEANUP</span>
            <img src="${issue.after_photo_url}" class="side-img">
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="issue-public-card card">
        <div class="pane-header mb-3">
          <button class="btn btn-outline btn-xs" onclick="Router.navigate('#/public')"><i data-lucide="arrow-left"></i> Back</button>
          <span class="status-pill status-${issue.status}">${Green.statusLabel(issue.status)}</span>
        </div>

        ${photosHtml}

        <div class="mt-4">
          <span class="category-tag">${Green.label(issue.category)}</span>
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
          <h3>Dump Location</h3>
          <div id="public-issue-google-map" class="details-mini-map mt-2" style="height:200px; border-radius:12px;"></div>
        </div>

        <!-- Timeline -->
        <div class="mt-4">
          <h3>Complaint Progress</h3>
          <div class="text-timeline-logs mt-3">
            ${issueTimeline.map(log => `
              <div class="log-entry">
                <span class="log-dot"></span>
                <div class="log-details">
                  <div class="log-title">${PublicIssuePage.actionLabel(log.action)}</div>
                  <div class="log-note">${PublicIssuePage.cleanNote(log.note)}</div>
                  <div class="log-time">${new Date(log.created_at).toLocaleString()}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="mt-4 border-top pt-4 text-center">
          <p class="text-muted">Want to upvote or co-report this dump? <a href="#/login">Login to EcoSort</a></p>
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

        const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

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

  actionLabel(action) {
    const labels = {
      reported: 'Reported', assigned: 'Assigned', status_changed: 'Status updated',
      resolved: 'Closed', commented: 'Comment', ai_validated: 'Cleanup photo checked'
    };
    return labels[action] || String(action || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  },

  cleanNote(note) {
    return String(note || '').replace(/^AI comparison:/i, 'Cleanup photo check:');
  },

  updateOpenGraphTags(issue) {
    // Dynamic Meta Head Injector
    document.title = `${issue.title} | EcoSort City Board`;
    
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
