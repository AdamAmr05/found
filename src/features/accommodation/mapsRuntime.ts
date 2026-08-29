import { themeStyleSheet } from '@googlemaps/a2ui/lit'
import { useEffect, useState } from 'react'

const MAPS_SCRIPT_ID = 'google-maps-js-api'
const MAPS_LIBRARIES = [
  'maps',
  'marker',
  'places',
  'maps3d',
  'routes',
  'streetView',
  'geometry',
  'elevation',
]

declare global {
  interface Window {
    google?: typeof google
    __foundMapsReady?: () => void
  }
}

let runtimePromise: Promise<void> | undefined

function mapsImportLibrary(): typeof google.maps.importLibrary | undefined {
  return window.google?.maps.importLibrary
}

function loadMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // The script's load event fires before the bootstrap finishes defining
    // importLibrary, so readiness comes from the loader's callback parameter.
    if (mapsImportLibrary()) {
      resolve()
      return
    }
    const previousReady = window.__foundMapsReady
    window.__foundMapsReady = () => {
      previousReady?.()
      resolve()
    }
    // Hot reloads recreate this module while the injected script survives.
    const existing = document.getElementById(MAPS_SCRIPT_ID)
    if (existing instanceof HTMLScriptElement) {
      existing.addEventListener('error', () =>
        reject(new Error('The Google Maps script failed to load')),
      )
      return
    }
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      reject(new Error('VITE_GOOGLE_MAPS_API_KEY is required to render maps'))
      return
    }
    const script = document.createElement('script')
    script.id = MAPS_SCRIPT_ID
    script.async = true
    script.src = `https://maps.googleapis.com/maps/api/js?v=alpha&key=${encodeURIComponent(apiKey)}&libraries=${MAPS_LIBRARIES.join(',')}&loading=async&callback=__foundMapsReady`
    script.addEventListener('error', () =>
      reject(new Error('The Google Maps script failed to load')),
    )
    document.head.append(script)
  })
}

async function loadMapsLibraries(): Promise<void> {
  await loadMapsScript()
  const importLibrary = mapsImportLibrary()
  if (!importLibrary) {
    throw new Error('The Google Maps bootstrap did not initialize')
  }
  // The async bootstrap only registers libraries; each one loads on demand,
  // and the map components assume they are already present.
  await Promise.all(MAPS_LIBRARIES.map((library) => importLibrary(library)))
}

function ensureMapsRuntime(): Promise<void> {
  if (!runtimePromise) {
    if (!document.adoptedStyleSheets.includes(themeStyleSheet)) {
      document.adoptedStyleSheets = [
        ...document.adoptedStyleSheets,
        themeStyleSheet,
      ]
    }
    const loading = loadMapsLibraries()
    // A failed load clears the cached promise so a later scene can retry.
    loading.catch(() => {
      runtimePromise = undefined
    })
    runtimePromise = loading
  }
  return runtimePromise
}

export type MapsRuntimeState = 'loading' | 'ready' | 'failed'

export function useMapsRuntimeState(): MapsRuntimeState {
  const [state, setState] = useState<MapsRuntimeState>('loading')
  useEffect(() => {
    let cancelled = false
    ensureMapsRuntime().then(
      () => {
        if (!cancelled) setState('ready')
      },
      () => {
        if (!cancelled) setState('failed')
      },
    )
    return () => {
      cancelled = true
    }
  }, [])
  return state
}
