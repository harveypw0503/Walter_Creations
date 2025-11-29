// sun_rays.js

const canvas = document.getElementById('sunCanvas');
const ctx = canvas.getContext('2d');

// Defaults override
document.getElementById('rayCount').value = 200;
document.getElementById('rayColor').value = '#2D9CDB';

// Helpers
function getDirectionCenter(direction, w, h) {
  switch (direction) {
    case "up": return {x: w/2, y: h};
    case "down": return {x: w/2, y: 0};
    case "left": return {x: w, y: h/2};
    case "right": return {x: 0, y: h/2};
    default: return {x: w/2, y: h/2};
  }
}

function hexToRGBA(hex, alpha) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// Dynamic resize to prevent clipping
function resizeCanvas(maxLength) {
  const size = maxLength * 2.5;
  canvas.width = size;
  canvas.height = size;
}

// Generator
function generateSunrays() {
  const rayCount = parseInt(document.getElementById('rayCount').value);
  const rayColor = document.getElementById('rayColor').value;
  const direction = document.getElementById('direction').value;
  const minLength = parseFloat(document.getElementById('minLength').value);
  const maxLength = parseFloat(document.getElementById('maxLength').value);
  const fixedLength = document.getElementById('fixedLength').checked;

  // Resize canvas so rays fit
  resizeCanvas(maxLength);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const center = getDirectionCenter(direction, canvas.width, canvas.height);
  const baseAngle = {up:-Math.PI/2, down:Math.PI/2, left:Math.PI, right:0, center:null}[direction];
  const spread = Math.PI/2;

  for (let i = 0; i < rayCount; i++) {
    const angle = direction === "center" ? Math.random() * Math.PI * 2 : baseAngle + (Math.random()-0.5) * spread;
    const length = fixedLength ? maxLength : minLength + Math.random() * (maxLength-minLength);
    const width = 5 + Math.random() * 15;

    const x = center.x + Math.cos(angle) * length;
    const y = center.y + Math.sin(angle) * length;

    const gradient = ctx.createLinearGradient(center.x, center.y, x, y);
    gradient.addColorStop(0, hexToRGBA(rayColor,0.25));
    gradient.addColorStop(0.5, hexToRGBA(rayColor,0.1));
    gradient.addColorStop(1, hexToRGBA(rayColor,0));

    ctx.strokeStyle = gradient;
    ctx.lineWidth = width;
    ctx.shadowColor = rayColor;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Sparkles
    for (let j = 0; j < 3; j++) {
      const t = Math.random();
      const dotX = center.x + (x - center.x) * t + (Math.random() - 0.5) * 10;
      const dotY = center.y + (y - center.y) * t + (Math.random() - 0.5) * 10;
      ctx.beginPath();
      ctx.fillStyle = hexToRGBA(rayColor, 0.2 + Math.random() * 0.3);
      ctx.arc(dotX, dotY, 1 + Math.random() * 2, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

// PNG export
function downloadPNG() {
  const link = document.createElement('a');
  link.download = 'sunrays.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// SVG export
function downloadSVG() {
  const rayCount = parseInt(document.getElementById('rayCount').value);
  const rayColor = document.getElementById('rayColor').value;
  const direction = document.getElementById('direction').value;
  const minLength = parseFloat(document.getElementById('minLength').value);
  const maxLength = parseFloat(document.getElementById('maxLength').value);
  const fixedLength = document.getElementById('fixedLength').checked;

  const size = maxLength * 2.5;
  const center = getDirectionCenter(direction, size, size);
  const baseAngle = {up:-Math.PI/2, down:Math.PI/2, left:Math.PI, right:0, center:null}[direction];
  const spread = Math.PI/2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">`;

  for (let i = 0; i < rayCount; i++) {
    const angle = direction === "center" ? Math.random() * Math.PI * 2 : baseAngle + (Math.random()-0.5) * spread;
    const length = fixedLength ? maxLength : minLength + Math.random() * (maxLength-minLength);
    const x = center.x + Math.cos(angle) * length;
    const y = center.y + Math.sin(angle) * length;
    svg += `<line x1="${center.x}" y1="${center.y}" x2="${x}" y2="${y}" stroke="${rayColor}" stroke-opacity="0.25" stroke-width="2" />`;
  }

  svg += `</svg>`;

  const blob = new Blob([svg], {type: "image/svg+xml"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "sunrays.svg";
  link.click();
  URL.revokeObjectURL(link.href);
}

// Event bindings
document.getElementById("generateBtn").addEventListener("click", generateSunrays);
document.getElementById("downloadBtn").addEventListener("click", downloadPNG);

//SVG download button
const svgBtn = document.createElement("button");
svgBtn.textContent = "Download SVG";
svgBtn.addEventListener("click", downloadSVG);
document.querySelector(".controls:last-of-type").appendChild(svgBtn);

// Initial render
generateSunrays();