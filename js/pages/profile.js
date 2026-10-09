// js/pages/profile.js
// Profile and settings

const ProfilePage = {
  roleLabel(role) {
    return { citizen: 'Citizen', authority: 'City Officer', admin: 'Admin' }[role] || role;
  },

  async render() {
    const user = Auth.getCurrentUser();
    if (!user) return `<div class="error-panel"><h2>Not signed in</h2><a href="#/login" class="btn">Sign in</a></div>`;

    return `
      <div class="profile-container">
        <div class="profile-card card">
          <div class="profile-header-info">
            <div class="pf-avatar">
              <img src="${user.avatar_url || 'assets/icon.svg'}" id="profile-avatar-preview" class="profile-big-avatar" alt="Profile photo">
              <label class="pf-avatar-btn" title="Change photo">
                <i data-lucide="camera"></i>
                <input type="file" id="avatar-file-input" accept="image/*" hidden>
              </label>
            </div>
            <div class="profile-meta-text">
              <h2 id="profile-user-name">${user.name}</h2>
              <p class="pf-email" id="profile-user-email">${user.email || ''}</p>
              <div class="pf-meta-row">
                <span class="user-role-badge">${this.roleLabel(user.role)}</span>
                <span class="text-muted small"><i data-lucide="map-pin" class="pf-inline-icon"></i><span id="profile-user-place">${user.city || 'Bengaluru'}${user.ward ? ', ' + user.ward : ''}</span></span>
              </div>
              <label class="btn btn-outline btn-xs pf-change-photo">
                <i data-lucide="image"></i> Change photo
                <input type="file" id="avatar-file-input-2" accept="image/*" hidden>
              </label>
            </div>
          </div>

          <div class="profile-stats-grid mt-4">
            <div class="stat-card">
              <div class="stat-num color-primary" id="stat-points">${user.points || 0}</div>
              <div class="stat-label">Points</div>
            </div>
            <div class="stat-card">
              <div class="stat-num" id="stat-reports-count">0</div>
              <div class="stat-label">Dumps reported</div>
            </div>
            <div class="stat-card">
              <div class="stat-num color-success" id="stat-resolved-count">0</div>
              <div class="stat-label">Cleaned up</div>
            </div>
            <div class="stat-card">
              <div class="stat-num" id="stat-badges-count">0</div>
              <div class="stat-label">Badges</div>
            </div>
          </div>
        </div>

        <div class="badges-grid-card card mt-4">
          <h3>Your badges</h3>
          <p class="text-muted small mb-4">Earned automatically for helping keep Bengaluru clean.</p>
          <div class="badges-grid" id="profile-badges-grid"></div>
        </div>

        <div class="settings-card card mt-4">
          <div class="settings-tabs">
            <button class="settings-tab active" data-settings-tab="edit-profile">Edit profile</button>
            <button class="settings-tab" data-settings-tab="preferences">Notifications</button>
          </div>

          <div class="settings-tab-panel active-panel" id="panel-edit-profile">
            <form id="edit-profile-form" novalidate>
              <div class="form-group">
                <label for="edit-name">Display name</label>
                <input type="text" id="edit-name" class="form-control" value="${user.name}" autocomplete="name" required>
              </div>
              <div class="form-group">
                <label for="edit-email">Email</label>
                <input type="email" id="edit-email" class="form-control" value="${user.email || ''}" autocomplete="email" required>
                <small class="pf-hint">You sign in with this email, so changing it changes your login email.</small>
              </div>
              <div class="form-row">
                <div class="form-group half-width">
                  <label for="edit-city">City</label>
                  <select id="edit-city" class="form-control">
                    <option value="Bengaluru" selected>Bengaluru</option>
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
              <button type="submit" class="btn btn-primary">Save changes</button>
            </form>
          </div>

          <div class="settings-tab-panel" id="panel-preferences">
            <div class="preference-item">
              <div class="pref-desc">
                <strong>Email updates</strong>
                <p>Get an email when your complaint is sent, reminded and closed.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="pref-email-notif" ${user.notification_preferences?.email ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="preference-item">
              <div class="pref-desc">
                <strong>Push notifications</strong>
                <p>Get a notification on this device when your complaint status changes.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="pref-push-notif" ${user.notification_preferences?.push ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <button class="btn btn-primary mt-3" id="save-preferences-btn">Save</button>
          </div>
        </div>

        <div class="profile-card card mt-4">
          <h3>Your activity</h3>
          <div class="text-timeline-logs mt-3" id="profile-activity-log"></div>
        </div>

        <button class="btn btn-outline btn-block mt-4 mb-5 pf-logout" id="profile-logout-btn">
          <i data-lucide="log-out"></i> Sign out
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

  refreshHeader() {
    if (typeof Router !== 'undefined' && typeof Router.updateNavigationLayout === 'function') {
      Router.updateNavigationLayout(window.location.hash, Auth.getCurrentUser());
    }
  },

  // Resize an image file to fit within maxSize x maxSize; returns a JPEG data URL
  resizeImage(file, maxSize, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  },

  setupListeners() {
    // Tabs
    const tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetId = tab.getAttribute('data-settings-tab');
        document.querySelectorAll('.settings-tab-panel').forEach(panel => panel.classList.remove('active-panel'));
        document.getElementById(`panel-${targetId}`).classList.add('active-panel');
      });
    });

    // Change photo: resize, show and save straight away
    const avatarPreview = document.getElementById('profile-avatar-preview');
    ['avatar-file-input', 'avatar-file-input-2'].forEach(id => {
      const input = document.getElementById(id);
      if (!input) return;
      input.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          const dataUrl = await this.resizeImage(file, 256, 0.85);
          avatarPreview.src = dataUrl;
          const current = Auth.getCurrentUser();
          current.avatar_url = dataUrl;
          await DB.put('users', current);
          await Auth.refreshUser();
          this.refreshHeader();
          App.showToast('Photo updated', 'Your new profile photo is saved.', 'success');
        } catch (err) {
          console.error(err);
          App.showToast('Could not use photo', 'Please pick a different image.', 'danger');
        } finally {
          e.target.value = '';
        }
      });
    });

    // Edit profile
    document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const current = Auth.getCurrentUser();
      const newName = document.getElementById('edit-name').value.trim();
      const newEmail = document.getElementById('edit-email').value.trim().toLowerCase();
      const newWard = document.getElementById('edit-ward').value;

      if (!newName) {
        App.showToast('Name needed', 'Please enter a display name.', 'warning');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        App.showToast('Check your email', 'Please enter a valid email address.', 'warning');
        return;
      }

      const emailChanged = newEmail !== String(current.email || '').toLowerCase();
      if (emailChanged) {
        const users = await DB.getAll('users');
        if (users.some(u => u.id !== current.id && String(u.email || '').toLowerCase() === newEmail)) {
          App.showToast('Email already used', 'Another account already uses this email.', 'warning');
          return;
        }
      }

      current.name = newName;
      current.email = newEmail;
      current.ward = newWard;

      await DB.put('users', current);
      await Auth.refreshUser();

      document.getElementById('profile-user-name').innerText = newName;
      document.getElementById('profile-user-email').innerText = newEmail;
      document.getElementById('profile-user-place').innerText = `${current.city || 'Bengaluru'}, ${newWard}`;
      App.showToast('Profile saved', emailChanged ? `Sign in with ${newEmail} from now on.` : 'Your changes are saved.', 'success');
      this.refreshHeader();
    });

    // Notification preferences
    document.getElementById('save-preferences-btn').addEventListener('click', async () => {
      const current = Auth.getCurrentUser();
      current.notification_preferences = {
        ...(current.notification_preferences || {}),
        email: document.getElementById('pref-email-notif').checked,
        push: document.getElementById('pref-push-notif').checked
      };
      await DB.put('users', current);
      await Auth.refreshUser();
      App.showToast('Saved', 'Notification settings updated.', 'success');
    });

    // Sign out
    document.getElementById('profile-logout-btn').addEventListener('click', () => {
      Auth.logout();
      App.addNotification('Signed out', 'You have signed out of EcoSort.', 'info');
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

    document.getElementById('stat-badges-count').innerText = myBadges.length;
    document.getElementById('stat-reports-count').innerText = myReports.length;
    document.getElementById('stat-resolved-count').innerText = myResolvedReports.length;

    const badgeDetails = {
      first_reporter: { title: 'First Reporter', desc: 'Reported your first dump', icon: 'award', color: 'green' },
      watchdog: { title: 'Watchdog', desc: 'Reported 10+ dumps', icon: 'shield', color: 'amber' },
      community_hero: { title: 'Community Hero', desc: 'Reported 50+ dumps', icon: 'heart', color: 'red' },
      verified_voice: { title: 'Verified Voice', desc: '3+ complaints closed by the city', icon: 'check-circle', color: 'green' },
      streak_master: { title: 'Streak Master', desc: 'Reported weekly for 4 weeks', icon: 'zap', color: 'amber' },
      top_contributor: { title: 'Top Contributor', desc: 'In the monthly top 10', icon: 'crown', color: 'gold' }
    };

    const badgesContainer = document.getElementById('profile-badges-grid');
    if (myBadges.length === 0) {
      badgesContainer.innerHTML = '<div class="empty-badges">No badges yet. Report a garbage dump to earn your first one.</div>';
      return;
    }

    badgesContainer.innerHTML = myBadges.map(b => {
      const details = badgeDetails[b.badge_type] || { title: b.badge_type, desc: 'Earned badge', icon: 'award', color: 'green' };
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

    const myTimeline = timeline
      .filter(t => t.actor_id === user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const logContainer = document.getElementById('profile-activity-log');
    if (myTimeline.length === 0) {
      logContainer.innerHTML = '<p class="text-muted">No activity yet.</p>';
      return;
    }

    logContainer.innerHTML = myTimeline.slice(0, 12).map(log => {
      const m = String(log.note || '').match(/\+(\d+) points/);
      const pts = m ? `<span class="pts-tag success">+${m[1]} pts</span>` : '';
      return `
        <div class="log-entry">
          <span class="log-dot"></span>
          <div class="log-details pf-log-details">
            <div>
              <div class="log-title">${PublicIssuePage.actionLabel(log.action)}</div>
              <div class="log-note">${PublicIssuePage.cleanNote(log.note)}</div>
              <div class="log-time">${new Date(log.created_at).toLocaleString()}</div>
            </div>
            <div>${pts}</div>
          </div>
        </div>
      `;
    }).join('');
  }
};

window.ProfilePage = ProfilePage;
