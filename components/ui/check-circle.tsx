"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes, MouseEvent } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";
import { useParentHoverAnimation } from "@/components/ui/use-parent-hover-animation";

export interface CheckCircleIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CheckCircleIconProps extends HTMLAttributes<HTMLDivElement> {
  animateOnParentHover?: boolean;
  size?: number;
}

const PATH_VARIANTS: Variants = {
  normal: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
    transition: {
      pathLength: { duration: 0.4, ease: "easeInOut" },
      opacity: { duration: 0.4, ease: "easeInOut" },
    },
  },
};

const CheckCircleIcon = forwardRef<CheckCircleIconHandle, CheckCircleIconProps>(
  (
    {
      animateOnParentHover = false,
      onMouseEnter,
      onMouseLeave,
      className,
      size = 28,
      ...props
    },
    ref,
  ) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const startAnimation = useCallback(
      () => controls.start("animate"),
      [controls],
    );
    const stopAnimation = useCallback(
      () => controls.start("normal"),
      [controls],
    );

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation,
        stopAnimation,
      };
    }, [startAnimation, stopAnimation]);

    useParentHoverAnimation({
      disabled: isControlledRef.current,
      enabled: animateOnParentHover,
      onHover: startAnimation,
      targetRef: rootRef,
    });

    const handleMouseEnter = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else if (!animateOnParentHover) {
          startAnimation();
        } else {
          onMouseEnter?.(e);
        }
      },
      [animateOnParentHover, onMouseEnter, startAnimation],
    );

    const handleMouseLeave = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else if (!animateOnParentHover) {
          stopAnimation();
        } else {
          onMouseLeave?.(e);
        }
      },
      [animateOnParentHover, onMouseLeave, stopAnimation],
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        ref={rootRef}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          <motion.path
            animate={controls}
            d="M9 12.75 11.25 15 15 9.75"
            variants={PATH_VARIANTS}
          />
        </svg>
      </div>
    );
  }
);

CheckCircleIcon.displayName = "CheckCircleIcon";

export { CheckCircleIcon };
