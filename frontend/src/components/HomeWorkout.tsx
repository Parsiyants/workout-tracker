import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useCategories, useExercises } from "../api/catalog";
import { fetchMe } from "../api/auth";
import { errorMessage } from "../api/client";
import {
  fetchActiveSession,
  fetchSessions,
  finishSession,
  isConflict,
  startSession,
} from "../api/sessions";
import { useRecommendedTemplate, useTemplates } from "../api/templates";
import { exercisesCount } from "../lib/plural";
import { formatTarget } from "../lib/target";
import { toast } from "../store/toast";
import MediaSlider from "./MediaSlider";
import MuscleMap from "./MuscleMap";
import SessionTimer from "./SessionTimer";
import { WorkoutCardSkeleton } from "./Skeleton";
import WorkoutPicker from "./WorkoutPicker";
import { ClockIcon, PencilIcon, SwitchIcon } from "./icons";

type Row = {
  key: string;
  exerciseId: number;
  title: string;
  target: string;
  completed: boolean;
  sets: number;
};

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export default function HomeWorkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [picking, setPicking] = useState(false);

  const { data: templates = [], isLoading } = useTemplates();
  const { data: recommended } = useRecommendedTemplate();
  const { data: active } = useQuery({ queryKey: ["session", "active"], queryFn: fetchActiveSession });
  const { data: recent = [] } = useQuery({ queryKey: ["sessions"], queryFn: fetchSessions });
  const { data: exercises = [] } = useExercises({});
  const { data: categories = [] } = useCategories();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const readOnly = Boolean(me?.is_demo);

  const index = Math.max(
    0,
    templates.findIndex((template) => template.id === (recommended?.id ?? templates[0]?.id)),
  );
  const current = templates[index];
  const previous = templates.length > 1 ? templates[(index - 1 + templates.length) % templates.length] : null;
  const next = templates.length > 1 ? templates[(index + 1) % templates.length] : null;

  const lastFinished = recent[0];
  const finishedToday = Boolean(lastFinished && isToday(lastFinished.finished_at));

  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const start = useMutation({
    mutationFn: (templateId: number | null) => startSession(templateId),
    onSuccess: (created) => {
      setPicking(false);
      toast.success(`Тренировка «${created.template_name}» начата`);
      queryClient.invalidateQueries({ queryKey: ["session", "active"] });
      navigate("/session");
    },
    onError: (error) => {
      if (isConflict(error)) {
        queryClient.invalidateQueries({ queryKey: ["session", "active"] });
        navigate("/session");
        return;
      }
      toast.error(errorMessage(error, "Не удалось начать тренировку"));
    },
  });

  const finish = useMutation({
    mutationFn: (sessionId: number) => finishSession(sessionId),
    onSuccess: () => {
      toast.success("Тренировка завершена");
      queryClient.invalidateQueries({ queryKey: ["session", "active"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Не удалось завершить тренировку")),
  });

  if (isLoading) {
    return <WorkoutCardSkeleton />;
  }

  if (!current && !active) {
    return (
      <section className="rounded-2xl bg-neutral-900 p-4">
        <p className="text-sm text-neutral-400">Тренировок ещё нет.</p>
        <Link
          to="/templates/new"
          className="mt-3 inline-block rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-medium text-neutral-950"
        >
          Создать тренировку
        </Link>
      </section>
    );
  }

  const rows: Row[] = active
    ? active.items.map((item, position) => ({
        key: `${item.exercise_id}-${position}`,
        exerciseId: item.exercise_id,
        title: item.name,
        target: item.target_sets
          ? formatTarget(
              {
                exercise_id: item.exercise_id,
                target_sets: item.target_sets,
                target_reps: item.target_reps,
                target_duration_sec: item.target_duration_sec,
                target_weight: item.target_weight,
              },
              item.metric_type,
            )
          : "—",
        completed: item.completed,
        sets: item.sets.length,
      }))
    : (current?.exercises ?? []).map((item, position) => {
        const exercise = exerciseById.get(item.exercise_id);
        return {
          key: `${item.exercise_id}-${position}`,
          exerciseId: item.exercise_id,
          title: exercise?.name ?? "Упражнение удалено",
          target: formatTarget(item, exercise?.metric_type),
          completed: false,
          sets: 0,
        };
      });

  const title = active ? active.template_name : (current?.name ?? "Тренировка");

  const categoryIds = [
    ...new Set(
      rows
        .map((row) => exerciseById.get(row.exerciseId)?.category_id)
        .filter((value): value is number => value !== undefined),
    ),
  ]
    .filter((categoryId) => (categoryById.get(categoryId)?.muscle_keys.length ?? 0) > 0)
    .slice(0, 4);

  const total = rows.length;
  const done = rows.filter((row) => row.completed).length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  const label = active ? "Идёт тренировка" : finishedToday ? "Сегодня выполнено" : "Рекомендация";
  const cardTone = active
    ? "bg-amber-400/10 ring-1 ring-amber-400/40"
    : finishedToday
      ? "bg-lime-400/10 ring-1 ring-lime-400/30"
      : "bg-neutral-900";
  const labelTone = active ? "text-amber-300" : "text-lime-400";
  const barTone = active ? "bg-amber-400" : "bg-lime-400";

  return (
    <>
      <section className={`rounded-2xl p-4 ${cardTone}`}>
        <div className="flex items-center justify-between gap-3">
          <p className={`text-xs tracking-wide uppercase ${labelTone}`}>{label}</p>
          {active ? (
            <SessionTimer startedAt={active.started_at} className="text-sm text-neutral-300 tabular-nums" />
          ) : (
            <span className="text-xs text-neutral-500">{exercisesCount(total)}</span>
          )}
        </div>

        <h2 className="mt-2 text-xl font-semibold text-neutral-100">{title}</h2>

        {active && (
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
              <div className={`h-full transition-all ${barTone}`} style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-neutral-400 tabular-nums">
              {done}/{total}
            </span>
          </div>
        )}

        {categoryIds.length > 0 && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {categoryIds.map((categoryId) => {
              const category = categoryById.get(categoryId);
              if (!category) return null;
              return (
                <div key={categoryId} className="w-16 shrink-0 text-center">
                  <MuscleMap muscles={category.muscle_keys} className="mx-auto h-24" />
                  <p className="mt-1 truncate text-xs text-neutral-500">{category.name}</p>
                </div>
              );
            })}
          </div>
        )}

        <ul className="mt-3 space-y-1.5">
          {rows.map((row, position) => {
            const exercise = exerciseById.get(row.exerciseId);
            return (
              <li key={row.key}>
                <Link
                  to={`/catalog/${row.exerciseId}`}
                  className="flex items-center gap-3 rounded-xl px-1 py-1 transition-colors active:bg-neutral-800 hover:bg-neutral-800/60"
                >
                  <span className="w-3 text-xs text-neutral-600">{position + 1}</span>
                  <MediaSlider media={exercise?.media ?? []} compact className="h-10 w-10 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm ${
                        row.completed ? "text-neutral-400 line-through" : "text-neutral-100"
                      }`}
                    >
                      {row.title}
                    </span>
                    <span className="block truncate text-xs text-neutral-500">{row.target}</span>
                  </span>
                  {active ? (
                    row.completed ? (
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime-400 text-[11px] font-semibold text-neutral-950">
                        ✓
                      </span>
                    ) : row.sets > 0 ? (
                      <span className="shrink-0 rounded-full bg-neutral-800 px-2 py-0.5 text-[11px] text-lime-400 tabular-nums">
                        {row.sets}
                      </span>
                    ) : (
                      <span className="h-5 w-5 shrink-0 rounded-full ring-1 ring-neutral-700" />
                    )
                  ) : (
                    <span className="shrink-0 text-neutral-600">›</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {active ? (
          <div className="mt-4 flex gap-2">
            <Link
              to="/session"
              className="flex-1 rounded-xl bg-amber-400 py-2.5 text-center text-sm font-medium text-neutral-950 transition-colors hover:bg-amber-300"
            >
              Продолжить
            </Link>
            <button
              type="button"
              onClick={() => finish.mutate(active.id)}
              disabled={finish.isPending}
              className="flex-1 rounded-xl bg-neutral-800 py-2.5 text-sm text-neutral-100 ring-1 ring-neutral-700 transition-colors hover:bg-neutral-700 disabled:opacity-50"
            >
              {finish.isPending ? "Завершение…" : "Завершить"}
            </button>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() =>
                finishedToday ? setPicking(true) : start.mutate(current?.id ?? null)
              }
              disabled={start.isPending || readOnly}
              title={readOnly ? "Демо-режим: только просмотр" : undefined}
              className="flex-1 rounded-xl bg-lime-400 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-lime-300 disabled:opacity-50"
            >
              {start.isPending ? "Старт…" : finishedToday ? "Ещё одна тренировка" : "Начать"}
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setPicking(true)}
                aria-label="Сменить тренировку"
                title="Сменить тренировку"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-800 text-neutral-300 transition-colors hover:bg-neutral-700"
              >
                <SwitchIcon className="h-4 w-4" />
              </button>
            )}
            {!readOnly && current && (
              <Link
                to={`/templates/${current.id}/edit`}
                aria-label="Изменить тренировку"
                className="grid h-11 w-11 place-items-center rounded-xl bg-neutral-800 text-neutral-300 transition-colors hover:bg-neutral-700"
              >
                <PencilIcon className="h-4 w-4" />
              </Link>
            )}
            <Link
              to="/history"
              aria-label="История"
              className="grid h-11 w-11 place-items-center rounded-xl bg-neutral-800 text-neutral-300 transition-colors hover:bg-neutral-700"
            >
              <ClockIcon className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>

      {previous && next && (
        <div className="mt-3 flex gap-2">
          <Link
            to={`/templates/${previous.id}/edit`}
            className="min-w-0 flex-1 rounded-2xl bg-neutral-900 px-3 py-2 ring-1 ring-neutral-800 transition-colors hover:bg-neutral-800"
          >
            <span className="block text-xs text-neutral-500">‹ Прошлая</span>
            <span className="block truncate text-sm text-neutral-300">{previous.name}</span>
          </Link>
          <Link
            to={`/templates/${next.id}/edit`}
            className="min-w-0 flex-1 rounded-2xl bg-neutral-900 px-3 py-2 text-right ring-1 ring-neutral-800 transition-colors hover:bg-neutral-800"
          >
            <span className="block text-xs text-neutral-500">Следующая ›</span>
            <span className="block truncate text-sm text-neutral-300">{next.name}</span>
          </Link>
        </div>
      )}

      {picking && (
        <WorkoutPicker onPick={(templateId) => start.mutate(templateId)} onClose={() => setPicking(false)} />
      )}
    </>
  );
}
