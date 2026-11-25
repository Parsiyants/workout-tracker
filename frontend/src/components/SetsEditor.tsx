import { useState } from "react";

import type { SessionItem, SessionSet } from "../api/sessions";

type Props = {
  item: SessionItem;
  disabled: boolean;
  onSets: (sets: SessionSet[]) => void;
};

function setLabel(entry: SessionSet): string {
  if (entry.duration_sec) return `${entry.duration_sec} с`;
  if (entry.weight) return `${entry.weight} кг × ${entry.reps ?? 0}`;
  return `${entry.reps ?? 0} повт.`;
}

export default function SetsEditor({ item, disabled, onSets }: Props) {
  const isTime = item.metric_type === "time";
  const withWeight = item.metric_type === "weight_reps";

  const last = item.sets[item.sets.length - 1];
  const [weight, setWeight] = useState(() => String(last?.weight ?? item.target_weight ?? ""));
  const [reps, setReps] = useState(() => String(last?.reps ?? item.target_reps ?? ""));
  const [duration, setDuration] = useState(() =>
    String(last?.duration_sec ?? item.target_duration_sec ?? ""),
  );

  function addSet() {
    const next: SessionSet = isTime
      ? { weight: null, reps: null, duration_sec: Number(duration) || 0 }
      : {
          weight: withWeight ? Number(weight) || 0 : null,
          reps: Number(reps) || 0,
          duration_sec: null,
        };

    const empty = isTime ? !next.duration_sec : !next.reps;
    if (empty) return;

    onSets([...item.sets, next]);
  }

  return (
    <div className="space-y-2">
      {item.sets.length > 0 && (
        <ol className="space-y-1">
          {item.sets.map((entry, index) => (
            <li
              key={index}
              className="flex items-center gap-2 rounded-lg bg-neutral-800/60 px-3 py-2 text-sm text-neutral-200"
            >
              <span className="text-xs text-neutral-500">{index + 1}</span>
              <span className="flex-1">{setLabel(entry)}</span>
              <button
                type="button"
                aria-label="Удалить подход"
                disabled={disabled}
                onClick={() => onSets(item.sets.filter((_, position) => position !== index))}
                className="px-1 text-xs text-neutral-500 disabled:opacity-40"
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="flex items-end gap-2">
        {withWeight && (
          <label className="min-w-0 flex-1">
            <span className="text-xs text-neutral-500">кг</span>
            <input
              type="number"
              inputMode="decimal"
              step={0.5}
              placeholder={item.target_weight ? String(item.target_weight) : "0"}
              value={weight}
              disabled={disabled}
              onChange={(event) => setWeight(event.target.value)}
              className="mt-1 w-full min-w-0 rounded-lg bg-neutral-800 px-2 py-2.5 text-center text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:ring-1 focus:ring-lime-400"
            />
          </label>
        )}

        {isTime ? (
          <label className="min-w-0 flex-1">
            <span className="text-xs text-neutral-500">секунды</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder={item.target_duration_sec ? String(item.target_duration_sec) : "0"}
              value={duration}
              disabled={disabled}
              onChange={(event) => setDuration(event.target.value)}
              className="mt-1 w-full min-w-0 rounded-lg bg-neutral-800 px-2 py-2.5 text-center text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:ring-1 focus:ring-lime-400"
            />
          </label>
        ) : (
          <label className="min-w-0 flex-1">
            <span className="text-xs text-neutral-500">повторы</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder={item.target_reps ? String(item.target_reps) : "0"}
              value={reps}
              disabled={disabled}
              onChange={(event) => setReps(event.target.value)}
              className="mt-1 w-full min-w-0 rounded-lg bg-neutral-800 px-2 py-2.5 text-center text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:ring-1 focus:ring-lime-400"
            />
          </label>
        )}

        <button
          type="button"
          onClick={addSet}
          disabled={disabled}
          aria-label="Добавить подход"
          title="Добавить подход"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-lime-400 text-xl leading-none font-medium text-neutral-950 transition-colors hover:bg-lime-300 disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}
