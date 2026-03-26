// mount_range.js

// ============================================================
// 0. ADVANCED TOOLING — register color slots
// ============================================================
window.registerAdvancedSlots([
  { id: 'mountain-color', label: 'Mountain Color', default: '#2d3748' },
  { id: 'sky-color',      label: 'Sky Color',      default: '#cce0ff' },
]);

window.onAdvancedApply = function () {
  const svg = document.getElementById('mountain-svg');
  if (svg) render(svg, readInputs());
};

// ============================================================
// 1. DEFAULTS
// ============================================================
const DEFAULTS = {
  width:         800,
  height:        600,
  heightPercent: 50,
  jaggedness:    70,
  mountainColor: '#2d3748',
  skyColor:      '#cce0ff',
};

// ============================================================
// 2. HELPERS
// ============================================================
function clamp(v, min, max) {
  v = parseInt(v) || 0;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function midpointDisplacement(points, roughness, minSegment) {
  if (points.length > minSegment) return points;
  const newPoints = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2 + (Math.random() * 2 - 1) * roughness;
    newPoints.push(points[i]);
    newPoints.push([midX, midY]);
  }
  newPoints.push(points[points.length - 1]);
  return midpointDisplacement(newPoints, roughness * 0.5, minSegment);
}

// ============================================================
// 3. CORE LOGIC
// ============================================================
function readInputs() {
  return {
    width:         clamp(document.getElementById('canvas-width')?.value,  300, 5000),
    height:        clamp(document.getElementById('canvas-height')?.value, 300, 5000),
    heightPercent: Number(document.getElementById('mountain-height')?.value) || DEFAULTS.heightPercent,
    jaggedness:    Number(document.getElementById('jaggedness')?.value)      || DEFAULTS.jaggedness,
    mountainColor: document.getElementById('mountain-color')?.value          || DEFAULTS.mountainColor,
    skyColor:      document.getElementById('sky-color')?.value               || DEFAULTS.skyColor,
  };
}

function buildMountainPath(params) {
  const { width, height, heightPercent, jaggedness } = params;
  const scaledJaggedness = jaggedness * (width / 800);
  const topPadding   = height * 0.15;
  const usableHeight = height - topPadding;
  const mountainTop  = topPadding + (usableHeight * (1 - heightPercent / 100));
  const bottomY      = height;

  let points = [[0, mountainTop], [width, mountainTop]];
  points = midpointDisplacement(points, scaledJaggedness, 128);

  let path = `M ${points[0][0]} ${points[0][1]}`;
  points.forEach(p => (path += ` L ${p[0]} ${p[1]}`));
  path += ` L ${width} ${bottomY} L 0 ${bottomY} Z`;
  return path;
}

