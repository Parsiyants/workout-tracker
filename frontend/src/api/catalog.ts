import { useQuery } from "@tanstack/react-query";

import { api } from "./client";

export type MetricType = "weight_reps" | "reps" | "time";

export type MediaItem = {
  type: "image" | "gif" | "video";
  url: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string | null;
  parent_id: number | null;
  muscle_keys: string[];
  image_url: string | null;
  order_index: number;
};

export type Exercise = {
  id: number;
  name: string;
  description: string | null;
  category_id: number;
  metric_type: MetricType;
  media: MediaItem[];
};

export type ExerciseInput = Omit<Exercise, "id">;

export function primaryMedia(exercise: Exercise): string | null {
  return exercise.media[0]?.url ?? null;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>("/categories");
  return data;
}

export async function fetchExercises(params: {
  category_id?: number;
  search?: string;
}): Promise<Exercise[]> {
  const { data } = await api.get<Exercise[]>("/exercises", { params });
  return data;
}

export async function fetchExercise(id: number): Promise<Exercise> {
  const { data } = await api.get<Exercise>(`/exercises/${id}`);
  return data;
}

export async function createExercise(payload: ExerciseInput): Promise<Exercise> {
  const { data } = await api.post<Exercise>("/exercises", payload);
  return data;
}

export async function updateExercise(id: number, payload: ExerciseInput): Promise<Exercise> {
  const { data } = await api.patch<Exercise>(`/exercises/${id}`, payload);
  return data;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });
}

export function useExercises(params: { category_id?: number; search?: string }) {
  return useQuery({ queryKey: ["exercises", params], queryFn: () => fetchExercises(params) });
}
