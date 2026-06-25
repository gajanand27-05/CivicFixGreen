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
            <h1>Welcome to CivicFix</h1>
            <p>Resolve local issues together</p>
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
            Google OAuth
          </button>

          <div class="auth-footer">
            <p>New to CivicFix? <a href="#/signup">Create an account</a></p>
            <p class="mt-2"><a href="#/public" class="transparency-link"><i data-lucide="eye" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i>View Public Transparency Page</a></p>
          </div>
        </div>
      </div>
    `;
  },

  async mount() {
    const form = document.getElementById('login-form');
    const errBanner = document.getElementById('auth-error');
    const googleBtn = document.getElementById('google-signin-btn');

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

    googleBtn.addEventListener('click', async () => {
      try {
        const user = await Auth.googleSignIn();
        App.addNotification(`Welcome, ${user.name}!`, 'Signed in with Google OAuth.', 'success');
        Router.redirectToRoleDashboard(user);
      } catch (err) {
        errBanner.innerText = err.message || 'OAuth failure.';
        errBanner.style.display = 'block';
      }
    });
  }
};

// Expose globally
window.LoginPage = LoginPage;
