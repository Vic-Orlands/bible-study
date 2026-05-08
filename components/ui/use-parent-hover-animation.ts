"use client";

import type { RefObject } from "react";
import { useEffect } from "react";

export function useParentHoverAnimation<T extends HTMLElement>({
  disabled = false,
  enabled,
  onHover,
  targetRef,
}: {
  disabled?: boolean;
  enabled?: boolean;
  onHover: () => void;
  targetRef: RefObject<T | null>;
}) {
  useEffect(() => {
    if (!enabled || disabled) {
      return;
    }

    const parent = targetRef.current?.parentElement;

    if (!parent) {
      return;
    }

    parent.addEventListener("pointerenter", onHover);

    return () => {
      parent.removeEventListener("pointerenter", onHover);
    };
  }, [disabled, enabled, onHover, targetRef]);
}
