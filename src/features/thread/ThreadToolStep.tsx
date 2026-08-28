export function ThinkingStep({ label = 'Thinking' }: { label?: string }) {
  return <ToolStep active label={label} />
}

export function ToolStep({
  active = false,
  error = false,
  label,
}: {
  readonly active?: boolean
  readonly error?: boolean
  readonly label: string
}) {
  return (
    <output
      aria-atomic="true"
      aria-live="polite"
      className={`flex items-center gap-10 text-body-medium ${
        error ? 'text-accent-crimson' : 'text-foreground-muted'
      }`}
    >
      <span className="relative grid size-18 place-items-center" aria-hidden>
        {active ? (
          <span className="absolute size-18 animate-ping rounded-full bg-heat-12" />
        ) : null}
        <span
          className={`size-7 rounded-full ${
            error
              ? 'bg-accent-crimson'
              : active
                ? 'bg-heat-100'
                : 'bg-accent-forest'
          }`}
        />
      </span>
      {label}
    </output>
  )
}
