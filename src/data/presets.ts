// Комнаты с типичным числом коробок и «окном без неудобств» — сколько дней до
// переезда комнатой ещё пользуешься (кухня и ванная — до последнего).
export const ROOM_PRESETS: { name: string; kind: string; est: number; window: number }[] = [
  { name: "Kitchen", kind: "kitchen", est: 12, window: 1 },
  { name: "Bathroom", kind: "bath", est: 3, window: 1 },
  { name: "Bedroom", kind: "bedroom", est: 8, window: 2 },
  { name: "Living room", kind: "living", est: 10, window: 4 },
  { name: "Home office", kind: "office", est: 6, window: 5 },
  { name: "Kids' room", kind: "kids", est: 6, window: 3 },
  { name: "Storage closet", kind: "storage", est: 6, window: 14 },
];

export const MINUTE_PRESETS = [10, 15, 20, 30, 45, 60, 90];
