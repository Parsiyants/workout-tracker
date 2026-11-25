import type { MetricType } from "../api/catalog";
import type { TemplateItem } from "../api/templates";

/** «4×10 · 60 кг» / «3×40 с» / «3×12». */
export function formatTarget(item: TemplateItem, metric: MetricType | undefined): string {
  const timed = metric === "time" || (item.target_duration_sec != null && item.target_reps == null);
  if (timed) {
    return `${item.target_sets}×${item.target_duration_sec ?? 0} с`;
  }
  const base = `${item.target_sets}×${item.target_reps ?? 0}`;
  return item.target_weight ? `${base} · ${item.target_weight} кг` : base;
}
