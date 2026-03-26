// stone.js

// ============================================================
// 0. ADVANCED TOOLING — register color slots
// ============================================================
window.registerAdvancedSlots([
  { id: 'stone-color',  label: 'Stone Color',  default: '#a89880' },
  { id: 'mortar-color', label: 'Mortar Color', default: '#111111' },
]);

window.onAdvancedApply = function () {
  const canvas = document.getElementById('stone-canvas');
  if (!canvas) return;
  render(canvas, canvas.getContext('2d'), readInputs());
};

// ============================================================
// 1. DEFAULTS
// ============================================================
const DEFAULTS = {
  style:          'stone',
  width:          900,
  height:         600,
  color:          '#a89880',
  lightingEnabled: false,
  lightDirection: 'center',
  lightStrength:  20,
  stoneSize:      5,
  mortarWidth:    4,
  mortarColor:    '#111111',
  stoneOpacity:   100,
  mortarOpacity:  100,
  gradientMode:   'per-stone',
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

function stoneSizeMultiplier(size) {
  return Math.pow(10, (5 - size) * 0.25) / Math.pow(10, 0);
}

function insetPolygon(vertices, inset) {
  if (inset <= 0) return vertices;
  let cx = 0, cy = 0;
  for (const [x, y] of vertices) { cx += x; cy += y; }
  cx /= vertices.length;
  cy /= vertices.length;
  return vertices.map(([x, y]) => {
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const pull = Math.min(inset, dist * 0.9); // never collapse fully
    return [x - (dx / dist) * pull, y - (dy / dist) * pull];
  });
}

function gridSize(stoneSize) {
  return Math.round(16 + (stoneSize - 1) * 5.8);
}

// Build a global gradient spanning the full canvas.
function buildGlobalGradient(ctx, stoneGradient, width, height) {
  return window.wcgrToCanvasGradient(ctx, stoneGradient, 0, 0, width, height);
}

// Fill the canvas background with mortar color/gradient at given opacity.
// Returns true if mortar was drawn.
function drawMortarBackground(ctx, width, height, params, mortarGradient) {
  const { mortarColor, mortarOpacity, gradientMode } = params;
  if (mortarOpacity <= 0) return false;

  const alpha = mortarOpacity / 100;
  ctx.save();
  ctx.globalAlpha = alpha;

  if (mortarGradient) {
    ctx.fillStyle = buildGlobalGradient(ctx, mortarGradient, width, height);
  } else {
    ctx.fillStyle = mortarColor;
  }
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  return true;
}

// Draw a single stone cell (already computed as inset vertices).
function drawStoneCell(ctx, verts, isCobbled) {
  ctx.beginPath();
  if (isCobbled) {
    for (let j = 0; j < verts.length; j++) {
      const p0 = verts[j];
      const p1 = verts[(j + 1) % verts.length];
      const mx = (p0[0] + p1[0]) / 2;
      const my = (p0[1] + p1[1]) / 2;
      if (j === 0) ctx.moveTo(mx, my);
      else ctx.quadraticCurveTo(p0[0], p0[1], mx, my);
    }
  } else {
    for (let j = 0; j < verts.length; j++) {
      if (j === 0) ctx.moveTo(verts[0][0], verts[0][1]);
      else ctx.lineTo(verts[j][0], verts[j][1]);
    }
  }
  ctx.closePath();
}

function stoneStyle(ctx, stoneGradient, globalGradient, verts, color, scatterColor) {
  if (scatterColor) return scatterColor;
  if (globalGradient)   return globalGradient;
  if (stoneGradient) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of verts) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return window.wcgrToCanvasGradient(ctx, stoneGradient, minX, minY, maxX - minX, maxY - minY) || color;
  }
  return color;
}

// ============================================================
// 3. CORE LOGIC
// ============================================================
function readInputs() {
  return {
    style:          document.getElementById('stone-style')?.value              || DEFAULTS.style,
    width:          clamp(document.getElementById('canvas-width')?.value,  300, 5000),
    height:         clamp(document.getElementById('canvas-height')?.value, 300, 5000),
    color:          document.getElementById('stone-color')?.value              || DEFAULTS.color,
    lightingEnabled: !!document.getElementById('lighting-toggle')?.checked,
    lightDirection: document.getElementById('light-direction')?.value          || DEFAULTS.lightDirection,
    lightStrength:  clamp(document.getElementById('lighting-strength')?.value, 0, 100),
    stoneSize:      clamp(document.getElementById('advanced-stone-size')?.value    ?? DEFAULTS.stoneSize,    1, 50),
    mortarWidth:    clamp(document.getElementById('advanced-mortar-width')?.value  ?? DEFAULTS.mortarWidth,  0, 200),
    mortarColor:    document.getElementById('advanced-color-mortar-color')?.value  || DEFAULTS.mortarColor,
    stoneOpacity:   clamp(document.getElementById('advanced-stone-opacity')?.value ?? DEFAULTS.stoneOpacity, 0, 100),
    mortarOpacity:  clamp(document.getElementById('advanced-mortar-opacity')?.value ?? DEFAULTS.mortarOpacity, 0, 100),
    gradientMode:   document.querySelector('input[name="advanced-gradient-mode"]:checked')?.value || DEFAULTS.gradientMode,
    variation:      document.getElementById('stone-variation')?.value || 'default',
  };
}

// Cut (Legacy) — scale-driven density, black stroke mortar, no inset, no size/mortar controls.
// Gradients are still applied to the fill.
function generateCutStone(ctx, width, height, params, color, stoneGradient, mortarGradient) {
  const { gradientMode } = params;

  const scale          = Math.sqrt((width * height) / (900 * 600));
  const numPoints      = Math.floor(300 * scale);
  const jitter         = 6 * scale;
  const curveIntensity = 0.5;
  const strokeWidth    = 2 * scale;

  const globalGradient = (stoneGradient && gradientMode === 'global')
    ? buildGlobalGradient(ctx, stoneGradient, width, height) : null;
  const isScatterMode  = (stoneGradient && gradientMode === 'scatter');

  const points = Array.from({ length: numPoints }, () => [
    Math.random() * width, Math.random() * height,
  ]);

  const delaunay = d3.Delaunay.from(points);
  const voronoi  = delaunay.voronoi([0, 0, width, height]);

  ctx.lineJoin = 'round';

  for (let i = 0; i < points.length; i++) {
    const cell = voronoi.cellPolygon(i);
    if (!cell) continue;

    const jittered = cell.map(([x, y]) => [
      x + (Math.random() - 0.5) * jitter,
      y + (Math.random() - 0.5) * jitter,
    ]);

    ctx.beginPath();
    for (let j = 0; j < jittered.length; j++) {
      const cur    = jittered[j];
      const next   = jittered[(j + 1) % jittered.length];
      const midX   = (cur[0] + next[0]) / 2;
      const midY   = (cur[1] + next[1]) / 2;
      const dx     = next[1] - cur[1];
      const dy     = cur[0]  - next[0];
      const mag    = Math.sqrt(dx * dx + dy * dy) || 1;
      const normDx = dx / mag;
      const normDy = dy / mag;
      const cpX    = midX + normDx * curveIntensity * jitter;
      const cpY    = midY + normDy * curveIntensity * jitter;
      if (j === 0) ctx.moveTo(cur[0], cur[1]);
      ctx.quadraticCurveTo(cpX, cpY, next[0], next[1]);
    }
    ctx.closePath();

    const scatterColor = isScatterMode ? window.wcgrSampleColor(stoneGradient, Math.random()) : null;
    ctx.fillStyle = stoneStyle(ctx, stoneGradient, globalGradient, jittered, color, scatterColor);
    ctx.fill();
    ctx.lineWidth   = strokeWidth;
    ctx.strokeStyle = 'black';
    ctx.stroke();
  }
}

