// js/pages/splash.js
// Onboarding and Splash screen

const SplashPage = {
  isPublic: true,
  currentSlide: 0,

  async render() {
    return `
      <div class="splash-container">
        <div class="splash-slides" id="splash-slides-container">
          
          <!-- Slide 1 -->
          <div class="splash-slide active-slide" data-index="0">
            <div class="splash-graphic">
              <svg viewBox="0 0 200 200" width="100%" height="100%">
                <circle cx="100" cy="100" r="80" fill="rgba(59, 130, 246, 0.1)"/>
                <path d="M100,30 C65,30 35,60 35,95 C35,145 100,180 100,180 C100,180 165,145 165,95 C165,60 135,30 100,30 Z" fill="#2563EB"/>
                <circle cx="100" cy="95" r="30" fill="#FFFFFF"/>
                <path d="M85,95 L95,105 L115,85" fill="none" stroke="#2563EB" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M50,140 Q100,110 150,140" stroke="#93C5FD" stroke-width="4" fill="none"/>
              </svg>
            </div>
            <h1 class="splash-title">Welcome to CivicFix</h1>
            <p class="splash-desc">Make your community a better place. Report potholes, broken streetlights, waste overflow, and water leakages directly to city authorities in seconds.</p>
          </div>

          <!-- Slide 2 -->
          <div class="splash-slide" data-index="1">
            <div class="splash-graphic">
              <svg viewBox="0 0 200 200" width="100%" height="100%">
                <rect x="40" y="30" width="120" height="140" rx="15" fill="#334155"/>
                <rect x="48" y="45" width="104" height="100" rx="8" fill="#1E293B"/>
                <circle cx="100" cy="155" r="8" fill="#94A3B8"/>
                <rect x="60" y="55" width="80" height="50" rx="5" fill="#1E3A8A"/>
                <path d="M100,60 L100,80 M90,70 L110,70" stroke="#60A5FA" stroke-width="4" stroke-linecap="round"/>
                <!-- AI Scanning Overlay -->
                <line x1="48" y1="80" x2="152" y2="80" stroke="#3B82F6" stroke-width="2" stroke-dasharray="4,4">
                  <animate attributeName="y1" values="45;145;45" dur="3s" repeatCount="indefinite"/>
                  <animate attributeName="y2" values="45;145;45" dur="3s" repeatCount="indefinite"/>
                </line>
                <!-- AI Sparkle -->
                <path d="M130,55 L135,62 L142,65 L135,68 L130,75 L125,68 L118,65 L125,62 Z" fill="#F59E0B"/>
              </svg>
            </div>
            <h1 class="splash-title">AI-Powered Classification</h1>
            <p class="splash-desc">Just snap a photo. CivicFix uses Gemma 4 Vision AI to automatically classify the issue, suggest a title, map the coordinates, and assign the proper department.</p>
          </div>

          <!-- Slide 3 -->
          <div class="splash-slide" data-index="2">
            <div class="splash-graphic">
              <svg viewBox="0 0 200 200" width="100%" height="100%">
                <!-- Timeline elements -->
                <circle cx="50" cy="100" r="16" fill="#10B981"/>
                <path d="M44,100 L48,104 L56,96" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
                <line x1="66" y1="100" x2="134" y2="100" stroke="#E2E8F0" stroke-width="6"/>
                <circle cx="150" cy="100" r="16" fill="#6B7280"/>
                <text x="150" y="105" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">Fix</text>
                <!-- Award Ribbon -->
                <path d="M90,40 L110,40 L105,75 L95,75 Z" fill="#F59E0B"/>
                <path d="M100,20 C110,20 120,30 120,40 C120,50 110,60 100,60 C90,60 80,50 80,40 C80,30 90,20 100,20 Z" fill="#FBBF24"/>
                <text x="100" y="45" fill="#78350F" font-size="10" font-weight="bold" text-anchor="middle">50</text>
              </svg>
            </div>
            <h1 class="splash-title">Track & Earn Rewards</h1>
            <p class="splash-desc">Stay informed with real-time timeline updates. Upvote reports to build community consensus, earn reward points, and claim your place on the leaderboard!</p>
          </div>

        </div>

        <div class="splash-controls">
          <div class="splash-dots" id="splash-dots-container">
            <span class="splash-dot active" data-index="0"></span>
            <span class="splash-dot" data-index="1"></span>
            <span class="splash-dot" data-index="2"></span>
          </div>
          <button class="btn splash-next-btn" id="splash-action-btn">Next</button>
        </div>
      </div>
    `;
  },

  async mount() {
    this.currentSlide = 0;
    const btn = document.getElementById('splash-action-btn');
    const dots = document.querySelectorAll('.splash-dot');
    const slides = document.querySelectorAll('.splash-slide');

    btn.addEventListener('click', () => {
      if (this.currentSlide < 2) {
        this.currentSlide++;
        this.updateSlideState(slides, dots, btn);
      } else {
        // Complete Onboarding
        localStorage.setItem('civicfix_seen_splash', 'true');
        // Route to home
        Router.navigate('#/home');
      }
    });

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        this.currentSlide = idx;
        this.updateSlideState(slides, dots, btn);
      });
    });
  },

  updateSlideState(slides, dots, btn) {
    slides.forEach((slide, idx) => {
      slide.classList.remove('active-slide');
      dots[idx].classList.remove('active');
      if (idx === this.currentSlide) {
        slide.classList.add('active-slide');
        dots[idx].classList.add('active');
      }
    });

    if (this.currentSlide === 2) {
      btn.innerText = 'Get Started';
    } else {
      btn.innerText = 'Next';
    }
  }
};
