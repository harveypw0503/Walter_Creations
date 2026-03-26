// gradient.js

// Advanced tooling — the gradient tool is itself a gradient editor,
// so per-slot gradient overrides don't apply here.
window.registerAdvancedSlots([]);

// ============================================================
// 1. STATE
// ============================================================

let colorStops   = [{ pos: 0, color: '#000000' }, { pos: 1, color: '#ffffff' }];
let opacityStops = [{ pos: 0, opacity: 1 }, { pos: 1, opacity: 1 }];
let gmType   = 'linear';
let gmAngle  = 0;
let gmScaleX = 1;
let gmScaleY = 1;
let gmPosX   = 50;
let gmPosY   = 50;
let gmRatioW = 10;
let gmRatioH = 5;

let ratioLocked = false;

const PREVIEW_PX    = 500;
const MAX_EXPORT_PX = 5000;

let selectedStop = null;
let selectedType = null;

// ============================================================
// 2. EDIT HISTORY
// ============================================================

// Each entry: { label: string, snap: stateSnapshot }
// Index 0 = most recent. Max 10 entries kept.
// The user's current state is always history[0].
// Clicking an older entry restores that snapshot and trims everything newer.

const HISTORY_MAX  = 10;
let history        = [];   // array of { label, snap }
let historyPaused  = false; // suppresses pushes during restoreState
let dirtyFlag      = false;

function captureState() {
  return {
    colorStops:   colorStops.map(s => ({ ...s })),
    opacityStops: opacityStops.map(s => ({ ...s })),
    gmType, gmAngle, gmScaleX, gmScaleY,
    gmPosX, gmPosY, gmRatioW, gmRatioH,
  };
}

function pushHistory(label) {
  if (historyPaused) return;
  // Insert at front (newest first)
  history.unshift({ label, snap: captureState() });
  // Keep at most HISTORY_MAX entries
  if (history.length > HISTORY_MAX) history.pop();
  dirtyFlag = true;
  renderHistoryPanel();
}

function restoreSnap(snap) {
  historyPaused = true;

  colorStops   = snap.colorStops.map(s => ({ ...s }));
  opacityStops = snap.opacityStops.map(s => ({ ...s }));
  gmType   = snap.gmType;
  gmAngle  = snap.gmAngle;
  gmScaleX = snap.gmScaleX;
  gmScaleY = snap.gmScaleY;
  gmPosX   = snap.gmPosX;
  gmPosY   = snap.gmPosY;
  gmRatioW = snap.gmRatioW;
  gmRatioH = snap.gmRatioH;

  typeSelect.value   = gmType;
  angleNumber.value  = Math.round(gmAngle);
  scaleXSlider.value = gmScaleX; scaleXNum.value = gmScaleX;
  scaleYSlider.value = gmScaleY; scaleYNum.value = gmScaleY;
  posXSlider.value   = gmPosX;   posXNum.value   = gmPosX;
  posYSlider.value   = gmPosY;   posYNum.value   = gmPosY;
  ratioWInput.value  = gmRatioW;
  ratioHInput.value  = gmRatioH;

  deselectStop();
  applyPreviewSize();
  update();

  historyPaused = false;
}

function jumpToHistory(index) {
  if (index < 0 || index >= history.length) return;
  const entry = history[index];
  // Copy the clicked entry to the top as a new current — all existing entries stay intact
  history.unshift({ label: entry.label, snap: entry.snap });
  if (history.length > HISTORY_MAX) history.pop();
  restoreSnap(history[0].snap);
  renderHistoryPanel();
}

function renderHistoryPanel() {
  const list = document.getElementById('history-list');
  if (!list) return;
  list.innerHTML = '';

  if (history.length === 0) {
    const empty = document.createElement('span');
    empty.className   = 'history-empty';
    empty.textContent = 'No edits yet';
    list.appendChild(empty);
    return;
  }

  history.forEach((entry, i) => {
    const row = document.createElement('button');
    row.className = 'history-entry' + (i === 0 ? ' history-current' : '');
    row.title = i === 0 ? 'Current state' : 'Click to restore this state';
    row.disabled = i === 0;

    const dot = document.createElement('span');
    dot.className = 'history-dot';

    const text = document.createElement('span');
    text.className   = 'history-label';
    text.textContent = entry.label;

    const badge = document.createElement('span');
    badge.className   = 'history-badge';
    badge.textContent = i === 0 ? 'now' : `−${i}`;

    row.appendChild(dot);
    row.appendChild(text);
    row.appendChild(badge);

    if (i > 0) {
      row.addEventListener('click', () => jumpToHistory(i));
    }

    list.appendChild(row);
  });
}

// ============================================================
// 3. DOM REFS
// ============================================================

