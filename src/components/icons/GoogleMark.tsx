import type { ImgHTMLAttributes } from 'react'

// Google's current gradient Super G from its official 2026 sign-in asset bundle.
export function GoogleMark(props: ImgHTMLAttributes<HTMLImageElement>) {
  return <img {...props} alt="" aria-hidden src="/google-g.svg" />
}
