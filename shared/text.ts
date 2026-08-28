export function truncateText(value: string, maximumLength: number): string {
  if (value.length <= maximumLength) return value

  let end = maximumLength
  const finalCodePoint = value.codePointAt(end - 1)
  if (finalCodePoint !== undefined && finalCodePoint > 0xffff) {
    end -= 1
  }
  return value.slice(0, end)
}
