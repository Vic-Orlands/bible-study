export const spring = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
};

export const settle = {
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1] as const,
};
