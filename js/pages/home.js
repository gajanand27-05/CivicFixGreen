// js/pages/home.js
// Home feed and issue details

const homeEsc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const HomePage = {
  isPublic: true,
  issues: [],
  currentFilter: 'all',
  currentSort: 'recent',
  searchQuery: '',

  // Human-friendly titles for timeline entries
  LOG_TITLES: {
    reported: 'Dump reported',
    complaint_raised: 'Complaint raised',
    reminder_sent: 'Reminder sent',
    bbmp_replied: 'BBMP replied',
    cleanup_checked: 'Cleanup photo checked',
    ai_validated: 'Cleanup verified',
    photo_rejected: 'Cleanup photo not accepted',
    resolved: 'Closed',
    assigned: 'Assigned to an officer',
    status_changed: 'Status updated',
    email_failed: 'Email not delivered',
    commented: 'Comment'
  },

  ACTOR_NAMES: { system: 'EcoSort', authority: 'BBMP', officer: 'BBMP officer', admin: 'Admin', citizen: 'Citizen' },

  async render() {
    return `
      <div class="es-home">
        <section class="es-hero">
          <div class="es-hero-banner">
            <div class="es-hero-content">
              <span class="es-hero-eyebrow">Cleaner Bengaluru Together</span>
              <h1 class="es-hero-title">Spot Waste. Report. Track. Change.</h1>
              <p class="es-hero-text">Snap a photo and we'll raise a complaint with the nearest BBMP office, then follow up until the spot is clean.</p>
              <div class="es-hero-actions">
                <button class="btn btn-primary es-btn-lg" onclick="Router.navigate('#/report')">
                  <i data-lucide="camera"></i> Report a Garbage Dump
                </button>
                <button class="btn btn-outline es-btn-lg" onclick="Router.navigate('#/map')">
                  <i data-lucide="map"></i> View City Map
                </button>
              </div>
            </div>
          </div>
          <div class="es-stats">
            <div class="es-stat"><span class="es-stat-val" id="hero-stat-total">0</span><span class="es-stat-label">Dumps reported</span></div>
            <div class="es-stat"><span class="es-stat-val" id="hero-stat-resolved">0</span><span class="es-stat-label">Cleaned up</span></div>
            <div class="es-stat"><span class="es-stat-val" id="hero-stat-kg">0</span><span class="es-stat-label">kg cleared</span></div>
            <div class="es-stat"><span class="es-stat-val" id="hero-stat-overdue">0</span><span class="es-stat-label">Overdue</span></div>
          </div>
        </section>

        <section class="es-feed">
          <div class="es-feed-toolbar">
            <h2 class="es-feed-title">Recent reports</h2>
            <div class="es-feed-controls">
              <div class="es-search">
                <i data-lucide="search"></i>
                <input type="search" id="feed-search" placeholder="Search by place or title" aria-label="Search reports">
              </div>
              <select id="feed-sort" class="es-select" aria-label="Sort reports">
                <option value="recent">Newest</option>
                <option value="upvotes">Most upvoted</option>
                <option value="severity">Most severe</option>
              </select>
            </div>
          </div>

          <div class="es-pills" id="filter-pills">
            <button class="es-pill active" data-filter="all">All</button>
            <button class="es-pill" data-filter="open">Open</button>
            <button class="es-pill" data-filter="in_progress">In progress</button>
            <button class="es-pill" data-filter="resolved">Closed</button>
            <button class="es-pill" data-filter="near_me">Near me</button>
            <button class="es-pill" data-filter="my_reports">My reports</button>
          </div>

          <div class="es-feed-grid" id="issues-list-container"></div>
        </section>

        <div class="es-modal" id="issue-modal" style="display: none;" onclick="if (event.target === this) HomePage.closeIssueDetails()">
          <div class="es-modal-card" role="dialog" aria-modal="true"></div>
        </div>
      </div>
    `;
  },

  async mount() {
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.setupListeners();
    await this.loadIssues();
  },

  setupListeners() {
    document.getElementById('feed-search').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderList();
    });

    const pills = document.querySelectorAll('#filter-pills .es-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentFilter = pill.getAttribute('data-filter');
        this.renderList();
      });
    });

    const sortSelect = document.getElementById('feed-sort');
    sortSelect.value = this.currentSort;
    sortSelect.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.renderList();
    });

    // Register the db-update listener once (mount runs on every visit)
    if (!this._dbListener) {
      this._dbListener = async () => {
        if (!document.getElementById('issues-list-container')) return; // feed not on screen
        await this.loadIssues();
      };
      window.addEventListener('db-update', this._dbListener);
    }
  },

  renderHeroStats() {
    const closed = this.issues.filter(i => i.status === 'resolved');
    const kg = closed.reduce((sum, i) => sum + (Number(i.est_weight_kg) || 0), 0);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    set('hero-stat-total', this.issues.length);
    set('hero-stat-resolved', closed.length);
    set('hero-stat-kg', Math.round(kg).toLocaleString('en-IN'));
    set('hero-stat-overdue', this.issues.filter(i => Green.isOverdue(i)).length);
  },

  async loadIssues() {
    this.issues = await DB.getAll('issues');
    this.verifications = await DB.getAll('verifications');
    this.renderHeroStats();
    this.renderList();
  },

  renderList() {
    const container = document.getElementById('issues-list-container');
    if (!container) return;

    const user = Auth.getCurrentUser();
    let filtered = [...this.issues];

    if (['open', 'in_progress', 'resolved'].includes(this.currentFilter)) {
      filtered = filtered.filter(i => i.status === this.currentFilter);
    } else if (this.currentFilter === 'my_reports') {
      filtered = user ? filtered.filter(i => i.reporter_id === user.id) : [];
    } else if (this.currentFilter === 'near_me' && user && user.ward) {
      filtered = filtered.filter(i => i.ward === user.ward);
    }

    if (this.searchQuery) {
      const q = this.searchQuery;
      filtered = filtered.filter(i =>
        [i.title, i.description, Green.label(i.category), i.address, i.ward, i.complaint && i.complaint.ticket_id]
          .some(v => (v || '').toLowerCase().includes(q))
      );
    }

    if (this.currentSort === 'upvotes') {
      filtered.sort((a, b) => (b.upvote_count || 0) - (a.upvote_count || 0));
    } else if (this.currentSort === 'severity') {
      filtered.sort((a, b) => (b.severity || 0) - (a.severity || 0));
    } else {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="es-empty">
          <i data-lucide="leaf"></i>
          <h3>Nothing here yet</h3>
          <p>Try another filter, or report a dump you've seen.</p>
        </div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = filtered.map(issue => `
      <article class="es-card" onclick="HomePage.openIssueDetails('${issue.id}')" tabindex="0"
        onkeydown="if (event.key === 'Enter') HomePage.openIssueDetails('${issue.id}')">
        <div class="es-card-media">
          <img src="${(issue.media_urls && issue.media_urls[0]) || 'assets/icon.svg'}" loading="lazy" alt="">
          <span class="es-status es-status-${issue.status}">${Green.statusLabel(issue.status)}</span>
        </div>
        <div class="es-card-body">
          <div class="es-chips">
            <span class="es-chip"><i data-lucide="${Green.icon(issue.category)}"></i>${homeEsc(Green.label(issue.category))}</span>
            ${issue.complaint ? `<span class="es-chip es-chip-ticket">${homeEsc(issue.complaint.ticket_id)}</span>` : ''}
            ${Green.isOverdue(issue) ? '<span class="es-chip es-chip-warn">Overdue</span>' : ''}
          </div>
          <h3 class="es-card-title">${homeEsc(issue.title)}</h3>
          <div class="es-card-meta">
            <span class="es-card-place"><i data-lucide="map-pin"></i>${homeEsc(issue.ward || 'Bengaluru')}</span>
            <span>${App.formatTimeAgo(issue.created_at)}</span>
          </div>
        </div>
      </article>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  },

  async upvoteIssue(issueId, btnElement) {
    const user = Auth.getCurrentUser();
    if (!user) {
      App.showToast('Sign in required', 'Please sign in to upvote and earn +5 points.', 'info');
      Router.navigate('#/login');
      return;
    }

    const verifications = await DB.getAll('verifications');
    if (verifications.some(v => v.issue_id === issueId && v.user_id === user.id && v.type === 'upvote')) {
      App.showToast('Already upvoted', 'You can upvote a report only once.', 'warning');
      return;
    }

    const issue = await DB.get('issues', issueId);
    if (!issue) return;

    issue.upvote_count = (issue.upvote_count || 0) + 1;
    await DB.put('issues', issue);

    await DB.put('verifications', {
      id: 'v_up_' + Date.now(),
      issue_id: issueId,
      user_id: user.id,
      type: 'upvote',
      content: null,
      created_at: new Date().toISOString()
    });

    user.points = (user.points || 0) + 5;
    await DB.put('users', user);
    await Auth.refreshUser();

    await DB.put('issue_timeline', {
      id: 't_up_' + Date.now(),
      issue_id: issueId,
      actor_id: user.id,
      actor_role: user.role,
      action: 'commented',
      note: 'Upvoted the report. (+5 points awarded)',
      created_at: new Date().toISOString()
    });

    App.showToast('Upvoted!', 'You earned +5 points.', 'success');

    if (btnElement) {
      btnElement.classList.add('voted');
      const count = btnElement.querySelector('.count');
      if (count) count.innerText = issue.upvote_count;
    }

    await this.loadIssues();
    Router.updateNavigationLayout(window.location.hash, Auth.getCurrentUser());
  },

  logTitle(log) {
    if (log.action === 'commented') {
      if (/^Upvoted/i.test(log.note || '')) return 'Upvoted';
      if (/^Co-signed/i.test(log.note || '')) return 'Co-signed';
    }
    return this.LOG_TITLES[log.action] || String(log.action || 'Update').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  },

  logNote(note) {
    return String(note || '')
      .replace(/AI comparison/gi, 'Photo check')
      .replace(/\b(AI|Gemini|Gemma)\b[- ]?/g, '')
      .replace(/\s*\(\+\d+ points awarded\)/i, '');
  },

  async openIssueDetails(issueId) {
    const issue = await DB.get('issues', issueId);
    if (!issue) return;
    const modal = document.getElementById('issue-modal');
    if (!modal) return;

    const timeline = await DB.getAll('issue_timeline');
    const verifications = await DB.getAll('verifications');
    const users = await DB.getAll('users');

    const issueTimeline = timeline
      .filter(t => t.issue_id === issueId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const comments = verifications
      .filter(v => v.issue_id === issueId && v.type === 'comment')
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const reporter = users.find(u => u.id === issue.reporter_id);
    const currentUser = Auth.getCurrentUser();
    const isResolved = issue.status === 'resolved';
    const c = issue.complaint;
    const media = issue.media_urls || [];

    const photosHtml = (isResolved && issue.after_photo_url) ? `
      <div class="es-before-after">
        <figure><img src="${issue.before_photo_url || media[0] || ''}" alt="Before"><figcaption class="es-tag-before">Before</figcaption></figure>
        <figure><img src="${issue.after_photo_url}" alt="After cleanup"><figcaption class="es-tag-after">After</figcaption></figure>
      </div>` : `
      <div class="es-gallery">
        ${media.map(url => `<img src="${url}" alt="Photo of the dump">`).join('')}
      </div>`;

    const complaintHtml = c ? `
      <div class="es-complaint ${Green.isOverdue(issue) ? 'is-overdue' : ''}">
        <div class="es-complaint-head">
          <span class="es-chip es-chip-ticket">${homeEsc(c.ticket_id)}</span>
          <span class="es-muted">${c.email_status === 'sent' ? 'Emailed to' : 'Registered with'} <strong>${homeEsc(c.office_name)}</strong>${c.email_status === 'sent' ? '' : ' (tracked in app)'}</span>
        </div>
        <div class="es-complaint-stats">
          <div><strong>${Green.daysOpen(issue)}</strong><span>days open</span></div>
          <div><strong>${c.reminder_count || 0}</strong><span>reminders</span></div>
          <div><strong>${c.replies || 0}</strong><span>BBMP replies</span></div>
        </div>
        ${Green.isOverdue(issue) ? `<div class="es-overdue-note"><i data-lucide="alarm-clock"></i> Overdue: BBMP is being reminded every ${Green.REMINDER_DAYS} days.</div>` : ''}
      </div>` : '';

    const card = modal.querySelector('.es-modal-card');
    card.innerHTML = `
      <div class="es-modal-head">
        <div class="es-chips">
          <span class="es-status es-status-${issue.status} es-status-inline">${Green.statusLabel(issue.status)}</span>
          <span class="es-chip"><i data-lucide="${Green.icon(issue.category)}"></i>${homeEsc(Green.label(issue.category))}</span>
        </div>
        <button class="es-icon-btn" onclick="HomePage.closeIssueDetails()" aria-label="Close"><i data-lucide="x"></i></button>
      </div>

      <div class="es-modal-body">
        ${photosHtml}

        <div class="es-section">
          <h2 class="es-modal-title">${homeEsc(issue.title)}</h2>
          ${issue.description ? `<p class="es-modal-desc">${homeEsc(issue.description)}</p>` : ''}
          <p class="es-modal-address"><i data-lucide="map-pin"></i> ${homeEsc(issue.address || issue.ward || '')}</p>
          <div class="es-reporter">
            <img src="${reporter ? reporter.avatar_url : 'assets/icon.svg'}" alt="">
            <span>Reported by <strong>${homeEsc(reporter ? reporter.name : 'a citizen')}</strong> · ${App.formatTimeAgo(issue.created_at)}</span>
          </div>
        </div>

        ${complaintHtml}

        <div class="es-section">
          <div id="modal-map" class="es-mini-map"></div>
        </div>

        <div class="es-section">
          <h3 class="es-section-title">Progress</h3>
          <ol class="es-timeline">
            ${issueTimeline.length === 0 ? '<li class="es-muted">No updates yet.</li>' : issueTimeline.map(log => `
              <li class="es-log es-log-${homeEsc(log.action)}">
                <div class="es-log-title">${homeEsc(this.logTitle(log))}</div>
                ${this.logNote(log.note) ? `<div class="es-log-note">${homeEsc(this.logNote(log.note))}</div>` : ''}
                <div class="es-log-time">${new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · ${homeEsc(this.ACTOR_NAMES[log.actor_role] || 'Citizen')}</div>
              </li>`).join('')}
          </ol>
        </div>

        <div class="es-section">
          <h3 class="es-section-title">Comments</h3>
          <div class="es-comments" id="modal-comments-list">
            ${comments.length === 0 ? '<p class="es-muted">No comments yet.</p>' : comments.map(cm => {
              const commenter = users.find(u => u.id === cm.user_id);
              return `
                <div class="es-comment">
                  <img src="${commenter ? commenter.avatar_url : 'assets/icon.svg'}" alt="">
                  <div class="es-comment-bubble">
                    <div class="es-comment-meta"><strong>${homeEsc(commenter ? commenter.name : 'Citizen')}</strong><span>${App.formatTimeAgo(cm.created_at)}</span></div>
                    <div>${homeEsc(cm.content)}</div>
                  </div>
                </div>`;
            }).join('')}
          </div>
          ${currentUser ? `
            <form id="comment-form" class="es-comment-form">
              <textarea id="comment-textarea" class="form-control" placeholder="Add a comment (+10 points)" rows="2" maxlength="500" required></textarea>
              <button type="submit" class="btn btn-primary">Post</button>
            </form>
          ` : '<p class="es-muted"><a href="#/login">Log in</a> to comment.</p>'}
        </div>

        ${isResolved && currentUser && currentUser.id === issue.reporter_id ? `
          <div class="es-section es-reopen">
            <h3 class="es-section-title">Not cleaned properly?</h3>
            <p class="es-muted">Tell us what's wrong and we'll reopen the complaint.</p>
            <textarea id="unresolved-reason" class="form-control" placeholder="What still needs to be done?" rows="2" required></textarea>
            <button class="btn btn-danger mt-2" onclick="HomePage.markAsUnresolved('${issue.id}')">Reopen complaint</button>
          </div>
        ` : ''}
      </div>

      <div class="es-modal-foot">
        <button class="btn btn-outline" onclick="HomePage.shareIssue('${issue.id}')"><i data-lucide="share-2"></i> Share</button>
        <button class="btn btn-primary" onclick="HomePage.upvoteIssue('${issue.id}', this)"><i data-lucide="thumbs-up"></i> Upvote · <span class="count">${issue.upvote_count || 0}</span></button>
      </div>
    `;

    modal.style.display = 'flex';
    modal.classList.remove('is-closing');
    document.body.style.overflow = 'hidden';
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => this.initMiniMap(issue.lat, issue.lng, issue.status), 100);

    const commentForm = card.querySelector('#comment-form');
    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textarea = card.querySelector('#comment-textarea');
        const text = textarea.value.trim();
        if (!text) return;

        await DB.put('verifications', {
          id: 'v_comment_' + Date.now(),
          issue_id: issueId,
          user_id: currentUser.id,
          type: 'comment',
          content: text,
          created_at: new Date().toISOString()
        });

        await DB.put('issue_timeline', {
          id: 't_comment_' + Date.now(),
          issue_id: issueId,
          actor_id: currentUser.id,
          actor_role: currentUser.role,
          action: 'commented',
          note: `Commented: "${text.substring(0, 45)}${text.length > 45 ? '…' : ''}"`,
          created_at: new Date().toISOString()
        });

        currentUser.points = (currentUser.points || 0) + 10;
        await DB.put('users', currentUser);
        await Auth.refreshUser();

        App.showToast('Comment posted', 'You earned +10 points.', 'success');
        textarea.value = '';
        await this.loadIssues();
        await this.openIssueDetails(issueId);
        Router.updateNavigationLayout(window.location.hash, Auth.getCurrentUser());
      });
    }
  },

  initMiniMap(lat, lng, status) {
    const container = document.getElementById('modal-map');
    if (!container || typeof lat !== 'number' || typeof lng !== 'number') return;

    let color = '#E53935';
    if (status === 'in_progress') color = '#F59E0B';
    if (status === 'resolved') color = '#1E7B34';

    try {
      if (window.MapHelper && MapHelper.isGoogleMapsAvailable()) {
        const map = new google.maps.Map(container, { center: { lat, lng }, zoom: 15, disableDefaultUI: true });
        new google.maps.Marker({
          position: { lat, lng }, map,
          icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: color, fillOpacity: 0.9, scale: 8, strokeColor: '#FFFFFF', strokeWeight: 2 }
        });
      } else if (window.L) {
        if (this._miniMap) { try { this._miniMap.remove(); } catch (e) {} }
        this._miniMap = L.map(container, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false }).setView([lat, lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this._miniMap);
        L.circleMarker([lat, lng], { radius: 9, color: '#FFFFFF', weight: 2, fillColor: color, fillOpacity: 0.9 }).addTo(this._miniMap);
      }
    } catch (err) {
      console.warn('Mini map unavailable', err);
      container.style.display = 'none';
    }
  },

  closeIssueDetails() {
    const modal = document.getElementById('issue-modal');
    document.body.style.overflow = '';
    if (!modal || modal.style.display === 'none') return;
    modal.classList.add('is-closing');
    setTimeout(() => {
      modal.style.display = 'none';
      modal.classList.remove('is-closing');
    }, 200);
  },

  async markAsUnresolved(issueId) {
    const reasonText = document.getElementById('unresolved-reason').value.trim();
    if (!reasonText) {
      App.showToast('Reason required', 'Please say what still needs to be done.', 'warning');
      return;
    }

    const issue = await DB.get('issues', issueId);
    if (!issue) return;

    issue.status = 'open';
    issue.resolved_at = null;
    issue.after_photo_url = null;
    issue.updated_at = new Date().toISOString();
    await DB.put('issues', issue);

    const currentUser = Auth.getCurrentUser();
    await DB.put('issue_timeline', {
      id: 't_unresolved_' + Date.now(),
      issue_id: issueId,
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'status_changed',
      note: `Reopened by the reporter: "${reasonText}"`,
      created_at: new Date().toISOString()
    });

    App.showToast('Complaint reopened', 'BBMP will be notified.', 'danger');
    await this.openIssueDetails(issueId);
    await this.loadIssues();
  },

  shareIssue(issueId) {
    const shareUrl = `${window.location.origin}${window.location.pathname}#/issue/${issueId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        App.showToast('Link copied', 'Share link copied to clipboard.', 'success');
      }).catch(err => console.error('Copy failed', err));
    } else {
      App.showToast('Share link', shareUrl, 'info');
    }
  }
};

window.HomePage = HomePage;
