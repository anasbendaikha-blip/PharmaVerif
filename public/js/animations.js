/**
 * PharmaVerif - Animations & Micro-interactions
 * Gère les animations avancées, le dark mode, et les interactions utilisateur
 */

// ============================================================================
// DARK MODE
// ============================================================================

class DarkMode {
  constructor() {
    this.theme = localStorage.getItem('theme') || 'light';
    this.init();
  }

  init() {
    // Appliquer le thème sauvegardé
    document.documentElement.setAttribute('data-theme', this.theme);
    
    // Créer le toggle button si pas déjà présent
    this.createToggleButton();
  }

  createToggleButton() {
    const header = document.querySelector('header nav');
    if (!header) return;

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'dark-mode-toggle';
    toggleBtn.className = 'btn-ghost p-2 rounded-lg transition-colors';
    toggleBtn.setAttribute('aria-label', 'Toggle dark mode');
    toggleBtn.innerHTML = this.theme === 'dark' 
      ? '<i data-lucide="sun" class="w-5 h-5"></i>'
      : '<i data-lucide="moon" class="w-5 h-5"></i>';
    
    toggleBtn.addEventListener('click', () => this.toggle());
    header.appendChild(toggleBtn);

    // Initialiser les icônes Lucide
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  toggle() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.theme);
    localStorage.setItem('theme', this.theme);

    // Mettre à jour l'icône
    const btn = document.getElementById('dark-mode-toggle');
    if (btn) {
      btn.innerHTML = this.theme === 'dark'
        ? '<i data-lucide="sun" class="w-5 h-5"></i>'
        : '<i data-lucide="moon" class="w-5 h-5"></i>';
      
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }
  }
}

// ============================================================================
// ANIMATIONS AU SCROLL
// ============================================================================

class ScrollAnimations {
  constructor() {
    this.init();
  }

  init() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-card');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
      }
    );

    // Observer toutes les cards
    document.querySelectorAll('.stat-card, .card').forEach(card => {
      observer.observe(card);
    });
  }
}

// ============================================================================
// CONFETTI ANIMATION
// ============================================================================

class Confetti {
  constructor() {
    this.colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  }

  create(x, y, count = 30) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = x + 'px';
        confetti.style.top = y + 'px';
        confetti.style.backgroundColor = this.colors[Math.floor(Math.random() * this.colors.length)];
        confetti.style.width = (Math.random() * 10 + 5) + 'px';
        confetti.style.height = confetti.style.width;
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confetti.style.animationDelay = (Math.random() * 0.5) + 's';
        
        // Position aléatoire autour du point de clic
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * 100;
        confetti.style.left = (x + Math.cos(angle) * distance) + 'px';
        confetti.style.top = (y + Math.sin(angle) * distance) + 'px';

        document.body.appendChild(confetti);

        // Supprimer après l'animation
        setTimeout(() => confetti.remove(), 3000);
      }, i * 30);
    }
  }

  celebrateSuccess() {
    // Créer des confetti depuis le centre de l'écran
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 3;
    this.create(centerX, centerY, 50);
  }
}

// ============================================================================
// PROGRESS BAR
// ============================================================================

class ProgressBar {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.bar = null;
  }

  show() {
    if (!this.container) return;

    this.bar = document.createElement('div');
    this.bar.className = 'progress-bar-container fixed top-0 left-0 right-0 z-50';
    this.bar.innerHTML = '<div class="progress-indeterminate"></div>';
    
    this.container.appendChild(this.bar);
  }

  hide() {
    if (this.bar) {
      this.bar.remove();
      this.bar = null;
    }
  }

  showDeterminate(duration = 2000) {
    if (!this.container) return;

    const barContainer = document.createElement('div');
    barContainer.className = 'progress-bar-container fixed top-0 left-0 right-0 z-50';
    
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    bar.style.animationDuration = (duration / 1000) + 's';
    
    barContainer.appendChild(bar);
    this.container.appendChild(barContainer);

    setTimeout(() => barContainer.remove(), duration);
  }
}

// ============================================================================
// BUTTON PULSE EFFECT
// ============================================================================

class ButtonPulse {
  constructor(selector) {
    this.buttons = document.querySelectorAll(selector);
    this.init();
  }

  init() {
    this.buttons.forEach(btn => {
      btn.classList.add('pulse-button');
      
      // Arrêter le pulse au clic
      btn.addEventListener('click', () => {
        btn.classList.remove('pulse-button');
      });
    });
  }

