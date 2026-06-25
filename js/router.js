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
    
    // Select layouts based on route
    const noNavRoutes = ['#/splash', '#/login', '#/signup'];
    if (noNavRoutes.includes(hash)) {
      body.classList.add('no-nav-layout');
      document.getElementById('mobile-bottom-nav').style.display = 'none';
      document.getElementById('desktop-top-nav').style.display = 'none';
      document.getElementById('sidebar-nav').style.display = 'none';
      return;
    }

    // Gated roles layouts (Dashboard / Admin)
    const isDashboard = hash.startsWith('#/dashboard') || hash.startsWith('#/admin');
    if (isDashboard && user && (user.role === 'authority' || user.role === 'admin')) {
      body.classList.add('authority-layout');
      document.getElementById('mobile-bottom-nav').style.display = 'none';
      document.getElementById('desktop-top-nav').style.display = 'none';
      document.getElementById('sidebar-nav').style.display = 'flex';
      
      // Update sidebar active state
      document.querySelectorAll('#sidebar-nav .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === hash) {
          link.classList.add('active');
        }
      });
      return;
    }

    // Public Layout or Citizen Layout
    body.classList.add('citizen-layout');
    document.getElementById('sidebar-nav').style.display = 'none';

    // Show responsive navigation bars
    const mobileBottom = document.getElementById('mobile-bottom-nav');
    const desktopTop = document.getElementById('desktop-top-nav');
    mobileBottom.style.display = 'flex';
    desktopTop.style.display = 'flex';

    // Update bottom nav active state
    document.querySelectorAll('#mobile-bottom-nav .nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('href') === hash) {
        item.classList.add('active');
      }
    });

    // Update top nav active state
    document.querySelectorAll('#desktop-top-nav .nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === hash) {
        link.classList.add('active');
      }
    });

    // Manage Auth buttons on desktop top bar
    const authBtn = document.getElementById('desktop-auth-btn');
    if (authBtn) {
      if (Auth.isLoggedIn()) {
        authBtn.innerHTML = `
          <div class="user-pill-container" onclick="Router.navigate('#/profile')">
            <img src="${user.avatar_url}" class="user-avatar-sm" />
            <span class="user-name-sm">${user.name.split(' ')[0]}</span>
            <span class="points-badge">${user.points || 0} pts</span>
          </div>
        `;
      } else {
        authBtn.innerHTML = `
          <button class="btn btn-outline" onclick="Router.navigate('#/login')">Authority Login</button>
        `;
      }
    }

    // Manage Auth buttons on mobile header
    const mobileAuthBtn = document.getElementById('mobile-auth-btn');
    if (mobileAuthBtn) {
      if (Auth.isLoggedIn()) {
        mobileAuthBtn.innerHTML = `
          <img src="${user.avatar_url}" class="user-avatar-sm" onclick="Router.navigate('#/profile')" />
        `;
      } else {
        mobileAuthBtn.innerHTML = '';
      }
    }
  }
};
