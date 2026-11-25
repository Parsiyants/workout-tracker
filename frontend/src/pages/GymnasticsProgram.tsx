import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { useExercises } from "../api/catalog";
import { fetchGymnasticsPrograms } from "../api/gymnastics";
import MediaSlider from "../components/MediaSlider";
import { formatTarget } from "../lib/target";

export default function GymnasticsProgram() {
  const { id } = useParams();
  const programId = Number(id);

  const { data: programs = [] } = useQuery({
    queryKey: ["gymnastics", "programs"],
    queryFn: fetchGymnasticsPrograms,
  });
  const { data: exercises = [] } = useExercises({});

  const program = programs.find((item) => item.id === programId);
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  if (!program) return <p className="text-sm text-neutral-500">Загрузка…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/gymnastics" className="text-sm text-neutral-400">
          ← Практика
        </Link>
        <Link
          to={`/gymnastics/programs/${program.id}/edit`}
          className="text-sm text-lime-400"
        >
          Изменить
        </Link>
      </div>

      <header>
        <h1 className="text-xl font-semibold">{program.name}</h1>
        <p className="mt-1 text-xs text-neutral-500">
          {program.exercises.length} упражнений · просмотр
        </p>
      </header>

      <div className="space-y-2">
        {program.exercises.map((item, index) => {
          const exercise = byId.get(item.exercise_id);
          return (
            <div key={`${item.exercise_id}-${index}`} className="flex items-center gap-3 rounded-2xl bg-neutral-900 p-3">
              <span className="w-4 text-xs text-neutral-600">{index + 1}</span>
              <MediaSlider media={exercise?.media ?? []} compact className="h-14 w-14 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-neutral-100">
                  {exercise?.name ?? "Упражнение удалено"}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {formatTarget(item, exercise?.metric_type)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
