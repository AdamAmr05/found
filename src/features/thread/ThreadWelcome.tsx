const STARTERS = [
  {
    prompt: 'Can you find me a furnished place for a few months?',
    illustration: 'room-furnished',
  },
  {
    prompt: 'Where could I live with an easier commute?',
    illustration: 'compass-map',
  },
  {
    prompt: 'Help me find a quiet place to work from home.',
    illustration: 'laptop-desk',
  },
  {
    prompt: 'Can you help me choose between a few listings?',
    illustration: 'person-choosing-between-two',
  },
] as const

interface ThreadWelcomeProps {
  readonly disabled: boolean
  readonly onSelect: (prompt: string) => void
}

export function ThreadWelcome({ disabled, onSelect }: ThreadWelcomeProps) {
  return (
    <div>
      <h1 className="mb-24 text-center text-title-h5 text-accent-black sm:mb-32 sm:text-title-h4">
        Where would you like to live?
      </h1>
      <fieldset
        aria-label="Start a conversation"
        className="grid min-w-0 grid-cols-1 gap-12 sm:grid-cols-2"
      >
        {STARTERS.map(({ prompt, illustration }) => (
          <button
            key={illustration}
            className="surface-paper surface-paper-interactive flex min-h-76 items-center gap-14 rounded-16 px-16 py-12 text-left text-body-medium text-accent-black focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 disabled:pointer-events-none disabled:opacity-50 sm:min-h-92 sm:gap-16 sm:px-18 sm:py-16"
            disabled={disabled}
            type="button"
            onClick={() => onSelect(prompt)}
          >
            <img
              alt=""
              className="size-44 shrink-0 object-contain opacity-80 sm:size-52"
              draggable={false}
              height={52}
              src={`/illustrations/koboyo/${illustration}.svg`}
              width={52}
            />
            <span className="text-pretty">{prompt}</span>
          </button>
        ))}
      </fieldset>
    </div>
  )
}
