export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 4c5 0 9 3.6 9 9 0 3.4-2 6.2-5.2 7.6l1.7 5.4-5-3.2c-.4.1-.9.1-1.5.1-5 0-9-3.6-9-9s4-9.9 10-9.9Z"
        fill="var(--color-accent)"
      />
      <circle cx="19.5" cy="11.5" r="1.6" fill="white" />
      <path
        d="M9 15c-2.5 1-4 3.2-4 5.6 0 1 .5 1.8 1.4 1.8.8 0 1.2-.5 1.6-1.3.6-1.3 1.6-2.4 3-3.1"
        stroke="var(--color-teal)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
