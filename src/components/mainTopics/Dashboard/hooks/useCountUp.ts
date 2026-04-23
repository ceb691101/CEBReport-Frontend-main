import { useEffect, useState } from "react";

export function useCountUp(
  target: number,
  duration = 1400,
  active = true,
  trigger = 0
): number {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active || target === 0) {
      setDisplay(target);
      return;
    }

    setDisplay(0);
    const start = performance.now();
    let animationFrameId: number;

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(easedProgress * target));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [target, duration, active, trigger]);

  return display;
}
