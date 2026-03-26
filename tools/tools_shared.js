// tools_shared.js - shared JavaScript for all tools.

// ============================================================
// 1. INFO MODAL
// ============================================================

function openToolInfo() {
  const modal = document.querySelector('.tool-info-modal');
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeToolInfo() {
  const modal = document.querySelector('.tool-info-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('click', function (e) {
  if (e.target.classList.contains('tool-info-modal')) closeToolInfo();
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeToolInfo();
    closeAdvancedDialog();
  }
});

// ============================================================
// 2. ADVANCED DIALOG — open / close
// ============================================================

function openAdvancedDialog() {
  const el = document.getElementById('advanced-dialog-backdrop');
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAdvancedDialog() {
  const el = document.getElementById('advanced-dialog-backdrop');
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
}

// ============================================================
// 3. WCGR HELPERS  (exposed to tool scripts)
// ============================================================

window.advancedGradients = window.advancedGradients || new Map();

window.registerAdvancedSlots = window.registerAdvancedSlots || function () {};

function parseWCGR(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data.colorStops)) return null;
    return data;
  } catch (e) { return null; }
}

function getOpacityAt(opacityStops, pos) {
  if (!opacityStops || opacityStops.length === 0) return 1;
  let closest = opacityStops[0];
  opacityStops.forEach(os => {
    if (Math.abs(os.pos - pos) < Math.abs(closest.pos - pos)) closest = os;
  });
  return closest.opacity;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return { r, g, b };
}

