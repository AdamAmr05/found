import { useState } from 'react'

import { CandidateImageFallback } from '../accommodation/CandidateImageFallback'

export function CandidateThumbnail({
  alt = '',
  imageUrl,
}: {
  readonly alt?: string
  readonly imageUrl?: string | undefined
}) {
  const [failedUrl, setFailedUrl] = useState<string>()
  const showImage = imageUrl && failedUrl !== imageUrl

  if (!showImage) return <CandidateImageFallback compact />

  return (
    <img
      alt={alt}
      className="size-full object-cover"
      onError={() => setFailedUrl(imageUrl)}
      src={imageUrl}
    />
  )
}
