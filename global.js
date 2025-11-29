// global.js

// Immediately apply saved theme to reduce flash
try {
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }
} catch (e) {
  console.warn('Could not access localStorage for theme.');
}

// Utility to preload an image
function preloadImage(url, onload, onerror) {
  const img = new Image();
  img.onload = () => onload && onload();
  img.onerror = () => onerror && onerror();
  img.src = url;
}

// Initialize Navbar
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
          const isDark = document.body.classList.toggle('dark-mode');
          toggle.textContent = isDark ? '☀️' : '🌙';
          if (logoImg) setLogoSafe(isDark ? darkLogoSrc : lightLogoSrc);
          try {
            localStorage.setItem('darkMode', isDark ? 'true' : 'false');
          } catch (e) {}
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

document.addEventListener('DOMContentLoaded', initNavbar);
