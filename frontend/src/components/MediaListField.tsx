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

export default function MediaListField({ value, onChange }: Props) {
  const [pending, setPending] = useState<MediaItem["type"] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((item, index) => (
            <div key={`${item.url}-${index}`} className="relative h-16 w-16 overflow-hidden rounded-lg bg-neutral-800">
              {item.type === "video" ? (
                <span className="grid h-full w-full place-items-center text-xs text-neutral-400">видео</span>
              ) : (
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                aria-label="Убрать файл"
                onClick={() => onChange(value.filter((_, position) => position !== index))}
                className="absolute top-0.5 right-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-[10px] text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
