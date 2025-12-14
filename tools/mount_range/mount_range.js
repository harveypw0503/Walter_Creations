// mount_range.js

const svg = document.getElementById('mountainSvg');
const generateBtn = document.getElementById('generateBtn');
const downloadSvgBtn = document.getElementById('downloadSvgBtn');
const downloadPngBtn = document.getElementById('downloadPngBtn');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');

let currentSVGPath = '';

// Helper to clamp values
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

function generate() {
  // Get and validate dimensions
  const width = clamp(widthInput.value, 300, 5000);
  const height = clamp(heightInput.value, 300, 5000);
  widthInput.value = width;
  heightInput.value = height;

  svg.innerHTML = '';
  
  // Set SVG dimensions
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // Mountain height as percentage (inverted so higher value = taller mountains)
  const heightPercent = Number(document.getElementById('heightControl').value);
  
  // Scale jaggedness based on width so it stays proportional
  const jaggednessSetting = Number(document.getElementById('jaggedness').value);
  const scaledJaggedness = jaggednessSetting * (width / 800); // Scale relative to default 800px
  
  // Add padding at top to prevent cutoff (15% of height as buffer)
  const topPadding = height * 0.15;
  const usableHeight = height - topPadding;
  const mountainTop = topPadding + (usableHeight * (1 - heightPercent / 100)); // Convert to Y coordinate
  
  const bottomY = height;

  let points = [[0, mountainTop], [width, mountainTop]];
  points = midpointDisplacement(points, scaledJaggedness, 128);

  let path = `M ${points[0][0]} ${points[0][1]}`;
  points.forEach(p => path += ` L ${p[0]} ${p[1]}`);
  path += ` L ${width} ${bottomY} L 0 ${bottomY} Z`;

  currentSVGPath = path;

  const ridge = document.createElementNS(svg.namespaceURI, 'path');
  ridge.setAttribute('d', path);
  ridge.setAttribute('fill', 'black');
  svg.appendChild(ridge);
}

function downloadSVG() {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svg);

  if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!source.match(/^<svg[^>]+"http:\/\/www\.w3\.org\/1999\/xlink"/)) {
    source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }
  source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);

  const link = document.createElement("a");
  link.href = url;
  link.download = "mountain-ridge.svg";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadPNG() {
  const width = clamp(widthInput.value, 300, 5000);
  const height = clamp(heightInput.value, 300, 5000);
  
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const img = new Image();
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "mountain-ridge.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };
  img.onerror = () => {
    alert("Failed to load SVG image for PNG export.");
  };

  img.src = url;
}

// Event listeners
generateBtn.addEventListener('click', generate);
downloadSvgBtn.addEventListener('click', downloadSVG);
downloadPngBtn.addEventListener('click', downloadPNG);

// Generate initially
generate();