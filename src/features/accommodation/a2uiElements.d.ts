import type { A2UIRenderer } from '@googlemaps/a2ui/lit'
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

type A2uiSurfaceModel = NonNullable<ReturnType<A2UIRenderer['getSurface']>>

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'a2ui-surface': DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        surface?: A2uiSurfaceModel
      }
      'maui-providers': DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      >
    }
  }
}
