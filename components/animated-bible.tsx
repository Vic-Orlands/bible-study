"use client";

import { useEffect, useRef } from "react";
import styles from "./animated-bible.module.css";

export default function AnimatedBible({ onComplete }: { onComplete: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let cleanup: (() => void) | undefined;

    const complete = () => completeRef.current();
    const handleMotionChange = () => {
      if (reducedMotion.matches) {
        cleanup?.();
        cleanup = undefined;
        complete();
      }
    };

    if (reducedMotion.matches) {
      complete();
      return;
    }

    reducedMotion.addEventListener("change", handleMotionChange);

    import("./bible-scene")
      .then(({ createBibleScene }) => {
        if (disposed || reducedMotion.matches) return;
        cleanup = createBibleScene(host, complete);
      })
      .catch((error: unknown) => {
        console.error("Unable to render the Bible opening animation", error);
        if (!disposed) complete();
      });

    return () => {
      disposed = true;
      cleanup?.();
      reducedMotion.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return (
    <div className={styles.intro} role="img" aria-label="Bible opening to Revelation chapter 22">
      <div ref={hostRef} className={styles.scene} aria-hidden="true" />

    </div>
  );
}
