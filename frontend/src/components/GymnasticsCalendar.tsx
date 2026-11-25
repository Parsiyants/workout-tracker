import { useState } from "react";

import type { GymnasticsLog } from "../api/gymnastics";
import { todayIso } from "../api/gymnastics";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type Props = {
  logs: GymnasticsLog[];
};

export default function GymnasticsCalendar({ logs }: Props) {
  const today = todayIso();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;

  const done = new Set(logs.filter((log) => log.completed).map((log) => log.log_date));

  function isoDate(day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function shiftMonth(delta: number) {
    setCursor(new Date(year, month + delta, 1));
  }

  const monthLabel = cursor.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <section className="rounded-2xl bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц" className="px-2 text-neutral-400">
          ‹
        </button>
        <p className="text-sm text-neutral-300 capitalize">{monthLabel}</p>
        <button type="button" onClick={() => shiftMonth(1)} aria-label="Следующий месяц" className="px-2 text-neutral-400">
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="text-xs text-neutral-600">
            {day}
          </span>
        ))}

        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />;
          const iso = isoDate(day);
          const isDone = done.has(iso);
          const isToday = iso === today;
          const isMissed = iso < today && !isDone;
          const isFuture = iso > today;

          return (
            <span
              key={iso}
              className={`grid aspect-square place-items-center rounded-lg text-xs ${
                isDone
                  ? "bg-lime-400 font-medium text-neutral-950"
                  : isMissed
                    ? "bg-red-500/25 text-red-200/90"
                    : isFuture
                      ? "bg-neutral-800/40 text-neutral-600"
                      : "bg-neutral-800/60 text-neutral-400"
              } ${isToday ? "ring-1 ring-lime-400" : ""}`}
            >
              {day}
            </span>
          );
        })}
      </div>
    </section>
  );
}
