// js/ai.js
// Thin client: all Gemini calls run on the server (the API key never reaches the browser)

const AI = {
  async post(path, body) {
    const res = await fetch(`${CONFIG.API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`${path} failed (${res.status})`);
    return res.json();
  },

  analyzeDump(imageDataUrl) { return this.post('/api/analyze', { image: imageDataUrl }); },
  validateResolution(before, after) { return this.post('/api/verify-cleanup', { before, after }); },
  runWeeklyAnalysis(issues) { return this.post('/api/hotspots', { issues }); },
  transcribeAudio(audioDataUrl) { return this.post('/api/transcribe', { audio: audioDataUrl }); }
};

window.AI = AI;
