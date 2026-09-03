import type { SVGProps } from 'react'

// Monochrome Google "G". The consumer owns size and color.
export function GoogleMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden
      fill="currentColor"
      focusable="false"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M21.35 11.1H12v2.9h5.35c-.23 1.35-1.6 3.95-5.35 3.95-3.22 0-5.85-2.67-5.85-5.95S8.78 6.05 12 6.05c1.83 0 3.06.78 3.77 1.45l2.57-2.48C16.75 3.52 14.6 2.5 12 2.5 6.75 2.5 2.5 6.75 2.5 12s4.25 9.5 9.5 9.5c5.48 0 9.12-3.85 9.12-9.28 0-.62-.07-1.1-.17-1.62Z" />
    </svg>
  )
}
