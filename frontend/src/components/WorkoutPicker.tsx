import { useTemplates } from "../api/templates";
import { exercisesCount } from "../lib/plural";

type Props = {
  onPick: (templateId: number | null) => void;
  onClose: () => void;
};

/** Выбор тренировки для старта: готовый шаблон или пустая (свои упражнения). */
export default function WorkoutPicker({ onPick, onClose }: Props) {
  const { data: templates = [] } = useTemplates();

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/70 pt-16" onClick={onClose}>
      <div
        className="mx-auto flex max-h-full w-full max-w-md flex-col rounded-t-3xl bg-neutral-950 ring-1 ring-neutral-800"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-base font-medium">Новая тренировка</h2>
          <button type="button" onClick={onClose} className="px-2 text-neutral-500">
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 pt-1 pb-[calc(env(safe-area-inset-bottom)+20px)]">
          <button
            type="button"
            onClick={() => onPick(null)}
            className="flex w-full items-center justify-between gap-3 rounded-xl bg-neutral-900 px-3 py-3 text-left ring-1 ring-neutral-800 active:bg-neutral-800"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-neutral-100">Своя тренировка</span>
              <span className="block text-xs text-neutral-500">пустая — упражнения добавите внутри</span>
            </span>
            <span className="shrink-0 text-lime-400">＋</span>
          </button>

          {templates.length > 0 && (
            <p className="px-3 pt-3 pb-1 text-xs tracking-wide text-neutral-500 uppercase">
              Готовые тренировки
            </p>
          )}

          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onPick(template.id)}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left active:bg-neutral-900"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-neutral-100">{template.name}</span>
                <span className="block text-xs text-neutral-500">
                  {exercisesCount(template.exercises.length)}
                </span>
              </span>
              <span className="shrink-0 text-lime-400">›</span>
            </button>
          ))}

          {templates.length === 0 && (
            <p className="px-3 py-4 text-sm text-neutral-500">
              Шаблонов ещё нет — начните со своей тренировки.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
