import type { ReactNode } from "react";

type Props = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  small?: boolean;
};

export default function Chip({ active, onClick, children, small = false }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border transition-colors ${
        small ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-sm"
      } ${
        active
          ? "border-lime-400 bg-lime-400/10 text-lime-400"
          : "border-neutral-800 bg-neutral-900 text-neutral-400"
      }`}
    >
      {children}
    </button>
  );
}
