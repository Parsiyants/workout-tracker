import { useToasts, type ToastKind } from "../store/toast";

const TONES: Record<ToastKind, string> = {
  success: "bg-lime-400 text-neutral-950",
  error: "bg-red-500 text-white",
  info: "bg-neutral-800 text-neutral-100 ring-1 ring-neutral-700",
};

/** Всплывающие уведомления о результате действий. */
export default function Toaster() {
  const toasts = useToasts((state) => state.toasts);
  const dismiss = useToasts((state) => state.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:items-end"
    >
      {toasts.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => dismiss(item.id)}
          className={`toast-in pointer-events-auto max-w-sm rounded-xl px-4 py-2.5 text-left text-sm font-medium shadow-lg shadow-black/40 ${TONES[item.kind]}`}
        >
          {item.text}
        </button>
      ))}
    </div>
  );
}
