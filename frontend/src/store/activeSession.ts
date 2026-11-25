import { create } from "zustand";

import type { SessionItem, WorkoutSession } from "../api/sessions";

type ActiveSessionState = {
  sessionId: number | null;
  templateName: string;
  items: SessionItem[];
  step: number;
  load: (session: WorkoutSession) => void;
  patchItem: (index: number, patch: Partial<SessionItem>) => void;
  setStep: (step: number) => void;
  clear: () => void;
};

export const useActiveSession = create<ActiveSessionState>((set) => ({
  sessionId: null,
  templateName: "",
  items: [],
  step: 0,
  load: (session) =>
    set((state) => ({
      sessionId: session.id,
      templateName: session.template_name,
      items: session.items,
      step: state.sessionId === session.id ? state.step : 0,
    })),
  patchItem: (index, patch) =>
    set((state) => ({
      items: state.items.map((item, position) =>
        position === index ? { ...item, ...patch } : item,
      ),
    })),
  setStep: (step) => set({ step }),
  clear: () => set({ sessionId: null, templateName: "", items: [], step: 0 }),
}));
