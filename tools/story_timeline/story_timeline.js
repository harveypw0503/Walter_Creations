// story_timeline.js - IMPROVED VERSION WITH PARKING LOT MODAL

let itemCounter = 0;
const timeline = document.getElementById("timeline");
const parking = document.getElementById("parking");
const recycleBin = document.getElementById("recycleBin");
let dragged = null;
let numberBooks = true;
let numberChapters = true;
let numberEvents = true;

// Touch tracking for mobile drag
let touchStartY = 0;
let touchStartX = 0;
let touchCurrentY = 0;
let touchCurrentX = 0;
let isDraggingTouch = false;
let touchMoved = false;
let draggedClone = null;

/* ===== TOGGLE NUMBERING ===== */
function toggleNumber(type) {
  if (type === 'book') numberBooks = !numberBooks;
  if (type === 'chapter') numberChapters = !numberChapters;
  if (type === 'event') numberEvents = !numberEvents;

  updateNumbering();
}

/* ===== CREATE ITEM ===== */
function createItem(type, title = '', desc = '', collapsed = true, id = null, originalNextId = null) {
  const wrapper = document.createElement("div");
  wrapper.className = `item ${type}`;
  wrapper.draggable = true;
  wrapper.id = id || `item-${itemCounter++}`;

  const card = document.createElement("div");
  card.className = "label";
  card.innerHTML = `
    <span class="number-badge"></span>
    <span class="label-text" contenteditable="true" spellcheck="false">${title || type.toUpperCase()}</span>
    <span class="actions">
      <button class="park" onclick="parkItem(this)" title="Park item">🚗</button>
      <button class="delete" onclick="del(this)" title="Delete">🗑️</button>
      <button onclick="toggle(this)" title="Toggle details">^</button>
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
  
  // Handle inline editing
  const labelText = card.querySelector('.label-text');
  labelText.addEventListener('input', function() {
    wrapper.dataset.rawTitle = this.textContent;
    updateNumbering();
  });
  labelText.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.blur();
    }
  });
  
  wrapper.dataset.rawTitle = title || type.toUpperCase();
  if (originalNextId) wrapper.dataset.originalNextId = originalNextId;

  return wrapper;
}

/* ===== ADD ITEMS ===== */
function addItem(type) {
  let newItem;
  
  if (type === 'event') {
    newItem = createEventItem('Click to edit event name', '', false);
  } else if (type === 'chapter') {
    newItem = createItem("chapter", "Click to edit chapter name");
  } else if (type === 'book') {
    newItem = createItem("book", "Click to edit book name");
  }
  
  timeline.appendChild(newItem);
  newItem.classList.add('just-inserted');
  setTimeout(() => newItem.classList.remove('just-inserted'), 300);
  updateNumbering();
  
  // Auto-focus the editable text for immediate editing
  setTimeout(() => {
    const editableEl = type === 'event' 
      ? newItem.querySelector('.text')
      : newItem.querySelector('.label-text');
    
    if (editableEl) {
      editableEl.focus();
      // Select all text for easy replacement
      const range = document.createRange();
      range.selectNodeContents(editableEl);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, 100);
}

function createEventItem(title, desc = '', collapsed = true, id = null, originalNextId = null) {
  const w = document.createElement("div");
  w.className = "item";
  w.id = id || `item-${itemCounter++}`;
  w.innerHTML = `
    <div class="event label">
      <span class="number-badge"></span>
      <div class="text" contenteditable="true" spellcheck="false">${title}</div>
      <div class="actions">
        <button class="park" onclick="parkItem(this)" title="Park item">🚗</button>
        <button class="delete" onclick="del(this)" title="Delete">🗑️</button>
        <button onclick="toggle(this)" title="Toggle details">^</button>
        <div class="handle" draggable="true" title="Drag to reorder">☰</div>
      </div>
    </div>
    <div class="details"><textarea placeholder="Details...">${desc}</textarea></div>
  `;
  
  addDrag(w.querySelector(".handle"), w);
  
  // Handle inline editing for event text
  const textEl = w.querySelector('.text');
  textEl.addEventListener('input', function() {
    w.dataset.rawTitle = this.textContent;
    updateNumbering();
  });
  textEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.blur();
    }
  });

  if (!collapsed) {
    toggle(w.querySelector('.actions button:not(.delete):not(.park)'));
  }
  
  if (collapsed) {
    w.classList.add("collapsed");
    w.querySelector(".details").style.display = "none";
  }
  w.dataset.rawTitle = title;
  if (originalNextId) w.dataset.originalNextId = originalNextId;
  return w;
}

/* ===== PARKING LOT ACTIONS ===== */
function parkItem(btn) {
  const item = btn.closest(".item");
  const container = item.parentElement;
  
  // Save original position if coming from timeline
  if (container.id === "timeline") {
    item.dataset.originalNextId = item.nextSibling ? item.nextSibling.id : "end";
  }
  
  // Move to parking lot
  parking.appendChild(item);
  
  // Replace park button with restore button
  const parkBtn = item.querySelector(".park");
  if (parkBtn) {
    parkBtn.textContent = "↩️";
    parkBtn.className = "restore";
    parkBtn.title = "Restore to timeline";
    parkBtn.onclick = function() { restoreFromParking(this); };
  }
  
  setLabelToRaw(item);
  if (container.id === "timeline") updateNumbering();
}

function restoreFromParking(btn) {
  const item = btn.closest(".item");
  const originalNextId = item.dataset.originalNextId;
  let nextEl = null;
  
  if (originalNextId && originalNextId !== "end") {
    nextEl = document.getElementById(originalNextId);
  }
  
  if (nextEl && nextEl.parentElement === timeline) {
    timeline.insertBefore(item, nextEl);
  } else {
    timeline.appendChild(item);
  }
  
  delete item.dataset.originalNextId;
  
  // Replace restore button back to park button
  const restoreBtn = item.querySelector(".restore");
  if (restoreBtn) {
    restoreBtn.textContent = "🚗";
    restoreBtn.className = "park";
    restoreBtn.title = "Park item";
    restoreBtn.onclick = function() { parkItem(this); };
  }
  
  updateNumbering();
}

/* ===== MODAL FUNCTIONS ===== */
function openParkingModal() {
  document.getElementById("parkingModal").style.display = "block";
}

function closeParkingModal() {
  document.getElementById("parkingModal").style.display = "none";
}

function openRecycleModal() {
  document.getElementById("recycleModal").style.display = "block";
}

function closeRecycleModal() {
  document.getElementById("recycleModal").style.display = "none";
}

// Close modals when clicking outside
window.onclick = function(event) {
  const parkingModal = document.getElementById("parkingModal");
  const recycleModal = document.getElementById("recycleModal");
  
  if (event.target == parkingModal) {
    closeParkingModal();
  }
  if (event.target == recycleModal) {
    closeRecycleModal();
  }
}

/* ===== RECYCLE BIN ACTIONS ===== */
function del(btn) {
  const item = btn.closest(".item");
  const container = item.parentElement;
  
  if (container.id === "recycleBin") {
    item.remove();
  } else {
    // Remember where this was deleted FROM so recover() restores to the right place
    item.dataset.deletedFrom = container.id; // "timeline" or "parking"

    if (container.id === "timeline") {
      item.dataset.originalNextId = item.nextSibling ? item.nextSibling.id : "end";
    }
    // If deleted from parking, originalNextId is already set from when it was parked — keep it

    recycleBin.appendChild(item);
    addRecoverButton(item);
    setLabelToRaw(item);
    if (container.id === "timeline") updateNumbering();
  }
}

function addRecoverButton(item) {
  const actions = item.querySelector(".actions") || item.querySelector(".label > span:nth-child(2)");
  
  if (!actions.querySelector(".recover-btn")) {
    const recoverBtn = document.createElement("button");
    recoverBtn.className = "recover-btn";
    recoverBtn.textContent = "🔄";
    recoverBtn.title = "Recover from bin";
    recoverBtn.onclick = function() { recover(this); };
    actions.insertBefore(recoverBtn, actions.firstChild);
  }
  
  // Change delete button to permanent delete
  const delBtn = actions.querySelector(".delete");
  delBtn.textContent = "❌";
  delBtn.title = "Permanently delete";
  
  // Hide park/restore button if in recycle bin
  const parkBtn = actions.querySelector(".park, .restore");
  if (parkBtn) {
    parkBtn.style.display = "none";
  }
}

function recover(btn) {
  const item = btn.closest(".item");
  const deletedFrom = item.dataset.deletedFrom || "timeline";

  // Clean up the recover button first
  btn.remove();

  // Restore the delete button to normal trash icon
  const delBtn = item.querySelector(".delete");
  if (delBtn) {
    delBtn.textContent = "🗑️";
    delBtn.title = "Delete";
  }

  if (deletedFrom === "parking") {
    // ── Put it back in parking exactly as it was ──
    parking.appendChild(item);

    // Make sure the park/restore button is visible and set to "restore"
    let parkBtn = item.querySelector(".park, .restore");
    if (parkBtn) {
      parkBtn.style.display = "";
      parkBtn.textContent = "↩️";
      parkBtn.className = "restore";
      parkBtn.title = "Restore to timeline";
      parkBtn.onclick = function() { restoreFromParking(this); };
    }

    setLabelToRaw(item);
  } else {
    // ── Put it back in timeline at its original position ──
    const originalNextId = item.dataset.originalNextId;
    let nextEl = null;

    if (originalNextId && originalNextId !== "end") {
      nextEl = document.getElementById(originalNextId);
    }

    if (nextEl && nextEl.parentElement === timeline) {
      timeline.insertBefore(item, nextEl);
    } else {
      timeline.appendChild(item);
    }

    delete item.dataset.originalNextId;

    // Show park button again (normal state)
    const parkBtn = item.querySelector(".park, .restore");
    if (parkBtn) {
      parkBtn.style.display = "";
      parkBtn.textContent = "🚗";
      parkBtn.className = "park";
      parkBtn.title = "Park item";
      parkBtn.onclick = function() { parkItem(this); };
    }

    updateNumbering();
  }

  // Clean up the tracking attribute
  delete item.dataset.deletedFrom;
}

function toggle(btn) {
  const wrapper = btn.closest(".item");
  const details = wrapper.querySelector(".details");
  const isCollapsed = wrapper.classList.contains("collapsed");
  if (details) details.style.display = isCollapsed ? "block" : "none";
  wrapper.classList.toggle("collapsed");
  btn.textContent = isCollapsed ? "⌄" : "⌃";
}

function emptyRecycle() {
  if (confirm("Are you sure you want to permanently delete all items in the recycle bin? This cannot be undone.")) {
    recycleBin.innerHTML = "";
  }
}

/* ===== DRAG (DESKTOP & MOBILE) WITH ANIMATIONS ===== */
function addDrag(handle, item) {
  // Desktop drag events
  handle.addEventListener("dragstart", (e) => {
    dragged = item;
    item.classList.add("dragging");
    
    // Add drag-active class to droppables
    document.querySelectorAll(".droppable").forEach(drop => {
      drop.classList.add("drag-active");
    });
  });
  
  handle.addEventListener("dragend", () => {
    dragged = null;
    item.classList.remove("dragging");
    
    // Remove drag-active class
    document.querySelectorAll(".droppable").forEach(drop => {
      drop.classList.remove("drag-active");
    });
    
    if (item.parentElement.id === "timeline") {
      updateNumbering();
    } else {
      setLabelToRaw(item);
    }
  });

  // Mobile touch events
  handle.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    touchStartY = touch.clientY;
    touchStartX = touch.clientX;
    touchCurrentY = touchStartY;
    touchCurrentX = touchStartX;
    isDraggingTouch = false;
    touchMoved = false;
    dragged = item;
  }, { passive: true });

  handle.addEventListener("touchmove", (e) => {
    if (!dragged) return;
    
    const touch = e.touches[0];
    touchCurrentY = touch.clientY;
    touchCurrentX = touch.clientX;
    
    const diffY = Math.abs(touchCurrentY - touchStartY);
    const diffX = Math.abs(touchCurrentX - touchStartX);
    
    // Start dragging if moved more than 10px
    if (diffY > 10 && diffY > diffX && !isDraggingTouch) {
      isDraggingTouch = true;
      item.classList.add("dragging");
      
      // Add drag-active class
      document.querySelectorAll(".droppable").forEach(drop => {
        drop.classList.add("drag-active");
      });
      
      e.preventDefault();
    }
    
    if (isDraggingTouch) {
      touchMoved = true;
      e.preventDefault();
      
      const touchLocation = touch;
      const elemBelow = document.elementFromPoint(touchLocation.clientX, touchLocation.clientY);
      
      let dropContainer = elemBelow?.closest('.droppable');
      if (!dropContainer) {
        dropContainer = item.parentElement;
      }
      
      const afterElement = getDragAfterElementTouch(dropContainer, touchCurrentY);
      
      if (afterElement == null) {
        dropContainer.appendChild(item);
      } else if (afterElement !== item) {
        dropContainer.insertBefore(item, afterElement);
      }
    }
  }, { passive: false });

  handle.addEventListener("touchend", (e) => {
    if (isDraggingTouch && touchMoved) {
      e.preventDefault();
      item.classList.remove("dragging");
      
      // Remove drag-active class
      document.querySelectorAll(".droppable").forEach(drop => {
        drop.classList.remove("drag-active");
      });
      
      if (item.parentElement.id === "timeline") {
        updateNumbering();
      } else {
        setLabelToRaw(item);
      }
    }
    
    dragged = null;
    isDraggingTouch = false;
    touchMoved = false;
  }, { passive: false });
}

// Desktop drag over
const droppables = document.querySelectorAll(".droppable");
droppables.forEach(drop => {
  drop.addEventListener("dragover", e => {
    e.preventDefault();
    if (!dragged) return;
    const afterElement = getDragAfterElement(drop, e.clientY);
    if (afterElement == null) {
      drop.appendChild(dragged);
    } else {
      drop.insertBefore(dragged, afterElement);
    }
  });
  
  drop.addEventListener("dragenter", e => {
    e.preventDefault();
  });
  
  // Touch drag over for droppable areas
  drop.addEventListener("touchmove", e => {
    if (!isDraggingTouch || !dragged) return;
    
    const touch = e.touches[0];
    const afterElement = getDragAfterElementTouch(drop, touch.clientY);
    
    if (afterElement == null) {
      drop.appendChild(dragged);
    } else {
      drop.insertBefore(dragged, afterElement);
    }
  }, { passive: false });
});

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".item:not(.dragging)")];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function getDragAfterElementTouch(container, y) {
  const draggableElements = [...container.querySelectorAll(".item:not(.dragging)")];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/* ===== NUMBERING ===== */
function updateNumbering() {
  let bookCounter = 0;
  let chapterCounter = 0;
  let eventCounter = 0;

  [...timeline.children].forEach(item => {
    const isBook = item.classList.contains("book");
    const isChapter = item.classList.contains("chapter");
    const isEvent = !(isBook || isChapter);

    const label = item.querySelector(".label-text") || item.querySelector(".text");
    let numberBadge = item.querySelector(".number-badge");

    // Create the badge if it doesn't exist yet
    if (!numberBadge) {
      numberBadge = document.createElement("span");
      numberBadge.className = "number-badge";
      const actions = item.querySelector(".actions") || item.querySelector(".label > span:nth-child(2)");
      actions.insertBefore(numberBadge, actions.firstChild);
    }

    // Reset the label text to original
    if (label && document.activeElement !== label) {
      label.textContent = item.dataset.rawTitle || "";
    }

    // Set number badge
    if (isBook) {
      bookCounter++;
      chapterCounter = 0;
      eventCounter = 0;
      numberBadge.textContent = numberBooks ? bookCounter : "";
    } else if (isChapter) {
      chapterCounter++;
      eventCounter = 0;
      numberBadge.textContent = numberChapters ? chapterCounter : "";
    } else if (isEvent) {
      eventCounter++;
      numberBadge.textContent = numberEvents ? eventCounter : "";
    }
  });
}

function setLabelToRaw(item) {
  const label = item.querySelector(".text") || item.querySelector(".label-text");
  if (label) {
    label.textContent = item.dataset.rawTitle;
  }
}

/* ===== EXPORT / IMPORT JSON ===== */
function getItemData(el) {
  const type = el.classList.contains("book") ? "book" :
    el.classList.contains("chapter") ? "chapter" : "event";
  let title = el.dataset.rawTitle;
  let desc = el.querySelector("textarea").value;
  let collapsed = el.classList.contains("collapsed");
  let id = el.id;
  let originalNextId = el.dataset.originalNextId || null;
  return { type, title, desc, collapsed, id, originalNextId };
}

function exportJSON() {
  const data = {
    projectName: document.getElementById("projectName").value,
    timeline: [...timeline.children].map(getItemData),
    parking: [...parking.children].map(getItemData),
    recycle: [...recycleBin.children].map(getItemData)
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "story-timeline.json";
  a.click();
}

function importJSON() {
  const inputFile = document.createElement("input");
  inputFile.type = "file";
  inputFile.accept = ".json";
  inputFile.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        document.getElementById("projectName").value = data.projectName || "";
        timeline.innerHTML = "";
        parking.innerHTML = "";
        recycleBin.innerHTML = "";
        
        data.timeline.forEach(it => {
          if (it.type === "event") {
            const w = createEventItem(it.title, it.desc, it.collapsed, it.id, it.originalNextId);
            timeline.appendChild(w);
          } else {
            timeline.appendChild(createItem(it.type, it.title, it.desc, it.collapsed, it.id, it.originalNextId));
          }
        });
        
        data.parking.forEach(it => {
          if (it.type === "event") {
            const w = createEventItem(it.title, it.desc, it.collapsed, it.id, it.originalNextId);
            parking.appendChild(w);
            // Add restore button for parked items
            const parkBtn = w.querySelector(".park");
            if (parkBtn) {
              parkBtn.textContent = "↩️";
              parkBtn.className = "restore";
              parkBtn.title = "Restore to timeline";
              parkBtn.onclick = function() { restoreFromParking(this); };
            }
          } else {
            const item = createItem(it.type, it.title, it.desc, it.collapsed, it.id, it.originalNextId);
            parking.appendChild(item);
            // Add restore button for parked items
            const parkBtn = item.querySelector(".park");
            if (parkBtn) {
              parkBtn.textContent = "↩️";
              parkBtn.className = "restore";
              parkBtn.title = "Restore to timeline";
              parkBtn.onclick = function() { restoreFromParking(this); };
            }
          }
        });
        
        data.recycle.forEach(it => {
          if (it.type === "event") {
            const w = createEventItem(it.title, it.desc, it.collapsed, it.id, it.originalNextId);
            recycleBin.appendChild(w);
          } else {
            recycleBin.appendChild(createItem(it.type, it.title, it.desc, it.collapsed, it.id, it.originalNextId));
          }
        });
        
        addRecoverButtonsToRecycle();
        [...parking.children].forEach(setLabelToRaw);
        [...recycleBin.children].forEach(setLabelToRaw);
        updateNumbering();
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };
  inputFile.click();
}

function addRecoverButtonsToRecycle() {
  [...recycleBin.children].forEach(item => {
    addRecoverButton(item);
  });
}

/* ===== EXPORT TXT ===== */
function exportTXT() {
  const projectName = document.getElementById("projectName").value;
  let text = projectName ? projectName + "\n\n" : "";
  
  [...timeline.children].forEach(item => {
    let title = item.dataset.rawTitle;
    let desc = item.querySelector("textarea").value;
    text += title + "\n" + desc + "\n\n";
  });
  
  text += "Parking Lot:\n";
  [...parking.children].forEach(item => {
    let title = item.dataset.rawTitle;
    let desc = item.querySelector("textarea").value;
    text += title + "\n" + desc + "\n\n";
  });
  
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "story-timeline.txt";
  a.click();
}

/* ===== EXPORT DOCX ===== */
function exportDOCX() {
  const {
    Document,
    Packer,
    Paragraph,
    HeadingLevel,
    AlignmentType
  } = docx;

  if (!timeline.children.length && !parking.children.length) {
    alert("Nothing to export.");
    return;
  }

  const children = [];
  const projectName = document.getElementById("projectName").value;

  /* ===== TITLE ===== */
  if (projectName) {
    children.push(
      new Paragraph({
        text: projectName.toUpperCase(),
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );
  }

  let bookIndex = 0;
  let chapterIndex = 0;

  [...timeline.children].forEach(item => {
    const title = item.dataset.rawTitle || "";
    const textarea = item.querySelector("textarea");
    const desc = textarea ? textarea.value.trim() : "";

    const isBook = item.classList.contains("book");
    const isChapter = item.classList.contains("chapter");
    const isEvent = !(isBook || isChapter);

    /* ===== BOOK ===== */
    if (isBook) {
      bookIndex++;
      chapterIndex = 0;

      children.push(
        new Paragraph({
          text: `BOOK ${bookIndex}: ${title}`,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 120 }
        })
      );

      if (desc) {
        desc.split("\n").forEach(line => {
          children.push(
            new Paragraph({
              text: line,
              indent: { left: 720 },
              spacing: { after: 80 }
            })
          );
        });
      }
    }

    /* ===== CHAPTER ===== */
    else if (isChapter) {
      chapterIndex++;

      children.push(
        new Paragraph({
          text: `Chapter ${chapterIndex}: ${title}`,
          bullet: { level: 0 },
          spacing: { before: 160, after: 60 }
        })
      );

      if (desc) {
        desc.split("\n").forEach(line => {
          children.push(
            new Paragraph({
              text: line,
              indent: { left: 1440 },
              spacing: { after: 60 }
            })
          );
        });
      }
    }

    /* ===== EVENT ===== */
    else if (isEvent) {
      children.push(
        new Paragraph({
          text: title,
          bullet: { level: 1 },
          spacing: { after: 40 }
        })
      );

      if (desc) {
        desc.split("\n").forEach(line => {
          children.push(
            new Paragraph({
              text: line,
              indent: { left: 2160 },
              spacing: { after: 40 }
            })
          );
        });
      }
    }
  });

  /* ===== PARKING LOT ===== */
  if (parking.children.length) {
    children.push(
      new Paragraph({
        text: "PARKING LOT",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 500, after: 200 }
      })
    );

    [...parking.children].forEach(item => {
      const title = item.dataset.rawTitle || "";
      const textarea = item.querySelector("textarea");
      const desc = textarea ? textarea.value.trim() : "";

      children.push(
        new Paragraph({
          text: title,
          bullet: { level: 0 }
        })
      );

      if (desc) {
        desc.split("\n").forEach(line => {
          children.push(
            new Paragraph({
              text: line,
              indent: { left: 1440 }
            })
          );
        });
      }
    });
  }

  const doc = new Document({
    sections: [{ children }]
  });

  Packer.toBlob(doc)
    .then(blob => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "story-outline.docx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    })
    .catch(err => {
      console.error("DOCX export failed:", err);
      alert("DOCX export failed — see console for details.");
    });
}