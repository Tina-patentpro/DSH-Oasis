export const DEFAULT_LOCAL_SKILL_SUITE = 'oasis'
export const OASIS_PLUGIN_NAMESPACE_PATTERN = /^oasis-professional-service(?:-[a-z0-9-]+)?$/
export const PATENT_DISCLOSURE_SUITE = 'patent-disclosure'
export const PATENT_DISCLOSURE_CLAIMS_ID = 'patent-disclosure-claims'
export const PATENT_DISCLOSURE_CLAIMS_VERSION = 'b4bbec6f0a1c3c32a904faabeb249639c0b30d98'

export const LOCAL_SKILL_SUITES = Object.freeze({
  oasis: Object.freeze({ label: '绿洲慧写', repository: 'https://github.com/Tina-patentpro/oasis-patent-skills' }),
  [PATENT_DISCLOSURE_SUITE]: Object.freeze({ label: '中国专利 Skill（第三方）', repository: 'https://github.com/handsomestWei/patent-disclosure-skill' }),
})

export const LOCAL_SKILL_SUITE_UNAVAILABLE = 'LOCAL_SKILL_SUITE_UNAVAILABLE'
export const LOCAL_SKILL_SUITE_UNAVAILABLE_REASON =
  '当前任务尚未适配「中国专利 Skill」。可在 DSH 设置 → 绿洲工作台切回「绿洲慧写」。'

export function localSkillUnavailableReason(suite = DEFAULT_LOCAL_SKILL_SUITE, supportsPatentDisclosure = false) {
  return suite === DEFAULT_LOCAL_SKILL_SUITE || suite === PATENT_DISCLOSURE_SUITE && supportsPatentDisclosure
    ? null : LOCAL_SKILL_SUITE_UNAVAILABLE_REASON
}

export function claimsCandidateFor(node, suite = DEFAULT_LOCAL_SKILL_SUITE) {
  if (suite === DEFAULT_LOCAL_SKILL_SUITE) return node?.m06Candidate
  if (suite === PATENT_DISCLOSURE_SUITE) return node?.patentDisclosureCandidate
}

export function isCurrentClaimsCandidate(receipt) {
  return receipt?.version === 'v340-native-candidate-4'
    || receipt?.version === 'v340-native-candidate-3' && receipt.businessSkillVersion === '0.1.3'
}
