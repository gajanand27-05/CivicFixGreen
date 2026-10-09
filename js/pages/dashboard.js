// js/pages/dashboard.js
// Officer dashboard: overview, complaints log, predicted hotspots, monthly report

const DashboardPage = {
  currentSubSection: 'overview',
  issues: [],
  predictions: [],
  selectedIssueId: null,
  afterFixPhoto: null,
  charts: {},
  predictionMap: null,
  predictionPolygons: [],
  listenersBound: false,

  cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  },

  shortOffice(issue) {
    // "Bengaluru East City Corporation - Mahadevapura Zonal Office" -> "Mahadevapura"
    const name = issue.complaint && issue.complaint.office_name;
    if (!name) return '—';
    const part = name.split(' - ').pop();
    const paren = part.match(/\(([^)]+)\)/);
    return (paren ? paren[1] : part.replace(/\s*(Zonal )?Office\b/, '')).replace(/^BBMP /, '').trim() || name;
  },

  monthOptionsHtml() {
    const now = new Date();
    const opts = [];
    for (let k = 0; k < 6; k++) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      opts.push(`<option value="${d.getFullYear()}-${d.getMonth() + 1}">${label}</option>`);
    }
    return opts.join('');
  },

  async render() {
    return `
      <div class="off-shell">
        <aside class="off-side">
          <div class="off-brand">
            <span class="off-brand-mark"><i data-lucide="leaf"></i></span>
            <span>Officer Dashboard</span>
          </div>

          <nav class="off-nav">
            <a href="#" class="off-nav-link active" data-sub="overview"><i data-lucide="layout-dashboard"></i><span>Overview</span></a>
            <a href="#" class="off-nav-link" data-sub="issues"><i data-lucide="list-checks"></i><span>Complaints</span></a>
            <a href="#" class="off-nav-link" data-sub="predictions"><i data-lucide="map-pin"></i><span>Hotspots</span></a>
            <a href="#" class="off-nav-link" data-sub="reports"><i data-lucide="file-text"></i><span>Reports</span></a>
            <a href="#/admin" class="off-nav-link" id="sidebar-admin-link" style="display:none;"><i data-lucide="users"></i><span>Staff</span></a>
          </nav>

          <div class="off-side-footer">
            <a href="#/profile" class="off-nav-link"><i data-lucide="user"></i><span>Profile</span></a>
            <button class="off-nav-link off-logout" id="dashboard-logout-btn"><i data-lucide="log-out"></i><span>Sign out</span></button>
          </div>
        </aside>

        <main class="off-main">

          <!-- OVERVIEW -->
          <section class="dashboard-panel" id="panel-overview">
            <header class="off-page-head">
              <div>
                <h1>Overview</h1>
                <p class="text-muted">Garbage-dump complaints sent to GBA city corporation offices.</p>
              </div>
            </header>

            <div class="off-stats">
              <div class="off-stat"><span class="off-stat-label">Total</span><span class="off-stat-value" id="m-total">0</span></div>
              <div class="off-stat is-open"><span class="off-stat-label">Open</span><span class="off-stat-value" id="m-open">0</span></div>
              <div class="off-stat is-progress"><span class="off-stat-label">In Progress</span><span class="off-stat-value" id="m-progress">0</span></div>
              <div class="off-stat is-closed"><span class="off-stat-label">Closed</span><span class="off-stat-value" id="m-resolved">0</span></div>
            </div>

            <div class="off-grid-2">
              <div class="off-card">
                <h3>Complaints by type</h3>
                <div class="off-chart"><canvas id="category-chart"></canvas></div>
              </div>
              <div class="off-card">
                <h3>Needs attention</h3>
                <p class="text-muted small">Unresolved complaints, oldest first.</p>
                <ul class="off-attention" id="urgent-issues-rows"></ul>
              </div>
            </div>
          </section>

          <!-- COMPLAINTS LOG -->
          <section class="dashboard-panel" id="panel-issues" style="display:none;">
            <header class="off-page-head">
              <div>
                <h1>Complaints</h1>
                <p class="text-muted">Click a complaint to update its status. Rows in red are overdue (${Green.REMINDER_DAYS}+ days).</p>
              </div>
            </header>

            <div class="off-filters">
              <label>Status
                <select id="dash-filter-status" class="form-control">
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Closed</option>
                </select>
              </label>
              <label>Type
                <select id="dash-filter-category" class="form-control">
                  <option value="all">All</option>
                  ${Green.categoryOptionsHtml()}
                </select>
              </label>
              <label>Ward
                <select id="dash-filter-ward" class="form-control">
                  <option value="all">All wards</option>
                  <option value="Ward 4">Ward 4</option>
                  <option value="Ward 5">Ward 5</option>
                  <option value="Ward 6">Ward 6</option>
                </select>
              </label>
            </div>

            <div class="off-split">
              <div class="off-card off-table-card">
                <div class="off-table-scroll">
                  <table class="off-table is-cards">
                    <thead>
                      <tr>
                        <th>Ticket</th>
                        <th>Complaint</th>
                        <th>Office</th>
                        <th>Days open</th>
                        <th>Reminders</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody id="dash-issues-rows"></tbody>
                  </table>
                </div>
              </div>

              <div class="off-card off-detail" id="dash-details-pane" style="display:none;">
                <div class="off-detail-head">
                  <h3>Complaint details</h3>
                  <button class="off-icon-btn" onclick="DashboardPage.closeDetailsPane()" aria-label="Close">&times;</button>
                </div>
                <div id="dash-pane-body"></div>
              </div>
            </div>
          </section>

          <!-- PREDICTED HOTSPOTS -->
          <section class="dashboard-panel" id="panel-predictions" style="display:none;">
            <header class="off-page-head">
              <div>
                <h1>Predicted hotspots</h1>
                <p class="text-muted">Areas where dumping or burning is likely to happen again, based on past complaints.</p>
              </div>
              <button class="btn btn-primary" id="run-analysis-btn">
                <i data-lucide="refresh-cw"></i> Run hotspot analysis
              </button>
            </header>

            <div class="off-card off-map-card">
              <div id="prediction-google-map" class="off-map"></div>
            </div>

            <div class="off-card">
              <h3>Hotspot list</h3>
              <div class="off-table-scroll">
                <table class="off-table">
                  <thead>
                    <tr>
                      <th>Area</th>
                      <th>Likely problem</th>
                      <th>Risk</th>
                      <th>Past reports</th>
                      <th>Valid until</th>
                    </tr>
                  </thead>
                  <tbody id="predictions-table-rows"></tbody>
                </table>
              </div>
            </div>
          </section>

          <!-- MONTHLY REPORT -->
          <section class="dashboard-panel" id="panel-reports" style="display:none;">
            <header class="off-page-head">
              <div>
                <h1>Monthly report</h1>
                <p class="text-muted">Download a PDF summary of complaints and cleanups for a month.</p>
              </div>
            </header>

            <div class="off-card off-report-card">
              <div class="off-filters">
                <label>Month
                  <select id="report-month" class="form-control">${this.monthOptionsHtml()}</select>
                </label>
              </div>
              <button class="btn btn-primary mt-3" id="generate-pdf-btn">
                <i data-lucide="download"></i> Download PDF
              </button>
            </div>
          </section>

        </main>
      </div>
    `;
  },

  async mount() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    if (user.role === 'admin') {
      const adminLink = document.getElementById('sidebar-admin-link');
      if (adminLink) adminLink.style.display = '';
    }

    this.currentSubSection = 'overview';
    this.selectedIssueId = null;
    await this.loadData();
    this.setupListeners();
    this.renderOverview();
  },

  async loadData() {
    this.issues = await DB.getAll('issues');
    this.predictions = await DB.getAll('hotspot_predictions');
  },

  setupListeners() {
    const navLinks = document.querySelectorAll('.off-nav-link[data-sub]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSection(link.getAttribute('data-sub'));
      });
    });

    document.getElementById('dashboard-logout-btn').addEventListener('click', () => {
      Auth.logout();
      App.addNotification('Signed out', 'You have signed out of the officer dashboard.', 'info');
      Router.navigate('#/login');
    });

    // Global listeners are bound once (the page can be mounted many times)
    if (this.listenersBound) return;
    this.listenersBound = true;

    window.addEventListener('db-update', async () => {
      if (!document.getElementById('m-total')) return; // dashboard not on screen
      await this.loadData();
      if (this.currentSubSection === 'overview') this.renderOverview();
      if (this.currentSubSection === 'issues') this.renderIssuesLog();
    });

    window.addEventListener('google-maps-failed', () => {
      if (!document.getElementById('prediction-google-map')) return;
      this.predictionMap = null;
      if (this.currentSubSection === 'predictions') this.renderPredictionsMap();
    });
  },

  showSection(sub) {
    document.querySelectorAll('.off-nav-link[data-sub]').forEach(l => {
      l.classList.toggle('active', l.getAttribute('data-sub') === sub);
    });
    document.querySelectorAll('.dashboard-panel').forEach(p => { p.style.display = 'none'; });
    const panel = document.getElementById(`panel-${sub}`);
    if (panel) panel.style.display = 'block';

    this.currentSubSection = sub;
    window.scrollTo({ top: 0 });

    if (sub === 'overview') this.renderOverview();
    if (sub === 'issues') this.renderIssuesLog();
    if (sub === 'predictions') this.initPredictionsTab();
    if (sub === 'reports') this.initReportsTab();
  },

  // ---------- OVERVIEW ----------
  renderOverview() {
    const all = this.issues;
    const open = all.filter(i => i.status === 'open');
    const progress = all.filter(i => i.status === 'in_progress');
    const resolved = all.filter(i => i.status === 'resolved');

    document.getElementById('m-total').innerText = all.length;
    document.getElementById('m-open').innerText = open.length;
    document.getElementById('m-progress').innerText = progress.length;
    document.getElementById('m-resolved').innerText = resolved.length;

    const waiting = all
      .filter(i => i.status === 'open' || i.status === 'in_progress')
      .sort((a, b) => Green.daysOpen(b) - Green.daysOpen(a))
      .slice(0, 5);

    const list = document.getElementById('urgent-issues-rows');
    if (list) {
      list.innerHTML = waiting.length === 0
        ? '<li class="text-muted">Nothing waiting. Good job!</li>'
        : waiting.map(i => `
          <li class="${Green.isOverdue(i) ? 'is-overdue' : ''}">
            <div class="off-attention-text">
              <strong>${i.title}</strong>
              <span class="text-muted small">${this.shortOffice(i)} · ${Green.daysOpen(i)} days open${Green.isOverdue(i) ? ' · <b class="off-overdue-text">Overdue</b>' : ''}</span>
            </div>
            <button class="btn btn-outline btn-xs" onclick="DashboardPage.openSpecificIssue('${i.id}')">View</button>
          </li>`).join('');
    }

    this.initOverviewCharts(all);
  },

  initOverviewCharts(issuesList) {
    Object.keys(this.charts).forEach(key => {
      if (this.charts[key]) this.charts[key].destroy();
    });
    this.charts = {};

    const canvas = document.getElementById('category-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const categories = Object.keys(Green.CATEGORIES);
    const counts = categories.map(cat => issuesList.filter(i => i.category === cat).length);
    const primary = this.cssVar('--primary-color', '#1E7B34');
    const muted = this.cssVar('--text-muted', '#5F6F65');
    const border = this.cssVar('--border-color', '#E3EFE6');

    this.charts.category = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: categories.map(c => Green.label(c).split(' / ')[0]),
        datasets: [{
          label: 'Complaints',
          data: counts,
          backgroundColor: primary,
          hoverBackgroundColor: this.cssVar('--primary-hover', '#17652A'),
          borderRadius: 6,
          maxBarThickness: 22
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0, color: muted }, grid: { color: border } },
          y: { ticks: { color: muted }, grid: { display: false } }
        }
      }
    });
  },

  openSpecificIssue(issueId) {
    this.showSection('issues');
    this.openDetailsPane(issueId);
  },

  // ---------- COMPLAINTS LOG ----------
  renderIssuesLog() {
    const tableBody = document.getElementById('dash-issues-rows');
    if (!tableBody) return;

    const statusFilter = document.getElementById('dash-filter-status').value;
    const catFilter = document.getElementById('dash-filter-category').value;
    const wardFilter = document.getElementById('dash-filter-ward').value;

    let filtered = [...this.issues];
    if (statusFilter !== 'all') filtered = filtered.filter(i => i.status === statusFilter);
    if (catFilter !== 'all') filtered = filtered.filter(i => i.category === catFilter);
    if (wardFilter !== 'all') filtered = filtered.filter(i => i.ward === wardFilter);

    // Overdue first, then newest
    filtered.sort((a, b) => (Green.isOverdue(b) - Green.isOverdue(a)) || (new Date(b.created_at) - new Date(a.created_at)));

    tableBody.innerHTML = filtered.length === 0
      ? '<tr><td colspan="6" class="off-empty">No complaints match these filters.</td></tr>'
      : filtered.map(i => `
        <tr onclick="DashboardPage.openDetailsPane('${i.id}')" class="off-row ${this.selectedIssueId === i.id ? 'is-active' : ''} ${Green.isOverdue(i) ? 'is-overdue' : ''}">
          <td class="off-c-ticket">${i.complaint ? `<span class="ticket-chip">${i.complaint.ticket_id}</span>` : '<span class="text-muted">—</span>'}</td>
          <td class="off-cell-title"><strong>${i.title}</strong><span class="text-muted small">${Green.label(i.category)}</span></td>
          <td class="off-c-office" data-label="Office">${this.shortOffice(i)}</td>
          <td class="off-c-days" data-label="Days open">${Green.daysOpen(i)}${Green.isOverdue(i) ? ' <span class="off-overdue-tag">Overdue</span>' : ''}</td>
          <td class="off-c-rem" data-label="Reminders">${i.complaint ? (i.complaint.reminder_count || 0) : '—'}</td>
          <td class="off-c-status"><span class="status-pill status-${i.status}">${Green.statusLabel(i.status)}</span></td>
        </tr>`).join('');

    ['dash-filter-status', 'dash-filter-category', 'dash-filter-ward'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.dataset.hasListener) {
        el.dataset.hasListener = 'true';
        el.addEventListener('change', () => this.renderIssuesLog());
      }
    });
  },

  async openDetailsPane(issueId) {
    this.selectedIssueId = issueId;
    this.afterFixPhoto = null;
    this.renderIssuesLog();

    const pane = document.getElementById('dash-details-pane');
    const body = document.getElementById('dash-pane-body');
    if (!pane || !body) return;

    const issue = await DB.get('issues', issueId);
    if (!issue) return;

    pane.style.display = 'block';
    const photo = (issue.media_urls && issue.media_urls[0]) || issue.before_photo_url || '';
    const c = issue.complaint;

    body.innerHTML = `
      ${photo ? `<img src="${photo}" class="off-detail-photo" alt="Reported dump">` : ''}

      <div class="off-detail-meta">
        <span class="status-pill status-${issue.status}">${Green.statusLabel(issue.status)}</span>
        ${c ? `<span class="ticket-chip">${c.ticket_id}</span>` : ''}
        ${Green.isOverdue(issue) ? '<span class="off-overdue-tag">Overdue</span>' : ''}
      </div>

      <h4 class="off-detail-title">${issue.title}</h4>
      <p class="text-muted small">${issue.address || ''}</p>
      ${issue.description ? `<p class="off-detail-desc">${issue.description}</p>` : ''}

      ${c ? `
      <dl class="off-facts">
        <div><dt>Office</dt><dd>${c.office_name || '—'}</dd></div>
        <div><dt>Sent by</dt><dd>${c.email_status === 'sent' ? 'Email' : 'In-app'}</dd></div>
        <div><dt>Days open</dt><dd>${Green.daysOpen(issue)}</dd></div>
        <div><dt>Reminders</dt><dd>${c.reminder_count || 0}</dd></div>
      </dl>` : ''}

      <form id="dash-action-form" class="off-form">
        <label>Status
          <select id="dash-status-select" class="form-control">
            <option value="open" ${issue.status === 'open' ? 'selected' : ''}>Open</option>
            <option value="in_progress" ${issue.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="resolved" ${issue.status === 'resolved' ? 'selected' : ''}>Closed</option>
            ${issue.status === 'rejected' ? '<option value="rejected" selected>Rejected</option>' : ''}
          </select>
        </label>

        <label>Note for the citizen (optional)
          <textarea id="dash-official-note" class="form-control" rows="2" placeholder="e.g. Crew sent, cleanup tomorrow morning"></textarea>
        </label>

        <div id="resolve-upload-gated" class="off-upload" style="display:${issue.status === 'resolved' ? 'block' : 'none'};">
          <strong>Cleanup photo</strong>
          <p class="text-muted small">Needed to close. We compare it with the original photo to check the spot is clean.</p>
          <label class="btn btn-outline btn-sm off-file-btn">
            <i data-lucide="camera"></i> ${issue.after_photo_url ? 'Replace photo' : 'Add cleanup photo'}
            <input type="file" id="after-fix-input" accept="image/*" hidden>
          </label>
          <div id="after-preview-holder" class="off-after-preview">
            ${issue.after_photo_url ? `<img src="${issue.after_photo_url}" alt="Cleanup photo">` : ''}
          </div>
        </div>

        <div id="ai-verifying-loader" class="off-checking" style="display:none;">
          <span class="spinner-sm"></span> Checking cleanup photo…
        </div>
        <div id="photo-check-prompt" class="off-prompt" style="display:none;"></div>

        <button type="submit" class="btn btn-primary btn-block" id="dash-save-btn">Save changes</button>
      </form>
    `;

    if (window.lucide) window.lucide.createIcons();

    if (window.matchMedia('(max-width: 1024px)').matches) {
      pane.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const statusSelect = document.getElementById('dash-status-select');
    const uploadBox = document.getElementById('resolve-upload-gated');
    const afterFixInput = document.getElementById('after-fix-input');
    const previewHolder = document.getElementById('after-preview-holder');
    const saveBtn = document.getElementById('dash-save-btn');

    statusSelect.addEventListener('change', (e) => {
      uploadBox.style.display = e.target.value === 'resolved' ? 'block' : 'none';
    });

    afterFixInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.afterFixPhoto = ev.target.result;
        previewHolder.innerHTML = `<img src="${this.afterFixPhoto}" alt="Cleanup photo">`;
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('dash-action-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = statusSelect.value;
      const note = document.getElementById('dash-official-note').value.trim();
      const officer = Auth.getCurrentUser();

      if (status === 'resolved' && !this.afterFixPhoto && !issue.after_photo_url) {
        App.showToast('Cleanup photo needed', 'Add a photo of the cleaned spot before closing.', 'warning');
        return;
      }

      saveBtn.disabled = true;
      let aiValidated = false;
      let aiConfidence = null;

      if (status === 'resolved' && this.afterFixPhoto) {
        const loader = document.getElementById('ai-verifying-loader');
        loader.style.display = 'flex';

        try {
          const res = await AI.validateResolution(issue.before_photo_url, this.afterFixPhoto);
          loader.style.display = 'none';

          aiValidated = res.is_resolved;
          aiConfidence = res.confidence;

          await DB.put('issue_timeline', {
            id: `t_ai_val_${issue.id}_${Date.now()}`,
            issue_id: issue.id,
            actor_id: officer.id,
            actor_role: 'system_ai',
            action: 'ai_validated',
            note: `Cleanup photo check: ${res.reason} (${(res.confidence * 100).toFixed(0)}% sure).`,
            created_at: new Date().toISOString()
          });

          if (!res.is_resolved || res.confidence < 0.7) {
            const proceed = await this.askCloseAnyway(
              `The cleanup photo check is not sure the spot is clean (${(res.confidence * 100).toFixed(0)}% sure). ${res.reason || ''}`
            );
            if (!proceed) {
              saveBtn.disabled = false;
              return;
            }
          }
        } catch (err) {
          console.error(err);
          loader.style.display = 'none';
          aiValidated = true; // check unavailable: officer's photo is accepted
        }
      }

      issue.status = status;
      issue.assigned_to = issue.assigned_to || officer.id;
      issue.updated_at = new Date().toISOString();
      if (status === 'resolved') {
        issue.resolved_at = issue.resolved_at || new Date().toISOString();
        if (this.afterFixPhoto) {
          issue.after_photo_url = this.afterFixPhoto;
          issue.ai_resolution_validated = aiValidated;
          issue.ai_resolution_confidence = aiConfidence;
        }
      } else {
        issue.resolved_at = null;
        issue.after_photo_url = null;
      }

      await DB.put('issues', issue);

      await DB.put('issue_timeline', {
        id: `t_change_${issue.id}_${Date.now()}`,
        issue_id: issue.id,
        actor_id: officer.id,
        actor_role: officer.role,
        action: status === 'resolved' ? 'resolved' : 'status_changed',
        note: note || `Status changed to ${Green.statusLabel(status)} by the city corporation.`,
        created_at: new Date().toISOString()
      });

      if (status === 'resolved') {
        const reporterUser = await DB.get('users', issue.reporter_id);
        if (reporterUser) {
          reporterUser.points = (reporterUser.points || 0) + 100;

          const allIssues = await DB.getAll('issues');
          const resolvedCount = allIssues.filter(i => i.reporter_id === reporterUser.id && i.status === 'resolved').length;
          const myBadges = (await DB.getAll('badges')).filter(b => b.user_id === reporterUser.id);

          if (resolvedCount >= 3 && !myBadges.some(b => b.badge_type === 'verified_voice')) {
            await DB.put('badges', {
              id: 'badge_' + Date.now(),
              user_id: reporterUser.id,
              badge_type: 'verified_voice',
              awarded_at: new Date().toISOString()
            });
            App.addNotification('Badge awarded', `${reporterUser.name} earned the "Verified Voice" badge.`, 'success');
          }

          await DB.put('users', reporterUser);
          if (officer.id === reporterUser.id) await Auth.refreshUser();

          App.addNotification(
            'Complaint closed',
            `"${issue.title.substring(0, 30)}" has been cleaned up and closed. (+100 points)`,
            'success',
            issue.id
          );
        }
      }

      App.showToast('Saved', `Complaint marked ${Green.statusLabel(status)}.`, 'success');
      this.afterFixPhoto = null;
      this.closeDetailsPane();

      await this.loadData();
      this.renderIssuesLog();
      window.dispatchEvent(new CustomEvent('db-update'));
    });
  },

  // Non-blocking in-page confirm shown inside the details form
  askCloseAnyway(message) {
    return new Promise(resolve => {
      const box = document.getElementById('photo-check-prompt');
      if (!box) return resolve(false);
      box.innerHTML = `
        <p>${message}</p>
        <div class="off-prompt-actions">
          <button type="button" class="btn btn-primary btn-sm" data-act="yes">Close anyway</button>
          <button type="button" class="btn btn-outline btn-sm" data-act="no">Cancel</button>
        </div>`;
      box.style.display = 'block';
      box.onclick = (e) => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        box.style.display = 'none';
        box.innerHTML = '';
        box.onclick = null;
        resolve(btn.dataset.act === 'yes');
      };
    });
  },

  closeDetailsPane() {
    this.selectedIssueId = null;
    const pane = document.getElementById('dash-details-pane');
    if (pane) pane.style.display = 'none';
    this.renderIssuesLog();
  },

  // ---------- PREDICTED HOTSPOTS ----------
  initPredictionsTab() {
    this.renderPredictionsTable();
    setTimeout(() => this.renderPredictionsMap(), 100);

    const analysisBtn = document.getElementById('run-analysis-btn');
    if (analysisBtn && !analysisBtn.dataset.hasListener) {
      analysisBtn.dataset.hasListener = 'true';
      analysisBtn.addEventListener('click', () => this.runWeeklyAI());
    }
  },

  renderPredictionsTable() {
    const tableBody = document.getElementById('predictions-table-rows');
    if (!tableBody) return;

    if (this.predictions.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="off-empty">No hotspots yet. Click "Run hotspot analysis".</td></tr>';
      return;
    }

    const sorted = [...this.predictions].sort((a, b) => b.risk_score - a.risk_score);
    tableBody.innerHTML = sorted.map((p, idx) => `
      <tr>
        <td><strong>Area ${idx + 1}</strong></td>
        <td>${Green.label(p.predicted_category)}</td>
        <td><span class="off-risk ${p.risk_score >= 70 ? 'is-high' : ''}">${p.risk_score}%</span></td>
        <td>${p.historical_count}</td>
        <td>${new Date(p.expires_at).toLocaleDateString()}</td>
      </tr>`).join('');
  },

  hotspotPopup(pred) {
    return `
      <div class="off-map-popup">
        <strong>${Green.label(pred.predicted_category)}</strong>
        <div>Risk: ${pred.risk_score}%</div>
        <div>Past reports: ${pred.historical_count}</div>
      </div>`;
  },

  renderPredictionsMap() {
    const container = document.getElementById('prediction-google-map');
    if (!container) return;
    const zoneColor = '#F97316';

    if (MapHelper.isGoogleMapsAvailable()) {
      container.innerHTML = '';
      this.predictionMap = new google.maps.Map(container, {
        center: { lat: 12.97, lng: 77.62 },
        zoom: 11,
        disableDefaultUI: true,
        zoomControl: true
      });
      this.predictionPolygons = [];

      this.predictions.forEach(pred => {
        const coords = pred.zone_polygon.coordinates[0].map(coord => ({ lat: coord[1], lng: coord[0] }));
        const polygon = new google.maps.Polygon({
          paths: coords,
          strokeColor: zoneColor,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: zoneColor,
          fillOpacity: 0.25,
          map: this.predictionMap
        });
        const infoWindow = new google.maps.InfoWindow({ content: this.hotspotPopup(pred), position: coords[0] });
        polygon.addListener('click', () => infoWindow.open(this.predictionMap));
        this.predictionPolygons.push(polygon);
      });
    } else {
      if (this.predictionMap && typeof this.predictionMap.remove === 'function') {
        try { this.predictionMap.remove(); } catch (e) {}
      }
      container.innerHTML = '';

      this.predictionMap = L.map(container, { zoomControl: true, attributionControl: false }).setView([12.97, 77.62], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this.predictionMap);
      this.predictionPolygons = [];

      this.predictions.forEach(pred => {
        const coords = pred.zone_polygon.coordinates[0].map(coord => [coord[1], coord[0]]);
        const polygon = L.polygon(coords, {
          color: zoneColor,
          weight: 2,
          opacity: 0.8,
          fillColor: zoneColor,
          fillOpacity: 0.25
        }).addTo(this.predictionMap);
        polygon.bindPopup(this.hotspotPopup(pred));
        this.predictionPolygons.push(polygon);
      });

      setTimeout(() => {
        if (this.predictionMap && this.predictionMap.invalidateSize) this.predictionMap.invalidateSize();
        this.fitToZones();
      }, 150);
    }
    if (MapHelper.isGoogleMapsAvailable()) this.fitToZones();
  },

  // Zoom the hotspot map to the predicted zones
  fitToZones() {
    if (!window.fitMapToIssues || !this.predictionMap) return;
    const pts = this.predictions.flatMap(p => ((p.zone_polygon && p.zone_polygon.coordinates[0]) || []).map(c => ({ lat: c[1], lng: c[0] })));
    window.fitMapToIssues(this.predictionMap, pts, 14);
  },

  async runWeeklyAI() {
    const btn = document.getElementById('run-analysis-btn');
    if (btn) btn.disabled = true;
    App.showToast('Running analysis', 'Looking at the last 90 days of complaints…', 'info');

    try {
      const newPredictions = await AI.runWeeklyAnalysis(this.issues);
      await DB.clear('hotspot_predictions');

      for (let i = 0; i < newPredictions.length; i++) {
        const p = newPredictions[i];
        await DB.put('hotspot_predictions', {
          id: `pred_ai_${i + 1}_${Date.now()}`,
          zone_polygon: p.zone_polygon,
          predicted_category: p.predicted_category,
          risk_score: p.risk_score,
          historical_count: p.historical_count,
          prediction_date: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          generated_by_ai: true
        });
      }

      App.showToast('Analysis done', `${newPredictions.length} hotspots found.`, 'success');
      await this.loadData();
      this.renderPredictionsTable();
      this.renderPredictionsMap();
      window.dispatchEvent(new CustomEvent('db-update'));
    } catch (err) {
      console.error(err);
      App.showToast('Analysis failed', 'Could not run the hotspot analysis. Please try again.', 'danger');
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  // ---------- MONTHLY REPORT ----------
  initReportsTab() {
    const generateBtn = document.getElementById('generate-pdf-btn');
    if (generateBtn && !generateBtn.dataset.hasListener) {
      generateBtn.dataset.hasListener = 'true';
      generateBtn.addEventListener('click', () => this.generatePDF());
    }
  },

  async generatePDF() {
    if (typeof window.jspdf === 'undefined') {
      App.showToast('Download failed', 'The PDF library did not load. Check your connection.', 'danger');
      return;
    }

    const [year, month] = document.getElementById('report-month').value.split('-').map(Number);
    const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const inMonth = this.issues.filter(i => {
      const d = new Date(i.created_at);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    const closed = inMonth.filter(i => i.status === 'resolved');
    const open = inMonth.filter(i => i.status === 'open');
    const progress = inMonth.filter(i => i.status === 'in_progress');
    const kg = closed.reduce((s, i) => s + (Number(i.est_weight_kg) || 0), 0);
    const avgDays = closed.length ? closed.reduce((s, i) => s + Green.daysOpen(i), 0) / closed.length : 0;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 123, 52);
    doc.text('EcoSort - Bengaluru Monthly Report', 20, 25);
    doc.setDrawColor(30, 123, 52);
    doc.setLineWidth(1);
    doc.line(20, 30, 190, 30);

    doc.setFontSize(14);
    doc.setTextColor(31, 45, 36);
    doc.text(monthName, 20, 40);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Garbage-dump complaints, cleanups and response times for GBA city corporation offices.', 20, 48);

    doc.setFillColor(242, 248, 243);
    doc.rect(20, 58, 170, 52, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.text('Summary', 25, 68);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Complaints received: ${inMonth.length}`, 25, 76);
    doc.text(`Closed: ${closed.length}`, 25, 83);
    doc.text(`In progress: ${progress.length}`, 25, 90);
    doc.text(`Still open: ${open.length}`, 25, 97);
    doc.text(`Average days to close: ${avgDays.toFixed(1)}   |   Waste cleared: ${Math.round(kg)} kg`, 25, 104);

    doc.setFont('Helvetica', 'bold');
    doc.text('By department', 20, 124);
    doc.setFont('Helvetica', 'normal');
    Object.keys(Green.DEPARTMENTS).forEach((d, idx) => {
      const deptIssues = inMonth.filter(i => (i.department || Green.departmentFor(i.category)) === d);
      const deptClosed = deptIssues.filter(i => i.status === 'resolved').length;
      doc.text(`- ${Green.DEPARTMENTS[d]}: ${deptClosed} of ${deptIssues.length} closed`, 20, 133 + idx * 7);
    });

    doc.setFontSize(10);
    doc.text('Prepared for: GBA City Corporations - Solid Waste Management', 20, 200);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 20, 207);

    const reportId = `report_${month}_${year}`;
    const existing = await DB.get('monthly_reports', reportId);
    await DB.put('monthly_reports', {
      ...(existing || {}),
      id: reportId,
      month,
      year,
      city: 'Bengaluru',
      total_reported: inMonth.length,
      total_resolved: closed.length,
      avg_resolution_days: Number(avgDays.toFixed(1)),
      department_breakdown: Object.fromEntries(Object.keys(Green.DEPARTMENTS).map(d => {
        const deptIssues = inMonth.filter(i => (i.department || Green.departmentFor(i.category)) === d);
        return [d, { reported: deptIssues.length, resolved: deptIssues.filter(i => i.status === 'resolved').length }];
      })),
      category_breakdown: Object.fromEntries(Object.keys(Green.CATEGORIES).map(c => [c, inMonth.filter(i => i.category === c).length])),
      is_public: true,
      pdf_url: `report_${month}_${year}.pdf`,
      generated_at: new Date().toISOString()
    });

    doc.save(`EcoSort_Report_${year}_${String(month).padStart(2, '0')}.pdf`);
    App.showToast('Report downloaded', `${monthName} report saved as PDF.`, 'success');
  }
};

window.DashboardPage = DashboardPage;
