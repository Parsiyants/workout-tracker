import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useCategories, useExercises } from "../api/catalog";
import { errorMessage } from "../api/client";
import { fetchSession, isConflict, startSession, type SessionSet } from "../api/sessions";
import MediaSlider from "../components/MediaSlider";
import MuscleMap from "../components/MuscleMap";
import { setsCount } from "../lib/plural";
import { toast } from "../store/toast";

function setLabel(entry: SessionSet): string {
  if (entry.duration_sec) return `${entry.duration_sec} с`;
  if (entry.weight) return `${entry.weight} кг × ${entry.reps ?? 0}`;
  return `${entry.reps ?? 0} повт.`;
}

export default function HistoryDetail() {
  const { id } = useParams();
  const sessionId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: session, isError } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => fetchSession(sessionId),
  });
  const { data: exercises = [] } = useExercises({});
  const { data: categories = [] } = useCategories();

  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const repeat = useMutation({
    mutationFn: (templateId: number) => startSession(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", "active"] });
      toast.success("Тренировка начата");
      navigate("/session");
    },
    onError: (error) => {
      if (isConflict(error)) {
        queryClient.invalidateQueries({ queryKey: ["session", "active"] });
        navigate("/session");
      }
    },
  });

  if (isError) return <p className="text-neutral-400">Тренировка не найдена</p>;
  if (!session) return <p className="text-sm text-neutral-500">Загрузка…</p>;

  const finished = session.finished_at ? new Date(session.finished_at) : null;
  const duration = finished
    ? Math.max(1, Math.round((finished.getTime() - new Date(session.started_at).getTime()) / 60000))
    : 0;

  const done = session.items.filter((item) => item.completed).length;
  const totalSets = session.items.reduce((total, item) => total + item.sets.length, 0);
  const setsCountLabel = setsCount(totalSets);
  const tonnage = session.items.reduce(
    (total, item) =>
      total +
      item.sets.reduce((sum, entry) => sum + (entry.weight ?? 0) * (entry.reps ?? 0), 0),
    0,
  );

  const categoryIds = [
    ...new Set(
      session.items
        .map((item) => exerciseById.get(item.exercise_id)?.category_id)
        .filter((value): value is number => value !== undefined),
    ),
  ].slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/history" className="text-sm text-neutral-400">
          ← История
        </Link>
        {session.template_id !== null && (
          <button
            type="button"
            onClick={() => repeat.mutate(session.template_id as number)}
            disabled={repeat.isPending}
            className="text-sm text-lime-400 disabled:opacity-50"
          >
            {repeat.isPending ? "Запуск…" : "Повторить"}
          </button>
        )}
      </div>

      {repeat.isError && !isConflict(repeat.error) && (
        <p className="text-xs text-red-400">{errorMessage(repeat.error, "Не удалось начать")}</p>
      )}

      <header>
        <p className="text-xs text-neutral-500">
          {finished
            ? `${finished.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}, ${finished.toLocaleTimeString(
                "ru-RU",
                { hour: "2-digit", minute: "2-digit" },
              )}`
            : ""}
        </p>
        <h1 className="mt-1 text-xl font-semibold">{session.template_name}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-neutral-900 px-3 py-1 text-neutral-300">
            {done} из {session.items.length} выполнено
          </span>
          <span className="rounded-full bg-neutral-900 px-3 py-1 text-neutral-300">{duration} мин</span>
          {totalSets > 0 && (
            <span className="rounded-full bg-neutral-900 px-3 py-1 text-neutral-300">
              {setsCountLabel}
            </span>
          )}
          {tonnage > 0 && (
            <span className="rounded-full bg-neutral-900 px-3 py-1 text-neutral-300">
              {Math.round(tonnage)} кг
            </span>
          )}
        </div>
      </header>

      {categoryIds.length > 0 && (
        <div className="no-scrollbar flex gap-3 overflow-x-auto">
          {categoryIds.map((categoryId) => {
            const category = categoryById.get(categoryId);
            if (!category) return null;
            return (
              <div key={categoryId} className="w-12 text-center">
                <MuscleMap muscles={category.muscle_keys} className="mx-auto h-16" />
                <p className="mt-0.5 truncate text-xs text-neutral-600">{category.name}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        {session.items.map((item, index) => {
          const exercise = exerciseById.get(item.exercise_id);
          return (
            <div key={`${item.exercise_id}-${index}`} className="rounded-2xl bg-neutral-900 p-3">
              <div className="flex items-start gap-3">
                <MediaSlider media={exercise?.media ?? []} compact className="h-12 w-12 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <p
                      className={`min-w-0 flex-1 truncate text-sm ${
                        item.completed ? "text-neutral-100" : "text-neutral-400"
                      }`}
                    >
                      {item.name}
                    </p>
                    <span className={`shrink-0 text-sm ${item.completed ? "text-lime-400" : "text-neutral-600"}`}>
                      {item.completed ? "✓" : "—"}
                    </span>
                  </div>

                  {item.sets.length > 0 && (
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {item.sets.map(setLabel).join(" · ")}
                    </p>
                  )}

                  {item.notes && <p className="mt-1 text-xs text-neutral-500 italic">{item.notes}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
