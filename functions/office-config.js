import { EMPLOYEES } from "../src/model.js";

const choices = {
  theme: ["penthouse", "studio", "midnight"],
  lighting: ["daylight", "sunset", "night"],
  floor: ["oak", "marble", "slate"],
  wall: ["ivory", "charcoal", "sage"],
};
const types = ["desk", "plant", "sofa", "table", "lamp", "partition", "art", "bookshelf"];
const employeeIds = new Set(EMPLOYEES.map((e) => e.id));
const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const keys = (v, allowed) => record(v) && Object.keys(v).every((k) => allowed.includes(k));
const color = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
const number = (v, bound) => Number.isFinite(v) && Math.abs(v) <= bound;
const position = (v) => keys(v, ["x", "z"]) && number(v.x, 40) && number(v.z, 40);

// Strict, data-only schema: never persist arbitrary fields, URLs, or renderer input.
export function validOfficeConfig(config) {
  if (!keys(config, [...Object.keys(choices), "objects", "employees", "positions"])) return false;
  if (!Object.entries(choices).every(([key, values]) => values.includes(config[key]))) return false;
  if (!Array.isArray(config.objects) || config.objects.length > 300) return false;
  const seen = new Set();
  for (const o of config.objects) {
    if (!keys(o, ["id", "type", "x", "z", "rotation", "color"]) ||
        typeof o.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(o.id) || seen.has(o.id) ||
        !types.includes(o.type) || !number(o.x, 40) || !number(o.z, 40) ||
        !number(o.rotation, 6.3) || !color(o.color)) return false;
    seen.add(o.id);
  }
  if (!record(config.employees) || !record(config.positions)) return false;
  for (const [id, employee] of Object.entries(config.employees)) {
    if (!employeeIds.has(id) || !keys(employee, ["displayName", "skin", "hair", "hairStyle", "outfit", "accessory"])) return false;
    for (const [key, value] of Object.entries(employee)) {
      if (key === "displayName" && (typeof value !== "string" || !value.trim() || value.length > 50 || /[\u0000-\u001f\u007f]/.test(value))) return false;
      if (["skin", "hair", "outfit"].includes(key) && !color(value)) return false;
      if (key === "hairStyle" && !["short", "bob", "curly", "bun", "bald"].includes(value)) return false;
      if (key === "accessory" && !["none", "glasses"].includes(value)) return false;
    }
  }
  return Object.entries(config.positions).every(([id, v]) => employeeIds.has(id) && position(v));
}
