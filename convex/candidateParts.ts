import { ConvexError, v } from 'convex/values'
import { vSessionId } from 'convex-helpers/server/sessions'
import type { SessionId } from 'convex-helpers/server/sessions'

import {
  CANDIDATE_REF_MAX_LENGTH,
  CANDIDATE_PRESENTATION_MAX_COUNT,
  HTTP_URL_MAX_LENGTH,
} from '../shared/foundTools'
import { isHttpUrl } from '../shared/httpUrl'
import { internalMutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import { assertThreadOwner } from './threadAccess'

function assertCandidateRefs(candidateRefs: readonly string[]): void {
  if (
    candidateRefs.length === 0 ||
    candidateRefs.length > CANDIDATE_PRESENTATION_MAX_COUNT ||
    new Set(candidateRefs).size !== candidateRefs.length ||
    candidateRefs.some(
      (candidateRef) =>
        candidateRef.length === 0 ||
        candidateRef.length > CANDIDATE_REF_MAX_LENGTH,
    )
  ) {
    throw new ConvexError({ code: 'INVALID_CANDIDATE_PART' })
  }
}

function assertPreviewImages(
  candidateRefs: readonly string[],
  previewImages: readonly {
    readonly candidateRef: string
    readonly url: string
  }[],
): void {
  const refs = new Set(candidateRefs)
  const previewRefs = new Set(
    previewImages.map((preview) => preview.candidateRef),
  )
  if (
    previewImages.length > candidateRefs.length ||
    previewRefs.size !== previewImages.length ||
    previewImages.some(
      (preview) =>
        !refs.has(preview.candidateRef) ||
        preview.url.length > HTTP_URL_MAX_LENGTH ||
        !isHttpUrl(preview.url),
    )
  ) {
    throw new ConvexError({ code: 'INVALID_CANDIDATE_PART' })
  }
}

export async function assertCandidatePartReference(
  ctx: MutationCtx,
  args: {
    readonly sessionId: SessionId
    readonly threadId: string
    readonly toolCallId: string
    readonly candidateRef: string
  },
): Promise<{ readonly imageUrl?: string; readonly messageId: string }> {
  const part = await ctx.db
    .query('candidatePartRefs')
    .withIndex('by_session_thread_tool', (index) =>
      index
        .eq('sessionId', args.sessionId)
        .eq('threadId', args.threadId)
        .eq('toolCallId', args.toolCallId),
    )
    .unique()

  if (!part?.candidateRefs.includes(args.candidateRef)) {
    throw new ConvexError({ code: 'CANDIDATE_PART_NOT_FOUND' })
  }
  const imageUrl = part.previewImages?.find(
    (preview) => preview.candidateRef === args.candidateRef,
  )?.url
  return imageUrl
    ? { imageUrl, messageId: part.messageId }
    : { messageId: part.messageId }
}

export const recordBatch = internalMutation({
  args: {
    sessionId: vSessionId,
    threadId: v.string(),
    parts: v.array(
      v.object({
        messageId: v.string(),
        toolCallId: v.string(),
        candidateRefs: v.array(v.string()),
        previewImages: v.optional(
          v.array(v.object({ candidateRef: v.string(), url: v.string() })),
        ),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertThreadOwner(ctx, args.threadId, args.sessionId)
    for (const part of args.parts) {
      assertCandidateRefs(part.candidateRefs)
      const previewImages = part.previewImages ?? []
      assertPreviewImages(part.candidateRefs, previewImages)
      const existing = await ctx.db
        .query('candidatePartRefs')
        .withIndex('by_session_thread_tool', (index) =>
          index
            .eq('sessionId', args.sessionId)
            .eq('threadId', args.threadId)
            .eq('toolCallId', part.toolCallId),
        )
        .unique()

      if (existing) {
        const unchanged =
          existing.messageId === part.messageId &&
          existing.candidateRefs.length === part.candidateRefs.length &&
          existing.candidateRefs.every(
            (candidateRef, index) => candidateRef === part.candidateRefs[index],
          ) &&
          (existing.previewImages ?? []).length === previewImages.length &&
          previewImages.every((preview, index) => {
            const existingPreview = existing.previewImages?.[index]
            return (
              existingPreview?.candidateRef === preview.candidateRef &&
              existingPreview.url === preview.url
            )
          })
        if (!unchanged) {
          throw new ConvexError({ code: 'CANDIDATE_PART_CONFLICT' })
        }
        continue
      }

      await ctx.db.insert('candidatePartRefs', {
        ...part,
        sessionId: args.sessionId,
        threadId: args.threadId,
        previewImages,
      })
    }
    return null
  },
})
