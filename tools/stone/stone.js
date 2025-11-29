// stone.js

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById("stoneCanvas");
  if (!canvas) return console.error("stoneCanvas not found");
  const ctx = canvas.getContext("2d");

  const styleSelect = document.getElementById("styleSelect");
  const widthInput = document.getElementById("widthInput");
  const heightInput = document.getElementById("heightInput");
  const colorInput = document.getElementById("colorInput");
  const lightingToggle = document.getElementById("lightingToggle");
  const lightDirection = document.getElementById("lightDirection");
  const lightStrength = document.getElementById("lightStrength");
  let lightStrengthNumber = document.getElementById("lightStrengthNumber");
  const generateBtn = document.getElementById("generateBtn");
  const downloadPngBtn = document.getElementById("downloadPngBtn");
  const downloadSvgBtn = document.getElementById("downloadSvgBtn");

  //Ensure slider numeric bounds are correct
  if (lightStrength) {
    lightStrength.min = 0;
    lightStrength.max = 100;
    lightStrength.step = 1;
  }

  // If numeric box not present, create one
  if (!lightStrengthNumber && lightStrength) {
    lightStrengthNumber = document.createElement('input');
    lightStrengthNumber.type = 'number';
    lightStrengthNumber.min = 0;
    lightStrengthNumber.max = 100;
    lightStrengthNumber.value = lightStrength.value;
    lightStrengthNumber.id = 'lightStrengthNumber';
    lightStrengthNumber.style.width = '60px';

    if (lightStrength.parentNode) {
      lightStrength.parentNode.style.display = 'flex';
      lightStrength.parentNode.style.gap = '6px';
      lightStrength.parentNode.appendChild(lightStrengthNumber);
    }
  }

  // Clamp helper
  function clamp(v, min, max) {
    v = parseInt(v) || 0;
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  function getScale(width, height) {
    const area = width * height;
    const baseArea = 900 * 600;
    return Math.sqrt(area / baseArea);
  }

  //Stone generation
  function generateCutStone(width, height, scale, color) {
    const numPoints = Math.floor(300 * scale);
    const jitter = 6 * scale;
    const curveIntensity = 0.5;
    const strokeWidth = 2 * scale;

    const points = Array.from({ length: numPoints }, () => [
      Math.random() * width,
      Math.random() * height
    ]);

    const delaunay = d3.Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, width, height]);

    ctx.lineJoin = 'round';
    for (let i = 0; i < points.length; i++) {
      const cell = voronoi.cellPolygon(i);
      if (!cell) continue;

      const jittered = cell.map(([x, y]) => [
        x + (Math.random() - 0.5) * jitter,
        y + (Math.random() - 0.5) * jitter
      ]);

      ctx.beginPath();
      for (let j = 0; j < jittered.length; j++) {
        const current = jittered[j];
        const next = jittered[(j + 1) % jittered.length];

        const midX = (current[0] + next[0]) / 2;
        const midY = (current[1] + next[1]) / 2;

        const dx = next[1] - current[1];
        const dy = current[0] - next[0];
        const mag = Math.sqrt(dx * dx + dy * dy) || 1;
        const normDx = dx / mag;
        const normDy = dy / mag;

        const controlX = midX + normDx * curveIntensity * jitter;
        const controlY = midY + normDy * curveIntensity * jitter;

        if (j === 0) ctx.moveTo(current[0], current[1]);
        ctx.quadraticCurveTo(controlX, controlY, next[0], next[1]);
      }

      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = "black";
      ctx.stroke();
    }
  }

  function generateCobbledStone(width, height, scale, color) {
    const numPoints = Math.floor(600 * scale);
    const relaxIterations = 2;
    const strokeWidth = 1.5 * scale;

    let points = Array.from({ length: numPoints }, () => [
      Math.random() * width,
      Math.random() * height
    ]);

    for (let i = 0; i < relaxIterations; i++) {
      const delaunay = d3.Delaunay.from(points);
      const voronoi = delaunay.voronoi([0, 0, width, height]);
      points = points.map((_, i) => {
        const cell = voronoi.cellPolygon(i);
        if (!cell) return points[i];
        let x = 0, y = 0;
        for (const [px, py] of cell) {
          x += px;
          y += py;
        }
        return [x / cell.length, y / cell.length];
      });
    }

    const delaunay = d3.Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, width, height]);

    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = "black";
    ctx.fillStyle = color;
    ctx.lineJoin = 'round';

    for (let i = 0; i < points.length; i++) {
      const cell = voronoi.cellPolygon(i);
      if (!cell) continue;

      ctx.beginPath();
      for (let j = 0; j < cell.length; j++) {
        const p0 = cell[j];
        const p1 = cell[(j + 1) % cell.length];
        const mx = (p0[0] + p1[0]) / 2;
        const my = (p0[1] + p1[1]) / 2;

        if (j === 0) ctx.moveTo(mx, my);
        else ctx.quadraticCurveTo(p0[0], p0[1], mx, my);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawLightingOverlay(width, height, direction, strength) {
    let x0, y0;
    switch (direction) {
      case "top-left": x0 = 0; y0 = 0; break;
      case "top-right": x0 = width; y0 = 0; break;
      case "bottom-left": x0 = 0; y0 = height; break;
      case "bottom-right": x0 = width; y0 = height; break;
      case "center":
      default: x0 = width / 2; y0 = height / 2; break;
    }

    const radius = Math.max(width, height);
    const alpha = Math.min(1, strength / 100);

    const gradient = ctx.createRadialGradient(x0, y0, 0, x0, y0, radius);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${alpha})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  //Draw function
  function draw() {
    const width = clamp(widthInput.value, 300, 5000);
    const height = clamp(heightInput.value, 300, 5000);
    widthInput.value = width;
    heightInput.value = height;

    const color = colorInput.value;
    const scale = getScale(width, height);
    const lightEnabled = !!lightingToggle && lightingToggle.checked;
    const lightDir = lightDirection ? lightDirection.value : 'center';
    const lightAmt = lightStrength ? clamp(lightStrength.value, 0, 100) : 0;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (styleSelect && styleSelect.value === "cut") {
      generateCutStone(width, height, scale, color);
    } else {
      generateCobbledStone(width, height, scale, color);
    }

    if (lightEnabled && lightAmt > 0) {
      drawLightingOverlay(width, height, lightDir, lightAmt);
    }
  }

  // Download functions
  function downloadPNG() {
    canvas.toBlob(function (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'stone_texture.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, 'image/png');
  }

  function downloadSVG() {
    const dataURL = canvas.toDataURL("image/png");
    const svg = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <image href="${dataURL}" width="${canvas.width}" height="${canvas.height}" preserveAspectRatio="none" />
</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stone_texture.svg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  //Event wiring
  if (generateBtn) generateBtn.addEventListener("click", draw);
  if (downloadPngBtn) downloadPngBtn.addEventListener("click", downloadPNG);
  if (downloadSvgBtn) downloadSvgBtn.addEventListener("click", downloadSVG);

  // Sync slider <-> number, but no auto-draw
  if (lightStrength && lightStrengthNumber) {
    lightStrength.addEventListener('input', () => {
      lightStrengthNumber.value = lightStrength.value;
    });
    lightStrengthNumber.addEventListener('input', () => {
      let v = clamp(lightStrengthNumber.value, 0, 100);
      lightStrengthNumber.value = v;
      lightStrength.value = v;
    });
  }

  // Default style cobbled
  if (styleSelect) styleSelect.value = 'cobbled';
});