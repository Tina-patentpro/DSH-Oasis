export function normalizeNativeComposerInput(input) {
  if (!Number.isSafeInteger(input?.draftRev) || input.draftRev < 0) return undefined
  // Pinned DSH 0.1.5 uses attachmentIds for files and images. Keep the
  // existing bridge's internal shape, but never fall back to legacy input.
  return {
    ...input,
    imageIds: Array.isArray(input.attachmentIds) ? input.attachmentIds : undefined,
    occurrences: Array.isArray(input.occurrences) ? input.occurrences : undefined,
  }
}
