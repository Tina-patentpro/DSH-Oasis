import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const projectRoot = resolve(process.cwd())
const profileRoot = resolve(process.env.USERPROFILE ?? '', '.dsh')
const profilePackagePath = resolve(profileRoot, 'profiles/web/package.json')
const betterSidebarSourcePath = resolve(profileRoot, 'profiles/web/node_modules/dsh-better-sidebar/src/client/index.tsx')
const oasisAdapterPath = resolve(projectRoot, 'packages/oasis-professional-service/src/client/layout-adapter.js')

const [profileText, betterText, oasisText] = await Promise.all([
  readFile(profilePackagePath, 'utf8'),
  readFile(betterSidebarSourcePath, 'utf8'),
  readFile(oasisAdapterPath, 'utf8'),
])
const profile = JSON.parse(profileText)
function lineOf(text, fragment) {
  const index = text.split(/\r?\n/).findIndex((line) => line.includes(fragment))
  return index < 0 ? null : index + 1
}
function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

const report = {
  generatedAt: new Date().toISOString(),
  profile: {
    path: profilePackagePath,
    sha256: sha256(profileText),
    installedVersion: profile.dependencies?.['dsh-better-sidebar'] ?? null,
    enabledInBundles: profile.dsh?.profile?.bundles?.includes('dsh-better-sidebar') === true,
  },
  betterSidebar: {
    path: betterSidebarSourcePath,
    sha256: sha256(betterText),
    markerMountLine: lineOf(betterText, "host.setAttribute('data-dsh-better-sidebar', '')"),
  },
  oasisAdapter: {
    path: oasisAdapterPath,
    sha256: sha256(oasisText),
    markerDetectionLine: lineOf(oasisText, "querySelectorAll?.('[data-dsh-better-sidebar]')"),
    conflictResultLine: lineOf(oasisText, "return 'better-sidebar-present'"),
  },
}
report.incompatibleWhenBothClientsMount = Boolean(
  report.profile.installedVersion
  && report.profile.enabledInBundles
  && report.betterSidebar.markerMountLine
  && report.oasisAdapter.markerDetectionLine
  && report.oasisAdapter.conflictResultLine
)
console.log(JSON.stringify(report, null, 2))
if (report.incompatibleWhenBothClientsMount) process.exitCode = 1
