import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { demoLogin } from "../api/auth";
import { errorMessage, setToken } from "../api/client";

export default function Demo() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    demoLogin()
      .then((token) => {
        if (cancelled) return;
        setToken(token);
        navigate("/", { replace: true });
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Демо недоступно"));
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 px-5">
        <p className="text-sm text-red-400">{error}</p>
        <Link to="/login" className="text-sm text-lime-400">
          ← К входу
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md items-center justify-center px-5 text-sm text-neutral-400">
      Открываем демо…
    </div>
  );
}
