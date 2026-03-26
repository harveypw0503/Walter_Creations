// planogram.js

// ============================================================
// 0. ADVANCED TOOLING — register color slots
// ============================================================
window.registerAdvancedSlots([
  { id: 'color-board', label: 'Board Color',       default: '#8B6914' },
  { id: 'color-bag',   label: 'Bag/Item Color',    default: '#faedcd' },
  { id: 'color-number',label: 'Number Color',      default: '#d32f2f' },
  { id: 'color-hole',  label: 'Holes/Slots Color', default: '#222222' },
]);

window.onAdvancedApply = function () {
  // Trigger regeneration so gradient changes take effect
  document.getElementById('generate-button')?.click();
};

// ============================================================
// 1. STATE
// ============================================================
let placedItems = [];

// ============================================================
// 2. HELPERS
// ============================================================
function parseItems(rawText) {
  return rawText
    .trim()
    .split('\n')
    .filter(l => l.trim())
    .reduce((acc, line) => {
      const parts = line.split('|');
      if (parts.length < 3) return acc;
      const sku  = parts[0].trim();
      const desc = parts[1].trim();
      const m    = parts[2].trim().match(/(\d+)x(\d+)/i);
      if (!m) return acc;
      acc.push({ sku, desc, w: parseInt(m[1]), h: parseInt(m[2]) });
      return acc;
    }, []);
}


// Return a fill style for the given slot id.
// If a gradient override is loaded, returns a CanvasGradient
// covering the given bounding rect. Otherwise returns the hex color.

function getFill(ctx, slotId, fallbackColor, x, y, w, h) {
  const wcgr = window.advancedGradients && window.advancedGradients.get(slotId);
  if (wcgr) {
    return window.wcgrToCanvasGradient(ctx, wcgr, x, y, w, h) || fallbackColor;
  }
  return fallbackColor;
}

// ============================================================
// 3. CORE LOGIC
// ============================================================
function readInputs() {
  const [cols, rows] = (document.getElementById('grid-size')?.value || '16x8')
    .split('x')
    .map(n => parseInt(n) || 48);
  return {
    cols,
    rows,
    rawItems:      document.getElementById('item-list')?.value       || '',
    boardMode:     document.getElementById('board-mode')?.value      || 'pegboard',
    packingMode:   document.getElementById('packing-mode')?.value    || 'compact',
    horizontalGap: parseFloat(document.getElementById('horizontal-gap')?.value) || 0,
    verticalGap:   parseFloat(document.getElementById('vertical-gap')?.value)   || 0,
    boardColor:    document.getElementById('color-board')?.value     || '#c8a96e',
    bagColor:      document.getElementById('color-bag')?.value       || '#f0f0f0',
    numColor:      document.getElementById('color-number')?.value    || '#222222',
    holeColor:     document.getElementById('color-hole')?.value      || '#888888',
  };
}

