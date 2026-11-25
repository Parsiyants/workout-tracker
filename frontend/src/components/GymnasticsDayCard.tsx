import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { fetchMe } from "../api/auth";
import { errorMessage } from "../api/client";
import { toast } from "../store/toast";
import { fetchGymnasticsLogs, saveGymnasticsLog, todayIso } from "../api/gymnastics";

function shiftIso(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function dayLabel(iso: string): string {
  const today = todayIso();
  if (iso === today) return "сегодня";
  if (iso === shiftIso(today, -1)) return "вчера";
  if (iso === shiftIso(today, 1)) return "завтра";

  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

function longDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

type Props = {
  compact?: boolean;
};

export default function GymnasticsDayCard({ compact = false }: Props) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => todayIso());
  const { data: logs = [] } = useQuery({
    queryKey: ["gymnastics", "logs"],
    queryFn: fetchGymnasticsLogs,
  });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const readOnly = Boolean(me?.is_demo);

  const log = logs.find((item) => item.log_date === date);
  const [completed, setCompleted] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCompleted(log?.completed ?? false);
    setNotes(log?.notes ?? "");
  }, [log?.completed, log?.notes, date]);

  async function save(next: boolean, nextNotes: string | null) {
    setError(null);
    try {
      await saveGymnasticsLog(date, { completed: next, notes: nextNotes });
      queryClient.invalidateQueries({ queryKey: ["gymnastics", "logs"] });
      toast.success(next ? "Практика отмечена" : "Отметка снята");
    } catch (err) {
      setError(errorMessage(err, "Не удалось сохранить"));
      toast.error(errorMessage(err, "Не удалось сохранить"));
    }
  }

  function toggle() {
    const next = !completed;
    setCompleted(next);
    void save(next, notes.trim() || null);
  }

  const tone = completed
    ? "bg-lime-400/10 ring-1 ring-lime-400/40"
    : "bg-red-500/10 ring-1 ring-red-500/40";
  const titleTone = completed ? "text-lime-400" : "text-red-400";
  const circleSize = compact ? "h-10 w-10 text-base" : "h-12 w-12 text-xl";

  return (
    <section className={`rounded-2xl p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs tracking-wide uppercase ${titleTone}`}>Практика</p>

        <div className="flex items-center gap-1 text-neutral-400">
          <button
            type="button"
            aria-label="Предыдущий день"
            onClick={() => setDate(shiftIso(date, -1))}
            className="px-1.5 text-lg leading-none"
          >
            ‹
          </button>
          <span className="min-w-16 text-center text-xs text-neutral-400">{dayLabel(date)}</span>
          <button
            type="button"
            aria-label="Следующий день"
            onClick={() => setDate(shiftIso(date, 1))}
            className="px-1.5 text-lg leading-none"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={readOnly}
          aria-pressed={completed}
          aria-label={completed ? "Снять отметку" : "Отметить выполненным"}
          className={`grid ${circleSize} shrink-0 place-items-center rounded-full border ${
            completed
              ? "border-lime-400 bg-lime-400 text-neutral-950"
              : "border-red-500/60 text-transparent"
          }`}
        >
          ✓
        </button>

        <div className="min-w-0">
          <p className={`text-sm ${completed ? "text-neutral-200" : "text-red-200"}`}>
            {completed ? "Сделано" : "Не сделано"}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">{longDate(date)}</p>
        </div>
      </div>

      {!compact && (
        <textarea
          rows={2}
          placeholder="заметка о самочувствии"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={() => void save(completed, notes.trim() || null)}
          className="mt-3 w-full resize-none rounded-xl bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:ring-1 focus:ring-lime-400"
        />
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </section>
  );
}
