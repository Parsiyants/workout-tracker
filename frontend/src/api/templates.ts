import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { api } from "./client";

export type TemplateItem = {
  exercise_id: number;
  target_sets: number;
  target_reps: number | null;
  target_duration_sec: number | null;
  target_weight: number | null;
};

export type Template = {
  id: number;
  name: string;
  order_index: number;
  exercises: TemplateItem[];
};

export type TemplateInput = {
  name: string;
  exercises: TemplateItem[];
};

export async function fetchTemplates(): Promise<Template[]> {
  const { data } = await api.get<Template[]>("/templates");
  return data;
}

export async function fetchRecommended(): Promise<Template | null> {
  try {
    const { data } = await api.get<Template>("/templates/recommended");
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function createTemplate(payload: TemplateInput): Promise<Template> {
  const { data } = await api.post<Template>("/templates", payload);
  return data;
}

export async function updateTemplate(id: number, payload: TemplateInput): Promise<Template> {
  const { data } = await api.patch<Template>(`/templates/${id}`, payload);
  return data;
}

export async function deleteTemplate(id: number): Promise<void> {
  await api.delete(`/templates/${id}`);
}

export async function reorderTemplates(ids: number[]): Promise<void> {
  await api.put("/templates/order", { ids });
}

export function useTemplates() {
  return useQuery({ queryKey: ["templates"], queryFn: fetchTemplates });
}

export function useRecommendedTemplate() {
  return useQuery({
    queryKey: ["templates", "recommended"],
    queryFn: fetchRecommended,
  });
}
