import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useCategories, useExercises } from "../api/catalog";
import { errorMessage } from "../api/client";
import {
  addSessionItem,
  fetchActiveSession,
  finishSession,
  updateSessionItem,
  type SessionItemPatch,
} from "../api/sessions";
import ExercisePicker from "../components/ExercisePicker";
import MediaSlider from "../components/MediaSlider";
import MuscleMap from "../components/MuscleMap";
import SessionTimer from "../components/SessionTimer";
import SetsEditor from "../components/SetsEditor";
import { Skeleton } from "../components/Skeleton";
import { formatTarget } from "../lib/target";
import { useActiveSession } from "../store/activeSession";
import { toast } from "../store/toast";

const METRIC_LABELS: Record<string, string> = {
  weight_reps: "вес × повторы",
  reps: "свой вес",
  time: "на время",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-950/60 px-2 py-2.5">
      <p className="text-base font-semibold text-neutral-100 tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-neutral-500">{label}</p>
    </div>
  );
}

export default function WorkoutSession() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { sessionId, templateName, items, step, load, patchItem, setStep, clear } =
    useActiveSession();
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ["session", "active"],
    queryFn: fetchActiveSession,
  });
  const { data: exercises = [] } = useExercises({});
  const { data: categories = [] } = useCategories();

  useEffect(() => {
    if (session) load(session);
  }, [session, load]);

  const id = sessionId ?? session?.id ?? null;
  const total = items.length;
  const done = items.filter((item) => item.completed).length;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;
  const atSummary = total === 0 || step >= total;
  const currentStep = Math.min(step, Math.max(0, total - 1));
  const item = atSummary ? undefined : items[currentStep];

  const totalSets = items.reduce((sum, entry) => sum + entry.sets.length, 0);
  const tonnage = items.reduce(
    (sum, entry) =>
      sum + entry.sets.reduce((acc, set) => acc + (set.weight ?? 0) * (set.reps ?? 0), 0),
    0,
  );

  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const exercise = item ? exerciseById.get(item.exercise_id) : undefined;
  const category = exercise ? categoryById.get(exercise.category_id) : undefined;
  const parent = category?.parent_id ? categoryById.get(category.parent_id) : undefined;

  const categoryIds = useMemo(() => {
    const ids = new Set<number>();
    for (const entry of items) {
      const found = exerciseById.get(entry.exercise_id);
      const foundCategory = found ? categoryById.get(found.category_id) : undefined;
      if (foundCategory && foundCategory.muscle_keys.length > 0) {
        ids.add(foundCategory.id);
      }
    }
    return [...ids].slice(0, 4);
  }, [items, exerciseById, categoryById]);

  function save(index: number, patch: SessionItemPatch) {
    if (id === null) return;
    patchItem(index, patch);
    setError(null);
    updateSessionItem(id, index, patch)
      .then(load)
      .catch((err) => {
        setError(errorMessage(err, "Не удалось сохранить"));
        toast.error(errorMessage(err, "Не удалось сохранить"));
      });
  }

  async function addExercise(exerciseId: number) {
    setPicking(false);
    if (id === null) return;
    try {
      const updated = await addSessionItem(id, exerciseId);
      load(updated);
      setStep(updated.items.length - 1);
      setError(null);
      toast.success("Упражнение добавлено в тренировку");
    } catch (err) {
      setError(errorMessage(err, "Не удалось добавить упражнение"));
      toast.error(errorMessage(err, "Не удалось добавить упражнение"));
    }
  }

  function completeStep() {
    if (!item) return;
    save(currentStep, { completed: !item.completed });
    if (!item.completed) {
      toast.success(`«${item.name}» — выполнено`);
      setStep(currentStep + 1);
    } else {
      toast.info(`Отметка снята: «${item.name}»`);
    }
  }

  const finish = useMutation({
    mutationFn: () => finishSession(id as number),
    onSuccess: () => {
      clear();
      toast.success("Тренировка завершена");
      queryClient.invalidateQueries({ queryKey: ["session", "active"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      navigate("/", { replace: true });
    },
    onError: (err) => {
      setError(errorMessage(err, "Не удалось завершить тренировку"));
      toast.error(errorMessage(err, "Не удалось завершить тренировку"));
    },
  });

  if (isLoading && id === null) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-2/3" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <div className="rounded-2xl bg-neutral-900 p-4">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="mt-3 h-3 w-1/3" />
          <Skeleton className="mt-2 h-6 w-1/2" />
          <Skeleton className="mt-3 h-12 w-full" />
          <Skeleton className="mt-2 h-12 w-full" />
        </div>
      </div>
    );
  }

  if (id === null) {
    return (
      <div className="space-y-3">
        <p className="text-neutral-400">Активной тренировки нет.</p>
        <Link to="/" className="text-sm text-lime-400">
          ← На главную
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs tracking-wide text-neutral-500 uppercase">Тренировка</p>
            <h1 className="mt-1 truncate text-xl font-semibold">{templateName}</h1>
          </div>
          {session?.started_at && (
            <SessionTimer
              startedAt={session.started_at}
              className="shrink-0 rounded-lg bg-neutral-900 px-2 py-1 text-sm text-neutral-300 tabular-nums ring-1 ring-neutral-800"
            />
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
            <div className="h-full bg-lime-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-neutral-500 tabular-nums">
            {done}/{total}
          </span>
        </div>

        {categoryIds.length > 0 && (
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto">
            {categoryIds.map((categoryId) => {
              const entry = categoryById.get(categoryId);
              if (!entry) return null;
              return (
                <div key={categoryId} className="w-12 shrink-0 text-center">
                  <MuscleMap muscles={entry.muscle_keys} className="mx-auto h-16" />
                  <p className="mt-0.5 truncate text-xs text-neutral-600">{entry.name}</p>
                </div>
              );
            })}
          </div>
        )}
      </header>

      {atSummary ? (
        <section className="rounded-2xl bg-neutral-900 p-4">
          <p className="text-xs tracking-wide text-lime-400 uppercase">
            {allDone ? "Всё выполнено" : "Итоги тренировки"}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-100">
            {total === 0
              ? "В тренировке пока нет упражнений"
              : allDone
                ? "Тренировка пройдена"
                : "Можно завершать"}
          </h2>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="упражнений" value={`${done}/${total}`} />
            <Stat label="подходов" value={String(totalSets)} />
            <Stat label="тоннаж" value={tonnage > 0 ? `${Math.round(tonnage)} кг` : "—"} />
          </div>

          {items.length > 0 && (
            <ul className="mt-4 space-y-1">
              {items.map((entry, position) => (
                <li key={`${entry.exercise_id}-${position}`}>
                  <button
                    type="button"
                    onClick={() => setStep(position)}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-neutral-800/60"
                  >
                    <span className={entry.completed ? "text-lime-400" : "text-neutral-600"}>
                      {entry.completed ? "✓" : "○"}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        entry.completed ? "text-neutral-400" : "text-neutral-200"
                      }`}
                    >
                      {entry.name}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-600 tabular-nums">
                      {entry.sets.length ? `${entry.sets.length} подх.` : "—"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="w-full rounded-xl bg-neutral-800 py-3 text-sm font-medium text-lime-400 ring-1 ring-neutral-700 transition-colors hover:bg-neutral-700"
            >
              ＋ Добавить упражнение
            </button>
            <button
              type="button"
              onClick={() => finish.mutate()}
              disabled={finish.isPending}
              className={`w-full rounded-xl py-3.5 text-sm transition-colors disabled:opacity-50 ${
                allDone
                  ? "bg-lime-400 font-semibold text-neutral-950 shadow-lg shadow-lime-400/20 hover:bg-lime-300"
                  : "bg-neutral-800 font-medium text-neutral-100 hover:bg-neutral-700"
              }`}
            >
              {finish.isPending
                ? "Завершение…"
                : allDone
                  ? "Завершить тренировку ✓"
                  : "Завершить тренировку"}
            </button>
          </div>
        </section>
      ) : (
        item && (
          <section className="overflow-hidden rounded-2xl bg-neutral-900">
            {exercise && exercise.media.length > 0 && (
              <MediaSlider
                media={exercise.media}
                className="aspect-video w-full"
                rounded="rounded-none"
                fit="contain"
              />
            )}

            <div className="space-y-3 p-4">
              <div className="min-w-0">
                <p className="text-xs break-words text-neutral-500">
                  {[parent?.name, category?.name].filter(Boolean).join(" · ")}
                  {` · ${METRIC_LABELS[item.metric_type] ?? ""}`}
                </p>
                <h2 className="mt-1 text-lg font-semibold break-words text-neutral-100">{item.name}</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Упражнение {currentStep + 1} из {total}
                  {item.completed ? " · выполнено" : ""}
                </p>
              </div>

              {exercise?.description && (
                <p className="text-sm whitespace-pre-line text-neutral-400">{exercise.description}</p>
              )}

              {item.target_sets && (item.target_reps || item.target_duration_sec) ? (
                <p className="text-sm text-lime-400">
                  План:{" "}
                  {formatTarget(
                    {
                      exercise_id: item.exercise_id,
                      target_sets: item.target_sets,
                      target_reps: item.target_reps,
                      target_duration_sec: item.target_duration_sec,
                      target_weight: item.target_weight,
                    },
                    item.metric_type,
                  )}
                </p>
              ) : null}

              <SetsEditor
                key={`${item.exercise_id}-${currentStep}`}
                item={item}
                disabled={false}
                onSets={(sets) => save(currentStep, { sets })}
              />

              <input
                type="text"
                placeholder="заметка к упражнению"
                defaultValue={item.notes ?? ""}
                onBlur={(event) => save(currentStep, { notes: event.target.value.trim() || null })}
                className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:ring-1 focus:ring-lime-400"
              />
            </div>
          </section>
        )
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {total > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(52px+env(safe-area-inset-bottom))] z-40 border-t border-neutral-800 bg-neutral-950/95 px-3 pt-2.5 pb-2.5 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:pt-4 lg:pb-0 lg:backdrop-blur-none">
          {atSummary ? (
            <button
              type="button"
              onClick={() => setStep(Math.max(0, total - 1))}
              className="w-full rounded-2xl bg-neutral-900 py-3.5 text-sm text-neutral-300 ring-1 ring-neutral-800 transition-colors hover:bg-neutral-800"
            >
              ‹ Вернуться к упражнениям
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Предыдущее упражнение"
                onClick={() => setStep(currentStep - 1)}
                disabled={currentStep === 0}
                className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-2xl text-neutral-200 ring-1 ring-neutral-700 transition-colors hover:bg-neutral-800 disabled:opacity-30"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={completeStep}
                className={`min-w-0 flex-1 rounded-2xl px-2 py-3.5 text-sm font-medium transition-colors ${
                  item?.completed
                    ? "bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
                    : "bg-lime-400 text-neutral-950 hover:bg-lime-300"
                }`}
              >
                <span className="block truncate">
                  {item?.completed ? "Снять отметку" : "Завершить упражнение"}
                </span>
              </button>
              <button
                type="button"
                aria-label="Следующее упражнение"
                onClick={() => setStep(currentStep + 1)}
                className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-2xl text-neutral-200 ring-1 ring-neutral-700 transition-colors hover:bg-neutral-800"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}

      {picking && <ExercisePicker onPick={addExercise} onClose={() => setPicking(false)} />}
    </div>
  );
}
