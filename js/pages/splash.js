// js/pages/splash.js
// Onboarding and Splash screen

const SplashPage = {
  isPublic: true,
  currentSlide: 0,

  async render() {
    return `
      <div class="splash-container">
        <div class="splash-slides" id="splash-slides-container">

          <div class="splash-slide active-slide" data-index="0">
            <img src="assets/ecosort-logo.png" alt="EcoSort" class="splash-logo">
            <h1 class="splash-title">Keep Bengaluru clean</h1>
            <p class="splash-desc">Spotted a garbage dump? Report it to BBMP in under a minute.</p>
          </div>

          <div class="splash-slide" data-index="1">
            <div class="splash-icon"><i data-lucide="camera"></i></div>
            <h1 class="splash-title">Snap a photo</h1>
            <p class="splash-desc">Snap a photo, we handle the rest: location, ward and the complaint email.</p>
          </div>

          <div class="splash-slide" data-index="2">
            <div class="splash-icon"><i data-lucide="badge-check"></i></div>
            <h1 class="splash-title">Track it till it's clean</h1>
            <p class="splash-desc">We follow up with BBMP and close it only after a verified cleanup photo.</p>
          </div>

        </div>

        <div class="splash-controls">
          <div class="splash-dots" id="splash-dots-container">
            <span class="splash-dot active" data-index="0"></span>
            <span class="splash-dot" data-index="1"></span>
            <span class="splash-dot" data-index="2"></span>
          </div>
          <button class="btn splash-next-btn" id="splash-action-btn">Next</button>
          <button type="button" class="splash-skip" id="splash-skip-btn">Skip</button>
        </div>
      </div>
    `;
  },

  async mount() {
    this.currentSlide = 0;
    const btn = document.getElementById('splash-action-btn');
    const dots = document.querySelectorAll('.splash-dot');
    const slides = document.querySelectorAll('.splash-slide');

    const finish = () => {
      localStorage.setItem('ecosort_seen_splash', 'true');
      Router.navigate('#/home');
    };

    btn.addEventListener('click', () => {
      if (this.currentSlide < 2) {
        this.currentSlide++;
        this.updateSlideState(slides, dots, btn);
      } else {
        finish();
      }
    });

    const skip = document.getElementById('splash-skip-btn');
    if (skip) skip.addEventListener('click', finish);

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

    const skip = document.getElementById('splash-skip-btn');
    if (skip) skip.style.visibility = this.currentSlide === 2 ? 'hidden' : 'visible';

    if (this.currentSlide === 2) {
      btn.innerText = 'Get started';
    } else {
      btn.innerText = 'Next';
    }
  }
};