function render(svg, params) {
  const { width, height, mountainColor, skyColor } = params;

  // Sync inputs back
  document.getElementById('canvas-width').value  = width;
  document.getElementById('canvas-height').value = height;

  svg.innerHTML = '';
  svg.setAttribute('width',   width);
  svg.setAttribute('height',  height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  const ns = svg.namespaceURI;

  // Check for advanced gradient overrides
  const mountainWcgr = window.advancedGradients && window.advancedGradients.get('mountain-color');
  const skyWcgr      = window.advancedGradients && window.advancedGradients.get('sky-color');
  let skyGradFill   = null;
  let mountGradFill = null;

  // Build <defs> with gradient definitions if needed
  if (mountainWcgr || skyWcgr) {
    const defs = document.createElementNS(ns, 'defs');

    if (skyWcgr) {
      const { el, fill } = buildSVGGradientFill(ns, 'sky-gradient', skyWcgr, width, height);
      defs.appendChild(el);
      skyGradFill = fill;
    }

    if (mountainWcgr) {
      const { el, fill } = buildSVGGradientFill(ns, 'mountain-gradient', mountainWcgr, width, height);
      defs.appendChild(el);
      mountGradFill = fill;
    }

    svg.appendChild(defs);
  }

  // Sky background rect
  const skyRect = document.createElementNS(ns, 'rect');
  skyRect.setAttribute('x', 0);
  skyRect.setAttribute('y', 0);
  skyRect.setAttribute('width', width);
  skyRect.setAttribute('height', height);
  skyRect.setAttribute('fill', skyGradFill || skyColor);
  svg.appendChild(skyRect);

  // Mountain path
  const pathData = buildMountainPath(params);
  const ridge = document.createElementNS(ns, 'path');
  ridge.setAttribute('d', pathData);
  ridge.setAttribute('fill', mountGradFill || mountainColor);
  svg.appendChild(ridge);
}

//Render a wcgr to a pixel-perfect PNG and embed it as an SVG <pattern>.
//Used for gradient types that can't be faithfully reproduced in vector SVG
//(diamond, angle). The pattern fills the full element exactly once.

function buildRasterPattern(ns, id, wcgrData, w, h) {
  const oc = window.wcgrRenderToCanvas
    ? window.wcgrRenderToCanvas(wcgrData, Math.max(1, Math.round(w)), Math.max(1, Math.round(h)))
    : null;

  if (!oc) {
    return buildSVGGradientFill(ns, id, { ...wcgrData, type: 'linear' }, w, h);
  }

  const dataURL = oc.toDataURL('image/png');
  const pat = document.createElementNS(ns, 'pattern');
  pat.setAttribute('id', id);
  pat.setAttribute('patternUnits', 'userSpaceOnUse');
  pat.setAttribute('x', '0');
  pat.setAttribute('y', '0');
  pat.setAttribute('width',  w);
  pat.setAttribute('height', h);

  const img = document.createElementNS(ns, 'image');
  img.setAttribute('href', dataURL);
  img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dataURL);
  img.setAttribute('x', '0');
  img.setAttribute('y', '0');
  img.setAttribute('width',  w);
  img.setAttribute('height', h);
  img.setAttribute('preserveAspectRatio', 'none');
  pat.appendChild(img);

  return { el: pat, fill: `url(#${id})` };
}

/**
 * Build an SVG gradient def element from a wcgrData object.
 * All types produce pure vector SVG — no raster fallback.
 *   linear   → <linearGradient>
 *   radial   → <radialGradient>
 *   reflected→ <linearGradient spreadMethod="reflect">
 *   diamond  → 45° <linearGradient spreadMethod="reflect"> (close approximation)
 *   angle    → <linearGradient> at stored angle
 *
 * Returns { el, fill } where el is appended to <defs> and fill is the fill string.
 */
function buildSVGGradientFill(ns, id, wcgrData, w, h) {
  const type  = wcgrData.type || 'linear';
  const angle = (wcgrData.angle || 0) * Math.PI / 180;
  const cx    = w / 2, cy = h / 2;
  const half  = Math.max(w, h) / 2;

  // Radial
  if (type === 'radial') {
    const rcx = w * ((wcgrData.posX  ?? 50) / 100);
    const rcy = h * ((wcgrData.posY  ?? 50) / 100);
    const r   = Math.max(w, h) * ((wcgrData.scaleX ?? 1) + (wcgrData.scaleY ?? 1)) / 4;
    const grad = document.createElementNS(ns, 'radialGradient');
    grad.setAttribute('id', id);
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    grad.setAttribute('cx', rcx.toFixed(2)); grad.setAttribute('cy', rcy.toFixed(2));
    grad.setAttribute('r',  r.toFixed(2));
    grad.setAttribute('fx', rcx.toFixed(2)); grad.setAttribute('fy', rcy.toFixed(2));
    addStops(ns, grad, wcgrData);
    return { el: grad, fill: `url(#${id})` };
  }

  // Reflected — spreadMethod="reflect"
  if (type === 'reflected') {
    const grad = document.createElementNS(ns, 'linearGradient');
    grad.setAttribute('id', id);
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    grad.setAttribute('spreadMethod', 'reflect');
    grad.setAttribute('x1', (cx - Math.cos(angle) * half).toFixed(2));
    grad.setAttribute('y1', (cy - Math.sin(angle) * half).toFixed(2));
    grad.setAttribute('x2', cx.toFixed(2)); // midpoint — reflection handles the rest
    grad.setAttribute('y2', cy.toFixed(2));
    addStops(ns, grad, wcgrData);
    return { el: grad, fill: `url(#${id})` };
  }

  // Diamond and Angle — pixel-perfect raster pattern
  // wcgrRenderToCanvas gives pixel-perfect output matching the canvas preview.
  if (type === 'diamond' || type === 'angle') {
    return buildRasterPattern(ns, id, wcgrData, w, h);
  }
  const grad = document.createElementNS(ns, 'linearGradient');
  grad.setAttribute('id', id);
  grad.setAttribute('gradientUnits', 'userSpaceOnUse');
  grad.setAttribute('x1', (cx - Math.cos(angle) * half).toFixed(2));
  grad.setAttribute('y1', (cy - Math.sin(angle) * half).toFixed(2));
  grad.setAttribute('x2', (cx + Math.cos(angle) * half).toFixed(2));
  grad.setAttribute('y2', (cy + Math.sin(angle) * half).toFixed(2));
  addStops(ns, grad, wcgrData);
  return { el: grad, fill: `url(#${id})` };
}

