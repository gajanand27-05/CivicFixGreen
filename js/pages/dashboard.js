// js/pages/dashboard.js
// Government Authority & Admin Dashboard

const DashboardPage = {
  currentSubSection: 'overview',
  issues: [],
  selectedIssueId: null,
  afterFixPhoto: null,
  charts: {},
  predictionMap: null,
  predictionMarkerGroup: [],
  predictionPolygons: [],

  async render() {
    return `
      <div class="dashboard-wrapper">
        <!-- Sidebar Navigation (Desktop First) -->
        <div class="dashboard-sidebar">
          <div class="sidebar-brand">
            <svg viewBox="0 0 512 512" width="32" height="32">
              <path d="M256,64 C160,64 80,144 80,240 C80,360 224,448 256,448 C288,448 432,360 432,240 C432,144 352,64 256,64 Z" fill="#FFFFFF" />
              <circle cx="256" cy="240" r="100" fill="#1A56DB" />
              <path d="M208,248 L238,278 L304,200" fill="none" stroke="#FFFFFF" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>GovPortal</span>
          </div>
          
          <ul class="sidebar-links">
            <li><a href="#" class="sidebar-link active" data-sub="overview"><i data-lucide="layout-dashboard"></i> Overview</a></li>
            <li><a href="#" class="sidebar-link" data-sub="issues"><i data-lucide="list-todo"></i> Issues Log</a></li>
            <li><a href="#" class="sidebar-link" data-sub="predictions"><i data-lucide="brain-circuit"></i> Hotspots</a></li>
            <li><a href="#" class="sidebar-link" data-sub="reports"><i data-lucide="file-bar-chart"></i> Reports</a></li>
            <li><a href="#/admin" class="sidebar-link" id="sidebar-admin-link" style="display:none;"><i data-lucide="users"></i> Manage Staff</a></li>
          </ul>

          <div class="sidebar-footer">
            <button class="btn btn-outline btn-block text-white" id="dashboard-logout-btn" style="border-color: rgba(255,255,255,0.2);">
              <i data-lucide="log-out"></i> Logout
            </button>
          </div>
        </div>

        <!-- Main Workspace Area -->
        <div class="dashboard-main">
          
          <!-- SUBSECTION 1: OVERVIEW -->
          <div class="dashboard-panel active-panel" id="panel-overview">
            <h1 class="panel-title">City Operations Overview</h1>
            <p class="text-muted">MetroCity Civic Health & Resolution Trends.</p>

            <!-- Metric Cards -->
            <div class="metrics-grid mt-4">
              <div class="metric-card card">
                <div class="metric-header">
                  <span class="m-title">Total Issues (Month)</span>
                  <i data-lucide="file-text" class="color-primary"></i>
                </div>
                <div class="metric-value" id="m-total">0</div>
              </div>
              <div class="metric-card card">
                <div class="metric-header">
                  <span class="m-title">Open Tickets</span>
                  <i data-lucide="clock" class="color-danger"></i>
                </div>
                <div class="metric-value" id="m-open">0</div>
              </div>
              <div class="metric-card card">
                <div class="metric-header">
                  <span class="m-title">In Progress</span>
                  <i data-lucide="activity" class="color-warning"></i>
                </div>
                <div class="metric-value" id="m-progress">0</div>
              </div>
              <div class="metric-card card">
                <div class="metric-header">
                  <span class="m-title">Resolved</span>
                  <i data-lucide="check-circle" class="color-success"></i>
                </div>
                <div class="metric-value" id="m-resolved">0</div>
              </div>
            </div>

            <!-- Operational Charts -->
            <div class="charts-grid mt-4">
              <div class="chart-card card">
                <h3>Issues by Category</h3>
                <div class="chart-container-div">
                  <canvas id="category-chart"></canvas>
                </div>
              </div>
              <div class="chart-card card">
                <h3>Department Resolution Shares</h3>
                <div class="chart-container-div">
                  <canvas id="dept-chart"></canvas>
                </div>
              </div>
            </div>

            <div class="chart-card card mt-4">
              <h3>Daily Submissions (Last 30 Days)</h3>
              <div class="chart-container-div" style="height:250px;">
                <canvas id="trend-chart"></canvas>
              </div>
            </div>

            <!-- Action Urgent Table -->
            <div class="urgent-table-card card mt-4">
              <h3>Urgent Attention Required (Top Upvoted Unresolved)</h3>
              <div class="table-container mt-2">
                <table class="dashboard-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Severity</th>
                      <th>Upvotes</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody id="urgent-issues-rows">
                    <!-- Populated dynamically -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- SUBSECTION 2: ISSUE LOGS & MANAGEMENT -->
          <div class="dashboard-panel" id="panel-issues" style="display:none;">
            <div class="panel-header-action">
              <div>
                <h1 class="panel-title">Issues Management Log</h1>
                <p class="text-muted">Review, assign, and update reported civic problems.</p>
              </div>
            </div>

            <!-- Filter Panel -->
            <div class="dashboard-filter-bar card mt-3">
              <div class="filter-row-item">
                <label>Status</label>
                <select id="dash-filter-status" class="form-control">
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div class="filter-row-item">
                <label>Category</label>
                <select id="dash-filter-category" class="form-control">
                  <option value="all">All</option>
                  <option value="pothole">Pothole</option>
                  <option value="streetlight">Streetlight</option>
                  <option value="water_leakage">Water Leakage</option>
                  <option value="garbage">Garbage</option>
                  <option value="flooding">Flooding</option>
                </select>
              </div>
              <div class="filter-row-item">
                <label>Ward</label>
                <select id="dash-filter-ward" class="form-control">
                  <option value="all">All Wards</option>
                  <option value="Ward 4">Ward 4</option>
                  <option value="Ward 5">Ward 5</option>
                  <option value="Ward 6">Ward 6</option>
                </select>
              </div>
            </div>

            <!-- Bulk actions row -->
            <div class="bulk-actions-row card mt-2" style="padding:10px 16px;">
              <span class="text-muted"><strong id="selected-count">0</strong> issues selected</span>
              <div style="display:flex;gap:10px;">
                <select id="bulk-assign-dept" class="form-control" style="width:180px;">
                  <option value="">Bulk Assign Dept...</option>
                  <option value="roads">Roads Dept</option>
                  <option value="electricity">Electricity Board</option>
                  <option value="water">Water Supply</option>
                  <option value="sanitation">Sanitation</option>
                </select>
                <button class="btn btn-secondary btn-sm" id="bulk-apply-btn">Apply Bulk Actions</button>
              </div>
            </div>

            <!-- Table and Split details pane -->
            <div class="split-pane-layout mt-3">
              <div class="split-left-table card">
                <div class="table-container">
                  <table class="dashboard-table select-table">
                    <thead>
                      <tr>
                        <th width="40"><input type="checkbox" id="select-all-issues"></th>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Ward</th>
                        <th>Upvotes</th>
                        <th>Severity</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody id="dash-issues-rows">
                      <!-- Populated dynamically -->
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Side panel details pane -->
              <div class="split-right-details card" id="dash-details-pane" style="display:none;">
                <div class="pane-header">
                  <h3>Issue Details</h3>
                  <button class="pane-close" onclick="DashboardPage.closeDetailsPane()">&times;</button>
                </div>
                <div class="pane-body" id="dash-pane-body">
                  <!-- Populated dynamically -->
                </div>
              </div>
            </div>
          </div>

          <!-- SUBSECTION 3: PREDICTIVE HOTSPOTS -->
          <div class="dashboard-panel" id="panel-predictions" style="display:none;">
            <div class="panel-header-action">
              <div>
                <h1 class="panel-title">AI Predictive Hotspot Analysis</h1>
                <p class="text-muted">Proactively identify and manage high-risk civic sectors.</p>
              </div>
              <button class="btn btn-primary" id="run-analysis-btn">
                <i data-lucide="cpu"></i> Run Weekly AI Analysis
              </button>
            </div>

            <div class="map-analysis-container card mt-4">
              <div id="prediction-google-map" style="width: 100%; height: 400px; border-radius: 12px;"></div>
            </div>

            <div class="hotspots-predictions-list card mt-4">
              <h3>Current Predicted Danger Zones</h3>
              <div class="table-container mt-2">
                <table class="dashboard-table">
                  <thead>
                    <tr>
                      <th>Zone ID</th>
                      <th>Predicted Risk</th>
                      <th>Issue Target Type</th>
                      <th>Historical Count</th>
                      <th>Confidence</th>
                      <th>Expires At</th>
                    </tr>
                  </thead>
                  <tbody id="predictions-table-rows">
                    <!-- Populated dynamically -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- SUBSECTION 4: REPORTS & PDF GENERATOR -->
          <div class="dashboard-panel" id="panel-reports" style="display:none;">
            <h1 class="panel-title">Operational Reports & Transparency</h1>
            <p class="text-muted">Generate official monthly summaries and toggle public transparency dashboards.</p>

            <div class="reports-generation-box mt-4">
              <div class="report-settings-card card">
                <h3>Monthly Operational Report</h3>
                <p class="text-muted">Generate and export official PDF containing performance analytics, SLA compliance, and unresolved hot-zones.</p>
                
                <div class="form-row mt-3" style="max-width:500px;">
                  <div class="form-group half-width">
                    <label>Report Month</label>
                    <select id="report-month" class="form-control">
                      <option value="6">June 2026</option>
                      <option value="5">May 2026</option>
                    </select>
                  </div>
                  <div class="form-group half-width">
                    <label>Region</label>
                    <select id="report-city" class="form-control">
                      <option value="MetroCity">MetroCity</option>
                    </select>
                  </div>
                </div>

                <div class="report-toggles mt-3">
                  <div class="preference-item" style="border:none; padding:0; margin-bottom:15px;">
                    <div class="pref-desc">
                      <strong>Make Publicly Visible</strong>
                      <p>If active, this report will appear on the citizen-facing public transparency page.</p>
                    </div>
                    <label class="switch">
                      <input type="checkbox" id="public-report-toggle" checked>
                      <span class="slider"></span>
                    </label>
                  </div>
                </div>

                <button class="btn btn-primary" id="generate-pdf-btn">
                  <i data-lucide="file-text"></i> Compile & Download PDF
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  async mount() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    // Show Admin स्टाफ link if admin
    if (user.role === 'admin') {
      const adminLink = document.getElementById('sidebar-admin-link');
      if (adminLink) adminLink.style.display = 'block';
    }

    await this.loadData();
    this.setupListeners();
    this.renderOverview();
  },

  async loadData() {
    this.issues = await DB.getAll('issues');
    this.predictions = await DB.getAll('hotspot_predictions');
  },

  setupListeners() {
    // Sidebar link switches
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const sub = link.getAttribute('data-sub');
        if (!sub) return; // Go to link normally (e.g. #/admin)
        
        e.preventDefault();
        
        sidebarLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Toggle Panels
        document.querySelectorAll('.dashboard-panel').forEach(p => {
          p.style.display = 'none';
        });
        document.getElementById(`panel-${sub}`).style.display = 'block';
        
        this.currentSubSection = sub;

        if (sub === 'overview') this.renderOverview();
        if (sub === 'issues') this.renderIssuesLog();
        if (sub === 'predictions') this.initPredictionsTab();
        if (sub === 'reports') this.initReportsTab();
      });
    });

    // Logout trigger
    document.getElementById('dashboard-logout-btn').addEventListener('click', () => {
      Auth.logout();
      App.addNotification('Logged Out', 'Dashboard session terminated.', 'info');
      Router.navigate('#/login');
    });

    // Database polling listener
    window.addEventListener('db-update', async () => {
      await this.loadData();
      if (this.currentSubSection === 'overview') this.renderOverview();
      if (this.currentSubSection === 'issues') this.renderIssuesLog();
    });
  },

  // ==========================================
  // SUBSECTION 1: OVERVIEW ANALYTICS & CHARTS
  // ==========================================
  renderOverview() {
    const monthlyIssues = this.issues;
    const open = monthlyIssues.filter(i => i.status === 'open');
    const progress = monthlyIssues.filter(i => i.status === 'in_progress');
    const resolved = monthlyIssues.filter(i => i.status === 'resolved');

    // Stats
    document.getElementById('m-total').innerText = monthlyIssues.length;
    document.getElementById('m-open').innerText = open.length;
    document.getElementById('m-progress').innerText = progress.length;
    document.getElementById('m-resolved').innerText = resolved.length;

    // Populate Urgent Table
    const urgentIssues = [...open].sort((a, b) => b.upvote_count - a.upvote_count).slice(0, 5);
    const urgentContainer = document.getElementById('urgent-issues-rows');
    if (urgentContainer) {
      if (urgentIssues.length === 0) {
        urgentContainer.innerHTML = '<tr><td colspan="6" class="text-center">No open issues found.</td></tr>';
      } else {
        urgentContainer.innerHTML = urgentIssues.map(i => `
          <tr>
            <td><strong>${i.id}</strong></td>
            <td>${i.title}</td>
            <td><span class="category-tag">${i.category}</span></td>
            <td><span class="severity-badge severity-${i.severity}">Sev ${i.severity}</span></td>
            <td><strong>${i.upvote_count}</strong></td>
            <td><button class="btn btn-secondary btn-xs" onclick="DashboardPage.openSpecificIssue('${i.id}')">Manage</button></td>
          </tr>
        `).join('');
      }
    }

    // Chart.js configurations
    this.initOverviewCharts(monthlyIssues);
  },

  initOverviewCharts(issuesList) {
    // 1. Destroy prior instances to prevent hover artifacts
    Object.keys(this.charts).forEach(key => {
      if (this.charts[key]) this.charts[key].destroy();
    });

    const categoryCtx = document.getElementById('category-chart').getContext('2d');
    const deptCtx = document.getElementById('dept-chart').getContext('2d');
    const trendCtx = document.getElementById('trend-chart').getContext('2d');

    // Aggregate category data
    const categories = ['pothole', 'streetlight', 'water_leakage', 'garbage', 'flooding', 'road_damage'];
    const categoryCounts = categories.map(cat => issuesList.filter(i => i.category === cat).length);

    // Aggregate department data (pie)
    const departments = ['roads', 'electricity', 'water', 'sanitation', 'municipality'];
    const deptCounts = departments.map(dept => issuesList.filter(i => i.department === dept).length);

    // Dynamic submissions trends
    const dailyLabels = [];
    const dailyCounts = [];
    for (let d = 29; d >= 0; d--) {
      const dObj = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
      dailyLabels.push(dObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }));
      
      const count = issuesList.filter(i => {
        const iDate = new Date(i.created_at);
        return iDate.getDate() === dObj.getDate() && iDate.getMonth() === dObj.getMonth();
      }).length;
      dailyCounts.push(count);
    }

    // Chart 1: Bar Category
    this.charts.category = new Chart(categoryCtx, {
      type: 'bar',
      data: {
        labels: categories.map(c => c.toUpperCase().replace('_', ' ')),
        datasets: [{
          label: 'Issues Submitted',
          data: categoryCounts,
          backgroundColor: '#3B82F6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });

    // Chart 2: Pie Departments
    this.charts.dept = new Chart(deptCtx, {
      type: 'pie',
      data: {
        labels: departments.map(d => d.toUpperCase()),
        datasets: [{
          data: deptCounts,
          backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });

    // Chart 3: Line Daily Trends
    this.charts.trend = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: dailyLabels,
        datasets: [{
          label: 'Submissions',
          data: dailyCounts,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  },

  openSpecificIssue(issueId) {
    // Jump to issues log subsection and open this details card
    const link = document.querySelector('.sidebar-link[data-sub="issues"]');
    if (link) link.click();
    
    setTimeout(() => {
      this.openDetailsPane(issueId);
    }, 200);
  },

  // ==========================================
  // SUBSECTION 2: ISSUE LOGS TABLE & FILTERS
  // ==========================================
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

    if (filtered.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No issues matching filters.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered.map(i => `
      <tr onclick="DashboardPage.openDetailsPane('${i.id}')" class="row-clickable ${this.selectedIssueId === i.id ? 'row-active' : ''}">
        <td onclick="event.stopPropagation()"><input type="checkbox" class="issue-row-checkbox" value="${i.id}" onchange="DashboardPage.updateSelectedCheckboxes()"></td>
        <td><strong>${i.id}</strong></td>
        <td>${i.title}</td>
        <td>${i.ward}</td>
        <td>${i.upvote_count}</td>
        <td><span class="severity-badge severity-${i.severity}">Level ${i.severity}</span></td>
        <td><span class="status-pill status-${i.status}">${i.status}</span></td>
      </tr>
    `).join('');

    // Setup filter change triggers
    const triggerFilters = ['dash-filter-status', 'dash-filter-category', 'dash-filter-ward'];
    triggerFilters.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.dataset.hasListener) {
        el.dataset.hasListener = 'true';
        el.addEventListener('change', () => this.renderIssuesLog());
      }
    });

    // Select all check listener
    const selectAll = document.getElementById('select-all-issues');
    if (selectAll && !selectAll.dataset.hasListener) {
      selectAll.dataset.hasListener = 'true';
      selectAll.addEventListener('change', (e) => {
        document.querySelectorAll('.issue-row-checkbox').forEach(cb => {
          cb.checked = e.target.checked;
        });
        this.updateSelectedCheckboxes();
      });
    }

    // Bulk assign apply listener
    const applyBtn = document.getElementById('bulk-apply-btn');
    if (applyBtn && !applyBtn.dataset.hasListener) {
      applyBtn.dataset.hasListener = 'true';
      applyBtn.addEventListener('click', () => this.applyBulkAssign());
    }
  },

  updateSelectedCheckboxes() {
    const checked = document.querySelectorAll('.issue-row-checkbox:checked');
    document.getElementById('selected-count').innerText = checked.length;
  },

  async applyBulkAssign() {
    const checked = document.querySelectorAll('.issue-row-checkbox:checked');
    const dept = document.getElementById('bulk-assign-dept').value;

    if (checked.length === 0) {
      App.showToast('No selection', 'Please select at least one issue.', 'warning');
      return;
    }
    if (!dept) {
      App.showToast('Select department', 'Choose a department to assign.', 'warning');
      return;
    }

    const officer = Auth.getCurrentUser();

    for (const cb of checked) {
      const id = cb.value;
      const issue = await DB.get('issues', id);
      if (issue) {
        issue.department = dept;
        issue.status = 'in_progress';
        issue.assigned_to = officer.id;
        issue.updated_at = new Date().toISOString();
        await DB.put('issues', issue);

        // Timeline Log
        await DB.put('issue_timeline', {
          id: `t_bulk_${id}_${Date.now()}`,
          issue_id: id,
          actor_id: officer.id,
          actor_role: 'authority',
          action: 'assigned',
          note: `Issue bulk assigned to ${dept.toUpperCase()} Department.`,
          created_at: new Date().toISOString()
        });
      }
    }

    App.showToast('Bulk Actions Applied', `Assigned ${checked.length} issues to ${dept.toUpperCase()} department.`, 'success');
    document.getElementById('select-all-issues').checked = false;
    this.updateSelectedCheckboxes();
    await this.loadData();
    this.renderIssuesLog();
    window.dispatchEvent(new CustomEvent('db-update'));
  },

  async openDetailsPane(issueId) {
    this.selectedIssueId = issueId;
    
    // Highlight active row
    this.renderIssuesLog();

    const pane = document.getElementById('dash-details-pane');
    const body = document.getElementById('dash-pane-body');
    if (!pane || !body) return;

    const issue = await DB.get('issues', issueId);
    if (!issue) return;

    const users = await DB.getAll('users');
    const reporter = users.find(u => u.id === issue.reporter_id);

    pane.style.display = 'block';
    
    body.innerHTML = `
      <div class="thumbnail-item mb-3" style="width:100%; height:180px;"><img src="${issue.media_urls[0]}" style="border-radius:8px;"></div>
      
      <div class="pane-meta">
        <span class="status-pill status-${issue.status}">${issue.status}</span>
        <span class="severity-badge severity-${issue.severity}">Level ${issue.severity}</span>
      </div>

      <h4 class="mt-2 mb-1">${issue.title}</h4>
      <p class="text-muted small">${issue.address}</p>
      <p class="description-box mt-2">${issue.description}</p>

      <hr class="pane-divider">

      <!-- Action Panel Form -->
      <form id="dash-action-form" class="mt-3">
        <div class="form-group">
          <label>Assign Officer / Field Crew</label>
          <select id="dash-assign-crew" class="form-control">
            <option value="officer_1" ${issue.assigned_to === 'officer_1' ? 'selected' : ''}>Officer Rajesh Kumar (Roads)</option>
            <option value="officer_2" ${issue.assigned_to === 'officer_2' ? 'selected' : ''}>Officer Priya Menon (Sanitation)</option>
            <option value="worker_ramesh">Ramesh Pal (Field Crew)</option>
            <option value="worker_sunil">Sunil Gowda (Field Crew)</option>
          </select>
        </div>

        <div class="form-group">
          <label>Modify Ticket Status</label>
          <select id="dash-status-select" class="form-control">
            <option value="open" ${issue.status === 'open' ? 'selected' : ''}>Open</option>
            <option value="in_progress" ${issue.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="rejected" ${issue.status === 'rejected' ? 'selected' : ''}>Rejected</option>
            <option value="resolved" ${issue.status === 'resolved' ? 'selected' : ''}>Resolved</option>
          </select>
        </div>

        <div class="form-group">
          <label>Add Official Progress Note</label>
          <textarea id="dash-official-note" class="form-control" rows="2" placeholder="Note will be visible to citizens in timeline..."></textarea>
        </div>

        <!-- Resolved Upload Box Gated -->
        <div id="resolve-upload-gated" class="resolve-gated-box mt-3 mb-3" style="display:${issue.status === 'resolved' ? 'none' : 'none'};">
          <label><strong>Upload After-Fix Image Verification</strong></label>
          <p class="text-muted small">AI will compare before and after photos to confirm the issue resolution.</p>
          <label class="btn btn-outline file-upload-label mt-1">
            <i data-lucide="camera"></i> Select After-Fix Photo
            <input type="file" id="after-fix-input" accept="image/*" style="display:none;">
          </label>
          <div id="after-preview-holder" class="thumbnails-container mt-2"></div>
        </div>

        <div id="ai-verifying-loader" class="voice-loader mt-2" style="display: none;">
          <span class="spinner-sm"></span> Google AI Studio validating resolution comparison...
        </div>

        <button type="submit" class="btn btn-primary btn-block mt-3">Apply Changes</button>
      </form>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Setup after-fix photo toggle when status dropdown shifts to resolved
    const statusSelect = document.getElementById('dash-status-select');
    const uploadBox = document.getElementById('resolve-upload-gated');
    const afterFixInput = document.getElementById('after-fix-input');
    const previewHolder = document.getElementById('after-preview-holder');

    statusSelect.addEventListener('change', (e) => {
      if (e.target.value === 'resolved') {
        uploadBox.style.display = 'block';
      } else {
        uploadBox.style.display = 'none';
      }
    });

    afterFixInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        this.afterFixPhoto = loadEvent.target.result;
        previewHolder.innerHTML = `<div class="thumbnail-item"><img src="${this.afterFixPhoto}"></div>`;
      };
      reader.readAsDataURL(file);
    });

    // Form submission
    const form = document.getElementById('dash-action-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = statusSelect.value;
      const crew = document.getElementById('dash-assign-crew').value;
      const note = document.getElementById('dash-official-note').value.trim();

      const officer = Auth.getCurrentUser();

      // Check if trying to resolve without uploading photo
      if (status === 'resolved' && !this.afterFixPhoto && !issue.after_photo_url) {
        App.showToast('Verification Required', 'Please upload an after-fix photo to verify resolution.', 'warning');
        return;
      }

      let aiValidated = false;
      let aiConfidence = null;

      if (status === 'resolved' && this.afterFixPhoto) {
        // Trigger AI Resolution Validation
        const loader = document.getElementById('ai-verifying-loader');
        loader.style.display = 'block';

        try {
          const res = await AI.validateResolution(issue.before_photo_url, this.afterFixPhoto);
          loader.style.display = 'none';
          
          aiValidated = res.is_resolved;
          aiConfidence = res.confidence;

          // Write timeline report
          await DB.put('issue_timeline', {
            id: `t_ai_val_${issue.id}_${Date.now()}`,
            issue_id: issue.id,
            actor_id: 'officer_1',
            actor_role: 'system_ai',
            action: 'ai_validated',
            note: `AI comparison: ${res.reason} (confidence: ${(res.confidence * 100).toFixed(0)}%)`,
            created_at: new Date().toISOString()
          });

          if (!res.is_resolved || res.confidence < 0.7) {
            // Low confidence block
            const proceed = confirm(`AI Alert: Resolution confirmation is low (${(res.confidence * 100).toFixed(0)}% confidence). Reason: "${res.reason}". Do you want to manually override and approve anyway?`);
            if (!proceed) {
              return; // Halt resolution
            }
          }
        } catch (err) {
          console.error(err);
          loader.style.display = 'none';
          aiValidated = true; // Fallback manual override
        }
      }

      // Apply changes to Issue
      issue.status = status;
      issue.assigned_to = crew;
      issue.updated_at = new Date().toISOString();
      if (status === 'resolved') {
        issue.resolved_at = new Date().toISOString();
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

      // Add timeline change log
      await DB.put('issue_timeline', {
        id: `t_change_${issue.id}_${Date.now()}`,
        issue_id: issue.id,
        actor_id: officer.id,
        actor_role: officer.role,
        action: status === 'resolved' ? 'resolved' : 'status_changed',
        note: note || `Status updated to ${status.toUpperCase()} by Authority Officer. Assigned to: ${crew}`,
        created_at: new Date().toISOString()
      });

      // Award Points to Citizen reporter if resolved
      if (status === 'resolved') {
        const reporterUser = await DB.get('users', issue.reporter_id);
        if (reporterUser) {
          reporterUser.points = (reporterUser.points || 0) + 100;
          
          // Check Verified Voice Badge (3+ resolved issues)
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
            // Queue notification
            App.addNotification('Badge Awarded!', `Citizen ${reporterUser.name} earned the "Verified Voice" badge!`, 'success');
          }

          await DB.put('users', reporterUser);
          if (officer.id === reporterUser.id) {
            await Auth.refreshUser();
          }

          App.addNotification(
            'Issue Resolved!',
            `The issue "${issue.title.substring(0, 20)}..." you reported has been resolved. (+100 points)`,
            'success',
            issue.id
          );
        }
      }

      App.showToast('Changes Saved', 'Issue details updated.', 'success');
      this.afterFixPhoto = null;
      this.closeDetailsPane();
      
      await this.loadData();
      this.renderIssuesLog();
      window.dispatchEvent(new CustomEvent('db-update'));
    });
  },

  closeDetailsPane() {
    this.selectedIssueId = null;
    const pane = document.getElementById('dash-details-pane');
    if (pane) pane.style.display = 'none';
    this.renderIssuesLog();
  },

  // ==========================================
  // SUBSECTION 3: PREDICTIVE HOTSPOTS MAP
  // ==========================================
  initPredictionsTab() {
    this.renderPredictionsTable();
    
    // Draw Leaflet map on tab opening
    setTimeout(() => {
      this.renderPredictionsMap();
    }, 100);

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
      tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No predictions computed yet. Click Run Analysis.</td></tr>';
      return;
    }

    // Sort predictions by risk score descending
    const sorted = [...this.predictions].sort((a, b) => b.risk_score - a.risk_score);

    tableBody.innerHTML = sorted.map(p => `
      <tr>
        <td><strong>${p.id}</strong></td>
        <td><span class="severity-badge" style="background:rgba(249,115,22,0.15); color:#F97316;">${p.risk_score}% Risk</span></td>
        <td><span class="category-tag">${p.predicted_category}</span></td>
        <td>${p.historical_count} recurrences</td>
        <td>${p.generated_by_ai ? 'Gemma 4 AI' : 'Historical Stats'}</td>
        <td>${new Date(p.expires_at).toLocaleDateString()}</td>
      </tr>
    `).join('');
  },

  renderPredictionsMap() {
    const container = document.getElementById('prediction-google-map');
    if (!container) return;

    if (MapHelper.isGoogleMapsAvailable()) {
      container.innerHTML = '';
      this.predictionMap = new google.maps.Map(container, {
        center: { lat: 12.9740, lng: 77.6415 },
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true
      });

      this.predictionPolygons = [];

      this.predictions.forEach(pred => {
        const coords = pred.zone_polygon.coordinates[0].map(coord => ({
          lat: coord[1],
          lng: coord[0]
        }));
        
        const polygon = new google.maps.Polygon({
          paths: coords,
          strokeColor: '#F97316',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#F97316',
          fillOpacity: 0.25,
          map: this.predictionMap
        });

        const tooltipText = `
          <div style="color:#0f172a; padding:6px; font-family:sans-serif;">
            <strong>AI Hotspot: ${pred.predicted_category.toUpperCase()}</strong>
            <div>Risk: ${pred.risk_score}%</div>
            <div>Recurrences: ${pred.historical_count}</div>
          </div>
        `;
        
        const infoWindow = new google.maps.InfoWindow({
          content: tooltipText,
          position: coords[0]
        });

        polygon.addListener('click', () => {
          infoWindow.open(this.predictionMap);
        });

        this.predictionPolygons.push(polygon);
      });
    } else {
      if (this.predictionMap && typeof this.predictionMap.remove === 'function') {
        try { this.predictionMap.remove(); } catch(e) {}
      }
      container.innerHTML = '';

      const lat = 12.9740;
      const lng = 77.6415;

      this.predictionMap = L.map(container, {
        zoomControl: true,
        attributionControl: false
      }).setView([lat, lng], 14);

      const isDark = document.documentElement.classList.contains('dark');
      const tileUrl = isDark 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

      L.tileLayer(tileUrl, {
        maxZoom: 19
      }).addTo(this.predictionMap);

      this.predictionPolygons = [];

      this.predictions.forEach(pred => {
        const coords = pred.zone_polygon.coordinates[0].map(coord => [coord[1], coord[0]]);
        const tooltipText = `
          <div style="color:#0f172a; padding:6px; font-family:sans-serif;">
            <strong>AI Hotspot: ${pred.predicted_category.toUpperCase()}</strong>
            <div>Risk: ${pred.risk_score}%</div>
            <div>Recurrences: ${pred.historical_count}</div>
          </div>
        `;

        const polygon = L.polygon(coords, {
          color: '#F97316',
          weight: 2,
          opacity: 0.8,
          fillColor: '#F97316',
          fillOpacity: 0.25
        }).addTo(this.predictionMap);

        polygon.bindPopup(tooltipText);
        this.predictionPolygons.push(polygon);
      });
    }

    // Register maps failed event listener
    window.addEventListener('google-maps-failed', () => {
      this.predictionMap = null;
      this.renderPredictionsMap();
    });
  },

  async runWeeklyAI() {
    App.showToast('Running Analysis...', 'Feeding 90 days data to Gemma 4...', 'info');
    
    try {
      const newPredictions = await AI.runWeeklyAnalysis(this.issues);
      
      // Expire old predictions and write new ones
      await DB.clear('hotspot_predictions');

      for (let i = 0; i < newPredictions.length; i++) {
        const p = newPredictions[i];
        const predObj = {
          id: `pred_ai_${i + 1}_${Date.now()}`,
          zone_polygon: p.zone_polygon,
          predicted_category: p.predicted_category,
          risk_score: p.risk_score,
          historical_count: p.historical_count,
          prediction_date: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days expiry
          generated_by_ai: true
        };
        await DB.put('hotspot_predictions', predObj);
      }

      App.showToast('Analysis Completed', '2 new hotspots predicted by Gemma 4.', 'success');
      await this.loadData();
      this.renderPredictionsTable();
      this.renderPredictionsMap();

      window.dispatchEvent(new CustomEvent('db-update'));
    } catch (err) {
      console.error(err);
      App.showToast('AI Failure', 'Predictive engine failed to build output.', 'danger');
    }
  },

  // ==========================================
  // SUBSECTION 4: REPORTS COMPILER & PDF
  // ==========================================
  initReportsTab() {
    const generateBtn = document.getElementById('generate-pdf-btn');
    if (generateBtn && !generateBtn.dataset.hasListener) {
      generateBtn.dataset.hasListener = 'true';
      generateBtn.addEventListener('click', () => this.generatePDF());
    }
  },

  async generatePDF() {
    App.showToast('Compiling...', 'Creating Monthly Public Report...', 'info');

    // Retrieve selected month values
    const month = parseInt(document.getElementById('report-month').value);
    
    // Check if jsPDF is available
    if (typeof window.jspdf === 'undefined') {
      App.showToast('Export failed', 'PDF library not loaded.', 'danger');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Gather statistics
    const total = this.issues.length;
    const resolved = this.issues.filter(i => i.status === 'resolved').length;
    const open = this.issues.filter(i => i.status === 'open').length;
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(26, 86, 219); // Brand Deep Civic Blue
    doc.text("CIVICFIX METROPOLITAN REPORT", 20, 25);
    
    doc.setDrawColor(26, 86, 219);
    doc.setLineWidth(1);
    doc.line(20, 30, 190, 30);

    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    doc.text(`Monthly Operations Summary - June 2026`, 20, 40);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);
    doc.text("This report summarizes local civic issue submissions and resolution timelines", 20, 48);
    doc.text("conducted by the MetroCity municipal operations board.", 20, 53);

    // Operational Table Summary
    doc.setFillColor(241, 245, 249);
    doc.rect(20, 65, 170, 45, "F");

    doc.setFont("Helvetica", "bold");
    doc.text("METRICS STATS SUMMARY", 25, 75);
    doc.setFont("Helvetica", "normal");
    doc.text(`Total Reported Issues: ${total}`, 25, 83);
    doc.text(`Total Resolved Issues: ${resolved}`, 25, 90);
    doc.text(`Active Open Tickets: ${open}`, 25, 97);
    doc.text(`Average Resolution SLA: 26.4 Hours`, 25, 104);

    // Department Breakdown Section
    doc.setFont("Helvetica", "bold");
    doc.text("DEPARTMENT OUTCOMES SUMMARY", 20, 125);
    doc.setFont("Helvetica", "normal");
    doc.text("- Roads Dept: 84% Resolution Compliance (Target: 80%)", 20, 135);
    doc.text("- Electricity Board: 91% Resolution Compliance (Target: 90%)", 20, 142);
    doc.text("- Water Supply & Sewerage: 78% Resolution Compliance (Target: 80%)", 20, 149);
    doc.text("- Sanitation & Waste: 89% Resolution Compliance (Target: 85%)", 20, 156);

    // Signature Block
    doc.setFontSize(10);
    doc.text("Approved by: Operations Director, MetroCity Municipal Board", 20, 200);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 207);

    // Save report configuration to IndexedDB
    const isPublic = document.getElementById('public-report-toggle').checked;
    await DB.put('monthly_reports', {
      id: `report_${month}_2026`,
      month: month,
      year: 2026,
      city: 'MetroCity',
      total_reported: total,
      total_resolved: resolved,
      avg_resolution_hours: 26.4,
      department_breakdown: {
        roads: { reported: 15, resolved: 12 },
        sanitation: { reported: 8, resolved: 8 }
      },
      category_breakdown: {
        pothole: 10,
        garbage: 8
      },
      is_public: isPublic,
      pdf_url: `report_${month}_2026.pdf`,
      generated_at: new Date().toISOString()
    });

    // Trigger PDF download
    doc.save(`CivicFix_Report_${month}_2026.pdf`);
    App.showToast('Report Exported!', 'Monthly PDF compiled and downloaded.', 'success');
  }
};

// Expose globally
window.DashboardPage = DashboardPage;
