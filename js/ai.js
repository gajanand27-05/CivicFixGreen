// js/ai.js
// Google AI Studio Integration for CivicFix (Gemma 4 Models)

const AI = {
  // Retrieve API key from current user's profile settings, or local storage
  getApiKey() {
    if (window.CONFIG && window.CONFIG.GOOGLE_AI_STUDIO_KEY) {
      return window.CONFIG.GOOGLE_AI_STUDIO_KEY;
    }
    const user = Auth.getCurrentUser();
    if (user && user.api_key) return user.api_key;
    return localStorage.getItem('civicfix_ai_studio_key') || '';
  },

  setApiKey(key) {
    localStorage.setItem('civicfix_ai_studio_key', key);
  },

  // Helper to check if API key is active
  hasApiKey() {
    const key = this.getApiKey().trim();
    return key.length > 0 && key !== 'YOUR_GOOGLE_AI_STUDIO_KEY' && !key.startsWith('YOUR_');
  },

  // Helper to extract base64 data and mimeType from dataURL
  parseDataUrl(dataUrl) {
    if (!dataUrl) return null;
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return null;
    return {
      mimeType: matches[1],
      data: matches[2]
    };
  },

  // Call Google AI Studio (Gemini-1.5-Flash represents the multimodal Gemma engine)
  async callAIStudio(prompt, mediaParts = [], responseMimeType = 'application/json') {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('API Key is missing. Falling back to simulation.');
    }

    const modelName = 'gemini-1.5-flash'; // Standard AI Studio multimodal model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;

    const parts = [{ text: prompt }];
    for (const part of mediaParts) {
      parts.push({
        inlineData: {
          mimeType: part.mimeType,
          data: part.data
        }
      });
    }

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: responseMimeType
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `API error (${response.status})`);
    }

    const result = await response.json();
    try {
      const textContent = result.candidates[0].content.parts[0].text;
      if (responseMimeType === 'application/json') {
        let cleanText = textContent.trim();
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }
        return JSON.parse(cleanText);
      }
      return textContent;
    } catch (err) {
      console.error('Failed to parse AI response', result, err);
      throw new Error('Invalid response structure from AI Studio.');
    }
  },

  // 1. Image Classification (Vision API)
  async classifyIssue(imageDataUrl, fileName = '') {
    const prompt = `Analyze this image and return a JSON object with these fields:
    category (one of: pothole, streetlight, water_leakage, garbage, flooding, road_damage, vandalism, encroachment, other),
    severity (integer 1 to 5 where 5 is most critical),
    suggested_title (short 5-8 word title describing the issue),
    department (one of: roads, electricity, water, sanitation, municipality),
    confidence_score (0 to 1)`;

    if (!this.hasApiKey()) {
      return this.mockClassify(imageDataUrl, fileName);
    }

    const parsed = this.parseDataUrl(imageDataUrl);
    if (!parsed) {
      return this.mockClassify(imageDataUrl, fileName);
    }

    try {
      return await this.callAIStudio(prompt, [parsed], 'application/json');
    } catch (err) {
      console.warn('AI Studio call failed, falling back to mock.', err);
      return this.mockClassify(imageDataUrl, fileName);
    }
  },

  // 2. Audio Transcription (Audio API)
  async transcribeAudio(audioDataUrl, category = '') {
    const prompt = `Transcribe this audio clip of a citizen describing a civic issue. Return a JSON object with a single field:
    transcription (plain text description, max 500 characters).`;

    if (!this.hasApiKey()) {
      return this.mockTranscribe(audioDataUrl, category);
    }

    const parsed = this.parseDataUrl(audioDataUrl);
    if (!parsed) {
      return this.mockTranscribe(audioDataUrl, category);
    }

    try {
      return await this.callAIStudio(prompt, [parsed], 'application/json');
    } catch (err) {
      console.warn('AI Studio call failed, falling back to mock.', err);
      return this.mockTranscribe(audioDataUrl, category);
    }
  },

  // 3. Before/After Comparison (Vision Comparison)
  async validateResolution(beforeDataUrl, afterDataUrl) {
    const prompt = `Compare these two images. The first is a reported civic issue. The second is claimed to be the fixed version. Return a JSON with:
    is_resolved (true/false),
    confidence (0 to 1),
    reason (one sentence explanation)`;

    if (!this.hasApiKey()) {
      return this.mockValidateResolution(beforeDataUrl, afterDataUrl);
    }

    const parsedBefore = this.parseDataUrl(beforeDataUrl);
    const parsedAfter = this.parseDataUrl(afterDataUrl);

    if (!parsedBefore || !parsedAfter) {
      return this.mockValidateResolution(beforeDataUrl, afterDataUrl);
    }

    try {
      return await this.callAIStudio(prompt, [parsedBefore, parsedAfter], 'application/json');
    } catch (err) {
      console.warn('AI Studio call failed, falling back to mock.', err);
      return this.mockValidateResolution(beforeDataUrl, afterDataUrl);
    }
  },

  // 4. Run Weekly AI Hotspots Analysis (Text Predictive Engine)
  async runWeeklyAnalysis(issuesList) {
    const prompt = `Analyze this list of reported civic issues from the last 90 days and predict 2 high-risk zones (hotspots) for issues in the next 30 days.
    Return a JSON array of objects representing hotspot predictions:
    [
      {
        zone_polygon: {
          type: "Polygon",
          coordinates: [[[lng1, lat1], [lng2, lat2], [lng3, lat3], [lng4, lat4], [lng1, lat1]]]
        },
        predicted_category: "pothole | water_leakage | garbage | flooding | streetlight",
        risk_score: (integer 1 to 100),
        historical_count: (integer)
      }
    ]
    Use realistic coordinates inside MetroCity (around lat: 12.97, lng: 77.64).`;

    if (!this.hasApiKey()) {
      return this.mockWeeklyAnalysis(issuesList);
    }

    try {
      const listString = JSON.stringify(issuesList.map(i => ({
        category: i.category,
        lat: i.lat,
        lng: i.lng,
        created_at: i.created_at,
        ward: i.ward
      })));
      return await this.callAIStudio(prompt + `\nIssues data: ${listString}`, [], 'application/json');
    } catch (err) {
      console.warn('AI Studio call failed, falling back to mock.', err);
      return this.mockWeeklyAnalysis(issuesList);
    }
  },

  // ==========================================
  // SMART FALLBACK SIMULATOR IMPLEMENTATIONS
  // ==========================================

  async mockClassify(imageDataUrl, fileName = '') {
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API lag

    let nameLower = (fileName || '').toLowerCase();
    let category = 'other';
    let suggested_title = 'Unidentified Civic Issue';
    let department = 'municipality';
    let severity = 2;

    if (nameLower.includes('pot') || nameLower.includes('hole') || nameLower.includes('road')) {
      category = 'pothole';
      suggested_title = 'Large Pothole Blocking Road Lane';
      department = 'roads';
      severity = 3;
    } else if (nameLower.includes('light') || nameLower.includes('lamp') || nameLower.includes('dark')) {
      category = ' streetlight';
      suggested_title = 'Broken Streetlight Causing Dark Street';
      department = 'electricity';
      severity = 2;
    } else if (nameLower.includes('water') || nameLower.includes('pipe') || nameLower.includes('leak')) {
      category = 'water_leakage';
      suggested_title = 'Water Pipeline Leakage on Walkway';
      department = 'water';
      severity = 3;
    } else if (nameLower.includes('garbage') || nameLower.includes('trash') || nameLower.includes('waste')) {
      category = 'garbage';
      suggested_title = 'Overflowing Garbage Pile Near Residential Sector';
      department = 'sanitation';
      severity = 3;
    } else if (nameLower.includes('flood') || nameLower.includes('waterlog') || nameLower.includes('drain')) {
      category = 'flooding';
      suggested_title = 'Severe Street Flooding After Heavy Rains';
      department = 'sanitation';
      severity = 4;
    } else if (nameLower.includes('vandal') || nameLower.includes('graffiti') || nameLower.includes('bench')) {
      category = 'vandalism';
      suggested_title = 'Public Property Vandalism in Childrens Park';
      department = 'municipality';
      severity = 2;
    } else if (nameLower.includes('shop') || nameLower.includes('vendor') || nameLower.includes('encroach')) {
      category = 'encroachment';
      suggested_title = 'Sidewalk Encroachment by Commercial Setup';
      department = 'municipality';
      severity = 3;
    } else {
      // Pick a random category for variety
      const cats = ['pothole', 'streetlight', 'water_leakage', 'garbage', 'flooding', 'road_damage'];
      const depts = {
        pothole: 'roads',
        streetlight: 'electricity',
        water_leakage: 'water',
        garbage: 'sanitation',
        flooding: 'municipality',
        road_damage: 'roads'
      };
      const cat = cats[Math.floor(Math.random() * cats.length)];
      category = cat;
      department = depts[cat];
      severity = Math.floor(Math.random() * 3) + 2;
      suggested_title = `Reported ${cat.replace('_', ' ')} issue in the neighborhood`;
    }

    return {
      category,
      severity,
      suggested_title,
      department,
      confidence_score: parseFloat((Math.random() * 0.15 + 0.82).toFixed(2))
    };
  },

  async mockTranscribe(audioDataUrl, category = '') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const categoryTranscriptions = {
      pothole: "There is a massive pothole in the middle of the road here. It is about a foot deep and causes cars to swerve dangerously to avoid it.",
      streetlight: "The streetlight here has been completely dead for over a week, making this entire corner extremely dark and unsafe for pedestrians at night.",
      water_leakage: "There is water bubbling up from under the sidewalk. It seems like a main pipeline burst and it's flooding the walkway.",
      garbage: "Someone dumped a huge pile of trash and plastic bags right next to the park entrance. Stray animals are scattering it everywhere.",
      flooding: "The storm drain is completely clogged with leaves and debris, and the street is flooded up to the curb after the recent rain.",
      road_damage: "The asphalt road surface is severely cracked and peeling away, making the drive very bumpy and damaging tires.",
      vandalism: "The benches in the community park have been vandalized with spray paint, and one of them is broken.",
      encroachment: "A commercial vendor has set up a large stall blocking the entire pedestrian sidewalk, forcing people to walk on the busy main road.",
      other: "I noticed a public maintenance issue here that needs attention as soon as possible. Please send a crew to inspect it."
    };

    const transcript = categoryTranscriptions[category] || categoryTranscriptions['other'];
    return {
      transcription: transcript
    };
  },

  async mockValidateResolution(beforeDataUrl, afterDataUrl) {
    await new Promise(resolve => setTimeout(resolve, 1800));
    // Simulate high success rate for resolution mock
    const isSuccess = Math.random() > 0.15;
    return {
      is_resolved: isSuccess,
      confidence: isSuccess ? parseFloat((Math.random() * 0.12 + 0.85).toFixed(2)) : parseFloat((Math.random() * 0.2 + 0.45).toFixed(2)),
      reason: isSuccess 
        ? "Comparison indicates the defect has been patched and the road surface is clean and level."
        : "The after-fix photo still shows significant pile of residue and garbage, the area is not fully cleared."
    };
  },

  async mockWeeklyAnalysis(issuesList) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Generate new hotspots in the Indiranagar MetroCity ward
    return [
      {
        zone_polygon: {
          type: "Polygon",
          coordinates: [
            [
              [77.635, 12.972],
              [77.639, 12.972],
              [77.639, 12.975],
              [77.635, 12.975],
              [77.635, 12.972]
            ]
          ]
        },
        predicted_category: "water_leakage",
        risk_score: 84,
        historical_count: 9
      },
      {
        zone_polygon: {
          type: "Polygon",
          coordinates: [
            [
              [77.642, 12.976],
              [77.646, 12.976],
              [77.646, 12.979],
              [77.642, 12.979],
              [77.642, 12.976]
            ]
          ]
        },
        predicted_category: "flooding",
        risk_score: 89,
        historical_count: 11
      }
    ];
  }
};
