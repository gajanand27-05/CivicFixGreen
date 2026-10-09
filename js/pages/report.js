// js/pages/report.js
// Garbage-dump complaint wizard: Photo -> Photo check -> Location + nearest office -> Details -> Send

const ReportPage = {
  currentStep: 1,
  mediaFiles: [], // array of dataURLs
  aiSuggestions: null,
  locationData: { lat: 12.9716, lng: 77.6412, address: '', ward: '' },
  map: null,
  marker: null,
  mediaRecorder: null,
  audioChunks: [],
  isRecordingAudio: false,
  office: null,
  complaint: null,

  async render() {
    return `
      <div class="es-report">
        <div class="es-wizard-progress" aria-label="Progress">
          <div class="es-progress-track"><div class="es-progress-fill" id="wizard-progress-bar" style="width: 0%;"></div></div>
          <ol class="es-steps">
            <li class="step-dot active" data-step="1"><span class="es-step-num">1</span><span class="es-step-label">Photo</span></li>
            <li class="step-dot" data-step="2"><span class="es-step-num">2</span><span class="es-step-label">Photo Check</span></li>
            <li class="step-dot" data-step="3"><span class="es-step-num">3</span><span class="es-step-label">Location</span></li>
            <li class="step-dot" data-step="4"><span class="es-step-num">4</span><span class="es-step-label">Details</span></li>
            <li class="step-dot" data-step="5"><span class="es-step-num">5</span><span class="es-step-label">Send</span></li>
          </ol>
        </div>

        <div class="es-wizard-card">
          <!-- STEP 1: PHOTO -->
          <div class="wizard-step-panel es-panel" id="step-1-panel">
            <h2 class="es-panel-title">Add a photo of the dump</h2>
            <p class="es-panel-sub">Take a photo or pick one from your gallery. We'll find the location for you.</p>

            <div class="es-capture" id="camera-click-box" role="button" tabindex="0">
              <i data-lucide="camera" class="camera-icon"></i>
              <span>Tap to take a photo</span>
              <video id="webcam-preview" autoplay playsinline style="display: none;"></video>
            </div>

            <div class="es-capture-actions">
              <label class="btn btn-outline">
                <i data-lucide="image"></i> Choose from gallery
                <input type="file" id="gallery-file-input" accept="image/*" multiple hidden>
              </label>
              <button class="btn btn-outline" id="webcam-toggle-btn" style="display:none;">Close camera</button>
            </div>

            <div id="gps-status" class="es-gps">📍 Finding your location…</div>
            <div class="es-thumbs" id="media-thumbnails"></div>
          </div>

          <!-- STEP 2: PHOTO CHECK -->
          <div class="wizard-step-panel es-panel" id="step-2-panel" style="display: none;">
            <h2 class="es-panel-title">Photo check</h2>
            <p class="es-panel-sub">We check the photo and fill in the details. Change anything that looks wrong.</p>

            <div class="es-checking" id="check-scanning-view" style="display: none;">
              <img id="scanning-preview-img" src="" alt="">
              <div class="es-checking-text"><span class="spinner-sm"></span> Checking the photo…</div>
            </div>

            <div id="check-results-form" style="display: none;">
              <div id="photo-check-banner" class="es-banner-wrap"></div>

              <div class="form-group">
                <label for="report-title">Title</label>
                <input type="text" id="report-title" class="form-control" required>
              </div>

              <div class="es-form-row">
                <div class="form-group">
                  <label for="report-category">Type of waste</label>
                  <select id="report-category" class="form-control">
                    ${Green.categoryOptionsHtml()}
                  </select>
                </div>
                <div class="form-group">
                  <label for="report-severity">How bad is it?</label>
                  <select id="report-severity" class="form-control">
                    <option value="1">1 · Very minor</option>
                    <option value="2">2 · Minor</option>
                    <option value="3">3 · Moderate</option>
                    <option value="4">4 · Serious</option>
                    <option value="5">5 · Health hazard</option>
                  </select>
                </div>
              </div>

              <select id="report-dept" class="form-control" disabled hidden>
                ${Green.departmentOptionsHtml()}
              </select>
              <p class="es-hint" id="report-dept-hint"></p>
            </div>
          </div>

          <!-- STEP 3: LOCATION -->
          <div class="wizard-step-panel es-panel" id="step-3-panel" style="display: none;">
            <h2 class="es-panel-title">Where is it?</h2>
            <p class="es-panel-sub">Make sure the pin is on the dump. Drag it or tap the map to move it.</p>

            <button class="btn btn-outline es-btn-full" id="gps-locate-btn">
              <i data-lucide="locate-fixed"></i> Use my current location
            </button>

            <div id="report-leaflet-map" class="es-report-map"></div>

            <div class="form-group">
              <label for="report-address">Address</label>
              <div class="es-input-action">
                <input type="text" id="report-address" class="form-control" placeholder="Finding address…" required>
                <button class="btn btn-secondary" id="address-lookup-btn">Find</button>
              </div>
            </div>

            <div id="nearest-office-card" class="es-office">Finding the nearest BBMP office…</div>
          </div>

          <!-- STEP 4: DETAILS -->
          <div class="wizard-step-panel es-panel" id="step-4-panel" style="display: none;">
            <h2 class="es-panel-title">A few more details</h2>
            <p class="es-panel-sub">Both are optional, but they help BBMP find and fix the spot.</p>

            <div class="form-group">
              <label for="report-desc">Description</label>
              <textarea id="report-desc" class="form-control" rows="4" maxlength="500" placeholder="What's there, how long it's been there, nearby landmarks…"></textarea>
            </div>

            <div class="es-voice">
              <button class="btn btn-outline" id="voice-record-btn">
                <i data-lucide="mic" class="mic-icon"></i>
                <span id="record-btn-text">Record a voice note</span>
              </button>
              <div id="recording-status" class="es-voice-status" style="display: none;">
                <span class="pulse-red-dot"></span> Recording <span id="record-timer">0:00</span> / 1:00
              </div>
              <div id="voice-loader" class="es-voice-status" style="display: none;">
                <span class="spinner-sm"></span> Turning your voice note into text…
              </div>
            </div>

            <div class="form-group">
              <label for="complainer-email">Your email for updates</label>
              <input type="email" id="complainer-email" class="form-control" placeholder="you@example.com">
            </div>
          </div>

          <!-- STEP 5: REVIEW -->
          <div class="wizard-step-panel es-panel" id="step-5-panel" style="display: none;">
            <h2 class="es-panel-title">Review and send</h2>
            <p class="es-panel-sub">This is what BBMP will receive.</p>
            <div class="es-summary" id="submission-summary-card"></div>
          </div>

          <div class="es-wizard-nav">
            <button class="btn btn-secondary" id="wizard-prev-btn" style="visibility: hidden;">Back</button>
            <button class="btn btn-primary" id="wizard-next-btn">Next</button>
          </div>
        </div>

        <!-- Duplicate warning dialog -->
        <div class="es-modal" id="duplicate-modal" style="display: none;">
          <div class="es-modal-card es-dialog">
            <h2 class="es-panel-title">Already reported nearby</h2>
            <p class="es-panel-sub" id="duplicate-dialog-text"></p>
            <div class="es-dialog-actions">
              <button class="btn btn-secondary" id="duplicate-no-btn">Report separately</button>
              <button class="btn btn-primary" id="duplicate-yes-btn">Add to that report</button>
            </div>
          </div>
        </div>

        <!-- Thank-you screen (filled by awardPointsAndShowSuccess) -->
        <div class="es-thanks" id="success-overlay" style="display: none;" aria-live="polite"></div>
      </div>
    `;
  },

  async mount() {
    this.currentStep = 1;
    this.mediaFiles = [];
    this.aiSuggestions = null;
    this.office = null;
    this.complaint = null;
    this.map = null;
    this.marker = null;
    this.gpsSource = null;
    this.locationData = { lat: 12.9716, lng: 77.6412, address: '', ward: '' };
    
    this.updateWizardUI();
    this.setupMediaListeners();
    this.setupWizardNavigation();
    this.setupLocationListeners();
    this.setupVoiceListeners();

    const user = Auth.getCurrentUser();
    document.getElementById('complainer-email').value = (user && user.email && !user.email.endsWith('@ecosort.gov')) ? user.email : '';
    // "Report here" from the map page pre-fills the location
    let prefill = null;
    try { prefill = JSON.parse(sessionStorage.getItem('ecosort_report_prefill') || 'null'); } catch (e) { prefill = null; }
    sessionStorage.removeItem('ecosort_report_prefill');
    if (prefill && typeof prefill.lat === 'number' && typeof prefill.lng === 'number') {
      this.locationData.lat = prefill.lat;
      this.locationData.lng = prefill.lng;
      this.gpsSource = 'map';
      this.setGpsStatus('📍 Location set from the map');
    } else {
      this.detectGPS(true);
    }
  },

  updateWizardUI() {
    // Progress Bar
    const progressFill = document.getElementById('wizard-progress-bar');
    const widthPercent = ((this.currentStep - 1) / 4) * 100;
    progressFill.style.width = `${widthPercent}%`;

    // Step dots
    document.querySelectorAll('.step-dot').forEach((dot, idx) => {
      dot.classList.remove('active', 'completed');
      if (idx + 1 === this.currentStep) {
        dot.classList.add('active');
      } else if (idx + 1 < this.currentStep) {
        dot.classList.add('completed');
      }
    });

    // Panels visibility
    for (let s = 1; s <= 5; s++) {
      const panel = document.getElementById(`step-${s}-panel`);
      if (panel) {
        if (s === this.currentStep) {
          panel.style.display = 'block';
          // Force layout reflow for CSS transitions
          panel.offsetHeight;
          panel.classList.add('active');
        } else {
          panel.style.display = 'none';
          panel.classList.remove('active');
        }
      }
    }

    // Prev / Next button adjustments
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');

    prevBtn.style.visibility = this.currentStep === 1 ? 'hidden' : 'visible';
    
    if (this.currentStep === 5) {
      nextBtn.innerText = 'Send complaint';
    } else {
      nextBtn.innerText = 'Next';
    }
  },

  // STEP 1: Media Capture
  setupMediaListeners() {
    const clickBox = document.getElementById('camera-click-box');
    const fileInput = document.getElementById('gallery-file-input');
    const webcamPreview = document.getElementById('webcam-preview');
    const webcamBtn = document.getElementById('webcam-toggle-btn');

    let stream = null;

    clickBox.addEventListener('click', async () => {
      // Check if webcam is running, if so, capture photo
      if (webcamPreview.style.display === 'block') {
        this.captureWebcamPhoto(webcamPreview, stream);
        return;
      }

      // Try running webcam
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        webcamPreview.srcObject = stream;
        webcamPreview.style.display = 'block';
        clickBox.querySelector('span').innerText = 'Tap again to take the photo';
        const camIcon = clickBox.querySelector('.camera-icon');
        if (camIcon) camIcon.style.display = 'none';
        webcamBtn.style.display = 'inline-flex';
      } catch (err) {
        console.warn('Webcam permission denied or unavailable, trigger file picker.', err);
        fileInput.click();
      }
    });

    webcamBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      webcamPreview.style.display = 'none';
      clickBox.querySelector('span').innerText = 'Tap to take a photo';
      const camIcon = clickBox.querySelector('.camera-icon');
      if (camIcon) camIcon.style.display = 'block';
      webcamBtn.style.display = 'none';
    });

    fileInput.addEventListener('change', async (e) => {
      for (const file of Array.from(e.target.files)) {
        if (this.mediaFiles.length >= 5) break;
        if (this.mediaFiles.length === 0) await this.readPhotoGPS(file);
        this.addMediaThumbnail(await this.compressImage(file), file.name);
      }
      e.target.value = '';
    });
  },

  async readPhotoGPS(file) {
    if (!window.exifr) return;
    try {
      const gps = await exifr.gps(file);
      if (gps && typeof gps.latitude === 'number') {
        this.locationData.lat = gps.latitude;
        this.locationData.lng = gps.longitude;
        this.locationData.address = '';
        this.gpsSource = 'photo';
        this.setGpsStatus('📍 Location read from the photo');
      }
    } catch (err) {
      console.warn('No GPS in photo', err);
    }
  },

  compressImage(file, maxSide = 1280) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(img.src);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = URL.createObjectURL(file);
    });
  },

  setGpsStatus(text) {
    const el = document.getElementById('gps-status');
    if (el) el.innerText = text;
  },

  captureWebcamPhoto(video, stream) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    this.addMediaThumbnail(dataUrl, `webcam_snap_${Date.now()}.jpg`);

    // Turn off camera
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    video.style.display = 'none';
    const clickBox = document.getElementById('camera-click-box');
    clickBox.querySelector('span').innerText = 'Tap to take a photo';
    const camIcon = clickBox.querySelector('.camera-icon');
    if (camIcon) camIcon.style.display = 'block';
    document.getElementById('webcam-toggle-btn').style.display = 'none';
  },

  addMediaThumbnail(dataUrl, name) {
    if (this.mediaFiles.length >= 5) {
      App.showToast('Photo limit reached', 'You can add up to 5 photos.', 'warning');
      return;
    }

    this.mediaFiles.push({ dataUrl, name });
    this.renderThumbnails();
  },

  removeMediaThumbnail(index) {
    this.mediaFiles.splice(index, 1);
    this.renderThumbnails();
  },

  renderThumbnails() {
    const container = document.getElementById('media-thumbnails');
    if (!container) return;

    container.innerHTML = this.mediaFiles.map((file, idx) => `
      <div class="es-thumb">
        <img src="${file.dataUrl}" alt="Photo ${idx + 1}">
        <button class="es-thumb-remove" onclick="ReportPage.removeMediaThumbnail(${idx})" aria-label="Remove photo">&times;</button>
      </div>
    `).join('');
  },

  // STEP 2: Photo check
  async triggerAIScan() {
    if (this.mediaFiles.length === 0) return;
    const scanView = document.getElementById('check-scanning-view');
    const formView = document.getElementById('check-results-form');
    const nextBtn = document.getElementById('wizard-next-btn');
    document.getElementById('scanning-preview-img').src = this.mediaFiles[0].dataUrl;
    scanView.style.display = 'block';
    formView.style.display = 'none';
    nextBtn.disabled = true;

    let a;
    try {
      a = await AI.analyzeDump(this.mediaFiles[0].dataUrl);
    } catch (err) {
      console.error(err);
      App.showToast('Photo check unavailable', 'Please fill in the details yourself.', 'warning');
      a = { is_dump: true, category: 'illegal_dumping', severity: 3, est_weight_kg: 0, suggested_title: '', description: '', confidence: 0, is_mock: true, failed: true };
    }
    this.aiSuggestions = a;

    document.getElementById('report-title').value = a.suggested_title || '';
    document.getElementById('report-category').value = a.category;
    document.getElementById('report-severity').value = a.severity;
    document.getElementById('report-dept').value = Green.departmentFor(a.category);
    if (!document.getElementById('report-desc').value) document.getElementById('report-desc').value = a.description || '';
    this.updateDeptHint();

    const kg = Math.round(Number(a.est_weight_kg) || 0);
    const banner = document.getElementById('photo-check-banner');
    banner.innerHTML = `
      ${a.is_mock && !a.failed ? '<div class="es-banner es-banner-info"><i data-lucide="info"></i><span>Sample result (demo mode)</span></div>' : ''}
      ${a.is_dump
        ? `<div class="es-banner es-banner-ok"><i data-lucide="check-circle-2"></i><span>Looks like a garbage dump · Severity ${a.severity}/5${kg ? ` · about ${kg} kg` : ''}</span></div>`
        : `<div class="es-banner es-banner-warn"><i data-lucide="alert-triangle"></i>
             <div><span>This doesn't look like waste dumped in a public place.</span>
               <div class="es-banner-actions">
                 <button class="btn btn-secondary btn-sm" id="check-retake-btn">Retake photo</button>
                 <button class="btn btn-outline btn-sm" id="check-continue-btn">Continue anyway</button>
               </div></div></div>`}`;

    scanView.style.display = 'none';
    formView.style.display = 'block';
    nextBtn.disabled = !a.is_dump;
    this.setupCategoryChangeListener();
    if (window.lucide) window.lucide.createIcons();

    if (!a.is_dump) {
      document.getElementById('check-retake-btn').onclick = () => {
        this.mediaFiles = [];
        this.renderThumbnails();
        this.currentStep = 1;
        nextBtn.disabled = false;
        this.updateWizardUI();
      };
      document.getElementById('check-continue-btn').onclick = () => {
        nextBtn.disabled = false;
        banner.innerHTML = '<div class="es-banner es-banner-info"><i data-lucide="info"></i><span>Okay, continuing with this photo.</span></div>';
        if (window.lucide) window.lucide.createIcons();
      };
    }
  },

  updateDeptHint() {
    const hint = document.getElementById('report-dept-hint');
    const cat = document.getElementById('report-category');
    if (hint && cat) hint.innerText = `Handled by BBMP ${Green.DEPARTMENTS[Green.departmentFor(cat.value)] || ''}`;
  },

  setupCategoryChangeListener() {
    document.getElementById('report-category').onchange = (e) => {
      document.getElementById('report-dept').value = Green.departmentFor(e.target.value);
      this.updateDeptHint();
    };
  },

  async loadNearestOffice() {
    const card = document.getElementById('nearest-office-card');
    if (!card) return;
    const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    try {
      const res = await fetch(`${CONFIG.API_BASE}/api/offices/nearest?lat=${this.locationData.lat}&lng=${this.locationData.lng}`);
      this.office = await res.json();
      card.innerHTML = `
        <i data-lucide="landmark" class="es-office-icon"></i>
        <div>
          <div class="es-office-label">Nearest BBMP office · ${esc(this.office.distance_km)} km</div>
          <div class="es-office-name">${esc(this.office.name)}</div>
          <div class="es-hint">${this.office.email_enabled
            ? `Your complaint will be emailed to ${esc(this.office.recipient)}`
            : 'Your complaint will be registered and tracked in the app'}</div>
        </div>`;
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error(err);
      card.innerHTML = '<span class="es-hint">Could not find the nearest office. Please check your connection.</span>';
    }
  },

  // STEP 3: Location Select
  setupLocationListeners() {
    const gpsBtn = document.getElementById('gps-locate-btn');
    const lookupBtn = document.getElementById('address-lookup-btn');

    gpsBtn.addEventListener('click', () => this.detectGPS());
    lookupBtn.addEventListener('click', () => this.lookupAddressText());
  },

  detectGPS(silent = false) {
    if (!navigator.geolocation) {
      this.setGpsStatus('⚠️ This browser cannot share location: pin it on the map in Step 3.');
      return;
    }

    if (!silent) App.showToast('Locating...', 'Fetching GPS coordinates...', 'info');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (silent && (this.gpsSource === 'photo' || this.gpsSource === 'map')) return; // photo/map location wins over device GPS
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.locationData.lat = lat;
        this.locationData.lng = lng;
        this.locationData.address = '';
        this.gpsSource = 'device';
        this.setGpsStatus(`📍 Location traced (±${Math.round(pos.coords.accuracy)} m)`);

        this.updateMapPosition(lat, lng);
        await this.reverseGeocode(lat, lng);
      },
      (err) => {
        console.warn(err);
        this.setGpsStatus('⚠️ Location not available. Allow location access, or pin it on the map in Step 3.');
        if (!silent) App.showToast('GPS unavailable', 'Allow location access or pin the spot manually.', 'warning');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  },

  initLocationMap() {
    const lat = this.locationData.lat;
    const lng = this.locationData.lng;

    const mapContainer = document.getElementById('report-leaflet-map');
    if (!mapContainer || this.map) return;

    if (MapHelper.isGoogleMapsAvailable()) {
      mapContainer.innerHTML = '';
      this.map = new google.maps.Map(mapContainer, {
        center: { lat: lat, lng: lng },
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true
      });

      this.marker = new google.maps.Marker({
        position: { lat: lat, lng: lng },
        map: this.map,
        draggable: true
      });

      this.marker.addListener('dragend', async () => {
        const pos = this.marker.getPosition();
        this.locationData.lat = pos.lat();
        this.locationData.lng = pos.lng();
        await this.reverseGeocode(this.locationData.lat, this.locationData.lng);
      });

      this.map.addListener('click', async (e) => {
        const pos = e.latLng;
        this.marker.setPosition(pos);
        this.locationData.lat = pos.lat();
        this.locationData.lng = pos.lng();
        await this.reverseGeocode(this.locationData.lat, this.locationData.lng);
      });
    } else {
      if (this.map && typeof this.map.remove === 'function') {
        try { this.map.remove(); } catch(e) {}
      }
      mapContainer.innerHTML = '';

      this.map = L.map(mapContainer, {
        zoomControl: true,
        attributionControl: false
      }).setView([lat, lng], 14);

      const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      L.tileLayer(tileUrl, {
        maxZoom: 19
      }).addTo(this.map);

      this.marker = L.marker([lat, lng], {
        draggable: true
      }).addTo(this.map);

      this.marker.on('dragend', async (e) => {
        const position = this.marker.getLatLng();
        this.locationData.lat = position.lat;
        this.locationData.lng = position.lng;
        await this.reverseGeocode(this.locationData.lat, this.locationData.lng);
      });

      this.map.on('click', async (e) => {
        const position = e.latlng;
        this.marker.setLatLng(position);
        this.locationData.lat = position.lat;
        this.locationData.lng = position.lng;
        await this.reverseGeocode(this.locationData.lat, this.locationData.lng);
      });
    }

    if (this.locationData.address) {
      document.getElementById('report-address').value = this.locationData.address;
      this.loadNearestOffice();
    } else {
      this.reverseGeocode(lat, lng);
    }

    // Pre-register maps failed event to re-load dynamically if authentication triggers
    window.addEventListener('google-maps-failed', () => {
      this.map = null;
      this.marker = null;
      this.initLocationMap();
    });
  },

  updateMapPosition(lat, lng) {
    if (this.map && this.marker) {
      if (MapHelper.isGoogleMapsAvailable()) {
        this.map.setCenter({ lat: lat, lng: lng });
        this.map.setZoom(15);
        this.marker.setPosition({ lat: lat, lng: lng });
      } else {
        this.map.setView([lat, lng], 15);
        this.marker.setLatLng([lat, lng]);
      }
    }
  },

  async reverseGeocode(lat, lng) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
        headers: { 'Accept-Language': 'en' }
      });
      const data = await response.json();
      const addr = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      this.locationData.address = addr;
      const addrInput = document.getElementById('report-address');
      if (addrInput) addrInput.value = addr;

      this.loadNearestOffice();
    } catch (err) {
      console.error(err);
      this.locationData.address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      const addrInput = document.getElementById('report-address');
      if (addrInput) addrInput.value = this.locationData.address;
      this.loadNearestOffice();
    }
  },

  async lookupAddressText() {
    const address = document.getElementById('report-address').value.trim();
    if (!address) return;

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        this.locationData.lat = lat;
        this.locationData.lng = lng;
        this.locationData.address = data[0].display_name;

        this.updateMapPosition(lat, lng);
        this.loadNearestOffice();
        App.showToast('Location Mapped', 'Map pin placed at address location.', 'success');
      } else {
        App.showToast('Address not found', 'Could not locate that address. Pin manually on map.', 'warning');
      }
    } catch (err) {
      console.error(err);
    }
  },

  // STEP 4: Voice Transcription
  setupVoiceListeners() {
    const recordBtn = document.getElementById('voice-record-btn');
    const timerText = document.getElementById('record-timer');
    const recStatus = document.getElementById('recording-status');
    const loader = document.getElementById('voice-loader');
    const descField = document.getElementById('report-desc');

    let timerInterval = null;
    let secondsElapsed = 0;

    recordBtn.addEventListener('click', async () => {
      if (this.isRecordingAudio) {
        // Stop recording
        this.isRecordingAudio = false;
        clearInterval(timerInterval);
        recStatus.style.display = 'none';
        recordBtn.querySelector('span').innerText = 'Record a voice note';
        const micIcon = recordBtn.querySelector('.mic-icon');
        if (micIcon) {
          micIcon.classList.remove('pulse-red');
          micIcon.style.animation = '';
        }

        loader.style.display = 'block';
        
        const stopAndProcess = async (audioDataUrl) => {
          try {
            const category = document.getElementById('report-category')?.value || 'other';
            const res = await AI.transcribeAudio(audioDataUrl);
            const transcriptionText = (typeof res === 'string') ? res : (res.transcription || res.text || JSON.stringify(res));
            descField.value = transcriptionText;
            descField.dispatchEvent(new Event('input', { bubbles: true }));
            App.showToast('Voice Transcribed', 'Description filled from voice report.', 'success');
          } catch (err) {
            console.error(err);
            App.showToast('Transcription Failed', 'Could not transcribe voice note.', 'warning');
          } finally {
            loader.style.display = 'none';
          }
        };

        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
              stopAndProcess(reader.result);
            };
            reader.readAsDataURL(audioBlob);
          };
          this.mediaRecorder.stop();
          if (this.mediaRecorder.stream) {
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
          }
        } else {
          stopAndProcess('data:audio/webm;base64,mock');
        }
      } else {
        // Start recording
        this.isRecordingAudio = true;
        this.audioChunks = [];
        secondsElapsed = 0;
        timerText.innerText = '0:00';
        recStatus.style.display = 'block';
        recordBtn.querySelector('span').innerText = 'Stop recording';
        const micIcon = recordBtn.querySelector('.mic-icon');
        if (micIcon) {
          micIcon.classList.add('pulse-red');
          micIcon.style.animation = 'micPulseAnimation 1.2s infinite alternate';
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.mediaRecorder = new MediaRecorder(stream);
          this.mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              this.audioChunks.push(e.data);
            }
          };
          this.mediaRecorder.start();
        } catch (err) {
          console.warn('Microphone access denied or unsupported, using simulation mode.', err);
          this.mediaRecorder = null;
        }

        timerInterval = setInterval(() => {
          secondsElapsed++;
          const mins = Math.floor(secondsElapsed / 60);
          const secs = secondsElapsed % 60;
          timerText.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

          if (secondsElapsed >= 60) {
            recordBtn.click(); // Auto-stop at 60s
          }
        }, 1000);
      }
    });
  },

  // Navigation Logic
  setupWizardNavigation() {
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');

    prevBtn.addEventListener('click', () => {
      if (this.currentStep > 1) {
        this.currentStep--;
        this.updateWizardUI();
        if (this.currentStep === 3) {
          setTimeout(() => {
            this.initLocationMap();
          }, 100);
        }
      }
    });

    nextBtn.addEventListener('click', async () => {
      // Step validations
      if (this.currentStep === 1) {
        if (this.mediaFiles.length === 0) {
          App.showToast('Photo Required', 'Please snap or upload at least 1 image.', 'warning');
          return;
        }
        this.currentStep++;
        this.updateWizardUI();
        this.triggerAIScan();
      } else if (this.currentStep === 2) {
        const title = document.getElementById('report-title').value.trim();
        if (!title) {
          App.showToast('Title Required', 'Please enter a title for the issue.', 'warning');
          return;
        }
        this.currentStep++;
        this.updateWizardUI();
        setTimeout(() => {
          this.initLocationMap();
        }, 100);
      } else if (this.currentStep === 3) {
        const address = document.getElementById('report-address').value.trim();
        if (!address) {
          App.showToast('Address Required', 'Please input address details.', 'warning');
          return;
        }
        this.locationData.address = address;
        this.locationData.ward = this.office ? `${this.office.zone} Zone` : 'Bengaluru';
        this.currentStep++;
        this.updateWizardUI();
      } else if (this.currentStep === 4) {
        const email = document.getElementById('complainer-email').value.trim();
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          App.showToast('Invalid email', 'Please enter a valid email for updates.', 'warning');
          return;
        }
        this.currentStep++;
        this.updateWizardUI();
        await this.renderSummary();
      } else if (this.currentStep === 5) {
        // Final Submit
        await this.checkDuplicateAndSubmit();
      }
    });
  },

  async renderSummary() {
    const card = document.getElementById('submission-summary-card');
    if (!card) return;
    card.innerHTML = '<div class="es-hint"><span class="spinner-sm"></span> Preparing the complaint…</div>';
    const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    try {
      const res = await fetch(`${CONFIG.API_BASE}/api/complaints/preview`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ issue: this.buildIssueDraft(), user_id: (Auth.getCurrentUser() || {}).id })
      });
      const p = await res.json();
      card.innerHTML = `
        <div class="es-summary-top">
          <img src="${this.mediaFiles[0].dataUrl}" alt="Your photo" class="es-summary-photo">
          <dl class="es-summary-list">
            <div><dt>Office</dt><dd>${esc(p.office.name)}</dd></div>
            <div><dt>Email to</dt><dd>${p.email_enabled ? `<strong>${esc(p.to)}</strong>` : '<span class="es-hint">Not emailed (tracked in the app)</span>'}</dd></div>
            ${p.email_enabled ? `<div><dt>Copy to you</dt><dd>${esc(document.getElementById('complainer-email').value.trim()) || '<span class="es-hint">No email entered (add one in the previous step to get a copy)</span>'}</dd></div>
            <div><dt>Sent from</dt><dd>${esc(p.sender)}</dd></div>` : ''}
            <div><dt>Subject</dt><dd>${esc(p.subject)}</dd></div>
            <div><dt>Location</dt><dd>${esc(this.locationData.address)}</dd></div>
          </dl>
        </div>
        ${p.email_problem ? `<div class="es-banner es-banner-warn"><span>📧 Email will not be sent: ${esc(p.email_problem)}</span></div>` : ''}
        <details class="es-letter" open>
          <summary>Complaint letter</summary>
          <pre>${esc(p.body)}</pre>
        </details>`;
    } catch (err) {
      console.error(err);
      card.innerHTML = '<div class="es-banner es-banner-warn"><span>Could not load the preview. Please check your connection.</span></div>';
    }
  },

  buildIssueDraft() {
    return {
      title: document.getElementById('report-title').value.trim(),
      description: document.getElementById('report-desc').value.trim(),
      category: document.getElementById('report-category').value,
      severity: parseInt(document.getElementById('report-severity').value),
      est_weight_kg: this.aiSuggestions ? this.aiSuggestions.est_weight_kg : 0,
      lat: this.locationData.lat,
      lng: this.locationData.lng,
      address: this.locationData.address
    };
  },

  async checkDuplicateAndSubmit() {
    const category = document.getElementById('report-category').value;
    
    // Fetch all open issues in the system
    const issues = await DB.getAll('issues');
    const openSameCategory = issues.filter(i => i.status === 'open' && i.category === category);

    // Calculate distance (simple lat/lng delta to meters check)
    // 100 meters is roughly 0.0009 degrees of lat/lng
    const maxDeltaDegrees = 0.0009;
    
    const duplicate = openSameCategory.find(i => {
      const latDiff = Math.abs(i.lat - this.locationData.lat);
      const lngDiff = Math.abs(i.lng - this.locationData.lng);
      return latDiff < maxDeltaDegrees && lngDiff < maxDeltaDegrees;
    });

    if (duplicate) {
      // Show Warning Modal
      const modal = document.getElementById('duplicate-modal');
      const dialogText = document.getElementById('duplicate-dialog-text');
      
      dialogText.innerText = `Someone already reported "${duplicate.title}" (${Green.label(category)}) within about 100 m. Add your report to it instead? You still earn your points.`;
      modal.style.display = 'flex';

      // Yes merge button
      document.getElementById('duplicate-yes-btn').onclick = async () => {
        modal.style.display = 'none';
        await this.mergeDuplicateReport(duplicate.id);
      };

      // No create new button
      document.getElementById('duplicate-no-btn').onclick = async () => {
        modal.style.display = 'none';
        await this.submitNewReport();
      };
    } else {
      await this.submitNewReport();
    }
  },

  async mergeDuplicateReport(duplicateId) {
    const issue = await DB.get('issues', duplicateId);
    if (!issue) return;

    const user = Auth.getCurrentUser();
    
    issue.report_count = (issue.report_count || 1) + 1;
    await DB.put('issues', issue);

    // Add co-reporter comment/upvote verification
    const verification = {
      id: 'v_co_' + Date.now(),
      issue_id: duplicateId,
      user_id: user.id,
      type: 'co_report',
      content: document.getElementById('report-desc').value || 'User co-reported this issue.',
      created_at: new Date().toISOString()
    };
    await DB.put('verifications', verification);

    // Timeline Log
    await DB.put('issue_timeline', {
      id: 't_co_' + Date.now(),
      issue_id: duplicateId,
      actor_id: user.id,
      actor_role: user.role,
      action: 'commented',
      note: 'Co-signed this complaint. (+50 points awarded)',
      created_at: new Date().toISOString()
    });

    // Award Points
    await this.awardPointsAndShowSuccess(duplicateId, issue.severity);
  },

  async submitNewReport() {
    const user = Auth.getCurrentUser();
    const title = document.getElementById('report-title').value.trim();
    const category = document.getElementById('report-category').value;
    const severity = parseInt(document.getElementById('report-severity').value);
    const department = document.getElementById('report-dept').value;
    const description = document.getElementById('report-desc').value.trim();

    const newIssueId = 'issue_' + Date.now();

    const newIssue = {
      id: newIssueId,
      title,
      description,
      category,
      severity,
      status: 'open',
      media_urls: this.mediaFiles.map(f => f.dataUrl),
      lat: this.locationData.lat,
      lng: this.locationData.lng,
      address: this.locationData.address,
      ward: this.locationData.ward,
      reporter_id: user.id,
      upvote_count: 0,
      report_count: 1,
      assigned_to: null,
      department: Green.departmentFor(category),
      est_weight_kg: this.aiSuggestions ? this.aiSuggestions.est_weight_kg : 0,
      ai_category: this.aiSuggestions ? this.aiSuggestions.category : category,
      ai_severity: this.aiSuggestions ? this.aiSuggestions.severity : severity,
      ai_confidence: this.aiSuggestions ? this.aiSuggestions.confidence : 1.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      before_photo_url: this.mediaFiles[0].dataUrl,
      after_photo_url: null,
      ai_resolution_validated: false,
      ai_resolution_confidence: null
    };

    await DB.put('issues', newIssue);

    const nextBtn = document.getElementById('wizard-next-btn');
    nextBtn.disabled = true;
    nextBtn.innerText = 'Raising complaint…';
    try {
      const sendRes = await fetch(`${CONFIG.API_BASE}/api/complaints/${newIssueId}/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complainer_email: document.getElementById('complainer-email').value.trim() })
      });
      if (!sendRes.ok) throw new Error(`send failed (${sendRes.status})`);
      this.complaint = await sendRes.json();
    } catch (err) {
      console.error(err);
      App.showToast('Complaint saved', 'Your report is saved, but it could not be forwarded to BBMP right now.', 'warning');
    } finally {
      nextBtn.disabled = false;
    }

    // Add Timeline Log
    await DB.put('issue_timeline', {
      id: 't_rep_' + Date.now(),
      issue_id: newIssueId,
      actor_id: user.id,
      actor_role: user.role,
      action: 'reported',
      note: 'Garbage dump reported with photo and GPS location. (+50 points awarded)',
      created_at: newIssue.created_at // keep it first in the timeline, before "Complaint raised"
    });

    // Award points
    await this.awardPointsAndShowSuccess(newIssueId, severity);
  },

  async awardPointsAndShowSuccess(issueId, severity) {
    const POINTS = 50;
    const user = Auth.getCurrentUser();
    user.points = (user.points || 0) + POINTS;

    // Badges
    const userBadges = await DB.getAll('badges');
    const myBadges = userBadges.filter(b => b.user_id === user.id);

    if (!myBadges.some(b => b.badge_type === 'first_reporter')) {
      await DB.put('badges', {
        id: 'badge_' + Date.now(),
        user_id: user.id,
        badge_type: 'first_reporter',
        awarded_at: new Date().toISOString()
      });
      App.addNotification('Badge Awarded!', 'You earned the "First Reporter" badge!', 'success');
    }

    const allIssues = await DB.getAll('issues');
    const myReportsCount = allIssues.filter(i => i.reporter_id === user.id).length;
    if (myReportsCount >= 10 && !myBadges.some(b => b.badge_type === 'watchdog')) {
      await DB.put('badges', {
        id: 'badge_' + Date.now() + '_w',
        user_id: user.id,
        badge_type: 'watchdog',
        awarded_at: new Date().toISOString()
      });
      App.addNotification('Badge Awarded!', 'You earned the "Watchdog" badge!', 'success');
    }

    await DB.put('users', user);
    await Auth.refreshUser();

    // Rank among citizens, computed after the points were added
    let rank = 0, citizenCount = 0;
    try {
      const citizens = (await DB.getAll('users'))
        .filter(u => u.role === 'citizen')
        .sort((a, b) => (b.points || 0) - (a.points || 0));
      citizenCount = citizens.length;
      rank = citizens.findIndex(u => u.id === user.id) + 1;
    } catch (err) {
      console.warn('Could not compute rank', err);
    }

    this.showThankYou({ issueId, points: POINTS, total: user.points, rank, citizenCount, complaint: this.complaint });
  },

  showThankYou({ issueId, points, total, rank, citizenCount, complaint }) {
    const overlay = document.getElementById('success-overlay');
    if (!overlay) return;
    const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const c = complaint;

    // Leaf and confetti burst pieces
    const symbols = ['🌱', '♻️', '🍃', '🎉', '💚', '🌿'];
    const colors = ['var(--primary-color, #1E7B34)', 'var(--accent, #7CB342)', '#FBC02D', '#4FC3F7', '#FF8A65'];
    const pieces = Array.from({ length: 28 }, (_, i) => {
      const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 110 + Math.random() * 160;
      const x = Math.round(Math.cos(angle) * dist);
      const y = Math.round(Math.sin(angle) * dist * 0.8 - 40);
      const style = `--x:${x}px;--y:${y}px;--r:${Math.round(Math.random() * 540 - 270)}deg;--d:${(Math.random() * 0.25).toFixed(2)}s`;
      return i % 3 === 0
        ? `<span class="es-burst-piece es-burst-emoji" style="${style}">${symbols[Math.floor(i / 3) % symbols.length]}</span>`
        : `<span class="es-burst-piece es-burst-dot" style="${style};background:${colors[i % colors.length]}"></span>`;
    }).join('');

    overlay.innerHTML = `
      <div class="es-thanks-card" role="dialog" aria-modal="true" aria-labelledby="success-title">
        <div class="es-burst" aria-hidden="true">${pieces}</div>
        <div class="es-thanks-icon"><i data-lucide="party-popper"></i></div>
        <h1 id="success-title" class="es-thanks-title">Thank you for contributing!</h1>
        <p class="es-thanks-sub">You're helping keep Bengaluru clean. <span aria-hidden="true">🌱</span></p>

        <div class="es-thanks-points">
          <span class="es-thanks-plus">+${points}</span>
          <span class="es-thanks-plus-label">points added</span>
        </div>

        <div class="es-thanks-stats">
          <div class="es-thanks-stat">
            <i data-lucide="leaf"></i>
            <div><strong>${Number(total || 0).toLocaleString('en-IN')}</strong><span>total points</span></div>
          </div>
          ${rank ? `
          <div class="es-thanks-stat">
            <i data-lucide="trophy"></i>
            <div><strong id="success-rank">Rank #${rank}</strong><span>of ${citizenCount} citizens</span></div>
          </div>` : ''}
        </div>

        ${c ? `<p class="es-thanks-ticket" id="success-issue-id"><span class="es-chip es-chip-ticket">${esc(c.ticket_id)}</span>
          ${c.email_status === 'sent' ? 'Emailed to' : 'Registered with'} ${esc(c.office_name)}</p>
          <p class="es-thanks-email" id="success-email-line">${c.email_status === 'sent'
            ? `📧 Sent to <strong>${esc(c.email_to)}</strong>${c.email_cc ? ` · copy to <strong>${esc(c.email_cc)}</strong>` : ''}`
            : `📧 Email not sent: ${esc(c.email_error || 'email is not set up')}`}</p>` : ''}

        <div class="es-thanks-actions">
          <button class="btn btn-primary" id="success-close-btn"><i data-lucide="home"></i> Back to Home</button>
          <button class="btn btn-outline" id="success-view-btn"><i data-lucide="file-text"></i> View my complaint</button>
        </div>
      </div>`;

    overlay.classList.remove('is-open', 'is-closing');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (window.lucide) window.lucide.createIcons();
    void overlay.offsetHeight; // reflow so the entrance transition runs
    overlay.classList.add('is-open');

    const close = (after) => {
      overlay.classList.remove('is-open');
      overlay.classList.add('is-closing');
      setTimeout(() => {
        overlay.style.display = 'none';
        overlay.classList.remove('is-closing');
        document.body.style.overflow = '';
        after();
      }, 320);
    };

    document.getElementById('success-close-btn').onclick = () => close(() => Router.navigate('#/home'));
    document.getElementById('success-view-btn').onclick = () => close(() => {
      Router.navigate('#/home');
      // Wait for the home page to mount, then open the issue
      let tries = 0;
      const timer = setInterval(() => {
        tries++;
        if (document.getElementById('issue-modal') && window.HomePage) {
          clearInterval(timer);
          HomePage.openIssueDetails(issueId);
        } else if (tries > 40) {
          clearInterval(timer);
        }
      }, 100);
    });
  }
};

// Expose globally
window.ReportPage = ReportPage;
