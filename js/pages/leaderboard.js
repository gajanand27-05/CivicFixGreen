// js/pages/leaderboard.js
// Leaderboard page

const LeaderboardPage = {
  isPublic: true,
  currentTab: 'month', // 'month' or 'all_time'

  async render() {
    return `
      <div class="es-lb">
        <header class="es-lb-head">
          <div class="es-lb-icon"><i data-lucide="trophy"></i></div>
          <h1>Leaderboard</h1>
          <p>Earn points for every dump you report, upvote or comment on.</p>
          <div class="es-lb-tabs" role="tablist">
            <button class="es-lb-tab active" data-tab="month" role="tab">This month</button>
            <button class="es-lb-tab" data-tab="all_time" role="tab">All time</button>
          </div>
        </header>

        <div class="es-lb-me" id="my-rank-card" style="display: none;"></div>

        <ol class="es-lb-list" id="leaderboard-rows"></ol>
      </div>
    `;
  },

  async mount() {
    this.setupListeners();
    await this.renderLeaderboard();
  },

  setupListeners() {
    const tabs = document.querySelectorAll('.es-lb-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === this.currentTab);
      tab.addEventListener('click', () => {
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

    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const users = await DB.getAll('users');
    const currentUser = Auth.getCurrentUser();

    // Citizens only
    const sortedUsers = users.filter(u => u.role === 'citizen');

    // "This month" is simulated from all-time points
    sortedUsers.forEach(u => {
      u.displayPoints = this.currentTab === 'month'
        ? Math.round((u.points || 0) * (u.id === 'citizen_1' ? 0.7 : 0.8))
        : (u.points || 0);
    });
    sortedUsers.sort((a, b) => b.displayPoints - a.displayPoints);

    const medals = ['🥇', '🥈', '🥉'];
    rowsContainer.innerHTML = sortedUsers.slice(0, 50).map((u, idx) => {
      const isMe = currentUser && u.id === currentUser.id;
      return `
        <li class="es-lb-row ${isMe ? 'is-me' : ''} ${idx < 3 ? 'is-top' : ''}">
          <span class="es-lb-rank">${idx < 3 ? medals[idx] : idx + 1}</span>
          <img src="${esc(u.avatar_url || 'assets/ecosort-icon-192.png')}" class="es-lb-avatar" alt="">
          <span class="es-lb-name">${esc(u.name)}${isMe ? ' <span class="es-lb-you">You</span>' : ''}</span>
          <span class="es-lb-points"><strong>${u.displayPoints.toLocaleString('en-IN')}</strong> pts</span>
        </li>`;
    }).join('') || '<li class="es-lb-empty">No citizens yet. Be the first to report a dump!</li>';

    const myIdx = currentUser && currentUser.role === 'citizen' ? sortedUsers.findIndex(u => u.id === currentUser.id) : -1;
    if (myIdx !== -1) {
      const me = sortedUsers[myIdx];
      myRankContainer.innerHTML = `
        <span class="es-lb-me-rank">#${myIdx + 1}</span>
        <img src="${esc(me.avatar_url || 'assets/ecosort-icon-192.png')}" class="es-lb-avatar" alt="">
        <div class="es-lb-me-info">
          <span class="es-lb-me-label">Your rank of ${sortedUsers.length}</span>
          <span class="es-lb-name">${esc(me.name)}</span>
        </div>
        <span class="es-lb-points"><strong>${me.displayPoints.toLocaleString('en-IN')}</strong> pts</span>`;
      myRankContainer.style.display = 'flex';
    } else {
      myRankContainer.style.display = 'none';
    }

    if (window.lucide) window.lucide.createIcons();
  }
};

window.LeaderboardPage = LeaderboardPage;