// Append <stop> elements to a gradient element
function addStops(ns, gradEl, wcgrData) {
  wcgrData.colorStops.forEach(stop => {
    const op = getOpacityAtPos(wcgrData.opacityStops, stop.pos);
    const stopEl = document.createElementNS(ns, 'stop');
    stopEl.setAttribute('offset',       `${(stop.pos * 100).toFixed(1)}%`);
    stopEl.setAttribute('stop-color',   stop.color);
    stopEl.setAttribute('stop-opacity', op);
    gradEl.appendChild(stopEl);
  });
}

function pct(v) { return `${(v * 100).toFixed(2)}%`; }

function getOpacityAtPos(opacityStops, pos) {
  if (!opacityStops || opacityStops.length === 0) return 1;
  let closest = opacityStops[0];
  opacityStops.forEach(os => {
    if (Math.abs(os.pos - pos) < Math.abs(closest.pos - pos)) closest = os;
  });
  return closest.opacity;
}

// ============================================================
// 4. EXPORT
// ============================================================
function downloadSVG(svg) {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svg);
  if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
  const url  = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mountain-ridge.svg';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadPNG(svg, params) {
  const { width, height } = params;
  const serializer = new XMLSerializer();
  const svgString  = serializer.serializeToString(svg);
  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'mountain-ridge.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };
  img.onerror = () => alert('Failed to load SVG image for PNG export.');
  img.src = url;
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

function applyMountRangePreset(p) {
  function set(id, val) { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; }
  set('canvas-width',    p.width);
  set('canvas-height',   p.height);
  set('mountain-height', p.heightPercent);
  set('jaggedness',      p.jaggedness);
  set('mountain-color',  p.mountainColor);
  set('sky-color',       p.skyColor);
}

document.addEventListener('DOMContentLoaded', () => {
  const svg               = document.getElementById('mountain-svg');
  const generateButton    = document.getElementById('generate-button');
  const downloadSvgButton = document.getElementById('download-svg-button');
  const downloadPngButton = document.getElementById('download-png-button');

  if (!svg)            return console.error('mountain-svg not found');
  if (!generateButton) return console.error('generate-button not found');

  generateButton.addEventListener('click', () => render(svg, readInputs()));
  if (downloadSvgButton) downloadSvgButton.addEventListener('click', () => downloadSVG(svg));
  if (downloadPngButton) downloadPngButton.addEventListener('click', () => downloadPNG(svg, readInputs()));


  wirePresetButtons(
    'Mountain Range',
    () => readInputs(),
    applyMountRangePreset,
    'mountain_range_preset.wctp'
  );
  render(svg, readInputs());
});