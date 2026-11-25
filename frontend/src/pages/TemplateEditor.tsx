import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useCategories, useExercises } from "../api/catalog";
import { errorMessage } from "../api/client";
import {
  createTemplate,
  deleteTemplate,
  updateTemplate,
  useTemplates,
  type TemplateItem,
} from "../api/templates";
import ExercisePicker from "../components/ExercisePicker";
import MediaSlider from "../components/MediaSlider";
import MuscleMap from "../components/MuscleMap";
import NumberInput from "../components/NumberInput";
import { toast } from "../store/toast";

export default function TemplateEditor() {
  const { id } = useParams();
  const templateId = id ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: templates = [] } = useTemplates();
  const { data: exercises = [] } = useExercises({});
  const { data: categories = [] } = useCategories();
  const existing = templates.find((template) => template.id === templateId);

  const [name, setName] = useState("");
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setItems(existing.exercises);
    }
  }, [existing]);

  const nameById = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
  const metricById = new Map(exercises.map((exercise) => [exercise.id, exercise.metric_type]));
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const save = useMutation({
    mutationFn: () =>
      templateId === null
        ? createTemplate({ name: name.trim(), exercises: items })
        : updateTemplate(templateId, { name: name.trim(), exercises: items }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Тренировка сохранена");
      navigate(`/templates/${saved.id}/edit`, { replace: true });
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteTemplate(templateId as number),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Тренировка удалена");
      navigate("/templates", { replace: true });
    },
  });

  function updateItem(index: number, patch: Partial<TemplateItem>) {
    setItems((prev) => prev.map((item, position) => (position === index ? { ...item, ...patch } : item)));
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addExercise(exerciseId: number) {
    const metric = metricById.get(exerciseId) ?? "weight_reps";
    setItems((prev) => [
      ...prev,
      {
        exercise_id: exerciseId,
        target_sets: 3,
        target_reps: metric === "time" ? null : 10,
        target_duration_sec: metric === "time" ? 30 : null,
        target_weight: null,
      },
    ]);
    setPicking(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/templates" className="text-sm text-neutral-400">
            ← Тренировки
          </Link>
          {templateId !== null && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Удалить тренировку?")) remove.mutate();
              }}
              className="text-sm text-red-400"
            >
              Удалить
            </button>
          )}
        </div>

        <input
          required
          placeholder="Название тренировки"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-base text-neutral-100 ring-1 ring-neutral-800 outline-none placeholder:text-neutral-600 focus:ring-lime-400"
        />

        <div className="space-y-2">
          {items.length === 0 && (
            <p className="rounded-2xl bg-neutral-900 p-4 text-sm text-neutral-500">
              Добавьте упражнения из раздела «Упражнения».
            </p>
          )}

          {items.map((item, index) => {
            const metric = metricById.get(item.exercise_id) ?? "weight_reps";
            const exercise = exerciseById.get(item.exercise_id);
            const category = exercise ? categoryById.get(exercise.category_id) : undefined;
            return (
              <div key={`${item.exercise_id}-${index}`} className="rounded-2xl bg-neutral-900 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <MediaSlider media={exercise?.media ?? []} compact className="h-10 w-10 shrink-0" />
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-neutral-950 ring-1 ring-neutral-800">
                    {category && category.muscle_keys.length > 0 ? (
                      <MuscleMap muscles={category.muscle_keys} className="h-9" />
                    ) : (
                      <span className="text-xs text-neutral-700">—</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-neutral-100">
                      {nameById.get(item.exercise_id) ?? "Упражнение удалено"}
                    </span>
                    <span className="block truncate text-xs text-neutral-500">{category?.name}</span>
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-neutral-300">
                  <button
                    type="button"
                    aria-label="Выше"
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-neutral-800 transition-colors hover:bg-neutral-700 disabled:opacity-25"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Ниже"
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-neutral-800 transition-colors hover:bg-neutral-700 disabled:opacity-25"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label="Убрать"
                    onClick={() => setItems((prev) => prev.filter((_, position) => position !== index))}
                    className="grid h-9 w-9 place-items-center rounded-lg text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className={`mt-3 grid gap-2 ${metric === "weight_reps" ? "grid-cols-3" : "grid-cols-2"}`}>
                <NumberInput
                  label="подходы"
                  min={1}
                  value={item.target_sets}
                  onChange={(value) => updateItem(index, { target_sets: value ?? 1 })}
                />
                {metric === "time" ? (
                  <NumberInput
                    label="секунды"
                    min={1}
                    value={item.target_duration_sec}
                    onChange={(value) => updateItem(index, { target_duration_sec: value ?? 30 })}
                  />
                ) : (
                  <NumberInput
                    label="повторы"
                    min={1}
                    value={item.target_reps}
                    onChange={(value) => updateItem(index, { target_reps: value ?? 1 })}
                  />
                )}
                {metric === "weight_reps" && (
                  <NumberInput
                    label="вес, кг"
                    step={0.5}
                    value={item.target_weight}
                    onChange={(value) => updateItem(index, { target_weight: value })}
                  />
                )}
              </div>
            </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setPicking(true)}
          className="w-full rounded-xl bg-neutral-900 py-3 text-sm text-lime-400 ring-1 ring-neutral-800"
        >
          ＋ Добавить упражнение
        </button>

        {save.isError && (
          <p className="text-sm text-red-400">{errorMessage(save.error, "Не удалось сохранить")}</p>
        )}

        <button
          type="submit"
          disabled={!name.trim() || save.isPending}
          className="w-full rounded-xl bg-lime-400 py-3 font-medium text-neutral-950 disabled:opacity-50"
        >
          {save.isPending ? "Сохранение…" : "Сохранить"}
        </button>
      </form>

      {picking && <ExercisePicker onPick={addExercise} onClose={() => setPicking(false)} />}
    </>
  );
}