function generateCobbledStone(ctx, width, height, params, color, stoneGradient, mortarGradient) {
  const { stoneSize, mortarWidth, stoneOpacity, gradientMode } = params;

  const areaRatio       = (width * height) / (900 * 600);
  const basePoints      = 600;
  const numPoints       = Math.max(12, Math.round(basePoints * areaRatio * stoneSizeMultiplier(stoneSize)));
  const relaxIterations = 2;
  const inset           = mortarWidth / 2;

  const globalGradient = (stoneGradient && gradientMode === 'global')
    ? buildGlobalGradient(ctx, stoneGradient, width, height) : null;
  const isScatterMode  = (stoneGradient && gradientMode === 'scatter');

  let points = Array.from({ length: numPoints }, () => [
    Math.random() * width, Math.random() * height,
  ]);

  for (let i = 0; i < relaxIterations; i++) {
    const del = d3.Delaunay.from(points);
    const vor = del.voronoi([0, 0, width, height]);
    points = points.map((_, idx) => {
      const cell = vor.cellPolygon(idx);
      if (!cell) return points[idx];
      let x = 0, y = 0;
      for (const [px, py] of cell) { x += px; y += py; }
      return [x / cell.length, y / cell.length];
    });
  }

  const delaunay = d3.Delaunay.from(points);
  const voronoi  = delaunay.voronoi([0, 0, width, height]);

  ctx.save();
  ctx.globalAlpha = stoneOpacity / 100;
  ctx.lineJoin    = 'round';

  for (let i = 0; i < points.length; i++) {
    const cell = voronoi.cellPolygon(i);
    if (!cell) continue;

    const insetVerts = insetPolygon(cell, inset);

    ctx.beginPath();
    for (let j = 0; j < insetVerts.length; j++) {
      const p0 = insetVerts[j];
      const p1 = insetVerts[(j + 1) % insetVerts.length];
      const mx = (p0[0] + p1[0]) / 2;
      const my = (p0[1] + p1[1]) / 2;
      if (j === 0) ctx.moveTo(mx, my);
      else ctx.quadraticCurveTo(p0[0], p0[1], mx, my);
    }
    ctx.closePath();

    const scatterColor = isScatterMode ? window.wcgrSampleColor(stoneGradient, Math.random()) : null;
    ctx.fillStyle = stoneStyle(ctx, stoneGradient, globalGradient, insetVerts, color, scatterColor);
    ctx.fill();
  }

  ctx.restore();
}


// ============================================================
// GRID HELPER — fills a single rectangular/polygonal cell
// ============================================================
function fillStoneCell(ctx, verts, stoneGradient, globalGradient, isScatterMode, color) {
  const scatterColor = isScatterMode ? window.wcgrSampleColor(stoneGradient, Math.random()) : null;
  ctx.fillStyle = stoneStyle(ctx, stoneGradient, globalGradient, verts, color, scatterColor);
  ctx.fill();
}

// Inset rect helper — returns [[x,y],[x2,y],[x2,y2],[x,y2]]
function buildInsetRect(x, y, w, h, inset) {
  const i = inset;
  return [
    [x + i, y + i],
    [x + w - i, y + i],
    [x + w - i, y + h - i],
    [x + i, y + h - i],
  ];
}

function drawRectanglePath(ctx, verts) {
  ctx.beginPath();
  ctx.moveTo(verts[0][0], verts[0][1]);
  for (let k = 1; k < verts.length; k++) ctx.lineTo(verts[k][0], verts[k][1]);
  ctx.closePath();
}

// FLAGSTONE
function generateFlagstone(ctx, width, height, params, color, stoneGradient, mortarGradient) {
  const { stoneSize, mortarWidth, stoneOpacity, gradientMode } = params;

  const areaRatio  = (width * height) / (900 * 600);
  const basePoints = 80;
  const numPoints  = Math.max(4, Math.round(basePoints * areaRatio * stoneSizeMultiplier(stoneSize)));
  const inset      = mortarWidth / 2;
  const globalGradient = (stoneGradient && gradientMode === 'global') ? buildGlobalGradient(ctx, stoneGradient, width, height) : null;
  const isScatterMode  = (stoneGradient && gradientMode === 'scatter');

  let points = Array.from({ length: numPoints }, () => [Math.random() * width, Math.random() * height]);
  for (let r = 0; r < 3; r++) {
    const del = d3.Delaunay.from(points);
    const vor = del.voronoi([0, 0, width, height]);
    points = points.map((_, idx) => {
      const cell = vor.cellPolygon(idx);
      if (!cell) return points[idx];
      let x = 0, y = 0;
      for (const [px, py] of cell) { x += px; y += py; }
      return [x / cell.length, y / cell.length];
    });
  }

  const delaunay = d3.Delaunay.from(points);
  const voronoi  = delaunay.voronoi([0, 0, width, height]);

  ctx.save();
  ctx.globalAlpha = stoneOpacity / 100;
  ctx.lineJoin    = 'miter';

  for (let i = 0; i < points.length; i++) {
    const cell = voronoi.cellPolygon(i);
    if (!cell) continue;

    const jitter     = 3;
    const jittered   = cell.map(([x, y]) => [
      x + (Math.random() - 0.5) * jitter,
      y + (Math.random() - 0.5) * jitter,
    ]);
    const insetVerts = insetPolygon(jittered, inset);

    ctx.beginPath();
    ctx.moveTo(insetVerts[0][0], insetVerts[0][1]);
    for (let j = 1; j < insetVerts.length; j++) ctx.lineTo(insetVerts[j][0], insetVerts[j][1]);
    ctx.closePath();

    fillStoneCell(ctx, insetVerts, stoneGradient, globalGradient, isScatterMode, color);
  }
  ctx.restore();
}

