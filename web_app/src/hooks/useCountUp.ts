import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 up to `target` over `duration` ms using an
 * ease-out curve — used for the Analytics KPI cards so they count up on
 * load/refresh instead of just popping in.
 */
export default function useCountUp(target: any, duration = 800) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const end = Number(target) || 0;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * end));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}
