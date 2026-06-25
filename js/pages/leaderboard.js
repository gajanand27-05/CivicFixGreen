// js/pages/leaderboard.js
// Leaderboard Page Controller

const LeaderboardPage = {
  currentTab: 'month', // 'month' or 'all_time'

  async render() {
    return `
      <div class="leaderboard-container">
        <!-- Header -->
        <div class="leaderboard-header">
          <div class="header-decor">
            <svg viewBox="0 0 100 100" width="64" height="64">
              <path d="M50 10 L80 90 L20 90 Z" fill="#FBBF24" />
              <circle cx="50" cy="45" r="15" fill="#D97706" />
              <text x="50" y="50" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle">1</text>
            </svg>
          </div>
          <h1>Civic Leaderboard</h1>
          <p>Earn points by reporting, upvoting, and verifying issues. Top contributors shape the city!</p>

          <!-- Tab Bar -->
          <div class="leaderboard-tabs mt-4">
            <button class="lead-tab active" data-tab="month">This Month</button>
            <button class="lead-tab" data-tab="all_time">All Time</button>
          </div>
        </div>

        <!-- Leaderboard Table -->
        <div class="leaderboard-table-card card">
          <div class="table-header-row">
            <span class="col-rank">Rank</span>
            <span class="col-user">User</span>
            <span class="col-badges">Badges</span>
            <span class="col-points">Points</span>
          </div>

          <div class="table-body-rows" id="leaderboard-rows">
            <!-- Populated dynamically -->
          </div>
        </div>

        <!-- Pinned Current User Rank Card (Bottom) -->
        <div class="my-rank-sticky" id="my-rank-card" style="display: none;">
          <!-- Populated dynamically -->
        </div>
      </div>
    `;
  },

  async mount() {
    this.setupListeners();
    await this.renderLeaderboard();
  },

  setupListeners() {
    const tabs = document.querySelectorAll('.lead-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.getAttribute('data-tab');
        this.renderLeaderboard();
      });
    });
  },

  async renderLeaderboard() {
    const rowsContainer = document.getElementById('leaderboard-rows');
    const myRankContainer = document.getElementById('my-rank-card');
    if (!rowsContainer) return;

    const users = await DB.getAll('users');
    const badges = await DB.getAll('badges');
    const currentUser = Auth.getCurrentUser();

    // Citizens only for leaderboard
    let sortedUsers = users.filter(u => u.role === 'citizen');

    // Simple Monthly points simulator:
    // To support "This Month" tab, we scale points slightly for monthly simulation,
    // and keep full points for All Time
    sortedUsers.forEach(u => {
      u.badgeCount = badges.filter(b => b.user_id === u.id).length;
      if (this.currentTab === 'month') {
        // Mocking monthly points
        u.displayPoints = Math.round((u.points || 0) * (u.id === 'citizen_1' ? 0.7 : 0.8));
      } else {
        u.displayPoints = u.points || 0;
      }
    });

    // Sort by points descending
    sortedUsers.sort((a, b) => b.displayPoints - a.displayPoints);

    // Limit to top 50
    const topFifty = sortedUsers.slice(0, 50);

    rowsContainer.innerHTML = topFifty.map((u, idx) => {
      const rank = idx + 1;
      let rankBadge = '';
      if (rank === 1) rankBadge = '<span class="medal-gold">🥇</span>';
      else if (rank === 2) rankBadge = '<span class="medal-silver">🥈</span>';
      else if (rank === 3) rankBadge = '<span class="medal-bronze">🥉</span>';
      else rankBadge = `<span class="rank-number">${rank}</span>`;

      const isMe = currentUser && u.id === currentUser.id;

      return `
        <div class="table-row ${isMe ? 'row-highlight' : ''}">
          <span class="col-rank">${rankBadge}</span>
          <span class="col-user">
            <img src="${u.avatar_url}" class="lead-avatar">
            <span class="lead-name">${u.name}</span>
          </span>
          <span class="col-badges">
            <i data-lucide="award" class="badge-icon-sm"></i>
            ${u.badgeCount}
          </span>
          <span class="col-points"><strong>${u.displayPoints}</strong></span>
        </div>
      `;
    }).join('');

    // Dynamic Lucide icons render
    if (window.lucide) window.lucide.createIcons();

    // Render my rank sticky card
    if (currentUser && currentUser.role === 'citizen') {
      const myIdx = sortedUsers.findIndex(u => u.id === currentUser.id);
      if (myIdx !== -1) {
        const myRank = myIdx + 1;
        const myData = sortedUsers[myIdx];
        
        myRankContainer.innerHTML = `
          <div class="my-rank-content">
            <div class="my-rank-left">
              <span class="my-rank-num">#${myRank}</span>
              <img src="${myData.avatar_url}" class="my-rank-avatar">
              <div class="my-rank-info">
                <span class="my-rank-title">Your Current Rank</span>
                <span class="my-rank-name">${myData.name}</span>
              </div>
            </div>
            <div class="my-rank-right">
              <div class="my-rank-stat">
                <i data-lucide="award"></i> ${myData.badgeCount} Badges
              </div>
              <div class="my-rank-stat">
                <strong>${myData.displayPoints}</strong> Points
              </div>
            </div>
          </div>
        `;
        myRankContainer.style.display = 'block';
        if (window.lucide) window.lucide.createIcons();
      } else {
        myRankContainer.style.display = 'none';
      }
    } else {
      myRankContainer.style.display = 'none';
    }
  }
};

// Expose globally
window.LeaderboardPage = LeaderboardPage;
