import { z } from 'zod'

import { isHttpUrl } from './httpUrl'

export const HTTP_URL_MAX_LENGTH = 2_048
export const PROVIDER_TITLE_MAX_LENGTH = 300
export const PROVIDER_DESCRIPTION_MAX_LENGTH = 600
export const PAGE_CONTENT_MAX_LENGTH = 16_000
export const PAGE_IMAGE_MAX_COUNT = 12
export const PAGE_LINK_MAX_COUNT = 40
export const PAGE_WARNING_MAX_LENGTH = 500
export const CANDIDATE_PRESENTATION_MAX_COUNT = 12
export const CANDIDATE_REF_MAX_LENGTH = 48
export const OUTREACH_BODY_MAX_LENGTH = 4_000
export const OUTREACH_INSTRUCTION_MAX_LENGTH = 1_000
export const OUTREACH_SUBJECT_MAX_LENGTH = 200
export const OUTREACH_THREAD_MAX_MESSAGES = 20

const httpUrl = z
  .string()
  .trim()
  .min(1)
  .max(HTTP_URL_MAX_LENGTH)
  .refine(isHttpUrl, { message: 'Expected an HTTP or HTTPS URL' })

const emailAddress = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: 'Expected an email address',
  })

const shortText = z.string().trim().min(1).max(240)

export const searchWebInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2)
    .max(400)
    .describe(
      'A focused web search query. Search broadly before reading pages.',
    ),
  location: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .optional()
    .describe('A geographic search hint, such as Berlin, Germany.'),
  limit: z.number().int().min(1).max(8).optional().describe('Result count.'),
})

export const searchWebOutputSchema = z.object({
  results: z
    .array(
      z.object({
        url: httpUrl,
        title: z
          .string()
          .trim()
          .min(1)
          .max(PROVIDER_TITLE_MAX_LENGTH)
          .optional(),
        description: z
          .string()
          .trim()
          .min(1)
          .max(PROVIDER_DESCRIPTION_MAX_LENGTH)
          .optional(),
      }),
    )
    .max(8),
})

export const readPageInputSchema = z.object({
  url: httpUrl.describe(
    'An exact URL supplied by the user or returned by searchWeb or readPage links. Never construct a guessed listing URL.',
  ),
  fresh: z
    .boolean()
    .optional()
    .describe(
      'Bypass the page cache when explicitly checking current price or availability, or refreshing a stale source. Omit for ordinary exploration.',
    ),
  focus: z
    .string()
    .trim()
    .min(2)
    .max(600)
    .optional()
    .describe(
      'A precise question about the page. Prefer this to full-page reading.',
    ),
})

export const readPageOutputSchema = z.object({
  url: httpUrl,
  title: z.string().trim().min(1).max(PROVIDER_TITLE_MAX_LENGTH).optional(),
  description: z
    .string()
    .trim()
    .min(1)
    .max(PROVIDER_DESCRIPTION_MAX_LENGTH)
    .optional(),
  mode: z.enum(['focused', 'full']),
  content: z.string().max(PAGE_CONTENT_MAX_LENGTH),
  images: z.array(httpUrl).max(PAGE_IMAGE_MAX_COUNT),
  // Optional so historical page snapshots remain valid.
  links: z.array(httpUrl).max(PAGE_LINK_MAX_COUNT).optional(),
  linksTruncated: z.boolean().optional(),
  statusCode: z.number().int().min(100).max(599).optional(),
  warning: z.string().trim().min(1).max(PAGE_WARNING_MAX_LENGTH).optional(),
  truncated: z.boolean(),
})

const sourceSchema = z.object({
  ref: z.string().trim().min(1).max(CANDIDATE_REF_MAX_LENGTH),
  url: httpUrl,
  label: z.string().trim().min(1).max(120),
})

