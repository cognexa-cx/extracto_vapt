// Single source of truth for every spring transition used on the
// Analytics page — components never hard-code stiffness/damping, they
// pull a named preset from here so the whole page's motion feel can be
// tuned in one place.
export const springs = {
  snap: { type: "spring" as const, stiffness: 1218, damping: 70 }, // hover/tap feedback — instant, crisp
  ui: { type: "spring" as const, stiffness: 305, damping: 33 }, // default entrance for cards/controls
  gentle: { type: "spring" as const, stiffness: 110, damping: 20 }, // bigger elements (the main graph)
  lively: { type: "spring" as const, stiffness: 622, damping: 17 }, // toggle/tab switches
  ambient: { type: "spring" as const, stiffness: 43, damping: 13 }, // slow background-y reveals
};

export const stagger = { tight: 0.04, base: 0.08, relaxed: 0.15 };

// Shared entrance variants — cards fade + rise in, staggered by index via
// `custom` on the parent's `initial="hidden" animate="visible"`.
export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...springs.ui, delay: i * stagger.base },
  }),
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { ...springs.gentle, delay: i * stagger.base },
  }),
};
