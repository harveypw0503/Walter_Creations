// global.js

// ============================================================
// 1. FAVICON & MANIFEST INJECTION
// ============================================================
(function injectFavicons() {
  const favicons = [
    { rel: 'icon',             type: 'image/x-icon',  href: '/favicon.ico' },
    { rel: 'icon',             type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'apple-touch-icon', type: null,             href: '/apple-touch-icon.png' },
    { rel: 'manifest',         type: null,             href: '/manifest.json' },
    { rel: 'icon',             type: 'image/png',      href: '/favicon-96x96.png', sizes: '96x96' },
  ];
  favicons.forEach(({ rel, type, href, sizes }) => {
    const link = document.createElement('link');
    link.rel  = rel;
    link.href = href;
    if (type)  link.type  = type;
    if (sizes) link.sizes = sizes;
    document.head.appendChild(link);
  });
})();

// ============================================================
// 2. DARK MODE — shared function, transition support
// ============================================================

// Apply saved transition duration immediately
(function applyThemeDuration() {
  try {
    const saved = parseFloat(localStorage.getItem('themeFadeDuration'));
    const dur   = isNaN(saved) ? 0.5 : saved;
    document.documentElement.style.setProperty('--theme-transition', dur + 's');
  } catch (e) {}
})();

// Apply saved dark mode class before first paint
(function applyInitialTheme() {
  try {
    if (localStorage.getItem('darkMode') === 'true') {
      // Suppress transition on initial load
      document.documentElement.style.setProperty('--theme-transition', '0s');
      document.body.classList.add('dark-mode');
      // Restore transition after first paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            const saved = parseFloat(localStorage.getItem('themeFadeDuration'));
            const dur   = isNaN(saved) ? 0.5 : saved;
            document.documentElement.style.setProperty('--theme-transition', dur + 's');
          } catch (e) {}
        });
      });
    }
  } catch (e) {
    console.warn('Could not access localStorage for theme.');
  }
})();

// Global function to toggle dark mode, update UI, and persist choice
window.applyDarkMode = function(isDark) {
  document.body.classList.toggle('dark-mode', isDark);

  // Persist
  try { localStorage.setItem('darkMode', isDark ? 'true' : 'false'); } catch (e) {}

  // Sync navbar toggle icon
  const navToggle = document.getElementById('dark-mode-toggle');
  if (navToggle) navToggle.textContent = isDark ? '☀️' : '🌙';

  // Sync settings toggle (only present on settings page)
  const settingsToggle = document.getElementById('dark-mode-settings-toggle');
  if (settingsToggle) settingsToggle.checked = isDark;
};

// Utility to preload an image
function preloadImage(url, onload, onerror) {
  const img = new Image();
  img.onload = () => onload && onload();
  img.onerror = () => onerror && onerror();
  img.src = url;
}

// ============================================================
// 3. GOOGLE ANALYTICS
// ============================================================
(function initGA() {
  const GA_ID = "G-SMRN79C0LG";

  // Optional: disable on localhost
  if (
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
  ) {
    return;
  }

  // Prevent double init
  if (window.gtag) return;

  // Load gtag script
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  // Init dataLayer
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag("js", new Date());
  gtag("config", GA_ID);
})();

// ============================================================
// 4. NAVBAR
// ============================================================
function initNavbar() {
  const navbarContainer = document.getElementById('navbar');
  if (!navbarContainer) {
    console.error('#navbar element not found.');
    return;
  }

  // Determine base path depending on environment
  const isLocal = location.hostname === "127.0.0.1" || location.hostname === "localhost";
  const basePath = "" ;

  // Fetch the navbar
  fetch(`${basePath}/navbar.html`)
    .then(res => {
      if (!res.ok) throw new Error('Navbar fetch failed');
      return res.text();
    })
    .then(html => {
      navbarContainer.innerHTML = html;

      const toggle = document.getElementById('dark-mode-toggle');
      const logoImg = document.querySelector('.logo-link img.logo');
      const hamburger = document.getElementById('hamburger');
      const navLinks = document.querySelector('.nav-links');

      const lightLogoSrc = `${basePath}/images/logo_nav.png`;
      const darkLogoSrc = `${basePath}/images/qqq_small.png`;

      // Logo fade function
      function setLogoSafe(src) {
        if (!logoImg) return;
        logoImg.style.opacity = '0';
        const img = new Image();
        img.onload = () => {
          logoImg.src = src;
          requestAnimationFrame(() => (logoImg.style.opacity = '1'));
        };
        img.onerror = () => {
          console.warn('Failed to preload logo:', src);
          logoImg.src = src;
          logoImg.style.opacity = '1';
        };
        img.src = src;
      }

      // Apply initial logo
      if (logoImg) setLogoSafe(document.body.classList.contains('dark-mode') ? darkLogoSrc : lightLogoSrc);

      // Dark mode toggle
      if (toggle) {
        toggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
        toggle.addEventListener('click', () => {
          const isDark = !document.body.classList.contains('dark-mode');
          window.applyDarkMode(isDark);
          if (logoImg) setLogoSafe(isDark ? darkLogoSrc : lightLogoSrc);
        });
      }

      // Hamburger menu functionality for mobile
      if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
          navLinks.classList.toggle('active');
        });

        // Close menu when a link is clicked
        navLinks.querySelectorAll('a').forEach(link => {
          link.addEventListener('click', () => {
            navLinks.classList.remove('active');
          });
        });
      }

      // Preload both logos
      [lightLogoSrc, darkLogoSrc].forEach(src => preloadImage(src));
    })
    .catch(err => console.error('Failed to load navbar:', err));
}

// ============================================================
// 5. FOOTER
// ============================================================
function initFooter() {
  const footerContainer = document.getElementById('footer');
  if (!footerContainer) return;

  const basePath = "";

  fetch(`${basePath}/footer.html`)
    .then(res => {
      if (!res.ok) throw new Error('Footer fetch failed');
      return res.text();
    })
    .then(html => {
      footerContainer.innerHTML = html;

      // Set current year
      const yearSpan = document.getElementById('footer-year');
      if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
      }
    })
    .catch(err => console.error('Failed to load footer:', err));
}


// ============================================================
// 6. DOM WIRING
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initFooter();
});