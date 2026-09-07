// The host supplies its native renderer; never bundle a second, unpatched copy.
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import { apply as applyClient } from './client.js'
export { inject, createConversationDraftBridge } from './client.js'
export function apply(ctx) { return applyClient(ctx, { markdownRenderer: MarkdownText }) }