// BRICK
// All bricks are exactly brickH × brickW
function generateBrick(ctx, width, height, params, color, stoneGradient, mortarGradient) {
  const { stoneSize, mortarWidth, stoneOpacity, gradientMode, variation } = params;

  const brickH = gridSize(stoneSize);
  const brickW = Math.round(brickH * 2.5);
  const inset  = mortarWidth;

  const globalGradient = (stoneGradient && gradientMode === 'global') ? buildGlobalGradient(ctx, stoneGradient, width, height) : null;
  const isScatterMode  = (stoneGradient && gradientMode === 'scatter');

  ctx.save();
  ctx.globalAlpha = stoneOpacity / 100;

  function drawBrick(x, y, w, h) {
    const verts = buildInsetRect(x, y, w, h, inset);
    drawRectanglePath(ctx, verts);
    fillStoneCell(ctx, verts, stoneGradient, globalGradient, isScatterMode, color);
  }

  const bond = variation || 'running';

  if (bond === 'stack') {
    // Stack bond with all joints aligned, no offset
    for (let rowY = 0; rowY < height + brickH; rowY += brickH)
      for (let colX = 0; colX < width + brickW; colX += brickW)
        drawBrick(colX, rowY, brickW, brickH);

  } else if (bond === 'third') {
    for (let row = 0, rowY = 0; rowY < height + brickH; rowY += brickH, row++) {
      const offset = (row % 3) * Math.round(brickW / 3);
      for (let colX = -offset; colX < width + brickW; colX += brickW)
        drawBrick(colX, rowY, brickW, brickH);
    }

  } else if (bond === 'flemish') {
    // Flemish bond with alternating stretcher (brickW) and header (brickH) in each row.
    // Even rows: stretcher, header, stretcher, header ...
    // Odd rows: offset by (brickW+brickH)/2, same alternation
    const hW = brickH; // header width = brick short side
    const unitW = brickW + hW; // one stretcher + one header
    for (let row = 0, rowY = 0; rowY < height + brickH; rowY += brickH, row++) {
      const offset = (row % 2 === 0) ? 0 : unitW / 2;
      for (let colX = -offset; colX < width + unitW; colX += unitW) {
        drawBrick(colX,       rowY, brickW, brickH); // stretcher
        drawBrick(colX+brickW, rowY, hW,    brickH); // header
      }
    }

  } else {
    // Running bond (default) — offset by half brickW each row
    for (let row = 0, rowY = 0; rowY < height + brickH; rowY += brickH, row++) {
      const offset = (row % 2 === 0) ? 0 : brickW / 2;
      for (let colX = -offset; colX < width + brickW; colX += brickW)
        drawBrick(colX, rowY, brickW, brickH);
    }
  }

  ctx.restore();
}

// HERRINGBONE
// variation='classic': true 45° herringbone using canvas rotation.
//   Each brick is U×2U, drawn rotated 45° or 135°, tiled diagonally.
// variation='pinwheel': 4 bricks around a center square (pinwheel / windmill).
function generateHerringbone(ctx, width, height, params, color, stoneGradient, mortarGradient) {
  const { stoneSize, mortarWidth, stoneOpacity, gradientMode, variation } = params;

  const U      = gridSize(stoneSize);
  const inset  = mortarWidth;

  const globalGradient = (stoneGradient && gradientMode === 'global') ? buildGlobalGradient(ctx, stoneGradient, width, height) : null;
  const isScatterMode  = (stoneGradient && gradientMode === 'scatter');

  ctx.save();
  ctx.globalAlpha = stoneOpacity / 100;

  function drawBrick(x, y, w, h) {
    const bx = x + inset, by = y + inset;
    const bw = w - inset * 2, bh = h - inset * 2;
    if (bw <= 0 || bh <= 0) return;
    const verts = [[bx,by],[bx+bw,by],[bx+bw,by+bh],[bx,by+bh]];
    drawRectanglePath(ctx, verts);
    fillStoneCell(ctx, verts, stoneGradient, globalGradient, isScatterMode, color);
  }

  // Classic 45° herringbone
  // Bricks are U wide × 2U tall, placed on a diagonal grid.
  // The repeat unit in unrotated space is 2U × 2U.
  // We render by iterating a grid that comfortably covers the rotated canvas.
  if (variation === 'classic') {
    const bH = U, bW = U * 2;    // brick: short=U, long=2U
    const diag = Math.ceil(Math.sqrt(width * width + height * height));
    const step = U;              // grid step along each axis
    const count = Math.ceil(diag / step) + 4;

    ctx.save();
    // Move origin to centre, rotate 45°, then tile
    ctx.translate(width / 2, height / 2);
    ctx.rotate(Math.PI / 4);

    // Global gradient must be rebuilt in the new rotated coordinate space.
    // The rotated tiling region spans ±diag from the new origin, so we rebuild
    // the gradient to cover that extent so every brick receives the correct color.
    const rotatedGlobalGradient = (stoneGradient && gradientMode === 'global')
      ? window.wcgrToCanvasGradient(ctx, stoneGradient, -diag, -diag, diag * 2, diag * 2)
      : null;

    // In rotated space, we tile a simple alternating H/V grid
    // Each cell is bH × bH; even cells get H brick (bW × bH),
    // odd cells get V brick (bH × bW). Offset every other column by bH.
    const cols2 = count * 2, rows2 = count * 2;
    const startX = -cols2 / 2 * bH;
    const startY = -rows2 / 2 * bH;

    // Use a local drawBrick that uses rotatedGlobalGradient
    function drawRotatedBrick(x, y, w, h) {
      const bx = x + inset, by = y + inset;
      const bw = w - inset * 2, bh = h - inset * 2;
      if (bw <= 0 || bh <= 0) return;
      const verts = [[bx,by],[bx+bw,by],[bx+bw,by+bh],[bx,by+bh]];
      drawRectanglePath(ctx, verts);
      fillStoneCell(ctx, verts, stoneGradient, rotatedGlobalGradient, isScatterMode, color);
    }

    for (let row = 0; row < rows2; row++) {
      for (let col = 0; col < cols2; col++) {
        const x = startX + col * bH;
        const y = startY + row * bH;
        if ((col + row) % 2 === 0) {
          drawRotatedBrick(x, y, bW, bH);
        } else {
          drawRotatedBrick(x, y, bH, bW);
        }
      }
    }
    ctx.restore();

  // Pinwheel
  // Each cell is 3U×3U: a centre square (U×U) with 4 bricks (U×2U) around it.
  } else if (variation === 'pinwheel') {
    const cellSize = 3 * U;
    const cols2 = Math.ceil(width  / cellSize) + 2;
    const rows2 = Math.ceil(height / cellSize) + 2;

    for (let r = -1; r < rows2; r++) {
      for (let c = -1; c < cols2; c++) {
        const ox = c * cellSize, oy = r * cellSize;
        // Centre square
        drawBrick(ox + U,     oy + U,     U,     U    );
        // Top brick (H)
        drawBrick(ox,         oy,         2*U,   U    );
        // Bottom brick (H)
        drawBrick(ox + U,     oy + 2*U,   2*U,   U    );
        // Left brick (V)
        drawBrick(ox,         oy + U,     U,     2*U  );
        // Right brick (V)
        drawBrick(ox + 2*U,   oy,         U,     2*U  );
      }
    }

  // Double herringbone (default)
  // 4U×4U repeating tile, pairs of H beside pairs of V bricks.
  } else {
    const tileW = 4 * U, tileH = 4 * U;
    const cols2 = Math.ceil(width  / tileW) + 2;
    const rows2 = Math.ceil(height / tileH) + 2;
    for (let r = -1; r < rows2; r++) {
      for (let c = -1; c < cols2; c++) {
        const ox = c * tileW, oy = r * tileH;
        drawBrick(ox,       oy,       2*U, U  );
        drawBrick(ox,       oy +  U,  2*U, U  );
        drawBrick(ox + 2*U, oy,       U,   2*U);
        drawBrick(ox + 3*U, oy,       U,   2*U);
        drawBrick(ox,       oy + 2*U, U,   2*U);
        drawBrick(ox +  U,  oy + 2*U, U,   2*U);
        drawBrick(ox + 2*U, oy + 2*U, 2*U, U  );
        drawBrick(ox + 2*U, oy + 3*U, 2*U, U  );
      }
    }
  }

  ctx.restore();
}


