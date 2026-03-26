// comic_burst.js

// ============================================================
// 0. ADVANCED TOOLING — register color slots
// ============================================================
window.registerAdvancedSlots([
  { id: 'burst-color',   label: 'Burst Fill Color',    default: '#FFD700' },
  { id: 'outline-color', label: 'Outline Color',       default: '#000000' },
]);

window.onAdvancedApply = function () {
  const canvas = document.getElementById('burst-canvas');
  if (!canvas) return;
  render(canvas, canvas.getContext('2d'), readInputs());
};

// ============================================================
// 1. DEFAULTS
// ============================================================
const DEFAULTS = {
  style: 'organic',
  burstColor: '#FFD700',
  outlineEnabled: true,
  outlineColor: '#000000',
  spikeCount: 20,
  minLength: 80,
  maxLength: 180,
  randomness: 0.4,
  angleJitter: 0.3,
};

// ============================================================
// 2. HELPERS
// ============================================================
function safeNum(id, fallback, min) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  let v = parseFloat(el.value);
  if (isNaN(v)) return fallback;
  if (min !== undefined && v < min) return fallback;
  return v;
}

function resizeCanvas(canvas, maxRadius) {
  const size = maxRadius * 2.5;
  canvas.width = size;
  canvas.height = size;
}

// ============================================================
// 3. CORE LOGIC
// ============================================================
function readInputs() {
  return {
    style:          document.getElementById('burst-style')?.value       || DEFAULTS.style,
    burstColor:     document.getElementById('burst-color')?.value       || DEFAULTS.burstColor,
    outlineEnabled: !!document.getElementById('outline-toggle')?.checked,
    outlineColor:   document.getElementById('outline-color')?.value     || DEFAULTS.outlineColor,
    spikeCount:     safeNum('spike-count', DEFAULTS.spikeCount, 3),
    minLength:      safeNum('min-length',  DEFAULTS.minLength, 5),
    maxLength:      safeNum('max-length',  DEFAULTS.maxLength, DEFAULTS.minLength),
    randomness:     safeNum('randomness',  DEFAULTS.randomness),
    angleJitter:    safeNum('angle-jitter', DEFAULTS.angleJitter),
  };
}

