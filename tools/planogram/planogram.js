// planogram.js

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const preview = document.getElementById('preview');

const generateBtn = document.getElementById('generateBtn');
const downloadPngBtn = document.getElementById('downloadPngBtn');
const downloadTxtBtn = document.getElementById('downloadTxtBtn');
const downloadCsvBtn = document.getElementById('downloadCsvBtn');

const pegboardBtn = document.getElementById('pegboardBtn');
const slatwallBtn = document.getElementById('slatwallBtn');
const compactBtn = document.getElementById('compactBtn');
const rowBtn = document.getElementById('rowBtn');

let placedItems = [];

// Toggle handlers
function setBoardMode(mode) {
  document.getElementById('boardMode').value = mode;
  if (mode === 'pegboard') {
    pegboardBtn.classList.add('active');
    slatwallBtn.classList.remove('active');
  } else {
    pegboardBtn.classList.remove('active');
    slatwallBtn.classList.add('active');
  }
}

function setPackingMode(mode) {
  document.getElementById('packingMode').value = mode;
  if (mode === 'compact') {
    compactBtn.classList.add('active');
    rowBtn.classList.remove('active');
  } else {
    compactBtn.classList.remove('active');
    rowBtn.classList.add('active');
  }
}

pegboardBtn.addEventListener('click', () => setBoardMode('pegboard'));
slatwallBtn.addEventListener('click', () => setBoardMode('slatwall'));
compactBtn.addEventListener('click', () => setPackingMode('compact'));
rowBtn.addEventListener('click', () => setPackingMode('row'));