function drawBoard(ctx, canvas, params) {
  const { cols, rows, boardMode, boardColor, holeColor } = params;
  const spacing = 30;
  const margin  = 60;

  // Board background — full canvas fill
  ctx.fillStyle = getFill(ctx, 'color-board', boardColor, 0, 0, canvas.width, canvas.height);
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (boardMode === 'pegboard') {
    ctx.fillStyle = getFill(ctx, 'color-hole', holeColor, 0, 0, canvas.width, canvas.height);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ctx.beginPath();
        ctx.arc(margin + x * spacing, margin + y * spacing, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    ctx.strokeStyle = getFill(ctx, 'color-hole', holeColor, 0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 3;
    for (let y = 0; y < rows; y++) {
      const lineY = margin + y * spacing;
      ctx.beginPath();
      ctx.moveTo(margin - 20, lineY);
      ctx.lineTo(canvas.width - margin + 20, lineY);
      ctx.stroke();
    }
  }
}

function drawItem(ctx, num, px, py, bagW, bagH, params) {
  const { bagColor, numColor } = params;

  // Bag fill — gradient is relative to this item's rect
  const itemX = px - bagW / 2;
  ctx.fillStyle = getFill(ctx, 'color-bag', bagColor, itemX, py, bagW, bagH);
  ctx.fillRect(itemX, py, bagW, bagH);

  ctx.strokeStyle = '#444';
  ctx.lineWidth = 3;
  ctx.strokeRect(itemX, py, bagW, bagH);

  // Number
  ctx.fillStyle = getFill(ctx, 'color-number', numColor, itemX, py, bagW, bagH);
  ctx.font = 'bold ' + Math.min(bagW * 0.45, 100) + 'px Arial';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(num.toString(), px, py + bagH / 2);
}

function placeItemsCompact(ctx, items, params) {
  const { cols, rows, horizontalGap, verticalGap } = params;
  const spacing = 30;
  const margin  = 60;
  let placed = 0;
  let skyline = new Array(cols + 1).fill(0);
  const preview = document.getElementById('planogram-preview');

  while (items.length > 0) {
    const item = items.shift();
    const { w, h } = item;
    let placeX = -1;
    let placeY = rows + 999;

    for (let x = 0; x <= cols - w; x++) {
      let maxUnder = 0;
      for (let i = 0; i < w; i++) maxUnder = Math.max(maxUnder, skyline[x + i]);
      if (maxUnder + h <= rows && maxUnder < placeY) { placeY = maxUnder; placeX = x; }
    }

    if (placeX === -1) {
      preview.innerHTML += `<p class="error">No space for ${item.sku}</p>`;
      break;
    }

    const px   = margin + (placeX + w / 2) * spacing;
    const py   = margin + placeY * spacing;
    const bagW = w * spacing - 4;
    const bagH = h * spacing - 4;

    drawItem(ctx, placed + 1, px, py, bagW, bagH, params);
    placedItems.push({ num: placed + 1, sku: item.sku, desc: item.desc });
    placed++;

    for (let i = 0; i < w + horizontalGap; i++) {
      if (placeX + i <= cols) skyline[placeX + i] = placeY + h + verticalGap;
    }
  }

  return placed;
}

function placeItemsRow(ctx, items, params) {
  const { cols, rows, horizontalGap, verticalGap } = params;
  const spacing = 30;
  const margin  = 60;
  let placed = 0;
  let gridX = 0;
  let gridY = 0;
  let currentRowMaxH = 0;
  const preview = document.getElementById('planogram-preview');

  while (items.length > 0) {
    const item = items[0];
    const { w, h } = item;

    if (gridX + w > cols) {
      gridY += currentRowMaxH + verticalGap;
      gridX  = 0;
      currentRowMaxH = 0;
    }

    if (gridY + h > rows) {
      preview.innerHTML = `<p class="error">Board full! Only ${placed} items placed.</p>`;
      break;
    }

    const px   = margin + (gridX + w / 2) * spacing;
    const py   = margin + gridY * spacing;
    const bagW = w * spacing - 4;
    const bagH = h * spacing - 4;

    drawItem(ctx, placed + 1, px, py, bagW, bagH, params);
    placedItems.push({ num: placed + 1, sku: item.sku, desc: item.desc });

    gridX += w + horizontalGap;
    currentRowMaxH = Math.max(currentRowMaxH, h);
    items.shift();
    placed++;
  }

  return placed;
}

function render(canvas, ctx, preview, params, downloadButtons) {
  const { cols, rows, rawItems, packingMode } = params;
  const spacing = 30;
  const margin  = 60;

  preview.innerHTML = '';
  placedItems = [];
  downloadButtons.forEach(btn => btn && (btn.disabled = true));

  canvas.width  = cols * spacing + margin * 2;
  canvas.height = rows * spacing + margin * 2;

  drawBoard(ctx, canvas, params);

  const items  = parseItems(rawItems);
  const placed = packingMode === 'compact'
    ? placeItemsCompact(ctx, items, params)
    : placeItemsRow(ctx, items, params);

  // Legend
  let legend = '<div class="legend"><h3>Item Legend</h3><table>';
  placedItems.forEach(i => {
    legend += `<tr><td><strong>#${i.num}</strong></td><td><strong>${i.sku}</strong></td><td>${i.desc}</td></tr>`;
  });
  legend += '</table></div>';

  preview.innerHTML = `<p class="success">Success! ${placed} items placed.</p>` + legend;
  preview.appendChild(canvas);
  canvas.style.display = 'block';

  downloadButtons.forEach(btn => btn && (btn.disabled = false));
}

// ============================================================
// 4. EXPORT
// ============================================================
function downloadPNG(canvas) {
  const a = document.createElement('a');
  a.download = 'pegboard-planogram.png';
  a.href = canvas.toDataURL();
  a.click();
}

function downloadTXT() {
  let txt = 'PEGBOARD PLANOGRAM - ITEM LIST\n\n';
  placedItems.forEach(i => (txt += `#${i.num} | ${i.sku} | ${i.desc}\n`));
  saveAs(new Blob([txt], { type: 'text/plain' }), 'pegboard-list.txt');
}

function downloadCSV() {
  let csv = 'Number,SKU,Description\n';
  placedItems.forEach(i => (csv += `${i.num},"${i.sku}","${i.desc.replace(/"/g, '""')}"\n`));
  saveAs(new Blob([csv], { type: 'text/csv' }), 'pegboard-list.csv');
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
            if (!confirm(`This preset is for "${data.tool}", not "${toolId}". Load anyway?`)) return;
          }
          applyParams(data.params || {});
          applyGradientSlots(data.gradients || {});
          if (typeof window.onAdvancedApply === 'function') window.onAdvancedApply();
        } catch (err) {
          alert('Could not read preset file. Please check it is a valid .wctp file.');
        }
      };
      reader.readAsText(file);
      this.value = '';
    });
}


