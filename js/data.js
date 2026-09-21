/*
 * WARDOGS buildable catalog — REAL in-game data
 * ---------------------------------------------
 * Sourced from the live WARDOGS buildable definitions (footprints taken from
 * each object's in-game collision box). The game's build grid is 1.5 m, so tile
 * footprints below are the metre dimensions divided by 1.5 and rounded.
 *
 * Each entry:
 *   id     stable in-game id
 *   name   in-game display name
 *   cat    palette category (Command / Hesco / Bunkers / Barriers / Recon /
 *          Defences / Support)
 *   w, h   footprint in TILES (1 tile = 1.5 m)
 *   mW, mD footprint in METRES (width × depth), from the collision box
 *   cost   build supply cost
 *   hp     structure health
 *   color  fill on the grid (from the category, see CATEGORY_COLORS)
 *
 * TILE_METERS is the real-world size of one tile; the app defaults to it.
 */

var TILE_METERS = 1.5;

var CATEGORY_COLORS = {
  "Command":  "#4ea1ff",
  "Hesco":    "#d9a441",
  "Bunkers":  "#8b98a9",
  "Barriers": "#c07a3c",
  "Recon":    "#56c5d0",
  "Defences": "#e5484d",
  "Support":  "#ff7a29"
};

var BUILDABLES = [
  // ---- Command ----
  { id: "fob",           name: "Forward Operating Base", cat: "Command",  w: 3, h: 3, mW: 4.07, mD: 4.0,  cost: 30,   hp: 15000, note: "Core structure — raised-floor platform is ~3×3 Hesco" },

  // ---- Hesco ----
  { id: "hblock",        name: "Hesco Block (Small)",    cat: "Hesco",    w: 1, h: 1, mW: 1.5,  mD: 1.5,  cost: 13,   hp: 1600 },
  { id: "tallhblock",    name: "Hesco Block (Large)",    cat: "Hesco",    w: 1, h: 1, mW: 1.5,  mD: 1.5,  cost: 19,   hp: 2250 },
  { id: "hblockquadwall",name: "Hesco Wall",             cat: "Hesco",    w: 1, h: 4, mW: 1.5,  mD: 6.0,  cost: 61,   hp: 4600 },
  { id: "gate",          name: "Gate",                   cat: "Hesco",    w: 1, h: 4, mW: 1.5,  mD: 6.0,  cost: 69,   hp: 5320, note: "Vehicle passage" },
  { id: "door",          name: "Door",                   cat: "Hesco",    w: 1, h: 1, mW: 1.5,  mD: 1.5,  cost: 19,   hp: 500 },

  // ---- Bunkers ----
  { id: "bunker",        name: "Bunker",                 cat: "Bunkers",  w: 4, h: 4, mW: 6.0,  mD: 6.0,  cost: 81,   hp: 5000, note: "Garrison structure" },
  { id: "airraidshelter",name: "Indirect Fire Shelter",  cat: "Bunkers",  w: 5, h: 5, mW: 7.5,  mD: 7.5,  cost: 81,   hp: 5000, note: "Cover from indirect fire" },

  // ---- Barriers ----
  { id: "sandbagwall",   name: "Sandbag Wall",           cat: "Barriers", w: 2, h: 1, mW: 3.0,  mD: 0.34, cost: 13,   hp: 735 },
  { id: "bremmerwall",   name: "Bremer Wall",            cat: "Barriers", w: 1, h: 1, mW: 1.5,  mD: 1.5,  cost: 13,   hp: 6500 },
  { id: "barbedwire",    name: "Barbed Wire",            cat: "Barriers", w: 1, h: 2, mW: 1.5,  mD: 3.0,  cost: 7,    hp: 250 },
  { id: "tanktrap",      name: "Hedgehog",               cat: "Barriers", w: 1, h: 1, mW: 2.2,  mD: 2.2,  cost: 19,   hp: 4500, note: "Anti-vehicle" },

  // ---- Recon ----
  { id: "camonettent",   name: "Recon Tent",             cat: "Recon",    w: 2, h: 3, mW: 2.32, mD: 4.18, cost: 5,    hp: 300 },
  { id: "crowsnest",     name: "Recon Tower",            cat: "Recon",    w: 4, h: 4, mW: 6.0,  mD: 6.0,  cost: 81,   hp: 5000, note: "Elevated observation" },

  // ---- Defences ----
  { id: "l81-mortar",    name: "L81 Mortar",             cat: "Defences", w: 3, h: 3, mW: 4.5,  mD: 4.5,  cost: 121,  hp: 3000, note: "Indirect fire" },
  { id: "stingray",      name: "Stingray",               cat: "Defences", w: 3, h: 3, mW: 4.5,  mD: 4.5,  cost: 121,  hp: 3000 },
  { id: "talon-sam",     name: "Talon 9K-SAM",           cat: "Defences", w: 2, h: 2, mW: 3.0,  mD: 3.0,  cost: 801,  hp: 3000, note: "Anti-air (SAM)" },
  { id: "vanguard-ciws", name: "Vanguard CIWS",          cat: "Defences", w: 4, h: 4, mW: 6.0,  mD: 6.0,  cost: 1201, hp: 5000, note: "Anti-air / point defence" },

  // ---- Support ----
  { id: "radio",         name: "Builder's Radio",        cat: "Support",  w: 1, h: 2, mW: 1.5,  mD: 3.0,  cost: 17,   hp: 1000, note: "Enables nearby building" },
  { id: "loudspeaker",   name: "Loudspeaker",            cat: "Support",  w: 2, h: 2, mW: 3.0,  mD: 3.0,  cost: 81,   hp: 1000 },
  { id: "refuelstation", name: "Refuel Station",         cat: "Support",  w: 2, h: 2, mW: 3.01, mD: 3.0,  cost: 161,  hp: 1600, note: "Refuels vehicles" },
  { id: "repairstation", name: "Repair Station",         cat: "Support",  w: 2, h: 2, mW: 3.0,  mD: 3.0,  cost: 161,  hp: 1600, note: "Repairs vehicles" },
  { id: "drillrig",      name: "Drill Rig",              cat: "Support",  w: 3, h: 4, mW: 4.5,  mD: 6.0,  cost: 1801, hp: 2500, note: "Resource extraction" }
];

// Attach category color to each buildable.
BUILDABLES.forEach(function (b) {
  b.color = b.color || CATEGORY_COLORS[b.cat] || "#7d8896";
});

// Expose globally (no modules, so the app works from file://).
window.WARDOGS = {
  BUILDABLES: BUILDABLES,
  CATEGORY_COLORS: CATEGORY_COLORS,
  TILE_METERS: TILE_METERS
};
