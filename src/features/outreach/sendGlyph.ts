// Flight path adapted from tw-connect's PaperPlaneAnimatedIcon. The SVG keeps
// its 256-unit view box, so this motion stays inside the existing 16px icon slot.
export function animateSendGlyph(button: HTMLButtonElement): void {
  if (
    button.disabled ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return

  const plane = button.querySelector('.outreach-send-plane')
  if (
    !plane ||
    plane.getAnimations().some((animation) => animation.playState === 'running')
  )
    return

  // Let each flight land even if the pointer leaves; restarting or cancelling
  // midway would snap the plane back into view.
  plane.animate(
    [
      { offset: 0, transform: 'translate(0, 0) rotate(0deg)' },
      {
        offset: 0.09,
        transform: 'translate(-12px, 12px) rotate(-4deg)',
        easing: 'cubic-bezier(0.19, 1, 0.22, 1)',
      },
      { offset: 0.35, transform: 'translate(300px, -300px) rotate(7deg)' },
      { offset: 0.3501, transform: 'translate(-280px, 220px) rotate(7deg)' },
      { offset: 0.46, transform: 'translate(-280px, 220px) rotate(7deg)' },
      {
        offset: 0.82,
        transform: 'translate(8px, -6px) rotate(-1deg)',
        easing: 'cubic-bezier(0.25, 0.8, 0.3, 1)',
      },
      { offset: 0.92, transform: 'translate(-3px, 3px) rotate(0.5deg)' },
      { offset: 1, transform: 'translate(0, 0) rotate(0deg)' },
    ],
    { duration: 1300, easing: 'ease' },
  )
}
