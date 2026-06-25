// js/app.js
// Main Application Bootstrap and Coordinator

const App = {
  notifications: [],
  unreadCount: 0,
  syncInterval: null,

  async init() {
    console.log('Bootstrapping CivicFix App...');

    // 1. Initialize DB and Seeding
    try {
      await DB.init();
      await DB.seedIfNeeded();
    } catch (err) {
      console.error('Failed to initialize IndexedDB:', err);
    }

    // 2. Initialize Session
    Auth.init();

    // 2.5. Programmatically clear old service worker caches to force immediate updates of dynamic files
    if ('caches' in window) {
      try {
        caches.keys().then(keys => {
          keys.forEach(key => {
            if (key !== 'civicfix-cache-v3') {
              console.log('Clearing old cache to force update:', key);
              caches.delete(key);
            }
          });
        });
      } catch (e) {
        console.warn('Failed to clear old caches:', e);
      }
    }

    // 3. Register PWA Service Worker
    this.registerServiceWorker();

    // 4. Setup Global Notifications Bell and UI hooks
    this.initNotifications();

    // 5. Register Routes with the Router
    this.registerRoutes();

    // 6. Initialize Router
    Router.init('main-content');

    // 7. Setup Live Updates (simulating polling/WebSockets every 30s)
    this.startLiveSync();

    // 8. Add global click listeners for notification overlay toggles
    this.setupGlobalEvents();
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('Service Worker registered with scope:', reg.scope);
          // Force check for updates
          reg.update();
        })
        .catch(err => console.error('Service Worker registration failed:', err));
    }
  },

  registerRoutes() {
    // Page controllers will be defined on window as global modules
    Router.register('#/splash', SplashPage);
    Router.register('#/login', LoginPage);
    Router.register('#/signup', SignupPage);
    Router.register('#/home', HomePage);
    Router.register('#/report', ReportPage);
    Router.register('#/map', MapPage);
    Router.register('#/leaderboard', LeaderboardPage);
    Router.register('#/profile', ProfilePage);
    Router.register('#/dashboard', DashboardPage);
    Router.register('#/admin', AdminPage);
    Router.register('#/public', PublicPage);
    Router.register('#/transparency', PublicPage);
    Router.register('#/issue/:id', PublicIssuePage);
  },

  initNotifications() {
    // Retrieve unread notifications from local storage if any
    const savedNotifs = localStorage.getItem('civicfix_notifications');
    if (savedNotifs) {
      try {
        this.notifications = JSON.parse(savedNotifs);
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        this.updateNotificationBadge();
      } catch (err) {
        console.error('Failed to parse notifications', err);
      }
    } else {
      // Default welcome notification
      this.addNotification('Welcome to CivicFix!', 'Report local issues, earn badges, and watch your neighborhood transform.', 'info');
    }
  },

  addNotification(title, message, type = 'info', issueId = null) {
    const notif = {
      id: 'notif_' + Date.now() + Math.random().toString(36).substr(2, 5),
      title,
      message,
      type,
      issueId,
      created_at: new Date().toISOString(),
      read: false
    };
    this.notifications.unshift(notif);
    this.unreadCount = this.notifications.filter(n => !n.read).length;
    localStorage.setItem('civicfix_notifications', JSON.stringify(this.notifications));
    this.updateNotificationBadge();
    this.showToast(title, message, type);
    
    // Dispatch global notification event
    window.dispatchEvent(new CustomEvent('new-notification', { detail: notif }));
  },

  updateNotificationBadge() {
    const badge = document.getElementById('notif-badge');
    const badgeM = document.getElementById('notif-badge-mobile');
    
    if (badge) {
      if (this.unreadCount > 0) {
        badge.innerText = this.unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    if (badgeM) {
      if (this.unreadCount > 0) {
        badgeM.innerText = this.unreadCount;
        badgeM.style.display = 'flex';
      } else {
        badgeM.style.display = 'none';
      }
    }
  },

  showToast(title, message, type) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} slide-in`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'warning') icon = 'alert-triangle';
    if (type === 'danger') icon = 'alert-octagon';

    toast.innerHTML = `
      <div class="toast-content">
        <i data-lucide="${icon}"></i>
        <div class="toast-text">
          <div class="toast-title">${title}</div>
          <div class="toast-message">${message}</div>
        </div>
      </div>
      <button class="toast-close">&times;</button>
    `;

    toastContainer.appendChild(toast);
    
    if (window.lucide) window.lucide.createIcons();

    // Remove after 5 seconds
    const timer = setTimeout(() => {
      toast.classList.remove('slide-in');
      toast.classList.add('fade-out');
      toast.addEventListener('animationend', () => toast.remove());
    }, 5000);

    toast.querySelector('.toast-close').addEventListener('click', () => {
      clearTimeout(timer);
      toast.remove();
    });
  },

  // Setup live sync simulating websockets / polling updates every 30s
  startLiveSync() {
    if (this.syncInterval) clearInterval(this.syncInterval);

    this.syncInterval = setInterval(async () => {
      if (!Auth.isLoggedIn()) return;
      const user = Auth.getCurrentUser();
      
      // Update DB state randomly
      const issues = await DB.getAll('issues');
      const openIssues = issues.filter(i => i.status === 'open');
      const progressIssues = issues.filter(i => i.status === 'in_progress');

      let updated = false;

      // 1. Simulating random upvotes on open issues (50% chance)
      if (openIssues.length > 0 && Math.random() > 0.5) {
        const selected = openIssues[Math.floor(Math.random() * openIssues.length)];
        selected.upvote_count += Math.floor(Math.random() * 3) + 1;
        await DB.put('issues', selected);
        updated = true;

        // If it crosses 10 upvotes, trigger push notification for reporter
        if (selected.upvote_count >= 10 && selected.reporter_id === user.id) {
          this.addNotification(
            'Popular Issue!',
            `Your report "${selected.title.substring(0, 30)}..." has received over 10 upvotes!`,
            'success',
            selected.id
          );
        }
      }

      // 2. Simulating status change by authority (10% chance)
      if (openIssues.length > 0 && Math.random() > 0.90) {
        const selected = openIssues[Math.floor(Math.random() * openIssues.length)];
        selected.status = 'in_progress';
        selected.assigned_to = 'officer_1';
        selected.updated_at = new Date().toISOString();
        await DB.put('issues', selected);
        
        await DB.put('issue_timeline', {
          id: `t_${selected.id}_live_progress`,
          issue_id: selected.id,
          actor_id: 'officer_1',
          actor_role: 'authority',
          action: 'status_changed',
          note: 'Field crew assigned to resolve issue. Status changed to In Progress.',
          created_at: new Date().toISOString()
        });

        updated = true;

        if (selected.reporter_id === user.id) {
          this.addNotification(
            'Issue In Progress',
            `Work has started on your report: "${selected.title.substring(0, 30)}..."`,
            'warning',
            selected.id
          );
        }
      }

      // 3. Simulating resolution of an issue (10% chance)
      if (progressIssues.length > 0 && Math.random() > 0.90) {
        const selected = progressIssues[Math.floor(Math.random() * progressIssues.length)];
        selected.status = 'resolved';
        selected.resolved_at = new Date().toISOString();
        selected.updated_at = new Date().toISOString();
        selected.after_photo_url = DB.getSvgDataUrl(selected.category, true);
        selected.ai_resolution_validated = true;
        selected.ai_resolution_confidence = 0.94;
        await DB.put('issues', selected);

        await DB.put('issue_timeline', {
          id: `t_${selected.id}_live_resolved_ai`,
          issue_id: selected.id,
          actor_id: 'officer_1',
          actor_role: 'system_ai',
          action: 'ai_validated',
          note: 'AI validation: resolved status confirmed (confidence: 94%).',
          created_at: new Date(Date.now() - 5 * 1000).toISOString()
        });

        await DB.put('issue_timeline', {
          id: `t_${selected.id}_live_resolved`,
          issue_id: selected.id,
          actor_id: 'officer_1',
          actor_role: 'authority',
          action: 'resolved',
          note: 'Resolution verified and approved. Issue resolved.',
          created_at: new Date().toISOString()
        });

        updated = true;

        if (selected.reporter_id === user.id) {
          // Award 100 points to user
          const reporter = await DB.get('users', selected.reporter_id);
          if (reporter) {
            reporter.points += 100;
            await DB.put('users', reporter);
            if (user.id === reporter.id) {
              await Auth.refreshUser();
            }
          }

          this.addNotification(
            'Issue Resolved!',
            `Great news! Your report "${selected.title.substring(0, 30)}..." has been marked resolved. (+100 points)`,
            'success',
            selected.id
          );
        }
      }

      // If database changed, dispatch global event so pages update their views
      if (updated) {
        window.dispatchEvent(new CustomEvent('db-update'));
      }
    }, 30000); // Poll/Sync every 30 seconds
  },

  setupGlobalEvents() {
    // Bell click toggler
    const bells = [document.getElementById('notif-bell'), document.getElementById('notif-bell-mobile')];
    const overlay = document.getElementById('notification-overlay');
    
    bells.forEach(bell => {
      if (bell) {
        bell.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleNotificationsOverlay();
        });
      }
    });

    document.addEventListener('click', (e) => {
      if (overlay && overlay.classList.contains('active') && !overlay.contains(e.target)) {
        overlay.classList.remove('active');
      }
    });

    // Dark Mode Toggle Listener
    window.addEventListener('theme-changed', (e) => {
      if (e.detail.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });

    // Check system preference
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  toggleNotificationsOverlay() {
    const overlay = document.getElementById('notification-overlay');
    if (!overlay) return;

    overlay.classList.toggle('active');
    
    if (overlay.classList.contains('active')) {
      // Mark all as read
      this.notifications.forEach(n => n.read = true);
      this.unreadCount = 0;
      localStorage.setItem('civicfix_notifications', JSON.stringify(this.notifications));
      this.updateNotificationBadge();
      this.renderNotificationsList();
    }
  },

  renderNotificationsList() {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    if (this.notifications.length === 0) {
      container.innerHTML = `<div class="empty-list-placeholder">No notifications yet.</div>`;
      return;
    }

    container.innerHTML = this.notifications.map(n => {
      let icon = 'info';
      if (n.type === 'success') icon = 'check-circle';
      if (n.type === 'warning') icon = 'alert-triangle';
      if (n.type === 'danger') icon = 'alert-octagon';

      const timeStr = this.formatTimeAgo(n.created_at);

      return `
        <div class="notification-item ${n.read ? 'read' : 'unread'}" onclick="App.handleNotificationClick('${n.issueId}')">
          <div class="notif-item-icon color-${n.type}">
            <i data-lucide="${icon}"></i>
          </div>
          <div class="notif-item-details">
            <div class="notif-item-title">${n.title}</div>
            <div class="notif-item-desc">${n.message}</div>
            <div class="notif-item-time">${timeStr}</div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  },

  handleNotificationClick(issueId) {
    const overlay = document.getElementById('notification-overlay');
    if (overlay) overlay.classList.remove('active');
    
    if (issueId && issueId !== 'null' && issueId !== 'undefined') {
      // If it's a dynamic issue, go to feed and open details, or go to dynamic public route
      Router.navigate(`#/issue/${issueId}`);
    }
  },

  formatTimeAgo(isoString) {
    const date = new Date(isoString);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + "y ago";
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + "mo ago";
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + "d ago";
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + "h ago";
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + "m ago";
    return seconds < 10 ? "Just now" : Math.floor(seconds) + "s ago";
  }
};

// Bootstrap application on window load
window.addEventListener('DOMContentLoaded', () => App.init());
