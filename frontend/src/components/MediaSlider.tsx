import { useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

import type { MediaItem } from "../api/catalog";

type Props = {
  media: MediaItem[];
  className?: string;
  rounded?: string;
  compact?: boolean;
  fit?: "cover" | "contain";
};

export default function MediaSlider({
  media,
  className = "",
  rounded = "rounded-xl",
  compact = false,
  fit = "cover",
}: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; active: boolean }>({ x: 0, left: 0, active: false });
  const suppressClick = useRef(false);
  const [index, setIndex] = useState(0);

  function handleScroll() {
    const element = scroller.current;
    if (!element || element.clientWidth === 0) return;
    const next = Math.round(element.scrollLeft / element.clientWidth);
    if (next !== index) setIndex(Math.max(0, Math.min(media.length - 1, next)));
  }

  function goTo(next: number) {
    const element = scroller.current;
    if (!element) return;
    const target = Math.max(0, Math.min(media.length - 1, next));
    element.scrollTo({ left: target * element.clientWidth, behavior: "smooth" });
    setIndex(target);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const element = scroller.current;
    if (!element || event.pointerType === "touch") return;
    drag.current = { x: event.clientX, left: element.scrollLeft, active: true };
    element.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const element = scroller.current;
    if (!element || !drag.current.active) return;
    const delta = event.clientX - drag.current.x;
    if (Math.abs(delta) > 4) {
      element.scrollLeft = drag.current.left - delta;
      suppressClick.current = true;
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const element = scroller.current;
    drag.current.active = false;
    if (!element) return;
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    if (element.clientWidth > 0) goTo(Math.round(element.scrollLeft / element.clientWidth));
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 50);
  }

  function onClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    }
  }

  if (media.length === 0) {
    return (
      <div className={`grid place-items-center bg-neutral-800 text-neutral-600 ${rounded} ${className}`}>
        —
      </div>
    );
  }

  const many = media.length > 1;

  return (
    <div className={`group relative overflow-hidden bg-neutral-800 ${rounded} ${className}`}>
      <div
        ref={scroller}
        onScroll={handleScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        onKeyDown={onKeyDown}
        tabIndex={many ? 0 : -1}
        aria-label={many ? "Галерея упражнения" : undefined}
        className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
      >
        {media.map((item, position) => (
          <div key={`${item.url}-${position}`} className="h-full w-full shrink-0 snap-center">
            {item.type === "video" ? (
              <div className="relative h-full w-full">
                <video
                  src={item.url}
                  className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
                  controls={!compact}
                  muted={compact}
                  playsInline
                  preload="metadata"
                />
                {compact && (
                  <span className="absolute inset-0 grid place-items-center text-lg text-white/80">▶</span>
                )}
              </div>
            ) : (
              <img
                src={item.url}
                alt=""
                draggable={false}
                className={`h-full w-full select-none ${fit === "contain" ? "object-contain" : "object-cover"}`}
                loading="lazy"
              />
            )}
          </div>
        ))}
      </div>

      {many && (
        <>
          {!compact && (
            <>
              <SliderButton side="left" disabled={index === 0} onClick={() => goTo(index - 1)} />
              <SliderButton
                side="right"
                disabled={index === media.length - 1}
                onClick={() => goTo(index + 1)}
              />
            </>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-1.5 flex justify-center gap-1">
            {media.map((_, position) => (
              <span
                key={position}
                className={`h-1.5 rounded-full transition-all ${
                  position === index ? "w-4 bg-lime-400" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SliderButton({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Предыдущее медиа" : "Следующее медиа"}
      onClick={onClick}
      disabled={disabled}
      className={`absolute top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-neutral-950/70 text-sm text-neutral-100 ring-1 ring-neutral-700 backdrop-blur transition-opacity hover:bg-neutral-950 disabled:opacity-0 ${
        side === "left" ? "left-1.5" : "right-1.5"
      } opacity-0 group-hover:opacity-100 focus-visible:opacity-100`}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}
