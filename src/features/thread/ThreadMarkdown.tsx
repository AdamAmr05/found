import { Streamdown } from 'streamdown'
import { threadLinkSafety } from './ExternalLinkDialog'

export default function ThreadMarkdown({
  streaming,
  text,
}: {
  readonly streaming: boolean
  readonly text: string
}) {
  return (
    <Streamdown
      className="[&_a]:text-heat-100 [&_a]:underline [&_a]:underline-offset-3 [&_blockquote]:my-16 [&_blockquote]:border-l-1 [&_blockquote]:border-border-loud [&_blockquote]:pl-16 [&_blockquote]:text-accent-black [&_blockquote]:not-italic [&_h1]:mt-16 [&_h1]:text-title-h5 [&_h2]:mt-14 [&_h2]:text-label-x-large [&_h3]:mt-12 [&_h3]:text-label-large [&_li]:my-3 [&_li]:pl-2 [&_ol]:my-8 [&_ol]:list-decimal [&_ol]:pl-22 [&_p+p]:mt-8 [&_ul]:my-8 [&_ul]:list-disc [&_ul]:pl-22"
      controls={false}
      linkSafety={threadLinkSafety}
      isAnimating={streaming}
      mode={streaming ? 'streaming' : 'static'}
    >
      {text}
    </Streamdown>
  )
}
