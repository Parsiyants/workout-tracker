type Props = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  step?: number;
};

export default function NumberInput({ label, value, onChange, min = 0, step = 1 }: Props) {
  return (
    <label className="block">
      <span className="text-xs text-neutral-500">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={value ?? ""}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === "" ? null : Number(raw));
        }}
        className="mt-1 w-full rounded-lg bg-neutral-800 px-2 py-2 text-center text-sm text-neutral-100 outline-none focus:ring-1 focus:ring-lime-400"
      />
    </label>
  );
}
