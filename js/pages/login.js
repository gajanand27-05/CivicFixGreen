// js/pages/login.js
// Login View Controller

const LoginPage = {
  isPublic: true,

  async render() {
    return `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-header">
            <div class="auth-logo">
              <svg viewBox="0 0 512 512" width="48" height="48">
                <path d="M256,64 C160,64 80,144 80,240 C80,360 224,448 256,448 C288,448 432,360 432,240 C432,144 352,64 256,64 Z" fill="#1A56DB" />
                <circle cx="256" cy="240" r="100" fill="#FFFFFF" />
                <path d="M208,248 L238,278 L304,200" fill="none" stroke="#1A56DB" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <h1>Welcome to CivicFix Green</h1>
            <p>Report garbage dumps. We follow up with BBMP until they are cleared.</p>
          </div>
          
          <div id="auth-error" class="auth-error-banner" style="display: none;"></div>

          <form id="login-form" class="auth-form" novalidate>
            <div class="form-group">
              <label for="login-email">Email Address</label>
              <div class="input-with-icon">
                <i data-lucide="mail"></i>
                <input type="email" id="login-email" placeholder="name@domain.com" autocomplete="email">
              </div>
            </div>

            <div class="form-group">
              <label for="login-password">Password</label>
              <div class="input-with-icon">
                <i data-lucide="lock"></i>
                <input type="password" id="login-password" placeholder="••••••••" autocomplete="current-password">
              </div>
            </div>

            <div class="form-row">
              <label class="checkbox-container">
                <input type="checkbox" id="login-remember">
                <span class="checkmark"></span>
                Remember me
              </label>
            </div>

            <button type="submit" class="btn btn-primary btn-block">Sign In</button>
          </form>

          <div class="auth-divider">
            <span>or continue with</span>
          </div>

          <button id="google-signin-btn" class="btn btn-outline btn-block btn-google">
            <svg viewBox="0 0 24 24" width="18" height="18" style="margin-right: 8px;">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div class="demo-accounts-box mt-3 mb-3">
            <span class="demo-title">⚡ 1-Click Role Logins (Judge & Demo Testing)</span>
            <div class="demo-btn-group">
              <button type="button" class="btn btn-xs btn-outline demo-login-btn" data-email="citizen@civicfix.gov" data-pass="citizen123">
                <i data-lucide="user"></i> Citizen
              </button>
              <button type="button" class="btn btn-xs btn-outline demo-login-btn" data-email="officer@civicfix.gov" data-pass="officer123">
                <i data-lucide="shield"></i> Officer
              </button>
              <button type="button" class="btn btn-xs btn-outline demo-login-btn" data-email="admin@civicfix.gov" data-pass="admin123">
                <i data-lucide="settings"></i> Admin
              </button>
            </div>
            <div style="margin-top: 10px; text-align: center;">
              <button type="button" id="reset-demo-db-btn" class="btn btn-xs" style="background: transparent; color: var(--text-muted); font-size: 11px; text-decoration: underline; border: none; cursor: pointer;">
                🔄 Reset Demo Data to Clean State
              </button>
            </div>
          </div>

          <!-- Interactive Google Account Selector Modal Container -->
          <div id="google-oauth-modal" class="google-modal-overlay" style="display: none;">
            <div class="google-modal-card">
              <div class="google-modal-header">
                <svg viewBox="0 0 24 24" width="32" height="32">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <h3>Sign in with Google</h3>
                <p>Choose an account to continue to CivicFix Green</p>
              </div>

              <div class="google-accounts-list">
                <button type="button" class="google-account-btn" data-name="Alex Turner" data-email="alex.turner@gmail.com" data-points="390" data-avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80" class="google-acc-avatar" alt="Avatar">
                  <div class="google-acc-details">
                    <div class="google-acc-name">Alex Turner <span class="google-acc-role-badge">Citizen • 390 pts</span></div>
                    <div class="google-acc-email">alex.turner@gmail.com</div>
                  </div>
                </button>

                <button type="button" class="google-account-btn" data-name="Priya Sharma" data-email="priya.sharma@gmail.com" data-points="620" data-avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80">
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80" class="google-acc-avatar" alt="Avatar">
                  <div class="google-acc-details">
                    <div class="google-acc-name">Priya Sharma <span class="google-acc-role-badge">Lead • 620 pts</span></div>
                    <div class="google-acc-email">priya.sharma@gmail.com</div>
                  </div>
                </button>

                <button type="button" class="google-account-btn" data-name="Officer Ramesh Kumar" data-email="officer.ramesh@gmail.com" data-role="authority" data-points="0" data-avatar="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&h=150&q=80">
                  <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&h=150&q=80" class="google-acc-avatar" alt="Avatar">
                  <div class="google-acc-details">
                    <div class="google-acc-name">Ramesh Kumar <span class="google-acc-role-badge">BBMP SWM Officer</span></div>
                    <div class="google-acc-email">officer.ramesh@gmail.com</div>
                  </div>
                </button>
              </div>

              <div class="google-modal-footer">
                <button type="button" id="close-google-modal-btn" class="btn btn-outline btn-xs">Cancel</button>
                <span style="font-size: 11px; color: var(--text-muted);">Secure Google Identity Demo</span>
              </div>
            </div>
          </div>

          <div class="auth-footer">
            <p>New to CivicFix Green? <a href="#/signup">Create an account</a></p>
            <p class="mt-2"><a href="#/public" class="transparency-link"><i data-lucide="eye" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i>View Bengaluru Clean City Board</a></p>
          </div>
        </div>
      </div>
    `;
  },

  async mount() {
    const form = document.getElementById('login-form');
    const errBanner = document.getElementById('auth-error');
    const googleBtn = document.getElementById('google-signin-btn');
    const googleModal = document.getElementById('google-oauth-modal');
    const closeGoogleModalBtn = document.getElementById('close-google-modal-btn');
    const resetDbBtn = document.getElementById('reset-demo-db-btn');

    // Helper functions for validation
    const showInlineError = (inputEl, msg) => {
      const feedback = document.createElement('div');
      feedback.className = 'invalid-feedback';
      feedback.innerText = msg;
      const parent = inputEl.closest('.form-group');
      if (parent) {
        parent.appendChild(feedback);
      }
    };

    const validateEmail = (email) => {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errBanner.style.display = 'none';

      // Clear previous validation styling
      form.querySelectorAll('.input-with-icon input').forEach(el => el.classList.remove('invalid'));
      form.querySelectorAll('.invalid-feedback').forEach(el => el.remove());

      const emailInput = document.getElementById('login-email');
      const passwordInput = document.getElementById('login-password');
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const rememberMe = document.getElementById('login-remember').checked;

      let isValid = true;

      if (!email) {
        emailInput.classList.add('invalid');
        showInlineError(emailInput, 'Email Address is required.');
        isValid = false;
      } else if (!validateEmail(email)) {
        emailInput.classList.add('invalid');
        showInlineError(emailInput, 'Please enter a valid email address.');
        isValid = false;
      }

      if (!password) {
        passwordInput.classList.add('invalid');
        showInlineError(passwordInput, 'Password is required.');
        isValid = false;
      }

      if (!isValid) {
        errBanner.innerText = 'Please correct the highlighted fields.';
        errBanner.style.display = 'block';
        return;
      }

      try {
        const user = await Auth.login(email, password, rememberMe);
        App.addNotification(`Welcome back, ${user.name}!`, 'Logged in successfully.', 'success');
        Router.redirectToRoleDashboard(user);
      } catch (err) {
        errBanner.innerText = err.message || 'An error occurred.';
        errBanner.style.display = 'block';
      }
    });

    // Open Google Account Picker Modal
    if (googleBtn && googleModal) {
      googleBtn.addEventListener('click', () => {
        googleModal.style.display = 'flex';
      });
    }

    if (closeGoogleModalBtn && googleModal) {
      closeGoogleModalBtn.addEventListener('click', () => {
        googleModal.style.display = 'none';
      });
    }

    // Google Account Selection
    document.querySelectorAll('.google-account-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const accountData = {
          name: btn.getAttribute('data-name'),
          email: btn.getAttribute('data-email'),
          points: parseInt(btn.getAttribute('data-points') || '0', 10),
          avatar_url: btn.getAttribute('data-avatar'),
          role: btn.getAttribute('data-role') || 'citizen'
        };

        if (googleModal) googleModal.style.display = 'none';

        try {
          const user = await Auth.googleSignIn(accountData);
          App.addNotification(`Welcome, ${user.name}!`, 'Signed in with Google Account.', 'success');
          Router.redirectToRoleDashboard(user);
        } catch (err) {
          errBanner.innerText = err.message || 'OAuth failure.';
          errBanner.style.display = 'block';
        }
      });
    });

    // 1-Click Demo Login Handlers
    document.querySelectorAll('.demo-login-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const email = btn.getAttribute('data-email');
        const pass = btn.getAttribute('data-pass');
        const emailField = document.getElementById('login-email');
        const passField = document.getElementById('login-password');
        if (emailField) emailField.value = email;
        if (passField) passField.value = pass;
        try {
          const user = await Auth.login(email, pass, true);
          App.addNotification(`Welcome, ${user.name}!`, `Logged in as demo ${user.role}.`, 'success');
          Router.redirectToRoleDashboard(user);
        } catch (err) {
          errBanner.innerText = err.message || 'Login failed.';
          errBanner.style.display = 'block';
        }
      });
    });

    // Reset Demo DB Handler
    if (resetDbBtn) {
      resetDbBtn.addEventListener('click', async () => {
        if (confirm('Reset demo database to fresh waste complaints and users?')) {
          if (DB && typeof DB.resetDemoData === 'function') {
            await DB.resetDemoData();
            App.showToast('Database Reset', 'Demo data refreshed with Bengaluru waste complaints.', 'success');
          }
        }
      });
    }
  }
};

// Expose globally
window.LoginPage = LoginPage;
