// js/pages/home.js
// Home Feed and Issue Details

const HomePage = {
  issues: [],
  currentFilter: 'all',
  currentSort: 'recent',
  searchQuery: '',

  async render() {
    return `
      <div class="feed-container">
        <!-- Search & Filter Header -->
        <div class="feed-header">
          <div class="search-bar-container">
            <i data-lucide="search" class="search-icon"></i>
            <input type="text" id="feed-search" placeholder="Search issues, category, ward..." class="search-input">
          </div>
          
          <div class="filter-sort-row">
            <!-- Filter Pills -->
            <div class="filter-pills-container scroll-x" id="filter-pills">
              <button class="pill active" data-filter="all">All</button>
              <button class="pill" data-filter="open">Open</button>
              <button class="pill" data-filter="in_progress">In Progress</button>
              <button class="pill" data-filter="resolved">Resolved</button>
              <button class="pill" data-filter="near_me">Near Me</button>
              <button class="pill" data-filter="my_reports">My Reports</button>
            </div>
            
            <!-- Sort Selector -->
            <div class="sort-selector-container">
              <i data-lucide="sliders-horizontal" class="sort-icon"></i>
              <select id="feed-sort" class="sort-select">
                <option value="recent">Most Recent</option>
                <option value="upvotes">Most Upvoted</option>
                <option value="severity">Most Critical</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Issues List -->
        <div class="issues-list" id="issues-list-container">
          <!-- Populated dynamically -->
        </div>

        <!-- Issue Details Modal -->
        <div class="modal-overlay" id="issue-modal" style="display: none;">
          <div class="modal-card">
            <!-- Modal header and content will be populated dynamically -->
          </div>
        </div>
      </div>
    `;
  },

  async mount() {
    this.setupListeners();
    await this.loadIssues();
  },

  setupListeners() {
    // Search listener
    const searchInput = document.getElementById('feed-search');
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderList();
    });

    // Filter pills listeners
    const pills = document.querySelectorAll('#filter-pills .pill');
    pills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentFilter = pill.getAttribute('data-filter');
        this.renderList();
      });
    });

    // Sort listener
    const sortSelect = document.getElementById('feed-sort');
    sortSelect.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.renderList();
    });

    // Listen for database updates (like upvote increments or status advances from polling)
    window.addEventListener('db-update', async () => {
      await this.loadIssues();
    });
  },

  async loadIssues() {
    this.issues = await DB.getAll('issues');
    this.verifications = await DB.getAll('verifications');
    this.renderList();
  },

  renderList() {
    const container = document.getElementById('issues-list-container');
    if (!container) return;

    const user = Auth.getCurrentUser();

    // 1. Apply Filter
    let filtered = [...this.issues];

    if (this.currentFilter === 'open') {
      filtered = filtered.filter(i => i.status === 'open');
    } else if (this.currentFilter === 'in_progress') {
      filtered = filtered.filter(i => i.status === 'in_progress');
    } else if (this.currentFilter === 'resolved') {
      filtered = filtered.filter(i => i.status === 'resolved');
    } else if (this.currentFilter === 'my_reports') {
      filtered = filtered.filter(i => i.reporter_id === user.id);
    } else if (this.currentFilter === 'near_me') {
      // Filter by user's ward
      if (user && user.ward) {
        filtered = filtered.filter(i => i.ward === user.ward);
      }
    }

    // 2. Apply Search
    if (this.searchQuery) {
      filtered = filtered.filter(i => 
        i.title.toLowerCase().includes(this.searchQuery) ||
        i.description.toLowerCase().includes(this.searchQuery) ||
        i.category.toLowerCase().includes(this.searchQuery) ||
        i.address.toLowerCase().includes(this.searchQuery) ||
        i.ward.toLowerCase().includes(this.searchQuery)
      );
    }

    // 3. Apply Sort
    if (this.currentSort === 'recent') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (this.currentSort === 'upvotes') {
      filtered.sort((a, b) => b.upvote_count - a.upvote_count);
    } else if (this.currentSort === 'severity') {
      filtered.sort((a, b) => b.severity - a.severity);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-feed">
          <i data-lucide="package-open" class="empty-icon"></i>
          <h3>No issues found</h3>
          <p>Try resetting filters or search terms.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Render Cards
    container.innerHTML = filtered.map(issue => {
      const severityClass = `severity-${issue.severity}`;
      const statusClass = `status-${issue.status}`;
      const timeStr = App.formatTimeAgo(issue.created_at);
      const isUpvoted = false; // We will check user's verification table upvotes

      let categoryIcon = 'help-circle';
      if (issue.category === 'pothole') categoryIcon = 'drill';
      if (issue.category === 'streetlight') categoryIcon = 'lightbulb';
      if (issue.category === 'water_leakage') categoryIcon = 'droplets';
      if (issue.category === 'garbage') categoryIcon = 'trash-2';
      if (issue.category === 'flooding') categoryIcon = 'waves';
      if (issue.category === 'road_damage') categoryIcon = 'construction';
      if (issue.category === 'vandalism') categoryIcon = 'paint-brush';
      if (issue.category === 'encroachment') categoryIcon = 'store';

      return `
        <div class="issue-card" onclick="HomePage.openIssueDetails('${issue.id}')">
          <div class="issue-card-media">
            <img src="${issue.media_urls[0] || 'assets/icon.svg'}" loading="lazy" alt="${issue.title}">
            <span class="severity-badge ${severityClass}">Severity ${issue.severity}</span>
          </div>
          
          <div class="issue-card-content">
            <div class="card-meta-row">
              <span class="category-tag">
                <i data-lucide="${categoryIcon}"></i>
                ${issue.category.replace('_', ' ')}
              </span>
              <span class="status-pill ${statusClass}">${issue.status.replace('_', ' ')}</span>
            </div>
            
            <h3 class="issue-card-title">${issue.title}</h3>
            <p class="issue-card-desc">${issue.description.substring(0, 100)}${issue.description.length > 100 ? '...' : ''}</p>
            
            <div class="card-footer-row">
              <span class="location-label">
                <i data-lucide="map-pin"></i>
                ${issue.ward}
              </span>
              <span class="time-label">${timeStr}</span>
            </div>
            
            <div class="card-actions-row" onclick="event.stopPropagation()">
              <button class="action-btn upvote-btn" onclick="HomePage.upvoteIssue('${issue.id}', this)">
                <i data-lucide="thumbs-up"></i>
                <span class="count">${issue.upvote_count}</span>
              </button>
              <div class="secondary-stats">
                <span class="stat-item">
                  <i data-lucide="message-square"></i>
                  ${(this.verifications || []).filter(v => v.issue_id === issue.id && v.type === 'comment').length} comments
                </span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  },

  async upvoteIssue(issueId, btnElement) {
    const user = Auth.getCurrentUser();
    if (!user) {
      Router.navigate('#/login');
      return;
    }

    // Check if user already verified/upvoted this issue
    const verifications = await DB.getAll('verifications');
    const alreadyUpvoted = verifications.some(v => v.issue_id === issueId && v.user_id === user.id && v.type === 'upvote');

    if (alreadyUpvoted) {
      App.showToast('Already Upvoted', 'You can only upvote this issue once.', 'warning');
      return;
    }

    // Add upvote
    const issue = await DB.get('issues', issueId);
    if (!issue) return;

    issue.upvote_count++;
    await DB.put('issues', issue);

    // Save verification
    await DB.put('verifications', {
      id: 'v_up_' + Date.now(),
      issue_id: issueId,
      user_id: user.id,
      type: 'upvote',
      content: null,
      created_at: new Date().toISOString()
    });

    // Award +5 points to the upvoting user
    user.points = (user.points || 0) + 5;
    await DB.put('users', user);
    await Auth.refreshUser();

    // Add activity log
    await DB.put('issue_timeline', {
      id: 't_up_' + Date.now(),
      issue_id: issueId,
      actor_id: user.id,
      actor_role: user.role,
      action: 'commented', // Using general verification logs
      note: `Upvoted the report. (+5 points awarded)`,
      created_at: new Date().toISOString()
    });

    App.showToast('Upvoted!', 'You earned +5 points.', 'success');

    // Update locally and in UI
    btnElement.classList.add('voted');
    btnElement.querySelector('.count').innerText = issue.upvote_count;
    
    // Refresh issues list and header
    await this.loadIssues();
    Router.updateNavigationLayout(window.location.hash, Auth.getCurrentUser());
  },

  async openIssueDetails(issueId) {
    const issue = await DB.get('issues', issueId);
    if (!issue) return;

    // Load timeline and verifications
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

    const modal = document.getElementById('issue-modal');
    const card = modal.querySelector('.modal-card');

    let timelineSteps = ['Reported', 'Verified', 'Assigned', 'In Progress', 'Resolved'];
    let currentStepIndex = 0;
    if (issue.status === 'open') currentStepIndex = 1;
    if (issue.status === 'in_progress') currentStepIndex = 3;
    if (issue.status === 'resolved') currentStepIndex = 4;
    if (issue.status === 'rejected') {
      timelineSteps = ['Reported', 'Rejected'];
      currentStepIndex = 1;
    }

    const isResolved = issue.status === 'resolved';

    // Build timeline HTML
    const timelineHtml = timelineSteps.map((step, idx) => {
      const isActive = idx <= currentStepIndex;
      const isCurrent = idx === currentStepIndex;
      let stateClass = '';
      if (isCurrent) stateClass = 'current';
      else if (isActive) stateClass = 'completed';

      return `
        <div class="timeline-step ${stateClass}">
          <div class="step-circle">${idx + 1}</div>
          <div class="step-label">${step}</div>
        </div>
      `;
    }).join('');

    // Side-by-side photos if resolved
    let photosHtml = `
      <div class="modal-gallery scroll-x">
        ${issue.media_urls.map(url => `<img src="${url}" class="modal-gallery-img">`).join('')}
      </div>
    `;

    if (isResolved && issue.after_photo_url) {
      photosHtml = `
        <div class="before-after-container">
          <div class="photo-side">
            <span class="side-badge danger">BEFORE</span>
            <img src="${issue.before_photo_url}" class="side-img">
          </div>
          <div class="photo-side">
            <span class="side-badge success">AFTER FIX</span>
            <img src="${issue.after_photo_url}" class="side-img">
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="modal-header">
        <h2>Issue Details</h2>
        <button class="modal-close" onclick="HomePage.closeIssueDetails()">&times;</button>
      </div>

      <div class="modal-body scroll-y">
        ${photosHtml}

        <div class="modal-section">
          <div class="modal-meta-row">
            <span class="status-pill status-${issue.status}">${issue.status.replace('_', ' ')}</span>
            <span class="severity-badge severity-${issue.severity}">Severity ${issue.severity}</span>
            <span class="ward-tag"><i data-lucide="map-pin"></i> ${issue.ward}</span>
          </div>

          <h1 class="modal-issue-title">${issue.title}</h1>
          <p class="modal-issue-desc">${issue.description}</p>
          <p class="modal-issue-address"><strong>Address:</strong> ${issue.address}</p>

          <div class="reporter-pill">
            <img src="${reporter ? reporter.avatar_url : 'https://api.dicebear.com/7.x/bottts/svg?seed=system'}" class="reporter-avatar">
            <div class="reporter-info">
              <span class="rep-name">Reported by ${reporter ? reporter.name : 'Citizen'}</span>
              <span class="rep-time">${new Date(issue.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <!-- Map section -->
        <div class="modal-section">
          <h3>Location Map</h3>
          <div id="modal-map" class="details-mini-map"></div>
        </div>

        <!-- Timeline section -->
        <div class="modal-section">
          <h3>Progress Timeline</h3>
          <div class="visual-timeline">
            ${timelineHtml}
          </div>
          <div class="text-timeline-logs">
            ${issueTimeline.map(log => `
              <div class="log-entry">
                <span class="log-dot"></span>
                <div class="log-details">
                  <div class="log-title">${log.action.toUpperCase()} - ${log.actor_role.toUpperCase()}</div>
                  <div class="log-note">${log.note}</div>
                  <div class="log-time">${new Date(log.created_at).toLocaleString()}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Comments section -->
        <div class="modal-section">
          <h3>Community Updates & Comments</h3>
          <div class="comments-list" id="modal-comments-list">
            ${comments.length === 0 ? '<p class="empty-comments">No comments yet. Be the first to comment!</p>' : comments.map(c => {
              const commenter = users.find(u => u.id === c.user_id);
              return `
                <div class="comment-item">
                  <img src="${commenter ? commenter.avatar_url : 'https://api.dicebear.com/7.x/bottts/svg?seed=system'}" class="comment-avatar">
                  <div class="comment-bubble">
                    <div class="comment-meta">
                      <span class="comment-author">${commenter ? commenter.name : 'Citizen'}</span>
                      <span class="comment-time">${App.formatTimeAgo(c.created_at)}</span>
                    </div>
                    <div class="comment-text">${c.content}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          ${currentUser ? `
            <form id="comment-form" class="modal-comment-form">
              <textarea id="comment-textarea" placeholder="Add an official update or comment... (Earn +10 points)" rows="3" max="500" required></textarea>
              <button type="submit" class="btn btn-primary">Submit Comment</button>
            </form>
          ` : '<p class="login-prompt"><a href="#/login">Log in</a> to write comments and verify issues.</p>'}
        </div>

        <!-- Re-evaluate Section for Reporter -->
        ${isResolved && currentUser && currentUser.id === issue.reporter_id ? `
          <div class="modal-section unresolved-section border-top">
            <h3>Not satisfied with the resolution?</h3>
            <p class="text-muted mb-3">If you feel the work is inadequate or incomplete, you can mark the issue back as unresolved.</p>
            <div id="unresolved-form" class="unresolved-form">
              <textarea id="unresolved-reason" placeholder="Provide a reason why the fix is insufficient..." rows="2" required></textarea>
              <button class="btn btn-danger mt-2" onclick="HomePage.markAsUnresolved('${issue.id}')">Mark as Unresolved</button>
            </div>
          </div>
        ` : ''}

      </div>

      <div class="modal-actions">
        <button class="btn btn-outline" onclick="HomePage.shareIssue('${issue.id}')">
          <i data-lucide="share-2"></i> Share
        </button>
        <button class="btn btn-primary" onclick="HomePage.upvoteIssue('${issue.id}', document.querySelector('.upvote-btn'))">
          <i data-lucide="thumbs-up"></i> Upvote (+5 pts)
        </button>
      </div>
    `;

    modal.style.display = 'flex';
    if (window.lucide) window.lucide.createIcons();

    // Render mini map inside details modal
    setTimeout(() => {
      this.initMiniMap(issue.lat, issue.lng, issue.category, issue.status);
    }, 100);

    // Comment submission event
    const commentForm = card.querySelector('#comment-form');
    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textarea = card.querySelector('#comment-textarea');
        const text = textarea.value.trim();
        if (!text) return;

        // Submit comment
        const commentVal = {
          id: 'v_comment_' + Date.now(),
          issue_id: issueId,
          user_id: currentUser.id,
          type: 'comment',
          content: text,
          created_at: new Date().toISOString()
        };
        await DB.put('verifications', commentVal);

        // Timeline Log
        await DB.put('issue_timeline', {
          id: 't_comment_' + Date.now(),
          issue_id: issueId,
          actor_id: currentUser.id,
          actor_role: currentUser.role,
          action: 'commented',
          note: `Commented: "${text.substring(0, 45)}..."`,
          created_at: new Date().toISOString()
        });

        // Award +10 points
        currentUser.points = (currentUser.points || 0) + 10;
        await DB.put('users', currentUser);
        await Auth.refreshUser();

        App.showToast('Comment Posted!', 'You earned +10 points.', 'success');

        // Clear and reload modal details
        textarea.value = '';
        await this.loadIssues();
        await this.openIssueDetails(issueId);
        
        // Refresh routing layout for navigation points display
        Router.updateNavigationLayout(window.location.hash, Auth.getCurrentUser());
      });
    }
  },

  initMiniMap(lat, lng, category, status) {
    const container = document.getElementById('modal-map');
    if (!container) return;

    const map = new google.maps.Map(container, {
      center: { lat: lat, lng: lng },
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: false
    });

    let color = '#EF4444';
    if (status === 'in_progress') color = '#F59E0B';
    if (status === 'resolved') color = '#10B981';

    new google.maps.Marker({
      position: { lat: lat, lng: lng },
      map: map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 0.9,
        scale: 8,
        strokeColor: '#FFFFFF',
        strokeWeight: 2
      }
    });
  },

  closeIssueDetails() {
    const modal = document.getElementById('issue-modal');
    if (modal) modal.style.display = 'none';
  },

  async markAsUnresolved(issueId) {
    const reasonText = document.getElementById('unresolved-reason').value.trim();
    if (!reasonText) {
      App.showToast('Reason required', 'Please explain why the resolution is insufficient.', 'warning');
      return;
    }

    const issue = await DB.get('issues', issueId);
    if (!issue) return;

    issue.status = 'open'; // Re-opened
    issue.resolved_at = null;
    issue.after_photo_url = null;
    issue.updated_at = new Date().toISOString();
    await DB.put('issues', issue);

    const currentUser = Auth.getCurrentUser();

    // Timeline Log
    await DB.put('issue_timeline', {
      id: 't_unresolved_' + Date.now(),
      issue_id: issueId,
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'status_changed',
      note: `Marked as Unresolved by Reporter. Reason: "${reasonText}"`,
      created_at: new Date().toISOString()
    });

    App.showToast('Issue Re-opened', 'Authorities have been notified.', 'danger');
    
    // Refresh modal
    await this.openIssueDetails(issueId);
    // Refresh home list
    await this.loadIssues();
  },

  shareIssue(issueId) {
    const shareUrl = `${window.location.origin}${window.location.pathname}#/issue/${issueId}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        App.showToast('Link Copied!', 'Share link copied to clipboard.', 'success');
      }).catch(err => console.error('Copy failed', err));
    } else {
      App.showToast('Share Link', shareUrl, 'info');
    }
  }
};

// Expose globally
window.HomePage = HomePage;
