// js/pages/admin.js
// Admin: manage officer accounts

const AdminPage = {
  rolesAllowed: ['admin'],

  async render() {
    return `
      <div class="admin-container">
        <header class="off-page-head">
          <div>
            <h1>Staff accounts</h1>
            <p class="text-muted">Add city corporation officers who can manage complaints on the dashboard.</p>
          </div>
          <a href="#/dashboard" class="btn btn-outline btn-sm"><i data-lucide="arrow-left"></i> Back to dashboard</a>
        </header>

        <div class="adm-grid">
          <section class="off-card">
            <h3>Add an officer</h3>
            <form id="create-officer-form" class="off-form">
              <label>Full name
                <input type="text" id="officer-name" class="form-control" placeholder="e.g. Ramesh Kumar" required>
              </label>
              <label>Work email (must end in .gov)
                <input type="email" id="officer-email" class="form-control" placeholder="name@ecosort.gov" required>
              </label>
              <label>Password
                <input type="password" id="officer-pass" class="form-control" placeholder="At least 6 characters" minlength="6" required>
              </label>
              <div class="adm-form-row">
                <label>Department
                  <select id="officer-dept" class="form-control" required>
                    ${Green.departmentOptionsHtml()}
                  </select>
                </label>
                <label>Ward
                  <select id="officer-ward" class="form-control" required>
                    <option value="Ward 4">Ward 4</option>
                    <option value="Ward 5">Ward 5</option>
                    <option value="Ward 6">Ward 6</option>
                  </select>
                </label>
              </div>
              <button type="submit" class="btn btn-primary btn-block">Add officer</button>
            </form>
          </section>

          <section class="off-card">
            <h3>Officers</h3>
            <div class="off-table-scroll">
              <table class="off-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Ward</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="officers-list-rows"></tbody>
              </table>
            </div>
          </section>
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
        App.showToast('Check the email', 'Officer emails must end in .gov.', 'warning');
        return;
      }

      // Check if email exists
      const users = await DB.getAll('users');
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        App.showToast('Email already used', 'An account with this email already exists.', 'warning');
        return;
      }

      // Save new authority officer
      const newOfficer = {
        id: 'officer_' + Date.now(),
        name,
        email,
        password_hash: password,
        role: 'authority',
        city: 'Bengaluru',
        ward,
        department: dept,
        points: 0,
        google_oauth_id: null,
        avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
        created_at: new Date().toISOString(),
        notification_preferences: { email: true, push: true, digest: true }
      };

      await DB.put('users', newOfficer);
      App.showToast('Officer added', `${name} can now sign in.`, 'success');
      
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
      container.innerHTML = '<tr><td colspan="5" class="off-empty">No officers yet.</td></tr>';
      return;
    }

    container.innerHTML = officers.map(o => `
      <tr>
        <td class="adm-name"><strong>${String(o.name).split(" - ")[0]}</strong>${String(o.name).includes(" - ") ? `<span>${String(o.name).split(" - ").slice(1).join(" - ")}</span>` : ""}</td>
        <td>${o.email}</td>
        <td>${Green.DEPARTMENTS[o.department] || o.department || '—'}</td>
        <td class="adm-ward">${o.ward || "—"}</td>
        <td>
          <button class="btn btn-outline btn-xs adm-remove" onclick="AdminPage.deleteOfficer('${o.id}')">Remove</button>
        </td>
      </tr>
    `).join('');
  },

  async deleteOfficer(id) {
    const proceed = confirm("Remove this officer account? They will no longer be able to sign in.");
    if (!proceed) return;

    await DB.delete('users', id);
    App.showToast('Officer removed', 'The account has been removed.', 'info');
    await this.renderOfficersList();
  }
};

// Expose globally
window.AdminPage = AdminPage;
