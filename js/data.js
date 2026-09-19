/*
 * Wardogs buildable catalog
 * -------------------------
 * Each entry describes a placeable object.
 *
 *   id     unique key (stable, used in save files)
 *   name   display name
 *   cat    category (used for grouping + legend colors)
 *   w, h   footprint in TILES (see tileMeters in the app for real-world scale)
 *   color  fill color on the grid
 *   note   optional short description
 *
 * Sizes are expressed in whole tiles for clean grid snapping. If you have exact
 * in-game dimensions, edit w/h here and everything (stats, collisions, rendering)
 * updates automatically. Categories drive the legend colors below.
 */

const CATEGORY_COLORS = {
  "Command":    "#4ea1ff",
  "Defense":    "#e5484d",
  "Walls":      "#8b98a9",
  "Production":  "#f2c94c",
  "Resource":   "#3fb950",
  "Storage":    "#b06ad6",
  "Support":    "#ff7a29",
  "Vehicles":   "#56c5d0",
  "Decor":      "#7d8896"
};

const BUILDABLES = [
  // ---- Command ----
  { id: "command_center", name: "Command Center", cat: "Command", w: 6, h: 6, note: "Core HQ structure" },
  { id: "radar_tower",    name: "Radar Tower",    cat: "Command", w: 3, h: 3, note: "Reveals the map" },
  { id: "comms_relay",    name: "Comms Relay",    cat: "Command", w: 2, h: 2 },

  // ---- Defense ----
  { id: "turret_mg",      name: "MG Turret",      cat: "Defense", w: 2, h: 2, note: "Anti-infantry" },
  { id: "turret_cannon",  name: "Cannon Turret",  cat: "Defense", w: 3, h: 3, note: "Anti-vehicle" },
  { id: "turret_aa",      name: "AA Turret",      cat: "Defense", w: 3, h: 3, note: "Anti-air" },
  { id: "mortar_pit",     name: "Mortar Pit",     cat: "Defense", w: 3, h: 3, note: "Splash / long range" },
  { id: "tesla_coil",     name: "Shock Tower",    cat: "Defense", w: 2, h: 2 },
  { id: "bunker",         name: "Bunker",         cat: "Defense", w: 4, h: 4, note: "Garrison troops" },
  { id: "mine_field",     name: "Mine Field",     cat: "Defense", w: 2, h: 2 },

  // ---- Walls ----
  { id: "wall",           name: "Wall Segment",   cat: "Walls",   w: 1, h: 1 },
  { id: "wall_corner",    name: "Wall Corner",    cat: "Walls",   w: 1, h: 1 },
  { id: "gate",           name: "Gate",           cat: "Walls",   w: 3, h: 1, note: "Vehicle passage" },
  { id: "barricade",      name: "Barricade",      cat: "Walls",   w: 2, h: 1 },
  { id: "dragon_teeth",   name: "Tank Traps",     cat: "Walls",   w: 2, h: 2 },

  // ---- Production ----
  { id: "barracks",       name: "Barracks",       cat: "Production", w: 5, h: 4, note: "Train infantry" },
  { id: "war_factory",    name: "War Factory",    cat: "Production", w: 6, h: 5, note: "Build vehicles" },
  { id: "airfield",       name: "Airfield",       cat: "Production", w: 8, h: 5, note: "Build aircraft" },
  { id: "workshop",       name: "Workshop",       cat: "Production", w: 4, h: 4, note: "Repairs & upgrades" },
  { id: "research_lab",   name: "Research Lab",   cat: "Production", w: 5, h: 5 },

  // ---- Resource ----
  { id: "fuel_refinery",  name: "Fuel Refinery",  cat: "Resource", w: 5, h: 5, note: "Processes fuel" },
  { id: "ore_drill",      name: "Ore Drill",      cat: "Resource", w: 3, h: 3, note: "Extracts ore" },
  { id: "power_plant",    name: "Power Plant",    cat: "Resource", w: 4, h: 4, note: "Supplies power" },
  { id: "solar_array",    name: "Solar Array",    cat: "Resource", w: 4, h: 2 },
  { id: "water_pump",     name: "Water Pump",     cat: "Resource", w: 2, h: 2 },

  // ---- Storage ----
  { id: "supply_depot",   name: "Supply Depot",   cat: "Storage", w: 4, h: 4 },
  { id: "fuel_tank",      name: "Fuel Tank",      cat: "Storage", w: 2, h: 2 },
  { id: "ammo_dump",      name: "Ammo Dump",      cat: "Storage", w: 3, h: 2 },
  { id: "silo",           name: "Storage Silo",   cat: "Storage", w: 2, h: 2 },

  // ---- Support ----
  { id: "field_hospital", name: "Field Hospital", cat: "Support", w: 4, h: 3, note: "Heals units" },
  { id: "repair_bay",     name: "Repair Bay",     cat: "Support", w: 4, h: 4 },
  { id: "shield_gen",     name: "Shield Generator", cat: "Support", w: 3, h: 3 },
  { id: "watchtower",     name: "Watchtower",     cat: "Support", w: 2, h: 2 },

  // ---- Vehicles / pads ----
  { id: "helipad",        name: "Helipad",        cat: "Vehicles", w: 4, h: 4 },
  { id: "vehicle_pad",    name: "Vehicle Pad",    cat: "Vehicles", w: 3, h: 3 },
  { id: "landing_zone",   name: "Landing Zone",   cat: "Vehicles", w: 6, h: 6 },

  // ---- Decor / misc ----
  { id: "flag",           name: "Flag Pole",      cat: "Decor",   w: 1, h: 1 },
  { id: "crate",          name: "Crate Stack",    cat: "Decor",   w: 1, h: 1 },
  { id: "sandbags",       name: "Sandbags",       cat: "Decor",   w: 2, h: 1 },
  { id: "road",           name: "Road Tile",      cat: "Decor",   w: 1, h: 1 }
];

// Attach category color to each buildable for convenience.
BUILDABLES.forEach(function (b) {
  b.color = b.color || CATEGORY_COLORS[b.cat] || "#7d8896";
});

// Expose globally (no modules, so the app works from file://).
window.WARDOGS = { BUILDABLES: BUILDABLES, CATEGORY_COLORS: CATEGORY_COLORS };
