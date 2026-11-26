import axios from "axios";

import { errorMessage, getToken } from "./client";

// Пусто = запросы идут на тот же origin (/files), их проксирует tracker_web.
// Абсолютный адрес нужен только если файлы вынесены на отдельный домен.
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL ?? "";

export type StoredFile = {
  name: string;
  url: string;
  size: number;
  content_type: string;
};

/** Загружает файл в storage и возвращает публичный URL. Только для админа. */
export async function uploadFile(folder: string, file: File): Promise<StoredFile> {
  const form = new FormData();
  form.append("files", file);

  const { data } = await axios.post<{ files: StoredFile[] }>(`${STORAGE_URL}/files`, form, {
    params: { folder },
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!data.files.length) throw new Error(errorMessage(null, "Файл не загрузился"));
  return data.files[0];
}
