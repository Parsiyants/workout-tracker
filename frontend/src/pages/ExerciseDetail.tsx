import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { fetchMe } from "../api/auth";
import { fetchExercise, useCategories } from "../api/catalog";
import MediaSlider from "../components/MediaSlider";
import MuscleMap from "../components/MuscleMap";
import { DetailSkeleton } from "../components/Skeleton";

const METRIC_LABELS: Record<string, string> = {
  weight_reps: "вес × повторы",
  reps: "свой вес",
  time: "на время",
};

export default function ExerciseDetail() {
  const { id } = useParams();
  const exerciseId = Number(id);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const { data: categories = [] } = useCategories();
  const { data: exercise, isError } = useQuery({
    queryKey: ["exercise", exerciseId],
    queryFn: () => fetchExercise(exerciseId),
  });

  if (isError) return <p className="text-neutral-400">Упражнение не найдено</p>;
  if (!exercise) return <DetailSkeleton />;

  const category = categories.find((item) => item.id === exercise.category_id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/catalog" className="text-sm text-neutral-400">
          ← Упражнения
        </Link>
        {me?.is_demo ? null : (
          <Link to={`/catalog/${exercise.id}/edit`} className="text-sm text-lime-400">
            Изменить
          </Link>
        )}
      </div>

      <MediaSlider
        media={exercise.media}
        className="aspect-square w-full"
        rounded="rounded-2xl"
        fit="contain"
      />

      <div>
        <p className="text-xs tracking-wide text-neutral-500 uppercase">
          {category?.name}
          {category && ` · ${METRIC_LABELS[exercise.metric_type]}`}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{exercise.name}</h1>
      </div>

      {exercise.description && (
        <p className="text-sm whitespace-pre-line text-neutral-300">{exercise.description}</p>
      )}

      {category && category.muscle_keys.length > 0 && (
        <section className="rounded-2xl bg-neutral-900 p-3">
          <p className="text-xs tracking-wide text-neutral-500 uppercase">Задействованные мышцы</p>
          <MuscleMap muscles={category.muscle_keys} className="mx-auto mt-2 h-56" />
        </section>
      )}
    </div>
  );
}
