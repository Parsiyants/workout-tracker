import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { useCategories, useExercises } from "../api/catalog";
import { reorderTemplates, useTemplates } from "../api/templates";
import { exercisesCount } from "../lib/plural";
import { formatTarget } from "../lib/target";
import MediaSlider from "../components/MediaSlider";
import MuscleMap from "../components/MuscleMap";
import { ListSkeleton } from "../components/Skeleton";

export default function Templates() {
  const queryClient = useQueryClient();
  const { data: templates = [], isLoading } = useTemplates();
  const { data: exercises = [] } = useExercises({});
  const { data: categories = [] } = useCategories();

  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const reorder = useMutation({
    mutationFn: reorderTemplates,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= templates.length) return;

    const ids = templates.map((template) => template.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-neutral-400">
          ← Главная
        </Link>
        <Link
          to="/templates/new"
          className="rounded-xl bg-lime-400 px-3 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-lime-300"
        >
          Создать
        </Link>
      </div>

      <h1 className="text-2xl font-semibold">Тренировки</h1>

      {isLoading && <ListSkeleton rows={3} />}
      {!isLoading && templates.length === 0 && (
        <p className="text-sm text-neutral-500">Пока нет тренировок. Создайте первую.</p>
      )}

      <div className="space-y-2">
        {templates.map((template, index) => {
          const categoryIds = [
            ...new Set(
              template.exercises
                .map((item) => exerciseById.get(item.exercise_id)?.category_id)
                .filter((value): value is number => value !== undefined),
            ),
          ]
            .filter((categoryId) => (categoryById.get(categoryId)?.muscle_keys.length ?? 0) > 0)
            .slice(0, 4);

          return (
            <article key={template.id} className="rounded-2xl bg-neutral-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <Link to={`/templates/${template.id}/edit`} className="group min-w-0 flex-1">
                  <p className="text-xs tracking-wide text-neutral-500 uppercase">
                    Тренировка {index + 1}
                  </p>
                  <p className="mt-1 truncate text-lg font-semibold text-neutral-100 transition-colors group-hover:text-lime-400">
                    {template.name}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {exercisesCount(template.exercises.length)}
                  </p>
                </Link>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label="Выше"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-neutral-800 text-sm text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-25"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Ниже"
                    onClick={() => move(index, 1)}
                    disabled={index === templates.length - 1}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-neutral-800 text-sm text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-25"
                  >
                    ↓
                  </button>
                  <Link
                    to={`/templates/${template.id}/edit`}
                    aria-label={`Открыть тренировку «${template.name}»`}
                    className="grid h-9 w-9 place-items-center rounded-lg text-lg text-neutral-600 transition-colors hover:text-neutral-300"
                  >
                    ›
                  </Link>
                </div>
              </div>

              {categoryIds.length > 0 && (
                <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                  {categoryIds.map((categoryId) => {
                    const category = categoryById.get(categoryId);
                    if (!category) return null;
                    return (
                      <div key={categoryId} className="w-16 shrink-0 text-center">
                        <MuscleMap muscles={category.muscle_keys} className="mx-auto h-20" />
                        <p className="mt-1 truncate text-xs text-neutral-500">{category.name}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {template.exercises.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {template.exercises.map((item, position) => {
                    const exercise = exerciseById.get(item.exercise_id);
                    return (
                      <li key={`${item.exercise_id}-${position}`}>
                        <Link
                          to={`/catalog/${item.exercise_id}`}
                          className="flex items-center gap-3 rounded-xl px-1 py-1 transition-colors hover:bg-neutral-800/60 active:bg-neutral-800"
                        >
                          <span className="w-3 text-xs text-neutral-600">{position + 1}</span>
                          <MediaSlider media={exercise?.media ?? []} compact className="h-10 w-10 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-neutral-100">
                              {exercise?.name ?? "Упражнение удалено"}
                            </span>
                            <span className="block truncate text-xs text-neutral-500">
                              {formatTarget(item, exercise?.metric_type)}
                            </span>
                          </span>
                          <span className="shrink-0 text-neutral-600">›</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

              {template.exercises.length === 0 && (
                <p className="mt-3 text-sm text-neutral-500">Упражнений пока нет — добавьте в редакторе.</p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
