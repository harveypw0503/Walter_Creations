// story_timeline.js

// ============================================================
// 0. ADVANCED TOOLING
// ============================================================
if (typeof window.registerAdvancedSlots === 'function') {
  window.registerAdvancedSlots([]);
}

// ============================================================
// 1. STATE
// ============================================================
let itemCounter    = 0;
let dragged        = null;
let numberBooks    = true;
let numberChapters = true;
let numberEvents   = true;

// Touch tracking for mobile drag
let touchStartY     = 0;
let touchStartX     = 0;
let touchCurrentY   = 0;
let touchCurrentX   = 0;
let isDraggingTouch = false;
let touchMoved      = false;

// DOM refs — assigned in DOMContentLoaded
let timeline, parking, recycleBin;

// ============================================================
// 2. HELPERS
// ============================================================
function setLabelToRaw(item) {
  const label = item.querySelector(".text") || item.querySelector(".label-text");
  if (label) label.textContent = item.dataset.rawTitle;
}

function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll(".item:not(.dragging):not(.block-child-hidden)")];
  return els.reduce((closest, child) => {
    const box    = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function getDragAfterElementTouch(container, y) {
  return getDragAfterElement(container, y);
}

// Block helper


// Returns ordered sibling items that belong under a book or chapter:
// book  → everything until the next book
// chapter → everything until the next chapter or book

function getBlockItems(leader) {
  const isBook    = leader.classList.contains('book');
  const isChapter = leader.classList.contains('chapter');
  if (!isBook && !isChapter) return [];

  const results = [];
  let sibling = leader.nextElementSibling;
  while (sibling) {
    if (isBook    && sibling.classList.contains('book')) break;
    if (isChapter && (sibling.classList.contains('chapter') || sibling.classList.contains('book'))) break;
    results.push(sibling);
    sibling = sibling.nextElementSibling;
  }
  return results;
}

function isBlockCollapsed(leader) {
  return leader.dataset.blockCollapsed === 'true';
}

// ============================================================
// 3. BLOCK COLLAPSE / EXPAND
// ============================================================
function toggleBlockCollapse(leader) {
  const collapsing = !isBlockCollapsed(leader);
  leader.dataset.blockCollapsed = collapsing ? 'true' : 'false';

  const btn = leader.querySelector('.block-toggle-btn');
  if (btn) btn.textContent = collapsing ? '▶' : '▼';

  const blockItems = getBlockItems(leader);
  blockItems.forEach(item => {
    if (collapsing) {
      item.classList.add('block-child-hidden');
    } else {
      item.classList.remove('block-child-hidden');
      // If a chapter inside this book is itself collapsed, re-hide its children
      if (item.classList.contains('chapter') && isBlockCollapsed(item)) {
        getBlockItems(item).forEach(child => child.classList.add('block-child-hidden'));
      }
    }
  });

  updateNumbering();
}

// ============================================================
// 4. ITEM CREATION
// ============================================================
function createItem(type, title = '', desc = '', collapsed = true, id = null, originalNextId = null, blockCollapsed = false) {
  const wrapper = document.createElement("div");
  wrapper.className = `item ${type}`;
  wrapper.draggable  = true;
  wrapper.id         = id || `item-${itemCounter++}`;

  const isLeader = type === 'book' || type === 'chapter';

  const card = document.createElement("div");
  card.className = "label";
  card.innerHTML = `
    <span class="number-badge"></span>
    <span class="label-text" contenteditable="true" spellcheck="false">${title || type.toUpperCase()}</span>
    <span class="actions">
      ${isLeader ? `<button class="block-toggle-btn" title="Collapse/expand block">${blockCollapsed ? '▶' : '▼'}</button>` : ''}
      <button class="convert" onclick="showConvertMenu(this)" title="Convert to...">⇄</button>
      <button class="park" onclick="parkItem(this)" title="Park item">🚗</button>
      <button class="delete" onclick="del(this)" title="Delete">🗑️</button>
      <button onclick="toggle(this)" title="Toggle details">⌃</button>
      <span class="handle" draggable="true" title="Drag to reorder">☰</span>
    </span>
  `;

  const bar = document.createElement("div");
  bar.className = type === 'book' ? 'bar book-bar' : 'bar chapter-bar';

  const details = document.createElement("div");
  details.className = "details";
  details.innerHTML = `<textarea placeholder="Description...">${desc}</textarea>`;

  if (collapsed) {
    wrapper.classList.add("collapsed");
    details.style.display = "none";
  }

  wrapper.append(card, bar, details);
  addDrag(wrapper.querySelector(".handle"), wrapper);

  if (isLeader) {
    card.querySelector('.block-toggle-btn').addEventListener('click', () => toggleBlockCollapse(wrapper));
    if (blockCollapsed) wrapper.dataset.blockCollapsed = 'true';
  }

  const labelText = card.querySelector('.label-text');
  labelText.addEventListener('input', function () {
    wrapper.dataset.rawTitle = this.textContent;
    updateNumbering();
  });
  labelText.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); this.blur(); }
  });

  wrapper.dataset.rawTitle = title || type.toUpperCase();
  if (originalNextId) wrapper.dataset.originalNextId = originalNextId;

  return wrapper;
}

