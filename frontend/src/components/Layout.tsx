import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import { fetchMe } from "../api/auth";
import { fetchActiveSession } from "../api/sessions";
import SessionTimer from "./SessionTimer";
import Toaster from "./Toaster";
import { BookIcon, CalendarIcon, ChartIcon, DumbbellIcon, HomeIcon, UsersIcon } from "./icons";

const tabs = [
  { to: "/", label: "Главная", icon: HomeIcon },
  { to: "/catalog", label: "Упражнения", icon: BookIcon },
  { to: "/templates", label: "Тренировки", icon: DumbbellIcon },
  { to: "/gymnastics", label: "Практика", icon: CalendarIcon },
  { to: "/history", label: "История", icon: ChartIcon },
];

export default function Layout() {
  const location = useLocation();
  const focusMode = location.pathname.startsWith("/session");
  const { data: active } = useQuery({
    queryKey: ["session", "active"],
    queryFn: fetchActiveSession,
  });
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: fetchMe });

  return (
    <div className="min-h-dvh lg:flex lg:gap-6">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-neutral-800 bg-neutral-950 px-3 py-6 lg:flex">
        <Link to="/" className="mb-4 flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-lime-400 text-neutral-950">
            <DumbbellIcon className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-neutral-100">Трекер</span>
        </Link>

        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-lime-400/10 text-lime-400"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}

        <div className="mt-auto space-y-2 px-2">
          {user?.is_admin && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-2 py-2 text-xs transition-colors ${
                  isActive ? "text-lime-400" : "text-neutral-500 hover:text-neutral-200"
                }`
              }
            >
              <UsersIcon className="h-4 w-4" />
              Пользователи
            </NavLink>
          )}
          {user?.is_demo && (
            <p className="rounded-lg bg-amber-500/10 px-2 py-1.5 text-xs text-amber-300">
              Демо-режим · только просмотр
            </p>
          )}
          {user?.email && <p className="truncate text-xs text-neutral-600">{user.email}</p>}
        </div>
      </aside>

      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col text-neutral-100 lg:mx-0 lg:max-w-none lg:flex-1">
        {user?.is_demo && (
          <div className="sticky top-0 z-20 border-b border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-center text-xs text-amber-300 lg:hidden">
            Демо-режим · только просмотр
          </div>
        )}

        {active && !focusMode && (
          <Link
            to="/session"
            className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-950/95 px-4 py-2 text-xs backdrop-blur"
          >
            <span className="flex items-center gap-2 text-lime-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-400" />
              Тренировка идёт
            </span>
            <span className="flex items-center gap-2 text-neutral-300">
              <SessionTimer startedAt={active.started_at} className="tabular-nums" />
              <span className="text-neutral-500">Продолжить ›</span>
            </span>
          </Link>
        )}

        <main
          className={`w-full flex-1 px-4 pt-5 lg:mx-auto lg:max-w-3xl lg:px-6 lg:pt-8 lg:pb-12 ${
            focusMode ? "pb-44" : "pb-24"
          }`}
        >
          <Outlet />
        </main>

        <nav
          className={`fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-md border-t border-neutral-800 bg-neutral-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden`}
        >
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              aria-label={label}
              title={label}
              className={({ isActive }) =>
                `flex flex-1 items-center justify-center py-3.5 transition-colors ${
                  isActive ? "text-lime-400" : "text-neutral-500"
                }`
              }
            >
              <Icon className="h-6 w-6" />
            </NavLink>
          ))}
        </nav>
      </div>

      <Toaster />
    </div>
  );
}
