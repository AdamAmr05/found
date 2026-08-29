import type { MapCamera3D } from './map3dScene'

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function setCamera(
  map: google.maps.maps3d.Map3DElement,
  camera: MapCamera3D,
): void {
  map.center = camera.center
  map.range = camera.range
  map.tilt = camera.tilt
  map.heading = camera.heading
}

export function flyTo(
  map: google.maps.maps3d.Map3DElement,
  camera: MapCamera3D,
  durationMillis: number,
): Promise<void> {
  if (prefersReducedMotion()) {
    setCamera(map, camera)
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    map.addEventListener('gmp-animationend', () => resolve(), { once: true })
    map.flyCameraTo({ endCamera: camera, durationMillis })
  })
}

export function orbit(
  map: google.maps.maps3d.Map3DElement,
  camera: MapCamera3D,
  durationMillis: number,
): void {
  if (prefersReducedMotion()) {
    setCamera(map, camera)
    return
  }
  map.flyCameraAround({ camera, durationMillis, repeatCount: 1 })
}

export function stopFlight(map: google.maps.maps3d.Map3DElement): void {
  map.stopCameraAnimation()
}

// The photorealistic scene streams finer mesh tiles after the camera settles;
// waiting for the steady signal lets an orbit start over sharp geometry.
export function waitForSteady(
  map: google.maps.maps3d.Map3DElement,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      map.removeEventListener('gmp-steadychange', onSteady)
      resolve()
    }
    const onSteady: EventListener = (event) => {
      if (
        event instanceof google.maps.maps3d.SteadyChangeEvent &&
        event.isSteady
      ) {
        finish()
      }
    }
    map.addEventListener('gmp-steadychange', onSteady)
    setTimeout(finish, timeoutMs)
  })
}
