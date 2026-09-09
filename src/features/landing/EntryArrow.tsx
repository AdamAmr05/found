export function EntryArrow() {
  return (
    <span
      aria-hidden="true"
      className="relative block size-20 shrink-0 overflow-hidden"
    >
      <span className="landing-arrow-track absolute inset-0">
        <svg
          className="absolute top-0 -left-20 h-20 w-40"
          viewBox="0 0 48 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable="false"
        >
          <path d="M5 12h14m-7-7 7 7-7 7" />
          <path d="M29 12h14m-7-7 7 7-7 7" />
        </svg>
      </span>
    </span>
  )
}
