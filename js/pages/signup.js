// js/pages/signup.js
// Signup View Controller

const SignupPage = {
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
            <h1>Create Account</h1>
            <p>Join CivicFix to improve your city</p>
          </div>

          <div id="signup-error" class="auth-error-banner" style="display: none;"></div>

          <form id="signup-form" class="auth-form" novalidate>
            <div class="form-group">
              <label for="signup-name">Full Name</label>
              <div class="input-with-icon">
                <i data-lucide="user"></i>
                <input type="text" id="signup-name" placeholder="John Doe" autocomplete="name">
              </div>
            </div>

            <div class="form-group">
              <label for="signup-email">Email Address</label>
              <div class="input-with-icon">
                <i data-lucide="mail"></i>
                <input type="email" id="signup-email" placeholder="name@domain.com" autocomplete="email">
              </div>
            </div>

            <div class="form-group">
              <label for="signup-password">Password</label>
              <div class="input-with-icon">
                <i data-lucide="lock"></i>
                <input type="password" id="signup-password" placeholder="Min 6 characters" autocomplete="new-password">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group half-width">
                <label for="signup-city">City</label>
                <select id="signup-city">
                  <option value="MetroCity">MetroCity</option>
                </select>
              </div>

              <div class="form-group half-width">
                <label for="signup-ward">Ward / Sector</label>
                <select id="signup-ward">
                  <option value="Ward 4">Ward 4 (Indiranagar)</option>
                  <option value="Ward 5">Ward 5 (HAL Stage 2)</option>
                  <option value="Ward 6">Ward 6 (Domlur)</option>
                </select>
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-block">Register</button>
          </form>

          <div class="auth-footer">
            <p>Already have an account? <a href="#/login">Sign in</a></p>
          </div>
        </div>
      </div>
    `;
  },

  async mount() {
    const form = document.getElementById('signup-form');
    const errBanner = document.getElementById('signup-error');

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
      form.querySelectorAll('.input-with-icon input, select').forEach(el => el.classList.remove('invalid'));
      form.querySelectorAll('.invalid-feedback').forEach(el => el.remove());

      const nameInput = document.getElementById('signup-name');
      const emailInput = document.getElementById('signup-email');
      const passwordInput = document.getElementById('signup-password');
      const citySelect = document.getElementById('signup-city');
      const wardSelect = document.getElementById('signup-ward');

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const city = citySelect.value;
      const ward = wardSelect.value;

      let isValid = true;

      if (!name) {
        nameInput.classList.add('invalid');
        showInlineError(nameInput, 'Full Name is required.');
        isValid = false;
      }

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
      } else if (password.length < 6) {
        passwordInput.classList.add('invalid');
        showInlineError(passwordInput, 'Password must be at least 6 characters.');
        isValid = false;
      }

      if (!city) {
        citySelect.classList.add('invalid');
        showInlineError(citySelect, 'City is required.');
        isValid = false;
      }

      if (!ward) {
        wardSelect.classList.add('invalid');
        showInlineError(wardSelect, 'Ward is required.');
        isValid = false;
      }

      if (!isValid) {
        errBanner.innerText = 'Please correct the highlighted fields.';
        errBanner.style.display = 'block';
        return;
      }

      try {
        const user = await Auth.register(name, email, password, city, ward);
        App.addNotification('Welcome to CivicFix!', `Account created successfully, welcome ${user.name}!`, 'success');
        Router.navigate('#/home');
      } catch (err) {
        errBanner.innerText = err.message || 'Failed to register account.';
        errBanner.style.display = 'block';
      }
    });
  }
};

// Expose globally
window.SignupPage = SignupPage;
