import { useState } from "react";
import type { ChangeEvent } from "react";

import type { MediaItem } from "../api/catalog";
import { errorMessage } from "../api/client";
import { uploadFile } from "../api/storage";

type Props = {
  value: MediaItem[];
  onChange: (media: MediaItem[]) => void;
};

const ADDERS: { type: MediaItem["type"]; label: string; accept: string }[] = [
  { type: "image", label: "＋ фото", accept: "image/png,image/jpeg,image/webp" },
  { type: "gif", label: "＋ gif", accept: "image/gif" },
  { type: "video", label: "＋ видео", accept: "video/*" },
];

const TYPE_LABEL: Record<MediaItem["type"], string> = {
  image: "Фото",
  gif: "GIF",
  video: "Видео",
};

export default function MediaListField({ value, onChange }: Props) {
  const [pending, setPending] = useState<MediaItem["type"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  async function upload(event: ChangeEvent<HTMLInputElement>, type: MediaItem["type"]) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    setPending(type);
    setError(null);
    try {
      const stored = await uploadFile("exercises", file);
      onChange([...value, { type, url: stored.url }]);
    } catch (err) {
      setError(errorMessage(err, "Не удалось загрузить файл"));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="rounded-xl bg-neutral-900 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-300">Медиа</p>
        <div className="flex flex-wrap justify-end gap-2">
          {ADDERS.map((adder) => (
            <label
              key={adder.type}
              className="cursor-pointer rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200"
            >
              {pending === adder.type ? "Загрузка…" : adder.label}
              <input
                type="file"
                accept={adder.accept}
                className="hidden"
                disabled={pending !== null}
                onChange={(event) => upload(event, adder.type)}
              />
            </label>
          ))}
        </div>
      </div>

      {value.length === 0 ? (
        <p className="mt-2 text-xs text-neutral-500">Пока нет файлов</p>
      ) : (
        <>
          <p className="mt-3 text-xs text-neutral-500">
            Первый файл — обложка. Стрелками меняйте очерёдность.
          </p>
          <div className="mt-2 space-y-2">
            {value.map((item, index) => (
              <div
                key={`${item.url}-${index}`}
                className="flex items-center gap-2 rounded-lg bg-neutral-800/70 p-2"
              >
                <span className="w-4 shrink-0 text-center text-xs tabular-nums text-neutral-500">
                  {index + 1}
                </span>
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-900">
                  {item.type === "video" ? (
                    <video
                      src={item.url}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate text-xs text-neutral-400">
                  {TYPE_LABEL[item.type]}
                  {index === 0 && <span className="ml-1 text-lime-400">обложка</span>}
                </span>
                <button
                  type="button"
                  aria-label="Выше"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-700 text-sm text-neutral-100 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Ниже"
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-700 text-sm text-neutral-100 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Убрать файл"
                  onClick={() => onChange(value.filter((_, position) => position !== index))}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-800 text-sm text-red-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