function createEventItem(title, desc = '', collapsed = true, id = null, originalNextId = null) {
  const w = document.createElement("div");
  w.className = "item";
  w.id        = id || `item-${itemCounter++}`;
  w.innerHTML = `
    <div class="event label">
      <span class="number-badge"></span>
      <div class="text" contenteditable="true" spellcheck="false">${title}</div>
      <div class="actions">
        <button class="convert" onclick="showConvertMenu(this)" title="Convert to...">⇄</button>
        <button class="park" onclick="parkItem(this)" title="Park item">🚗</button>
        <button class="delete" onclick="del(this)" title="Delete">🗑️</button>
        <button class="toggle-btn" onclick="toggle(this)" title="Toggle details">⌃</button>
        <div class="handle" draggable="true" title="Drag to reorder">☰</div>
      </div>
    </div>
    <div class="details"><textarea placeholder="Details...">${desc}</textarea></div>
  `;

  addDrag(w.querySelector(".handle"), w);

  const textEl = w.querySelector('.text');
  textEl.addEventListener('input', function () {
    w.dataset.rawTitle = this.textContent;
    updateNumbering();
  });
  textEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); this.blur(); }
  });

  if (!collapsed) toggle(w.querySelector('.toggle-btn'));
  if (collapsed) {
    w.classList.add("collapsed");
    w.querySelector(".details").style.display = "none";
  }

  w.dataset.rawTitle = title;
  if (originalNextId) w.dataset.originalNextId = originalNextId;
  return w;
}

