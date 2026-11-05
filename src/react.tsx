import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createBend } from "./core";
import type { BendInstance, BendOptions, BendState, Phase } from "./types";

const BendContext = createContext<BendInstance | null>(null);

export interface BendProps extends BendOptions {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Called every frame the pull changes. Prefer `useBendRef` for reading. */
  onStateChange?: (state: BendState) => void;
}

/**
 * Wraps content and applies the band to that wrapper.
 *
 * Options are read once on mount. Changing them later is a remount, which keeps
 * the runtime free of reconciliation logic it does not need.
 */
export function Bend({ children, className, style, onStateChange, ...options }: BendProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [instance, setInstance] = useState<BendInstance | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  useEffect(() => {
    const target = hostRef.current;
    if (!target) return;

    const bend = createBend(target, optionsRef.current);
    setInstance(bend);

    const unsubscribe = bend.subscribe((state) => {
      onStateChangeRef.current?.(state);
    });

    return () => {
      unsubscribe();
      bend.destroy();
    };
  }, []);

  return (
    <BendContext.Provider value={instance}>
      <div ref={hostRef} className={className} style={style}>
        {children}
      </div>
    </BendContext.Provider>
  );
}

export function useBend(): BendInstance | null {
  return useContext(BendContext);
}

/**
 * Re-renders only when the phase changes, not per frame. Use this to swap
 * styles or classes, never to read the pull.
 */
export function useBendPhase(): Phase {
  const bend = useBend();
  return useSyncExternalStore(
    (notify) => (bend ? bend.subscribe(notify) : () => {}),
    () => bend?.state.phase ?? "idle",
    () => "idle" as Phase,
  );
}

/**
 * Zero re-render access to the live pull. The object is mutated in place, so
 * read it inside rAF or a GSAP ticker instead of during render.
 */
export function useBendRef(): React.RefObject<BendState> {
  const bend = useBend();
  const ref = useRef<{ -readonly [K in keyof BendState]: BendState[K] }>({
    pull: 0,
    velocity: 0,
    phase: "idle",
  });

  useEffect(() => {
    if (!bend) return;

    const live = ref.current;
    live.pull = bend.state.pull;
    live.velocity = bend.state.velocity;
    live.phase = bend.state.phase;

    return bend.subscribe((state) => {
      live.pull = state.pull;
      live.velocity = state.velocity;
      live.phase = state.phase;
    });
  }, [bend]);

  return ref;
}

export type { BendInstance, BendOptions, BendState, Phase };