// TILE
// Uniform: perfect square grid, every tile the same size.
// Mixed:   base unit U, tiles are randomly sized 1×1, 2×1, 1×2, 2×2 units.
//          Uses an occupancy grid to guarantee no overlaps and full coverage.
function generateTile(ctx, width, height, params, color, stoneGradient, mortarGradient) {
  const { stoneSize, mortarWidth, stoneOpacity, gradientMode, variation } = params;

  const T     = gridSize(stoneSize);   // tile side length
  const inset = mortarWidth;

  const globalGradient = (stoneGradient && gradientMode === 'global') ? buildGlobalGradient(ctx, stoneGradient, width, height) : null;
  const isScatterMode  = (stoneGradient && gradientMode === 'scatter');

  function drawTile(x, y, w, h) {
    const bx = x + inset, by = y + inset;
    const bw = w - inset * 2, bh = h - inset * 2;
    if (bw <= 0 || bh <= 0) return;
    const verts = [[bx,by],[bx+bw,by],[bx+bw,by+bh],[bx,by+bh]];
    drawRectanglePath(ctx, verts);
    fillStoneCell(ctx, verts, stoneGradient, globalGradient, isScatterMode, color);
  }

  ctx.save();
  ctx.globalAlpha = stoneOpacity / 100;

  if (variation === 'offset') {
    // Offset / brick-bond squares — every other row shifted by T/2
    const cols = Math.ceil(width  / T) + 2;
    const rows = Math.ceil(height / T) + 2;
    for (let row = 0; row < rows; row++) {
      const offX = (row % 2 === 0) ? 0 : T / 2;
      for (let col = 0; col < cols; col++)
        drawTile(col * T - offX, row * T, T, T);
    }

  } else {
    // Square (default) — simple uniform grid
    const cols = Math.ceil(width  / T) + 1;
    const rows = Math.ceil(height / T) + 1;
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++)
        drawTile(col * T, row * T, T, T);
  }

  ctx.restore();
}

function generateTileMixed(ctx, width, height, params, color, stoneGradient, mortarGradient) {
  const { stoneSize, mortarWidth, stoneOpacity, gradientMode } = params;

  const U     = gridSize(stoneSize);   // base unit (1×1 tile = U×U pixels)
  const inset = mortarWidth;

  const globalGradient = (stoneGradient && gradientMode === 'global') ? buildGlobalGradient(ctx, stoneGradient, width, height) : null;
  const isScatterMode  = (stoneGradient && gradientMode === 'scatter');

  // Occupancy grid for how many unit cells we need
  const gridCols = Math.ceil(width  / U) + 2;
  const gridRows = Math.ceil(height / U) + 2;
  const occupied = new Uint8Array(gridCols * gridRows);

  function isOccupied(gc, gr, sw, sh) {
    for (let dr = 0; dr < sh; dr++) {
      for (let dc = 0; dc < sw; dc++) {
        const gc2 = gc + dc, gr2 = gr + dr;
        if (gc2 >= gridCols || gr2 >= gridRows) return true; // out of bounds = blocked
        if (occupied[gr2 * gridCols + gc2]) return true;
      }
    }
    return false;
  }

  function setOccupied(gc, gr, sw, sh) {
    for (let dr = 0; dr < sh; dr++)
      for (let dc = 0; dc < sw; dc++)
        occupied[(gr+dr) * gridCols + (gc+dc)] = 1;
  }

  ctx.save();
  ctx.globalAlpha = stoneOpacity / 100;

  // Sizes in unit-cells: [cols, rows] — weighted so 1×1 is most common
  const sizes = [
    [1,1],[1,1],[1,1],   // 3× weight
    [2,1],[1,2],         // 1× each
    [2,2],               // 1× weight
    [3,1],[1,3],         // occasional long tiles
    [3,2],[2,3],
    [3,3],
  ];

  for (let gr = 0; gr < gridRows; gr++) {
    for (let gc = 0; gc < gridCols; gc++) {
      if (occupied[gr * gridCols + gc]) continue;

      // Shuffle size candidates and pick the first that fits
      const shuffled = sizes.slice().sort(() => Math.random() - 0.5);
      let picked = [1, 1];
      for (const [sw, sh] of shuffled) {
        if (!isOccupied(gc, gr, sw, sh)) { picked = [sw, sh]; break; }
      }

      const [sw, sh] = picked;
      setOccupied(gc, gr, sw, sh);

      const x = gc * U, y = gr * U;
      const w = sw * U, h = sh * U;
      const bx = x + inset, by = y + inset;
      const bw = w - inset * 2, bh = h - inset * 2;
      if (bw <= 0 || bh <= 0) continue;

      const verts = [[bx,by],[bx+bw,by],[bx+bw,by+bh],[bx,by+bh]];
      drawRectanglePath(ctx, verts);
      fillStoneCell(ctx, verts, stoneGradient, globalGradient, isScatterMode, color);
    }
  }
  ctx.restore();
}


