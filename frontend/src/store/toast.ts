import { create } from "zustand";

export type ToastKind = "success" | "error" | "info";

export type ToastItem = {
  id: number;
  kind: ToastKind;
  text: string;
};

type State = {
  toasts: ToastItem[];
  push: (text: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToasts = create<State>((set) => ({
  toasts: [],
  push: (text, kind = "success") => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, kind, text }] }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }));
    }, 3200);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));

export const toast = {
  success: (text: string) => useToasts.getState().push(text, "success"),
  error: (text: string) => useToasts.getState().push(text, "error"),
  info: (text: string) => useToasts.getState().push(text, "info"),
};
