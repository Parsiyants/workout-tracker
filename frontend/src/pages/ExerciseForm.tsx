import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  createExercise,
  fetchExercise,
  updateExercise,
  useCategories,
  type ExerciseInput,
} from "../api/catalog";
import { errorMessage } from "../api/client";
import type { MetricType } from "../api/catalog";
import MediaListField from "../components/MediaListField";
import { toast } from "../store/toast";

const EMPTY: ExerciseInput = {
  name: "",
  description: null,
  category_id: 0,
  metric_type: "weight_reps",
  media: [],
};

const METRIC_OPTIONS: { value: MetricType; label: string }[] = [
  { value: "weight_reps", label: "Вес × повторы" },
  { value: "reps", label: "Свой вес (только повторы)" },
  { value: "time", label: "На время (секунды)" },
];

export default function ExerciseForm() {
  const { id } = useParams();
  const exerciseId = id ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useCategories();
  const { data: existing } = useQuery({
    queryKey: ["exercise", exerciseId],
    queryFn: () => fetchExercise(exerciseId as number),
    enabled: exerciseId !== null,
  });

  const [form, setForm] = useState<ExerciseInput>(EMPTY);

  useEffect(() => {
    if (existing) {
      const { id: _ignored, ...rest } = existing;
      setForm(rest);
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: (payload: ExerciseInput) =>
      exerciseId === null ? createExercise(payload) : updateExercise(exerciseId, payload),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      queryClient.setQueryData(["exercise", saved.id], saved);
      toast.success(exerciseId === null ? "Упражнение создано" : "Упражнение сохранено");
      navigate(`/catalog/${saved.id}`, { replace: true });
    },
  });

  function update<K extends keyof ExerciseInput>(key: K, value: ExerciseInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ ...form, name: form.name.trim() });
  }

  const roots = categories.filter((category) => category.parent_id === null);
  const canSubmit = form.name.trim().length > 0 && form.category_id > 0 && !mutation.isPending;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/catalog" className="text-sm text-neutral-400">
          ← Упражнения
        </Link>
        <h1 className="text-base font-medium">
          {exerciseId === null ? "Новое упражнение" : "Редактирование"}
        </h1>
      </div>

      <input
        required
        placeholder="Название"
        value={form.name}
        onChange={(event) => update("name", event.target.value)}
        className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-base text-neutral-100 ring-1 ring-neutral-800 outline-none placeholder:text-neutral-600 focus:ring-lime-400"
      />

      <select
        required
        value={form.category_id}
        onChange={(event) => update("category_id", Number(event.target.value))}
        className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-base text-neutral-100 ring-1 ring-neutral-800 outline-none focus:ring-lime-400"
      >
        <option value={0}>Выберите категорию</option>
        {roots.map((root) => (
          <Fragment key={root.id}>
            <option value={root.id}>{root.name}</option>
            {categories
              .filter((category) => category.parent_id === root.id)
              .map((child) => (
                <option key={child.id} value={child.id}>
                  — {child.name}
                </option>
              ))}
          </Fragment>
        ))}
      </select>

      <select
        required
        value={form.metric_type}
        onChange={(event) => update("metric_type", event.target.value as MetricType)}
        className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-base text-neutral-100 ring-1 ring-neutral-800 outline-none focus:ring-lime-400"
      >
        {METRIC_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <textarea
        rows={4}
        placeholder="Описание"
        value={form.description ?? ""}
        onChange={(event) => update("description", event.target.value || null)}
        className="w-full resize-none rounded-xl bg-neutral-900 px-4 py-3 text-base text-neutral-100 ring-1 ring-neutral-800 outline-none placeholder:text-neutral-600 focus:ring-lime-400"
      />

      <MediaListField value={form.media} onChange={(media) => update("media", media)} />

      {mutation.isError && (
        <p className="text-sm text-red-400">{errorMessage(mutation.error, "Не удалось сохранить")}</p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-lime-400 py-3 font-medium text-neutral-950 disabled:opacity-50"
      >
        {mutation.isPending ? "Сохранение…" : "Сохранить"}
      </button>
    </form>
  );
}