const preview         = document.getElementById('gradient-preview');
const checkerboard    = document.getElementById('gradient-checkerboard');
const ctx             = preview.getContext('2d');
const bar             = document.getElementById('gradient-bar');
const colorCont       = document.getElementById('color-stops-container');
const opacityCont     = document.getElementById('opacity-stops-container');
const editPanel       = document.getElementById('stop-edit-panel');
const editLabel       = document.getElementById('stop-edit-label');
const colorPicker     = document.getElementById('stop-color-picker');
const opacitySlider   = document.getElementById('stop-opacity-slider');
const opacityPicker   = document.getElementById('stop-opacity-number');
const opacityControls = document.getElementById('stop-opacity-controls');
const angleDial       = document.getElementById('gradient-angle-dial');
const angleNeedle     = document.getElementById('gradient-angle-needle');
const angleNumber     = document.getElementById('gradient-angle-number');
const posXSlider      = document.getElementById('gradient-pos-x');
const posXNum         = document.getElementById('gradient-pos-x-number');
const posYSlider      = document.getElementById('gradient-pos-y');
const posYNum         = document.getElementById('gradient-pos-y-number');
const scaleXSlider    = document.getElementById('gradient-scale-x');
const scaleXNum       = document.getElementById('gradient-scale-x-number');
const scaleYSlider    = document.getElementById('gradient-scale-y');
const scaleYNum       = document.getElementById('gradient-scale-y-number');
const typeSelect      = document.getElementById('gradient-type');
const ratioWInput     = document.getElementById('ratio-width');
const ratioHInput     = document.getElementById('ratio-height');
const ratioLockBtn    = document.getElementById('ratio-lock-button');

// ============================================================
// 4. HELPERS & INTERPOLATION
// ============================================================

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function lerp(a, b, t) { return a + (b - a) * t; }

function interpolateColor(stops, p) {
  if (!stops.length) return { r: 0, g: 0, b: 0 };
  if (p <= stops[0].pos) return hexToRgb(stops[0].color);
  if (p >= stops[stops.length - 1].pos) return hexToRgb(stops[stops.length - 1].color);
  for (let i = 0; i < stops.length - 1; i++) {
    if (p >= stops[i].pos && p <= stops[i + 1].pos) {
      const t  = (p - stops[i].pos) / (stops[i + 1].pos - stops[i].pos);
      const c1 = hexToRgb(stops[i].color);
      const c2 = hexToRgb(stops[i + 1].color);
      return { r: lerp(c1.r, c2.r, t), g: lerp(c1.g, c2.g, t), b: lerp(c1.b, c2.b, t) };
    }
  }
}

function interpolateOpacity(stops, p) {
  if (!stops.length) return 1;
  if (p <= stops[0].pos) return stops[0].opacity;
  if (p >= stops[stops.length - 1].pos) return stops[stops.length - 1].opacity;
  for (let i = 0; i < stops.length - 1; i++) {
    if (p >= stops[i].pos && p <= stops[i + 1].pos) {
      const t = (p - stops[i].pos) / (stops[i + 1].pos - stops[i].pos);
      return lerp(stops[i].opacity, stops[i + 1].opacity, t);
    }
  }
}

