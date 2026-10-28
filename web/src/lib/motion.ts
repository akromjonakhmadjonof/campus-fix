import type { Variants, Transition } from "motion/react";
export const quickTransition: Transition = { duration: 0.16, ease: "easeOut" };
export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: quickTransition },
};
