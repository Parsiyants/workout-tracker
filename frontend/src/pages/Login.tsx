import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { login } from "../api/auth";
import { errorMessage, setToken } from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      setToken(await login(email, password));
      navigate("/", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Не удалось войти"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <h1 className="text-2xl font-semibold text-neutral-100">Трекер тренировок</h1>
      <p className="mt-1 text-sm text-neutral-400">Тренировки и ежедневные практики</p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-base text-neutral-100 ring-1 ring-neutral-800 outline-none placeholder:text-neutral-600 focus:ring-lime-400"
        />
        <input
          type="password"
          autoComplete="current-password"
          required
          placeholder="пароль"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-base text-neutral-100 ring-1 ring-neutral-800 outline-none placeholder:text-neutral-600 focus:ring-lime-400"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-lime-400 py-3 font-medium text-neutral-950 disabled:opacity-50"
        >
          {pending ? "Подождите…" : "Войти"}
        </button>
      </form>

      <Link to="/demo" className="mt-6 text-center text-sm text-neutral-400">
        Посмотреть демо
      </Link>
    </div>
  );
}
