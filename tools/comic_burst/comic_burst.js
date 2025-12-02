// comic_burst.js

const canvas = document.getElementById("comicCanvas");
const ctx = canvas.getContext("2d");

const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");

const styleSelect = document.getElementById("burstStyle");
const burstColor = document.getElementById("burstColor");
const outlineToggle = document.getElementById("outlineToggle");
const outlineColor = document.getElementById("outlineColor");

function safe(id, fallback, min) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  let v = parseFloat(el.value);
  if (isNaN(v)) return fallback;
  if (min !== undefined && v < min) return fallback;
  return v;
}

function resizeCanvas(maxR) {
  const size = maxR * 2.5;
  canvas.width = size;
  canvas.height = size;
}

function drawClassic(cx, cy, spikes, minR, maxR) {
  const pts = [];
  const total = spikes * 2;
  const step = (2 * Math.PI) / total;

  for (let i = 0; i < total; i++) {
    const angle = i * step;
    const r = i % 2 === 0 ? maxR : minR;

    pts.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.closePath();

  ctx.fillStyle = burstColor.value;
  ctx.fill();

  if (outlineToggle.checked) {
    ctx.strokeStyle = outlineColor.value;
    ctx.lineWidth = 6;
    ctx.stroke();
  }
}

function drawOrganic(cx, cy, spikes, minR, maxR, randomness, angleJitter) {
  const pts = [];
  const total = spikes * 2;
  const baseStep = (2 * Math.PI) / total;

  for (let i = 0; i < total; i++) {
    const angle =
      i * baseStep +
      (Math.random() - 0.5) * baseStep * angleJitter * 2;

    const baseR = i % 2 === 0 ? maxR : minR;

    const r =
      baseR * (1 - randomness + Math.random() * randomness * 2);

    pts.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.closePath();

  ctx.fillStyle = burstColor.value;
  ctx.fill();

  if (outlineToggle.checked) {
    ctx.strokeStyle = outlineColor.value;
    ctx.lineWidth = 6;
    ctx.stroke();
  }
}

function generateBurst() {
  const spikes = safe("spikeCount", 20, 3);
  const minR = safe("minLength", 80, 5);
  const maxR = safe("maxLength", 180, minR);

  const randomness = safe("randomness", 0.4);
  const angleJitter = safe("angleJitter", 0.3);

  // Resize canvas big enough to ALWAYS contain the burst
  resizeCanvas(maxR);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  if (styleSelect.value === "classic")
    drawClassic(cx, cy, spikes, minR, maxR);
  else
    drawOrganic(cx, cy, spikes, minR, maxR, randomness, angleJitter);
}

generateBtn.addEventListener("click", generateBurst);

downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "comic_burst.png";
  link.click();
});

//SVG Export
function burstToSVG() {
  const spikes = safe("spikeCount", 20, 3);
  const minR = safe("minLength", 80, 5);
  const maxR = safe("maxLength", 180, minR);
  const randomness = safe("randomness", 0.4);
  const angleJitter = safe("angleJitter", 0.3);

  const size = maxR * 2.5;
  const cx = size / 2;
  const cy = size / 2;

  let pts = [];
  const total = spikes * 2;

  if (styleSelect.value === "classic") {
    const step = (2 * Math.PI) / total;
    for (let i = 0; i < total; i++) {
      const angle = i * step;
      const r = i % 2 === 0 ? maxR : minR;
      pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
  } else {
    const baseStep = (2 * Math.PI) / total;
    for (let i = 0; i < total; i++) {
      const angle =
        i * baseStep +
        (Math.random() - 0.5) * baseStep * angleJitter * 2;

      const baseR = i % 2 === 0 ? maxR : minR;
      const r =
        baseR * (1 - randomness + Math.random() * randomness * 2);

      pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
  }

  const fill = burstColor.value;
  const stroke = outlineToggle.checked ? outlineColor.value : "none";
  const strokeWidth = outlineToggle.checked ? 6 : 0;

  const pathData =
    "M" +
    pts
      .map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`)
      .join(" L ") +
    " Z";

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <path d="${pathData}"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="${strokeWidth}"
        stroke-linejoin="round"/>
</svg>`;
}

document.getElementById("downloadSvgBtn").addEventListener("click", () => {
  const svgContent = burstToSVG();
  const blob = new Blob([svgContent], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "comic_burst.svg";
  link.click();

  URL.revokeObjectURL(url);
});

// initial draw
generateBurst();
