/** Minimal 1.5px line icons for structural affordances only (no decorative icons). */
const PATHS = {
  back: 'M15 18l-6-6 6-6',
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M18 15l-6-6-6 6',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