function getStopsString() {
  const allPos = Array.from(new Set([
    ...colorStops.map(s => s.pos),
    ...opacityStops.map(s => s.pos),
  ])).sort((a, b) => a - b);
  return allPos.map(p => {
    const c = interpolateColor(colorStops, p);
    const o = interpolateOpacity(opacityStops, p);
    return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${o}) ${p * 100}%`;
  }).join(', ');
}

// ============================================================
// 5. RENDERER
// ============================================================

function drawGradient(targetCtx, w, h, ratioW, ratioH) {
  const aspect = ratioW / ratioH;
  const cx     = gmPosX / 100;
  const cy     = gmPosY / 100;
  const theta  = gmAngle * Math.PI / 180;
  const imgData = targetCtx.createImageData(w, h);
  const data    = imgData.data;
  const corners = [[0,0],[0,1],[1,0],[1,1]];

  let minProj = Infinity, maxProj = -Infinity;
  if (gmType === 'linear' || gmType === 'reflected') {
    const cos = Math.cos(theta), sin = Math.sin(theta);
    for (const [u, v] of corners) {
      const proj = (u - cx) * cos + (v - cy) * aspect * sin;
      if (proj < minProj) minProj = proj;
      if (proj > maxProj) maxProj = proj;
    }
  }

  const isRadialLike = gmType === 'radial' || gmType === 'diamond';
  let r = 1;
  if (isRadialLike) {
    const isManhattan = gmType === 'diamond';
    const sqCy = cy * aspect;
    r = Math.max(...corners.map(([u, v]) => {
      const dx = u - cx, dy = v * aspect - sqCy;
      return isManhattan ? Math.abs(dx) + Math.abs(dy) : Math.sqrt(dx*dx + dy*dy);
    }));
    if (r === 0) r = 0.001;
  }

  const cos = Math.cos(theta), sin = Math.sin(theta);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u  = x / w, v = y / h;
      const dx = u - cx, dy = v - cy;
      let pos;

      if (gmType === 'linear' || gmType === 'reflected') {
        const proj = dx * cos + dy * aspect * sin;
        pos = (proj - minProj) / (maxProj - minProj);
        if (gmType === 'reflected') pos = Math.abs(2 * pos - 1);

      } else if (gmType === 'angle') {
        const rx =  dx * cos + dy * sin;
        const ry = -dx * sin + dy * cos;
        pos = ((Math.atan2(ry, rx) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI);

      } else if (isRadialLike) {
        const sqDy = dy * aspect;
        const rx   =  dx * cos + sqDy * sin;
        const ry   = -dx * sin + sqDy * cos;
        const sx   = rx / gmScaleX, sy = ry / gmScaleY;
        const dist = gmType === 'diamond'
          ? Math.abs(sx) + Math.abs(sy)
          : Math.sqrt(sx*sx + sy*sy);
        pos = dist / r;
      }

      pos = clamp(pos, 0, 1);
      const color   = interpolateColor(colorStops, pos);
      const opacity = interpolateOpacity(opacityStops, pos);
      const i = (y * w + x) * 4;
      data[i]     = Math.round(color.r);
      data[i + 1] = Math.round(color.g);
      data[i + 2] = Math.round(color.b);
      data[i + 3] = Math.round(opacity * 255);
    }
  }
  targetCtx.putImageData(imgData, 0, 0);
}

// ============================================================
// 6. UI UPDATE
// ============================================================

function update() {
  colorStops.sort((a, b) => a.pos - b.pos);
  opacityStops.sort((a, b) => a.pos - b.pos);
  renderStopHandles();
  bar.style.background = `linear-gradient(to right, ${getStopsString()})`;
  drawGradient(ctx, PREVIEW_PX, PREVIEW_PX, gmRatioW, gmRatioH);
  angleNeedle.style.transform = `translateX(-50%) rotate(${gmAngle}deg)`;
  angleNumber.value = Math.round(gmAngle);
  const showEllipse = gmType === 'radial' || gmType === 'diamond';
  document.getElementById('scale-x-label').style.display = showEllipse ? '' : 'none';
  document.getElementById('scale-y-label').style.display = showEllipse ? '' : 'none';
}

function applyPreviewSize() {
  const rW = clamp(parseInt(ratioWInput.value) || 10, 1, 100);
  const rH = clamp(parseInt(ratioHInput.value) || 5,  1, 100);
  gmRatioW = rW; gmRatioH = rH;
  ratioWInput.value = rW; ratioHInput.value = rH;
  let dispW, dispH;
  if (rW >= rH) { dispW = PREVIEW_PX; dispH = Math.round(PREVIEW_PX * rH / rW); }
  else          { dispH = PREVIEW_PX; dispW = Math.round(PREVIEW_PX * rW / rH); }
  checkerboard.style.width  = dispW + 'px';
  checkerboard.style.height = dispH + 'px';
}

// ============================================================
// 7. STOP HANDLES
// ============================================================

function renderStopHandles() {
  colorCont.innerHTML = '';
  for (const s of colorStops) {
    const el = document.createElement('div');
    el.className        = 'color-stop-handle' + (s === selectedStop ? ' selected' : '');
    el.style.left       = s.pos * 100 + '%';
    el.style.background = s.color;
    el.addEventListener('pointerdown', e => { e.stopPropagation(); selectStop(s, 'color'); startDrag(e, s, 'color'); });
    colorCont.appendChild(el);
  }

  opacityCont.innerHTML = '';
  for (const s of opacityStops) {
    const el = document.createElement('div');
    el.className  = 'opacity-stop-handle' + (s === selectedStop ? ' selected' : '');
    el.style.left = s.pos * 100 + '%';
    const grey    = Math.round(s.opacity * 220 + 20);
    el.style.background = `rgb(${grey},${grey},${grey})`;
    el.addEventListener('pointerdown', e => { e.stopPropagation(); selectStop(s, 'opacity'); startDrag(e, s, 'opacity'); });
    opacityCont.appendChild(el);
  }
}

function selectStop(stop, type) {
  selectedStop = stop;
  selectedType = type;
  editPanel.style.display = 'flex';
  if (type === 'color') {
    editLabel.textContent         = 'Color Stop';
    colorPicker.style.display     = 'inline-block';
    colorPicker.value             = stop.color;
    opacityControls.style.display = 'none';
  } else {
    editLabel.textContent         = 'Opacity Stop';
    colorPicker.style.display     = 'none';
    opacityControls.style.display = '';
    opacitySlider.value           = stop.opacity;
    opacityPicker.value           = stop.opacity;
  }
  renderStopHandles();
}

function deselectStop() {
  selectedStop = null;
  selectedType = null;
  editPanel.style.display = 'none';
  renderStopHandles();
}

function startDrag(e, stop, stType) {
  e.preventDefault();
  const container = stType === 'color' ? colorCont : opacityCont;
  const rect      = container.getBoundingClientRect();
  const startX    = e.clientX;
  const startPos  = stop.pos;
  let   moved     = false;

  function onMove(ev) {
    ev.preventDefault();
    stop.pos = clamp(startPos + (ev.clientX - startX) / rect.width, 0, 1);
    moved = true;
    update();
  }
  function cleanup() {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', cleanup);
    if (moved) pushHistory(stType === 'color' ? 'Moved color stop' : 'Moved opacity stop');
  }
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', cleanup);
}

// ============================================================
// 8. DOM WIRING
// ============================================================

// Deselect when clicking outside the editor area
document.addEventListener('pointerdown', e => {
  if (!selectedStop) return;
  if (editPanel.contains(e.target)    ||
      colorCont.contains(e.target)    ||
      opacityCont.contains(e.target)  ||
      document.querySelector('.gradient-bar-wrap')?.contains(e.target)) return;
  deselectStop();
});

// Add stop by clicking the row
colorCont.addEventListener('click', e => {
  if (e.target !== colorCont) return;
  const rect    = colorCont.getBoundingClientRect();
  const pos     = clamp((e.clientX - rect.left) / rect.width, 0, 1);
  const s       = interpolateColor(colorStops, pos);
  const hex     = '#' + [s.r, s.g, s.b].map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
  const newStop = { pos, color: hex };
  colorStops.push(newStop);
  selectStop(newStop, 'color');
  update();
  pushHistory('Added color stop');
});

opacityCont.addEventListener('click', e => {
  if (e.target !== opacityCont) return;
  const rect    = opacityCont.getBoundingClientRect();
  const pos     = clamp((e.clientX - rect.left) / rect.width, 0, 1);
  const newStop = { pos, opacity: interpolateOpacity(opacityStops, pos) };
  opacityStops.push(newStop);
  selectStop(newStop, 'opacity');
  update();
  pushHistory('Added opacity stop');
});

// Add stop buttons
document.getElementById('add-color-stop-button').addEventListener('click', () => {
  const s = { pos: 0.5, color: '#888888' };
  colorStops.push(s); selectStop(s, 'color'); update();
  pushHistory('Added color stop');
});
document.getElementById('add-opacity-stop-button').addEventListener('click', () => {
  const s = { pos: 0.5, opacity: 1 };
  opacityStops.push(s); selectStop(s, 'opacity'); update();
  pushHistory('Added opacity stop');
});

// Color picker — push once on mouseup (after color is set), update live on input
colorPicker.addEventListener('input', e => {
  if (selectedType === 'color' && selectedStop) { selectedStop.color = e.target.value; update(); }
});
colorPicker.addEventListener('change', () => {
  pushHistory('Changed stop color');
});

// Opacity slider — push on pointerup (after drag ends), update live on input
opacitySlider.addEventListener('input', e => {
  if (selectedType === 'opacity' && selectedStop) {
    selectedStop.opacity = parseFloat(e.target.value);
    opacityPicker.value  = selectedStop.opacity;
    update();
  }
});
opacitySlider.addEventListener('pointerup', () => { pushHistory('Changed stop opacity'); });
opacityPicker.addEventListener('input', e => {
  if (selectedType === 'opacity' && selectedStop) {
    selectedStop.opacity = clamp(parseFloat(e.target.value) || 0, 0, 1);
    opacitySlider.value  = selectedStop.opacity;
    update();
  }
});
opacityPicker.addEventListener('change', () => { pushHistory('Changed stop opacity'); });

// Delete stop
document.getElementById('delete-stop-button').addEventListener('click', () => {
  if (selectedType === 'color'   && colorStops.length   > 2) colorStops   = colorStops.filter(s => s !== selectedStop);
  if (selectedType === 'opacity' && opacityStops.length > 2) opacityStops = opacityStops.filter(s => s !== selectedStop);
  deselectStop(); update();
  pushHistory('Deleted stop');
});

// Gradient type
typeSelect.addEventListener('change', e => {
  gmType = e.target.value; update();
  pushHistory(`Type → ${e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)}`);
});

// Scale X / Y
function syncScale(slider, num, setFn, labelPrefix) {
  slider.addEventListener('input', e => { const v = parseFloat(e.target.value); num.value = v; setFn(v); update(); });
  slider.addEventListener('pointerup', () => { pushHistory(`${labelPrefix} changed`); });
  num.addEventListener('input', e => { const v = clamp(parseFloat(e.target.value) || 1, 0.1, 5); slider.value = v; num.value = v; setFn(v); update(); });
  num.addEventListener('change', () => { pushHistory(`${labelPrefix} changed`); });
}
syncScale(scaleXSlider, scaleXNum, v => gmScaleX = v, 'Scale X');
syncScale(scaleYSlider, scaleYNum, v => gmScaleY = v, 'Scale Y');

// Angle dial
angleDial.addEventListener('pointerdown', e => {
  e.preventDefault();
  const rect = angleDial.getBoundingClientRect();
  const cx   = rect.left + rect.width  / 2;
  const cy   = rect.top  + rect.height / 2;
  const initialMouseAngle = Math.atan2(e.clientX - cx, -(e.clientY - cy)) * 180 / Math.PI;
  const initialAngle      = gmAngle;
  let   moved             = false;
  function onMove(ev) {
    const mouseAngle = Math.atan2(ev.clientX - cx, -(ev.clientY - cy)) * 180 / Math.PI;
    gmAngle = ((initialAngle + (mouseAngle - initialMouseAngle)) % 360 + 360) % 360;
    moved = true;
    update();
  }
  function cleanup() {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', cleanup);
    if (moved) pushHistory(`Angle → ${Math.round(gmAngle)}°`);
  }
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', cleanup);
});
angleNumber.addEventListener('input', e => {
  gmAngle = ((parseFloat(e.target.value) || 0) % 360 + 360) % 360;
  update();
});
angleNumber.addEventListener('change', () => { pushHistory(`Angle → ${Math.round(gmAngle)}°`); });

// Position sliders
posXSlider.addEventListener('input', e => { gmPosX = +e.target.value; posXNum.value = gmPosX; update(); });
posXSlider.addEventListener('pointerup', () => { pushHistory('Center X changed'); });
posXNum.addEventListener('input', e => { gmPosX = +e.target.value; posXSlider.value = gmPosX; update(); });
posXNum.addEventListener('change', () => { pushHistory('Center X changed'); });

posYSlider.addEventListener('input', e => { gmPosY = +e.target.value; posYNum.value = gmPosY; update(); });
posYSlider.addEventListener('pointerup', () => { pushHistory('Center Y changed'); });
posYNum.addEventListener('input', e => { gmPosY = +e.target.value; posYSlider.value = gmPosY; update(); });
posYNum.addEventListener('change', () => { pushHistory('Center Y changed'); });

// Canvas ratio
document.getElementById('apply-ratio-button').addEventListener('click', () => {
  applyPreviewSize(); update();
  pushHistory(`Canvas ratio: ${gmRatioW}×${gmRatioH}`);
});
ratioWInput.addEventListener('keydown', e => { if (e.key === 'Enter') { applyPreviewSize(); update(); } });
ratioHInput.addEventListener('keydown', e => { if (e.key === 'Enter') { applyPreviewSize(); update(); } });

ratioLockBtn.addEventListener('click', () => {
  ratioLocked = !ratioLocked;
  ratioLockBtn.textContent = ratioLocked ? '🔒' : '🔓';
  ratioLockBtn.classList.toggle('locked', ratioLocked);
  ratioLockBtn.title = ratioLocked ? 'Ratio locked — W scales H' : 'Lock ratio proportions';
});
ratioWInput.addEventListener('input', () => {
  if (!ratioLocked) return;
  const w = clamp(parseInt(ratioWInput.value) || gmRatioW, 1, 100);
  ratioHInput.value = clamp(Math.round(w * gmRatioH / gmRatioW), 1, 100);
});
ratioHInput.addEventListener('input', () => {
  if (!ratioLocked) return;
  const h = clamp(parseInt(ratioHInput.value) || gmRatioH, 1, 100);
  ratioWInput.value = clamp(Math.round(h * gmRatioW / gmRatioH), 1, 100);
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (exportModal.style.display) exportModal.style.display = '';
  }
});

// ============================================================
// 9. EXPORT
// ============================================================

const exportModal      = document.getElementById('export-modal');
const exportScaleRange = document.getElementById('export-scale-slider');
const exportScaleNum   = document.getElementById('export-scale-number');
const exportSizeLabel  = document.getElementById('export-size-label');
const exportPreviewLbl = document.getElementById('export-preview-label');

function getMaxScale() {
  return Math.max(1, Math.floor(MAX_EXPORT_PX / Math.max(gmRatioW, gmRatioH)));
}

function updateExportSizeLabel() {
  const scale = clamp(parseInt(exportScaleRange.value) || 100, 1, getMaxScale());
  exportSizeLabel.textContent = `${gmRatioW * scale} × ${gmRatioH * scale} px`;
}

exportScaleRange.addEventListener('input', () => {
  const v = clamp(parseInt(exportScaleRange.value) || 100, 1, getMaxScale());
  exportScaleRange.value = v; exportScaleNum.value = v;
  updateExportSizeLabel();
});
exportScaleNum.addEventListener('input', () => {
  const v = clamp(parseInt(exportScaleNum.value) || 100, 1, getMaxScale());
  exportScaleNum.value = v; exportScaleRange.value = v;
  updateExportSizeLabel();
});

document.getElementById('download-png-button').addEventListener('click', () => {
  const maxScale = getMaxScale();
  exportScaleRange.max = maxScale; exportScaleNum.max = maxScale;
  const cur = clamp(parseInt(exportScaleRange.value) || 100, 1, maxScale);
  exportScaleRange.value = cur; exportScaleNum.value = cur;
  exportPreviewLbl.textContent = `Ratio ${gmRatioW}×${gmRatioH}  —  max ${maxScale}× (${gmRatioW * maxScale}×${gmRatioH * maxScale} px)`;
  updateExportSizeLabel();
  exportModal.style.display = 'block';
});

document.getElementById('export-modal-close').addEventListener('click', () => { exportModal.style.display = ''; });
exportModal.addEventListener('click', e => { if (e.target === exportModal) exportModal.style.display = ''; });

document.getElementById('export-confirm-button').addEventListener('click', () => {
  const scale = clamp(parseInt(exportScaleRange.value) || 100, 1, getMaxScale());
  const pxW   = gmRatioW * scale;
  const pxH   = gmRatioH * scale;
  exportModal.style.display = '';

  const btn = document.getElementById('download-png-button');
  btn.textContent = '⏳ Rendering…'; btn.disabled = true;

  setTimeout(() => {
    const offscreen = document.createElement('canvas');
    offscreen.width = pxW; offscreen.height = pxH;
    drawGradient(offscreen.getContext('2d'), pxW, pxH, gmRatioW, gmRatioH);
    const a = document.createElement('a');
    a.href = offscreen.toDataURL('image/png');
    a.download = 'gradient.png'; a.click();
    dirtyFlag = false;
    btn.textContent = '⬇ Download PNG'; btn.disabled = false;
  }, 20);
});

// Download .wcgr
document.getElementById('download-wcgr-button').addEventListener('click', () => {
  const data = {
    type: gmType, angle: gmAngle,
    scaleX: gmScaleX, scaleY: gmScaleY,
    posX: gmPosX, posY: gmPosY,
    ratioW: gmRatioW, ratioH: gmRatioH,
    colorStops, opacityStops,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'gradient.wcgr'; a.click();
  URL.revokeObjectURL(url);
  dirtyFlag = false;
});

// ============================================================
// 10. IMPORT (.wcgr / templates)
// ============================================================

function loadWcgrData(d, label) {
  gmType   = d.type   || 'linear';
  gmAngle  = d.angle  || 0;
  gmScaleX = d.scaleX ?? 1;
  gmScaleY = d.scaleY ?? 1;
  gmPosX   = d.posX   ?? 50;
  gmPosY   = d.posY   ?? 50;
  gmRatioW = d.ratioW ?? 10;
  gmRatioH = d.ratioH ?? 5;
  colorStops   = d.colorStops   || [{ pos: 0, color: '#000' }, { pos: 1, color: '#fff' }];
  opacityStops = d.opacityStops || [{ pos: 0, opacity: 1 }, { pos: 1, opacity: 1 }];

  typeSelect.value   = gmType;
  angleNumber.value  = Math.round(gmAngle);
  scaleXSlider.value = gmScaleX; scaleXNum.value = gmScaleX;
  scaleYSlider.value = gmScaleY; scaleYNum.value = gmScaleY;
  posXSlider.value   = gmPosX;   posXNum.value   = gmPosX;
  posYSlider.value   = gmPosY;   posYNum.value   = gmPosY;
  ratioWInput.value  = gmRatioW; ratioHInput.value = gmRatioH;

  deselectStop();
  applyPreviewSize();
  update();
  pushHistory(label || 'Loaded file'); // push after state is fully applied
}

document.getElementById('upload-wcgr-input').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try { loadWcgrData(JSON.parse(ev.target.result), `Loaded: ${file.name}`); }
    catch { alert('Invalid .wcgr file.'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ============================================================
// 11. SAMPLER API
// ============================================================

window.wcgrParseSampler = function(data) {
  const cs = data.colorStops.slice().sort((a, b) => a.pos - b.pos);
  const os = data.opacityStops.slice().sort((a, b) => a.pos - b.pos);
  return function sample(t) {
    t = clamp(t, 0, 1);
    const c = interpolateColor(cs, t);
    const o = interpolateOpacity(os, t);
    return { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), a: o };
  };
};

// ============================================================
// 12. TEMPLATES MODAL
// ============================================================

// The gradient tool is the home of the template library.
// We expose the base URL so tools_shared.js can resolve paths correctly
// from any tool folder.
window._templateBase = ''; // empty = paths are relative to this page (tools/gradient/)

document.getElementById('open-templates-button').addEventListener('click', () => {
  window.openTemplateBrowser(data => {
    loadWcgrData(data, `Template: ${data.name || 'loaded'}`);
  });
});

// ============================================================
// 13. BEFOREUNLOAD WARNING
// ============================================================

window.addEventListener('beforeunload', e => {
  if (!dirtyFlag) return;
  e.preventDefault();
  e.returnValue = '';
});

// ============================================================
// 14. INIT
// ============================================================

applyPreviewSize();
update();
pushHistory('Default'); // always start with one entry so history is never empty
// ============================================================
// 15. ADVANCED — Import .wcgr as color stops
// ============================================================

(function initWcgrImport() {
  let importedWcgr = null;

  const importInput   = document.getElementById('advanced-import-input');
  const importClear   = document.getElementById('advanced-import-clear');
  const importApply   = document.getElementById('advanced-import-apply');
  const importPreview = document.getElementById('advanced-import-preview');
  const importStatus  = document.getElementById('advanced-import-status');
  const importLibBtn  = document.getElementById('advanced-import-library-btn');
  const rangeFrom     = document.getElementById('advanced-range-from');
  const rangeTo       = document.getElementById('advanced-range-to');
  const fromVal       = document.getElementById('advanced-range-from-val');
  const toVal         = document.getElementById('advanced-range-to-val');
  const replaceMode   = document.getElementById('advanced-replace-mode');

  if (!importInput) return; // advanced tooling not enabled

  // ── Shared loader — used by file upload AND library browse ────
  function setImportedWcgr(data, label) {
    if (!Array.isArray(data.colorStops) || data.colorStops.length < 2) {
      alert('Invalid .wcgr — needs at least 2 color stops.'); return;
    }
    importedWcgr = data;
    const stops = data.colorStops.map(s => `${s.color} ${(s.pos * 100).toFixed(1)}%`).join(', ');
    importPreview.style.background = `linear-gradient(to right, ${stops})`;
    importStatus.textContent = label;
    importStatus.classList.add('loaded');
    importApply.disabled = false;
  }

  // Library browse button
  if (importLibBtn) {
    importLibBtn.addEventListener('click', () => {
      window.openTemplateBrowser(data => {
        setImportedWcgr(data, data.name || 'Library template');
      });
    });
  }

  // Range slider labels
  function syncRangeLabels() {
    const f = parseInt(rangeFrom.value);
    const t = parseInt(rangeTo.value);
    fromVal.textContent = f + '%';
    toVal.textContent   = t + '%';
    // Enforce from < to
    if (f >= t) {
      rangeFrom.value = t - 1;
      fromVal.textContent = (t - 1) + '%';
    }
  }
  rangeFrom.addEventListener('input', syncRangeLabels);
  rangeTo.addEventListener('input', syncRangeLabels);

  // File upload
  importInput.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try   { setImportedWcgr(JSON.parse(e.target.result), file.name); }
      catch { alert('Could not parse .wcgr file.'); }
    };
    reader.readAsText(file);
  });

  // Clear
  importClear.addEventListener('click', () => {
    importedWcgr = null;
    importInput.value = '';
    importPreview.style.background = '';
    importStatus.textContent = 'No file loaded';
    importStatus.classList.remove('loaded');
    importApply.disabled = true;
  });

  // Apply — merge wcgr stops into the current gradient at the chosen range
  importApply.addEventListener('click', () => {
    if (!importedWcgr) return;

    const fromPct = parseInt(rangeFrom.value) / 100;
    const toPct   = parseInt(rangeTo.value)   / 100;
    const span    = toPct - fromPct;
    if (span <= 0) { alert('Range must be positive.'); return; }

    const doReplace = replaceMode.checked;

    if (doReplace) {
      // Remove existing color stops that fall inside the range
      colorStops = colorStops.filter(s => s.pos < fromPct || s.pos > toPct);
    }

    // Scale the imported stops into [fromPct, toPct]
    importedWcgr.colorStops.forEach(s => {
      colorStops.push({
        pos:   fromPct + s.pos * span,
        color: s.color,
      });
    });

    // Also merge opacity stops if present
    if (importedWcgr.opacityStops && importedWcgr.opacityStops.length) {
      if (doReplace) {
        opacityStops = opacityStops.filter(s => s.pos < fromPct || s.pos > toPct);
      }
      importedWcgr.opacityStops.forEach(s => {
        opacityStops.push({
          pos:     fromPct + s.pos * span,
          opacity: s.opacity,
        });
      });
    }

    deselectStop();
    update();
    pushHistory(`Imported .wcgr stops [${Math.round(fromPct*100)}%–${Math.round(toPct*100)}%]`);
    closeAdvancedDialog();
  });
})();

// ============================================================
// 16. RANDOMIZE
// ============================================================

(function initRandomize() {
  const modal           = document.getElementById('randomize-modal');
  const openBtn         = document.getElementById('open-randomize-button');
  const closeBtn        = document.getElementById('close-randomize-button');
  const grid            = modal ? modal.querySelector('.randomize-grid')     : null;
  const complementPanel = document.getElementById('complement-panel');
  const complementList  = document.getElementById('complement-stops-list');

  if (!modal || !openBtn) return;

  function showGrid() {
    grid.style.display            = '';
    complementPanel.style.display = 'none';
  }

  openBtn .addEventListener('click', () => { showGrid(); modal.style.display = 'block'; });
  closeBtn.addEventListener('click', () => { modal.style.display = ''; });
  modal   .addEventListener('click', e  => { if (e.target === modal) modal.style.display = ''; });

  // Helpers

  function rf(min, max) { return min + Math.random() * (max - min); }
  function ri(min, max) { return Math.floor(rf(min, max + 1)); }
  function randHex()    { return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0'); }

  function hslToHex(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return '#' + [r, g, b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  }

  function hexToHsl(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function harmonicPalette(n) {
    const baseHue = ri(0, 359);
    const sat     = ri(55, 90);
    const schemes = ['analogous', 'triadic', 'split-comp', 'monochrome'];
    const scheme  = schemes[ri(0, schemes.length - 1)];
    const hues    = [];
    const safe    = Math.max(n - 1, 1);

    if (scheme === 'analogous') {
      const spread = ri(20, 60);
      for (let i = 0; i < n; i++) hues.push((baseHue + (i / safe) * spread) % 360);
    } else if (scheme === 'triadic') {
      const b3 = [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360];
      for (let i = 0; i < n; i++) hues.push(b3[i % 3] + ri(-15, 15));
    } else if (scheme === 'split-comp') {
      const b3 = [baseHue, (baseHue + 150) % 360, (baseHue + 210) % 360];
      for (let i = 0; i < n; i++) hues.push(b3[i % 3] + ri(-10, 10));
    } else {
      for (let i = 0; i < n; i++) hues.push(baseHue + ri(-12, 12));
    }
    return hues.map((h, i) => {
      const light = scheme === 'monochrome' ? 30 + (i / safe) * 50 : ri(35, 72);
      return hslToHex(((h % 360) + 360) % 360, sat, light);
    });
  }

  function spreadPositions(n, jitter = 0) {
    const safe = Math.max(n - 1, 1);
    return Array.from({ length: n }, (_, i) => {
      let p = i / safe;
      if (jitter && i > 0 && i < n - 1) p = clamp(p + rf(-jitter, jitter), 0.05, 0.95);
      return p;
    });
  }

  function resetOpacity() {
    opacityStops = [{ pos: 0, opacity: 1 }, { pos: 1, opacity: 1 }];
  }

  function syncControls() {
    typeSelect.value   = gmType;
    angleNumber.value  = Math.round(gmAngle);
    scaleXSlider.value = gmScaleX; scaleXNum.value = gmScaleX;
    scaleYSlider.value = gmScaleY; scaleYNum.value = gmScaleY;
    posXSlider.value   = gmPosX;   posXNum.value   = gmPosX;
    posYSlider.value   = gmPosY;   posYNum.value   = gmPosY;
  }

  const TYPES = ['linear', 'radial', 'reflected', 'angle', 'diamond'];

  // Mode: Colors Only
  function randColors() {
    const colors = harmonicPalette(colorStops.length);
    colorStops = colorStops.map((s, i) => ({ ...s, color: colors[i] }));
    // opacity untouched
    deselectStop(); update();
    pushHistory('Randomize: Colors');
  }

  // Mode: Stops
  function randStops() {
    const n = ri(2, 6);
    const colors = harmonicPalette(n);
    colorStops = spreadPositions(n, 0.08).map((pos, i) => ({ pos, color: colors[i] }));
    resetOpacity();
    deselectStop(); update();
    pushHistory('Randomize: Stops');
  }

  // Mode: Everything Bounded
  function randBounded() {
    gmType   = TYPES[ri(0, TYPES.length - 1)];
    gmAngle  = ri(0, 359);
    gmPosX   = ri(30, 70);
    gmPosY   = ri(30, 70);
    gmScaleX = parseFloat(rf(0.6, 1.8).toFixed(2));
    gmScaleY = parseFloat(rf(0.6, 1.8).toFixed(2));
    const n  = ri(2, 5);
    const colors = harmonicPalette(n);
    colorStops = spreadPositions(n, 0.05).map((pos, i) => ({ pos, color: colors[i] }));
    resetOpacity(); // bounded always clean
    syncControls(); deselectStop(); update();
    pushHistory('Randomize: Everything (Bounded)');
  }

  // Mode: Everything Boundless
  function randBoundless() {
    gmType   = TYPES[ri(0, TYPES.length - 1)];
    gmAngle  = ri(0, 359);
    gmPosX   = ri(0, 100);
    gmPosY   = ri(0, 100);
    gmScaleX = parseFloat(rf(0.2, 3.0).toFixed(2));
    gmScaleY = parseFloat(rf(0.2, 3.0).toFixed(2));
    const n  = ri(2, 8);
    const rawPos = [0, 1];
    for (let i = 2; i < n; i++) rawPos.push(parseFloat(rf(0.05, 0.95).toFixed(3)));
    rawPos.sort((a, b) => a - b);
    colorStops = rawPos.map(pos => ({ pos, color: randHex() }));
    // Opacity: ~1-in-9 chance only
    if (Math.random() < 1 / 9) {
      opacityStops = [
        { pos: 0, opacity: parseFloat(rf(0.4, 1).toFixed(2)) },
        { pos: 1, opacity: parseFloat(rf(0.4, 1).toFixed(2)) },
      ];
      if (Math.random() > 0.5)
        opacityStops.push({ pos: parseFloat(rf(0.2, 0.8).toFixed(2)), opacity: parseFloat(rf(0.1, 1).toFixed(2)) });
    } else {
      resetOpacity();
    }
    syncControls(); deselectStop(); update();
    pushHistory('Randomize: Everything (Boundless)');
  }

  // Mode: Complement
  let lockState = [];

  function openComplement() {
    lockState = colorStops.map(() => false);
    renderComplementList();
    grid.style.display            = 'none';
    complementPanel.style.display = '';
  }

  function renderComplementList() {
    complementList.innerHTML = '';
    colorStops.forEach((stop, i) => {
      const row = document.createElement('div');
      row.className = 'complement-row';

      const swatch = document.createElement('div');
      swatch.className      = 'complement-swatch';
      swatch.style.background = stop.color;

      const info = document.createElement('div');
      info.className = 'complement-info';

      const hexLabel = document.createElement('span');
      hexLabel.className   = 'complement-hex';
      hexLabel.textContent = stop.color.toUpperCase();

      const posLabel = document.createElement('span');
      posLabel.className   = 'complement-pos';
      posLabel.textContent = Math.round(stop.pos * 100) + '%';

      info.appendChild(hexLabel);
      info.appendChild(posLabel);

      const lockBtn = document.createElement('button');
      lockBtn.className   = 'complement-lock' + (lockState[i] ? ' locked' : '');
      lockBtn.textContent = lockState[i] ? '🔒 Keep' : '🔓 Replace';
      lockBtn.title       = lockState[i] ? 'Locked — click to unlock' : 'Unlocked — click to lock';
      lockBtn.addEventListener('click', () => {
        lockState[i] = !lockState[i];
        renderComplementList();
      });

      row.appendChild(swatch);
      row.appendChild(info);
      row.appendChild(lockBtn);
      complementList.appendChild(row);
    });
  }

  // Given hex colors that are locked, generate a harmonious complement
  function findComplement(lockedHexes) {
    if (!lockedHexes.length) return harmonicPalette(1)[0];
    // Average the locked hues, pick a harmony offset, vary lightness/sat
    const hues = lockedHexes.map(h => hexToHsl(h).h);
    const avgHue = hues.reduce((a, b) => a + b, 0) / hues.length;
    const offsets = [180, 150, 210, 120, 240, 60, -60];
    const offset  = offsets[ri(0, offsets.length - 1)];
    const newHue  = ((avgHue + offset + ri(-20, 20)) % 360 + 360) % 360;
    return hslToHex(newHue, ri(55, 88), ri(35, 70));
  }

  document.getElementById('complement-cancel').addEventListener('click', showGrid);

  document.getElementById('complement-apply').addEventListener('click', () => {
    const lockedHexes = colorStops.filter((_, i) => lockState[i]).map(s => s.color);
    colorStops = colorStops.map((stop, i) =>
      lockState[i] ? stop : { ...stop, color: findComplement(lockedHexes) }
    );
    showGrid();
    modal.style.display = '';
    deselectStop(); update();
    pushHistory('Randomize: Complement');
  });

  // Wire buttons
  document.getElementById('rand-colors')    .addEventListener('click', () => { modal.style.display = ''; randColors();    });
  document.getElementById('rand-stops')     .addEventListener('click', () => { modal.style.display = ''; randStops();     });
  document.getElementById('rand-bounded')   .addEventListener('click', () => { modal.style.display = ''; randBounded();   });
  document.getElementById('rand-boundless') .addEventListener('click', () => { modal.style.display = ''; randBoundless(); });
  document.getElementById('rand-complement').addEventListener('click', openComplement);
})();