const candidateSnapshotSchema = z.object({
  ref: z.string().trim().min(1).max(CANDIDATE_REF_MAX_LENGTH),
  title: z.string().trim().min(1).max(100),
  location: z.object({
    label: z.string().trim().min(1).max(140),
    coordinates: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
      .optional(),
  }),
  price: z
    .object({
      amount: z.number().nonnegative().max(10_000_000),
      currency: z
        .string()
        .trim()
        .regex(/^[A-Za-z]{3}$/, 'Expected a three-letter currency code')
        .transform((currency) => currency.toUpperCase()),
      period: z.enum(['night', 'week', 'month', 'stay']),
      basis: z.enum(['all_in', 'base']),
      confidence: z.enum(['stated', 'derived', 'estimated']),
    })
    .optional(),
  sources: z.array(sourceSchema).min(1).max(12),
  contact: z
    .object({
      name: shortText.optional(),
      email: emailAddress.optional(),
      url: httpUrl.optional(),
    })
    .optional(),
  atAGlance: z.object({
    summary: z.string().trim().min(1).max(320),
    facts: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(60),
          value: z.string().trim().min(1).max(140),
          signal: z
            .enum(['positive', 'neutral', 'caution', 'negative'])
            .optional(),
        }),
      )
      .max(6),
  }),
  evidence: z
    .array(
      z.object({
        claim: z.string().trim().min(1).max(120),
        finding: z.string().trim().min(1).max(260),
        status: z.enum(['supported', 'claimed', 'contradicted', 'unresolved']),
        sourceRefs: z
          .array(z.string().trim().min(1).max(CANDIDATE_REF_MAX_LENGTH))
          .max(6),
      }),
    )
    .max(8),
  nextMove: z.object({
    summary: z.string().trim().min(1).max(280),
  }),
})

function createCandidatesSchema(requireSourceBackedEvidence: boolean) {
  return z
    .object({
      candidates: z
        .array(candidateSnapshotSchema)
        .min(1)
        .max(CANDIDATE_PRESENTATION_MAX_COUNT),
    })
    .superRefine(({ candidates }, context) => {
      const candidateRefs = new Set<string>()

      for (const [candidateIndex, candidate] of candidates.entries()) {
        if (candidateRefs.has(candidate.ref)) {
          context.addIssue({
            code: 'custom',
            message: `Candidate ref "${candidate.ref}" must be unique`,
            path: ['candidates', candidateIndex, 'ref'],
          })
        }
        candidateRefs.add(candidate.ref)

        const sourceRefs = new Set<string>()
        for (const [sourceIndex, source] of candidate.sources.entries()) {
          if (sourceRefs.has(source.ref)) {
            context.addIssue({
              code: 'custom',
              message: `Source ref "${source.ref}" must be unique`,
              path: [
                'candidates',
                candidateIndex,
                'sources',
                sourceIndex,
                'ref',
              ],
            })
          }
          sourceRefs.add(source.ref)
        }

        for (const [evidenceIndex, finding] of candidate.evidence.entries()) {
          if (
            requireSourceBackedEvidence &&
            finding.status !== 'unresolved' &&
            finding.sourceRefs.length === 0
          ) {
            context.addIssue({
              code: 'custom',
              message: `${finding.status} evidence must reference at least one source`,
              path: [
                'candidates',
                candidateIndex,
                'evidence',
                evidenceIndex,
                'sourceRefs',
              ],
            })
          }

          for (const [refIndex, sourceRef] of finding.sourceRefs.entries()) {
            if (!sourceRefs.has(sourceRef)) {
              context.addIssue({
                code: 'custom',
                message: `Evidence source ref "${sourceRef}" does not exist`,
                path: [
                  'candidates',
                  candidateIndex,
                  'evidence',
                  evidenceIndex,
                  'sourceRefs',
                  refIndex,
                ],
              })
            }
          }
        }
      }
    })
}