// ============================================================
// 5. ITEM ACTIONS (add / park / restore / delete / toggle)
// ============================================================
function addItem(type) {
  let newItem;
  if      (type === 'event')   newItem = createEventItem('Click to edit event name', '', false);
  else if (type === 'chapter') newItem = createItem("chapter", "Click to edit chapter name");
  else if (type === 'book')    newItem = createItem("book", "Click to edit book name");

  timeline.appendChild(newItem);
  newItem.classList.add('just-inserted');
  setTimeout(() => newItem.classList.remove('just-inserted'), 300);
  updateNumbering();

  setTimeout(() => {
    const editableEl = type === 'event'
      ? newItem.querySelector('.text')
      : newItem.querySelector('.label-text');
    if (editableEl) {
      editableEl.focus();
      const range = document.createRange();
      range.selectNodeContents(editableEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, 100);
}

// Move leader and its entire block to destination
function _moveGroup(leader, destination) {
  const blockItems = getBlockItems(leader);
  destination.appendChild(leader);
  blockItems.forEach(bi => destination.appendChild(bi));
}

function parkItem(btn) {
  const item      = btn.closest(".item");
  const container = item.parentElement;

  if (container.id === "timeline") {
    item.dataset.originalNextId = item.nextSibling ? item.nextSibling.id : "end";
  }

  // Un-hide children before moving (so they're visible & accessible in parking lot)
  getBlockItems(item).forEach(bi => bi.classList.remove('block-child-hidden'));
  _moveGroup(item, parking);

  const parkBtn = item.querySelector(".park");
  if (parkBtn) {
    parkBtn.textContent = "↩️";
    parkBtn.className   = "restore";
    parkBtn.title       = "Restore to timeline";
    parkBtn.onclick     = function () { restoreFromParking(this); };
  }

  setLabelToRaw(item);
  [...parking.children].forEach(bi => { if (bi !== item) setLabelToRaw(bi); });
  if (container.id === "timeline") updateNumbering();
}

function restoreFromParking(btn) {
  const item           = btn.closest(".item");
  const originalNextId = item.dataset.originalNextId;
  const nextEl         = (originalNextId && originalNextId !== "end")
    ? document.getElementById(originalNextId)
    : null;
  const blockItems     = getBlockItems(item);

  if (nextEl && nextEl.parentElement === timeline) {
    timeline.insertBefore(item, nextEl);
    blockItems.forEach(bi => timeline.insertBefore(bi, nextEl));
  } else {
    timeline.appendChild(item);
    blockItems.forEach(bi => timeline.appendChild(bi));
  }

  delete item.dataset.originalNextId;

  const restoreBtn = item.querySelector(".restore");
  if (restoreBtn) {
    restoreBtn.textContent = "🚗";
    restoreBtn.className   = "park";
    restoreBtn.title       = "Park item";
    restoreBtn.onclick     = function () { parkItem(this); };
  }

  if (isBlockCollapsed(item)) {
    getBlockItems(item).forEach(bi => bi.classList.add('block-child-hidden'));
  }

  updateNumbering();
}

function del(btn) {
  const item      = btn.closest(".item");
  const container = item.parentElement;

  if (container.id === "recycle-bin") {
    item.remove();
    return;
  }

  item.dataset.deletedFrom = container.id;
  if (container.id === "timeline") {
    item.dataset.originalNextId = item.nextSibling ? item.nextSibling.id : "end";
  }

  const blockItems = getBlockItems(item);
  blockItems.forEach(bi => bi.classList.remove('block-child-hidden'));

  recycleBin.appendChild(item);
  blockItems.forEach(bi => {
    bi.dataset.deletedFrom  = container.id;
    bi.dataset.groupLeader  = item.id;
    recycleBin.appendChild(bi);
  });

  addRecoverButton(item);
  setLabelToRaw(item);
  blockItems.forEach(setLabelToRaw);
  if (container.id === "timeline") updateNumbering();
}

function addRecoverButton(item) {
  const actions = item.querySelector(".actions");
  if (!actions || actions.querySelector(".recover-btn")) return;

  const recoverBtn       = document.createElement("button");
  recoverBtn.className   = "recover-btn";
  recoverBtn.textContent = "🔄";
  recoverBtn.title       = "Recover from bin";
  recoverBtn.onclick     = function () { recover(this); };
  actions.insertBefore(recoverBtn, actions.firstChild);

  const delBtn = actions.querySelector(".delete");
  if (delBtn) { delBtn.textContent = "❌"; delBtn.title = "Permanently delete"; }

  const parkBtn = actions.querySelector(".park, .restore");
  if (parkBtn) parkBtn.style.display = "none";
}

function recover(btn) {
  const item        = btn.closest(".item");
  const deletedFrom = item.dataset.deletedFrom || "timeline";

  btn.remove();

  const delBtn = item.querySelector(".delete");
  if (delBtn) { delBtn.textContent = "🗑️"; delBtn.title = "Delete"; }

  const groupItems = [...recycleBin.querySelectorAll(`[data-group-leader="${item.id}"]`)];

  const parkBtn = item.querySelector(".park, .restore");

  if (deletedFrom === "parking") {
    parking.appendChild(item);
    groupItems.forEach(bi => { delete bi.dataset.groupLeader; parking.appendChild(bi); });

    if (parkBtn) {
      parkBtn.style.display = "";
      parkBtn.textContent   = "↩️";
      parkBtn.className     = "restore";
      parkBtn.title         = "Restore to timeline";
      parkBtn.onclick       = function () { restoreFromParking(this); };
    }
    setLabelToRaw(item);
    groupItems.forEach(setLabelToRaw);
  } else {
    const originalNextId = item.dataset.originalNextId;
    const nextEl = (originalNextId && originalNextId !== "end")
      ? document.getElementById(originalNextId)
      : null;

    if (nextEl && nextEl.parentElement === timeline) {
      timeline.insertBefore(item, nextEl);
      groupItems.forEach(bi => { delete bi.dataset.groupLeader; timeline.insertBefore(bi, nextEl); });
    } else {
      timeline.appendChild(item);
      groupItems.forEach(bi => { delete bi.dataset.groupLeader; timeline.appendChild(bi); });
    }

    delete item.dataset.originalNextId;

    if (parkBtn) {
      parkBtn.style.display = "";
      parkBtn.textContent   = "🚗";
      parkBtn.className     = "park";
      parkBtn.title         = "Park item";
      parkBtn.onclick       = function () { parkItem(this); };
    }

    if (isBlockCollapsed(item)) {
      getBlockItems(item).forEach(bi => bi.classList.add('block-child-hidden'));
    }

    updateNumbering();
  }

  delete item.dataset.deletedFrom;
}

function toggle(btn) {
  const wrapper  = btn.closest(".item");
  const details  = wrapper.querySelector(".details");
  const isColl   = wrapper.classList.contains("collapsed");
  if (details) details.style.display = isColl ? "block" : "none";
  wrapper.classList.toggle("collapsed");
  btn.textContent = isColl ? "⌄" : "⌃";
}

// ============================================================
// 6. CONVERT
// ============================================================
function showConvertMenu(btn) {
  document.querySelector('.convert-popup')?.remove();

  const item        = btn.closest(".item");
  const currentType = item.classList.contains('book') ? 'book'
                    : item.classList.contains('chapter') ? 'chapter'
                    : 'event';

  const popup        = document.createElement('div');
  popup.className    = 'convert-popup';
  const popupContent = document.createElement('div');
  popupContent.className = 'convert-popup-content';
  popupContent.innerHTML = `
    <div class="convert-popup-header">Convert to:</div>
    <div class="convert-popup-options">
      ${currentType !== 'event'   ? '<button class="convert-popup-btn" data-type="event"><span class="convert-icon">•</span><span>Event</span></button>' : ''}
      ${currentType !== 'chapter' ? '<button class="convert-popup-btn" data-type="chapter"><span class="convert-icon">📖</span><span>Chapter</span></button>' : ''}
      ${currentType !== 'book'    ? '<button class="convert-popup-btn" data-type="book"><span class="convert-icon">📚</span><span>Book</span></button>' : ''}
    </div>
    <button class="convert-popup-cancel">Cancel</button>
  `;
  popup.appendChild(popupContent);
  document.body.appendChild(popup);

  popupContent.querySelectorAll('.convert-popup-btn').forEach(ob => {
    ob.onclick = () => { convertItem(item, ob.dataset.type); popup.remove(); };
  });
  popupContent.querySelector('.convert-popup-cancel').onclick = () => popup.remove();
  popup.onclick = (e) => { if (e.target === popup) popup.remove(); };

  const escH = (e) => { if (e.key === 'Escape') { popup.remove(); document.removeEventListener('keydown', escH); } };
  document.addEventListener('keydown', escH);
}

function convertItem(oldItem, newType) {
  const title          = oldItem.dataset.rawTitle;
  const desc           = oldItem.querySelector('textarea')?.value || '';
  const collapsed      = oldItem.classList.contains('collapsed');
  const id             = oldItem.id;
  const originalNextId = oldItem.dataset.originalNextId;
  const blockColl      = isBlockCollapsed(oldItem);

  let newItem;
  if (newType === 'event') {
    newItem = createEventItem(title, desc, collapsed, id, originalNextId);
  } else {
    newItem = createItem(newType, title, desc, collapsed, id, originalNextId, blockColl);
  }
  if (oldItem.dataset.deletedFrom) newItem.dataset.deletedFrom = oldItem.dataset.deletedFrom;

  oldItem.parentElement.insertBefore(newItem, oldItem);
  oldItem.remove();

  const container = newItem.parentElement;
  if (container.id === 'parking') {
    const parkBtn = newItem.querySelector(".park");
    if (parkBtn) {
      parkBtn.textContent = "↩️"; parkBtn.className = "restore";
      parkBtn.title       = "Restore to timeline";
      parkBtn.onclick     = function () { restoreFromParking(this); };
    }
    setLabelToRaw(newItem);
  } else if (container.id === 'recycle-bin') {
    addRecoverButton(newItem); setLabelToRaw(newItem);
  }

  if (container.id === 'timeline') updateNumbering();
  newItem.classList.add('just-converted');
  setTimeout(() => newItem.classList.remove('just-converted'), 600);
}

function emptyRecycle() {
  if (confirm("Permanently delete all items in the recycle bin? This cannot be undone.")) {
    recycleBin.innerHTML = "";
  }
}

// ============================================================
// 7. NUMBERING
// ============================================================
function toggleNumber(type) {
  if (type === 'book')    numberBooks    = !numberBooks;
  if (type === 'chapter') numberChapters = !numberChapters;
  if (type === 'event')   numberEvents   = !numberEvents;
  updateNumbering();
}

function updateNumbering() {
  let bookCtr = 0, chapterCtr = 0, eventCtr = 0;

  [...timeline.children].forEach(item => {
    // Hidden block children don't count in the visible numbering
    if (item.classList.contains('block-child-hidden')) return;

    const isBook    = item.classList.contains("book");
    const isChapter = item.classList.contains("chapter");
    const isEvent   = !(isBook || isChapter);

    const label       = item.querySelector(".label-text") || item.querySelector(".text");
    let   numberBadge = item.querySelector(".number-badge");

    if (!numberBadge) {
      numberBadge           = document.createElement("span");
      numberBadge.className = "number-badge";
      const actions = item.querySelector(".actions");
      if (actions) actions.insertBefore(numberBadge, actions.firstChild);
    }

    if (label && document.activeElement !== label) {
      label.textContent = item.dataset.rawTitle || "";
    }

    if (isBook) {
      bookCtr++; chapterCtr = 0; eventCtr = 0;
      numberBadge.textContent = numberBooks ? bookCtr : "";
    } else if (isChapter) {
      chapterCtr++; eventCtr = 0;
      numberBadge.textContent = numberChapters ? chapterCtr : "";
    } else {
      eventCtr++;
      numberBadge.textContent = numberEvents ? eventCtr : "";
    }
  });
}

// ============================================================
// 8. DRAG & DROP
// ============================================================
function addDrag(handle, item) {
  handle.addEventListener("dragstart", () => {
    dragged = item;
    item.classList.add("dragging");
    document.querySelectorAll(".droppable").forEach(d => d.classList.add("drag-active"));
  });

  handle.addEventListener("dragend", () => {
    dragged = null;
    item.classList.remove("dragging");
    document.querySelectorAll(".droppable").forEach(d => d.classList.remove("drag-active"));
    if (item.parentElement?.id === "timeline") updateNumbering();
    else setLabelToRaw(item);
  });

  handle.addEventListener("touchstart", e => {
    const t = e.touches[0];
    touchStartY = t.clientY; touchStartX = t.clientX;
    touchCurrentY = touchStartY; touchCurrentX = touchStartX;
    isDraggingTouch = false; touchMoved = false; dragged = item;
  }, { passive: true });

  handle.addEventListener("touchmove", e => {
    if (!dragged) return;
    const t = e.touches[0];
    touchCurrentY = t.clientY; touchCurrentX = t.clientX;
    const diffY = Math.abs(touchCurrentY - touchStartY);
    const diffX = Math.abs(touchCurrentX - touchStartX);

    if (diffY > 10 && diffY > diffX && !isDraggingTouch) {
      isDraggingTouch = true;
      item.classList.add("dragging");
      document.querySelectorAll(".droppable").forEach(d => d.classList.add("drag-active"));
      e.preventDefault();
    }

    if (isDraggingTouch) {
      touchMoved = true; e.preventDefault();
      const elemBelow      = document.elementFromPoint(t.clientX, t.clientY);
      const dropContainer  = elemBelow?.closest('.droppable') || item.parentElement;
      const afterElement   = getDragAfterElementTouch(dropContainer, touchCurrentY);
      if (afterElement == null) dropContainer.appendChild(item);
      else if (afterElement !== item) dropContainer.insertBefore(item, afterElement);
    }
  }, { passive: false });

  handle.addEventListener("touchend", e => {
    if (isDraggingTouch && touchMoved) {
      e.preventDefault();
      item.classList.remove("dragging");
      document.querySelectorAll(".droppable").forEach(d => d.classList.remove("drag-active"));
      if (item.parentElement?.id === "timeline") updateNumbering();
      else setLabelToRaw(item);
    }
    dragged = null; isDraggingTouch = false; touchMoved = false;
  }, { passive: false });
}

// ============================================================
// 9. MODALS
// ============================================================
function openParkingModal()  { document.getElementById("parking-modal").style.display = "block"; }
function closeParkingModal() { document.getElementById("parking-modal").style.display = "none"; }
function openRecycleModal()  { document.getElementById("recycle-modal").style.display = "block"; }
function closeRecycleModal() { document.getElementById("recycle-modal").style.display = "none"; }

// ============================================================
// 10. EXPORT / IMPORT
// ============================================================
function getItemData(el) {
  const type = el.classList.contains("book") ? "book"
             : el.classList.contains("chapter") ? "chapter" : "event";
  return {
    type,
    title:          el.dataset.rawTitle || '',
    desc:           el.querySelector("textarea")?.value || '',
    collapsed:      el.classList.contains("collapsed"),
    blockCollapsed: el.dataset.blockCollapsed === 'true',
    id:             el.id,
    originalNextId: el.dataset.originalNextId || null,
  };
}

function exportJSON() {
  const data = {
    projectName: document.getElementById("project-name").value,
    timeline:    [...timeline.children].map(getItemData),
    parking:     [...parking.children].map(getItemData),
    recycle:     [...recycleBin.children].map(getItemData),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "story-timeline.json"; a.click();
}

function _buildItemFromData(it, idPrefix = '') {
  const newId = idPrefix
    ? `${idPrefix}-${(it.id || `item-${itemCounter++}`)}`
    : (it.id || `item-${itemCounter++}`);

  if (it.type === "event") {
    return createEventItem(it.title, it.desc ?? '', it.collapsed ?? true, newId, null);
  }
  return createItem(it.type, it.title, it.desc ?? '', it.collapsed ?? true, newId, null, it.blockCollapsed ?? false);
}

function _applyBlockCollapseVisuals(container) {
  [...container.children].forEach(item => {
    if (isBlockCollapsed(item)) {
      getBlockItems(item).forEach(bi => bi.classList.add('block-child-hidden'));
    }
  });
}

/** Full replace */
function importJSON() {
  _pickJSONFile(data => {
    document.getElementById("project-name").value = data.projectName || "";
    timeline.innerHTML = ""; parking.innerHTML = ""; recycleBin.innerHTML = "";

    (data.timeline || []).forEach(it => timeline.appendChild(_buildItemFromData(it)));

    (data.parking  || []).forEach(it => {
      const w = _buildItemFromData(it);
      parking.appendChild(w);
      const pb = w.querySelector(".park");
      if (pb) { pb.textContent="↩️"; pb.className="restore"; pb.title="Restore to timeline"; pb.onclick=function(){restoreFromParking(this);}; }
      setLabelToRaw(w);
    });

    (data.recycle  || []).forEach(it => {
      const w = _buildItemFromData(it);
      recycleBin.appendChild(w);
      addRecoverButton(w); setLabelToRaw(w);
    });

    _applyBlockCollapseVisuals(timeline);
    updateNumbering();
  });
}

// Merge — appends imported items without clearing existing ones
function mergeJSON() {
  _pickJSONFile(data => {
    const prefix = `m${Date.now()}`;

    (data.timeline || []).forEach(it => timeline.appendChild(_buildItemFromData(it, prefix)));

    (data.parking || []).forEach(it => {
      const w = _buildItemFromData(it, prefix);
      parking.appendChild(w);
      const pb = w.querySelector(".park");
      if (pb) { pb.textContent="↩️"; pb.className="restore"; pb.title="Restore to timeline"; pb.onclick=function(){restoreFromParking(this);}; }
      setLabelToRaw(w);
    });

    (data.recycle || []).forEach(it => {
      const w = _buildItemFromData(it, prefix);
      recycleBin.appendChild(w);
      addRecoverButton(w); setLabelToRaw(w);
    });

    _applyBlockCollapseVisuals(timeline);
    updateNumbering();

    const count = (data.timeline||[]).length;
    showToast(`Merged ${count} item${count !== 1 ? 's' : ''} from "${data.projectName || 'untitled'}"`);
  });
}

function _pickJSONFile(callback) {
  const input  = document.createElement("input");
  input.type   = "file"; input.accept = ".json";
  input.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload  = ev => { try { callback(JSON.parse(ev.target.result)); } catch { alert("Invalid JSON file."); } };
    reader.readAsText(file);
  };
  input.click();
}

function showToast(msg) {
  let toast = document.getElementById('tl-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'tl-toast';
    toast.className = 'tl-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('tl-toast-visible');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('tl-toast-visible'), 3200);
}

function exportTXT() {
  const projectName = document.getElementById("project-name").value;
  let text = projectName ? projectName + "\n\n" : "";
  [...timeline.children].forEach(item => {
    text += item.dataset.rawTitle + "\n" + (item.querySelector("textarea")?.value || '') + "\n\n";
  });
  text += "Parking Lot:\n";
  [...parking.children].forEach(item => {
    text += item.dataset.rawTitle + "\n" + (item.querySelector("textarea")?.value || '') + "\n\n";
  });
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "story-timeline.txt"; a.click();
}

function exportDOCX() {
  const { Document, Packer, Paragraph, HeadingLevel, AlignmentType } = docx;
  if (!timeline.children.length && !parking.children.length) { alert("Nothing to export."); return; }
  const children = [];
  const projectName = document.getElementById("project-name").value;
  if (projectName) {
    children.push(new Paragraph({ text: projectName.toUpperCase(), heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 400 } }));
  }
  let bookIdx = 0, chapterIdx = 0;
  [...timeline.children].forEach(item => {
    const title = item.dataset.rawTitle || "";
    const desc  = item.querySelector("textarea")?.value.trim() || "";
    if (item.classList.contains("book")) {
      bookIdx++; chapterIdx = 0;
      children.push(new Paragraph({ text: `BOOK ${bookIdx}: ${title}`, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 120 } }));
      if (desc) desc.split("\n").forEach(l => children.push(new Paragraph({ text: l, indent: { left: 720 }, spacing: { after: 80 } })));
    } else if (item.classList.contains("chapter")) {
      chapterIdx++;
      children.push(new Paragraph({ text: `Chapter ${chapterIdx}: ${title}`, bullet: { level: 0 }, spacing: { before: 160, after: 60 } }));
      if (desc) desc.split("\n").forEach(l => children.push(new Paragraph({ text: l, indent: { left: 1440 }, spacing: { after: 60 } })));
    } else {
      children.push(new Paragraph({ text: title, bullet: { level: 1 }, spacing: { after: 40 } }));
      if (desc) desc.split("\n").forEach(l => children.push(new Paragraph({ text: l, indent: { left: 2160 }, spacing: { after: 40 } })));
    }
  });
  if (parking.children.length) {
    children.push(new Paragraph({ text: "PARKING LOT", heading: HeadingLevel.HEADING_1, spacing: { before: 500, after: 200 } }));
    [...parking.children].forEach(item => {
      const title = item.dataset.rawTitle || "";
      const desc  = item.querySelector("textarea")?.value.trim() || "";
      children.push(new Paragraph({ text: title, bullet: { level: 0 } }));
      if (desc) desc.split("\n").forEach(l => children.push(new Paragraph({ text: l, indent: { left: 1440 } })));
    });
  }
  const doc = new Document({ sections: [{ children }] });
  Packer.toBlob(doc).then(blob => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = "story-outline.docx";
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
  }).catch(err => { console.error("DOCX export failed:", err); alert("DOCX export failed."); });
}

// ============================================================
// 11. DOM WIRING
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  timeline   = document.getElementById("timeline");
  parking    = document.getElementById("parking");
  recycleBin = document.getElementById("recycle-bin");

  if (!timeline || !parking || !recycleBin) {
    return console.error("Required timeline elements not found");
  }

  document.querySelectorAll(".droppable").forEach(drop => {
    drop.addEventListener("dragover", e => {
      e.preventDefault();
      if (!dragged) return;
      const after = getDragAfterElement(drop, e.clientY);
      if (after == null) drop.appendChild(dragged);
      else drop.insertBefore(dragged, after);
    });
    drop.addEventListener("dragenter", e => e.preventDefault());
    drop.addEventListener("touchmove", e => {
      if (!isDraggingTouch || !dragged) return;
      const t     = e.touches[0];
      const after = getDragAfterElementTouch(drop, t.clientY);
      if (after == null) drop.appendChild(dragged);
      else drop.insertBefore(dragged, after);
    }, { passive: false });
  });

  window.addEventListener('click', event => {
    const pm = document.getElementById("parking-modal");
    const rm = document.getElementById("recycle-modal");
    if (event.target === pm) closeParkingModal();
    if (event.target === rm) closeRecycleModal();
  });
});