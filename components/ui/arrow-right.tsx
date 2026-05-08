"use client";

import { motion, useAnimation, useReducedMotion } from "motion/react";
import type { HTMLAttributes, MouseEvent } from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { cn } from "@/lib/utils";
import { useParentHoverAnimation } from "@/components/ui/use-parent-hover-animation";

export interface ArrowRightIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ArrowRightIconProps extends HTMLAttributes<HTMLDivElement> {
  animateOnParentHover?: boolean;
  size?: number;
}

const SPRING_CONFIG = {
  type: "spring" as const,
  stiffness: 300,
  damping: 12,
};

const DEFAULT_SHAFT_PATH = `
  M 5,12
  h 14
`;

const EXTENDED_SHAFT_PATH = `
  M 5,12
  h 17
`;

const DEFAULT_TIP_PATH = `
  M 12,5
  l 7,7
  l -7,7
`;

const EXTENDED_TIP_PATH = `
  M 15,7
  l 7,5
  l -7,5
`;

const ArrowRightIcon = forwardRef<ArrowRightIconHandle, ArrowRightIconProps>(
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
    const tipControls = useAnimation();
    const shouldReduceMotion = useReducedMotion();
    const isControlledRef = useRef(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const revertTimeoutRef = useRef<number | null>(null);

    const stopAnimation = useCallback(() => {
      if (revertTimeoutRef.current) {
        window.clearTimeout(revertTimeoutRef.current);
        revertTimeoutRef.current = null;
      }

      controls.start({
        d: DEFAULT_SHAFT_PATH,
        transition: SPRING_CONFIG,
      });
      tipControls.start({
        d: DEFAULT_TIP_PATH,
        transition: SPRING_CONFIG,
      });
    }, [controls, tipControls]);

    const startAnimation = useCallback(() => {
      if (shouldReduceMotion) {
        return;
      }

      if (revertTimeoutRef.current) {
        window.clearTimeout(revertTimeoutRef.current);
      }

      controls.start({
        d: EXTENDED_SHAFT_PATH,
        transition: SPRING_CONFIG,
      });
      tipControls.start({
        d: EXTENDED_TIP_PATH,
        transition: SPRING_CONFIG,
      });
      revertTimeoutRef.current = window.setTimeout(() => {
        controls.start({
          d: DEFAULT_SHAFT_PATH,
          transition: SPRING_CONFIG,
        });
        tipControls.start({
          d: DEFAULT_TIP_PATH,
          transition: SPRING_CONFIG,
        });
      }, 150);
    }, [controls, shouldReduceMotion, tipControls]);

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

    useEffect(() => {
      return () => {
        if (revertTimeoutRef.current) {
          window.clearTimeout(revertTimeoutRef.current);
        }
      };
    }, []);

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
          return;
        }

        onMouseLeave?.(e);
      },
      [onMouseLeave],
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
          aria-hidden="true"
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
          <motion.path
            animate={controls}
            className="shaft"
            d={DEFAULT_SHAFT_PATH}
          />
          <motion.path
            animate={tipControls}
            className="tip"
            d={DEFAULT_TIP_PATH}
          />
        </svg>
      </div>
    );
  },
);

ArrowRightIcon.displayName = "ArrowRightIcon";

export { ArrowRightIcon };
