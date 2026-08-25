# 第一周审计修复证据账本

日期：2026-08-24 至 2026-08-25

| Claim | Layer | Command / Method | Current Result | Evidence / Boundary |
|---|---|---|---|---|
| Git 基线 | LOCAL | `git status --short --branch` | No commits yet；全部既有项目文件 untracked | 未暂存、未提交 |
| 工具链 | STATIC | `dsh/node/pnpm --version` | `0.1.1-rc.2` / `22.19.0` / `11.19.0` | 不证明运行时 |
| 产品源文件基线 | STATIC | SHA-256 + lstat | 45 entries；0 links | `baseline/source-hashes-before.tsv` |
| 真实 DSH Home 基线 | PROFILE | 全树 SHA-256 + lstat，不跟随链接 | 664 entries；530 links | `baseline/profile-hashes-before.tsv`；真实 Profile 只读 |
| better-sidebar 来源 | STATIC/WEB | 固定仓库、快照和 MIT 边界 | 已记录 | `docs/references/better-sidebar-layout-notes.md` |
| 安全隔离包装器与 RPC | UNIT | `node --test tests\scripts\dsh-local-api-smoke.test.mjs tests\scripts\dsh-isolated.test.mjs tests\skills\dsh-plugin-development.test.mjs tests\skills\dsh-plugin-development-discovery.test.mjs` | exit 0；22/22 | `runtime/root-tests-final.txt`；覆盖 CMD 元字符、任意 shim、真实 Home、link/junction、IPv6 loopback |
| Portal/布局/焦点/package | BUILD/UNIT/PACK | `pnpm --config.verify-deps-before-run=false run verify` | exit 0；47/47；build 42.53 kB；pack 18 files | `runtime/package-verify-final.txt`；不证明浏览器运行 |
| 两个项目 Skill 官方校验 | STATIC | 本机既有 Python + 官方 `quick_validate.py` | 两次 exit 0；2/2 `Skill is valid!` | `runtime/skill-validator-final.txt`；没有安装依赖 |
| 干净隔离 Host/Browser | HOST/BROWSER | `node scripts\verify-week1-supplement.mjs` | exit 0；browser 1/1；Client/插件/RPC/Slot 均通过 | `runtime/verifier-browser-tap.txt`、`runtime/verifier-host.txt`；使用全新临时 `DSH_HOME` |
| normal 不遮挡中栏 | BROWSER | 1600×980 几何与输入点击 | root 1600→1240；sidebar 280 不变；conversation 1320→960；panel 361；无横向溢出 | `browser/layout-geometry.json`、`browser/oasis-panel-normal.png` |
| expanded/hidden 清理 | BROWSER | 状态切换与几何后检 | 两态 root margin=0、owner/变量均清除；hidden 恢复 baseline | `browser/layout-geometry.json`、对应截图 |
| 原生 Details 共存 | CLIENT-RUNTIME/BROWSER | hidden 前后 live Slot + 验证专用 Client 实际 open/close | occupant 前后一致；Details 打开宽 201.22 px；绿洲 panel=0 | `browser/live-slot-subtrees-before-hide.json`、`browser/live-slot-subtrees-after-hide.json`、`browser/oasis-panel-hidden-native-details.png`；`D+ / D-` 仅属 fixture |
| 窄屏自动 expanded | BROWSER | 900×980 viewport 后恢复 1600×980 | 900px 时 root push=0、panel 从 sidebar 右缘开始；恢复后 requested normal 重新推挤 | `browser/oasis-panel-narrow-auto-expanded.png`、`browser/layout-geometry.json` |
| 浏览器错误面 | BROWSER | console warning/error + pageerror 捕获 | 0 / 0 | `browser/console-problems.json`、`browser/page-errors.json` |
| 产品源文件终态 | STATIC | 修复前后 SHA-256 + lstat | added=11；removed=0；modified=18；0 links | `baseline/source-delta.json`；仅覆盖脚本中声明的产品源根 |
| 真实 DSH Home 终态 | PROFILE | 664 entries / 530 links 全树 SHA-256 + lstat；`fc /b` | added=0；removed=0；modified=0；exit 0 | `baseline/profile-delta.json`、`runtime/profile-baseline-compare-final.txt`；真实 Home 未写 |
| 临时环境清理 | LOCAL | 精确绝对路径、Temp 前缀、root ReparsePoint 门禁后删除并复核 | 三个失败根删除；成功根自动清理；前缀残留 0 | `cleanup-failed-isolated-homes.ps1`、`runtime/cleanup-final.txt` |

后续验证只追加，不覆盖历史审计证据。第一次沙箱浏览器挂起和两次 fixture `package.json` export 失败作为诊断过程保留在任务记录；最终命令在 fixture 无 `node_modules` 的状态下重新执行并通过。
