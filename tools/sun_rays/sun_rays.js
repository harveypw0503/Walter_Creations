// sun_rays.js

// ============================================================
// 0. ADVANCED TOOLING — register color slots
// ============================================================
window.registerAdvancedSlots([
  { id: 'ray-color', label: 'Ray Color', default: '#2D9CDB' },
]);

// Called by shared.js after Apply is clicked
window.onAdvancedApply = function () {
  const canvas = document.getElementById('ray-canvas');
  if (!canvas) return;
  render(canvas, canvas.getContext('2d'), readInputs());
};

// ============================================================
// 1. DEFAULTS
// ============================================================
const DEFAULTS = {
  rayCount:    200,
  rayColor:    '#2D9CDB',
  direction:   'center',
  minLength:   100,
  maxLength:   300,
  fixedLength: false,
};

// ============================================================
// 2. HELPERS
// ============================================================
function getOriginFromDirection(direction, w, h) {
  switch (direction) {
    case 'up':    return { x: w / 2, y: h };
    case 'down':  return { x: w / 2, y: 0 };
    case 'left':  return { x: w,     y: h / 2 };
    case 'right': return { x: 0,     y: h / 2 };
    default:      return { x: w / 2, y: h / 2 };
  }
}

function resizeCanvas(canvas, maxLength) {
  const size = maxLength * 2.5;
  canvas.width  = size;
  canvas.height = size;
}

// ============================================================
// 3. CORE LOGIC
// ============================================================
function readInputs() {
  return {
    rayCount:    parseInt(document.getElementById('ray-count').value)     || DEFAULTS.rayCount,
    rayColor:    document.getElementById('ray-color').value               || DEFAULTS.rayColor,
    direction:   document.getElementById('direction').value               || DEFAULTS.direction,
    minLength:   parseFloat(document.getElementById('min-length').value)  || DEFAULTS.minLength,
    maxLength:   parseFloat(document.getElementById('max-length').value)  || DEFAULTS.maxLength,
    fixedLength: document.getElementById('fixed-length').checked,
  };
}

