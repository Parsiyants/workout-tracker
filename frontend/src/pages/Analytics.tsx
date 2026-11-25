import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  fetchAnalyticsExercises,
  fetchExerciseWeights,
  fetchFrequency,
  fetchMuscleBalance,
  fetchRecords,
  fetchSummary,
  fetchVolume,
  type ExerciseRecord,
} from "../api/analytics";
import Chip from "../components/Chip";

const TOOLTIP_STYLE = {
  background: "#171717",
  border: "1px solid #3f3f46",
  borderRadius: 12,
  fontSize: 12,
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-neutral-900 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-100">{value}</p>
    </div>
  );
}

function weekLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function RecordRow({ record }: { record: ExerciseRecord }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-800/60 px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-sm text-neutral-200">{record.name}</span>
      <span className="shrink-0 text-sm text-lime-400">{record.best_weight} кг</span>
      <span className="shrink-0 text-xs text-neutral-500">
        {new Date(record.achieved_on).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
        })}
      </span>
    </div>
  );
}

export default function Analytics() {
  const [selected, setSelected] = useState<number | null>(null);

  const { data: summary } = useQuery({ queryKey: ["analytics", "summary"], queryFn: fetchSummary });
  const { data: volume = [] } = useQuery({ queryKey: ["analytics", "volume"], queryFn: fetchVolume });
  const { data: frequency = [] } = useQuery({
    queryKey: ["analytics", "frequency"],
    queryFn: fetchFrequency,
  });
  const { data: balance = [] } = useQuery({
    queryKey: ["analytics", "muscle-balance"],
    queryFn: fetchMuscleBalance,
  });
  const { data: records = [] } = useQuery({
    queryKey: ["analytics", "records"],
    queryFn: fetchRecords,
  });
  const { data: exercises = [] } = useQuery({
    queryKey: ["analytics", "exercises"],
    queryFn: fetchAnalyticsExercises,
  });

  const exerciseId = selected ?? exercises[0]?.exercise_id ?? null;
  const { data: points = [] } = useQuery({
    queryKey: ["analytics", "weights", exerciseId],
    queryFn: () => fetchExerciseWeights(exerciseId as number),
    enabled: exerciseId !== null,
  });

  const volumeData = volume.map((point) => ({
    label: weekLabel(point.week_start),
    tonnage: Math.round(point.tonnage),
  }));
  const frequencyData = frequency.map((point) => ({
    label: weekLabel(point.week_start),
    sessions: point.sessions,
  }));
  const balanceData = balance.map((item) => ({ name: item.name, sets: item.sets_count }));

  const chartData = points.map((point) => ({
    label: new Date(point.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
    max: point.max_weight,
    avg: point.avg_weight,
  }));

  return (
    <div className="space-y-4">
      <Link to="/history" className="text-sm text-neutral-400">
        ← История
      </Link>

      <h1 className="text-2xl font-semibold">Аналитика</h1>

      {summary && (
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Тренировок за неделю" value={String(summary.workouts_week)} />
          <Metric label="За месяц" value={String(summary.workouts_month)} />
          <Metric label="Средняя длительность" value={`${summary.avg_duration_min} мин`} />
          <Metric
            label="Тоннаж за месяц"
            value={`${Math.round(summary.tonnage_month).toLocaleString("ru-RU")} кг`}
          />
          <Metric label="Упражнений выполнено" value={`${summary.completion_rate}%`} />
          <Metric label="Подходы заполнены" value={`${summary.filled_rate}%`} />
          <Metric label="Практика за месяц" value={`${summary.gymnastics_days_month} дн.`} />
          <Metric label="Серия практики" value={`${summary.gymnastics_streak} дн.`} />
        </div>
      )}

      <section className="space-y-2 rounded-2xl bg-neutral-900 p-4">
        <h2 className="text-sm font-medium text-neutral-300">Объём по неделям, кг</h2>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="label"
                interval={0}
                tick={{ fill: "#71717a", fontSize: 9 }}
                stroke="#3f3f46"
              />
              <YAxis allowDecimals={false} tick={{ fill: "#71717a", fontSize: 10 }} stroke="#3f3f46" />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#a3a3a3" }} />
              <Bar dataKey="tonnage" name="тоннаж" fill="#a3e635" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="space-y-2 rounded-2xl bg-neutral-900 p-4">
        <h2 className="text-sm font-medium text-neutral-300">Частота тренировок</h2>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={frequencyData} margin={{ top: 8, right: 4, bottom: 0, left: -28 }}>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 9 }} stroke="#3f3f46" />
              <YAxis allowDecimals={false} tick={{ fill: "#71717a", fontSize: 10 }} stroke="#3f3f46" />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#a3a3a3" }} />
              <Bar dataKey="sessions" name="тренировок" fill="#71717a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="space-y-2 rounded-2xl bg-neutral-900 p-4">
        <h2 className="text-sm font-medium text-neutral-300">Нагрузка по группам, подходы</h2>
        {balanceData.length === 0 ? (
          <p className="text-sm text-neutral-500">Пока нет подходов за 30 дней.</p>
        ) : (
          <div className="w-full" style={{ height: Math.max(120, balanceData.length * 28) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={balanceData}
                layout="vertical"
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={104}
                  tick={{ fill: "#a1a1aa", fontSize: 10 }}
                  stroke="#3f3f46"
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#a3a3a3" }} />
                <Bar dataKey="sets" name="подходов" fill="#a3e635" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-neutral-900 p-4">
        <h2 className="text-sm font-medium text-neutral-300">Вес по упражнениям</h2>

        {exercises.length === 0 && (
          <p className="text-sm text-neutral-500">
            Пока нет данных — добавьте подходы с весом в тренировках.
          </p>
        )}

        {exercises.length > 0 && (
          <>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {exercises.map((exercise) => (
                <Chip
                  key={exercise.exercise_id}
                  small
                  active={exercise.exercise_id === exerciseId}
                  onClick={() => setSelected(exercise.exercise_id)}
                >
                  {exercise.name}
                </Chip>
              ))}
            </div>

            {chartData.length === 0 ? (
              <p className="text-sm text-neutral-500">Нет сессий с подходами.</p>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke="#27272a" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} stroke="#3f3f46" />
                    <YAxis
                      domain={["dataMin - 5", "dataMax + 5"]}
                      tick={{ fill: "#71717a", fontSize: 11 }}
                      stroke="#3f3f46"
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#a3a3a3" }} />
                    <Line
                      type="monotone"
                      dataKey="max"
                      name="макс. вес"
                      stroke="#a3e635"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#a3e635" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avg"
                      name="средний"
                      stroke="#71717a"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </section>

      {records.length > 0 && (
        <section className="space-y-2 rounded-2xl bg-neutral-900 p-4">
          <h2 className="text-sm font-medium text-neutral-300">Рекорды</h2>
          {records.map((record) => (
            <RecordRow key={record.exercise_id} record={record} />
          ))}
        </section>
      )}
    </div>
  );
}
