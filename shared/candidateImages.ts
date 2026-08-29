import type { CandidateSnapshot, ReadPageOutput } from './foundTools'

export interface CandidateSourceImage {
  readonly alt: string
  readonly sourceRef: string
  readonly url: string
}

const NON_PROPERTY_IMAGE_PATTERN =
  /(?:^|[/_.-])(avatar|badge|favicon|icon|logo|marker|placeholder|profile|sprite|tile)(?:[/_.-]|$)/i

function isUsablePropertyImage(value: string): boolean {
  try {
    const url = new URL(value)
    const searchable = `${url.pathname}${url.search}`
    return (
      !url.pathname.toLowerCase().endsWith('.svg') &&
      !NON_PROPERTY_IMAGE_PATTERN.test(searchable)
    )
  } catch {
    return false
  }
}

function comparableUrl(value: string): string {
  const url = new URL(value)
  url.hash = ''
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/$/, '')
  return url.href
}

export function candidateSourceImages(
  candidate: CandidateSnapshot,
  pages: readonly ReadPageOutput[],
  limit = 6,
): CandidateSourceImage[] {
  const pagesByUrl = new Map<string, ReadPageOutput>()
  for (const page of pages) pagesByUrl.set(comparableUrl(page.url), page)

  const seen = new Set<string>()
  const images: CandidateSourceImage[] = []
  for (const source of candidate.sources) {
    const page = pagesByUrl.get(comparableUrl(source.url))
    if (!page) continue

    for (const url of page.images) {
      if (images.length === limit) return images
      if (seen.has(url) || !isUsablePropertyImage(url)) continue
      seen.add(url)
      images.push({
        alt: `${candidate.title} — source photo`,
        sourceRef: source.ref,
        url,
      })
    }
  }

  return images
}
