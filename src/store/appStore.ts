import { create } from "zustand";
import { defaultSettings, loadAll, type Box, type Room, type Settings } from "../data/repo";
import { freshPace, type Pace } from "../lib/pace";
import { todayLocal } from "../lib/time";
import { setHapticsEnabled } from "../services/haptics";

type State = {
  ready: boolean;
  version: number;
  today: string;
  rooms: Room[];
  boxes: Box[];
  pace: Pace;
  settings: Settings;
  extra: Record<string, number>;
  wanted: string[];
  configured: boolean;
  refresh: () => Promise<void>;
};

// refresh() — через очередь: два перезапроса внахлёст не перетирают друг друга.
let queue: Promise<void> = Promise.resolve();

export const useApp = create<State>((set) => ({
  ready: false,
  version: 0,
  today: todayLocal(),
  rooms: [],
  boxes: [],
  pace: freshPace(),
  settings: defaultSettings(todayLocal()),
  extra: {},
  wanted: [],
  configured: false,
  refresh: () => {
    queue = queue
      .then(async () => {
        const today = todayLocal();
        const d = await loadAll(today);
        setHapticsEnabled(d.settings.haptics);
        set((s) => ({ ...d, ready: true, today, version: s.version + 1 }));
      })
      .catch(() => {});
    return queue;
  },
}));
