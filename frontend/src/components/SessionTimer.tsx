import { useEffect, useState } from "react";

type Props = {
  startedAt: string;
  className?: string;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Секундомер с момента начала тренировки. */
export default function SessionTimer({ startedAt, className }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const text = hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;

  return <span className={className}>{text}</span>;
}
