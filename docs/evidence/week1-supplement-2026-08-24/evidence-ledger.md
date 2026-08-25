# 第一周补充工作证据账本

日期：2026-08-24

## 证据规则

| 字段 | 含义 |
|---|---|
| Claim | 被验证的声明 |
| Layer | STATIC / UNIT / BUILD / HOST / HTTP / BROWSER / EXTERNAL |
| Command | 实际执行命令 |
| Exit | 退出码 |
| Evidence | 原始输出或产物路径 |
| Boundary | 该证据不能证明的内容 |

## 基线

| Claim | Layer | Command | Exit | Evidence | Boundary |
|---|---|---|---:|---|---|
| 当前 DSH 版本 | STATIC | `dsh --version` | 0 | `environment.txt` | 不证明插件可加载 |
| Node 与 pnpm 版本 | STATIC | `node --version`; `pnpm --version` | 0 | `environment.txt` | 不证明依赖已冻结 |
| 当前工作区无 Git | STATIC | `git status --short` | 1 | `environment.txt` | 不授权初始化 Git |
| npx 可用 | STATIC | `where npx` | 0 | `environment.txt` | 不证明浏览器已安装 |
| 源文件补充前基线 | STATIC | SHA-256 全树清单 | 0 | `source-hashes-before.txt` | 不证明运行行为 |
| 真实 Web Profile 补充前基线 | STATIC | SHA-256 全树清单 | 0 | `profile-hashes-before.txt` | 只证明本轮开始时状态 |

## 执行记录

后续 Task 按实际运行结果追加，不从计划文本推导 PASS。

## 补充执行结果

| Claim | Layer | Command | Exit | Evidence | Boundary |
|---|---|---|---:|---|---|
| RPC拒绝假绿灯与非loopback/非allowlist请求 | UNIT | 根级4文件Node测试 | 0 | `runtime/root-tests-final.txt`；其中RPC 7/7 | 不证明真实Host可达 |
| 隔离包装器跨路径解析与`--home`转发 | UNIT | 根级4文件Node测试 | 0 | `runtime/root-tests-final.txt`；其中包装器6/6 | 不证明未来DSH版本兼容 |
| 两个项目Skill可发现且合同完整 | UNIT/STATIC | root Node tests + 两次`quick_validate.py` | 0 | `runtime/root-tests-final.txt`; `runtime/skill-validator-final.txt` | 不证明模型实际调用质量 |
| frozen lock与供应链策略通过 | BUILD | `pnpm install --frozen-lockfile --registry=https://registry.npmjs.org --store-dir D:\.pnpm-store` | 0 | `runtime/frozen-install.txt` | 复用本机store，不证明干净机器下载 |
| clean build、包测试与pack白名单 | BUILD/PACK | `pnpm --config.verify-deps-before-run=false run verify` | 0 | `runtime/package-verify-final.txt`；30/30；15个包文件 | 不证明Host/Client已加载 |
| 真实Cordis Tools service列出并调用状态工具 | HOST-INTEGRATION | package test `host-runtime.integration.test.mjs` | 0 | 当前package 30项TAP中的第9项 | 进程内真实service，不等于Agent凭据链 |
| 隔离Bundle安装、Host启动、RPC与Skill发现 | HOST/HTTP | `node scripts\verify-week1-supplement.mjs` | 0 | `runtime/verifier-*`; 随机loopback端口 | 不证明生产Host可用性 |
| normal/expanded/hidden、两页、两工作流、焦点 | BROWSER | Playwright + 本机Edge | 0 | `browser/oasis-panel-normal.png`; `browser/oasis-panel-expanded.png`; `runtime/verifier-browser-tap.txt` | 不证明生产部署 |
| Client真实请求成功 | BROWSER/HTTP | Browser response listener | 0 | `browser/plugin-responses.json`，HTTP 200 | 只覆盖当前隔离Host |
| 浏览器无console warning/error与pageerror | BROWSER | Browser listeners | 0 | `browser/console-problems.json`; `browser/page-errors.json`，均`[]` | 只覆盖已通过场景 |
| A/B项目自动回归首次RED | BROWSER | 运行中新增Session的早期场景 | 1 | `runtime/browser-project-switch-red.txt` | 仅作根因记录，不代表最终版本 |
| A/A/B项目状态隔离 | BROWSER | 验证器预置A-1/A-2/B-1后由Edge真实切换 | 0 | `runtime/verifier-browser-tap.txt`; `browser/treeitems.json` | 只证明内存态，不证明第二周持久化 |
| live Slot完整合同 | CLIENT-RUNTIME | 官方`Slots.listSubTree`无root及3个精确root | 0 | `browser/live-slot-subtrees.json` | 不证明未来DSH版本合同不变 |
| 真实Profile补充前后未变化 | PROFILE | 主清单及最新验证器清单SHA-256比较 | 0 | `runtime/profile-compare-final.txt`; `profile-hashes-before.txt`; `profile-hashes-after.txt` | 不证明其他机器/Profile或更早历史 |
| 源文件变化全部有清单 | STATIC | source tree SHA-256 | 0 | `source-hashes-after.txt`; `source-diff-summary.txt` | 工作区无Git，未提供提交证据 |
| 诊断Home、缓存和监听已清零 | LOCAL-CLEANUP | 安全去链接后删除并复核 | 0 | `runtime/cleanup-final.txt` | 不涉及用户其他临时目录 |
| 第一周关闭条件同时成立 | AUDIT | 汇总报告/Slot/Browser/Tests/Profile/Cleanup/Source的只读断言 | 0 | `runtime/closure-audit-final.txt`; `all_checks=True` | 不扩展到生产或第二周新功能 |

## 失败与环境说明

- plain `pnpm run`会触发pnpm 11隐式依赖状态检查；验证命令显式使用`--config.verify-deps-before-run=false`，冻结安装仍作为独立门执行。
- isolated `node_modules`曾缺失`tsdown → ansis`链接；同一锁文件下用hoisted布局强制重建后，最终build/30 tests/pack均退出0。该本机生成态问题保留为P3。
- 沙箱内`pnpm list --depth 0`无法打开沙箱外store的SQLite索引；这不覆盖正常权限下frozen install和最终验证退出0的证据。
- 默认npm cache在沙箱外不可写；pack dry-run使用工作区临时cache，完成后已安全清理。
- 早期权限通道中断和A/B RED均保留为历史诊断；随后当前修订版已取得GREEN，相关临时根已清零。
