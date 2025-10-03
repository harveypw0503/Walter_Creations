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
  if (!navbarContainer) {
    console.error('#navbar element not found.');
    return;
  }

  // Figure out base path depending on environment
  let basePath = '';
  if (window.location.hostname.includes('github.io')) {
    // On GitHub Pages → repo name is first folder after domain
    const repoName = window.location.pathname.split('/')[1];
    basePath = `/${repoName}`;
  }

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
          window.requestAnimationFrame(() => {
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
    .catch(err => {
      console.error('Failed to load navbar:', err);
    });
}
