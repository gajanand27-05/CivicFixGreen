// js/pages/admin.js
// Admin Staff Management Controller

const AdminPage = {
  rolesAllowed: ['admin'],

  async render() {
    return `
      <div class="admin-container">
        <!-- Header -->
        <div class="admin-header card">
          <h1>Admin Control Panel</h1>
          <p>Create and manage municipal officer accounts, configure wards, and audit global settings.</p>
        </div>

        <div class="split-pane-layout mt-4">
          <!-- Left pane: Create Staff -->
          <div class="split-left-table card" style="flex: 1.2;">
            <h3>Register Government Officer</h3>
            <form id="create-officer-form" class="mt-3">
              <div class="form-group">
                <label for="officer-name">Officer Full Name</label>
                <input type="text" id="officer-name" class="form-control" placeholder="Officer Rajesh Kumar" required>
              </div>

              <div class="form-group">
                <label for="officer-email">Email Address (@civicfix.gov)</label>
                <input type="email" id="officer-email" class="form-control" placeholder="officer@civicfix.gov" required>
              </div>

              <div class="form-group">
                <label for="officer-pass">Security Password</label>
                <input type="password" id="officer-pass" class="form-control" placeholder="Min 6 characters" minlength="6" required>
              </div>

              <div class="form-row">
                <div class="form-group half-width">
                  <label for="officer-dept">Primary Department</label>
                  <select id="officer-dept" class="form-control" required>
                    <option value="roads">Roads Department</option>
                    <option value="electricity">Electricity Board</option>
                    <option value="water">Water Supply & Sewerage</option>
                    <option value="sanitation">Sanitation & Garbage Clean</option>
                    <option value="municipality">Municipal Corporation</option>
                  </select>
                </div>

                <div class="form-group half-width">
                  <label for="officer-ward">Jurisdiction Ward</label>
                  <select id="officer-ward" class="form-control" required>
                    <option value="Ward 4">Ward 4</option>
                    <option value="Ward 5">Ward 5</option>
                    <option value="Ward 6">Ward 6</option>
                  </select>
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-block mt-3">Register Officer Account</button>
            </form>
          </div>

          <!-- Right pane: List Staff -->
          <div class="split-right-details card" style="display: block; flex: 1.5; margin-left: 20px;">
            <h3>Active Municipal Staff</h3>
            <p class="text-muted small mb-3">Pre-created official portal accounts.</p>

            <div class="table-container">
              <table class="dashboard-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Dept</th>
                    <th>Ward</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="officers-list-rows">
                  <!-- Populated dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async mount() {
    this.setupListeners();
    await this.renderOfficersList();
  },

  setupListeners() {
    const form = document.getElementById('create-officer-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('officer-name').value.trim();
      const email = document.getElementById('officer-email').value.trim();
      const password = document.getElementById('officer-pass').value;
      const dept = document.getElementById('officer-dept').value;
      const ward = document.getElementById('officer-ward').value;

      if (!email.toLowerCase().endsWith('.gov')) {
        App.showToast('Invalid Email', 'Officer accounts must use a .gov domain.', 'warning');
        return;
      }

      // Check if email exists
      const users = await DB.getAll('users');
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        App.showToast('Account exists', 'An account with this email is already registered.', 'warning');
        return;
      }

      // Save new authority officer
      const newOfficer = {
        id: 'officer_' + Date.now(),
        name,
        email,
        password_hash: password,
        role: 'authority',
        city: 'MetroCity',
        ward,
        department: dept,
        points: 0,
        google_oauth_id: null,
        avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
        created_at: new Date().toISOString(),
        notification_preferences: { email: true, push: true, digest: true }
      };

      await DB.put('users', newOfficer);
      App.showToast('Officer Registered', `Account created for ${name}.`, 'success');
      
      form.reset();
      await this.renderOfficersList();
    });
  },

  async renderOfficersList() {
    const container = document.getElementById('officers-list-rows');
    if (!container) return;

    const users = await DB.getAll('users');
    const officers = users.filter(u => u.role === 'authority');

    if (officers.length === 0) {
      container.innerHTML = '<tr><td colspan="5" class="text-center">No official staff accounts found.</td></tr>';
      return;
    }

    container.innerHTML = officers.map(o => `
      <tr>
        <td><strong>${o.name}</strong></td>
        <td>${o.email}</td>
        <td><span class="category-tag">${o.department.toUpperCase()}</span></td>
        <td>${o.ward}</td>
        <td>
          <button class="btn btn-outline btn-xs" style="border-color:#EF4444; color:#EF4444;" onclick="AdminPage.deleteOfficer('${o.id}')">
            Delete
          </button>
        </td>
      </tr>
    `).join('');
  },

  async deleteOfficer(id) {
    const proceed = confirm("Are you sure you want to delete this officer account?");
    if (!proceed) return;

    await DB.delete('users', id);
    App.showToast('Account Deleted', 'Officer account removed.', 'info');
    await this.renderOfficersList();
  }
};

// Expose globally
window.AdminPage = AdminPage;
