import { applyM06NextOffline, inject as baseInject } from './index.js'
export { name, Config } from './index.js'
export const inject = [...new Set([...baseInject, 'llm'])]
export const apply = applyM06NextOffline
