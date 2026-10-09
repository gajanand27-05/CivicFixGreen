// js/db.js
// EcoSort data layer: same API as before, backed by the shared server store (server/store.py)

const SEED_VERSION = 'v9_ecosort';

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
    if (this._batch) { this._batch.push({ op: 'put', store: storeName, doc: value }); return Promise.resolve(value); }
    return dbApi('PUT', `${storeName}/${encodeURIComponent(value.id)}`, value);
  },

  delete(storeName, key) {
    return dbApi('DELETE', `${storeName}/${encodeURIComponent(key)}`);
  },

  clear(storeName) {
    if (this._batch) { this._batch.push({ op: 'clear', store: storeName }); return Promise.resolve(); }
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
    this._batch = []; // collect every seed write and send them in one request (fast on remote hosts)
    for (const store of ['users', 'issues', 'verifications', 'issue_timeline', 'badges', 'hotspot_predictions', 'monthly_reports', 'notifications']) {
      await this.clear(store);
    }

    // ---------------------------------------------------------------------------
    // Demo data grounded in real, public Bengaluru civic facts (sources listed in the
    // project report). All timestamps are relative to "now" so the dashboard looks live.
    // Since 2 Sep 2025 the BBMP is replaced by the Greater Bengaluru Authority (GBA) and five
    // city corporations: Central, East, West, North, South. Office ids/names below mirror
    // server/bbmp_offices.json exactly. Locations geocoded with OpenStreetMap Nominatim.
    // ---------------------------------------------------------------------------
    const HOUR = 60 * 60 * 1000;
    const hoursAgo = (h) => new Date(Date.now() - h * HOUR).toISOString();
    const daysAgo = (d) => hoursAgo(d * 24);

    const OFFICES = {
      east: { name: 'Bengaluru Central City Corporation - East Zonal Office', officer: 'officer_1' },
      east_mahadevapura: { name: 'Bengaluru East City Corporation - Mahadevapura Zonal Office', officer: 'officer_1' },
      west_malleswaram: { name: 'Bengaluru West City Corporation - IPP Malleswaram Office', officer: 'officer_2' },
      north_yelahanka: { name: 'Bengaluru North City Corporation - Yelahanka Zonal Office', officer: 'officer_2' },
      south_jayanagar: { name: 'Bengaluru South City Corporation - South Zonal Office (Jayanagar)', officer: 'officer_2' },
      south_bommanahalli: { name: 'Bengaluru South City Corporation - Bommanahalli Zonal Office', officer: 'officer_2' }
    };

    // Seed Users (ids, emails and passwords are used by the login quick buttons)
    const seedUsers = [
      {
        id: 'admin_1',
        name: 'System Administrator',
        email: 'admin@ecosort.gov',
        password_hash: 'admin123',
        role: 'admin',
        city: 'Bengaluru',
        ward: 'Greater Bengaluru Authority',
        points: 0,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: daysAgo(30),
        notification_preferences: { email: true, push: true, digest: true }
      },
      {
        id: 'officer_1',
        name: 'Ramesh Kumar - Asst. Executive Engineer (SWM), Central & East City Corporations',
        email: 'officer@ecosort.gov',
        password_hash: 'officer123',
        role: 'authority',
        city: 'Bengaluru',
        ward: 'Bengaluru Central City Corporation',
        department: 'swm',
        points: 0,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: daysAgo(25),
        notification_preferences: { email: true, push: true, digest: true }
      },
      {
        id: 'officer_2',
        name: 'Priya Menon - Asst. Executive Engineer (SWM), West, North & South City Corporations',
        email: 'priya.menon@ecosort.gov',
        password_hash: 'officer123',
        role: 'authority',
        city: 'Bengaluru',
        ward: 'Bengaluru West City Corporation',
        department: 'swm',
        points: 0,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: daysAgo(20),
        notification_preferences: { email: true, push: true, digest: true }
      },
      {
        id: 'citizen_1',
        name: 'Alex Turner',
        email: 'citizen@ecosort.gov',
        password_hash: 'citizen123',
        role: 'citizen',
        city: 'Bengaluru',
        ward: 'Indiranagar',
        points: 390,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: daysAgo(40),
        notification_preferences: { email: true, push: true, digest: true }
      },
      {
        id: 'citizen_2',
        name: 'Priya Sharma',
        email: 'sneha@gmail.com',
        password_hash: 'citizen123',
        role: 'citizen',
        city: 'Bengaluru',
        ward: 'Koramangala',
        points: 620,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: daysAgo(35),
        notification_preferences: { email: true, push: true, digest: false }
      },
      {
        id: 'citizen_3',
        name: 'Rohan Das',
        email: 'rohan@gmail.com',
        password_hash: 'citizen123',
        role: 'citizen',
        city: 'Bengaluru',
        ward: 'Malleswaram',
        points: 215,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: daysAgo(28),
        notification_preferences: { email: false, push: true, digest: true }
      },
      {
        id: 'citizen_4',
        name: 'Kabir Khan',
        email: 'kabir@gmail.com',
        password_hash: 'citizen123',
        role: 'citizen',
        city: 'Bengaluru',
        ward: 'K.R. Puram',
        points: 485,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: daysAgo(30),
        notification_preferences: { email: true, push: true, digest: true }
      },
      {
        id: 'citizen_5',
        name: 'Ananya Sen',
        email: 'ananya@gmail.com',
        password_hash: 'citizen123',
        role: 'citizen',
        city: 'Bengaluru',
        ward: 'Jayanagar',
        points: 150,
        google_oauth_id: null,
        avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
        created_at: daysAgo(15),
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

    // Complaint record as the server would have written it. Seed data never emails anyone:
    // fake inbox, no message id, and reminder_count already at the cap.
    const seedComplaint = (ticketId, officeId, sentHoursAgo) => ({
      ticket_id: ticketId, office_id: officeId, office_name: OFFICES[officeId].name,
      office_email: 'seed-only@example.invalid', officer_user_id: OFFICES[officeId].officer, complainer_email: '',
      sent_at: hoursAgo(sentHoursAgo), message_id: '', email_status: 'sent',
      last_activity_at: hoursAgo(Math.min(sentHoursAgo, 24)),
      reminder_count: 3, last_reminder_at: hoursAgo(Math.min(sentHoursAgo, 24)), replies: 0
    });

    // Builds an issue with the full field set. Times are in hours before now.
    const makeIssue = (o) => {
      const resolved = o.status === 'resolved';
      const issue = {
        id: o.id,
        title: o.title,
        description: o.description,
        category: o.category,
        severity: o.severity,
        status: o.status,
        media_urls: [o.photo],
        lat: o.lat,
        lng: o.lng,
        address: o.address,
        ward: o.ward,
        reporter_id: o.reporter_id,
        upvote_count: o.upvote_count,
        report_count: o.report_count,
        assigned_to: o.status === 'open' ? null : OFFICES[o.office].officer,
        department: o.category === 'construction_debris' ? 'engineering' : 'swm',
        ai_category: o.category,
        ai_severity: o.severity,
        ai_confidence: o.confidence,
        created_at: hoursAgo(o.created_h),
        updated_at: hoursAgo(resolved ? o.resolved_h : o.status === 'in_progress' ? Math.max(o.created_h - 20, 1) : o.created_h),
        resolved_at: resolved ? hoursAgo(o.resolved_h) : null,
        before_photo_url: o.photo,
        after_photo_url: resolved ? o.after_photo : null,
        ai_resolution_validated: resolved,
        ai_resolution_confidence: resolved ? o.after_match : null,
        est_weight_kg: o.est_weight_kg
      };
      if (o.ticket) issue.complaint = seedComplaint(o.ticket, o.office, Math.max(o.created_h - 0.25, 0.1));
      return issue;
    };

    // Seed Issues: 13 garbage complaints across all five GBA city corporations
    const seedIssues = [
      // ---- Open (5): two overdue past the 5-day reminder window, three from the last 24 hours ----
      makeIssue({
        id: 'issue_001', office: 'east', ticket: 'ECO-S001',
        title: 'Plastic Garbage Heap on 100 Feet Road Footpath, Indiranagar',
        description: 'A large heap of plastic bottles, food packaging and mixed waste has been dumped on the 100 Feet Road footpath in Defence Colony. It has grown for a week and now blocks half the walkway near the bus stop.',
        category: 'illegal_dumping', severity: 4, status: 'open', photo: mockImages.plastic_pile,
        lat: 12.9752, lng: 77.6411,
        address: '100 Feet Rd, Defence Colony, Indiranagar, Bengaluru, Karnataka 560038',
        ward: 'Indiranagar (Bengaluru Central)', reporter_id: 'citizen_1',
        upvote_count: 27, report_count: 3, confidence: 0.94, created_h: 7 * 24, est_weight_kg: 120
      }),
      makeIssue({
        id: 'issue_002', office: 'east_mahadevapura', ticket: 'ECO-S002',
        title: 'Construction Debris Dumped Near K.R. Puram Railway Station',
        description: 'Truckloads of broken concrete, tiles and bricks have been dumped on the approach road to Krishnarajapuram railway station in Darga Mohalla. Commuters and autos are forced onto the carriageway.',
        category: 'construction_debris', severity: 4, status: 'open', photo: mockImages.construction,
        lat: 13.0006, lng: 77.6743,
        address: 'Near Krishnarajapuram Railway Station, Darga Mohalla, K.R. Puram, Bengaluru, Karnataka 560016',
        ward: 'K.S. Nissar Ahmed Ward (Bengaluru East)', reporter_id: 'citizen_4',
        upvote_count: 34, report_count: 2, confidence: 0.91, created_h: 9 * 24, est_weight_kg: 650
      }),
      makeIssue({
        id: 'issue_003', office: 'east',
        title: 'Garbage Being Burnt in Open Plot off Indiranagar Double Road',
        description: 'Mixed garbage is set on fire every evening in the vacant plot off Indiranagar Double Road in Binnamangala. Thick smoke is entering nearby homes. Burning waste in the open is prohibited under the Solid Waste Management Rules.',
        category: 'waste_burning', severity: 5, status: 'open', photo: mockImages.burning,
        lat: 12.9829, lng: 77.6374,
        address: 'Indiranagar Double Rd, Binnamangala, Indiranagar, Bengaluru, Karnataka 560008',
        ward: 'Indiranagar (Bengaluru Central)', reporter_id: 'citizen_1',
        upvote_count: 19, report_count: 2, confidence: 0.97, created_h: 5, est_weight_kg: 35
      }),
      makeIssue({
        id: 'issue_004', office: 'south_bommanahalli', ticket: 'ECO-S004',
        title: 'Plastic Litter Along 10th Main Road, BTM Layout 2nd Stage',
        description: 'Plastic bottles, milk covers and snack wrappers are littered along 10th Main Road in BTM Layout 2nd Stage and are being washed into the roadside drain.',
        category: 'plastic_litter', severity: 2, status: 'open', photo: mockImages.plastic_litter,
        lat: 12.9140, lng: 77.6079,
        address: '10th Main Rd, BTM Layout 2nd Stage, Bengaluru, Karnataka 560076',
        ward: 'Viswamanava Kuvempu Ward (Bengaluru South)', reporter_id: 'citizen_2',
        upvote_count: 6, report_count: 1, confidence: 0.86, created_h: 2, est_weight_kg: 15
      }),
      makeIssue({
        id: 'issue_005', office: 'north_yelahanka', ticket: 'ECO-S005',
        title: 'Overflowing Community Bin on 7th B Main, Yelahanka New Town',
        description: 'The community bin on 7th B Main Road, Sector B, Yelahanka New Town has not been cleared. Garbage bags are spilling onto the road and stray dogs are scattering them.',
        category: 'overflowing_bin', severity: 3, status: 'open', photo: mockImages.overflowing_bin,
        lat: 13.0978, lng: 77.5812,
        address: '7th B Main Rd, Sector B, Yelahanka New Town, Bengaluru, Karnataka 560064',
        ward: 'Yelahanka Satellite Town (Bengaluru North)', reporter_id: 'citizen_5',
        upvote_count: 11, report_count: 1, confidence: 0.9, created_h: 14, est_weight_kg: 55
      }),

      // ---- In progress (4) ----
      makeIssue({
        id: 'issue_006', office: 'east', ticket: 'ECO-S006',
        title: 'Market Cardboard Waste Dumped Behind Shivajinagar Bus Station',
        description: 'Traders near Russell Market and Central Street are dumping cardboard cartons and packing waste behind Shivajinagar Bus Station every night instead of handing it to the collection vehicle.',
        category: 'illegal_dumping', severity: 3, status: 'in_progress', photo: mockImages.cardboard_bales,
        lat: 12.9831, lng: 77.6029,
        address: 'Central Street, Tasker Town, Shivajinagar, Bengaluru, Karnataka 560001',
        ward: 'Shivajinagar (Bengaluru Central)', reporter_id: 'citizen_3',
        upvote_count: 18, report_count: 2, confidence: 0.89, created_h: 3.5 * 24, est_weight_kg: 90
      }),
      makeIssue({
        id: 'issue_007', office: 'east_mahadevapura', ticket: 'ECO-S007',
        title: 'Garbage Piling Up Near Whitefield (Kadugodi) Station Road',
        description: 'Bins on the road leading to Whitefield (Kadugodi) railway station are overflowing and garbage is piling around them. Commuters walking to the station have to step over the waste.',
        category: 'overflowing_bin', severity: 3, status: 'in_progress', photo: mockImages.overflowing_bin,
        lat: 12.9957, lng: 77.7579,
        address: 'Whitefield (Kadugodi) Station Rd, Belathur, Bengaluru, Karnataka 560067',
        ward: 'Belathur (Bengaluru East)', reporter_id: 'citizen_4',
        upvote_count: 15, report_count: 1, confidence: 0.88, created_h: 2.5 * 24, est_weight_kg: 45
      }),
      makeIssue({
        id: 'issue_008', office: 'south_bommanahalli', ticket: 'ECO-S008',
        title: 'Commercial Cardboard Dump in Koramangala 6th Block',
        description: 'Shops and restaurants near Srinivagilu Main Road, Koramangala 6th Block, are dumping cardboard and packaging waste on the corner of an empty plot. The spot is turning into a garbage black spot.',
        category: 'illegal_dumping', severity: 3, status: 'in_progress', photo: mockImages.cardboard_dump,
        lat: 12.9401, lng: 77.6251,
        address: 'Srinivagilu Main Rd, Koramangala 6th Block, Bengaluru, Karnataka 560095',
        ward: 'Sri Lakshmi Devi Ward (Bengaluru South)', reporter_id: 'citizen_2',
        upvote_count: 22, report_count: 2, confidence: 0.9, created_h: 1.2 * 24, est_weight_kg: 110
      }),
      makeIssue({
        id: 'issue_009', office: 'west_malleswaram', ticket: 'ECO-S009',
        title: 'Plastic Waste Littered Along Sampige Road, Malleswaram',
        description: 'Plastic bags, cups and flower-market waste are littered along Sampige Road in Malleswaram after the evening market and are not being swept up.',
        category: 'plastic_litter', severity: 2, status: 'in_progress', photo: mockImages.plastic_litter,
        lat: 13.0057, lng: 77.5712,
        address: 'Sampige Rd, Malleswaram, Bengaluru, Karnataka 560003',
        ward: 'Malleswaram (Bengaluru West)', reporter_id: 'citizen_3',
        upvote_count: 9, report_count: 1, confidence: 0.87, created_h: 4.2 * 24, est_weight_kg: 30
      }),

      // ---- Resolved (4) with cleanup photos ----
      makeIssue({
        id: 'issue_010', office: 'east', ticket: 'ECO-S010',
        title: 'Black Spot of Dumped Cardboard Under Domlur Flyover',
        description: 'Cardboard and packaging waste had been dumped under the Domlur Flyover in Gowtham Colony for weeks, turning the spot into a garbage black spot.',
        category: 'illegal_dumping', severity: 3, status: 'resolved', photo: mockImages.cardboard_dump,
        after_photo: mockImages.cleaned_bins, after_match: 0.91,
        lat: 12.9583, lng: 77.6414,
        address: 'Domlur Flyover, Gowtham Colony, Domlur, Bengaluru, Karnataka 560017',
        ward: 'Domlur (Bengaluru Central)', reporter_id: 'citizen_1',
        upvote_count: 12, report_count: 2, confidence: 0.87, created_h: 27 * 24, resolved_h: 22 * 24, est_weight_kg: 320
      }),
      makeIssue({
        id: 'issue_011', office: 'east_mahadevapura', ticket: 'ECO-S011',
        title: 'Plastic Bottles Dumped Near Marathahalli Bridge, Varthur Road',
        description: 'Plastic bottles and wrappers had been dumped along the Varthur Road side of Marathahalli Bridge, on the Outer Ring Road stretch, clogging the drain.',
        category: 'plastic_litter', severity: 3, status: 'resolved', photo: mockImages.plastic_litter,
        after_photo: mockImages.cleaned_bins_2, after_match: 0.88,
        lat: 12.9567, lng: 77.7046,
        address: 'Marathahalli Bridge, Varthur Rd, Ashwath Nagar, Bengaluru, Karnataka 560037',
        ward: 'Priyadarshini Ward (Bengaluru East)', reporter_id: 'citizen_4',
        upvote_count: 16, report_count: 1, confidence: 0.92, created_h: 21 * 24, resolved_h: 17 * 24, est_weight_kg: 60
      }),
      makeIssue({
        id: 'issue_012', office: 'south_jayanagar', ticket: 'ECO-S012',
        title: 'Overflowing Bins on 9th Main Road, Jayanagar 4th Block',
        description: 'The bins on 9th Main Road near Geetha Colony, Jayanagar 4th Block, were overflowing onto the pavement for several days after the weekend shopping rush.',
        category: 'overflowing_bin', severity: 3, status: 'resolved', photo: mockImages.overflowing_bin,
        after_photo: mockImages.cleaned_bins, after_match: 0.93,
        lat: 12.9266, lng: 77.5835,
        address: '9th Main Rd, Geetha Colony, Jayanagar 4th Block, Bengaluru, Karnataka 560011',
        ward: 'Jayanagar 4th Block (Bengaluru South)', reporter_id: 'citizen_5',
        upvote_count: 21, report_count: 2, confidence: 0.9, created_h: 16 * 24, resolved_h: 14 * 24, est_weight_kg: 70
      }),
      makeIssue({
        id: 'issue_013', office: 'west_malleswaram', ticket: 'ECO-S013',
        title: 'Roadside Garbage Dump on Nagarabhavi Road, Govindaraja Nagar',
        description: 'A heap of plastic and mixed household waste had been dumped along Nagarabhavi Road near M C Layout in Govindaraja Nagar, attracting rats and blocking the footpath.',
        category: 'illegal_dumping', severity: 4, status: 'resolved', photo: mockImages.plastic_pile,
        after_photo: mockImages.cleaned_bins_2, after_match: 0.9,
        lat: 12.9756, lng: 77.5367,
        address: 'Nagarabhavi Rd, M C Layout, Govindaraja Nagar, Bengaluru, Karnataka 560040',
        ward: 'Dr. Vishnuvardhan Ward (Bengaluru West)', reporter_id: 'citizen_3',
        upvote_count: 32, report_count: 3, confidence: 0.95, created_h: 12 * 24, resolved_h: 8 * 24, est_weight_kg: 180
      })
    ];

    for (const issue of seedIssues) {
      await this.put('issues', issue);
      const officeName = issue.complaint ? issue.complaint.office_name : 'the city corporation';

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
          note: `Assigned to the SWM team at ${officeName}.`,
          created_at: new Date(new Date(issue.created_at).getTime() + 12 * HOUR).toISOString()
        });

        await this.put('issue_timeline', {
          id: `t_${issue.id}_3`,
          issue_id: issue.id,
          actor_id: issue.assigned_to,
          actor_role: 'authority',
          action: 'status_changed',
          note: 'Status changed to In Progress. Pourakarmika cleanup crew dispatched.',
          created_at: new Date(new Date(issue.created_at).getTime() + 20 * HOUR).toISOString()
        });
      }

      if (issue.status === 'resolved') {
        await this.put('issue_timeline', {
          id: `t_${issue.id}_4`,
          issue_id: issue.id,
          actor_id: issue.assigned_to,
          actor_role: 'system_ai',
          action: 'ai_validated',
          note: `Cleanup photo verified against the original report photo (match: ${(issue.ai_resolution_confidence * 100).toFixed(0)}%).`,
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
      { id: 'v_1', issue_id: 'issue_001', user_id: 'citizen_2', type: 'upvote', content: null, created_at: daysAgo(5) },
      { id: 'v_2', issue_id: 'issue_001', user_id: 'citizen_3', type: 'upvote', content: null, created_at: daysAgo(4.5) },
      {
        id: 'v_3', issue_id: 'issue_001', user_id: 'citizen_2', type: 'comment',
        content: 'This plastic heap on 100 Feet Road keeps growing and the smell near the bus stop is terrible. I also called 1533, please clear it soon!',
        created_at: daysAgo(3)
      },
      {
        id: 'v_4', issue_id: 'issue_001', user_id: 'citizen_4', type: 'comment',
        content: 'I reported this dump too and my report was merged into this one. A week and still no pickup.',
        created_at: daysAgo(1)
      },
      {
        id: 'v_5', issue_id: 'issue_002', user_id: 'citizen_1', type: 'comment',
        content: 'The debris pile near K.R. Puram station is getting bigger every night. Someone is bringing it in by tractor.',
        created_at: daysAgo(4)
      },
      { id: 'v_6', issue_id: 'issue_006', user_id: 'citizen_1', type: 'upvote', content: null, created_at: hoursAgo(30) },
      {
        id: 'v_7', issue_id: 'issue_006', user_id: 'citizen_2', type: 'comment',
        content: 'Fresh cartons are dumped here after the market closes every night. Hope the corporation also fines the shops this time.',
        created_at: hoursAgo(20)
      },
      { id: 'v_8', issue_id: 'issue_003', user_id: 'citizen_4', type: 'upvote', content: null, created_at: hoursAgo(3) },
      {
        id: 'v_9', issue_id: 'issue_003', user_id: 'citizen_5', type: 'comment',
        content: 'The smoke reached our balcony again this evening. Burning garbage in the open is banned, please stop this.',
        created_at: hoursAgo(2)
      },
      {
        id: 'v_10', issue_id: 'issue_013', user_id: 'citizen_2', type: 'comment',
        content: 'Walked past today and the footpath on Nagarabhavi Road is finally clear. Thank you!',
        created_at: daysAgo(7.5)
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
      { id: 'b_1', user_id: 'citizen_1', badge_type: 'first_reporter', awarded_at: daysAgo(39) },
      { id: 'b_2', user_id: 'citizen_1', badge_type: 'streak_master', awarded_at: daysAgo(5) },
      { id: 'b_3', user_id: 'citizen_2', badge_type: 'first_reporter', awarded_at: daysAgo(34) },
      { id: 'b_4', user_id: 'citizen_2', badge_type: 'watchdog', awarded_at: daysAgo(10) },
      { id: 'b_5', user_id: 'citizen_2', badge_type: 'community_hero', awarded_at: daysAgo(2) }
    ];

    for (const b of seedBadges) {
      await this.put('badges', b);
    }

    // Seed Predictions (Hotspots). GeoJSON order: [lng, lat]
    // Zones chosen from real repeat-dumping areas: K.R. Puram/Mahadevapura had the smallest
    // black-spot reduction in the city (BSWML data, Feb 2026); 100 Feet Road and Double Road
    // in Indiranagar carry repeat reports in this demo data.
    const seedPredictions = [
      {
        id: 'pred_1',
        zone_polygon: { type: 'Polygon', coordinates: [[[77.6680, 12.9960], [77.6800, 12.9960], [77.6800, 13.0050], [77.6680, 13.0050], [77.6680, 12.9960]]] },
        predicted_category: 'construction_debris',
        risk_score: 89,
        historical_count: 17,
        prediction_date: daysAgo(2),
        expires_at: hoursAgo(-5 * 24),
        generated_by_ai: true
      },
      {
        id: 'pred_2',
        zone_polygon: { type: 'Polygon', coordinates: [[[77.6360, 12.9720], [77.6450, 12.9720], [77.6450, 12.9850], [77.6360, 12.9850], [77.6360, 12.9720]]] },
        predicted_category: 'illegal_dumping',
        risk_score: 84,
        historical_count: 14,
        prediction_date: daysAgo(2),
        expires_at: hoursAgo(-5 * 24),
        generated_by_ai: true
      },
      {
        id: 'pred_3',
        zone_polygon: { type: 'Polygon', coordinates: [[[77.6200, 12.9360], [77.6300, 12.9360], [77.6300, 12.9440], [77.6200, 12.9440], [77.6200, 12.9360]]] },
        predicted_category: 'illegal_dumping',
        risk_score: 71,
        historical_count: 9,
        prediction_date: daysAgo(1),
        expires_at: hoursAgo(-6 * 24),
        generated_by_ai: true
      }
    ];

    for (const p of seedPredictions) {
      await this.put('hotspot_predictions', p);
    }

    // Seed Monthly Reports: last full calendar month (relative to now), city-wide totals.
    // city_context holds published figures with their sources (see project report).
    const prev = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const repMonth = prev.getMonth() + 1;
    const repYear = prev.getFullYear();
    const seedReports = [
      {
        id: `report_${repMonth}_${repYear}`,
        month: repMonth,
        year: repYear,
        city: 'Bengaluru',
        total_reported: 168,
        total_resolved: 131,
        avg_resolution_hours: 41.5,
        avg_resolution_days: 1.7,
        department_breakdown: {
          swm: { reported: 134, resolved: 106 },
          engineering: { reported: 26, resolved: 19 },
          health: { reported: 8, resolved: 6 }
        },
        category_breakdown: {
          illegal_dumping: 52,
          overflowing_bin: 41,
          waste_burning: 17,
          construction_debris: 26,
          plastic_litter: 19,
          e_waste: 5,
          other: 8
        },
        corporation_breakdown: {
          central: 38, east: 41, west: 36, north: 24, south: 29
        },
        city_context: {
          civic_body: 'Greater Bengaluru Authority (GBA) with five city corporations: Central, East, West, North and South (in force since 2 Sep 2025)',
          daily_waste_tonnes: 5880,
          daily_processing_capacity_tonnes: 4105,
          cnd_waste_tonnes_per_day: 6000,
          garbage_blackspots_sep_2025: 1144,
          garbage_blackspots_feb_2026: 823,
          helpline: '1533 (toll-free) / WhatsApp 9448197197 / Sahaya 2.0 app',
          segregation_rule: 'Solid Waste Management Rules, 2026: four-stream segregation at source (wet, dry, sanitary, special care), in force from 1 Apr 2026'
        },
        is_public: true,
        pdf_url: `report_${repMonth}_${repYear}.pdf`,
        generated_at: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      }
    ];

    for (const r of seedReports) {
      await this.put('monthly_reports', r);
    }

    const ops = this._batch;
    this._batch = null;
    ops.push({ op: 'put', store: 'meta', doc: { id: 'seed', version: SEED_VERSION } });
    const res = await fetch(`${CONFIG.API_BASE}/api/db-batch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ops })
    });
    if (!res.ok) throw new Error(`Seeding failed (${res.status})`);
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
        <text x="580" y="38" fill="#94A3B8" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="800" text-anchor="end" letter-spacing="1">ECOSORT</text>
        <text x="30" y="370" fill="#FFFFFF" font-family="'Plus Jakarta Sans', sans-serif" font-size="20" font-weight="800">${category.toUpperCase().replace('_', ' ')} REPORT</text>
      </svg>
    `;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
};

window.DB = DB;

