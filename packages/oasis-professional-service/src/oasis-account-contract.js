import { z } from 'zod'
import { OASIS_PRODUCTION_HOSTNAME } from './oasis-origin-policy.js'

// Release-owned endpoint, not a Profile preference or a renderer-supplied URL.
export const OASIS_PRODUCT_ORIGIN = `https://${OASIS_PRODUCTION_HOSTNAME}`
const phone = z.string().regex(/^1[3-9]\d{9}$/)
export const accountCommandSchemas = {
  status: z.object({}).strict(),
  sms: z.object({ phone, confirmed: z.literal(true) }).strict(),
  login: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('sms'), phone, code: z.string().regex(/^\d{4,8}$/), confirmed: z.literal(true) }).strict(),
    z.object({ mode: z.literal('password'), phone, password: z.string().min(1).max(256), confirmed: z.literal(true) }).strict(),
  ]),
  logout: z.object({ confirmed: z.literal(true) }).strict(),
}
export const accountStatusSchema = z.object({
  authenticated: z.boolean(), available: z.boolean(), writable: z.boolean(),
  accountId: z.number().int().positive().nullable(),
  revision: z.string().max(100).nullable(),
  retryAfterSeconds: z.number().int().nonnegative(),
}).strict()
