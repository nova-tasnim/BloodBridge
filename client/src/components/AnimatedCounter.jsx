import { useEffect, useRef, useState } from 'react';

/**
 * Ticks a number up from 0 to `value` whenever `value` changes.
 * Used by LiveStatsBar and Hero for the "wow" stat animation.
 */
export default function AnimatedCounter({ value = 0, duration = 900 }) {
  const [display, setDisplay] = useState(0);
  const frame = useRef(null);
  const startValue = useRef(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const start = startValue.current;
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      setDisplay(current);

      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        startValue.current = target;
      }
    }

    frame.current = requestAnimationFrame(tick);
    return () => frame.current && cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span>{display.toLocaleString()}</span>;
}
