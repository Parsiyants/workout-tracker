import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useExercises } from "../api/catalog";
import { errorMessage } from "../api/client";
import {
  createGymnasticsProgram,
  deleteGymnasticsProgram,
  fetchGymnasticsPrograms,
  updateGymnasticsProgram,
} from "../api/gymnastics";
import type { TemplateItem } from "../api/templates";
import ExercisePicker from "../components/ExercisePicker";
import NumberInput from "../components/NumberInput";
import { toast } from "../store/toast";

export default function GymnasticsProgramEditor() {
  const { id } = useParams();
  const programId = id ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: programs = [] } = useQuery({
    queryKey: ["gymnastics", "programs"],
    queryFn: fetchGymnasticsPrograms,
  });
  const { data: exercises = [] } = useExercises({});
  const existing = programs.find((program) => program.id === programId);

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

  const save = useMutation({
    mutationFn: () =>
      programId === null
        ? createGymnasticsProgram({ name: name.trim(), exercises: items })
        : updateGymnasticsProgram(programId, { name: name.trim(), exercises: items }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["gymnastics", "programs"] });
      toast.success("Программа сохранена");
      navigate(`/gymnastics/programs/${saved.id}`, { replace: true });
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteGymnasticsProgram(programId as number),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gymnastics", "programs"] });
      toast.success("Программа удалена");
      navigate("/gymnastics", { replace: true });
    },
  });

  function updateItem(index: number, patch: Partial<TemplateItem>) {
    setItems((prev) =>
      prev.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    );
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
        target_sets: 1,
        target_reps: metric === "time" ? null : 10,
        target_duration_sec: metric === "time" ? 60 : null,
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
          <Link to="/gymnastics" className="text-sm text-neutral-400">
            ← Практика
          </Link>
          {programId !== null && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Удалить программу?")) remove.mutate();
              }}
              className="text-sm text-red-400"
            >
              Удалить
            </button>
          )}
        </div>

        <input
          required
          placeholder="Название программы"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-base text-neutral-100 ring-1 ring-neutral-800 outline-none placeholder:text-neutral-600 focus:ring-lime-400"
        />

        <div className="space-y-2">
          {items.length === 0 && (
            <p className="rounded-2xl bg-neutral-900 p-4 text-sm text-neutral-500">
              Добавьте упражнения из категории «Гимнастика».
            </p>
          )}

          {items.map((item, index) => {
            const metric = metricById.get(item.exercise_id) ?? "weight_reps";
            return (
              <div key={`${item.exercise_id}-${index}`} className="rounded-2xl bg-neutral-900 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-100">
                    {nameById.get(item.exercise_id) ?? "Упражнение удалено"}
                  </p>
                  <div className="flex shrink-0 items-center text-neutral-300">
                    <button
                      type="button"
                      aria-label="Выше"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      className="px-1.5 disabled:opacity-20"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Ниже"
                      onClick={() => moveItem(index, 1)}
                      disabled={index === items.length - 1}
                      className="px-1.5 disabled:opacity-20"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label="Убрать"
                      onClick={() => setItems((prev) => prev.filter((_, position) => position !== index))}
                      className="px-1.5 text-red-400"
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
                      onChange={(value) => updateItem(index, { target_duration_sec: value ?? 60 })}
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
