export type ChangedSpan = {
  before: string
  changed: string
  after: string
}

export function changedSpan(previous: string, next: string): ChangedSpan {
  if (previous === next) return { before: next, changed: '', after: '' }

  let prefixLength = 0
  const sharedLength = Math.min(previous.length, next.length)
  while (
    prefixLength < sharedLength &&
    previous[prefixLength] === next[prefixLength]
  ) {
    prefixLength += 1
  }

  let suffixLength = 0
  while (
    suffixLength < sharedLength - prefixLength &&
    previous[previous.length - 1 - suffixLength] ===
      next[next.length - 1 - suffixLength]
  ) {
    suffixLength += 1
  }

  return {
    before: next.slice(0, prefixLength),
    changed: next.slice(prefixLength, next.length - suffixLength),
    after: suffixLength === 0 ? '' : next.slice(next.length - suffixLength),
  }
}
