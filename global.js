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

function initNavbar() {
  const navbarContainer = document.getElementById('navbar');
  if (!navbarContainer) return;

  // Detect repo name from URL → works on GitHub Pages
  const parts = window.location.pathname.split('/');
  const repoName = parts[1] || ''; // "Walter-Creations" for example
  const basePath = repoName ? `/${repoName}` : '';

  // Fetch navbar HTML
  fetch(`${basePath}/navbar.html`)
    .then(res => res.text())
    .then(html => {
      navbarContainer.innerHTML = html;

      // -----------------------------
      // Dark mode setup
      // -----------------------------
      const toggle = document.getElementById('dark-mode-toggle');
      const logoImg = document.querySelector('.logo-link img.logo');

      const lightLogoSrc = `${basePath}/images/logo_nav.png`;
      const darkLogoSrc = `${basePath}/images/qqq_small.png`;

      function setLogoSafe(src) {
        if (!logoImg) return;
        logoImg.style.opacity = '0';
        preloadImage(src, () => {
          logoImg.src = src;
          requestAnimationFrame(() => {
            logoImg.style.opacity = '1';
          });
        }, () => {
          console.warn('Failed to preload logo:', src);
          logoImg.src = src;
          logoImg.style.opacity = '1';
        });
      }

      if (logoImg) {
        setLogoSafe(document.body.classList.contains('dark-mode') ? darkLogoSrc : lightLogoSrc);
      }

      if (toggle) {
        toggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
        toggle.addEventListener('click', () => {
          const isDark = document.body.classList.toggle('dark-mode');
          toggle.textContent = isDark ? '☀️' : '🌙';
          if (logoImg) setLogoSafe(isDark ? darkLogoSrc : lightLogoSrc);
          try {
            localStorage.setItem('darkMode', isDark ? 'true' : 'false');
          } catch (e) {
            console.warn('Could not save theme preference.');
          }
        });
      }

      // -----------------------------
      // Hamburger menu setup
      // -----------------------------
      const hamburger = document.getElementById('hamburger');
      const navLinks = document.querySelector('.nav-links');

      if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
          navLinks.classList.toggle('active');
        });
      }

      // Optional: close menu when a link is clicked
      const links = document.querySelectorAll('.nav-links a');
      links.forEach(link => {
        link.addEventListener('click', () => {
          navLinks.classList.remove('active');
        });
      });

      // Preload images
      preloadImage(darkLogoSrc);
      preloadImage(lightLogoSrc);

    })
    .catch(err => console.error('Failed to load navbar:', err));
}

  // Detect repo name from URL → works on GitHub Pages
  const parts = window.location.pathname.split('/');
  const repoName = parts[1] || ''; // "Walter-Creations" for example
  const basePath = repoName ? `/${repoName}` : '';

  // Always fetch navbar from root of repo
  fetch(`${basePath}/navbar.html`)
    .then(res => res.text())
    .then(html => {
      navbarContainer.innerHTML = html;

      const toggle = document.getElementById('dark-mode-toggle');
      const logoImg = document.querySelector('.logo-link img.logo');

      const lightLogoSrc = `${basePath}/images/logo_nav.png`;
      const darkLogoSrc = `${basePath}/images/qqq_small.png`;

      function setLogoSafe(src) {
        if (!logoImg) return;
        logoImg.style.opacity = '0';
        preloadImage(src, () => {
          logoImg.src = src;
          requestAnimationFrame(() => {
            logoImg.style.opacity = '1';
          });
        }, () => {
          console.warn('Failed to preload logo:', src);
          logoImg.src = src;
          logoImg.style.opacity = '1';
        });
      }

      if (logoImg) {
        setLogoSafe(document.body.classList.contains('dark-mode') ? darkLogoSrc : lightLogoSrc);
      }

      if (toggle) {
        toggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
        toggle.addEventListener('click', () => {
          const isDark = document.body.classList.toggle('dark-mode');
          toggle.textContent = isDark ? '☀️' : '🌙';
          if (logoImg) setLogoSafe(isDark ? darkLogoSrc : lightLogoSrc);
          try {
            localStorage.setItem('darkMode', isDark ? 'true' : 'false');
          } catch (e) {
            console.warn('Could not save theme preference.');
          }
        });
      }

      preloadImage(darkLogoSrc);
      preloadImage(lightLogoSrc);
    })
    .catch(err => console.error('Failed to load navbar:', err));
}

document.addEventListener('DOMContentLoaded', initNavbar);
