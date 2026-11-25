import frontSvg from "./muscles/front.svg?raw";
import backSvg from "./muscles/back.svg?raw";

type Props = {
  muscles: string[];
  className?: string;
};

const ACTIVE = "#fb7185";
const IDLE = "#3f3f46";
const RATIO = "660.46 / 1206.46";

/** Наши ключи мышц → группы внутри SVG (вид спереди / сзади). */
const FRONT: Record<string, string[]> = {
  chest: ["chest"],
  traps: ["traps"],
  front_delts: ["front-shoulders"],
  biceps: ["biceps"],
  forearms: ["forearms"],
  abs: ["abdominals"],
  obliques: ["obliques"],
  quads: ["quads"],
  calves: ["calves"],
};

const BACK: Record<string, string[]> = {
  lats: ["lats"],
  traps: ["traps", "traps-middle"],
  mid_back: ["traps-middle"],
  lower_back: ["lowerback"],
  rear_delts: ["rear-shoulders"],
  triceps: ["triceps"],
  forearms: ["forearms"],
  glutes: ["glutes"],
  hamstrings: ["hamstrings"],
  calves: ["calves"],
};

/** Мышцы, которых не видно спереди — значит нужен вид сзади. */
const BACK_ONLY = new Set(["lats", "mid_back", "lower_back", "rear_delts", "triceps", "glutes", "hamstrings"]);

/** Мышцы, которых не видно сзади. */
const FRONT_ONLY = new Set(["chest", "front_delts", "biceps", "abs", "obliques", "quads"]);

const SVG_STYLE = "display:block;height:100%;width:100%";

function paint(svg: string, active: Set<string>) {
  return svg
    .replace("<svg ", `<svg style="${SVG_STYLE}" `)
    .replace(/<g data-m="([a-z-]+)"/g, (tag, id: string) =>
      active.has(id) ? `<g data-m="${id}" style="color:${ACTIVE}"` : tag,
    );
}

function collect(muscles: string[], map: Record<string, string[]>) {
  const ids = new Set<string>();
  for (const key of muscles) map[key]?.forEach((id) => ids.add(id));
  return ids;
}

/** Анатомическая карта: манекен(ы) с подсветкой задействованных мышц. */
export default function MuscleMap({ muscles, className }: Props) {
  const showBack = muscles.some((key) => BACK_ONLY.has(key));
  const showFront = !showBack || muscles.some((key) => FRONT_ONLY.has(key));

  const figures: string[] = [];
  if (showFront) figures.push(paint(frontSvg, collect(muscles, FRONT)));
  if (showBack) figures.push(paint(backSvg, collect(muscles, BACK)));

  return (
    <div
      className={`flex items-stretch justify-center gap-2 ${className ?? ""}`}
      style={{ color: IDLE }}
      role="img"
      aria-label="Задействованные мышцы"
    >
      {figures.map((html, i) => (
        <div
          key={i}
          className="h-full"
          style={{ aspectRatio: RATIO, lineHeight: 0 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ))}
    </div>
  );
}
