import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { createUser, fetchMe, fetchUsers } from "../api/auth";
import { errorMessage } from "../api/client";
import { ListSkeleton } from "../components/Skeleton";
import { toast } from "../store/toast";

export default function Users() {
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: Boolean(me?.is_admin),
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const create = useMutation({
    mutationFn: () => createUser(email.trim(), password),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(`Пользователь ${user.email} создан`);
      setEmail("");
      setPassword("");
    },
    onError: (error) => toast.error(errorMessage(error, "Не удалось создать пользователя")),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      toast.error("Укажите email");
      return;
    }
    if (password.length < 8) {
      toast.error("Пароль — минимум 8 символов");
      return;
    }
    create.mutate();
  }

  if (me && !me.is_admin) {
    return (
      <div className="space-y-3">
        <p className="text-neutral-400">Раздел доступен только администратору.</p>
        <Link to="/" className="text-sm text-lime-400">
          ← На главную
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/" className="text-sm text-neutral-400">
        ← Главная
      </Link>

      <h1 className="text-2xl font-semibold">Пользователи</h1>

      <form onSubmit={submit} noValidate className="space-y-2 rounded-2xl bg-neutral-900 p-4">
        <p className="text-xs tracking-wide text-neutral-500 uppercase">Новый пользователь</p>
        <input
          type="email"
          inputMode="email"
          required
          placeholder="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl bg-neutral-950 px-4 py-3 text-base text-neutral-100 ring-1 ring-neutral-800 outline-none placeholder:text-neutral-600 focus:ring-lime-400"
        />
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="пароль (минимум 8 символов)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl bg-neutral-950 px-4 py-3 text-base text-neutral-100 ring-1 ring-neutral-800 outline-none placeholder:text-neutral-600 focus:ring-lime-400"
        />
        <button
          type="submit"
          disabled={create.isPending}
          className="w-full rounded-xl bg-lime-400 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-lime-300 disabled:opacity-50"
        >
          {create.isPending ? "Создание…" : "Создать"}
        </button>
      </form>

      {isLoading && <ListSkeleton rows={3} />}

      <ul className="space-y-1.5">
        {users.map((user) => (
          <li
            key={user.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-neutral-900 px-4 py-3"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-neutral-100">{user.email}</span>
              <span className="block text-xs text-neutral-500">
                {new Date(user.created_at).toLocaleDateString("ru-RU")}
              </span>
            </span>
            <span className="flex shrink-0 gap-1 text-xs">
              {user.is_admin && (
                <span className="rounded-full bg-lime-400/15 px-2 py-0.5 text-lime-300">админ</span>
              )}
              {user.is_demo && (
                <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-amber-300">демо</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