function buildClassicPoints(cx, cy, spikes, minRadius, maxRadius) {
  const pts = [];
  const total = spikes * 2;
  const step = (2 * Math.PI) / total;
  for (let i = 0; i < total; i++) {
    const angle = i * step;
    const r = i % 2 === 0 ? maxRadius : minRadius;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

function buildOrganicPoints(cx, cy, spikes, minRadius, maxRadius, randomness, angleJitter) {
  const pts = [];
  const total = spikes * 2;
  const baseStep = (2 * Math.PI) / total;
  for (let i = 0; i < total; i++) {
    const angle = i * baseStep + (Math.random() - 0.5) * baseStep * angleJitter * 2;
    const baseRadius = i % 2 === 0 ? maxRadius : minRadius;
    const r = baseRadius * (1 - randomness + Math.random() * randomness * 2);
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

function drawBurstPath(ctx, pts, cx, cy, radius, fillStyle, outlineEnabled, outlineColor) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (outlineEnabled) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 6;
    ctx.stroke();
  }
}

function render(canvas, ctx, params) {
  const { style, burstColor, outlineEnabled, outlineColor, spikeCount, minLength, maxLength, randomness, angleJitter } = params;

  resizeCanvas(canvas, maxLength);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const pts = style === 'classic'
    ? buildClassicPoints(cx, cy, spikeCount, minLength, maxLength)
    : buildOrganicPoints(cx, cy, spikeCount, minLength, maxLength, randomness, angleJitter);

  // Determine fill — gradient override or solid color
  const burstWcgr = window.advancedGradients && window.advancedGradients.get('burst-color');
  let fillStyle = burstColor;
  if (burstWcgr) {
    const g = window.wcgrToCanvasGradient(ctx, burstWcgr, 0, 0, canvas.width, canvas.height);
    if (g) fillStyle = g;
  }

  // Determine outline color — gradient override or solid color
  const outlineWcgr = window.advancedGradients && window.advancedGradients.get('outline-color');
  let strokeStyle = outlineColor;
  if (outlineWcgr) {
    const g = window.wcgrToCanvasGradient(ctx, outlineWcgr, 0, 0, canvas.width, canvas.height);
    if (g) strokeStyle = g;
  }

  drawBurstPath(ctx, pts, cx, cy, maxLength, fillStyle, outlineEnabled, strokeStyle);
}

// ============================================================
// 4. EXPORT
// ============================================================
function downloadPNG(canvas) {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'comic_burst.png';
  link.click();
}

function downloadSVG(params) {
  const { style, burstColor, outlineEnabled, outlineColor, spikeCount, minLength, maxLength, randomness, angleJitter } = params;

  const size = maxLength * 2.5;
  const cx = size / 2;
  const cy = size / 2;

  const pts = style === 'classic'
    ? buildClassicPoints(cx, cy, spikeCount, minLength, maxLength)
    : buildOrganicPoints(cx, cy, spikeCount, minLength, maxLength, randomness, angleJitter);

  const pathData = 'M' + pts.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' L ') + ' Z';

  const burstWcgr   = window.advancedGradients && window.advancedGradients.get('burst-color');
  const outlineWcgr = window.advancedGradients && window.advancedGradients.get('outline-color');

  let defsContent  = '';
  let fillAttr     = burstColor;
  let strokeAttr   = outlineEnabled ? outlineColor : 'none';
  const strokeWidth = outlineEnabled ? 6 : 0;

  // Build SVG gradient def string — all types produce pure vector SVG.
  //   linear   → <linearGradient>
  //   radial   → <radialGradient>
  //   reflected→ <linearGradient spreadMethod="reflect">
  //   diamond  → 45° <linearGradient spreadMethod="reflect"> (close approximation)
  //   angle    → <linearGradient> at stored angle
  function wcgrToSVGDef(id, wcgrData) {
    const type  = wcgrData.type || 'linear';
    const angle = (wcgrData.angle || 0) * Math.PI / 180;
    const half  = size / 2;

    const stops = wcgrData.colorStops.map(s => {
      const op = window.getOpacityAt ? window.getOpacityAt(wcgrData.opacityStops, s.pos) : 1;
      return `<stop offset="${(s.pos*100).toFixed(1)}%" stop-color="${s.color}" stop-opacity="${op}"/>`;
    }).join('');

    if (type === 'radial') {
      const rcx = size * ((wcgrData.posX ?? 50) / 100);
      const rcy = size * ((wcgrData.posY ?? 50) / 100);
      const r   = size * ((wcgrData.scaleX ?? 1) + (wcgrData.scaleY ?? 1)) / 4;
      return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${rcx.toFixed(2)}" cy="${rcy.toFixed(2)}" r="${r.toFixed(2)}" fx="${rcx.toFixed(2)}" fy="${rcy.toFixed(2)}">${stops}</radialGradient>`;
    }

    if (type === 'reflected') {
      const x1 = (cx - Math.cos(angle) * half).toFixed(2);
      const y1 = (cy - Math.sin(angle) * half).toFixed(2);
      return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" spreadMethod="reflect" x1="${x1}" y1="${y1}" x2="${cx.toFixed(2)}" y2="${cy.toFixed(2)}">${stops}</linearGradient>`;
    }

    if (type === 'diamond') {
      const da = Math.PI / 4;
      const x1 = (cx - Math.cos(da) * half).toFixed(2);
      const y1 = (cy - Math.sin(da) * half).toFixed(2);
      return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" spreadMethod="reflect" x1="${x1}" y1="${y1}" x2="${cx.toFixed(2)}" y2="${cy.toFixed(2)}">${stops}</linearGradient>`;
    }

    // linear and angle
    const x1 = (cx - Math.cos(angle) * half).toFixed(2), y1 = (cy - Math.sin(angle) * half).toFixed(2);
    const x2 = (cx + Math.cos(angle) * half).toFixed(2), y2 = (cy + Math.sin(angle) * half).toFixed(2);
    return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`;
  }

  if (burstWcgr) {
    defsContent += wcgrToSVGDef('burst-gradient', burstWcgr);
    fillAttr = 'url(#burst-gradient)';
  }
  if (outlineWcgr && outlineEnabled) {
    defsContent += wcgrToSVGDef('outline-gradient', outlineWcgr);
    strokeAttr = 'url(#outline-gradient)';
  }

  const defsTag = defsContent ? `<defs>${defsContent}</defs>` : '';

  const svgContent = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${defsTag}
  <path d="${pathData}" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'comic_burst.svg';
  link.click();
  URL.revokeObjectURL(url);
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
      this.value = ''; // allow re-uploading same file
    });
}

function applyComicBurstPreset(p) {
  function set(id, val) { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; }
  function setChk(id, val) { const el = document.getElementById(id); if (el && val !== undefined) el.checked = !!val; }
  set('burst-style',  p.style);
  set('burst-color',  p.burstColor);
  setChk('outline-toggle', p.outlineEnabled);
  set('outline-color', p.outlineColor);
  set('spike-count',  p.spikeCount);
  set('min-length',   p.minLength);
  set('max-length',   p.maxLength);
  set('randomness',   p.randomness);
  set('angle-jitter', p.angleJitter);
}

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('burst-canvas');
  if (!canvas) return console.error('burst-canvas not found');
  const ctx = canvas.getContext('2d');

  const generateButton    = document.getElementById('generate-button');
  const downloadPngButton = document.getElementById('download-png-button');
  const downloadSvgButton = document.getElementById('download-svg-button');

  if (!generateButton || !downloadPngButton) return console.error('Required buttons not found');

  generateButton.addEventListener('click',    () => render(canvas, ctx, readInputs()));
  downloadPngButton.addEventListener('click', () => downloadPNG(canvas));
  if (downloadSvgButton) {
    downloadSvgButton.addEventListener('click', () => downloadSVG(readInputs()));
  }

  // Initial render

  wirePresetButtons(
    'Comic Burst',
    () => readInputs(),
    applyComicBurstPreset,
    'comic_burst_preset.wctp'
  );
  render(canvas, ctx, readInputs());
});