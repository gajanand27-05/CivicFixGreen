// js/pages/profile.js
// Profile and Settings Controller

const ProfilePage = {
  async render() {
    const user = Auth.getCurrentUser();
    if (!user) return `<div class="error-panel"><h2>Not Logged In</h2><a href="#/login" class="btn">Login</a></div>`;

    return `
      <div class="profile-container">
        <!-- Top Banner Profile Info -->
        <div class="profile-card card">
          <div class="profile-header-info">
            <div class="avatar-change-wrapper">
              <img src="${user.avatar_url}" id="profile-avatar-preview" class="profile-big-avatar">
              <button class="edit-avatar-btn" id="avatar-randomize-btn" title="Randomize Avatar">
                <i data-lucide="refresh-cw"></i>
              </button>
            </div>
            <div class="profile-meta-text">
              <h2 id="profile-user-name">${user.name}</h2>
              <span class="user-role-badge">${user.role.toUpperCase()}</span>
              <p class="text-muted"><i data-lucide="map-pin" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i>${user.city}, ${user.ward}</p>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="profile-stats-grid mt-4">
            <div class="stat-card">
              <div class="stat-num color-primary" id="stat-points">${user.points || 0}</div>
              <div class="stat-label">Total Points</div>
            </div>
            <div class="stat-card">
              <div class="stat-num color-warning" id="stat-badges-count">0</div>
              <div class="stat-label">Badges Earned</div>
            </div>
            <div class="stat-card">
              <div class="stat-num color-danger" id="stat-reports-count">0</div>
              <div class="stat-label">Reports Submitted</div>
            </div>
            <div class="stat-card">
              <div class="stat-num color-success" id="stat-resolved-count">0</div>
              <div class="stat-label">Resolved Issues</div>
            </div>
          </div>
        </div>

        <!-- Badges Earned Section -->
        <div class="badges-grid-card card mt-4">
          <h3>Your Badges</h3>
          <p class="text-muted mb-4">Badges are awarded automatically for active civic participation.</p>
          <div class="badges-grid" id="profile-badges-grid">
            <!-- Populated dynamically -->
          </div>
        </div>

        <!-- Settings Tabs -->
        <div class="settings-card card mt-4">
          <div class="settings-tabs">
            <button class="settings-tab active" data-settings-tab="edit-profile">Edit Profile</button>
            <button class="settings-tab" data-settings-tab="preferences">Preferences</button>
          </div>

          <!-- TAB 1: EDIT PROFILE -->
          <div class="settings-tab-panel active-panel" id="panel-edit-profile">
            <form id="edit-profile-form">
              <div class="form-group">
                <label for="edit-name">Display Name</label>
                <input type="text" id="edit-name" class="form-control" value="${user.name}" required>
              </div>
              <div class="form-row">
                <div class="form-group half-width">
                  <label for="edit-city">City</label>
                  <select id="edit-city" class="form-control">
                    <option value="MetroCity" selected>MetroCity</option>
                  </select>
                </div>
                <div class="form-group half-width">
                  <label for="edit-ward">Ward</label>
                  <select id="edit-ward" class="form-control">
                    <option value="Ward 4" ${user.ward === 'Ward 4' ? 'selected' : ''}>Ward 4 (Indiranagar)</option>
                    <option value="Ward 5" ${user.ward === 'Ward 5' ? 'selected' : ''}>Ward 5 (HAL Stage 2)</option>
                    <option value="Ward 6" ${user.ward === 'Ward 6' ? 'selected' : ''}>Ward 6 (Domlur)</option>
                  </select>
                </div>
              </div>
              <button type="submit" class="btn btn-primary">Save Profile Changes</button>
            </form>
          </div>

          <!-- TAB 2: PREFERENCES -->
          <div class="settings-tab-panel" id="panel-preferences">
            <div class="preference-item">
              <div class="pref-desc">
                <strong>Dark Theme</strong>
                <p>Switch application styling theme.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="dark-theme-toggle">
                <span class="slider"></span>
              </label>
            </div>
            
            <div class="preference-item">
              <div class="pref-desc">
                <strong>Email Notifications</strong>
                <p>Receive emails for report confirmations and resolutions.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="pref-email-notif" ${user.notification_preferences?.email ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="preference-item">
              <div class="pref-desc">
                <strong>Push Notifications</strong>
                <p>Receive browser/PWA system status updates instantly.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="pref-push-notif" ${user.notification_preferences?.push ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="preference-item" style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 15px; margin-top: 15px; display: block;">
              <div class="pref-desc" style="margin-bottom: 10px;">
                <strong>Google AI Studio API Key</strong>
                <p class="text-muted" style="font-size: 13px; margin-top: 4px;">Enter your Gemini API key to enable real-time image detection and voice transcription. Keys are saved locally in your browser.</p>
              </div>
              <input type="password" id="pref-ai-key" class="form-control" placeholder="Enter API Key (AIzaSy...)" style="width: 100%; max-width: 450px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 10px; color: #fff;">
            </div>

            <button class="btn btn-primary mt-3" id="save-preferences-btn">Save Preferences</button>
          </div>


        </div>

        <!-- Activity Timeline -->
        <div class="profile-card card mt-4">
          <h3>Your Activity Log</h3>
          <div class="text-timeline-logs mt-3" id="profile-activity-log">
            <!-- Loaded dynamically -->
          </div>
        </div>

        <!-- Logout Button -->
        <button class="btn btn-outline btn-block mt-4 mb-5" id="profile-logout-btn" style="border-color: #EF4444; color: #EF4444;">
          <i data-lucide="log-out"></i> Sign Out
        </button>
      </div>
    `;
  },

  async mount() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    await this.loadStatsAndBadges();
    this.setupListeners();
    this.loadActivityTimeline();
  },

  setupListeners() {
    const user = Auth.getCurrentUser();

    // Tab switcher
    const tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const targetId = tab.getAttribute('data-settings-tab');
        document.querySelectorAll('.settings-tab-panel').forEach(panel => {
          panel.classList.remove('active-panel');
        });
        document.getElementById(`panel-${targetId}`).classList.add('active-panel');
      });
    });

    // Randomize avatar
    const randBtn = document.getElementById('avatar-randomize-btn');
    const avatarPreview = document.getElementById('profile-avatar-preview');
    randBtn.addEventListener('click', () => {
      const newSeed = Math.random().toString(36).substring(7);
      const newUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${newSeed}`;
      avatarPreview.src = newUrl;
    });

    // Edit profile submit
    const editForm = document.getElementById('edit-profile-form');
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newName = document.getElementById('edit-name').value.trim();
      const newWard = document.getElementById('edit-ward').value;

      if (!newName) return;

      user.name = newName;
      user.ward = newWard;
      user.avatar_url = avatarPreview.src;

      await DB.put('users', user);
      await Auth.refreshUser();

      document.getElementById('profile-user-name').innerText = newName;
      App.showToast('Profile Saved', 'Profile changes saved successfully.', 'success');
      
      // Update top desktop header user details
      Router.updateNavigationLayout(window.location.hash, Auth.getCurrentUser());
    });

    // Load preferences
    const aiKeyField = document.getElementById('pref-ai-key');
    if (aiKeyField) {
      aiKeyField.value = localStorage.getItem('civicfix_ai_studio_key') || '';
    }

    // Save preferences
    const savePrefBtn = document.getElementById('save-preferences-btn');
    savePrefBtn.addEventListener('click', async () => {
      user.notification_preferences = {
        email: document.getElementById('pref-email-notif').checked,
        push: document.getElementById('pref-push-notif').checked
      };

      const aiKeyVal = document.getElementById('pref-ai-key').value.trim();
      localStorage.setItem('civicfix_ai_studio_key', aiKeyVal);

      await DB.put('users', user);
      await Auth.refreshUser();

      App.showToast('Preferences Saved', 'Notification options updated.', 'success');
    });

    // Dark theme toggle listener
    const themeToggle = document.getElementById('dark-theme-toggle');
    themeToggle.checked = document.documentElement.classList.contains('dark');
    themeToggle.addEventListener('change', (e) => {
      const theme = e.target.checked ? 'dark' : 'light';
      localStorage.setItem('theme', theme);
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
    });



    // Logout click
    document.getElementById('profile-logout-btn').addEventListener('click', () => {
      Auth.logout();
      App.addNotification('Logged Out', 'You have been logged out of CivicFix.', 'info');
      Router.navigate('#/login');
    });
  },

  async loadStatsAndBadges() {
    const user = Auth.getCurrentUser();
    const allIssues = await DB.getAll('issues');
    const allBadges = await DB.getAll('badges');

    const myReports = allIssues.filter(i => i.reporter_id === user.id);
    const myResolvedReports = myReports.filter(i => i.status === 'resolved');
    const myBadges = allBadges.filter(b => b.user_id === user.id);

    // Update stats counters
    document.getElementById('stat-badges-count').innerText = myBadges.length;
    document.getElementById('stat-reports-count').innerText = myReports.length;
    document.getElementById('stat-resolved-count').innerText = myResolvedReports.length;

    // Badges details catalog
    const badgeDetails = {
      first_reporter: { title: 'First Reporter', desc: 'Submitted first issue report', icon: 'award', color: 'blue' },
      watchdog: { title: 'Watchdog Officer', desc: 'Reported 10+ civic issues', icon: 'shield', color: 'amber' },
      community_hero: { title: 'Community Hero', desc: 'Reported 50+ issues', icon: 'heart', color: 'red' },
      verified_voice: { title: 'Verified Voice', desc: '3+ reports resolved by authorities', icon: 'check-circle', color: 'green' },
      streak_master: { title: 'Streak Master', desc: 'Reported weekly for 4 weeks', icon: 'zap', color: 'indigo' },
      top_contributor: { title: 'Top Contributor', desc: 'Ranked in monthly top 10', icon: 'crown', color: 'gold' }
    };

    const badgesContainer = document.getElementById('profile-badges-grid');
    if (myBadges.length === 0) {
      badgesContainer.innerHTML = '<div class="empty-badges">No badges earned yet. Start reporting to earn badges!</div>';
      return;
    }

    badgesContainer.innerHTML = myBadges.map(b => {
      const details = badgeDetails[b.badge_type] || { title: b.badge_type, desc: 'Earned badge', icon: 'award', color: 'blue' };
      return `
        <div class="badge-card-item">
          <div class="badge-circle-icon badge-${details.color}">
            <i data-lucide="${details.icon}"></i>
          </div>
          <span class="badge-title">${details.title}</span>
          <span class="badge-desc">${details.desc}</span>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  },

  async loadActivityTimeline() {
    const user = Auth.getCurrentUser();
    const timeline = await DB.getAll('issue_timeline');
    
    // Grab timeline events involving this user
    const myTimeline = timeline
      .filter(t => t.actor_id === user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const logContainer = document.getElementById('profile-activity-log');
    if (myTimeline.length === 0) {
      logContainer.innerHTML = '<p class="text-muted">No activity logged yet.</p>';
      return;
    }

    logContainer.innerHTML = myTimeline.map(log => {
      let pts = '';
      if (log.note.includes('+50 points')) pts = '<span class="pts-tag success">+50 Pts</span>';
      else if (log.note.includes('+20 points')) pts = '<span class="pts-tag success">+20 Pts</span>';
      else if (log.note.includes('+5 points')) pts = '<span class="pts-tag success">+5 Pts</span>';
      else if (log.note.includes('+10 points')) pts = '<span class="pts-tag success">+10 Pts</span>';
      else if (log.note.includes('+100 points')) pts = '<span class="pts-tag success">+100 Pts</span>';

      return `
        <div class="log-entry">
          <span class="log-dot"></span>
          <div class="log-details" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
            <div>
              <div class="log-title">${log.action.toUpperCase()}</div>
              <div class="log-note">${log.note}</div>
              <div class="log-time">${new Date(log.created_at).toLocaleString()}</div>
            </div>
            <div>
              ${pts}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
};

// Expose globally
window.ProfilePage = ProfilePage;
