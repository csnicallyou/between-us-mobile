export const themes = [
  {
    name: "Уютная классика",
    wall: "#edc7ac",
    floor: "#c99572",
    sofa: "#e49a99",
    accent: "#f0c578",
    sky: "#a8d5df",
  },
  {
    name: "Современный минимализм",
    wall: "#e0dfd5",
    floor: "#bfb6a8",
    sofa: "#9eada6",
    accent: "#c7bda9",
    sky: "#bfdae0",
  },
  {
    name: "Нежная пастель",
    wall: "#e6cfe5",
    floor: "#d8b5b1",
    sofa: "#b8a5d9",
    accent: "#f2c7a5",
    sky: "#c1d9ed",
  },
  {
    name: "Природная гармония",
    wall: "#c2d0b0",
    floor: "#a78c69",
    sofa: "#879e78",
    accent: "#e3b984",
    sky: "#c5e0d5",
  },
  {
    name: "Атмосферный вечер",
    wall: "#635b83",
    floor: "#806d83",
    sofa: "#9b779c",
    accent: "#f4be77",
    sky: "#354a79",
  },
  {
    name: "Стильный арт",
    wall: "#e8bfa7",
    floor: "#a48b9f",
    sofa: "#839bb8",
    accent: "#edba66",
    sky: "#b2d7d8",
  },
] as const;
export type RoomDesign = {
  theme: number;
  sofa: string | null;
  decor: "sun" | "flower" | "heart";
  material: "matte" | "satin";
  model: "cloud" | "round";
};
export const defaultRoom: RoomDesign = {
  theme: 0,
  sofa: null,
  decor: "sun",
  material: "matte",
  model: "cloud",
};
export type RoomHistory = {
  past: RoomDesign[];
  present: RoomDesign;
  future: RoomDesign[];
};
export function editRoom(h: RoomHistory, next: RoomDesign): RoomHistory {
  return { past: [...h.past, h.present], present: next, future: [] };
}
export function undoRoom(h: RoomHistory): RoomHistory {
  if (!h.past.length) return h;
  return {
    past: h.past.slice(0, -1),
    present: h.past.at(-1)!,
    future: [h.present, ...h.future],
  };
}
export function redoRoom(h: RoomHistory): RoomHistory {
  if (!h.future.length) return h;
  return {
    past: [...h.past, h.present],
    present: h.future[0]!,
    future: h.future.slice(1),
  };
}
