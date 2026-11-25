import { api } from "./client";

export type AnalyticsSummary = {
  workouts_week: number;
  workouts_month: number;
  avg_duration_min: number;
  completion_rate: number;
  filled_rate: number;
  gymnastics_days_month: number;
  gymnastics_streak: number;
  tonnage_month: number;
};

export type VolumePoint = {
  week_start: string;
  tonnage: number;
  sets: number;
};

export type FrequencyPoint = {
  week_start: string;
  sessions: number;
};

export type MuscleBalanceItem = {
  category_id: number;
  name: string;
  sets_count: number;
};

export type ExerciseRecord = {
  exercise_id: number;
  name: string;
  best_weight: number;
  achieved_on: string;
};

export type AnalyticsExercise = {
  exercise_id: number;
  name: string;
  sessions_count: number;
};

export type WeightPoint = {
  date: string;
  max_weight: number;
  avg_weight: number;
};

export async function fetchSummary(): Promise<AnalyticsSummary> {
  const { data } = await api.get<AnalyticsSummary>("/analytics/summary");
  return data;
}

export async function fetchAnalyticsExercises(): Promise<AnalyticsExercise[]> {
  const { data } = await api.get<AnalyticsExercise[]>("/analytics/exercises");
  return data;
}

export async function fetchExerciseWeights(exerciseId: number): Promise<WeightPoint[]> {
  const { data } = await api.get<WeightPoint[]>(`/analytics/exercises/${exerciseId}/weights`);
  return data;
}

export async function fetchVolume(): Promise<VolumePoint[]> {
  const { data } = await api.get<VolumePoint[]>("/analytics/volume");
  return data;
}

export async function fetchFrequency(): Promise<FrequencyPoint[]> {
  const { data } = await api.get<FrequencyPoint[]>("/analytics/frequency");
  return data;
}

export async function fetchMuscleBalance(): Promise<MuscleBalanceItem[]> {
  const { data } = await api.get<MuscleBalanceItem[]>("/analytics/muscle-balance");
  return data;
}

export async function fetchRecords(): Promise<ExerciseRecord[]> {
  const { data } = await api.get<ExerciseRecord[]>("/analytics/records");
  return data;
}