function drawLightingOverlay(ctx, width, height, direction, strength) {
  let x0, y0;
  switch (direction) {
    case 'top-left':     x0 = 0;         y0 = 0;      break;
    case 'top-right':    x0 = width;     y0 = 0;      break;
    case 'bottom-left':  x0 = 0;         y0 = height; break;
    case 'bottom-right': x0 = width;     y0 = height; break;
    default:             x0 = width / 2; y0 = height / 2;
  }
  const radius   = Math.max(width, height);
  const alpha    = Math.min(1, strength / 100);
  const gradient = ctx.createRadialGradient(x0, y0, 0, x0, y0, radius);
  gradient.addColorStop(0, `rgba(255,255,255,${alpha * 0.5})`);
  gradient.addColorStop(1, `rgba(0,0,0,${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function render(canvas, ctx, params) {
  const { style, width, height, color, lightingEnabled, lightDirection, lightStrength } = params;

  document.getElementById('canvas-width').value  = width;
  document.getElementById('canvas-height').value = height;

  canvas.width  = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);   // fully transparent base

  const stoneGradient  = window.advancedGradients && window.advancedGradients.get('stone-color');
  const mortarGradient = window.advancedGradients && window.advancedGradients.get('mortar-color');

  // Step 1: flood-fill mortar as background
  drawMortarBackground(ctx, width, height, params, mortarGradient);

  // Step 2: draw stones/tiles on top (inset so mortar shows between them)
  // Dispatch to generator based on style, with variation sub-routing
  switch (style) {
    case 'stone': {
      const stoneVariant = params.variation || 'cobbled';
      if (stoneVariant === 'cut') generateCutStone(ctx, width, height, params, color, stoneGradient, mortarGradient);
      else                        generateCobbledStone(ctx, width, height, params, color, stoneGradient, mortarGradient);
      break;
    }
    case 'flagstone': generateFlagstone(ctx, width, height, params, color, stoneGradient, mortarGradient);   break;
    case 'brick':     generateBrick(ctx, width, height, params, color, stoneGradient, mortarGradient);       break;
    case 'tile': {
      const tileVariant = params.variation || 'default';
      if      (tileVariant === 'mixed')            generateTileMixed(ctx, width, height, params, color, stoneGradient, mortarGradient);
      else if (tileVariant === 'herring-classic')  generateHerringbone(ctx, width, height, {...params, variation: 'classic'},  color, stoneGradient, mortarGradient);
      else if (tileVariant === 'herring-double')   generateHerringbone(ctx, width, height, {...params, variation: 'default'},  color, stoneGradient, mortarGradient);
      else if (tileVariant === 'herring-pinwheel') generateHerringbone(ctx, width, height, {...params, variation: 'pinwheel'}, color, stoneGradient, mortarGradient);
      else                                         generateTile(ctx, width, height, params, color, stoneGradient, mortarGradient);
      break;
    }
    default: generateCobbledStone(ctx, width, height, params, color, stoneGradient, mortarGradient);
  }

  // Step 3: lighting overlay
  if (lightingEnabled && lightStrength > 0) {
    drawLightingOverlay(ctx, width, height, lightDirection, lightStrength);
  }
}

// ============================================================
// 4. EXPORT
// ============================================================
function downloadPNG(canvas) {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = 'stone_texture.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }, 'image/png');
}

// SVG EXPORT — full vector, one <path> per stone/tile

// Resolve a solid fill color for SVG from wcgr data.
// For linear/radial we return null (caller will use an SVG gradient def).
// For all other types and no wcgr, sample at the given position t (0–1).
function svgFillColor(wcgr, t, fallback) {
  if (!wcgr) return fallback;
  const type = wcgr.type || 'linear';
  if (type === 'linear' || type === 'radial') return null; // use SVG gradient
  return window.wcgrSampleColor ? window.wcgrSampleColor(wcgr, t) : fallback;
}

// Build an SVG <linearGradient> or <radialGradient> string for a wcgr.
//   linear   → <linearGradient> spanning the rect along the angle
//   radial   → <radialGradient> centred in the rect
//   reflected→ <linearGradient spreadMethod="reflect"> — native SVG mirror
//   diamond  → <linearGradient> at 45° with spreadMethod="reflect" (close approximation)
//   angle    → <linearGradient> at the stored angle
function svgGradientDef(wcgr, id, x, y, w, h) {
  const type  = wcgr.type || 'linear';
  const angle = ((wcgr.angle || 0) * Math.PI) / 180;
  const cx2   = x + w / 2, cy2 = y + h / 2;
  const half  = Math.max(w, h) / 2;

  const stops = wcgr.colorStops.map(s => {
    const op = window.getOpacityAt ? window.getOpacityAt(wcgr.opacityStops, s.pos) : 1;
    return `<stop offset="${(s.pos*100).toFixed(1)}%" stop-color="${s.color}" stop-opacity="${op.toFixed(3)}"/>`;
  }).join('');

  if (type === 'radial') {
    const rcx = x + w * ((wcgr.posX ?? 50) / 100);
    const rcy = y + h * ((wcgr.posY ?? 50) / 100);
    const r   = Math.max(w, h) * ((wcgr.scaleX ?? 1) + (wcgr.scaleY ?? 1)) / 4;
    return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${rcx.toFixed(2)}" cy="${rcy.toFixed(2)}" r="${r.toFixed(2)}" fx="${rcx.toFixed(2)}" fy="${rcy.toFixed(2)}">${stops}</radialGradient>`;
  }

  if (type === 'reflected') {
    const x1 = cx2 - Math.cos(angle) * half, y1 = cy2 - Math.sin(angle) * half;
    const x2 = cx2, y2 = cy2; // midpoint — reflection doubles it
    return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" spreadMethod="reflect" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}">${stops}</linearGradient>`;
  }

  if (type === 'diamond') {
    // Approximate diamond with a 45° reflected gradient — best vector approximation
    const diagAngle = Math.PI / 4;
    const x1 = cx2 - Math.cos(diagAngle) * half, y1 = cy2 - Math.sin(diagAngle) * half;
    const x2 = cx2, y2 = cy2;
    return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" spreadMethod="reflect" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}">${stops}</linearGradient>`;
  }

  // linear and angle — straight linear gradient
  const x1 = cx2 - Math.cos(angle) * half, y1 = cy2 - Math.sin(angle) * half;
  const x2 = cx2 + Math.cos(angle) * half, y2 = cy2 + Math.sin(angle) * half;
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}">${stops}</linearGradient>`;
}

// Convert an array of [x,y] vertices to an SVG path d string (straight lines).
function vertsToPathD(verts) {
  return verts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ') + ' Z';
}

// Convert verts using midpoint quadratic bezier smoothing (cobbled style).
function vertsToSmoothedPathD(verts) {
  let d = '';
  for (let j = 0; j < verts.length; j++) {
    const p0 = verts[j];
    const p1 = verts[(j + 1) % verts.length];
    const mx = ((p0[0] + p1[0]) / 2).toFixed(2);
    const my = ((p0[1] + p1[1]) / 2).toFixed(2);
    if (j === 0) d += `M${mx},${my} `;
    else         d += `Q${p0[0].toFixed(2)},${p0[1].toFixed(2)} ${mx},${my} `;
  }
  return d + 'Z';
}

