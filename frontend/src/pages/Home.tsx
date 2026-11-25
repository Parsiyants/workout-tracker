import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { fetchMe } from "../api/auth";
import { clearToken } from "../api/client";
import { fetchGymnasticsPrograms } from "../api/gymnastics";
import GymnasticsDayCard from "../components/GymnasticsDayCard";
import HomeWorkout from "../components/HomeWorkout";

export default function Home() {
  const navigate = useNavigate();
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const { data: programs = [] } = useQuery({
    queryKey: ["gymnastics", "programs"],
    queryFn: fetchGymnasticsPrograms,
  });

  function logout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tracking-wide text-neutral-500 uppercase">Трекер тренировок</p>
          <h1 className="mt-1 text-2xl font-semibold">Сегодня</h1>
          <p className="mt-0.5 truncate text-xs text-neutral-600">{user?.email}</p>
        </div>
        {user?.is_admin && (
          <Link
            to="/users"
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-neutral-500 ring-1 ring-neutral-800 transition-colors hover:text-neutral-300 lg:hidden"
          >
            Люди
          </Link>
        )}
        <button
          type="button"
          onClick={logout}
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-neutral-500 ring-1 ring-neutral-800 transition-colors hover:text-neutral-300 lg:hidden"
        >
          Выйти
        </button>
        <button
          type="button"
          onClick={logout}
          className="hidden shrink-0 rounded-lg px-3 py-2 text-xs text-neutral-400 ring-1 ring-neutral-800 transition-colors hover:bg-neutral-900 hover:text-neutral-200 lg:block"
        >
          Выйти
        </button>
      </header>

      <div className="space-y-4">
        <div className="space-y-4">
          <GymnasticsDayCard compact />

          {programs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {programs.map((program) => (
                <Link
                  key={program.id}
                  to={`/gymnastics/programs/${program.id}`}
                  className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 ring-1 ring-neutral-800 transition-colors hover:bg-neutral-800"
                >
                  {program.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <HomeWorkout />
        </div>
      </div>
    </div>
  );
}