function render(canvas, ctx, params) {
  const { rayCount, rayColor, direction, minLength, maxLength, fixedLength } = params;

  resizeCanvas(canvas, maxLength);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const wcgr   = window.advancedGradients && window.advancedGradients.get('ray-color');
  const origin = getOriginFromDirection(direction, canvas.width, canvas.height);
  const baseAngle = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0, center: null }[direction];
  const spread    = Math.PI / 2;

  for (let i = 0; i < rayCount; i++) {
    const angle  = direction === 'center'
      ? Math.random() * Math.PI * 2
      : baseAngle + (Math.random() - 0.5) * spread;
    const length = fixedLength ? maxLength : minLength + Math.random() * (maxLength - minLength);
    const width  = 5 + Math.random() * 15;

    const tipX = origin.x + Math.cos(angle) * length;
    const tipY = origin.y + Math.sin(angle) * length;

    // Build the per-ray stroke gradient: origin -> tip
    const rayGrad = ctx.createLinearGradient(origin.x, origin.y, tipX, tipY);

    if (wcgr && wcgr.colorStops && wcgr.colorStops.length >= 2) {
      // Map every wcgr color stop along the ray, fading out at the tip
      wcgr.colorStops.forEach(stop => {
        const op = window.getOpacityAt ? window.getOpacityAt(wcgr.opacityStops, stop.pos) : 1;
        const alpha = op * (1 - stop.pos * 0.85) * 0.35;
        rayGrad.addColorStop(stop.pos, window.hexToRgba(stop.color, alpha));
      });
    } else {
      rayGrad.addColorStop(0,   window.hexToRgba(rayColor, 0.30));
      rayGrad.addColorStop(0.5, window.hexToRgba(rayColor, 0.12));
      rayGrad.addColorStop(1,   window.hexToRgba(rayColor, 0));
    }

    ctx.strokeStyle = rayGrad;
    ctx.lineWidth   = width;
    ctx.shadowColor = wcgr ? window.wcgrSampleColor(wcgr, 0.1) : rayColor;
    ctx.shadowBlur  = 10;

    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Sparkles use the color at the sparkle's position along the ray
    for (let j = 0; j < 3; j++) {
      const t    = Math.random();
      const dotX = origin.x + (tipX - origin.x) * t + (Math.random() - 0.5) * 10;
      const dotY = origin.y + (tipY - origin.y) * t + (Math.random() - 0.5) * 10;
      const sparkleColor = wcgr ? window.wcgrSampleColor(wcgr, t) : rayColor;
      ctx.beginPath();
      ctx.fillStyle = window.hexToRgba(sparkleColor, 0.15 + Math.random() * 0.25);
      ctx.arc(dotX, dotY, 1 + Math.random() * 2, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

// ============================================================
// 4. EXPORT
// ============================================================
function downloadPNG(canvas) {
  const link = document.createElement('a');
  link.download = 'sunrays.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function downloadSVG(params) {
  const { rayCount, rayColor, direction, minLength, maxLength, fixedLength } = params;
  const size   = maxLength * 2.5;
  const origin = getOriginFromDirection(direction, size, size);
  const baseAngle = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0, center: null }[direction];
  const spread    = Math.PI / 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">`;
  for (let i = 0; i < rayCount; i++) {
    const angle  = direction === 'center'
      ? Math.random() * Math.PI * 2
      : baseAngle + (Math.random() - 0.5) * spread;
    const length = fixedLength ? maxLength : minLength + Math.random() * (maxLength - minLength);
    const x = origin.x + Math.cos(angle) * length;
    const y = origin.y + Math.sin(angle) * length;
    svg += `<line x1="${origin.x}" y1="${origin.y}" x2="${x}" y2="${y}" stroke="${rayColor}" stroke-opacity="0.25" stroke-width="2"/>`;
  }
  svg += `</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'sunrays.svg';
  link.click();
  URL.revokeObjectURL(link.href);
}

// ============================================================
// 5. DOM WIRING
// ============================================================

// TOOL PRESET — save/load all settings as .wctp

function collectGradientSlots() {
  const slots = {};
  if (window.advancedGradients) {
    window.advancedGradients.forEach((val, key) => { slots[key] = val; });
  }
  return slots;
}

function applyGradientSlots(slots) {
  if (!slots || !window.advancedGradients) return;
  Object.entries(slots).forEach(([key, val]) => {
    window.advancedGradients.set(key, val);
    if (window.updateSlotPreview) updateSlotPreview(key, val);
  });
}

function downloadPreset(toolId, params, filename) {
  const data = {
    tool:      toolId,
    version:   1,
    params:    params,
    gradients: collectGradientSlots(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function wirePresetButtons(toolId, getParams, applyParams, filename) {
  document.getElementById('advanced-preset-download')
    ?.addEventListener('click', () => downloadPreset(toolId, getParams(), filename));

  document.getElementById('advanced-preset-upload')
    ?.addEventListener('change', function() {
      const file = this.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.tool && data.tool !== toolId) {
            alert(`This preset is for "${data.tool}", not "${toolId}". Load anyway?`);
          }
          applyParams(data.params || {});
          applyGradientSlots(data.gradients || {});
          // Re-render after loading
          if (typeof window.onAdvancedApply === 'function') window.onAdvancedApply();
        } catch (err) {
          alert('Could not read preset file. Please check it is a valid .wctp file.');
        }
      };
      reader.readAsText(file);
      this.value = '';
    });
}

function applySunRaysPreset(p) {
  function set(id, val) { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; }
  function setChk(id, val) { const el = document.getElementById(id); if (el && val !== undefined) el.checked = !!val; }
  set('ray-count',   p.rayCount);
  set('ray-color',   p.rayColor);
  set('direction',   p.direction);
  set('min-length',  p.minLength);
  set('max-length',  p.maxLength);
  setChk('fixed-length', p.fixedLength);
}

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('ray-canvas');
  if (!canvas) return console.error('ray-canvas not found');
  const ctx = canvas.getContext('2d');

  document.getElementById('ray-count').value = DEFAULTS.rayCount;
  document.getElementById('ray-color').value = DEFAULTS.rayColor;

  document.getElementById('generate-button').addEventListener('click',      () => render(canvas, ctx, readInputs()));
  document.getElementById('download-png-button').addEventListener('click',  () => downloadPNG(canvas));
  document.getElementById('download-svg-button').addEventListener('click',  () => downloadSVG(readInputs()));


  wirePresetButtons(
    'Sun Rays',
    () => readInputs(),
    applySunRaysPreset,
    'sun_rays_preset.wctp'
  );
  render(canvas, ctx, readInputs());
});