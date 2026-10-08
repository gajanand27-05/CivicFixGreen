// js/router.js
// Client-side Hash Router for CivicFix

const Router = {
  routes: {},
  appContainer: null,

  init(appContainerId) {
    this.appContainer = document.getElementById(appContainerId);
    window.addEventListener('hashchange', () => this.handleRouting());
    
    // Initial routing
    this.handleRouting();
  },

  register(path, pageController) {
    this.routes[path] = pageController;
  },

  navigate(path) {
    window.location.hash = path;
  },

  async handleRouting() {
    let hash = window.location.hash || '#/home';
    
    // Check if onboarding completed for first-time splash redirect
    const hasSeenSplash = localStorage.getItem('civicfix_seen_splash');
    if (!hasSeenSplash && hash !== '#/splash') {
      this.navigate('#/splash');
      return;
    }

    // Parse issue details dynamic route (e.g. #/issue/issue_001)
    let matchedPath = hash;
    let routeParams = {};

    if (hash.startsWith('#/issue/')) {
      matchedPath = '#/issue/:id';
      routeParams.id = hash.replace('#/issue/', '');
    }

    // Default route handler
    let controller = this.routes[matchedPath];
    if (!controller) {
      console.warn(`No controller registered for ${matchedPath}. Redirecting to Home.`);
      this.navigate('#/home');
      return;
    }

    // Authentication and Role Gating
    const user = Auth.getCurrentUser();
    const isPublic = controller.isPublic || false;

    if (!isPublic && !Auth.isLoggedIn()) {
      // Not logged in and route is not public
      if (typeof App !== 'undefined' && App.showToast) {
        App.showToast('Sign in required', 'Please sign in to access this page.', 'info');
      }
      this.navigate('#/login');
      return;
    }

    if (Auth.isLoggedIn()) {
      // Authenticated Redirects
      if (hash === '#/login' || hash === '#/signup') {
        this.redirectToRoleDashboard(user);
        return;
      }

      // Check access permission for current role
      if (controller.rolesAllowed && !controller.rolesAllowed.includes(user.role)) {
        console.warn(`Role ${user.role} is not permitted to access ${hash}. Redirecting.`);
        this.redirectToRoleDashboard(user);
        return;
      }
    }

    // Dynamic Navigation Layout update
    this.updateNavigationLayout(hash, user);

    // Mount page
    try {
      this.appContainer.innerHTML = '<div class="loader-container"><div class="spinner"></div></div>';
      
      // Load and insert template
      const contentHtml = await controller.render(routeParams);
      this.appContainer.innerHTML = contentHtml;
      
      // Run controller mount logic
      if (controller.mount) {
        await controller.mount(routeParams);
      }

      // Scroll to top
      window.scrollTo(0, 0);

      // Re-initialize Lucide Icons if available
      if (window.lucide) {
        window.lucide.createIcons();
      }
    } catch (err) {
      console.error('Error mounting route:', hash, err);
      this.appContainer.innerHTML = `
        <div class="error-panel">
          <i data-lucide="alert-triangle" class="error-icon"></i>
          <h2>Failed to load page</h2>
          <p>${err.message}</p>
          <button class="btn" onclick="window.location.reload()">Reload Application</button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  },

  redirectToRoleDashboard(user) {
    if (user.role === 'admin') {
      this.navigate('#/dashboard');
    } else if (user.role === 'authority') {
      this.navigate('#/dashboard');
    } else {
      this.navigate('#/home');
    }
  },

  updateNavigationLayout(hash, user) {
    const body = document.body;
    
    // Clear navigation classes
    body.className = '';
    
    const mobileBottom = document.getElementById('mobile-bottom-nav');
    const desktopTop = document.getElementById('desktop-top-nav');

    // 1. Splash & Auth standalone layouts
    const noNavRoutes = ['#/splash', '#/login', '#/signup'];
    if (noNavRoutes.includes(hash)) {
      body.classList.add('no-nav-layout');
      if (mobileBottom) mobileBottom.style.display = 'none';
      if (desktopTop) desktopTop.style.display = 'none';
      return;
    }

    // 2. Authority & Admin Dashboard layouts (Dedicated workspace)
    const isDashboard = hash.startsWith('#/dashboard') || hash.startsWith('#/admin');
    if (isDashboard && user && (user.role === 'authority' || user.role === 'admin')) {
      body.classList.add('authority-layout');
      if (mobileBottom) mobileBottom.style.display = 'none';
      if (desktopTop) desktopTop.style.display = 'none';
      return;
    }

    // 3. Public Web & Citizen Experience
    body.classList.add('citizen-layout');

    // Allow CSS media queries to control visibility (display: none on desktop, display: flex on mobile)
    if (mobileBottom) mobileBottom.style.display = '';
    if (desktopTop) desktopTop.style.display = '';

    // Update bottom nav active state
    if (mobileBottom) {
      mobileBottom.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === hash) {
          item.classList.add('active');
        }
      });
    }

    // Update top nav active state
    if (desktopTop) {
      desktopTop.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === hash) {
          link.classList.add('active');
        }
      });
    }

    // Manage Auth buttons on desktop top bar
    const authBtn = document.getElementById('desktop-auth-btn');
    if (authBtn) {
      if (Auth.isLoggedIn() && user) {
        const isStaff = user.role === 'authority' || user.role === 'admin';
        const userName = (user.name || 'User').split(' ')[0];
        const avatarUrl = user.avatar_url || 'assets/icon.svg';
        authBtn.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            ${isStaff ? `<button class="btn btn-xs btn-outline" onclick="Router.navigate('#/dashboard')"><i data-lucide="layout-dashboard"></i> GovPortal</button>` : ''}
            <div class="user-pill-container" onclick="Router.navigate('#/profile')" title="View profile">
              <img src="${avatarUrl}" class="user-avatar-sm" />
              <span class="user-name-sm">${userName}</span>
              <span class="points-badge">${user.points || 0} pts</span>
            </div>
            <button class="icon-btn btn-logout-quick" onclick="Auth.logout(); Router.navigate('#/home');" title="Sign out" style="width: 32px; height: 32px;">
              <i data-lucide="log-out" style="width: 16px; height: 16px;"></i>
            </button>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
      } else {
        authBtn.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn btn-outline btn-sm" onclick="Router.navigate('#/login')">Sign In</button>
            <button class="btn btn-primary btn-sm" onclick="Router.navigate('#/signup')">Sign Up</button>
          </div>
        `;
      }
    }

    // Manage Auth buttons on mobile header
    const mobileAuthBtn = document.getElementById('mobile-auth-btn');
    if (mobileAuthBtn) {
      if (Auth.isLoggedIn() && user) {
        mobileAuthBtn.innerHTML = `
          <img src="${user.avatar_url || 'assets/icon.svg'}" class="user-avatar-sm" onclick="Router.navigate('#/profile')" />
        `;
      } else {
        mobileAuthBtn.innerHTML = `
          <button class="btn btn-xs btn-outline" onclick="Router.navigate('#/login')">Sign In</button>
        `;
      }
    }
  }
};