// Convert verts using the cut-stone curved-edge style.
function vertsToCutPathD(verts, jitter) {
  const curveIntensity = 0.5;
  let d = '';
  for (let j = 0; j < verts.length; j++) {
    const cur  = verts[j];
    const next = verts[(j + 1) % verts.length];
    const midX = (cur[0] + next[0]) / 2, midY = (cur[1] + next[1]) / 2;
    const dx   = next[1] - cur[1],       dy   = cur[0] - next[0];
    const mag  = Math.sqrt(dx*dx + dy*dy) || 1;
    const cpX  = (midX + (dx/mag) * curveIntensity * jitter).toFixed(2);
    const cpY  = (midY + (dy/mag) * curveIntensity * jitter).toFixed(2);
    if (j === 0) d += `M${cur[0].toFixed(2)},${cur[1].toFixed(2)} `;
    d += `Q${cpX},${cpY} ${next[0].toFixed(2)},${next[1].toFixed(2)} `;
  }
  return d + 'Z';
}

// Centroid of a vertex array
function centroid(verts) {
  let cx = 0, cy = 0;
  for (const [x, y] of verts) { cx += x; cy += y; }
  return [cx / verts.length, cy / verts.length];
}

// Bounding box of a vertex array
function boundingBox(verts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of verts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// Build SVG for a single stone shape.
// Global mode: one shared gradient def spans the full canvas; all stones
// Per-stone mode: each stone gets its own gradient scoped to its bounding box.
// Scatter mode: each stone gets a sampled solid color — fully vector.
function stoneSVGElement(pathD, verts, wcgr, gradientMode, canvasW, canvasH, solidColor, gradientIndex, opacity) {
  const op     = opacity !== undefined ? opacity : 1;
  const opAttr = op < 1 ? ` opacity="${op.toFixed(3)}"` : '';

  if (!wcgr) {
    return { defStr: '', pathStr: `<path d="${pathD}" fill="${solidColor}"${opAttr}/>` };
  }

  const isGlobal  = (gradientMode === 'global');
  const isScatter = (gradientMode === 'scatter');

  if (isScatter) {
    const t = Math.random();
    const c = window.wcgrSampleColor ? window.wcgrSampleColor(wcgr, t) : solidColor;
    return { defStr: '', pathStr: `<path d="${pathD}" fill="${c}"${opAttr}/>` };
  }

  const gid = `g${gradientIndex}`;
  let defStr;
  if (isGlobal) {
    defStr = svgGradientDef(wcgr, gid, 0, 0, canvasW, canvasH);
  } else {
    const bb = boundingBox(verts);
    defStr = svgGradientDef(wcgr, gid, bb.x, bb.y, Math.max(bb.w, 1), Math.max(bb.h, 1));
  }
  return { defStr, pathStr: `<path d="${pathD}" fill="url(#${gid})"${opAttr}/>` };
}

function downloadSVG(canvas) {
  const params = readInputs();
  const { style, width, height, color, mortarColor, stoneOpacity, mortarOpacity, gradientMode, variation } = params;

  const wcgr         = window.advancedGradients && window.advancedGradients.get('stone-color');
  const mortarWcgr   = window.advancedGradients && window.advancedGradients.get('mortar-color');

  const defs  = [];   // gradient def strings
  const paths = [];   // path element strings
  let gIdx    = 0;

  //Mortar Background
  {
    const mOp = (mortarOpacity ?? 100) / 100;
    const mOpAttr = mOp < 1 ? ` opacity="${mOp.toFixed(3)}"` : '';
    if (mortarWcgr && (mortarWcgr.type === 'linear' || mortarWcgr.type === 'radial')) {
      const gid = `g${gIdx++}`;
      defs.push(svgGradientDef(mortarWcgr, gid, 0, 0, width, height));
      paths.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="url(#${gid})"${mOpAttr}/>`);
    } else if (mortarWcgr) {
      const c = window.wcgrSampleColor ? window.wcgrSampleColor(mortarWcgr, 0.5) : mortarColor;
      paths.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="${c}"${mOpAttr}/>`);
    } else {
      paths.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="${mortarColor}"${mOpAttr}/>`);
    }
  }

  const stoneOp = (stoneOpacity ?? 100) / 100;

  // For global mode, build ONE shared gradient def and reuse it.
  // For per-stone / scatter, each shape gets its own index.
  let globalGradId = null;
  if (wcgr && gradientMode === 'global') {
    globalGradId = `g${gIdx++}`;
    defs.push(svgGradientDef(wcgr, globalGradId, 0, 0, width, height));
  }

  function emitShape(pathD, verts) {
    if (globalGradId) {
      // Reuse the shared global gradient
      const op      = stoneOp < 1 ? ` opacity="${stoneOp.toFixed(3)}"` : '';
      paths.push(`<path d="${pathD}" fill="url(#${globalGradId})"${op}/>`);
      return;
    }
    const { defStr, pathStr } = stoneSVGElement(pathD, verts, wcgr, gradientMode, width, height, color, gIdx++, stoneOp);
    if (defStr) defs.push(defStr);
    paths.push(pathStr);
  }

  // Re-generate geometry into SVG paths
  const areaRatio = (width * height) / (900 * 600);

  if (style === 'stone') {
    const variant = variation || 'cobbled';
    if (variant === 'cut') {
      // Cut (legacy)
      const scale     = Math.sqrt(areaRatio);
      const numPts    = Math.floor(300 * scale);
      const jitter    = 6 * scale;
      const inset     = params.mortarWidth / 2;
      const pts       = Array.from({length: numPts}, () => [Math.random()*width, Math.random()*height]);
      const del       = d3.Delaunay.from(pts);
      const vor       = del.voronoi([0, 0, width, height]);
      const strokeW   = (2 * scale).toFixed(2);
      for (let i = 0; i < pts.length; i++) {
        const cell = vor.cellPolygon(i); if (!cell) continue;
        const jit  = cell.map(([x,y]) => [x+(Math.random()-0.5)*jitter, y+(Math.random()-0.5)*jitter]);
        const d    = vertsToCutPathD(jit, jitter);
        const { defStr, pathStr } = stoneSVGElement(d, jit, wcgr, gradientMode, width, height, color, gIdx++, 1);
        if (defStr) defs.push(defStr);
        // Cut stone uses stroke for mortar
        paths.push(pathStr.replace('/>', ` stroke="black" stroke-width="${strokeW}" stroke-linejoin="round"/>`));
      }
    } else {
      // Cobbled
      const numPts = Math.max(12, Math.round(600 * areaRatio * stoneSizeMultiplier(params.stoneSize)));
      const inset  = params.mortarWidth / 2;
      let pts      = Array.from({length: numPts}, () => [Math.random()*width, Math.random()*height]);
      for (let r = 0; r < 2; r++) {
        const del = d3.Delaunay.from(pts); const vor = del.voronoi([0,0,width,height]);
        pts = pts.map((_,idx) => { const c = vor.cellPolygon(idx); if (!c) return pts[idx]; let x=0,y=0; for (const [px,py] of c){x+=px;y+=py;} return [x/c.length,y/c.length]; });
      }
      const del = d3.Delaunay.from(pts); const vor = del.voronoi([0,0,width,height]);
      for (let i = 0; i < pts.length; i++) {
        const cell = vor.cellPolygon(i); if (!cell) continue;
        const iv   = insetPolygon(cell, inset);
        emitShape(vertsToSmoothedPathD(iv), iv);
      }
    }

  } else if (style === 'flagstone') {
    const numPts = Math.max(4, Math.round(80 * areaRatio * stoneSizeMultiplier(params.stoneSize)));
    const inset  = params.mortarWidth / 2;
    let pts      = Array.from({length: numPts}, () => [Math.random()*width, Math.random()*height]);
    for (let r = 0; r < 3; r++) {
      const del = d3.Delaunay.from(pts); const vor = del.voronoi([0,0,width,height]);
      pts = pts.map((_,idx) => { const c = vor.cellPolygon(idx); if (!c) return pts[idx]; let x=0,y=0; for (const [px,py] of c){x+=px;y+=py;} return [x/c.length,y/c.length]; });
    }
    const del = d3.Delaunay.from(pts); const vor = del.voronoi([0,0,width,height]);
    for (let i = 0; i < pts.length; i++) {
      const cell = vor.cellPolygon(i); if (!cell) continue;
      const jit  = cell.map(([x,y]) => [x+(Math.random()-0.5)*3, y+(Math.random()-0.5)*3]);
      const iv   = insetPolygon(jit, inset);
      emitShape(vertsToPathD(iv), iv);
    }

  } else if (style === 'brick') {
    const bH = gridSize(params.stoneSize), bW = Math.round(bH * 2.5);
    const inset = params.mortarWidth;
    const bond  = variation || 'running';
    function emitBrick(x, y, w, h) {
      const verts = buildInsetRect(x, y, w, h, inset);
      if (verts[2][0]-verts[0][0] <= 0 || verts[2][1]-verts[0][1] <= 0) return;
      emitShape(vertsToPathD(verts), verts);
    }
    if (bond === 'stack') {
      for (let rowY = 0; rowY < height+bH; rowY += bH)
        for (let colX = 0; colX < width+bW; colX += bW) emitBrick(colX,rowY,bW,bH);
    } else if (bond === 'third') {
      for (let row=0,rowY=0; rowY<height+bH; rowY+=bH,row++) {
        const off = (row%3)*Math.round(bW/3);
        for (let colX=-off; colX<width+bW; colX+=bW) emitBrick(colX,rowY,bW,bH);
      }
    } else if (bond === 'flemish') {
      const hW=bH, unitW=bW+hW;
      for (let row=0,rowY=0; rowY<height+bH; rowY+=bH,row++) {
        const off=(row%2===0)?0:unitW/2;
        for (let colX=-off; colX<width+unitW; colX+=unitW) { emitBrick(colX,rowY,bW,bH); emitBrick(colX+bW,rowY,hW,bH); }
      }
    } else {
      for (let row=0,rowY=0; rowY<height+bH; rowY+=bH,row++) {
        const off=(row%2===0)?0:bW/2;
        for (let colX=-off; colX<width+bW; colX+=bW) emitBrick(colX,rowY,bW,bH);
      }
    }

  } else if (style === 'tile') {
    const tileVariant = variation || 'default';
    const T = gridSize(params.stoneSize), inset = params.mortarWidth;
    function emitTile(x, y, w, h) {
      const verts = buildInsetRect(x, y, w, h, inset);
      if (w-inset*2 <= 0 || h-inset*2 <= 0) return;
      emitShape(vertsToPathD(verts), verts);
    }
    if (tileVariant === 'mixed') {
      const gCols = Math.ceil(width/T)+2, gRows = Math.ceil(height/T)+2;
      const occ   = new Uint8Array(gCols*gRows);
      const sizes = [[1,1],[1,1],[1,1],[2,1],[1,2],[2,2],[3,1],[1,3],[3,2],[2,3],[3,3]];
      for (let gr=0; gr<gRows; gr++) for (let gc=0; gc<gCols; gc++) {
        if (occ[gr*gCols+gc]) continue;
        const shuffled = sizes.slice().sort(()=>Math.random()-0.5);
        let picked=[1,1];
        for (const [sw,sh] of shuffled) {
          let ok=true;
          for (let dr=0;dr<sh&&ok;dr++) for (let dc=0;dc<sw&&ok;dc++) { const gc2=gc+dc,gr2=gr+dr; if(gc2>=gCols||gr2>=gRows||occ[gr2*gCols+gc2]) ok=false; }
          if(ok){picked=[sw,sh];break;}
        }
        const [sw,sh]=picked;
        for (let dr=0;dr<sh;dr++) for (let dc=0;dc<sw;dc++) occ[(gr+dr)*gCols+(gc+dc)]=1;
        emitTile(gc*T, gr*T, sw*T, sh*T);
      }
    } else if (tileVariant === 'offset') {
      const cols=Math.ceil(width/T)+2, rows=Math.ceil(height/T)+2;
      for (let row=0;row<rows;row++) { const off=(row%2===0)?0:T/2; for(let col=0;col<cols;col++) emitTile(col*T-off,row*T,T,T); }
    } else if (tileVariant === 'basketweave') {
      const cellW=2*T,cellH=2*T;
      const cols=Math.ceil(width/cellW)+2, rows=Math.ceil(height/cellH)+2;
      for (let row=0;row<rows;row++) for (let col=0;col<cols;col++) {
        const ox=col*cellW,oy=row*cellH;
        if((col+row)%2===0){emitTile(ox,oy,T*2,T);emitTile(ox,oy+T,T*2,T);}
        else{emitTile(ox,oy,T,T*2);emitTile(ox+T,oy,T,T*2);}
      }
    } else if (tileVariant==='herring-classic'||tileVariant==='herring-double'||tileVariant==='herring-pinwheel') {
      const U=T, insetH=inset;
      function emitH(x,y,w,h){const bx=x+insetH,by=y+insetH,bw=w-insetH*2,bh=h-insetH*2; if(bw<=0||bh<=0)return; const verts=[[bx,by],[bx+bw,by],[bx+bw,by+bh],[bx,by+bh]]; emitShape(vertsToPathD(verts),verts);}
      if (tileVariant==='herring-classic') {
        const bH=U,bW=U*2; const diag=Math.ceil(Math.sqrt(width*width+height*height)); const count=Math.ceil(diag/U)+4;
        const cols2=count*2,rows2=count*2; const startX=-cols2/2*bH,startY=-rows2/2*bH;
        // Classic herringbone is rotated 45° — emit in SVG with a group transform
        paths.push(`<g transform="translate(${width/2},${height/2}) rotate(45)">`);
        for (let row=0;row<rows2;row++) for (let col=0;col<cols2;col++) {
          const x=startX+col*bH,y=startY+row*bH;
          if((col+row)%2===0)emitH(x,y,bW,bH); else emitH(x,y,bH,bW);
        }
        paths.push(`</g>`);
      } else if (tileVariant==='herring-pinwheel') {
        const cellSize=3*U; const cols2=Math.ceil(width/cellSize)+2,rows2=Math.ceil(height/cellSize)+2;
        for (let r=-1;r<rows2;r++) for (let c=-1;c<cols2;c++) {
          const ox=c*cellSize,oy=r*cellSize;
          emitH(ox+U,oy+U,U,U); emitH(ox,oy,2*U,U); emitH(ox+U,oy+2*U,2*U,U); emitH(ox,oy+U,U,2*U); emitH(ox+2*U,oy,U,2*U);
        }
      } else { // double
        const tW=4*U,tH=4*U; const cols2=Math.ceil(width/tW)+2,rows2=Math.ceil(height/tH)+2;
        for (let r=-1;r<rows2;r++) for (let c=-1;c<cols2;c++) {
          const ox=c*tW,oy=r*tH;
          emitH(ox,oy,2*U,U);emitH(ox,oy+U,2*U,U);emitH(ox+2*U,oy,U,2*U);emitH(ox+3*U,oy,U,2*U);
          emitH(ox,oy+2*U,U,2*U);emitH(ox+U,oy+2*U,U,2*U);emitH(ox+2*U,oy+2*U,2*U,U);emitH(ox+2*U,oy+3*U,2*U,U);
        }
      }
    } else {
      // uniform
      const cols=Math.ceil(width/T)+1,rows=Math.ceil(height/T)+1;
      for (let row=0;row<rows;row++) for (let col=0;col<cols;col++) emitTile(col*T,row*T,T,T);
    }
  }

  const defsBlock = defs.length ? `<defs>${defs.join('')}</defs>` : '';
  const pathBlock  = paths.join('\n  ');
  const svgOut = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${defsBlock}
  const pathBlock = paths.join('\n  ');
  ${pathBlock}
</svg>`;

  const blob = new Blob([svgOut], { type: 'image/svg+xml;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'stone_texture.svg';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ============================================================
// 5. VARIATION SELECT
// ============================================================
const STYLE_VARIATIONS = {
  'stone':     [['cobbled', 'Cobbled'], ['cut', 'Cut (Legacy)']],
  'flagstone': [],
  'brick':     [['default', 'Running Bond'], ['stack', 'Stack Bond'], ['third', 'Third Bond'], ['flemish', 'Flemish Bond']],
  'tile':      [['default', 'Uniform'], ['offset', 'Offset Grid'], ['mixed', 'Mixed Sizes'], ['herring-classic', 'Herringbone 45°'], ['herring-double', 'Double Herringbone'], ['herring-pinwheel', 'Pinwheel']],
};

function updateVariationSelect() {
  const style = document.getElementById('stone-style')?.value || '';
  const sel   = document.getElementById('stone-variation');
  const wrap  = document.getElementById('stone-variation-wrap');
  const opts  = STYLE_VARIATIONS[style] || [];
  if (!sel || !wrap) return;
  wrap.style.display = opts.length > 0 ? '' : 'none';
  const prev = sel.value;
  sel.innerHTML = opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  if (opts.some(([v]) => v === prev)) sel.value = prev;
}

// ============================================================
// 6. DOM WIRING
// ============================================================
function syncSlider(sliderId, numId, min, max) {
  const slider = document.getElementById(sliderId);
  const num    = document.getElementById(numId);
  if (!slider || !num) return;
  slider.addEventListener('input', () => { num.value = slider.value; });
  num.addEventListener('input', () => {
    const v = clamp(num.value, min, max);
    num.value    = v;
    slider.value = v;
  });
}

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


function applyStonePreset(p) {
  function set(id, val) { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; }
  function setChk(id, val) { const el = document.getElementById(id); if (el && val !== undefined) el.checked = !!val; }
  set('stone-style',               p.style);
  set('stone-variation',           p.variation);
  set('canvas-width',              p.width);
  set('canvas-height',             p.height);
  set('stone-color',               p.color);
  set('light-direction',           p.lightDirection);
  set('lighting-strength',         p.lightStrength);
  set('lighting-strength-number',  p.lightStrength);
  setChk('lighting-toggle',        p.lightingEnabled);
  set('advanced-stone-size',            p.stoneSize);
  set('advanced-stone-size-num',        p.stoneSize);
  set('advanced-mortar-width',          p.mortarWidth);
  set('advanced-mortar-width-num',      p.mortarWidth);
  set('advanced-stone-opacity',         p.stoneOpacity);
  set('advanced-stone-opacity-num',     p.stoneOpacity);
  set('advanced-mortar-opacity',        p.mortarOpacity);
  set('advanced-mortar-opacity-num',    p.mortarOpacity);
  set('advanced-color-mortar-color',    p.mortarColor);
  if (p.gradientMode) {
    const radio = document.querySelector('input[name="advanced-gradient-mode"][value="' + p.gradientMode + '"]');
    if (radio) radio.checked = true;
  }
  if (typeof updateVariationSelect === 'function') updateVariationSelect();
}

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('stone-canvas');
  if (!canvas) return console.error('stone-canvas not found');
  const ctx = canvas.getContext('2d');

  const stoneStyleSelect = document.getElementById('stone-style');
  if (stoneStyleSelect) stoneStyleSelect.value = DEFAULTS.style;

  syncSlider('lighting-strength',  'lighting-strength-number', 0, 100);
  syncSlider('advanced-stone-size',     'advanced-stone-size-num',       1, 50);
  syncSlider('advanced-mortar-width',   'advanced-mortar-width-num',     0, 200);
  syncSlider('advanced-stone-opacity',  'advanced-stone-opacity-num',    0, 100);
  syncSlider('advanced-mortar-opacity', 'advanced-mortar-opacity-num',   0, 100);

  document.getElementById('generate-button')    ?.addEventListener('click', () => render(canvas, ctx, readInputs()));
  document.getElementById('download-png-button')?.addEventListener('click', () => downloadPNG(canvas));
  document.getElementById('download-svg-button')?.addEventListener('click', () => downloadSVG(canvas));

  wirePresetButtons('Stone Generator', () => readInputs(), applyStonePreset, 'stone_preset.wctp');
  stoneStyleSelect?.addEventListener('change', updateVariationSelect);
  updateVariationSelect();
});