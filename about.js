// about.js
    
//Scroll reveal
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  });
}, { threshold: 0.12 });

 document.querySelectorAll('.reveal, .reveal-right, .reveal-left, .value-card').forEach(el => {
  revealObserver.observe(el);
});

// Light/Dark Image Swap
function syncThemedImage() {
  const img = document.getElementById('about-tools-img');
  if (!img) return;
  const isDark = document.body.classList.contains('dark-mode');
  const next = isDark ? img.dataset.darkSrc : img.dataset.lightSrc;
  if (next && img.src !== new URL(next, location.href).href) {
    img.src = next;
  }
}

syncThemedImage();

new MutationObserver(syncThemedImage).observe(document.body, {
  attributes: true,
  attributeFilter: ['class'],
});