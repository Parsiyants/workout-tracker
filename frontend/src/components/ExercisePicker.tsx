import { useState } from "react";

import { useCategories, useExercises } from "../api/catalog";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import MediaSlider from "./MediaSlider";
import MuscleMap from "./MuscleMap";

type Props = {
  onPick: (exerciseId: number) => void;
  onClose: () => void;
};

export default function ExercisePicker({ onPick, onClose }: Props) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);

  const { data: exercises = [] } = useExercises({ search: debounced.trim() || undefined });
  const { data: categories = [] } = useCategories();
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/70 pt-16" onClick={onClose}>
      <div
        className="mx-auto flex max-h-full w-full max-w-md flex-col rounded-t-3xl bg-neutral-950 ring-1 ring-neutral-800 lg:max-w-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-base font-medium">Добавить упражнение</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="px-2 text-neutral-500">
            ✕
          </button>
        </div>

        <div className="px-4 pb-3">
          <input
            autoFocus
            type="search"
            placeholder="Поиск"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-base text-neutral-100 ring-1 ring-neutral-800 outline-none placeholder:text-neutral-600 focus:ring-lime-400"
          />
        </div>

        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pt-1 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          {exercises.length === 0 && (
            <p className="py-6 text-center text-sm text-neutral-500">Ничего не найдено</p>
          )}
          {exercises.map((exercise) => {
            const category = categoryById.get(exercise.category_id);
            return (
              <button
                key={exercise.id}
                type="button"
                onClick={() => onPick(exercise.id)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-neutral-900 active:bg-neutral-900"
              >
                <MediaSlider media={exercise.media} compact className="h-11 w-11 shrink-0" />

                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-neutral-900 ring-1 ring-neutral-800">
                  {category && category.muscle_keys.length > 0 ? (
                    <MuscleMap muscles={category.muscle_keys} className="h-10" />
                  ) : (
                    <span className="text-xs text-neutral-700">—</span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-neutral-100">{exercise.name}</span>
                  <span className="block truncate text-xs text-neutral-500">{category?.name}</span>
                </span>

                <span className="shrink-0 text-xl text-lime-400">＋</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
