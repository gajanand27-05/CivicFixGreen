// js/db.js
// CivicFix data layer: same API as before, backed by the shared server store (server/store.py)

const SEED_VERSION = 'v8_green';

async function dbApi(method, path, body) {
  const res = await fetch(`${CONFIG.API_BASE}/api/db/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`DB ${method} ${path} failed (${res.status})`);
  return res.json();
}

const DB = {
  async init() {
    await dbApi('GET', 'meta'); // fails fast if the server is not running
    return this;
  },

  getAll(storeName) {
    return dbApi('GET', storeName);
  },

  async get(storeName, key) {
    const doc = await dbApi('GET', `${storeName}/${encodeURIComponent(key)}`);
    return doc === null ? undefined : doc;
  },

  put(storeName, value) {
    return dbApi('PUT', `${storeName}/${encodeURIComponent(value.id)}`, value);
  },

  delete(storeName, key) {
    return dbApi('DELETE', `${storeName}/${encodeURIComponent(key)}`);
  },

  clear(storeName) {
    return dbApi('POST', `${storeName}/clear`);
  },

  // Seed shared demo data once per server database
  async seedIfNeeded() {
    const meta = await this.get('meta', 'seed');
    if (meta && meta.version === SEED_VERSION) {
      console.log('Server DB already seeded:', SEED_VERSION);
      return;
    }

    console.log('Seeding server DB...');
    for (const store of ['users', 'issues', 'verifications', 'issue_timeline', 'badges', 'hotspot_predictions', 'monthly_reports', 'notifications']) {
      await this.clear(store);
    }

    // Seed Users
    const seedUsers = [
      {
        id: 'admin_1',
        name: 'System Administrator',
        email: 'admin@civicfix.gov',
        password_hash: 'admin123',
        role: 'admin',
        city: 'Bengaluru',
        ward: 'Ward 4',
        points: 0,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        notification_preferences: { email: true, push: true, digest: true }
      },
      {
        id: 'officer_1',
        name: 'Officer Ramesh Kumar (BBMP East)',
        email: 'officer@civicfix.gov',
        password_hash: 'officer123',
        role: 'authority',
        city: 'Bengaluru',
        ward: 'Ward 4',
        department: 'swm',
        points: 0,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        notification_preferences: { email: true, push: true, digest: true }
      },
      {
        id: 'officer_2',
        name: 'Officer Priya Menon (BBMP West)',
        email: 'priya.menon@civicfix.gov',
        password_hash: 'officer123',
        role: 'authority',
        city: 'Bengaluru',
        ward: 'Ward 5',
        department: 'swm',
        points: 0,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        notification_preferences: { email: true, push: true, digest: true }
      },
      {
        id: 'citizen_1',
        name: 'Alex Turner',
        email: 'citizen@civicfix.gov',
        password_hash: 'citizen123',
        role: 'citizen',
        city: 'Bengaluru',
        ward: 'Ward 4',
        points: 390,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        notification_preferences: { email: true, push: true, digest: true }
      },
      {
        id: 'citizen_2',
        name: 'Priya Sharma',
        email: 'sneha@gmail.com',
        password_hash: 'citizen123',
        role: 'citizen',
        city: 'Bengaluru',
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
        city: 'Bengaluru',
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
        city: 'Bengaluru',
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
        city: 'Bengaluru',
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

    // Unsplash photos (each URL checked to return HTTP 200 and to show waste / clean bins)
    const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;
    const mockImages = {
      overflowing_bin: img('photo-1605600659908-0ef719419d41'), // bin overflowing onto pavement
      plastic_litter: img('photo-1530587191325-3db32d826c18'),  // plastic bottles littered on the ground
      plastic_pile: img('photo-1595278069441-2cf29f8005a4'),    // heap of dumped plastic bottles
      cardboard_dump: img('photo-1567393528677-d6adae7d4a0a'),  // dumped cardboard / commercial waste
      cardboard_bales: img('photo-1528323273322-d81458248d40'), // cardboard waste piled by a wall
      burning: img('photo-1572204097183-e1ab140342ed'),         // open fire at night
      construction: img('photo-1504307651254-35680f356dfd'),    // construction site with debris
      cleaned_bins: img('photo-1532996122724-e3c354a0b15b'),    // clean pavement with segregation bins
      cleaned_bins_2: img('photo-1611284446314-60a58ac0deb9')   // clean segregation bins
    };

    const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
    const seedComplaint = (ticketId, days) => ({
      ticket_id: ticketId, office_id: 'east', office_name: 'BBMP East Zone Office',
      office_email: 'seed-only@example.invalid', officer_user_id: 'officer_1', complainer_email: '',
      sent_at: daysAgo(days), message_id: '', email_status: 'sent',
      last_activity_at: daysAgo(days),
      reminder_count: 3, last_reminder_at: daysAgo(1), replies: 0
    });

    // Seed Issues: 10 waste complaints in Indiranagar / HAL / Domlur
    const seedIssues = [
      {
        id: 'issue_001',
        title: 'Plastic Garbage Dumped on 100ft Road Footpath',
        description: 'A large heap of plastic bottles and packaging has been dumped on the footpath near the 100ft Road junction. It has been growing for days and now blocks half the walkway.',
        category: 'illegal_dumping',
        severity: 4,
        status: 'open',
        media_urls: [mockImages.plastic_pile],
        lat: 12.9745,
        lng: 77.6405,
        address: '100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038',
        ward: 'Ward 80 (Indiranagar)',
        reporter_id: 'citizen_1',
        upvote_count: 27,
        report_count: 3,
        assigned_to: null,
        department: 'swm',
        ai_category: 'illegal_dumping',
        ai_severity: 4,
        ai_confidence: 0.94,
        created_at: daysAgo(6),
        updated_at: daysAgo(6),
        resolved_at: null,
        before_photo_url: mockImages.plastic_pile,
        after_photo_url: null,
        ai_resolution_validated: false,
        ai_resolution_confidence: null,
        est_weight_kg: 120,
        complaint: seedComplaint('CFG-S001', 6)
      },
      {
        id: 'issue_002',
        title: 'Overflowing Community Bin on 12th Main',
        description: 'The community bin on 12th Main has not been cleared for over a week. Garbage is spilling onto the pavement and stray dogs are scattering it onto the road.',
        category: 'overflowing_bin',
        severity: 3,
        status: 'open',
        media_urls: [mockImages.overflowing_bin],
        lat: 12.9782,
        lng: 77.6408,
        address: '12th Main Rd, Indiranagar, Bengaluru, Karnataka 560008',
        ward: 'Ward 80 (Indiranagar)',
        reporter_id: 'citizen_2',
        upvote_count: 42,
        report_count: 4,
        assigned_to: null,
        department: 'swm',
        ai_category: 'overflowing_bin',
        ai_severity: 3,
        ai_confidence: 0.91,
        created_at: daysAgo(6.5),
        updated_at: daysAgo(6),
        resolved_at: null,
        before_photo_url: mockImages.overflowing_bin,
        after_photo_url: null,
        ai_resolution_validated: false,
        ai_resolution_confidence: null,
        est_weight_kg: 60,
        complaint: seedComplaint('CFG-S002', 6)
      },
      {
        id: 'issue_003',
        title: 'Garbage Being Burnt in Open Plot on Double Road',
        description: 'Mixed garbage is being set on fire every evening in the empty plot off Double Road. Thick toxic smoke is entering nearby homes and the school next door.',
        category: 'waste_burning',
        severity: 5,
        status: 'open',
        media_urls: [mockImages.burning],
        lat: 12.9705,
        lng: 77.6435,
        address: 'Double Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560008',
        ward: 'Ward 88 (HAL 2nd Stage)',
        reporter_id: 'citizen_4',
        upvote_count: 56,
        report_count: 2,
        assigned_to: null,
        department: 'swm',
        ai_category: 'waste_burning',
        ai_severity: 5,
        ai_confidence: 0.97,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        resolved_at: null,
        before_photo_url: mockImages.burning,
        after_photo_url: null,
        ai_resolution_validated: false,
        ai_resolution_confidence: null,
        est_weight_kg: 35
      },
      {
        id: 'issue_004',
        title: 'Plastic Bottles Littered Along HAL 3rd Stage Lane',
        description: 'Plastic bottles and wrappers are littered all along the lane behind the HAL 3rd Stage market. They are washing into the storm drain whenever it rains.',
        category: 'plastic_litter',
        severity: 2,
        status: 'open',
        media_urls: [mockImages.plastic_litter],
        lat: 12.9690,
        lng: 77.6475,
        address: 'HAL 3rd Stage, Indiranagar, Bengaluru, Karnataka 560075',
        ward: 'Ward 88 (HAL 2nd Stage)',
        reporter_id: 'citizen_5',
        upvote_count: 14,
        report_count: 1,
        assigned_to: null,
        department: 'swm',
        ai_category: 'plastic_litter',
        ai_severity: 2,
        ai_confidence: 0.86,
        created_at: daysAgo(1),
        updated_at: daysAgo(1),
        resolved_at: null,
        before_photo_url: mockImages.plastic_litter,
        after_photo_url: null,
        ai_resolution_validated: false,
        ai_resolution_confidence: null,
        est_weight_kg: 15
      },
      {
        id: 'issue_005',
        title: 'Commercial Cardboard Waste Dumped Behind Shops',
        description: 'Shops on CMH Road are dumping cardboard boxes and packing waste behind the building every night instead of handing it to the BBMP collection vehicle.',
        category: 'illegal_dumping',
        severity: 3,
        status: 'in_progress',
        media_urls: [mockImages.cardboard_bales],
        lat: 12.9729,
        lng: 77.6431,
        address: 'CMH Rd, Indiranagar, Bengaluru, Karnataka 560038',
        ward: 'Ward 80 (Indiranagar)',
        reporter_id: 'citizen_3',
        upvote_count: 18,
        report_count: 1,
        assigned_to: 'officer_1',
        department: 'swm',
        ai_category: 'illegal_dumping',
        ai_severity: 3,
        ai_confidence: 0.89,
        created_at: daysAgo(3),
        updated_at: daysAgo(2),
        resolved_at: null,
        before_photo_url: mockImages.cardboard_bales,
        after_photo_url: null,
        ai_resolution_validated: false,
        ai_resolution_confidence: null,
        est_weight_kg: 90,
        complaint: seedComplaint('CFG-S003', 3)
      },
      {
        id: 'issue_006',
        title: 'Construction Debris Dumped on Domlur Service Road',
        description: 'Truckloads of broken concrete, bricks and rebar have been dumped on the Domlur service road, narrowing it to a single lane. Nobody has claimed it.',
        category: 'construction_debris',
        severity: 4,
        status: 'in_progress',
        media_urls: [mockImages.construction],
        lat: 12.9688,
        lng: 77.6385,
        address: 'Domlur Service Rd, Domlur, Bengaluru, Karnataka 560071',
        ward: 'Ward 112 (Domlur)',
        reporter_id: 'citizen_1',
        upvote_count: 21,
        report_count: 2,
        assigned_to: 'officer_1',
        department: 'engineering',
        ai_category: 'construction_debris',
        ai_severity: 4,
        ai_confidence: 0.9,
        created_at: daysAgo(3),
        updated_at: daysAgo(2),
        resolved_at: null,
        before_photo_url: mockImages.construction,
        after_photo_url: null,
        ai_resolution_validated: false,
        ai_resolution_confidence: null,
        est_weight_kg: 450,
        complaint: seedComplaint('CFG-S004', 2.5)
      },
      {
        id: 'issue_007',
        title: 'Garbage Bin Overflowing Near Metro Feeder Stop',
        description: 'The bin next to the metro feeder bus stop is full and garbage is piling up around it. Commuters have to step over the waste to board the bus.',
        category: 'overflowing_bin',
        severity: 3,
        status: 'in_progress',
        media_urls: [mockImages.overflowing_bin],
        lat: 12.9765,
        lng: 77.6455,
        address: '80 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560008',
        ward: 'Ward 88 (HAL 2nd Stage)',
        reporter_id: 'citizen_2',
        upvote_count: 15,
        report_count: 1,
        assigned_to: 'officer_1',
        department: 'swm',
        ai_category: 'overflowing_bin',
        ai_severity: 3,
        ai_confidence: 0.88,
        created_at: daysAgo(2),
        updated_at: daysAgo(1),
        resolved_at: null,
        before_photo_url: mockImages.overflowing_bin,
        after_photo_url: null,
        ai_resolution_validated: false,
        ai_resolution_confidence: null,
        est_weight_kg: 40,
        complaint: seedComplaint('CFG-S005', 2)
      },
      {
        id: 'issue_008',
        title: 'Plastic Waste Heap Near Indiranagar Bus Stop',
        description: 'A heap of plastic bottles and mixed waste had piled up beside the Indiranagar bus stop, attracting rats and blocking the shelter.',
        category: 'illegal_dumping',
        severity: 4,
        status: 'resolved',
        media_urls: [mockImages.plastic_pile],
        lat: 12.9712,
        lng: 77.6388,
        address: 'Indiranagar Bus Stop, Bengaluru, Karnataka 560038',
        ward: 'Ward 80 (Indiranagar)',
        reporter_id: 'citizen_3',
        upvote_count: 32,
        report_count: 1,
        assigned_to: 'officer_1',
        department: 'swm',
        ai_category: 'illegal_dumping',
        ai_severity: 4,
        ai_confidence: 0.96,
        created_at: daysAgo(10),
        updated_at: daysAgo(1),
        resolved_at: daysAgo(1),
        before_photo_url: mockImages.plastic_pile,
        after_photo_url: mockImages.cleaned_bins,
        ai_resolution_validated: true,
        ai_resolution_confidence: 0.93,
        est_weight_kg: 180
      },
      {
        id: 'issue_009',
        title: 'Plastic Litter Around Defence Colony Park Gate',
        description: 'Plastic bottles and snack wrappers were littered all around the Defence Colony park entrance after the weekend market.',
        category: 'plastic_litter',
        severity: 2,
        status: 'resolved',
        media_urls: [mockImages.plastic_litter],
        lat: 12.9811,
        lng: 77.6419,
        address: 'Defence Colony Park, Indiranagar, Bengaluru, Karnataka 560038',
        ward: 'Ward 80 (Indiranagar)',
        reporter_id: 'citizen_5',
        upvote_count: 9,
        report_count: 1,
        assigned_to: 'officer_1',
        department: 'swm',
        ai_category: 'plastic_litter',
        ai_severity: 2,
        ai_confidence: 0.92,
        created_at: daysAgo(14),
        updated_at: daysAgo(8),
        resolved_at: daysAgo(8),
        before_photo_url: mockImages.plastic_litter,
        after_photo_url: mockImages.cleaned_bins_2,
        ai_resolution_validated: true,
        ai_resolution_confidence: 0.88,
        est_weight_kg: 45
      },
      {
        id: 'issue_010',
        title: 'Black Spot of Dumped Cardboard Under Domlur Flyover',
        description: 'Cardboard and packaging waste had been dumped under the Domlur flyover for weeks, turning the spot into a garbage black spot.',
        category: 'illegal_dumping',
        severity: 3,
        status: 'resolved',
        media_urls: [mockImages.cardboard_dump],
        lat: 12.9695,
        lng: 77.6370,
        address: 'Domlur Flyover, Domlur, Bengaluru, Karnataka 560071',
        ward: 'Ward 112 (Domlur)',
        reporter_id: 'citizen_4',
        upvote_count: 12,
        report_count: 2,
        assigned_to: 'officer_1',
        department: 'swm',
        ai_category: 'illegal_dumping',
        ai_severity: 3,
        ai_confidence: 0.87,
        created_at: daysAgo(25),
        updated_at: daysAgo(15),
        resolved_at: daysAgo(15),
        before_photo_url: mockImages.cardboard_dump,
        after_photo_url: mockImages.cleaned_bins,
        ai_resolution_validated: true,
        ai_resolution_confidence: 0.91,
        est_weight_kg: 320
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
        note: 'Complaint reported with photo and GPS location.',
        created_at: issue.created_at
      });

      if (issue.status === 'in_progress' || issue.status === 'resolved') {
        await this.put('issue_timeline', {
          id: `t_${issue.id}_2`,
          issue_id: issue.id,
          actor_id: issue.assigned_to,
          actor_role: 'authority',
          action: 'assigned',
          note: `Assigned to BBMP SWM officer for cleanup.`,
          created_at: new Date(new Date(issue.created_at).getTime() + 12 * 60 * 60 * 1000).toISOString()
        });

        await this.put('issue_timeline', {
          id: `t_${issue.id}_3`,
          issue_id: issue.id,
          actor_id: issue.assigned_to,
          actor_role: 'authority',
          action: 'status_changed',
          note: 'Status changed to In Progress. Cleanup crew dispatched.',
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
          note: `AI comparison: cleanup confirmed (confidence: ${(issue.ai_resolution_confidence * 100).toFixed(0)}%).`,
          created_at: new Date(new Date(issue.resolved_at).getTime() - 10 * 60 * 1000).toISOString()
        });

        await this.put('issue_timeline', {
          id: `t_${issue.id}_5`,
          issue_id: issue.id,
          actor_id: issue.assigned_to,
          actor_role: 'authority',
          action: 'resolved',
          note: 'Complaint closed with cleanup photo verification.',
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
        content: 'This plastic heap keeps growing every day and the smell is terrible near the junction. BBMP please clear it ASAP!',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'v_4',
        issue_id: 'issue_001',
        user_id: 'citizen_4',
        type: 'comment',
        content: 'I also reported this dump, glad my report was merged into this one. Six days and still no pickup.',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'v_5',
        issue_id: 'issue_002',
        user_id: 'citizen_1',
        type: 'comment',
        content: 'This bin has not been emptied in over a week. Dogs pull the garbage bags onto the road every night.',
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
        content: 'The shops dump fresh cardboard here every night. Hope the BBMP crew also fines them this time.',
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

    // Seed Predictions (Hotspots). GeoJSON order: [lng, lat]
    const seedPredictions = [
      {
        id: 'pred_1',
        zone_polygon: { type: 'Polygon', coordinates: [[[77.638, 12.973], [77.643, 12.973], [77.643, 12.977], [77.638, 12.977], [77.638, 12.973]]] },
        predicted_category: 'illegal_dumping',
        risk_score: 87,
        historical_count: 14,
        prediction_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        generated_by_ai: true
      },
      {
        id: 'pred_2',
        zone_polygon: { type: 'Polygon', coordinates: [[[77.641, 12.969], [77.646, 12.969], [77.646, 12.972], [77.641, 12.972], [77.641, 12.969]]] },
        predicted_category: 'waste_burning',
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
        city: 'Bengaluru',
        total_reported: 142,
        total_resolved: 110,
        avg_resolution_hours: 38.5,
        department_breakdown: {
          swm: { reported: 112, resolved: 88 },
          engineering: { reported: 22, resolved: 17 },
          health: { reported: 8, resolved: 5 }
        },
        category_breakdown: {
          illegal_dumping: 48,
          overflowing_bin: 36,
          waste_burning: 14,
          construction_debris: 22,
          plastic_litter: 12,
          e_waste: 4,
          other: 6
        },
        is_public: true,
        pdf_url: '#/report/download/may2026',
        generated_at: new Date(2026, 5, 1).toISOString()
      }
    ];

    for (const r of seedReports) {
      await this.put('monthly_reports', r);
    }

    await this.put('meta', { id: 'seed', version: SEED_VERSION });
    console.log('Server DB seeded:', SEED_VERSION);
  },

  // Public reset method for demo and judge testing
  async resetDemoData() {
    await this.delete('meta', 'seed');
    await this.seedIfNeeded();
    window.dispatchEvent(new CustomEvent('db-update'));
    return true;
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

window.DB = DB;

