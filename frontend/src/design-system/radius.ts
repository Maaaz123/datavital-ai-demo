export const radius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;
