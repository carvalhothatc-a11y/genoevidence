"use client";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** Motion respeita prefers-reduced-motion (transformações viram cortes; opacidade é mantida). */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}>
      {children}
    </MotionConfig>
  );
}
