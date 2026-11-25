import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { fetchMe } from "../api/auth";
import { useCategories, useExercises } from "../api/catalog";
import Chip from "../components/Chip";
import ExerciseCard from "../components/ExerciseCard";
import { ListSkeleton } from "../components/Skeleton";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

export default function Catalog() {
  const [search, setSearch] = useState("");
  const [rootId, setRootId] = useState<number | null>(null);
  const [subId, setSubId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const { data: categories = [] } = useCategories();
  const { data: exercises = [], isLoading } = useExercises({
    category_id: subId ?? rootId ?? undefined,
    search: debouncedSearch.trim() || undefined,
  });

  const roots = categories.filter((category) => category.parent_id === null);
  const children = rootId === null ? [] : categories.filter((category) => category.parent_id === rootId);
  const nameById = new Map(categories.map((category) => [category.id, category.name]));

  function pickRoot(id: number | null) {
    setRootId(id);
    setSubId(null);
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Упражнения</h1>
        {me?.is_demo ? null : (
          <Link
            to="/catalog/new"
            className="rounded-xl bg-lime-400 px-3 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-lime-300"
          >
            Добавить
          </Link>
        )}
      </header>

      <input
        type="search"
        placeholder="Поиск упражнения"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-base text-neutral-100 ring-1 ring-neutral-800 outline-none placeholder:text-neutral-600 focus:ring-lime-400"
      />

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={rootId === null} onClick={() => pickRoot(null)}>
          Все
        </Chip>
        {roots.map((root) => (
          <Chip key={root.id} active={rootId === root.id} onClick={() => pickRoot(root.id)}>
            {root.name}
          </Chip>
        ))}
      </div>

      {children.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {children.map((child) => (
            <Chip
              key={child.id}
              small
              active={subId === child.id}
              onClick={() => setSubId(subId === child.id ? null : child.id)}
            >
              {child.name}
            </Chip>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {isLoading && <ListSkeleton rows={5} />}
        {!isLoading && exercises.length === 0 && (
          <p className="text-sm text-neutral-500">Ничего не найдено.</p>
        )}
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            categoryName={nameById.get(exercise.category_id)}
          />
        ))}
      </div>
    </div>
  );
}

