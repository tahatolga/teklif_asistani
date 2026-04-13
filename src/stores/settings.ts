import { create } from "zustand";
import { api } from "../lib/api";
import type { Settings } from "../types";

interface SettingsStore {
  settings: Settings | null;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
}

export const useSettings = create<SettingsStore>((set) => ({
  settings: null,
  load: async () => {
    const s = await api.getSettings();
    set({ settings: s });
  },
  update: async (patch) => {
    const updated = await api.updateSettings({
      default_currency: patch.default_currency,
      auto_update_enabled: patch.auto_update_enabled,
      skipped_version: patch.skipped_version,
    });
    set({ settings: updated });
  },
}));
