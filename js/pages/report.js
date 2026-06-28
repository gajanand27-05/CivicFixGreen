// js/pages/report.js
// Issue Reporting Wizard (5 Steps)

const ReportPage = {
  currentStep: 1,
  mediaFiles: [], // array of dataURLs
  aiSuggestions: null,
  locationData: { lat: 12.9716, lng: 77.5946, address: '', ward: 'Ward 4' },
  map: null,
  marker: null,
  mediaRecorder: null,
  audioChunks: [],
  isRecordingAudio: false,

  async render() {
    return `
      <div class="report-wizard">
        <!-- Wizard Progress Bar -->
        <div class="wizard-progress">
          <div class="progress-line-bg">
            <div class="progress-line-fill" id="wizard-progress-bar" style="width: 20%;"></div>
          </div>
          <div class="progress-steps-row">
            <div class="step-dot active" data-step="1">1</div>
            <div class="step-dot" data-step="2">2</div>
            <div class="step-dot" data-step="3">3</div>
            <div class="step-dot" data-step="4">4</div>
            <div class="step-dot" data-step="5">5</div>
          </div>
          <div class="progress-labels-row">
            <span>Media</span>
            <span>AI Classify</span>
            <span>Location</span>
            <span>Details</span>
            <span>Submit</span>
          </div>
        </div>

        <div class="wizard-card">
          <!-- STEP 1: MEDIA CAPTURE -->
          <div class="wizard-step-panel" id="step-1-panel">
            <h2>Step 1: Capture Media</h2>
            <p class="text-muted">Take a photo or upload up to 5 images from your gallery.</p>
            
            <div class="camera-capture-box" id="camera-click-box">
              <i data-lucide="camera" class="camera-icon"></i>
              <span>Tap to Capture Photo</span>
              <video id="webcam-preview" autoplay playsinline style="display: none;"></video>
            </div>
            
            <div class="upload-options">
              <label class="btn btn-outline file-upload-label">
                <i data-lucide="image"></i> Upload from Gallery
                <input type="file" id="gallery-file-input" accept="image/*" multiple style="display: none;">
              </label>
              <button class="btn btn-outline" id="webcam-toggle-btn" style="display:none;">Use Camera Live</button>
            </div>

            <div class="thumbnails-container" id="media-thumbnails">
              <!-- Thumbnail previews -->
            </div>
          </div>

          <!-- STEP 2: AI CLASSIFICATION -->
          <div class="wizard-step-panel" id="step-2-panel" style="display: none;">
            <h2>Step 2: AI Classification</h2>
            <p class="text-muted">Our AI is analyzing your image to pre-fill details.</p>
            
            <div class="simulation-selector-box" id="simulation-selector-box" style="display: none; margin-top: 15px;">
              <div class="alert alert-info" style="background: rgba(26, 86, 219, 0.1); border: 1px solid rgba(26, 86, 219, 0.2); color: var(--primary-color);">
                <i data-lucide="info" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 6px;"></i> <strong>Simulation Mode</strong>: Select the issue type in your photo to simulate AI auto-detection.
              </div>
              <div class="sim-category-grid">
                <button class="sim-cat-btn" data-cat="pothole"><i data-lucide="layout-grid"></i> Pothole</button>
                <button class="sim-cat-btn" data-cat="streetlight"><i data-lucide="lightbulb"></i> Streetlight</button>
                <button class="sim-cat-btn" data-cat="water_leakage"><i data-lucide="droplet"></i> Water Leak</button>
                <button class="sim-cat-btn" data-cat="garbage"><i data-lucide="trash-2"></i> Garbage</button>
                <button class="sim-cat-btn" data-cat="flooding"><i data-lucide="waves"></i> Flooding</button>
                <button class="sim-cat-btn" data-cat="road_damage"><i data-lucide="navigation-2"></i> Road Damage</button>
                <button class="sim-cat-btn" data-cat="vandalism"><i data-lucide="dribbble"></i> Vandalism</button>
                <button class="sim-cat-btn" data-cat="encroachment"><i data-lucide="store"></i> Encroachment</button>
                <button class="sim-cat-btn" data-cat="other"><i data-lucide="help-circle"></i> Other</button>
              </div>
            </div>

            <div class="ai-scanning-overlay" id="ai-scanning-view" style="display: none;">
              <div class="scanning-image-box">
                <img id="scanning-preview-img" src="" class="scanning-img">
                <div class="scan-bar"></div>
              </div>
              <div class="scanning-text"><span class="spinner-sm"></span> Gemma 4 AI Classifying issue...</div>
            </div>

            <div class="ai-results-form" id="ai-results-form" style="display: none;">
              <div class="alert alert-info">
                <i data-lucide="sparkles"></i> AI suggestions loaded. Please verify before submitting.
              </div>
              
              <div class="form-group">
                <label for="report-title">Suggested Title</label>
                <input type="text" id="report-title" class="form-control" required>
              </div>

              <div class="form-row">
                <div class="form-group half-width">
                  <label for="report-category">Category</label>
                  <select id="report-category" class="form-control">
                    <option value="pothole">Pothole</option>
                    <option value="streetlight">Streetlight</option>
                    <option value="water_leakage">Water Leakage</option>
                    <option value="garbage">Garbage Overflow</option>
                    <option value="flooding">Flooding</option>
                    <option value="road_damage">Road Damage</option>
                    <option value="vandalism">Vandalism</option>
                    <option value="encroachment">Encroachment</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div class="form-group half-width">
                  <label for="report-severity">Severity Level (1-5)</label>
                  <select id="report-severity" class="form-control">
                    <option value="1">1 (Very Minor)</option>
                    <option value="2">2 (Minor)</option>
                    <option value="3">3 (Moderate)</option>
                    <option value="4">4 (Critical)</option>
                    <option value="5">5 (Severe Hazard)</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="report-dept">Assigned Department</label>
                <select id="report-dept" class="form-control" disabled>
                  <option value="roads">Roads Department</option>
                  <option value="electricity">Electricity Board</option>
                  <option value="water">Water Supply & Sewerage</option>
                  <option value="sanitation">Sanitation & Garbage Clean</option>
                  <option value="municipality">Municipal Corporation</option>
                </select>
              </div>
            </div>
          </div>

          <!-- STEP 3: LOCATION SELECT -->
          <div class="wizard-step-panel" id="step-3-panel" style="display: none;">
            <h2>Step 3: Pinpoint Location</h2>
            <p class="text-muted">Auto-detect GPS or drag the pin to match the exact issue spot.</p>
            
            <button class="btn btn-primary btn-block mb-3" id="gps-locate-btn">
              <i data-lucide="navigation"></i> Auto-detect GPS Coordinates
            </button>

            <div class="report-map-container">
              <div id="report-leaflet-map" style="width: 100%; height: 280px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);"></div>
            </div>

            <div class="form-group mt-3">
              <label for="report-address">Human-Readable Address</label>
              <div class="input-with-action">
                <input type="text" id="report-address" class="form-control" placeholder="Reverse geocoding..." required>
                <button class="btn btn-secondary" id="address-lookup-btn">Lookup</button>
              </div>
            </div>

            <div class="form-group">
              <label for="report-ward">Select Ward/Area</label>
              <select id="report-ward" class="form-control">
                <option value="Ward 4">Ward 4 (Indiranagar)</option>
                <option value="Ward 5">Ward 5 (HAL Stage 2)</option>
                <option value="Ward 6">Ward 6 (Domlur)</option>
              </select>
            </div>
          </div>

          <!-- STEP 4: DESCRIPTION & AUDIO -->
          <div class="wizard-step-panel" id="step-4-panel" style="display: none;">
            <h2>Step 4: Additional Details</h2>
            <p class="text-muted">Type description or tap to speak for voice transcription.</p>
            
            <div class="form-group">
              <label for="report-desc">Description (max 500 characters)</label>
              <textarea id="report-desc" class="form-control" rows="5" maxlength="500" placeholder="Describe the issue, landmarks, hazard details..."></textarea>
            </div>

            <div class="voice-transcribe-container">
              <button class="btn btn-outline" id="voice-record-btn">
                <i data-lucide="mic" class="mic-icon"></i>
                <span id="record-btn-text">Record Voice Note</span>
              </button>
              <div id="recording-status" class="recording-status" style="display: none;">
                <span class="pulse-red-dot"></span> <span id="record-timer">0:00</span> / 1:00 (Recording...)
              </div>
              <div id="voice-loader" class="voice-loader" style="display: none;">
                <span class="spinner-sm"></span> Gemma 4 AI transcribing voice...
              </div>
            </div>
          </div>

          <!-- STEP 5: SUMMARY & SUBMIT -->
          <div class="wizard-step-panel" id="step-5-panel" style="display: none;">
            <h2>Step 5: Review & Submit</h2>
            <p class="text-muted">Confirm details below before final submission.</p>
            
            <div class="summary-card" id="submission-summary-card">
              <!-- Rendered dynamically -->
            </div>
          </div>

          <!-- Navigation buttons -->
          <div class="wizard-buttons-row">
            <button class="btn btn-secondary" id="wizard-prev-btn" style="visibility: hidden;">Back</button>
            <button class="btn btn-primary" id="wizard-next-btn">Next</button>
          </div>
        </div>

        <!-- Duplicate warning dialog -->
        <div class="modal-overlay" id="duplicate-modal" style="display: none;">
          <div class="modal-card dialog-card">
            <h2>Duplicate Report Detected</h2>
            <p class="dialog-text" id="duplicate-dialog-text"></p>
            <div class="dialog-buttons">
              <button class="btn btn-secondary" id="duplicate-no-btn">No, Create New</button>
              <button class="btn btn-primary" id="duplicate-yes-btn">Yes, Merge Report</button>
            </div>
          </div>
        </div>

        <!-- Success Screen Overlay -->
        <div class="modal-overlay" id="success-overlay" style="display: none;">
          <div class="success-screen">
            <div class="success-icon-container">
              <i data-lucide="check" class="success-icon"></i>
            </div>
            <h1>Report Submitted Successfully!</h1>
            <p id="success-issue-id" class="success-issue-id"></p>
            <p id="success-points" class="success-points">+50 Points Added to Profile!</p>
            <div class="sla-card" id="success-sla-card">
              <!-- SLA dynamic details -->
            </div>
            <button class="btn btn-primary btn-block mt-4" id="success-close-btn">Go to Home Feed</button>
          </div>
        </div>
      </div>
    `;
  },

  async mount() {
    this.currentStep = 1;
    this.mediaFiles = [];
    this.aiSuggestions = null;
    this.locationData = { lat: 12.9716, lng: 77.5946, address: '', ward: 'Ward 4' };
    
    this.updateWizardUI();
    this.setupMediaListeners();
    this.setupWizardNavigation();
    this.setupLocationListeners();
    this.setupVoiceListeners();
  },

  updateWizardUI() {
    // Progress Bar
    const progressFill = document.getElementById('wizard-progress-bar');
    const widthPercent = ((this.currentStep - 1) / 4) * 100;
    progressFill.style.width = `${Math.max(10, widthPercent)}%`;

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
      nextBtn.innerText = 'Submit Report';
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
        clickBox.querySelector('span').innerText = 'Click inside box to Snap Photo';
        const camIcon = clickBox.querySelector('.camera-icon');
        if (camIcon) camIcon.style.display = 'none';
        webcamBtn.style.display = 'inline-block';
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
      clickBox.querySelector('span').innerText = 'Tap to Capture Photo';
      const camIcon = clickBox.querySelector('.camera-icon');
      if (camIcon) camIcon.style.display = 'block';
      webcamBtn.style.display = 'none';
    });

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        if (this.mediaFiles.length >= 5) return;
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          this.addMediaThumbnail(loadEvent.target.result, file.name);
        };
        reader.readAsDataURL(file);
      });
    });
  },

  captureWebcamPhoto(video, stream) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');

    this.addMediaThumbnail(dataUrl, `webcam_snap_${Date.now()}.jpg`);

    // Turn off camera
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    video.style.display = 'none';
    const clickBox = document.getElementById('camera-click-box');
    clickBox.querySelector('span').innerText = 'Tap to Capture Photo';
    const camIcon = clickBox.querySelector('.camera-icon');
    if (camIcon) camIcon.style.display = 'block';
    document.getElementById('webcam-toggle-btn').style.display = 'none';
  },

  addMediaThumbnail(dataUrl, name) {
    if (this.mediaFiles.length >= 5) {
      App.showToast('Max Photos Reach', 'You can upload up to 5 photos.', 'warning');
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
      <div class="thumbnail-item">
        <img src="${file.dataUrl}">
        <button class="remove-btn" onclick="ReportPage.removeMediaThumbnail(${idx})">&times;</button>
      </div>
    `).join('');
  },

  // STEP 2: AI Classification
  async triggerAIScan() {
    if (this.mediaFiles.length === 0) return;

    const scanView = document.getElementById('ai-scanning-view');
    const formView = document.getElementById('ai-results-form');
    const simBox = document.getElementById('simulation-selector-box');
    const scanningImg = document.getElementById('scanning-preview-img');

    scanningImg.src = this.mediaFiles[0].dataUrl;

    if (!AI.hasApiKey()) {
      // Simulation mode: show selection helper
      scanView.style.display = 'none';
      formView.style.display = 'none';
      simBox.style.display = 'block';

      // Setup click listeners for simulation buttons
      const simBtns = simBox.querySelectorAll('.sim-cat-btn');
      simBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', async () => {
          const selectedCat = newBtn.getAttribute('data-cat');
          simBox.style.display = 'none';
          scanView.style.display = 'block';

          // Simulate classification delay with scan laser
          await new Promise(resolve => setTimeout(resolve, 1800));

          // Load realistic classification results based on category
          const categorySuggestions = {
            pothole: { suggested_title: "Large Pothole Blocking Road Lane", severity: 3, department: "roads" },
            streetlight: { suggested_title: "Broken Streetlight Causing Dark Street", severity: 2, department: "electricity" },
            water_leakage: { suggested_title: "Water Pipeline Leakage on Walkway", severity: 3, department: "water" },
            garbage: { suggested_title: "Overflowing Garbage Pile Near Residential Sector", severity: 3, department: "sanitation" },
            flooding: { suggested_title: "Severe Street Flooding After Heavy Rains", severity: 4, department: "sanitation" },
            road_damage: { suggested_title: "Major Asphalt Cracking and Road Damage", severity: 3, department: "roads" },
            vandalism: { suggested_title: "Public Park Bench Vandalized with Paint", severity: 2, department: "municipality" },
            encroachment: { suggested_title: "Sidewalk Encroachment by Street Vendors", severity: 3, department: "municipality" },
            other: { suggested_title: "Reported Civic Hazard in the Neighborhood", severity: 2, department: "municipality" }
          };

          const suggestions = categorySuggestions[selectedCat] || categorySuggestions['other'];
          this.aiSuggestions = {
            category: selectedCat,
            confidence_score: 0.95,
            ...suggestions
          };

          // Populate fields
          document.getElementById('report-title').value = this.aiSuggestions.suggested_title;
          document.getElementById('report-category').value = selectedCat;
          document.getElementById('report-severity').value = this.aiSuggestions.severity;
          document.getElementById('report-dept').value = this.aiSuggestions.department;

          scanView.style.display = 'none';
          formView.style.display = 'block';
          this.setupCategoryChangeListener();
        });
      });
      if (window.lucide) window.lucide.createIcons();
    } else {
      // Real API mode
      simBox.style.display = 'none';
      scanView.style.display = 'block';
      formView.style.display = 'none';

      try {
        const suggestions = await AI.classifyIssue(this.mediaFiles[0].dataUrl, this.mediaFiles[0].name);
        this.aiSuggestions = suggestions;
        
        // Populate fields
        document.getElementById('report-title').value = suggestions.suggested_title;
        document.getElementById('report-category').value = suggestions.category.trim();
        document.getElementById('report-severity').value = suggestions.severity;
        document.getElementById('report-dept').value = suggestions.department;

        scanView.style.display = 'none';
        formView.style.display = 'block';
        this.setupCategoryChangeListener();
      } catch (err) {
        console.error(err);
        App.showToast('AI classification failure', 'Failed to scan image. Please input manually.', 'warning');
        scanView.style.display = 'none';
        formView.style.display = 'block';
      }
    }
  },

  setupCategoryChangeListener() {
    const categorySelect = document.getElementById('report-category');
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        const depts = {
          pothole: 'roads',
          streetlight: 'electricity',
          water_leakage: 'water',
          garbage: 'sanitation',
          flooding: 'municipality',
          road_damage: 'roads',
          vandalism: 'municipality',
          encroachment: 'municipality',
          other: 'municipality'
        };
        const deptSelect = document.getElementById('report-dept');
        if (deptSelect) {
          deptSelect.value = depts[e.target.value] || 'municipality';
        }
      });
    }
  },

  // STEP 3: Location Select
  setupLocationListeners() {
    const gpsBtn = document.getElementById('gps-locate-btn');
    const lookupBtn = document.getElementById('address-lookup-btn');

    gpsBtn.addEventListener('click', () => this.detectGPS());
    lookupBtn.addEventListener('click', () => this.lookupAddressText());
  },

  detectGPS() {
    if (!navigator.geolocation) {
      App.showToast('Geolocation Unsupport', 'Your browser does not support GPS location.', 'danger');
      return;
    }

    App.showToast('Locating...', 'Fetching GPS coordinates...', 'info');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.locationData.lat = lat;
        this.locationData.lng = lng;

        this.updateMapPosition(lat, lng);
        await this.reverseGeocode(lat, lng);
      },
      (err) => {
        console.error(err);
        App.showToast('GPS Timeout', 'Failed to fetch GPS coordinates. Please pin manually.', 'warning');
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

      const isDark = document.documentElement.classList.contains('dark');
      const tileUrl = isDark 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

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
      document.getElementById('report-address').value = addr;

      // Extract Ward if exists in address
      if (addr.toLowerCase().includes('indiranagar')) {
        document.getElementById('report-ward').value = 'Ward 4';
      } else if (addr.toLowerCase().includes('hal')) {
        document.getElementById('report-ward').value = 'Ward 5';
      } else if (addr.toLowerCase().includes('domlur')) {
        document.getElementById('report-ward').value = 'Ward 6';
      }
    } catch (err) {
      console.error(err);
      document.getElementById('report-address').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
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
        recordBtn.querySelector('span').innerText = 'Record Voice Note';
        const micIcon = recordBtn.querySelector('.mic-icon');
        if (micIcon) {
          micIcon.classList.remove('pulse-red');
          micIcon.style.animation = '';
        }

        loader.style.display = 'block';
        
        const stopAndProcess = async (audioDataUrl) => {
          try {
            const category = document.getElementById('report-category')?.value || 'other';
            const res = await AI.transcribeAudio(audioDataUrl, category);
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
        recordBtn.querySelector('span').innerText = 'Stop & Transcribe';
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
        this.locationData.ward = document.getElementById('report-ward').value;
        this.currentStep++;
        this.updateWizardUI();
      } else if (this.currentStep === 4) {
        this.currentStep++;
        this.updateWizardUI();
        this.renderSummary();
      } else if (this.currentStep === 5) {
        // Final Submit
        await this.checkDuplicateAndSubmit();
      }
    });
  },

  renderSummary() {
    const summaryCard = document.getElementById('submission-summary-card');
    if (!summaryCard) return;

    const title = document.getElementById('report-title').value;
    const cat = document.getElementById('report-category').value;
    const sev = document.getElementById('report-severity').value;
    const desc = document.getElementById('report-desc').value;

    summaryCard.innerHTML = `
      <div class="summary-item">
        <strong>Issue Photo:</strong>
        <div class="thumbnails-container mt-1">
          <div class="thumbnail-item"><img src="${this.mediaFiles[0].dataUrl}"></div>
        </div>
      </div>
      <div class="summary-item">
        <strong>Title:</strong>
        <div>${title}</div>
      </div>
      <div class="summary-item">
        <strong>Category / Severity:</strong>
        <div>${cat.toUpperCase().replace('_', ' ')} / Level ${sev}</div>
      </div>
      <div class="summary-item">
        <strong>Address / Ward:</strong>
        <div>${this.locationData.address} (${this.locationData.ward})</div>
      </div>
      <div class="summary-item">
        <strong>Description:</strong>
        <div>${desc || '<i>No description provided.</i>'}</div>
      </div>
    `;
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
      
      dialogText.innerText = `A similar "${category.replace('_', ' ')}" issue was already reported nearby ("${duplicate.title}"). Do you want to add your report to that one instead?`;
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
      note: 'Co-signed and verified this issue. (+50 points awarded)',
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

    const newIssueId = 'issue_' + Math.floor(Math.random() * 900 + 100);

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
      department,
      ai_category: this.aiSuggestions ? this.aiSuggestions.category : category,
      ai_severity: this.aiSuggestions ? this.aiSuggestions.severity : severity,
      ai_confidence: this.aiSuggestions ? this.aiSuggestions.confidence_score : 1.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      before_photo_url: this.mediaFiles[0].dataUrl,
      after_photo_url: null,
      ai_resolution_validated: false,
      ai_resolution_confidence: null
    };

    await DB.put('issues', newIssue);

    // Add Timeline Log
    await DB.put('issue_timeline', {
      id: 't_rep_' + Date.now(),
      issue_id: newIssueId,
      actor_id: user.id,
      actor_role: user.role,
      action: 'reported',
      note: 'Issue reported to the civic authority. (+50 points awarded)',
      created_at: new Date().toISOString()
    });

    // Award points
    await this.awardPointsAndShowSuccess(newIssueId, severity);
  },

  async awardPointsAndShowSuccess(issueId, severity) {
    const user = Auth.getCurrentUser();
    user.points = (user.points || 0) + 50;
    
    // Check badges
    const userBadges = await DB.getAll('badges');
    const myBadges = userBadges.filter(b => b.user_id === user.id);

    // Welcome badge: First Reporter
    if (!myBadges.some(b => b.badge_type === 'first_reporter')) {
      const bObj = {
        id: 'badge_' + Date.now(),
        user_id: user.id,
        badge_type: 'first_reporter',
        awarded_at: new Date().toISOString()
      };
      await DB.put('badges', bObj);
      App.addNotification('Badge Awarded!', 'You earned the "First Reporter" badge!', 'success');
    }

    // Check count of user reports to award Watchdog
    const allIssues = await DB.getAll('issues');
    const myReportsCount = allIssues.filter(i => i.reporter_id === user.id).length;
    
    if (myReportsCount >= 10 && !myBadges.some(b => b.badge_type === 'watchdog')) {
      const bObj = {
        id: 'badge_' + Date.now(),
        user_id: user.id,
        badge_type: 'watchdog',
        awarded_at: new Date().toISOString()
      };
      await DB.put('badges', bObj);
      App.addNotification('Badge Awarded!', 'You earned the "Watchdog" badge!', 'success');
    }

    await DB.put('users', user);
    await Auth.refreshUser();

    // Trigger Notification for Authorities in dashboard (Prompt 9: new issue alert)
    const newIssueNotify = {
      id: 'new_issue_notif_' + Date.now(),
      title: 'New Issue Submitted',
      message: `A new ${severity} severity issue was submitted in ${this.locationData.ward}.`,
      type: 'warning',
      created_at: new Date().toISOString(),
      read: false
    };
    
    // Save to local storage for officers
    const savedNotifs = JSON.parse(localStorage.getItem('civicfix_notifications') || '[]');
    savedNotifs.unshift(newIssueNotify);
    localStorage.setItem('civicfix_notifications', JSON.stringify(savedNotifs));

    // Show Success Screen
    const successOverlay = document.getElementById('success-overlay');
    const successIdEl = document.getElementById('success-issue-id');
    const successSlaEl = document.getElementById('success-sla-card');
    
    successIdEl.innerText = `Issue Ticket ID: ${issueId}`;
    
    // Estimated SLA Resolution Time based on Severity
    let slaHrs = 48;
    if (severity === 5) slaHrs = 6;
    else if (severity === 4) slaHrs = 12;
    else if (severity === 3) slaHrs = 24;

    successSlaEl.innerHTML = `
      <strong>Estimated Response Time:</strong>
      <div class="sla-timer">${slaHrs} Hours</div>
      <p class="sla-text">Our authorities SLA targets resolving level ${severity} issues within ${slaHrs} hours. You will receive notifications on status updates.</p>
    `;

    successOverlay.style.display = 'flex';
    if (window.lucide) window.lucide.createIcons();

    // Close button router nav
    document.getElementById('success-close-btn').onclick = () => {
      successOverlay.style.display = 'none';
      Router.navigate('#/home');
    };
  }
};

// Expose globally
window.ReportPage = ReportPage;