export const historicalCandidatesInputSchema = createCandidatesSchema(false)
export const showCandidatesInputSchema = createCandidatesSchema(true)
export const showCandidatesOutputSchema = z.object({
  presented: z.number().int().min(1).max(CANDIDATE_PRESENTATION_MAX_COUNT),
})

export const showOutreachDraftInputSchema = z.object({
  candidateRef: z
    .string()
    .trim()
    .min(1)
    .max(CANDIDATE_REF_MAX_LENGTH)
    .optional(),
  candidateTitle: z.string().trim().min(1).max(140),
  recipient: emailAddress.optional(),
  subject: z.string().trim().min(1).max(OUTREACH_SUBJECT_MAX_LENGTH),
  body: z
    .string()
    .trim()
    .min(1)
    .max(OUTREACH_BODY_MAX_LENGTH)
    .describe('The complete plain-text email body, at most 4,000 characters.'),
})

export const showOutreachDraftOutputSchema = z.object({
  draftId: z.string().min(1),
})

export const listOutreachUpdatesInputSchema = z.object({})
export const listOutreachUpdatesOutputSchema = z.object({
  updates: z
    .array(
      z.object({
        outreachId: z.string().min(1),
        candidateTitle: z.string(),
        state: z.enum([
          'draft',
          'approved',
          'queued',
          'sent',
          'replied',
          'failed',
          'uncertain',
        ]),
        hasUnreadReply: z.boolean(),
        latestActivityAt: z.number(),
      }),
    )
    .max(50),
})

export const readOutreachThreadInputSchema = z.object({
  outreachId: z.string().min(1),
})
export const readOutreachThreadOutputSchema = z.object({
  outreachId: z.string().min(1),
  candidateTitle: z.string(),
  subject: z.string(),
  omittedMessageCount: z.number().int().nonnegative(),
  messages: z
    .array(
      z.object({
        messageId: z.string(),
        direction: z.enum(['outbound', 'inbound']),
        from: z.string(),
        to: z.array(z.string()),
        timestamp: z.string(),
        body: z.string().max(OUTREACH_BODY_MAX_LENGTH),
        bodyTruncated: z.boolean(),
      }),
    )
    .max(OUTREACH_THREAD_MAX_MESSAGES),
})

export type CandidateSnapshot = z.infer<typeof candidateSnapshotSchema>
type ReadPageInput = z.infer<typeof readPageInputSchema>
export type ReadPageOutput = z.infer<typeof readPageOutputSchema>
type SearchWebInput = z.infer<typeof searchWebInputSchema>
export type SearchWebOutput = z.infer<typeof searchWebOutputSchema>
export type ShowCandidatesInput = z.infer<typeof showCandidatesInputSchema>
export type ShowCandidatesOutput = z.infer<typeof showCandidatesOutputSchema>
export type ShowOutreachDraftInput = z.infer<
  typeof showOutreachDraftInputSchema
>
export type ShowOutreachDraftOutput = z.infer<
  typeof showOutreachDraftOutputSchema
>
export type ListOutreachUpdatesOutput = z.infer<
  typeof listOutreachUpdatesOutputSchema
>
export type ReadOutreachThreadInput = z.infer<
  typeof readOutreachThreadInputSchema
>
export type ReadOutreachThreadOutput = z.infer<
  typeof readOutreachThreadOutputSchema
>

export type FoundUITools = {
  searchWeb: { input: SearchWebInput; output: SearchWebOutput }
  readPage: { input: ReadPageInput; output: ReadPageOutput }
  showCandidates: { input: ShowCandidatesInput; output: ShowCandidatesOutput }
  showOutreachDraft: {
    input: ShowOutreachDraftInput
    output: ShowOutreachDraftOutput
  }
  listOutreachUpdates: {
    input: Record<string, never>
    output: ListOutreachUpdatesOutput
  }
  readOutreachThread: {
    input: ReadOutreachThreadInput
    output: ReadOutreachThreadOutput
  }
}