  add(element) {
    if (element) {
      element.classList.add('pulse-button');
    }
  }

  remove(element) {
    if (element) {
      element.classList.remove('pulse-button');
    }
  }
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

class Toast {
  constructor() {
    this.container = this.createContainer();
  }

  createContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
      document.body.appendChild(container);
    }
    return container;
  }

  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `bg-white shadow-xl rounded-lg p-4 flex items-center gap-3 min-w-[300px] slide-in-right`;
    
    let icon = 'info';
    let color = 'blue';
    
    switch(type) {
      case 'success':
        icon = 'check-circle';
        color = 'green';
        break;
      case 'error':
        icon = 'x-circle';
        color = 'red';
        break;
      case 'warning':
        icon = 'alert-triangle';
        color = 'orange';
        break;
    }

    toast.innerHTML = `
      <div class="flex-shrink-0">
        <i data-lucide="${icon}" class="w-6 h-6 text-${color}-500"></i>
      </div>
      <div class="flex-1">
        <p class="text-gray-900 font-medium">${message}</p>
      </div>
      <button class="flex-shrink-0 text-gray-400 hover:text-gray-600" onclick="this.parentElement.remove()">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>
    `;

    this.container.appendChild(toast);

    // Initialiser les icônes
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Auto-fermeture
    if (duration > 0) {
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
  }

  success(message, duration = 3000) {
    this.show(message, 'success', duration);
  }

  error(message, duration = 4000) {
    this.show(message, 'error', duration);
  }

  warning(message, duration = 3500) {
    this.show(message, 'warning', duration);
  }

  info(message, duration = 3000) {
    this.show(message, 'info', duration);
  }
}

// ============================================================================
// CARD HOVER EFFECTS
// ============================================================================

class CardEffects {
  constructor() {
    this.init();
  }

  init() {
    // Ajouter l'effet de brillance aux cards
    document.querySelectorAll('.card, .stat-card').forEach(card => {
      if (!card.classList.contains('card-shine')) {
        card.classList.add('card-shine');
      }
    });

    // Effet 3D subtil sur les cards
    document.querySelectorAll('.stat-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const percentX = (x - centerX) / centerX;
        const percentY = (y - centerY) / centerY;
        
        card.style.transform = `perspective(1000px) rotateY(${percentX * 2}deg) rotateX(${-percentY * 2}deg) translateY(-4px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }
}

// ============================================================================
// NUMBER COUNT UP ANIMATION
// ============================================================================

class CountUp {
  constructor(element, end, duration = 2000) {
    this.element = element;
    this.end = end;
    this.duration = duration;
  }

  animate() {
    const start = 0;
    const startTime = performance.now();

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.duration, 1);
      
      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const current = start + (this.end - start) * easeOutQuart;
      
      if (this.element) {
        if (this.end % 1 === 0) {
          this.element.textContent = Math.floor(current).toLocaleString('fr-FR');
        } else {
          this.element.textContent = current.toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        }
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }

  static animateAll(selector = '[data-count-up]') {
    document.querySelectorAll(selector).forEach(element => {
      const end = parseFloat(element.getAttribute('data-count-up'));
      if (!isNaN(end)) {
        new CountUp(element, end).animate();
      }
    });
  }
}

// ============================================================================
// INITIALISATION
// ============================================================================

// Initialiser dès que le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnimations);
} else {
  initAnimations();
}

function initAnimations() {
  // Dark Mode
  window.darkMode = new DarkMode();

  // Scroll Animations
  window.scrollAnimations = new ScrollAnimations();

  // Confetti
  window.confetti = new Confetti();

  // Toast
  window.toast = new Toast();

  // Card Effects
  window.cardEffects = new CardEffects();

  // Progress Bar (initialisé mais pas affiché)
  window.progressBar = new ProgressBar(document.body);

  // Button Pulse sur les boutons importants
  window.buttonPulse = new ButtonPulse('.btn-primary[type="submit"]');

  // Count Up automatique si présent
  if (document.querySelectorAll('[data-count-up]').length > 0) {
    setTimeout(() => CountUp.animateAll(), 500);
  }

  console.log('✨ PharmaVerif animations initialized');
}

// ============================================================================
// EXPORTS GLOBAUX
// ============================================================================

window.PharmaVerifAnimations = {
  DarkMode,
  ScrollAnimations,
  Confetti,
  ProgressBar,
  ButtonPulse,
  Toast,
  CardEffects,
  CountUp
};
