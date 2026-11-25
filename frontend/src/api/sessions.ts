import axios from "axios";

import { api } from "./client";
import type { MetricType } from "./catalog";

export type SessionSet = {
  weight: number | null;
  reps: number | null;
  duration_sec: number | null;
};

export type SessionItem = {
  exercise_id: number;
  name: string;
  metric_type: MetricType;
  completed: boolean;
  notes: string | null;
  sets: SessionSet[];
  target_sets: number | null;
  target_reps: number | null;
  target_duration_sec: number | null;
  target_weight: number | null;
};

export type WorkoutSession = {
  id: number;
  template_id: number | null;
  template_name: string;
  items: SessionItem[];
  started_at: string;
  finished_at: string | null;
};

export type SessionItemPatch = Partial<Pick<SessionItem, "completed" | "notes" | "sets">>;

export type SessionListItem = {
  id: number;
  template_name: string;
  finished_at: string;
  total_items: number;
  completed_items: number;
  duration_min: number;
  tonnage: number;
  category_ids: number[];
};

export async function fetchSessions(): Promise<SessionListItem[]> {
  const { data } = await api.get<SessionListItem[]>("/sessions");
  return data;
}

export async function fetchSession(sessionId: number): Promise<WorkoutSession> {
  const { data } = await api.get<WorkoutSession>(`/sessions/${sessionId}`);
  return data;
}

export async function fetchActiveSession(): Promise<WorkoutSession | null> {
  const { data } = await api.get<WorkoutSession | null>("/sessions/active");
  return data;
}

export async function startSession(templateId: number | null): Promise<WorkoutSession> {
  const { data } = await api.post<WorkoutSession>("/sessions", { template_id: templateId });
  return data;
}

export async function updateSessionItem(
  sessionId: number,
  index: number,
  patch: SessionItemPatch,
): Promise<WorkoutSession> {
  const { data } = await api.patch<WorkoutSession>(`/sessions/${sessionId}/items/${index}`, patch);
  return data;
}

export async function addSessionItem(sessionId: number, exerciseId: number): Promise<WorkoutSession> {
  const { data } = await api.post<WorkoutSession>(`/sessions/${sessionId}/items`, {
    exercise_id: exerciseId,
  });
  return data;
}

export async function finishSession(sessionId: number): Promise<WorkoutSession> {
  const { data } = await api.post<WorkoutSession>(`/sessions/${sessionId}/finish`);
  return data;
}

export function isConflict(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409;
}
