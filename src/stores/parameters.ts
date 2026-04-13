import { create } from "zustand";
import { api } from "../lib/api";
import type { ParameterCatalog, Parameter } from "../types";

interface ParametersStore {
  catalog: ParameterCatalog | null;
  load: () => Promise<void>;
  upsert: (param: Parameter) => Promise<void>;
  remove: (key: string) => Promise<void>;
  reorder: (keys: string[]) => Promise<void>;
}

export const useParameters = create<ParametersStore>((set) => ({
  catalog: null,
  load: async () => set({ catalog: await api.getParameters() }),
  upsert: async (param) => set({ catalog: await api.upsertParameter(param) }),
  remove: async (key) => set({ catalog: await api.deleteParameter(key) }),
  reorder: async (keys) => set({ catalog: await api.reorderParameters(keys) }),
}));
