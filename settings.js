// settings.js

// ============================================================
// 1. HELPERS — read/write localStorage settings
// ============================================================

function getSetting(key, defaultValue) {
  try {
    const val = localStorage.getItem(key);
    if (val === null) return defaultValue;
    return val === 'true';
  } catch (e) {
    return defaultValue;
  }
}

function getSettingNum(key, defaultValue) {
  try {
    const val = parseFloat(localStorage.getItem(key));
    return isNaN(val) ? defaultValue : val;
  } catch (e) {
    return defaultValue;
  }
}

function setSetting(key, value) {
  try {
    localStorage.setItem(key, value ? 'true' : 'false');
  } catch (e) {
    console.warn('localStorage unavailable — settings will not persist.');
  }
}

function setSettingRaw(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch (e) {
    console.warn('localStorage unavailable — settings will not persist.');
  }
}

// ============================================================
// 2. TOAST NOTIFICATION
// ============================================================

let toastTimer = null;

function showSavedToast() {
  const toast = document.getElementById('settings-saved-toast');
  if (!toast) return;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ============================================================
// 3. DOM WIRING
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // Advanced Tooling
  const advancedToggle = document.getElementById('advanced-tooling-toggle');
  if (advancedToggle) {
    advancedToggle.checked = getSetting('advancedTooling', false);

    advancedToggle.addEventListener('change', () => {
      setSetting('advancedTooling', advancedToggle.checked);
      showSavedToast();
    });
  }

  // Dark Mode
  const darkToggle = document.getElementById('dark-mode-settings-toggle');
  if (darkToggle) {
    // Read current value from body class (already applied by global.js)
    darkToggle.checked = document.body.classList.contains('dark-mode');

    darkToggle.addEventListener('change', () => {
      const isDark = darkToggle.checked;

      // Use the shared applyDarkMode from global.js if available
      if (typeof window.applyDarkMode === 'function') {
        window.applyDarkMode(isDark);
      } else {
        document.body.classList.toggle('dark-mode', isDark);
        setSetting('darkMode', isDark);
      }

      // Swap the navbar logo to match the new theme
      const logoImg = document.querySelector('.logo-link img.logo');
      if (logoImg) {
        const targetSrc = isDark ? '/images/qqq_small.png' : '/images/logo_nav.png';
        logoImg.style.opacity = '0';
        const tmp = new Image();
        tmp.onload  = () => { logoImg.src = targetSrc; requestAnimationFrame(() => { logoImg.style.opacity = '1'; }); };
        tmp.onerror = () => { logoImg.src = targetSrc; logoImg.style.opacity = '1'; };
        tmp.src = targetSrc;
      }

      showSavedToast();
    });
  }

  // Theme Fade Duration
  const fadeSlider  = document.getElementById('theme-fade-slider');
  const fadeValueEl = document.getElementById('theme-fade-value');

  if (fadeSlider) {
    const savedDur = getSettingNum('themeFadeDuration', 0.5);
    fadeSlider.value = savedDur;
    if (fadeValueEl) fadeValueEl.textContent = savedDur === 0 ? 'None' : savedDur.toFixed(1) + 's';

    function applyFadeDuration(dur) {
      document.documentElement.style.setProperty('--theme-transition', dur + 's');
      setSettingRaw('themeFadeDuration', dur);
      if (fadeValueEl) fadeValueEl.textContent = dur === 0 ? 'None' : parseFloat(dur).toFixed(1) + 's';
    }

    fadeSlider.addEventListener('input',  () => applyFadeDuration(parseFloat(fadeSlider.value)));
    fadeSlider.addEventListener('change', () => showSavedToast());
  }

  // Sync settings toggle if navbar dark-mode button is clicked
  const observer = new MutationObserver(() => {
    if (darkToggle) {
      darkToggle.checked = document.body.classList.contains('dark-mode');
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

});