import { EMPLOYEES } from "../model.js";
export const TEAMS = [
  "Data lab",
  "Intelligence",
  "Outbound",
  "Pipeline",
  "Operations",
  "Strategy",
  "Creative",
  "Retention",
];
export const SKINS = [
  "#e5b58f",
  "#c79572",
  "#d1a77f",
  "#f1d0b2",
  "#b98e6e",
  "#e5c5aa",
];
export const OUTFITS = [
  "#253846",
  "#c9a86a",
  "#6b7470",
  "#694e60",
  "#ddd5c4",
  "#314b41",
];
export const HAIRS = ["#27221e", "#5b3d26", "#a47841", "#d5bf8b", "#7d7b78"];
const castHair = [
 ['bun','hijab','braid','bob','curly','curly','pixie','bun','long','curly','long','bob','short','curly','short','short'],
 ['long','braid','long','hijab','curly','braid','bob','long','bun','curly','bun','braid','curly','short','bald','short'],
 ['bun','curly','ponytail','hijab','curly','bob','braid','curly','bun','long','bob','curly','short','short','short','curly'],
 ['long','curly','bob','hijab','bob','curly','pixie','long','pixie','long','curly','braid','curly','bald','short','curly'],
 ['curly','braid','long','hijab','bob','bob','bun','curly','bun','long','curly','long','curly','short','bald','short'],
 ['bun','braid','bun','hijab','bob','curly','bob','braid','bob','bob','curly','bob','curly','short','short','curly'],
 ['bun','braid','long','hijab','curly','pixie','braid','bob','long','bun','long','braid','curly','short','short','curly'],
 ['bob','bun','curly','bob','hijab','curly','bob','braid','long','bun','curly','long','short','bald','curly','short'],
];
export function employeeStyle(id) {
  const employee = EMPLOYEES.find(e=>e.id===id) || EMPLOYEES[0];
  const index = employee.castIndex;
  const female = employee.gender === "woman";
  return {
    displayName: employee.name,
    skin: SKINS[[1,4,0,0,0,1,0,1,0,1,1,1,1,0,4,0][index%16]],
    outfit: OUTFITS[(index + Math.floor(index / 6)) % OUTFITS.length],
    hair: HAIRS[(index * 3 + Math.floor(index / 5)) % HAIRS.length],
    hairStyle: castHair[Math.floor(index/16)][index%16],
    accessory: ["glasses", "none", "earrings", "headset"][index % 4],
    wardrobe: female ? ["blazer", "dress", "knit"][index % 3] : ["blazer", "shirt", "knit"][index % 3],
  };
}
export function defaultOffice() {
  return {
    theme: "penthouse",
    lighting: "daylight",
    floor: "oak",
    wall: "ivory",
    employees: {},
    positions: {},
    objects: [
      ...Array.from({ length: 16 }, (_, i) => ({
        id: `workstation-${i + 1}`,
        type: "desk",
        ...deskPosition(i),
        rotation: 0,
        color: "#bca080",
      })),
      {
        id: "lounge-1",
        type: "sofa",
        x: -12,
        z: 8,
        rotation: 0,
        color: "#d6c9ae",
      },
      {
        id: "lounge-2",
        type: "sofa",
        x: -7,
        z: 8,
        rotation: 0,
        color: "#9bafaa",
      },
      {
        id: "coffee-1",
        type: "table",
        x: -9.5,
        z: 10,
        rotation: 0,
        color: "#5b4a3b",
      },
      {
        id: "plant-1",
        type: "plant",
        x: -16,
        z: 10,
        rotation: 0,
        color: "#44624a",
      },
      {
        id: "plant-2",
        type: "plant",
        x: 16,
        z: 10,
        rotation: 0,
        color: "#44624a",
      },
      {
        id: "plant-3",
        type: "plant",
        x: -16,
        z: -10,
        rotation: 0,
        color: "#44624a",
      },
      {
        id: "plant-4",
        type: "plant",
        x: 16,
        z: -10,
        rotation: 0,
        color: "#44624a",
      },
      {
        id: "shelf-1",
        type: "bookshelf",
        x: 14,
        z: 6,
        rotation: 0,
        color: "#74533a",
      },
      {
        id: "lamp-1",
        type: "lamp",
        x: -4,
        z: 9,
        rotation: 0,
        color: "#c9a86a",
      },
      {
        id: "table-board",
        type: "table",
        x: 13,
        z: -4,
        rotation: 0,
        color: "#3b3935",
      },
    ],
  };
}
export function deskPosition(index) {
  return {
    x: [-12, -6, 0, 6][index % 4],
    z: -8 + Math.floor(index / 4) * 4.15,
  };
}
export function boundedPosition(x, z) {
  return {
    x: Math.max(-16, Math.min(16, x)),
    z: Math.max(-10.5, Math.min(10.5, z)),
  };
}
export function actualStatus(task) {
  if (!task) return "Idle";
  if (
    task.status === "Working" &&
    (!task.heartbeatAt || Date.now() - Date.parse(task.heartbeatAt) > 90000)
  )
    return "Heartbeat stale";
  return task.status;
}
