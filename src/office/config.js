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
  "#b77d56",
  "#794f39",
  "#f1d0b2",
  "#a86942",
  "#53372e",
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
const names = [
  "Avery",
  "Morgan",
  "Riley",
  "Jordan",
  "Alex",
  "Sam",
  "Taylor",
  "Casey",
  "Jamie",
  "Cameron",
  "Drew",
  "Quinn",
  "Sage",
  "Ellis",
  "Rowan",
  "Reese",
  "Blair",
  "Harper",
  "Dakota",
  "Emerson",
  "Finley",
  "Hayden",
  "Kendall",
  "Lane",
  "Marlowe",
  "Noel",
  "Oakley",
  "Parker",
  "Robin",
  "Skyler",
  "Tatum",
  "Winter",
];
export function employeeStyle(id) {
  const index = EMPLOYEES.findIndex((e) => e.id === id);
  return {
    displayName:
      names[Math.floor(index / 4) % names.length] +
      " " +
      String((index % 4) + 1).padStart(2, "0"),
    skin: SKINS[index % SKINS.length],
    outfit: OUTFITS[Math.floor(index / 4) % OUTFITS.length],
    hair: HAIRS[index % HAIRS.length],
    hairStyle: ["short", "bob", "curly", "bun"][index % 4],
    accessory: index % 3 === 0 ? "glasses" : "none",
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
