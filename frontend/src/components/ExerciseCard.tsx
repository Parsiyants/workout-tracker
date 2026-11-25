import { Link } from "react-router-dom";

import type { Exercise } from "../api/catalog";
import MediaSlider from "./MediaSlider";

type Props = {
  exercise: Exercise;
  categoryName?: string;
};

export default function ExerciseCard({ exercise, categoryName }: Props) {
  return (
    <Link
      to={`/catalog/${exercise.id}`}
      className="flex items-center gap-3 rounded-2xl bg-neutral-900 p-3 transition-colors active:bg-neutral-800"
    >
      <MediaSlider media={exercise.media} compact className="h-14 w-14 shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-neutral-100">{exercise.name}</p>
        {categoryName && <p className="mt-0.5 truncate text-xs text-neutral-500">{categoryName}</p>}
      </div>

      <span className="text-lg text-neutral-600">›</span>
    </Link>
  );
}
