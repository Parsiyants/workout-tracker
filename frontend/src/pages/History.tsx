import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useCategories } from "../api/catalog";
import { fetchSessions } from "../api/sessions";
import MuscleMap from "../components/MuscleMap";
import { ListSkeleton } from "../components/Skeleton";

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function monthLabel(iso: string): string {
  const date = new Date(iso);
  const month = date.toLocaleDateString("ru-RU", { month: "long" });
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${date.getFullYear()}`;
}

export default function History() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: fetchSessions,
  });
  const { data: categories = [] } = useCategories();

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const groups = useMemo(() => {
    const result: { label: string; items: typeof sessions }[] = [];
    for (const session of sessions) {
      const label = monthLabel(session.finished_at);
      const last = result[result.length - 1];
      if (last && last.label === label) {
        last.items.push(session);
      } else {
        result.push({ label, items: [session] });
      }
    }
    return result;
  }, [sessions]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">История</h1>
        <Link
          to="/analytics"
          className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-lime-400 ring-1 ring-neutral-800"
        >
          Аналитика
        </Link>
      </header>

      {isLoading && <ListSkeleton rows={4} />}
      {!isLoading && sessions.length === 0 && (
        <p className="text-sm text-neutral-500">Завершённых тренировок пока нет.</p>
      )}

      {groups.map((group) => (
        <section key={group.label} className="space-y-2">
          <h2 className="text-xs tracking-wide text-neutral-500 uppercase">{group.label}</h2>

          {group.items.map((session) => {
            const maps = session.category_ids
              .map((id) => categoryById.get(id))
              .filter(
                (category): category is NonNullable<typeof category> =>
                  Boolean(category) && (category?.muscle_keys.length ?? 0) > 0,
              )
              .slice(0, 4);

            return (
              <Link
                key={session.id}
                to={`/history/${session.id}`}
                className="block rounded-2xl bg-neutral-900 p-4 active:bg-neutral-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-100">
                      {session.template_name}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {formatDay(session.finished_at)}, {formatTime(session.finished_at)} ·{" "}
                      {session.completed_items} из {session.total_items} · {session.duration_min} мин
                      {session.tonnage > 0 && ` · ${Math.round(session.tonnage)} кг`}
                    </p>
                  </div>
                  <span className="shrink-0 text-lg text-neutral-600">›</span>
                </div>

                {maps.length > 0 && (
                  <div className="mt-3 flex gap-3">
                    {maps.map((category) => (
                      <div key={category.id} className="w-12 text-center">
                        <MuscleMap muscles={category.muscle_keys} className="mx-auto h-16" />
                        <p className="mt-0.5 truncate text-xs text-neutral-600">{category.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </section>
      ))}
    </div>
  );
}
