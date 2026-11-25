import { api } from "./client";
import type { TemplateItem } from "./templates";

export type GymnasticsLog = {
  log_date: string;
  completed: boolean;
  notes: string | null;
};

export type GymnasticsProgram = {
  id: number;
  name: string;
  order_index: number;
  exercises: TemplateItem[];
};

export type GymnasticsProgramInput = {
  name: string;
  exercises: TemplateItem[];
};

export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export async function fetchGymnasticsPrograms(): Promise<GymnasticsProgram[]> {
  const { data } = await api.get<GymnasticsProgram[]>("/gymnastics/programs");
  return data;
}

export async function createGymnasticsProgram(
  payload: GymnasticsProgramInput,
): Promise<GymnasticsProgram> {
  const { data } = await api.post<GymnasticsProgram>("/gymnastics/programs", payload);
  return data;
}

export async function updateGymnasticsProgram(
  id: number,
  payload: GymnasticsProgramInput,
): Promise<GymnasticsProgram> {
  const { data } = await api.patch<GymnasticsProgram>(`/gymnastics/programs/${id}`, payload);
  return data;
}

export async function deleteGymnasticsProgram(id: number): Promise<void> {
  await api.delete(`/gymnastics/programs/${id}`);
}

export async function fetchGymnasticsLogs(): Promise<GymnasticsLog[]> {
  const { data } = await api.get<GymnasticsLog[]>("/gymnastics/logs");
  return data;
}

export async function saveGymnasticsLog(
  logDate: string,
  payload: { completed: boolean; notes: string | null },
): Promise<GymnasticsLog> {
  const { data } = await api.put<GymnasticsLog>(`/gymnastics/logs/${logDate}`, payload);
  return data;
}