function applyPlanogramPreset(p) {
  function set(id, val) { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; }
  if (p.cols !== undefined && p.rows !== undefined)
    set('grid-size', p.cols + 'x' + p.rows);
  set('item-list',      p.rawItems);
  set('board-mode',     p.boardMode);
  set('packing-mode',   p.packingMode);
  set('horizontal-gap', p.horizontalGap);
  set('vertical-gap',   p.verticalGap);
  set('color-board',    p.boardColor);
  set('color-bag',      p.bagColor);
  set('color-number',   p.numColor);
  set('color-hole',     p.holeColor);
}

document.addEventListener('DOMContentLoaded', () => {
  const canvas            = document.getElementById('planogram-canvas');
  const preview           = document.getElementById('planogram-preview');
  const generateButton    = document.getElementById('generate-button');
  const downloadPngButton = document.getElementById('download-png-button');
  const downloadTxtButton = document.getElementById('download-txt-button');
  const downloadCsvButton = document.getElementById('download-csv-button');
  const pegboardButton    = document.getElementById('pegboard-button');
  const slatwallButton    = document.getElementById('slatwall-button');
  const compactButton     = document.getElementById('compact-button');
  const rowButton         = document.getElementById('row-button');

  if (!canvas || !preview || !generateButton) return console.error('Required planogram elements not found');

  const ctx = canvas.getContext('2d');
  const downloadButtons = [downloadPngButton, downloadTxtButton, downloadCsvButton];

  function setBoardMode(mode) {
    document.getElementById('board-mode').value = mode;
    pegboardButton?.classList.toggle('active', mode === 'pegboard');
    slatwallButton?.classList.toggle('active', mode === 'slatwall');
  }

  function setPackingMode(mode) {
    document.getElementById('packing-mode').value = mode;
    compactButton?.classList.toggle('active', mode === 'compact');
    rowButton?.classList.toggle('active', mode === 'row');
  }

  pegboardButton?.addEventListener('click', () => setBoardMode('pegboard'));
  slatwallButton?.addEventListener('click', () => setBoardMode('slatwall'));
  compactButton?.addEventListener('click',  () => setPackingMode('compact'));
  rowButton?.addEventListener('click',      () => setPackingMode('row'));

  generateButton.addEventListener('click',    () => render(canvas, ctx, preview, readInputs(), downloadButtons));
  downloadPngButton?.addEventListener('click', () => downloadPNG(canvas));
  downloadTxtButton?.addEventListener('click', () => downloadTXT());
  wirePresetButtons('Planogram', () => readInputs(), applyPlanogramPreset, 'planogram_preset.wctp');
  downloadCsvButton?.addEventListener('click', () => downloadCSV());
});