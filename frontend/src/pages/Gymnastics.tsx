import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { fetchGymnasticsLogs, fetchGymnasticsPrograms } from "../api/gymnastics";
import GymnasticsCalendar from "../components/GymnasticsCalendar";
import GymnasticsDayCard from "../components/GymnasticsDayCard";
import { exercisesCount } from "../lib/plural";

export default function Gymnastics() {
  const { data: programs = [] } = useQuery({
    queryKey: ["gymnastics", "programs"],
    queryFn: fetchGymnasticsPrograms,
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["gymnastics", "logs"],
    queryFn: fetchGymnasticsLogs,
  });

  const completedDays = logs.filter((log) => log.completed).length;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Практика</h1>
        <p className="mt-1 text-sm text-neutral-500">Каждый день · спина, осанка, мобильность</p>
      </header>

      <GymnasticsDayCard />

      <GymnasticsCalendar logs={logs} />

      <p className="text-xs text-neutral-500">Всего дней с практикой: {completedDays}</p>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-400">Программы</h2>
          <Link to="/gymnastics/programs/new" className="text-sm text-lime-400">
            Создать
          </Link>
        </div>

        {programs.length === 0 && (
          <p className="text-sm text-neutral-500">Пока нет программ. Создайте первую.</p>
        )}

        {programs.map((program) => (
          <Link
            key={program.id}
            to={`/gymnastics/programs/${program.id}`}
            className="flex items-center justify-between gap-3 rounded-2xl bg-neutral-900 p-4 active:bg-neutral-800"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-100">{program.name}</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {exercisesCount(program.exercises.length)}
              </p>
            </div>
            <span className="shrink-0 text-lg text-neutral-600">›</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
