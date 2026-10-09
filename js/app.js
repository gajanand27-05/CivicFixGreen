// js/app.js
// Main Application Bootstrap and Coordinator

const App = {
  notifications: [],
  unreadCount: 0,
  syncInterval: null,

  async init() {
    console.log('Bootstrapping EcoSort...');

    // 1. Initialize DB and Seeding
    try {
      await DB.init();
      await DB.seedIfNeeded();
    } catch (err) {
      console.error('Server not reachable. Start it with: uvicorn server.main:app --port 8000', err);
    }

    // 2. Initialize Session
    Auth.init();

    if ('caches' in window) {
      try {
        caches.keys().then(keys => {
          keys.forEach(key => {
            if (key !== 'ecosort-cache-v7') {
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
    const savedNotifs = localStorage.getItem('ecosort_notifications');
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
      this.addNotification('Welcome to EcoSort!', 'Snap a photo of a garbage dump, we handle the rest with BBMP.', 'info');
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
    localStorage.setItem('ecosort_notifications', JSON.stringify(this.notifications));
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

  showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');

    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'warning') icon = 'alert-triangle';
    if (type === 'danger') icon = 'alert-octagon';

    toast.innerHTML = `
      <div class="toast-content">
        <i data-lucide="${icon}"></i>
        <div class="toast-text">
          <div class="toast-title">${title}</div>
          ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
      </div>
      <button class="toast-close" aria-label="Dismiss">&times;</button>
    `;

    toastContainer.appendChild(toast);
    // Keep at most 4 toasts on screen
    while (toastContainer.children.length > 4) toastContainer.firstElementChild.remove();

    if (window.lucide) window.lucide.createIcons();

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      clearTimeout(showTimer);
      toast.classList.add('toast-leaving');
      // Remove after the 300ms exit transition; guaranteed even if no event fires
      setTimeout(() => toast.remove(), 350);
    };

    const showTimer = setTimeout(dismiss, 2500);
    toast.querySelector('.toast-close').addEventListener('click', dismiss);
  },

  // Pull real notifications written by the server (complaint raised, reminders, BBMP replies, status changes)
  startLiveSync() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    const pull = async () => {
      if (!Auth.isLoggedIn()) return;
      const user = Auth.getCurrentUser();
      const all = await DB.getAll('notifications');
      const mine = all.filter(n => n.user_id === user.id && !n.delivered)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      for (const n of mine) {
        this.addNotification(n.title, n.message, n.type, n.issue_id);
        await DB.put('notifications', { ...n, delivered: true });
      }
      if (mine.length > 0) window.dispatchEvent(new CustomEvent('db-update'));
    };
    pull().catch(console.error);
    this.syncInterval = setInterval(() => pull().catch(console.error), 15000);
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

    // Click anywhere outside the overlay (or on an item) closes it
    document.addEventListener('click', (e) => {
      if (overlay && overlay.classList.contains('active') && !overlay.contains(e.target)) {
        overlay.classList.remove('active');
      }
    });

    // Close the notification overlay on Escape and on every route change
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay) overlay.classList.remove('active');
    });
    window.addEventListener('hashchange', () => {
      if (overlay) overlay.classList.remove('active');
    });

    // Light theme only
    document.documentElement.classList.remove('dark');
  },

  toggleNotificationsOverlay() {
    const overlay = document.getElementById('notification-overlay');
    if (!overlay) return;

    overlay.classList.toggle('active');
    
    if (overlay.classList.contains('active')) {
      // Mark all as read
      this.notifications.forEach(n => n.read = true);
      this.unreadCount = 0;
      localStorage.setItem('ecosort_notifications', JSON.stringify(this.notifications));
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
