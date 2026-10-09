// js/auth.js
// Authentication & Role Management

const SESSION_KEY = 'ecosort_user_session';

const Auth = {
  currentUser: null,

  // Initialize Session from sessionStorage or localStorage
  init() {
    const sessionStr = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (sessionStr) {
      try {
        this.currentUser = JSON.parse(sessionStr);
      } catch (err) {
        console.error('Failed to parse session', err);
      }
    }
    return this.currentUser;
  },

  // Login Citizen, Authority, or Admin
  async login(email, password, rememberMe = false) {
    const users = await DB.getAll('users');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      throw new Error('Account does not exist.');
    }

    if (user.password_hash !== password) {
      throw new Error('Incorrect password.');
    }

    this.setCurrentUser(user, rememberMe);
    return user;
  },

  // Register a new CITIZEN
  async register(name, email, password, city, ward) {
    const users = await DB.getAll('users');
    const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());

    if (exists) {
      throw new Error('Email is already registered.');
    }

    const newUser = {
      id: 'citizen_' + Date.now(),
      name,
      email,
      password_hash: password,
      role: 'citizen',
      city,
      ward,
      points: 0,
      google_oauth_id: null,
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      created_at: new Date().toISOString(),
      notification_preferences: { email: true, push: true, digest: true }
    };

    await DB.put('users', newUser);
    this.setCurrentUser(newUser, false);
    return newUser;
  },

  // Google OAuth Sign-in Handler
  async googleSignIn(accountData = null) {
    const selectedName = accountData?.name || 'Alex Turner';
    const email = accountData?.email || 'alex.turner@gmail.com';
    const avatar = accountData?.avatar_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80`;
    const defaultPoints = accountData?.points !== undefined ? accountData.points : 390;

    const users = await DB.getAll('users');
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      user = {
        id: 'citizen_g_' + Date.now(),
        name: selectedName,
        email,
        password_hash: 'google_oauth_bypass',
        role: accountData?.role || 'citizen',
        city: 'Bengaluru',
        ward: 'Ward 4',
        points: defaultPoints,
        google_oauth_id: 'g_' + Math.random().toString(36).substring(2, 11),
        avatar_url: avatar,
        created_at: new Date().toISOString(),
        notification_preferences: { email: true, push: true, digest: true }
      };
      await DB.put('users', user);
    }

    this.setCurrentUser(user, true);
    return user;
  },

  // Set Current User Session
  setCurrentUser(user, rememberMe = false) {
    this.currentUser = user;
    const sessionStr = JSON.stringify(user);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (rememberMe) {
      localStorage.setItem(SESSION_KEY, sessionStr);
    } else {
      sessionStorage.setItem(SESSION_KEY, sessionStr);
    }
  },

  // Logout current user
  logout() {
    this.currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  },

  // Get current user details from db to stay updated with points/badges
  async refreshUser() {
    if (!this.currentUser) return null;
    const updated = await DB.get('users', this.currentUser.id);
    if (updated) {
      this.currentUser = updated;
      const sessionStr = JSON.stringify(updated);
      if (localStorage.getItem(SESSION_KEY)) {
        localStorage.setItem(SESSION_KEY, sessionStr);
      } else {
        sessionStorage.setItem(SESSION_KEY, sessionStr);
      }
    }
    return this.currentUser;
  },

  getCurrentUser() {
    return this.currentUser;
  },

  isLoggedIn() {
    return this.currentUser !== null;
  },

  isCitizen() {
    return this.currentUser && this.currentUser.role === 'citizen';
  },

  isAuthority() {
    return this.currentUser && this.currentUser.role === 'authority';
  },

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'admin';
  }
};
