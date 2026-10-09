// js/pages/signup.js
// Signup View Controller

const SignupPage = {
  isPublic: true,

  async render() {
    return `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-header">
            <img src="assets/ecosort-logo.png" alt="EcoSort" class="auth-logo-img">
            <h1>Create your account</h1>
            <p>Join your neighbours in keeping Bengaluru clean.</p>
          </div>

          <div id="signup-error" class="auth-error-banner" style="display: none;"></div>

          <form id="signup-form" class="auth-form" novalidate>
            <div class="form-group">
              <label for="signup-name">Full Name</label>
              <div class="input-with-icon">
                <i data-lucide="user"></i>
                <input type="text" id="signup-name" placeholder="Your name" autocomplete="name">
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
                  <option value="Bengaluru">Bengaluru</option>
                </select>
              </div>

              <div class="form-group half-width">
                <label for="signup-ward">Ward</label>
                <select id="signup-ward">
                  <option value="Ward 4">Ward 4 (Indiranagar)</option>
                  <option value="Ward 5">Ward 5 (HAL Stage 2)</option>
                  <option value="Ward 6">Ward 6 (Domlur)</option>
                </select>
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-block">Create account</button>
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
        App.addNotification('Welcome to EcoSort!', `Glad to have you, ${user.name}.`, 'success');
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
