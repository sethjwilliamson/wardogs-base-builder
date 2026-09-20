/*
 * Wardogs Base Builder — main application
 * Vanilla JS + Canvas. No modules, no server: open index.html directly.
 */
(function () {
  "use strict";

  var BUILDABLES = window.WARDOGS.BUILDABLES;
  var CATEGORY_COLORS = window.WARDOGS.CATEGORY_COLORS;
  var BY_ID = {};
  BUILDABLES.forEach(function (b) { BY_ID[b.id] = b; });

  var STORAGE_KEY = "wardogs-base-builder:v1";

  // ---------------------------------------------------------------- State
  var state = {
    grid: { w: 60, h: 40 },   // in tiles
    tileMeters: window.WARDOGS.TILE_METERS || 1.5,  // WARDOGS build grid is 1.5 m
    objects: [],              // { uid, id, x, y, rot }  (x,y = top-left tile, rot in {0,90,180,270})
    selectedUid: null,
    tool: null,               // buildable id currently armed for placing
    show: { grid: true, snap: true, collide: true }
  };

  var camera = { x: 0, y: 0, scale: 24 }; // scale = pixels per tile
  var uidSeq = 1;

  // Interaction bookkeeping
  var pointer = { tileX: 0, tileY: 0, px: 0, py: 0, inside: false };
  var dragging = null;   // { uid, offX, offY, snap, startX, startY } moving an existing object
  var panning = null;    // { startX, startY, camX, camY }
  var placing = null;    // { snap, count, last } active hold-to-place stroke
  var placingGhostRot = 0;

  // Undo / redo history (snapshots of the layout)
  var history = { undo: [], redo: [] };
  var HISTORY_MAX = 200;

  // ---------------------------------------------------------------- DOM
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  var stage = document.getElementById("stage");
  var paletteList = document.getElementById("paletteList");
  var els = {
    areaWidth: document.getElementById("areaWidth"),
    areaHeight: document.getElementById("areaHeight"),
    tileMeters: document.getElementById("tileMeters"),
    applyArea: document.getElementById("applyArea"),
    toggleGrid: document.getElementById("toggleGrid"),
    toggleSnap: document.getElementById("toggleSnap"),
    toggleCollide: document.getElementById("toggleCollide"),
    saveBtn: document.getElementById("saveBtn"),
    loadBtn: document.getElementById("loadBtn"),
    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    clearBtn: document.getElementById("clearBtn"),
    search: document.getElementById("search"),
    coordReadout: document.getElementById("coordReadout"),
    zoomReadout: document.getElementById("zoomReadout"),
    ghostName: document.getElementById("ghostName"),
    selectionInfo: document.getElementById("selectionInfo"),
    stats: document.getElementById("stats"),
    legend: document.getElementById("legend"),
    fileInput: document.getElementById("fileInput"),
    undoBtn: document.getElementById("undoBtn"),
    redoBtn: document.getElementById("redoBtn"),
    rotateBtn: document.getElementById("rotateBtn"),
    deleteBtn: document.getElementById("deleteBtn"),
    dupeBtn: document.getElementById("dupeBtn"),
    zoomIn: document.getElementById("zoomIn"),
    zoomOut: document.getElementById("zoomOut"),
    zoomReset: document.getElementById("zoomReset"),
    cancelTool: document.getElementById("cancelTool")
  };

  // ---------------------------------------------------------------- Helpers
  function footprint(obj) {
    var b = BY_ID[obj.id];
    if (!b) return { w: 1, h: 1 };
    // rot 90/270 swaps footprint
    if (obj.rot === 90 || obj.rot === 270) return { w: b.h, h: b.w };
    return { w: b.w, h: b.h };
  }

  function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }

  function worldToScreen(tx, ty) {
    return { x: (tx - camera.x) * camera.scale, y: (ty - camera.y) * camera.scale };
  }
  function screenToWorld(px, py) {
    return { x: px / camera.scale + camera.x, y: py / camera.scale + camera.y };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function objRect(obj) {
    var f = footprint(obj);
    return { x: obj.x, y: obj.y, w: f.w, h: f.h };
  }

  function hasCollision(obj, ignoreUid) {
    var r = objRect(obj);
    for (var i = 0; i < state.objects.length; i++) {
      var o = state.objects[i];
      if (o.uid === ignoreUid) continue;
      if (rectsOverlap(r, objRect(o))) return true;
    }
    return false;
  }

  function inBounds(obj) {
    var r = objRect(obj);
    return r.x >= 0 && r.y >= 0 && r.x + r.w <= state.grid.w && r.y + r.h <= state.grid.h;
  }

  function findObjectAt(tx, ty) {
    // topmost (last drawn) first
    for (var i = state.objects.length - 1; i >= 0; i--) {
      var r = objRect(state.objects[i]);
      if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return state.objects[i];
    }
    return null;
  }

  function getSelected() {
    if (state.selectedUid == null) return null;
    for (var i = 0; i < state.objects.length; i++)
      if (state.objects[i].uid === state.selectedUid) return state.objects[i];
    return null;
  }

  // ---------------------------------------------------------------- Canvas sizing
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var rect = stage.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function viewSize() {
    var rect = stage.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  function centerView() {
    var vs = viewSize();
    // fit grid with padding
    var pad = 40;
    var sx = (vs.w - pad * 2) / state.grid.w;
    var sy = (vs.h - pad * 2) / state.grid.h;
    camera.scale = clamp(Math.min(sx, sy), 4, 120);
    camera.x = state.grid.w / 2 - vs.w / (2 * camera.scale);
    camera.y = state.grid.h / 2 - vs.h / (2 * camera.scale);
    draw();
    updateHud();
  }

  // ---------------------------------------------------------------- Drawing
  function draw() {
    var vs = viewSize();
    ctx.clearRect(0, 0, vs.w, vs.h);

    // playfield background
    var tl = worldToScreen(0, 0);
    var br = worldToScreen(state.grid.w, state.grid.h);
    ctx.fillStyle = "#0c1014";
    ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

    // grid
    if (state.show.grid) drawGrid(tl, br);

    // border
    ctx.strokeStyle = "#3a4657";
    ctx.lineWidth = 2;
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

    // objects
    for (var i = 0; i < state.objects.length; i++) {
      drawObject(state.objects[i], state.objects[i].uid === state.selectedUid);
    }

    // placement ghost
    if (state.tool && pointer.inside && !dragging) drawGhost();

    updateHud();
  }

  function drawGrid(tl, br) {
    var step = camera.scale;
    if (step < 6) return; // too dense to be useful
    ctx.lineWidth = 1;
    var i;
    for (i = 0; i <= state.grid.w; i++) {
      var x = tl.x + i * step + 0.5;
      ctx.strokeStyle = (i % 10 === 0) ? "#243040" : "#18202b";
      ctx.beginPath();
      ctx.moveTo(x, tl.y);
      ctx.lineTo(x, br.y);
      ctx.stroke();
    }
    for (i = 0; i <= state.grid.h; i++) {
      var y = tl.y + i * step + 0.5;
      ctx.strokeStyle = (i % 10 === 0) ? "#243040" : "#18202b";
      ctx.beginPath();
      ctx.moveTo(tl.x, y);
      ctx.lineTo(br.x, y);
      ctx.stroke();
    }
  }

  function drawObject(obj, selected) {
    var b = BY_ID[obj.id];
    if (!b) return;
    var f = footprint(obj);
    var p = worldToScreen(obj.x, obj.y);
    var w = f.w * camera.scale;
    var h = f.h * camera.scale;

    ctx.fillStyle = b.color;
    ctx.globalAlpha = 0.9;
    roundRect(p.x + 1, p.y + 1, w - 2, h - 2, Math.min(6, camera.scale / 4));
    ctx.fill();
    ctx.globalAlpha = 1;

    // inner outline
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    roundRect(p.x + 1, p.y + 1, w - 2, h - 2, Math.min(6, camera.scale / 4));
    ctx.stroke();

    // orientation notch
    drawNotch(p.x, p.y, w, h, obj.rot);

    // label if room
    if (w > 46 && h > 20) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var label = fitText(b.name, w - 8);
      ctx.fillText(label, p.x + w / 2, p.y + h / 2);
    }

    if (selected) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(p.x, p.y, w, h);
      ctx.setLineDash([]);
    }
  }

  function drawNotch(x, y, w, h, rot) {
    var s = Math.max(3, Math.min(w, h) * 0.12);
    var cx, cy;
    switch (rot) {
      case 90:  cx = x + w - s * 1.4; cy = y + h / 2; break;
      case 180: cx = x + w / 2;       cy = y + h - s * 1.4; break;
      case 270: cx = x + s * 1.4;     cy = y + h / 2; break;
      default:  cx = x + w / 2;       cy = y + s * 1.4; break; // 0 = up
    }
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGhost() {
    var b = BY_ID[state.tool];
    if (!b) return;
    var f = (placingGhostRot === 90 || placingGhostRot === 270) ? { w: b.h, h: b.w } : { w: b.w, h: b.h };
    var pos = snappedPlacePos(f);
    var p = worldToScreen(pos.x, pos.y);
    var w = f.w * camera.scale;
    var h = f.h * camera.scale;

    var testObj = { id: b.id, x: pos.x, y: pos.y, rot: placingGhostRot };
    var bad = (state.show.collide && hasCollision(testObj, null)) || !inBounds(testObj);

    ctx.globalAlpha = 0.45;
    ctx.fillStyle = bad ? "#e5484d" : b.color;
    ctx.fillRect(p.x, p.y, w, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = bad ? "#ff6b6b" : "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, w, h);
    drawNotch(p.x, p.y, w, h, placingGhostRot);
  }

  // Where a ghost/new object would land, centered under the cursor, snapped + clamped.
  function snappedPlacePos(f) {
    var wx = pointer.tileX - f.w / 2;
    var wy = pointer.tileY - f.h / 2;
    if (state.show.snap) { wx = Math.round(wx); wy = Math.round(wy); }
    wx = clamp(wx, 0, state.grid.w - f.w);
    wy = clamp(wy, 0, state.grid.h - f.h);
    return { x: wx, y: wy };
  }

  function roundRect(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fitText(text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    var t = text;
    while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
    return t + "…";
  }

  // ---------------------------------------------------------------- HUD / panels
  function updateHud() {
    els.coordReadout.textContent = pointer.inside
      ? "x " + Math.floor(pointer.tileX) + "  y " + Math.floor(pointer.tileY)
      : "–";
    els.zoomReadout.textContent = Math.round((camera.scale / 24) * 100) + "%";
    if (state.tool) {
      var b = BY_ID[state.tool];
      els.ghostName.style.display = "block";
      els.ghostName.textContent = "Placing: " + b.name + "  (R to rotate)";
    } else {
      els.ghostName.style.display = "none";
    }
  }

  function renderStats() {
    var used = 0;
    var totalCost = 0;
    state.objects.forEach(function (o) {
      var f = footprint(o);
      used += f.w * f.h;
      var b = BY_ID[o.id];
      if (b && b.cost != null) totalCost += b.cost;
    });
    var total = state.grid.w * state.grid.h;
    var m = state.tileMeters;
    var rows = [
      ["Grid", state.grid.w + " × " + state.grid.h + " tiles"],
      ["Real size", (state.grid.w * m) + " × " + (state.grid.h * m) + " m"],
      ["Objects", String(state.objects.length)],
      ["Total cost", totalCost.toLocaleString() + " supply"],
      ["Tiles used", used + " / " + total + " (" + Math.round((used / total) * 100) + "%)"],
      ["Area used", (used * m * m).toLocaleString() + " m²"]
    ];
    els.stats.innerHTML = rows.map(function (r) {
      return "<li><span>" + r[0] + "</span><span>" + r[1] + "</span></li>";
    }).join("");
  }

  function renderSelection() {
    var sel = getSelected();
    if (!sel) {
      els.selectionInfo.className = "selection-info muted";
      els.selectionInfo.textContent = "Nothing selected.";
      syncToolbar();
      return;
    }
    var b = BY_ID[sel.id];
    var f = footprint(sel);
    els.selectionInfo.className = "selection-info";
    els.selectionInfo.innerHTML =
      row("Name", b.name) +
      row("Category", b.cat) +
      row("Footprint", f.w + " × " + f.h + " tiles") +
      row("Real size", (b.mW || b.w) + " × " + (b.mD || b.h) + " m") +
      (b.cost != null ? row("Build cost", b.cost + " supply") : "") +
      (b.hp != null ? row("Health", b.hp.toLocaleString() + " HP") : "") +
      row("Position", "x " + sel.x + ", y " + sel.y) +
      row("Rotation", sel.rot + "°") +
      '<div class="sel-actions">' +
        '<button class="btn ghost" data-act="rotate">Rotate</button>' +
        '<button class="btn ghost" data-act="dupe">Duplicate</button>' +
        '<button class="btn danger" data-act="delete">Delete</button>' +
      '</div>';
    els.selectionInfo.querySelectorAll("[data-act]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var a = btn.getAttribute("data-act");
        if (a === "rotate") rotateSelected();
        else if (a === "dupe") duplicateSelected();
        else if (a === "delete") deleteSelected();
      });
    });
    syncToolbar();
  }
  function row(k, v) {
    return '<div class="row"><span>' + k + "</span><span>" + v + "</span></div>";
  }

  function syncToolbar() {
    var has = !!getSelected();
    els.rotateBtn.disabled = !has;
    els.deleteBtn.disabled = !has;
    els.dupeBtn.disabled = !has;
  }

  function renderLegend() {
    els.legend.innerHTML = Object.keys(CATEGORY_COLORS).map(function (c) {
      return '<li><span class="dot" style="background:' + CATEGORY_COLORS[c] + '"></span>' + c + "</li>";
    }).join("");
  }

  // ---------------------------------------------------------------- Palette
  function renderPalette(filter) {
    filter = (filter || "").trim().toLowerCase();
    var groups = {};
    BUILDABLES.forEach(function (b) {
      if (filter && b.name.toLowerCase().indexOf(filter) === -1 &&
          b.cat.toLowerCase().indexOf(filter) === -1) return;
      (groups[b.cat] = groups[b.cat] || []).push(b);
    });

    var html = "";
    Object.keys(groups).forEach(function (cat) {
      html += '<div class="cat-title">' + cat + "</div>";
      groups[cat].forEach(function (b) {
        html +=
          '<div class="item" draggable="true" data-id="' + b.id + '" title="' + (b.note || b.name) + '">' +
            '<span class="swatch" style="background:' + b.color + '"></span>' +
            '<div class="item-meta">' +
              '<div class="item-name">' + b.name + "</div>" +
              '<div class="item-size">' + b.w + "×" + b.h + " tiles · " +
                (b.mW || b.w) + "×" + (b.mD || b.h) + " m" +
                (b.cost != null ? " · " + b.cost + " supply" : "") +
              "</div>" +
            "</div>" +
          "</div>";
      });
    });
    if (!html) html = '<p class="palette-note">No matches.</p>';
    paletteList.innerHTML = html;

    paletteList.querySelectorAll(".item").forEach(function (item) {
      var id = item.getAttribute("data-id");
      item.addEventListener("click", function () { armTool(id); });
      item.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.effectAllowed = "copy";
      });
    });
    highlightActiveTool();
  }

  function armTool(id) {
    state.tool = (state.tool === id) ? null : id;
    placingGhostRot = 0;
    state.selectedUid = null;
    highlightActiveTool();
    renderSelection();
    draw();
  }

  function highlightActiveTool() {
    paletteList.querySelectorAll(".item").forEach(function (item) {
      item.classList.toggle("active", item.getAttribute("data-id") === state.tool);
    });
  }

  // ---------------------------------------------------------------- History
  function snapshot() {
    return {
      grid: { w: state.grid.w, h: state.grid.h },
      tileMeters: state.tileMeters,
      selectedUid: state.selectedUid,
      objects: state.objects.map(function (o) {
        return { uid: o.uid, id: o.id, cat: o.cat, x: o.x, y: o.y, rot: o.rot };
      })
    };
  }

  // Record the state BEFORE a mutation so it can be undone.
  function commit(snap) {
    history.undo.push(snap);
    if (history.undo.length > HISTORY_MAX) history.undo.shift();
    history.redo.length = 0;
    updateHistoryButtons();
  }

  function applySnapshot(s) {
    state.grid = { w: s.grid.w, h: s.grid.h };
    state.tileMeters = s.tileMeters;
    state.objects = s.objects.map(function (o) {
      if (o.uid >= uidSeq) uidSeq = o.uid + 1;
      return { uid: o.uid, id: o.id, cat: o.cat, x: o.x, y: o.y, rot: o.rot };
    });
    var stillExists = state.objects.some(function (o) { return o.uid === s.selectedUid; });
    state.selectedUid = stillExists ? s.selectedUid : null;
    els.areaWidth.value = state.grid.w;
    els.areaHeight.value = state.grid.h;
    els.tileMeters.value = state.tileMeters;
    afterChange();
  }

  function undo() {
    if (!history.undo.length) return;
    history.redo.push(snapshot());
    applySnapshot(history.undo.pop());
    updateHistoryButtons();
  }

  function redo() {
    if (!history.redo.length) return;
    history.undo.push(snapshot());
    applySnapshot(history.redo.pop());
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    if (els.undoBtn) els.undoBtn.disabled = history.undo.length === 0;
    if (els.redoBtn) els.redoBtn.disabled = history.redo.length === 0;
  }

  // ---------------------------------------------------------------- Actions
  // Pure mutation: validates and adds an object. History is handled by callers.
  function placeObject(id, x, y, rot) {
    var b = BY_ID[id];
    if (!b) return null;
    var obj = { uid: uidSeq++, id: id, cat: b.cat, x: x, y: y, rot: rot || 0 };
    if (!inBounds(obj)) return null;
    if (state.show.collide && hasCollision(obj, null)) return null;
    state.objects.push(obj);
    afterChange();
    return obj;
  }

  function rotateSelected() {
    var sel = getSelected();
    if (!sel) return;
    var snap = snapshot();
    var prev = sel.rot;
    sel.rot = (sel.rot + 90) % 360;
    // keep inside bounds after footprint swap
    var f = footprint(sel);
    sel.x = clamp(sel.x, 0, state.grid.w - f.w);
    sel.y = clamp(sel.y, 0, state.grid.h - f.h);
    if (state.show.collide && hasCollision(sel, sel.uid)) sel.rot = prev; // revert if it now overlaps
    if (sel.rot !== prev || snap.objects.some(function (o) {
      return o.uid === sel.uid && (o.x !== sel.x || o.y !== sel.y);
    })) commit(snap);
    afterChange();
  }

  function duplicateSelected() {
    var sel = getSelected();
    if (!sel) return;
    var f = footprint(sel);
    // try to place a copy just to the right, else search nearby
    var spots = [[f.w, 0], [0, f.h], [-f.w, 0], [0, -f.h], [f.w, f.h]];
    for (var i = 0; i < spots.length; i++) {
      var nx = clamp(sel.x + spots[i][0], 0, state.grid.w - f.w);
      var ny = clamp(sel.y + spots[i][1], 0, state.grid.h - f.h);
      var candidate = { uid: -1, id: sel.id, cat: sel.cat, x: nx, y: ny, rot: sel.rot };
      if (inBounds(candidate) && !(state.show.collide && hasCollision(candidate, null))) {
        commit(snapshot());
        candidate.uid = uidSeq++;
        state.objects.push(candidate);
        state.selectedUid = candidate.uid;
        afterChange();
        return;
      }
    }
  }

  function deleteSelected() {
    if (state.selectedUid == null) return;
    commit(snapshot());
    state.objects = state.objects.filter(function (o) { return o.uid !== state.selectedUid; });
    state.selectedUid = null;
    afterChange();
  }

  function afterChange() {
    renderStats();
    renderSelection();
    draw();
  }

  // Place at the current cursor cell during a hold-to-place stroke.
  // Skips the cell we last placed on so a stationary hold doesn't retry endlessly.
  function tryStrokePlace() {
    if (!placing || !state.tool) return;
    var b = BY_ID[state.tool];
    var f = (placingGhostRot === 90 || placingGhostRot === 270) ? { w: b.h, h: b.w } : { w: b.w, h: b.h };
    var pos = snappedPlacePos(f);
    if (placing.last && placing.last.x === pos.x && placing.last.y === pos.y &&
        placing.last.rot === placingGhostRot) return;
    var placed = placeObject(state.tool, pos.x, pos.y, placingGhostRot);
    if (placed) {
      placing.count++;
      placing.last = { x: pos.x, y: pos.y, rot: placingGhostRot };
    }
  }

  // ---------------------------------------------------------------- Pointer events
  function updatePointer(e) {
    var rect = canvas.getBoundingClientRect();
    pointer.px = e.clientX - rect.left;
    pointer.py = e.clientY - rect.top;
    var w = screenToWorld(pointer.px, pointer.py);
    pointer.tileX = w.x;
    pointer.tileY = w.y;
    pointer.inside = pointer.px >= 0 && pointer.py >= 0 && pointer.px <= rect.width && pointer.py <= rect.height;
  }

  canvas.addEventListener("mousemove", function (e) {
    updatePointer(e);

    if (placing) {
      tryStrokePlace();
      draw();
      return;
    }

    if (panning) {
      camera.x = panning.camX - (e.clientX - panning.startX) / camera.scale;
      camera.y = panning.camY - (e.clientY - panning.startY) / camera.scale;
      draw();
      return;
    }

    if (dragging) {
      var obj = getSelected();
      if (obj) {
        var f = footprint(obj);
        var nx = pointer.tileX - dragging.offX;
        var ny = pointer.tileY - dragging.offY;
        if (state.show.snap) { nx = Math.round(nx); ny = Math.round(ny); }
        nx = clamp(nx, 0, state.grid.w - f.w);
        ny = clamp(ny, 0, state.grid.h - f.h);
        obj.x = nx; obj.y = ny;
        draw();
      }
      return;
    }

    draw();
  });

  canvas.addEventListener("mousedown", function (e) {
    updatePointer(e);

    // middle button or space-less right button => pan; also pan with left on empty when no tool
    if (e.button === 1 || e.button === 2) {
      panning = { startX: e.clientX, startY: e.clientY, camX: camera.x, camY: camera.y };
      e.preventDefault();
      return;
    }

    // placing mode: start a hold-to-place stroke (one undo step for the whole stroke)
    if (state.tool) {
      placing = { snap: snapshot(), count: 0, last: null };
      tryStrokePlace();
      draw();
      return;
    }

    // select / start moving existing object
    var hit = findObjectAt(Math.floor(pointer.tileX), Math.floor(pointer.tileY));
    if (hit) {
      state.selectedUid = hit.uid;
      dragging = { uid: hit.uid, offX: pointer.tileX - hit.x, offY: pointer.tileY - hit.y,
                   snap: snapshot(), startX: hit.x, startY: hit.y };
      renderSelection();
      draw();
    } else {
      // empty click: deselect, or start panning with left-drag
      state.selectedUid = null;
      panning = { startX: e.clientX, startY: e.clientY, camX: camera.x, camY: camera.y };
      renderSelection();
      draw();
    }
  });

  window.addEventListener("mouseup", function () {
    if (placing) {
      if (placing.count > 0) commit(placing.snap);
      placing = null;
    }
    if (dragging) {
      var obj = getSelected();
      if (obj && (obj.x !== dragging.startX || obj.y !== dragging.startY)) {
        commit(dragging.snap);
      }
      dragging = null;
      afterChange();
    }
    panning = null;
  });

  canvas.addEventListener("mouseleave", function () {
    pointer.inside = false;
    draw();
  });

  // wheel zoom (toward cursor)
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    updatePointer(e);
    var before = screenToWorld(pointer.px, pointer.py);
    var factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    camera.scale = clamp(camera.scale * factor, 4, 120);
    var after = screenToWorld(pointer.px, pointer.py);
    camera.x += before.x - after.x;
    camera.y += before.y - after.y;
    draw();
  }, { passive: false });

  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  // ---------------------------------------------------------------- Drag & drop from palette
  stage.addEventListener("dragover", function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    updatePointer(e);
    // preview: arm ghost temporarily
    draw();
  });
  stage.addEventListener("drop", function (e) {
    e.preventDefault();
    var id = e.dataTransfer.getData("text/plain");
    if (!id || !BY_ID[id]) return;
    updatePointer(e);
    var b = BY_ID[id];
    var f = { w: b.w, h: b.h };
    var pos = snappedPlacePos(f);
    var snap = snapshot();
    var placed = placeObject(id, pos.x, pos.y, 0);
    if (placed) { commit(snap); state.selectedUid = placed.uid; afterChange(); }
  });

  // ---------------------------------------------------------------- Keyboard
  window.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    // Undo / redo (Ctrl+Z / Ctrl+Y, or Cmd+Z / Cmd+Shift+Z / Cmd+Y on macOS)
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      var k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { undo(); e.preventDefault(); return; }
      if (k === "y" || (k === "z" && e.shiftKey)) { redo(); e.preventDefault(); return; }
    }

    switch (e.key) {
      case "r": case "R":
        if (state.tool) { placingGhostRot = (placingGhostRot + 90) % 360; draw(); }
        else rotateSelected();
        break;
      case "Delete": case "Backspace":
        deleteSelected(); e.preventDefault(); break;
      case "d": case "D":
        duplicateSelected(); break;
      case "Escape":
        state.tool = null; state.selectedUid = null;
        highlightActiveTool(); renderSelection(); draw(); break;
      case "+": case "=":
        camera.scale = clamp(camera.scale * 1.12, 4, 120); draw(); break;
      case "-": case "_":
        camera.scale = clamp(camera.scale / 1.12, 4, 120); draw(); break;
      case "0":
        centerView(); break;
      case "g": case "G":
        toggle("grid"); break;
    }
  });

  // arrow-nudge selected object
  window.addEventListener("keydown", function (e) {
    var sel = getSelected();
    if (!sel) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    var dx = 0, dy = 0;
    if (e.key === "ArrowLeft") dx = -1;
    else if (e.key === "ArrowRight") dx = 1;
    else if (e.key === "ArrowUp") dy = -1;
    else if (e.key === "ArrowDown") dy = 1;
    else return;
    e.preventDefault();
    var f = footprint(sel);
    var px = sel.x, py = sel.y;
    var snap = snapshot();
    sel.x = clamp(sel.x + dx, 0, state.grid.w - f.w);
    sel.y = clamp(sel.y + dy, 0, state.grid.h - f.h);
    if (state.show.collide && hasCollision(sel, sel.uid)) { sel.x = px; sel.y = py; }
    if (sel.x !== px || sel.y !== py) commit(snap);
    afterChange();
  });

  // ---------------------------------------------------------------- Toggles / area
  function toggle(key) {
    state.show[key] = !state.show[key];
    var map = { grid: els.toggleGrid, snap: els.toggleSnap, collide: els.toggleCollide };
    map[key].setAttribute("aria-pressed", String(state.show[key]));
    draw();
  }
  els.toggleGrid.addEventListener("click", function () { toggle("grid"); });
  els.toggleSnap.addEventListener("click", function () { toggle("snap"); });
  els.toggleCollide.addEventListener("click", function () { toggle("collide"); });

  els.applyArea.addEventListener("click", function () {
    var w = clamp(parseInt(els.areaWidth.value, 10) || 60, 8, 400);
    var h = clamp(parseInt(els.areaHeight.value, 10) || 40, 8, 400);
    var m = clamp(parseFloat(els.tileMeters.value) || 1, 0.25, 10);
    if (w === state.grid.w && h === state.grid.h && m === state.tileMeters) return;
    commit(snapshot());
    state.grid.w = w; state.grid.h = h; state.tileMeters = m;
    els.areaWidth.value = w; els.areaHeight.value = h; els.tileMeters.value = m;
    // drop objects now out of bounds
    state.objects = state.objects.filter(inBounds);
    if (!getSelected()) state.selectedUid = null;
    centerView();
    afterChange();
  });

  // ---------------------------------------------------------------- Toolbar buttons
  if (els.undoBtn) els.undoBtn.addEventListener("click", undo);
  if (els.redoBtn) els.redoBtn.addEventListener("click", redo);
  els.rotateBtn.addEventListener("click", rotateSelected);
  els.deleteBtn.addEventListener("click", deleteSelected);
  els.dupeBtn.addEventListener("click", duplicateSelected);
  els.zoomIn.addEventListener("click", function () { camera.scale = clamp(camera.scale * 1.12, 4, 120); draw(); });
  els.zoomOut.addEventListener("click", function () { camera.scale = clamp(camera.scale / 1.12, 4, 120); draw(); });
  els.zoomReset.addEventListener("click", centerView);
  els.cancelTool.addEventListener("click", function () {
    state.tool = null; state.selectedUid = null;
    highlightActiveTool(); renderSelection(); draw();
  });

  // ---------------------------------------------------------------- Persistence
  function serialize() {
    return {
      version: 1,
      grid: state.grid,
      tileMeters: state.tileMeters,
      objects: state.objects.map(function (o) {
        return { id: o.id, x: o.x, y: o.y, rot: o.rot };
      })
    };
  }

  function loadData(data, record) {
    if (!data || !data.grid) return false;
    if (record) commit(snapshot());
    state.grid = { w: data.grid.w, h: data.grid.h };
    state.tileMeters = data.tileMeters || 1;
    state.objects = [];
    (data.objects || []).forEach(function (o) {
      if (!BY_ID[o.id]) return;
      state.objects.push({ uid: uidSeq++, id: o.id, cat: BY_ID[o.id].cat, x: o.x, y: o.y, rot: o.rot || 0 });
    });
    state.selectedUid = null;
    els.areaWidth.value = state.grid.w;
    els.areaHeight.value = state.grid.h;
    els.tileMeters.value = state.tileMeters;
    centerView();
    afterChange();
    return true;
  }

  els.saveBtn.addEventListener("click", function () {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()));
      flash(els.saveBtn, "Saved");
    } catch (err) { alert("Could not save: " + err.message); }
  });

  els.loadBtn.addEventListener("click", function () {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { flash(els.loadBtn, "Empty"); return; }
      loadData(JSON.parse(raw), true);
      flash(els.loadBtn, "Loaded");
    } catch (err) { alert("Could not load: " + err.message); }
  });

  els.exportBtn.addEventListener("click", function () {
    var blob = new Blob([JSON.stringify(serialize(), null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "wardogs-base-" + Date.now() + ".json";
    a.click();
    URL.revokeObjectURL(url);
  });

  els.importBtn.addEventListener("click", function () { els.fileInput.click(); });
  els.fileInput.addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try { loadData(JSON.parse(reader.result), true); }
      catch (err) { alert("Invalid file: " + err.message); }
    };
    reader.readAsText(file);
    els.fileInput.value = "";
  });

  els.clearBtn.addEventListener("click", function () {
    if (!state.objects.length) return;
    if (confirm("Remove all placed objects?")) {
      commit(snapshot());
      state.objects = [];
      state.selectedUid = null;
      afterChange();
    }
  });

  function flash(btn, text) {
    var old = btn.textContent;
    btn.textContent = text;
    setTimeout(function () { btn.textContent = old; }, 900);
  }

  els.search.addEventListener("input", function () { renderPalette(els.search.value); });

  // ---------------------------------------------------------------- Boot
  function init() {
    els.areaWidth.value = state.grid.w;
    els.areaHeight.value = state.grid.h;
    els.tileMeters.value = state.tileMeters;
    renderPalette("");
    renderLegend();
    renderStats();
    renderSelection();
    updateHistoryButtons();
    resize();
    centerView();

    // try to restore last session silently (not recorded in history)
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) loadData(JSON.parse(raw), false);
    } catch (e) { /* ignore */ }
  }

  window.addEventListener("resize", resize);
  init();
})();