function generate() {
  // Reset everything
  preview.innerHTML = '';
  placedItems = [];
  [downloadPngBtn, downloadTxtBtn, downloadCsvBtn].forEach(btn => btn.disabled = true);

  const [cols, rows] = document.getElementById('grid').value.split('x').map(n => parseInt(n) || 48);
  const lines = document.getElementById('items').value.trim().split('\n').filter(l => l.trim());
  
  const spacing = 30;
  const margin = 60;
  const HORIZONTAL_GAP = parseFloat(document.getElementById('horizontalGap').value) || 0;
  const VERTICAL_GAP = parseFloat(document.getElementById('verticalGap').value) || 0;

  const boardColor = document.getElementById('colorBoard').value;
  const bagColor = document.getElementById('colorBag').value;
  const numColor = document.getElementById('colorNum').value;
  const holeColor = document.getElementById('colorHole').value;

  canvas.width = cols * spacing + margin * 2;
  canvas.height = rows * spacing + margin * 2;

  // Background
  const mode = document.getElementById('boardMode').value;
  ctx.fillStyle = boardColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (mode === 'pegboard') {
    // Pegboard holes
    ctx.fillStyle = holeColor;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ctx.beginPath();
        ctx.arc(margin + x * spacing, margin + y * spacing, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    
    // Slatwall horizontal lines
    ctx.strokeStyle = holeColor;
    ctx.lineWidth = 3;
    for (let y = 0; y < rows; y++) {
      const lineY = margin + y * spacing;
      ctx.beginPath();
      ctx.moveTo(margin - 20, lineY);
      ctx.lineTo(canvas.width - margin + 20, lineY);
      ctx.stroke();
    }
  }

  // Parse items
  let items = [];
  for (const line of lines) {
    const parts = line.split('|');
    if (parts.length < 3) continue;
    const sku = parts[0].trim();
    const desc = parts[1].trim();
    const m = parts[2].trim().match(/(\d+)x(\d+)/i);
    if (!m) continue;
    items.push({sku, desc, w: parseInt(m[1]), h: parseInt(m[2])});
  }

  let placed = 0;
  const packingMode = document.getElementById('packingMode').value;

  if (packingMode === 'compact') {
    // COMPACT MODE (skyline)
    let skyline = new Array(cols + 1).fill(0);

    while (items.length > 0) {
      const item = items.shift();
      const w = item.w;
      const h = item.h;

      let placeX = -1;
      let placeY = rows + 999;

      for (let x = 0; x <= cols - w; x++) {
        let maxUnder = 0;
        for (let i = 0; i < w; i++) maxUnder = Math.max(maxUnder, skyline[x + i]);
        if (maxUnder + h <= rows && maxUnder < placeY) {
          placeY = maxUnder;
          placeX = x;
        }
      }

      if (placeX === -1) {
        preview.innerHTML += `<p class="error">No space for ${item.sku}</p>`;
        break;
      }

      const px = margin + (placeX + w / 2) * spacing;
      const py = margin + placeY * spacing;
      const bagW = w * spacing - 4;
      const bagH = h * spacing - 4;

      ctx.fillStyle = bagColor;
      ctx.fillRect(px - bagW/2, py, bagW, bagH);
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 3;
      ctx.strokeRect(px - bagW/2, py, bagW, bagH);

      ctx.fillStyle = numColor;
      ctx.font = 'bold ' + Math.min(bagW * 0.45, 100) + 'px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((placed + 1).toString(), px, py + bagH / 2);

      placedItems.push({num: placed + 1, sku: item.sku, desc: item.desc});
      placed++;

      for (let i = 0; i < w + HORIZONTAL_GAP; i++) {
        if (placeX + i <= cols) {
          skyline[placeX + i] = placeY + h + VERTICAL_GAP;
        }
      }
    }

  } else {
    // ROW MODE
    let gridX = 0;
    let gridY = 0;
    let currentRowMaxH = 0;

    while (items.length > 0) {
      const item = items[0];
      const w = item.w;
      const h = item.h;

      if (gridX + w > cols) {
        gridY += currentRowMaxH + VERTICAL_GAP;
        gridX = 0;
        currentRowMaxH = 0;
      }

      if (gridY + h > rows) {
        preview.innerHTML = `<p class="error">Board full! Only ${placed} items placed.</p>`;
        break;
      }

      const px = margin + (gridX + w / 2) * spacing;
      const py = margin + gridY * spacing;
      const bagW = w * spacing - 4;
      const bagH = h * spacing - 4;

      ctx.fillStyle = bagColor;
      ctx.fillRect(px - bagW/2, py, bagW, bagH);
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 3;
      ctx.strokeRect(px - bagW/2, py, bagW, bagH);

      ctx.fillStyle = numColor;
      ctx.font = 'bold ' + Math.min(bagW * 0.45, 100) + 'px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((placed + 1).toString(), px, py + bagH / 2);

      placedItems.push({num: placed + 1, sku: item.sku, desc: item.desc});

      gridX += w + HORIZONTAL_GAP;
      currentRowMaxH = Math.max(currentRowMaxH, h);
      items.shift();
      placed++;
    }
  }

  // Legend
  let legend = '<div class="legend"><h3>Item Legend</h3><table>';
  placedItems.forEach(i => {
    legend += `<tr><td><strong>#${i.num}</strong></td><td><strong>${i.sku}</strong></td><td>${i.desc}</td></tr>`;
  });
  legend += '</table></div>';

  preview.innerHTML = `<p class="success">Success! ${placed} items placed.</p>` + legend;
  preview.appendChild(canvas);
  canvas.style.display = 'block';

  // Enable exports
  [downloadPngBtn, downloadTxtBtn, downloadCsvBtn].forEach(btn => btn.disabled = false);
}

// Export functions
function downloadPNG() {
  const a = document.createElement('a');
  a.download = 'pegboard-planogram.png';
  a.href = canvas.toDataURL();
  a.click();
}

function downloadTXT() {
  let txt = "PEGBOARD PLANOGRAM - ITEM LIST\n\n";
  placedItems.forEach(i => txt += `#${i.num} | ${i.sku} | ${i.desc}\n`);
  saveAs(new Blob([txt], {type:'text/plain'}), 'pegboard-list.txt');
}

function downloadCSV() {
  let csv = "Number,SKU,Description\n";
  placedItems.forEach(i => csv += `${i.num},"${i.sku}","${i.desc.replace(/"/g,'""')}"\n`);
  saveAs(new Blob([csv], {type:'text/csv'}), 'pegboard-list.csv');
}

// Event listeners
generateBtn.addEventListener('click', generate);
downloadPngBtn.addEventListener('click', downloadPNG);
downloadTxtBtn.addEventListener('click', downloadTXT);
downloadCsvBtn.addEventListener('click', downloadCSV);