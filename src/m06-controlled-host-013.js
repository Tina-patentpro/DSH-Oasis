import {applyM06ControlledCandidate013,inject as ordinaryInject} from './index.js'
export {name,Config} from './index.js'
export const inject=[...new Set([...ordinaryInject,'llm','sessions','sessionProjections','agentDefaultModel'])]
export const apply=applyM06ControlledCandidate013
