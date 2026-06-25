// js/db.js
// CivicFix IndexedDB Wrapper and Mock Seeder

const DB_NAME = 'CivicFixDB';
const DB_VERSION = 1;

const DB = {
  db: null,

  // Initialize IndexedDB
  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (e) => {
        console.error('Database failed to open', e);
        reject(e);
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this);
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Create Object Stores
        db.createObjectStore('users', { keyPath: 'id' });
        db.createObjectStore('issues', { keyPath: 'id' });
        db.createObjectStore('verifications', { keyPath: 'id' });
        db.createObjectStore('issue_timeline', { keyPath: 'id' });
        db.createObjectStore('badges', { keyPath: 'id' });
        db.createObjectStore('hotspot_predictions', { keyPath: 'id' });
        db.createObjectStore('monthly_reports', { keyPath: 'id' });
      };
    });
  },

  // Generic Operations
  getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  get(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  put(storeName, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve(value);
      request.onerror = () => reject(request.error);
    });
  },

  delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  clear(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Seed default data if database is empty
  async seedIfNeeded() {
    const users = await this.getAll('users');
    if (users.length > 0) {
      console.log('Database already seeded.');
      return;
    }

    console.log('Seeding database...');
    
    // Seed Users
    const seedUsers = [
      {
        id: 'admin_1',
        name: 'System Administrator',
        email: 'admin@civicfix.gov',
        password_hash: 'admin123',
        role: 'admin',
        city: 'MetroCity',
        ward: 'Ward 4',
        points: 0,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        notification_preferences: { email: true, push: true, digest: true }
      },
      {
        id: 'officer_1',
        name: 'Officer Rajesh Kumar',
        email: 'officer@civicfix.gov',
        password_hash: 'officer123',
        role: 'authority',
        city: 'MetroCity',
        ward: 'Ward 4',
        department: 'roads',
        points: 0,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        notification_preferences: { email: true, push: true, digest: true }
      },
      {
        id: 'officer_2',
        name: 'Officer Priya Menon',
        email: 'priya.menon@civicfix.gov',
        password_hash: 'officer123',
        role: 'authority',
        city: 'MetroCity',
        ward: 'Ward 5',
        department: 'sanitation',
        points: 0,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        notification_preferences: { email: true, push: true, digest: true }
      },
      {
        id: 'citizen_1',
        name: 'Amit Sharma',
        email: 'citizen@civicfix.gov',
        password_hash: 'citizen123',
        role: 'citizen',
        city: 'MetroCity',
        ward: 'Ward 4',
        points: 390,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        notification_preferences: { email: true, push: true, digest: true }
      },
      {
        id: 'citizen_2',
        name: 'Sneha Reddy',
        email: 'sneha@gmail.com',
        password_hash: 'citizen123',
        role: 'citizen',
        city: 'MetroCity',
        ward: 'Ward 4',
        points: 620,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        notification_preferences: { email: true, push: true, digest: false }
      },
      {
        id: 'citizen_3',
        name: 'Rohan Das',
        email: 'rohan@gmail.com',
        password_hash: 'citizen123',
        role: 'citizen',
        city: 'MetroCity',
        ward: 'Ward 5',
        points: 215,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
        notification_preferences: { email: false, push: true, digest: true }
      },
      {
        id: 'citizen_4',
        name: 'Kabir Khan',
        email: 'kabir@gmail.com',
        password_hash: 'citizen123',
        role: 'citizen',
        city: 'MetroCity',
        ward: 'Ward 4',
        points: 485,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        notification_preferences: { email: true, push: true, digest: true }
      },
      {
        id: 'citizen_5',
        name: 'Ananya Sen',
        email: 'ananya@gmail.com',
        password_hash: 'citizen123',
        role: 'citizen',
        city: 'MetroCity',
        ward: 'Ward 6',
        points: 150,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        notification_preferences: { email: true, push: false, digest: false }
      }
    ];

    for (const u of seedUsers) {
      await this.put('users', u);
    }

    // Generate SVGs for issue mock images
    const mockImages = {
      pothole: this.getSvgDataUrl('pothole', false),
      pothole_fixed: this.getSvgDataUrl('pothole', true),
      streetlight: this.getSvgDataUrl('streetlight', false),
      streetlight_fixed: this.getSvgDataUrl('streetlight', true),
      water_leakage: this.getSvgDataUrl('water_leakage', false),
      water_leakage_fixed: this.getSvgDataUrl('water_leakage', true),
      garbage: this.getSvgDataUrl('garbage', false),
      garbage_fixed: this.getSvgDataUrl('garbage', true),
      flooding: this.getSvgDataUrl('flooding', false),
      flooding_fixed: this.getSvgDataUrl('flooding', true),
      road_damage: this.getSvgDataUrl('road_damage', false),
      road_damage_fixed: this.getSvgDataUrl('road_damage', true),
      vandalism: this.getSvgDataUrl('vandalism', false),
      vandalism_fixed: this.getSvgDataUrl('vandalism', true),
      encroachment: this.getSvgDataUrl('encroachment', false),
      encroachment_fixed: this.getSvgDataUrl('encroachment', true),
      other: this.getSvgDataUrl('other', false),
      other_fixed: this.getSvgDataUrl('other', true),
    };

    // Seed Issues
    const seedIssues = [
      {
        id: 'issue_001',
        title: 'Dangerous Pothole on 100ft Road Main Intersection',
        description: 'Large jagged pothole right in the middle of Indiranagar 100ft road intersection. Two-wheelers frequently slip here, especially when it rains. Needs urgent patching.',
        category: 'pothole',
        severity: 4,
        status: 'open',
        media_urls: [mockImages.pothole],
        lat: 12.9716,
        lng: 77.6412,
        address: '100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038',
        ward: 'Ward 4',
        reporter_id: 'citizen_1',
        upvote_count: 27,
        report_count: 3,
        assigned_to: null,
        department: 'roads',
        ai_category: 'pothole',
        ai_severity: 4,
        ai_confidence: 0.94,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: null,
        before_photo_url: mockImages.pothole,
        after_photo_url: null,
        ai_resolution_validated: false,
        ai_resolution_confidence: null
      },
      {
        id: 'issue_002',
        title: 'Entire Line of Broken Streetlights on 5th Main',
        description: 'Five consecutive streetlights are broken on 5th Main, making the entire stretch pitch dark. Citizens feel unsafe walking home from the metro after 8 PM.',
        category: 'streetlight',
        severity: 3,
        status: 'in_progress',
        media_urls: [mockImages.streetlight],
        lat: 12.9754,
        lng: 77.6445,
        address: '5th Main Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560008',
        ward: 'Ward 4',
        reporter_id: 'citizen_2',
        upvote_count: 15,
        report_count: 1,
        assigned_to: 'officer_1',
        department: 'electricity',
        ai_category: 'streetlight',
        ai_severity: 3,
        ai_confidence: 0.88,
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: null,
        before_photo_url: mockImages.streetlight,
        after_photo_url: null,
        ai_resolution_validated: false,
        ai_resolution_confidence: null
      },
      {
        id: 'issue_003',
        title: 'Major Drinking Water Pipe Burst',
        description: 'Drinking water is gushing out from the underground pipe line near Indiranagar bus stop. Hundreds of liters of clean water are being wasted hourly, flooding the sidewalk.',
        category: 'water_leakage',
        severity: 4,
        status: 'resolved',
        media_urls: [mockImages.water_leakage],
        lat: 12.9705,
        lng: 77.6385,
        address: 'Indiranagar Bus Stop, Bengaluru, Karnataka 560038',
        ward: 'Ward 4',
        reporter_id: 'citizen_3',
        upvote_count: 32,
        report_count: 1,
        assigned_to: 'officer_1',
        department: 'water',
        ai_category: 'water_leakage',
        ai_severity: 4,
        ai_confidence: 0.96,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        before_photo_url: mockImages.water_leakage,
        after_photo_url: mockImages.water_leakage_fixed,
        ai_resolution_validated: true,
        ai_resolution_confidence: 0.95
      },
      {
        id: 'issue_004',
        title: 'Overflowing Commercial Waste Dump',
        description: 'Massive dump of commercial and plastic garbage piled up on the pavement. The smell is unbearable, and stray animals are spreading it onto the road, blocking pedestrian traffic.',
        category: 'garbage',
        severity: 3,
        status: 'open',
        media_urls: [mockImages.garbage],
        lat: 12.9782,
        lng: 77.6408,
        address: '12th Main Rd, Indiranagar, Bengaluru, Karnataka 560008',
        ward: 'Ward 5',
        reporter_id: 'citizen_2',
        upvote_count: 42,
        report_count: 4,
        assigned_to: null,
        department: 'sanitation',
        ai_category: 'garbage',
        ai_severity: 3,
        ai_confidence: 0.91,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: null,
        before_photo_url: mockImages.garbage,
        after_photo_url: null,
        ai_resolution_validated: false,
        ai_resolution_confidence: null
      },
      {
        id: 'issue_005',
        title: 'Waterlogging & Severe Flooding at Metro Pedestrian Walk',
        description: 'Heavy water stagnation under the metro pillar walkway. The water is knee-deep and smells like sewage. Pedestrians cannot cross the road without wading through it.',
        category: 'flooding',
        severity: 5,
        status: 'in_progress',
        media_urls: [mockImages.flooding],
        lat: 12.9785,
        lng: 77.6391,
        address: 'Indiranagar Metro Station Gate A, Bengaluru, Karnataka 560038',
        ward: 'Ward 4',
        reporter_id: 'citizen_4',
        upvote_count: 56,
        report_count: 2,
        assigned_to: 'officer_1',
        department: 'municipality',
        ai_category: 'flooding',
        ai_severity: 5,
        ai_confidence: 0.97,
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        resolved_at: null,
        before_photo_url: mockImages.flooding,
        after_photo_url: null,
        ai_resolution_validated: false,
        ai_resolution_confidence: null
      },
      {
        id: 'issue_006',
        title: 'Broken and Missing Footpath Slab',
        description: 'Concrete slabs on the footpath are broken or completely missing, exposing a 3-foot drop into the open storm drain. Highly hazardous for visually impaired and elderly pedestrians.',
        category: 'road_damage',
        severity: 4,
        status: 'open',
        media_urls: [mockImages.road_damage],
        lat: 12.9729,
        lng: 77.6431,
        address: '80 Feet Rd, Indiranagar, Bengaluru, Karnataka 560008',
        ward: 'Ward 4',
        reporter_id: 'citizen_4',
        upvote_count: 18,
        report_count: 1,
        assigned_to: null,
        department: 'roads',
        ai_category: 'road_damage',
        ai_severity: 4,
        ai_confidence: 0.89,
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: null,
        before_photo_url: mockImages.road_damage,
        after_photo_url: null,
        ai_resolution_validated: false,
        ai_resolution_confidence: null
      },
      {
        id: 'issue_007',
        title: 'Graffiti Spraying on Public Park Heritage Arch',
        description: 'Vandals have sprayed graffiti all over the historical entrance arch of Defense Colony Children Park. Damaging the look of our community green space.',
        category: 'vandalism',
        severity: 2,
        status: 'resolved',
        media_urls: [mockImages.vandalism],
        lat: 12.9811,
        lng: 77.6419,
        address: 'Defense Colony Park, Indiranagar, Bengaluru, Karnataka 560038',
        ward: 'Ward 4',
        reporter_id: 'citizen_5',
        upvote_count: 9,
        report_count: 1,
        assigned_to: 'officer_2',
        department: 'municipality',
        ai_category: 'vandalism',
        ai_severity: 2,
        ai_confidence: 0.92,
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        before_photo_url: mockImages.vandalism,
        after_photo_url: mockImages.vandalism_fixed,
        ai_resolution_validated: true,
        ai_resolution_confidence: 0.89
      },
      {
        id: 'issue_008',
        title: 'Sidewalk Encroachment by Illegal Food Stall',
        description: 'A commercial fast food cart has set up semi-permanent dining tables, cylinders, and stoves directly on the busy pedestrian walkway. Forcing people to walk on the active traffic lane.',
        category: 'encroachment',
        severity: 3,
        status: 'open',
        media_urls: [mockImages.encroachment],
        lat: 12.9691,
        lng: 77.6455,
        address: 'Double Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560008',
        ward: 'Ward 4',
        reporter_id: 'citizen_1',
        upvote_count: 14,
        report_count: 1,
        assigned_to: null,
        department: 'municipality',
        ai_category: 'encroachment',
        ai_severity: 3,
        ai_confidence: 0.85,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: null,
        before_photo_url: mockImages.encroachment,
        after_photo_url: null,
        ai_resolution_validated: false,
        ai_resolution_confidence: null
      },
      {
        id: 'issue_009',
        title: 'Fallen Electric Cable Hanging Above Pavement',
        description: 'High voltage electrical cable has snapped from the utility pole and is hanging just 5 feet above the public pathway. Sparks seen occasionally. Very high risk of electrocution!',
        category: 'streetlight',
        severity: 5,
        status: 'open',
        media_urls: [mockImages.streetlight],
        lat: 12.9739,
        lng: 77.6362,
        address: '11th Cross Rd, Indiranagar, Bengaluru, Karnataka 560038',
        ward: 'Ward 4',
        reporter_id: 'citizen_2',
        upvote_count: 61,
        report_count: 5,
        assigned_to: null,
        department: 'electricity',
        ai_category: 'streetlight',
        ai_severity: 5,
        ai_confidence: 0.99,
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        resolved_at: null,
        before_photo_url: mockImages.streetlight,
        after_photo_url: null,
        ai_resolution_validated: false,
        ai_resolution_confidence: null
      },
      {
        id: 'issue_010',
        title: 'Broken Public Square Benches',
        description: 'Vandals have broken the seating panels of three concrete benches in our community plaza. Elderly citizens have no place to sit during morning/evening walks.',
        category: 'vandalism',
        severity: 1,
        status: 'resolved',
        media_urls: [mockImages.vandalism],
        lat: 12.9765,
        lng: 77.6495,
        address: 'HAL 3rd Stage, Indiranagar, Bengaluru, Karnataka 560075',
        ward: 'Ward 5',
        reporter_id: 'citizen_3',
        upvote_count: 6,
        report_count: 1,
        assigned_to: 'officer_2',
        department: 'municipality',
        ai_category: 'vandalism',
        ai_severity: 1,
        ai_confidence: 0.81,
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        before_photo_url: mockImages.vandalism,
        after_photo_url: mockImages.vandalism_fixed,
        ai_resolution_validated: true,
        ai_resolution_confidence: 0.91
      }
    ];

    for (const issue of seedIssues) {
      await this.put('issues', issue);

      // Create initial timeline for each issue
      await this.put('issue_timeline', {
        id: `t_${issue.id}_1`,
        issue_id: issue.id,
        actor_id: issue.reporter_id,
        actor_role: 'citizen',
        action: 'reported',
        note: 'Issue reported to the civic authority.',
        created_at: issue.created_at
      });

      if (issue.status === 'in_progress' || issue.status === 'resolved') {
        await this.put('issue_timeline', {
          id: `t_${issue.id}_2`,
          issue_id: issue.id,
          actor_id: issue.assigned_to,
          actor_role: 'authority',
          action: 'assigned',
          note: `Issue assigned to Department Officer for resolution.`,
          created_at: new Date(new Date(issue.created_at).getTime() + 12 * 60 * 60 * 1000).toISOString()
        });

        await this.put('issue_timeline', {
          id: `t_${issue.id}_3`,
          issue_id: issue.id,
          actor_id: issue.assigned_to,
          actor_role: 'authority',
          action: 'status_changed',
          note: 'Status changed to In Progress. Field crew dispatched.',
          created_at: new Date(new Date(issue.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString()
        });
      }

      if (issue.status === 'resolved') {
        await this.put('issue_timeline', {
          id: `t_${issue.id}_4`,
          issue_id: issue.id,
          actor_id: 'officer_1',
          actor_role: 'system_ai',
          action: 'ai_validated',
          note: `AI comparison: resolution confirmed (confidence: ${(issue.ai_resolution_confidence * 100).toFixed(0)}%).`,
          created_at: new Date(new Date(issue.resolved_at).getTime() - 10 * 60 * 1000).toISOString()
        });

        await this.put('issue_timeline', {
          id: `t_${issue.id}_5`,
          issue_id: issue.id,
          actor_id: issue.assigned_to,
          actor_role: 'authority',
          action: 'resolved',
          note: 'Issue marked resolved with photo verification.',
          created_at: issue.resolved_at
        });
      }
    }

    // Seed Verifications (upvotes & comments)
    const seedVerifications = [
      {
        id: 'v_1',
        issue_id: 'issue_001',
        user_id: 'citizen_2',
        type: 'upvote',
        content: null,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'v_2',
        issue_id: 'issue_001',
        user_id: 'citizen_3',
        type: 'upvote',
        content: null,
        created_at: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'v_3',
        issue_id: 'issue_001',
        user_id: 'citizen_2',
        type: 'comment',
        content: 'Almost fell here last night while riding my scooter. Very glad this is reported. Authorities please fix this ASAP!',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'v_4',
        issue_id: 'issue_001',
        user_id: 'citizen_4',
        type: 'comment',
        content: 'I also submitted a report for this, it seems my report was correctly merged into this main thread. Thanks for coordinates mapping.',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'v_5',
        issue_id: 'issue_002',
        user_id: 'citizen_1',
        type: 'comment',
        content: 'It has been dark here for almost a week now. Local shops also closed early because of lack of street lighting.',
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'v_6',
        issue_id: 'issue_005',
        user_id: 'citizen_1',
        type: 'upvote',
        content: null,
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'v_7',
        issue_id: 'issue_005',
        user_id: 'citizen_2',
        type: 'comment',
        content: 'This drain needs to be unclogged. Every rain causes massive blockages here.',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      }
    ];

    for (const v of seedVerifications) {
      await this.put('verifications', v);
      
      // Also add verification comments to issue timeline
      if (v.type === 'comment') {
        const u = seedUsers.find(user => user.id === v.user_id);
        await this.put('issue_timeline', {
          id: `t_comment_${v.id}`,
          issue_id: v.issue_id,
          actor_id: v.user_id,
          actor_role: u ? u.role : 'citizen',
          action: 'commented',
          note: `Commented: "${v.content.substring(0, 45)}..."`,
          created_at: v.created_at
        });
      }
    }

    // Seed Badges
    const seedBadges = [
      { id: 'b_1', user_id: 'citizen_1', badge_type: 'first_reporter', awarded_at: new Date(Date.now() - 39 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'b_2', user_id: 'citizen_1', badge_type: 'streak_master', awarded_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'b_3', user_id: 'citizen_2', badge_type: 'first_reporter', awarded_at: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'b_4', user_id: 'citizen_2', badge_type: 'watchdog', awarded_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'b_5', user_id: 'citizen_2', badge_type: 'community_hero', awarded_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }
    ];

    for (const b of seedBadges) {
      await this.put('badges', b);
    }

    // Seed Predictions (Hotspots)
    const seedPredictions = [
      {
        id: 'pred_1',
        zone_polygon: {
          type: 'Polygon',
          coordinates: [
            [
              [12.973, 77.638],
              [12.977, 77.638],
              [12.977, 77.643],
              [12.973, 77.643],
              [12.973, 77.638]
            ]
          ]
        },
        predicted_category: 'garbage',
        risk_score: 87,
        historical_count: 14,
        prediction_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        generated_by_ai: true
      },
      {
        id: 'pred_2',
        zone_polygon: {
          type: 'Polygon',
          coordinates: [
            [
              [12.969, 77.641],
              [12.972, 77.641],
              [12.972, 77.646],
              [12.969, 77.646],
              [12.969, 77.641]
            ]
          ]
        },
        predicted_category: 'pothole',
        risk_score: 92,
        historical_count: 22,
        prediction_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        generated_by_ai: true
      }
    ];

    for (const p of seedPredictions) {
      await this.put('hotspot_predictions', p);
    }

    // Seed Monthly Reports
    const seedReports = [
      {
        id: 'report_2026_05',
        month: 5,
        year: 2026,
        city: 'MetroCity',
        total_reported: 142,
        total_resolved: 110,
        avg_resolution_hours: 38.5,
        department_breakdown: {
          roads: { reported: 45, resolved: 36 },
          electricity: { reported: 32, resolved: 28 },
          water: { reported: 25, resolved: 20 },
          sanitation: { reported: 30, resolved: 21 },
          municipality: { reported: 10, resolved: 5 }
        },
        category_breakdown: {
          pothole: 40,
          streetlight: 32,
          water_leakage: 25,
          garbage: 30,
          flooding: 8,
          road_damage: 5,
          vandalism: 2,
          encroachment: 0,
          other: 0
        },
        is_public: true,
        pdf_url: '#/report/download/may2026',
        generated_at: new Date(2026, 5, 1).toISOString()
      }
    ];

    for (const r of seedReports) {
      await this.put('monthly_reports', r);
    }

    console.log('Database seeded successfully.');
  },

  // Dynamic SVG Generator for issue pictures so we don't rely on random URLs
  getSvgDataUrl(category, resolved) {
    let color = '#E11D48'; // Red for Open / Unresolved
    let text = 'UNRESOLVED ISSUE';
    let iconSvg = '';

    if (resolved) {
      color = '#10B981'; // Green for Resolved
      text = 'ISSUE RESOLVED';
    }

    switch (category) {
      case 'pothole':
        iconSvg = resolved
          ? `<path d="M50 300 Q150 250, 300 280 T550 300" stroke="#475569" stroke-width="20" fill="none"/>
             <rect x="180" y="240" width="240" height="40" rx="10" fill="#34D399"/>
             <text x="300" y="265" fill="#fff" font-size="16" font-weight="bold" text-anchor="middle">NEW PATCH APPLIED</text>`
          : `<ellipse cx="300" cy="280" rx="160" ry="60" fill="#1E293B"/>
             <path d="M200 270 Q280 230, 360 260 Q340 300, 240 290 Z" fill="#0F172A"/>
             <polygon points="120,330 140,290 160,330" fill="#FBBF24"/>
             <text x="140" y="325" fill="#000" font-size="12" font-weight="bold" text-anchor="middle">!</text>`;
        break;
      case 'streetlight':
        iconSvg = resolved
          ? `<line x1="300" y1="80" x2="300" y2="280" stroke="#94A3B8" stroke-width="12"/>
             <circle cx="300" cy="80" r="28" fill="#FBBF24" opacity="0.9"/>
             <circle cx="300" cy="80" r="48" fill="#FBBF24" opacity="0.3"/>
             <polygon points="180,350 300,80 420,350" fill="url(#lightBeam)" opacity="0.25"/>
             <defs>
               <linearGradient id="lightBeam" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="0%" stop-color="#FBBF24"/>
                 <stop offset="100%" stop-color="#FBBF24" stop-opacity="0"/>
               </linearGradient>
             </defs>`
          : `<line x1="300" y1="80" x2="300" y2="280" stroke="#475569" stroke-width="12"/>
             <circle cx="300" cy="80" r="28" fill="#334155"/>
             <path d="M280 80 L320 80 M290 90 L310 90" stroke="#F87171" stroke-width="4"/>`;
        break;
      case 'water_leakage':
        iconSvg = resolved
          ? `<rect x="100" y="180" width="400" height="40" rx="8" fill="#475569"/>
             <rect x="250" y="170" width="100" height="60" rx="4" fill="#10B981" stroke="#fff" stroke-width="3"/>
             <text x="300" y="205" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">CLAMP SECURED</text>`
          : `<rect x="100" y="180" width="400" height="40" rx="8" fill="#334155"/>
             <path d="M300 200 C300 200, 310 240, 270 280 C290 280, 330 250, 330 200" fill="#38BDF8"/>
             <circle cx="280" cy="310" r="8" fill="#38BDF8"/>
             <circle cx="320" cy="290" r="5" fill="#38BDF8"/>`;
        break;
      case 'garbage':
        iconSvg = resolved
          ? `<rect x="220" y="180" width="160" height="180" rx="12" fill="#10B981"/>
             <path d="M210 180 L390 180" stroke="#059669" stroke-width="12" stroke-linecap="round"/>
             <circle cx="300" cy="270" r="30" fill="#fff" opacity="0.2"/>
             <path d="M285 270 L295 280 L315 260" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`
          : `<rect x="220" y="200" width="160" height="160" rx="12" fill="#475569"/>
             <path d="M180 230 C200 170, 250 170, 270 190 Q300 160, 350 200 C390 180, 420 220, 390 240 Z" fill="#78350F" opacity="0.9"/>
             <circle cx="260" cy="180" r="12" fill="#F87171"/>
             <line x1="260" y1="175" x2="260" y2="185" stroke="#fff" stroke-width="3"/>
             <line x1="255" y1="180" x2="265" y2="180" stroke="#fff" stroke-width="3"/>`;
        break;
      default:
        iconSvg = resolved
          ? `<circle cx="300" cy="200" r="80" fill="#10B981" opacity="0.8"/>
             <path d="M260 200 L290 230 L350 160" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/>`
          : `<circle cx="300" cy="200" r="80" fill="#EF4444" opacity="0.8"/>
             <path d="M260 160 L340 240 M340 160 L260 240" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/>`;
    }

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
        <rect width="100%" height="100%" fill="#1E293B"/>
        <defs>
          <linearGradient id="overlay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="60%" stop-color="#1E293B" stop-opacity="0"/>
            <stop offset="100%" stop-color="#0F172A" stop-opacity="0.95"/>
          </linearGradient>
        </defs>
        
        <!-- Graphical representation -->
        ${iconSvg}

        <rect width="100%" height="100%" fill="url(#overlay)"/>
        
        <!-- Status Panel -->
        <rect x="20" y="20" width="180" height="34" rx="17" fill="${color}"/>
        <text x="110" y="42" fill="#FFFFFF" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="700" text-anchor="middle" letter-spacing="1">${text}</text>

        <!-- Logo Label -->
        <text x="580" y="38" fill="#94A3B8" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="800" text-anchor="end" letter-spacing="1">CIVICFIX AI</text>
        <text x="30" y="370" fill="#FFFFFF" font-family="'Plus Jakarta Sans', sans-serif" font-size="20" font-weight="800">${category.toUpperCase().replace('_', ' ')} REPORT</text>
      </svg>
    `;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
};
