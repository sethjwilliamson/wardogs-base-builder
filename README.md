# Wardogs Base Builder

An interactive, top-down 2D base planner for **Wardogs**. Pure client-side —
HTML + CSS + vanilla JavaScript with an HTML5 Canvas. **No server, no build
step, no dependencies.**

## Run it

Just open `index.html` in any modern browser (double-click it).

> Some browsers restrict `file://` for a few features; everything here is built
> to work from `file://`. If your browser ever blocks something, serve the folder
> with any static server, e.g. `python3 -m http.server` and visit the printed URL.

## Features

- **Customizable area** — set grid width, height, and the real-world size of a
  tile (metres). Stats update live.
- **Two placement modes**
  - **Drag & drop** an item from the palette straight onto the grid.
  - **Click to arm** an item, then click on the grid to place. The tool stays
    armed so you can place many in a row.
- **Select & edit** placed objects — move by dragging, nudge with arrow keys,
  rotate, duplicate, delete.
- **Grid snapping** and **collision detection** (both toggleable). Invalid
  placements are shown in red and blocked.
- **Pan & zoom** — mouse wheel to zoom toward the cursor, drag empty space or
  use the middle/right button to pan.
- **Save / Load** to the browser (localStorage), plus **Export / Import** JSON
  files to share or back up a layout.
- **Live stats** — object count, tiles used, % coverage, real-world area.

## Controls

| Action | Input |
| --- | --- |
| Place armed item | Click on grid |
| Arm / disarm item | Click item in palette |
| Drag item in | Drag from palette to grid |
| Select object | Click it |
| Move object | Drag it, or arrow keys |
| Rotate | `R`, or toolbar / inspector button |
| Duplicate | `D` |
| Delete | `Delete` / `Backspace` |
| Zoom | Mouse wheel, `+` / `-` |
| Reset view | `0` |
| Toggle grid | `G` |
| Deselect / cancel | `Esc` |
| Pan | Drag empty space, or middle/right-drag |

## Project structure

```
index.html      markup + layout
css/styles.css  styling / theme
js/data.js      the buildable catalog (edit this to add/adjust objects)
js/app.js       canvas rendering, placement, editing, persistence
```

## Editing the buildable catalog

All placeable objects live in [`js/data.js`](js/data.js). Each entry is:

```js
{ id: "turret_mg", name: "MG Turret", cat: "Defense", w: 2, h: 2, note: "Anti-infantry" }
```

- `w` / `h` are the footprint in **tiles**. Change them to match exact in-game
  sizes and the stats, collisions, and rendering all update automatically.
- `cat` groups the item in the palette and picks its color (see
  `CATEGORY_COLORS` at the top of the file).

> **Note on data:** the object list and footprints are a structured starting
> catalog for Wardogs, organized so you can drop in the exact in-game
> dimensions as they're confirmed — just edit the numbers in `data.js`. Nothing
> else needs to change.
