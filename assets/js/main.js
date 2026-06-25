// DeepSeal Website — Main JS (Premium Theme)
// Enhanced with staggered scroll reveals, count-up animation, back-to-top

// Nav scroll effect
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
  // Back to top
  const backTop = document.getElementById('backTop');
  if (backTop) backTop.classList.toggle('visible', window.scrollY > 400);
});

// Back to top click
document.getElementById('backTop')?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Mobile hamburger menu
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
hamburger.addEventListener('click', () => {
  mobileNav.classList.toggle('open');
});
mobileNav.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileNav.classList.remove('open'));
});

// Scroll reveal with staggered delays
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

// Add reveal class + staggered delay to groups of elements
function setupRevealElements() {
  // Feature cards with stagger
  document.querySelectorAll('.features-grid .feature-card').forEach((el, i) => {
    el.classList.add('reveal', `reveal-delay-${Math.min(i, 6)}`);
    revealObserver.observe(el);
  });

  // Case cards with stagger
  document.querySelectorAll('.cases-grid .case-card').forEach((el, i) => {
    el.classList.add('reveal', `reveal-delay-${Math.min(i, 4)}`);
    revealObserver.observe(el);
  });

  // Pricing cards with stagger
  document.querySelectorAll('.pricing-card').forEach((el, i) => {
    el.classList.add('reveal', `reveal-delay-${i + 1}`);
    revealObserver.observe(el);
  });

  // Stats items with stagger
  document.querySelectorAll('.stat-item').forEach((el, i) => {
    el.classList.add('reveal', `reveal-delay-${i}`);
    revealObserver.observe(el);
  });

  // Encrypt steps with stagger
  document.querySelectorAll('.encrypt-step').forEach((el, i) => {
    el.classList.add('reveal', `reveal-delay-${i + 1}`);
    revealObserver.observe(el);
  });

  // Encrypt benefits with stagger
  document.querySelectorAll('.encrypt-benefit').forEach((el, i) => {
    el.classList.add('reveal', `reveal-delay-${i}`);
    revealObserver.observe(el);
  });

  // Section tags & eyebrows
  document.querySelectorAll('.section-tag, .section-eyebrow').forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });

  // Compare table
  document.querySelectorAll('.compare-table-wrap').forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });

  // Ring labels
  document.querySelectorAll('.ring-label').forEach((el, i) => {
    el.classList.add('reveal', `reveal-delay-${i}`);
    revealObserver.observe(el);
  });
}

// Count-up animation for stats
function animateCountUp() {
  const statNums = document.querySelectorAll('.stat-num[data-target]');
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.animated) {
        entry.target.dataset.animated = 'true';
        const target = entry.target.dataset.target;
        const suffix = entry.target.dataset.suffix || '';
        const duration = 1500;
        const startTime = performance.now();

        function update(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(eased * parseInt(target));
          entry.target.textContent = current + suffix;
          if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
      }
    });
  }, { threshold: 0.5 });

  statNums.forEach(el => countObserver.observe(el));
}

// Add data attributes for count-up animation
function setupCountUp() {
  const statMap = {
    '0': { target: '0', suffix: '' },
    '256': { target: '256', suffix: '' },
    '100K': { target: '100', suffix: 'K' },
    '60s': { target: '60', suffix: 's' }
  };
  document.querySelectorAll('.stat-num').forEach(el => {
    const text = el.textContent.trim();
    if (statMap[text]) {
      el.dataset.target = statMap[text].target;
      el.dataset.suffix = statMap[text].suffix;
      el.textContent = '0' + statMap[text].suffix;
    }
  });
  animateCountUp();
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  setupRevealElements();
  setupCountUp();
});