function hexToRgba(hex, alpha) {
  const c = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha !== undefined ? alpha : 1})`;
}

function lerpHex(hex1, hex2, t) {
  const parse = h => {
    const c = h.replace('#', '');
    const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(hex1);
  const [r2, g2, b2] = parse(hex2);
  return '#' + [r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]
    .map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

// CSS linear-gradient string from wcgrData
function wcgrToCSS(wcgrData) {
  if (!wcgrData) return null;
  const angle = wcgrData.angle || 0;
  const stops = wcgrData.colorStops.map(stop => {
    const op = getOpacityAt(wcgrData.opacityStops, stop.pos);
    return `${hexToRgba(stop.color, op)} ${(stop.pos * 100).toFixed(1)}%`;
  });
  return `linear-gradient(${angle}deg, ${stops.join(', ')})`;
}

// Sample a wcgr at t (0–1) -> hex
function wcgrSampleColor(wcgrData, t) {
  if (!wcgrData || !wcgrData.colorStops || wcgrData.colorStops.length === 0) return '#000';
  const stops = wcgrData.colorStops;
  if (t <= stops[0].pos) return stops[0].color;
  if (t >= stops[stops.length - 1].pos) return stops[stops.length - 1].color;
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].pos && t <= stops[i + 1].pos) {
      const span = stops[i + 1].pos - stops[i].pos;
      const local = span === 0 ? 0 : (t - stops[i].pos) / span;
      return lerpHex(stops[i].color, stops[i + 1].color, local);
    }
  }
  return stops[stops.length - 1].color;
}

// Render a wcgr gradient into a new canvas of size w×h
function wcgrRenderToCanvas(wcgrData, w, h) {
  const type    = wcgrData.type   || 'linear';
  const theta   = (wcgrData.angle || 0) * Math.PI / 180;
  const cx      = (wcgrData.posX  ?? 50) / 100;
  const cy      = (wcgrData.posY  ?? 50) / 100;
  const scaleX  = wcgrData.scaleX ?? 1;
  const scaleY  = wcgrData.scaleY ?? 1;
  const cStops  = wcgrData.colorStops   || [];
  const oStops  = wcgrData.opacityStops || [];
  const aspect  = h > 0 && w > 0 ? h / w : 1;
  const cos = Math.cos(theta), sin = Math.sin(theta);
  const corners = [[0,0],[0,1],[1,0],[1,1]];

  // Linear range for normalisation
  let minP = Infinity, maxP = -Infinity;
  for (const [u,v] of corners) {
    const p = (u - cx)*cos + (v - cy)*aspect*sin;
    if (p < minP) minP = p;
    if (p > maxP) maxP = p;
  }
  const pRange = maxP - minP || 1;

  // Radial max-distance for normalisation
  let maxDist = 1;
  if (type === 'radial' || type === 'diamond') {
    const sqCy = cy * aspect;
    maxDist = Math.max(...corners.map(([u,v]) => {
      const dx = u-cx, dy = v*aspect - sqCy;
      return type === 'diamond' ? Math.abs(dx)+Math.abs(dy) : Math.sqrt(dx*dx+dy*dy);
    })) || 1;
  }

  // Helper: interpolate a stop array at t
  function interp(stops, t, key, def) {
    if (!stops || !stops.length) return def;
    if (t <= stops[0].pos) return stops[0][key] ?? def;
    const last = stops[stops.length-1];
    if (t >= last.pos) return last[key] ?? def;
    for (let i = 0; i < stops.length-1; i++) {
      if (t >= stops[i].pos && t <= stops[i+1].pos) {
        const f = (t - stops[i].pos) / ((stops[i+1].pos - stops[i].pos) || 1);
        const a = stops[i][key] ?? def, b = stops[i+1][key] ?? def;
        return typeof a === 'string' ? null : a + (b-a)*f; // numbers only
      }
    }
    return def;
  }

  function interpColor(t) {
    if (!cStops.length) return {r:0,g:0,b:0};
    if (t <= cStops[0].pos) return hexToRgb(cStops[0].color);
    if (t >= cStops[cStops.length-1].pos) return hexToRgb(cStops[cStops.length-1].color);
    for (let i = 0; i < cStops.length-1; i++) {
      if (t >= cStops[i].pos && t <= cStops[i+1].pos) {
        const f  = (t - cStops[i].pos) / ((cStops[i+1].pos - cStops[i].pos) || 1);
        const c1 = hexToRgb(cStops[i].color), c2 = hexToRgb(cStops[i+1].color);
        return { r: c1.r+(c2.r-c1.r)*f, g: c1.g+(c2.g-c1.g)*f, b: c1.b+(c2.b-c1.b)*f };
      }
    }
    return hexToRgb(cStops[cStops.length-1].color);
  }

  function interpOpacity(t) {
    if (!oStops.length) return 1;
    if (t <= oStops[0].pos) return oStops[0].opacity ?? 1;
    if (t >= oStops[oStops.length-1].pos) return oStops[oStops.length-1].opacity ?? 1;
    for (let i = 0; i < oStops.length-1; i++) {
      if (t >= oStops[i].pos && t <= oStops[i+1].pos) {
        const f  = (t - oStops[i].pos) / ((oStops[i+1].pos - oStops[i].pos) || 1);
        const o1 = oStops[i].opacity ?? 1, o2 = oStops[i+1].opacity ?? 1;
        return o1 + (o2-o1)*f;
      }
    }
    return 1;
  }

  const oc   = document.createElement('canvas');
  oc.width   = w;
  oc.height  = h;
  const octx = oc.getContext('2d');
  const img  = octx.createImageData(w, h);
  const d    = img.data;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const u = px / w, v = py / h;
      const dx = u - cx, dy = v - cy;
      let pos;

      if (type === 'linear' || type === 'reflected') {
        pos = ((dx*cos + dy*aspect*sin) - minP) / pRange;
        if (type === 'reflected') pos = Math.abs(2*pos - 1);
      } else if (type === 'angle') {
        const rx =  dx*cos + dy*sin;
        const ry = -dx*sin + dy*cos;
        pos = ((Math.atan2(ry, rx) + 2*Math.PI) % (2*Math.PI)) / (2*Math.PI);
      } else { // radial, diamond
        const sqDy = dy * aspect;
        const rx   =  dx*cos + sqDy*sin;
        const ry   = -dx*sin + sqDy*cos;
        const sx2  = scaleX > 0 ? rx/scaleX : rx;
        const sy2  = scaleY > 0 ? ry/scaleY : ry;
        pos = type === 'diamond'
          ? (Math.abs(sx2)+Math.abs(sy2)) / maxDist
          : Math.sqrt(sx2*sx2+sy2*sy2) / maxDist;
      }

      pos = pos < 0 ? 0 : pos > 1 ? 1 : pos;
      const c  = interpColor(pos);
      const op = interpOpacity(pos);
      const i  = (py*w + px)*4;
      d[i]   = Math.round(c.r);
      d[i+1] = Math.round(c.g);
      d[i+2] = Math.round(c.b);
      d[i+3] = Math.round(op*255);
    }
  }
  octx.putImageData(img, 0, 0);
  return oc;
}

// Create a Canvas fill style from wcgrData for a rect (x, y, w, h).
// Linear/reflected use native CanvasGradient when called with per-cell rects.
// Radial/diamond/angle render to an offscreen canvas the exact size of (w×h),
// returned as a CanvasPattern translated to (x,y) via setTransform.

function wcgrToCanvasGradient(ctx, wcgrData, x, y, w, h) {
  if (!wcgrData) return null;
  const type = wcgrData.type || 'linear';

  // Linear: native gradient, always worked, keep exactly as before
  if (type === 'linear') {
    const angle = ((wcgrData.angle || 0) * Math.PI) / 180;
    const cx = x + w / 2, cy = y + h / 2, half = Math.max(w, h) / 2;
    const grad = ctx.createLinearGradient(
      cx - Math.cos(angle) * half, cy - Math.sin(angle) * half,
      cx + Math.cos(angle) * half, cy + Math.sin(angle) * half
    );
    wcgrData.colorStops.forEach(stop => {
      const op = getOpacityAt(wcgrData.opacityStops, stop.pos);
      grad.addColorStop(stop.pos, hexToRgba(stop.color, op));
    });
    return grad;
  }

  // All other types: render a w×h offscreen canvas, return as pattern at (x,y)
  const oc      = wcgrRenderToCanvas(wcgrData, Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  const pattern = ctx.createPattern(oc, 'no-repeat');
  if (pattern) {
    try {
      const m = new DOMMatrix([1, 0, 0, 1, x, y]);
      pattern.setTransform(m);
    } catch (e) {
    }
  }
  return pattern || null;
}

window.wcgrToCanvasGradient = wcgrToCanvasGradient;
window.wcgrRenderToCanvas   = wcgrRenderToCanvas;
window.wcgrSampleColor      = wcgrSampleColor;
window.wcgrToCSS            = wcgrToCSS;
window.hexToRgba            = hexToRgba;
window.getOpacityAt         = getOpacityAt;

// ============================================================
// 4. ADVANCED DIALOG — wiring
// ============================================================

function applyAdvancedSettings() {
  closeAdvancedDialog();
  if (typeof window.onAdvancedApply === 'function') window.onAdvancedApply();
}

function updateSlotPreview(slotId, wcgrData) {
  const preview = document.getElementById(`advanced-preview-${slotId}`);
  const status  = document.getElementById(`advanced-status-${slotId}`);
  if (preview) {
    if (wcgrData) {
      preview.style.background = wcgrToCSS(wcgrData);
    } else {
      preview.style.background = '';
    }
  }
  if (status) {
    if (wcgrData) {
      status.textContent = 'Gradient loaded';
      status.classList.add('loaded');
    } else {
      status.textContent = 'No gradient';
      status.classList.remove('loaded');
    }
  }
}

function initAdvancedDialogWiring() {
  // Backdrop click to close
  const backdrop = document.getElementById('advanced-dialog-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', function (e) {
      if (e.target === this) closeAdvancedDialog();
    });
  }

  // Wire each .advanced-wcgr-input file input
  document.querySelectorAll('.advanced-wcgr-input').forEach(input => {
    input.addEventListener('change', function () {
      const slotId = this.dataset.slotId;
      const file   = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        const data = parseWCGR(e.target.result);
        if (!data) {
          alert('Could not parse this .wcgr file. Please check its format.');
          return;
        }
        window.advancedGradients.set(slotId, data);
        updateSlotPreview(slotId, data);
      };
      reader.readAsText(file);
    });
  });

  // Wire each .gradient-slot-clear button
  document.querySelectorAll('.gradient-slot-clear').forEach(btn => {
    btn.addEventListener('click', function () {
      const slotId = this.dataset.slotId;
      window.advancedGradients.delete(slotId);
      updateSlotPreview(slotId, null);
      // Also clear the file input
      const inp = document.querySelector(`.advanced-wcgr-input[data-slot-id="${slotId}"]`);
      if (inp) inp.value = '';
    });
  });

  // Wire color inputs inside the dialog to sync to page color inputs
  document.querySelectorAll('.gradient-slot-color[data-syncs]').forEach(colorEl => {
    const targetId = colorEl.dataset.syncs;
    colorEl.addEventListener('input', function () {
      const target = document.getElementById(targetId);
      if (target) {
        target.value = this.value;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  // Keep dialog color inputs in sync when page color inputs change
  document.querySelectorAll('[data-page-color-id]').forEach(pageInput => {
    const dialogId = pageInput.dataset.pageColorId;
    pageInput.addEventListener('input', function () {
      const dialogColor = document.getElementById(dialogId);
      if (dialogColor) dialogColor.value = this.value;
    });
  });
}

// ============================================================
// 5. BOOT
// ============================================================

// Show/hide the advanced button depending on setting
function initAdvancedButton() {
  let enabled = false;
  try { enabled = localStorage.getItem('advancedTooling') === 'true'; } catch (e) {}

  const btn      = document.getElementById('advanced-open-button');
  const backdrop = document.getElementById('advanced-dialog-backdrop');

  if (btn) btn.style.display = enabled ? '' : 'none';
  if (backdrop && !enabled) backdrop.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  initAdvancedButton();
  initAdvancedDialogWiring();
});

// ============================================================
// 6. WCGR TEMPLATE LIBRARY BROWSER
// ============================================================

// Exposes window.openTemplateBrowser(onSelect).
// Renders identically to the gradient tool's own template picker.
// Uses .tool-modal / .tool-modal-content for the backdrop/container
// Already styled in tools_shared.css
// Path logic: from any tool page at /tools/<name>/<tool>.html
// the gradient folder is always ../gradient/ away, except on gradient.html

(function () {

  var _index    = null;
  var _fetching = false;
  var _pending  = [];

  // Path Helper
  function _base() {
    return /\/gradient\//.test(window.location.pathname) ? '' : '../gradient/';
  }

  // Fetch Helpers
  function _fetchIndex(cb) {
    if (_index) { cb(_index); return; }
    _pending.push(cb);
    if (_fetching) return;
    _fetching = true;
    fetch(_base() + 'gradient_templates_index.json')
      .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(data) {
        _index = data; _fetching = false;
        _pending.forEach(function(fn) { fn(data); }); _pending = [];
      })
      .catch(function() {
        _fetching = false;
        _pending.forEach(function(fn) { fn(null); }); _pending = [];
      });
  }

  function _fetchTemplate(relFile, cb) {
    fetch(_base() + relFile)
      .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(data) { cb(data, null); })
      .catch(function(err) { cb(null, err); });
  }

  // Modal DOM (built once, reused)
  var _modal   = null;
  var _grid    = null;
  var _onSelect = null;

  function _buildModal() {
    if (_modal) return;

    _modal = document.createElement('div');
    _modal.className    = 'tool-modal';
    _modal.id           = 'tmpl-modal-backdrop';
    _modal.style.display  = '';
    _modal.style.zIndex   = '10200';

    var inner = document.createElement('div');
    inner.className = 'tool-modal-content tmpl-modal-content';

    var closeBtn = document.createElement('span');
    closeBtn.className   = 'tool-modal-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', _close);

    var heading = document.createElement('h2');
    heading.textContent = 'Templates';

    _grid = document.createElement('div');
    _grid.className = 'tmpl-grid';
    _grid.id        = 'tmpl-grid';

    inner.appendChild(closeBtn);
    inner.appendChild(heading);
    inner.appendChild(_grid);
    _modal.appendChild(inner);
    document.body.appendChild(_modal);

    // Close on backdrop click
    _modal.addEventListener('click', function(e) {
      if (e.target === _modal) _close();
    });
    // Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && _modal.style.display === 'block') _close();
    });
  }

  function _open(onSelect) {
    _buildModal();
    _onSelect = onSelect;
    _modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    _showSeriesList();
  }

  function _close() {
    if (!_modal) return;
    _modal.style.display = '';
    document.body.style.overflow = '';
    _onSelect = null;
  }

  // Series list
  function _showSeriesList() {
    _grid.innerHTML  = '<span class="tmpl-loading">…</span>';
    _grid.className  = 'tmpl-grid';
    _fetchIndex(function(index) {
      if (!index) {
        _grid.innerHTML = '<span class="tmpl-loading">Could not load templates.</span>';
        return;
      }
      _grid.innerHTML = '';
      _grid.className = 'tmpl-grid tmpl-series-view';
      index.forEach(function(series) {
        var card = document.createElement('button');
        card.className = 'tmpl-series-card';
        card.innerHTML =
          '<span class="tmpl-series-name">' + series.series + '</span>' +
          '<span class="tmpl-series-count">' + series.templates.length +
            ' template' + (series.templates.length !== 1 ? 's' : '') + '</span>' +
          '<span class="tmpl-series-arrow">›</span>';
        card.addEventListener('click', function() { _showTemplateList(series); });
        _grid.appendChild(card);
      });
    });
  }

  // Template list
  function _showTemplateList(series) {
    _grid.innerHTML = '';
    _grid.className = 'tmpl-grid tmpl-templates-view';

    var back = document.createElement('button');
    back.className   = 'tmpl-back-btn';
    back.textContent = '← Back';
    back.addEventListener('click', _showSeriesList);
    _grid.appendChild(back);

    var heading = document.createElement('h3');
    heading.className   = 'tmpl-series-heading';
    heading.textContent = series.series;
    _grid.appendChild(heading);

    var cards = document.createElement('div');
    cards.className = 'tmpl-cards';

    series.templates.forEach(function(t) {
      var card = document.createElement('button');
      card.className   = 'tmpl-card';
      card.textContent = t.name;
      card.addEventListener('click', function() {
        var prev     = card.textContent;
        card.textContent = '…';
        card.disabled    = true;
        _fetchTemplate(t.file, function(data, err) {
          card.textContent = prev;
          card.disabled    = false;
          if (err || !data) { alert('Could not load: ' + t.name); return; }
          if (_onSelect) _onSelect(data);
          _close();
        });
      });
      cards.appendChild(card);
    });

    _grid.appendChild(cards);
  }

  // Public API
  window.openTemplateBrowser = _open;

  // Add library button into every gradient slot
  function _addLibButtons() {
    if (!document.querySelector('.advanced-wcgr-input')) return;

    document.querySelectorAll('.gradient-slot-bottom').forEach(function(slotBottom) {
      var slotEl    = slotBottom.closest('.gradient-slot');
      var wcgrInput = slotEl ? slotEl.querySelector('.advanced-wcgr-input') : null;
      if (!wcgrInput) return;

      var slotId = wcgrInput.dataset.slotId;
      var btn    = document.createElement('button');
      btn.type        = 'button';
      btn.className   = 'gradient-slot-lib';
      btn.title       = 'Browse template library';
      btn.textContent = '📁 Library';
      btn.addEventListener('click', function() {
        _open(function(data) {
          window.advancedGradients.set(slotId, data);
          updateSlotPreview(slotId, data);
        });
      });

      var clearBtn = slotBottom.querySelector('.gradient-slot-clear');
      if (clearBtn) slotBottom.insertBefore(btn, clearBtn);
      else          slotBottom.appendChild(btn);
    });
  }

  document.addEventListener('DOMContentLoaded', _addLibButtons);

})();

// ============================================================
// 7. COLLAPSIBLE ADVANCED SECTIONS — localStorage persistence
// ============================================================

(function () {
  var STORE_PREFIX = 'wc_adv_section_';

  function initSections() {
    document.querySelectorAll('.advanced-dialog-body .advanced-section[id]').forEach(function (det) {
      var key    = STORE_PREFIX + det.id;
      var stored = localStorage.getItem(key);

      if (stored === 'open')   det.open = true;
      if (stored === 'closed') det.open = false;

      det.addEventListener('toggle', function () {
        localStorage.setItem(key, det.open ? 'open' : 'closed');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initSections);
})();