type SkeletonProps = {
  className?: string;
};

/** Базовый плейсхолдер загрузки. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse rounded-lg bg-neutral-800/70 ${className}`} />;
}

/** Скелетон карточки тренировки на главной. */
export function WorkoutCardSkeleton() {
  return (
    <section className="rounded-2xl bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="mt-3 h-6 w-2/3" />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-24 w-16" />
        <Skeleton className="h-24 w-16" />
        <Skeleton className="h-24 w-16" />
      </div>
      <div className="mt-4 space-y-2">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="mt-4 h-11 w-full" />
    </section>
  );
}

/** Скелетон списка строк (каталог, история, пользователи). */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-2xl bg-neutral-900 p-3">
          <Skeleton className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Скелетон карточки с крупным блоком (деталь упражнения, шаг тренировки). */
export function DetailSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-5/6" />
    </div>
  );
}
