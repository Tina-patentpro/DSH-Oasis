# Oasis API 第四批隔离运行验证 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 本任务保持单代理；不提交、不安装到真实 Profile。执行前等待本计划确认。

**Goal:** 为前三批专业服务插件补齐真实隔离 DSH Host、浏览器和本地模拟 API 的集成证据，不冒充真实非生产业务验证。

**Architecture:** 延续已实现的 adapter → Host → Domain/RPC → Client → 人工审核 → 两阶段写回；只新增测试服务器与验证器，不增加业务端点、不放宽安全策略。独立临时 Profile 运行当前包快照，以实际 HTTP 连接 loopback 模拟服务，分别覆盖 standalone 与 dsh-better-sidebar 0.15.2；真实远端烟雾测试单独设门，不在本批执行。

**Tech Stack:** DSH 0.1.1-rc.2、Node 22.19.0、pnpm 11.25.0、现有 Playwright Node API、Microsoft Edge、node:test。

---

## 1. 状态卡、来源和范围

- 原批次映射：当前任务“插件开发二阶段”中已恢复第三执行批 = 原 Batch 6；下一批 = 原 Batch 7 隔离 Host/浏览器验证。本计划不等同于历史“第四周”全部业务范围。
- 当前阶段：只读前检和执行方案；尚未安装新 Profile、启动 Host、模拟服务器或浏览器。
- 用户当前请求：“执行第四批”；第四批没有独立落盘的决策完备方案，先补齐本计划，批准后开始运行。
- HEAD：`3c2bd5a469b67ed4070b0b9beacc30212cd038e3`；暂存区为空；第三批及修复 dirty 变更保持原样，不要求先提交，不创建/切换分支。
- 已对照第三批复审冻结输入重算 83 个包文件：0 漂移。
- 业务主合同：D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md；当前 SHA-256 `429357f3e60e39aeaae1c879c475d629633e88f5a1f71975c618c6899768feb1`，未变。
- 已读取第三批复审：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-reaudit-2026-09-02\audit-report.md。其签名 URL、旧记录及 artifact/预览等价性限制继续保留，不在验证批内暗中修复。
- 未发现目标及上级 AGENTS.md 或本项目 OpenSpec；采用本目标合同与新证据台账。
- 本机 PATH 不含 dsh，但 `node scripts\dsh-isolated.mjs --resolve-bin` 成功定位官方 CLI：C:\Users\TinaD\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\lib\bin.js。已读取对应 package.json，版本 0.1.1-rc.2。不把 PATH 缺失误判成需要安装。
- npx 可用；本机已有 Playwright：C:\Users\TinaD\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright\index.mjs。Edge 已存在：C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe。不下载浏览器，不依赖无权限读取的 Chrome。
- 真实 Profile 仅只读枚举 package.json：包含 dsh-better-sidebar 0.15.2，以及主题、插件门、上下文等其他 Bundle。此次两种受控组合的结果不代表该真实 Profile 全部插件组合兼容。

### 验证与权限边界

**4A 纳入本次确认范围：** 新临时 Profile、合成凭据、合成材料、loopback 模拟 API、实际 Host/RPC/浏览器和新目录写回。

**4B 不纳入：** 真实非生产 Base URL/JWT、收费或零费用真实任务、生产接口、真实材料、真实 Profile 安装，以及远端已有内容修改。未取得独立授权和必要契约前不执行。

只凭 4A 成功，整体仍保持 `STATIC_ONLY`（缺真实业务证据）；报告须另列“隔离 Host/浏览器已验证”和“真实业务未验证”，不能把它描述成只做了 element tree，也不能升格为真实服务完成。

## 2. 文件与输出合同

仅新增以下测试/验证资产，保持业务源码及旧验证器不变：

1. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\verify-oasis-api-phase4.mjs
2. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\fixtures\oasis-api-phase4-server.mjs
3. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\integration\oasis-api-phase4-browser.test.mjs
4. D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts\oasis-api-phase4-contract.test.mjs

新证据根：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase4-2026-09-02。每次尝试使用全新 `attempt-001`、`attempt-002` 等目录，存在即拒绝；保存 target-contract、commands、input-hashes、filesystem、host、browser、fixture、evidence-ledger、audit-report。

运行根使用系统临时目录下 `oasis-dsh-p4-*` 全新 ASCII 路径（mkdtemp），每种 Host 模式独立 Home/浏览器数据/存储/Workspace/包副本/npm 缓存/pnpm store。DSH_HOME 指向其中 Home，所有路径先经 realpath/lstat 和 validateIsolatedHome 验证。不复用项目默认 .dsh-test、旧证据目录或真实 Profile。

只允许既有模块的只读复用：baseline-capture-core 的哈希/比较、dsh-isolated 的 CLI/Home 解析。旧 Week 3 verifier 会写默认目录、重建包并运行旧场景，**不得未经审查直接执行**；仅借鉴其进程生命周期及隔离安装实现，不修改旧脚本来给新验证让路。

## Task 0：冻结与红灯验证

1. 重新确认 Git HEAD/暂存区、全部 tracked 与未跟踪已有文件的 SHA、API 文档 SHA 和第三批冻结输入。保存新 attempt 基线，禁止 reset/restore/stash/stage/commit。
2. 对真实 C:\Users\TinaD\.dsh 做路径/文件内容哈希强基线；凭据文件只计算哈希，不解析、打印或复制其内容。
3. 写 node:test 红灯：证据目录已存在、Home 跨入真实 Profile、reparse 目标跨界、两个 Host 共用存储、非 loopback API 配置、意外真实凭据继承、离线依赖缺失均必须拒绝；fixture 必须守住九端点及 create 五字段、无日志正文/认证头。
4. 再实现最小 fixture/runner，逐项转绿。禁止通过跳过测试或放宽 schema 获得绿色结果。

## Task 1：本地模拟 API

1. 仅监听 `127.0.0.1`，端口使用 0 由系统分配；不新增业务控制端点。场景选择在测试进程内部完成，不增加插件配置开关。
2. 使用已冻结九端点、动态 API ID/endpoint/process、整数 folder ID、两种流水 envelope；材料和结果 URL 仅为该服务器普通无参数路径。收到意外方法/字段/路径立即使测试失败。
3. 提供固定、逐测试重置的场景：同步成功、create 回执后有界查询、create 响应丢失、401、畸形流水、重复候选、空页、无 create 来源、URL query/fragment/userinfo 拒绝。
4. query 的额外完成结果/ID 场景仅验证现有防御，不声称文档规定这些字段。create.id/link_id 只产生 unverified 候选，不模拟真实扣费结算保证。
5. 统计每种 operation 的次数、状态和安全事件，不记录 JWT、原 request key、请求体、材料正文或完整返回 payload。synthetic marker 用于泄漏断言，不是真实凭据。
6. 正向端到端必须走插件实际 adapter HTTP；不直接塞完成 run 到 Domain 来冒充上传/创建结果，不修改生产 fetch/鉴权代码。

## Task 2：安装与 Host

1. 从冻结包复制白名单文件到新运行根，副本字节与输入哈希一致；副本内构建并 dry-run pack，再打包供隔离 CLI 安装，不修改原包 lib 或锁文件。
2. 从已安装依赖取得离线包材料，只复制包文件，绝不复制真实 Profile 设置/凭据/Session/Domain。所有 tarball 与重解析目标可追溯；包管理缓存和 store 必须在运行根。无离线依赖则停止，不自动联网安装或升级。
3. 通过官方 CLI、shell:false、windowsHide:true、明确 DSH_HOME 操作全新隔离 web Profile；只对该 Home 执行 dump-config。需要离线解析映射时仅写本次新建临时 Profile，绝不改真实/仓库配置。
4. 单 Host/单存储：记录 PID、CLI 路径、版本、Home、Profile、绑定地址/端口；确认 127.0.0.1 可访问，不以 HTTP 200 代替 Host 工具及 RPC 证明。
5. 第一轮无 Oasis 配置，验证安全禁用且 fixture 请求次数为 0。随后通过 DSH 公共 Settings/Credentials 产品界面配置 loopback Base URL 和合成凭据；设置 applies=restart，停止旧 PID并确认退出后重启，不能两个 Host 共用存储。
6. 凭据面板阶段不截图/录屏、不记录字段值；离开面板后再采集证据。不得自动读取真实 JWT 或从现有 Profile 迁移凭据。
7. 获取完整 live Slot 树，再精确查询 conversation.input.right、shell.overlay、details；记录 purpose/kind/scope/options/props/occupants/后代。验证插件不占用 single details；若协议不符停止，不改 DOM 或布局规则兜底。

## Task 3：真实浏览器矩阵（模拟业务）

采用项目既有 Playwright Node 驱动和已安装 Edge，不引入 @playwright/test 或新依赖。独立 browser context；每步先检查当前可见元素/角色/testid，不猜历史 ref，不直接调用内部 Store 制造 UI 成功。

| 场景 | 必须观察到的结果 |
|---|---|
| 未配置 / 无凭据 | 醒目标识、无泄漏、无上传/create |
| 目录/动态表单/项目 | 只显示 Host 合同字段；用户显式选择真实 fixture 整数 folder |
| 双重确认 | 未确认不能提交；字段/材料变化后的确认失效仍有效 |
| 合成材料上传与同步结果 | 1 次上传、1 次 create；文本及多个文件 URL 显示“未下载、未验证” |
| 人工审核 / 写回 | 未批准不能 prepare；prepare 无输出，确认 commit 后仅新增目标目录；metadata 五字段白名单及 SHA 一致 |
| 重复写回 / revision 冲突 | 已有目标内容不变；旧 plan 不发布；token 单次使用 |
| 流水三态 | 只按需读取、同 link_id 仅候选、关联未验证；不得显示资金结论；坏页/多候选为错误 |
| create 未知 / 重启继续 | 持久化未决状态；继续只查询原 key；create 次数仍为 1，不能关闭丢弃未决账本 |
| Workspace/页面竞态 | A/A/B/A、页面关闭、移除/恢复以及晚到响应不造成 busy 卡死或污染新观察；无法由公共界面触发的分支标明 Host/RPC 探针层，不假称浏览器证明 |
| Stop | 仅工作流等待展示“停止本地等待”，流水读取不展示；不声称服务端取消 |
| 布局/刷新/卸载 | normal/expanded/narrow、刷新恢复、原生侧栏和对话不替换；卸载只清理插件自有状态 |

模式顺序：standalone 完成后关闭，再运行独立的 better-sidebar 0.15.2 组合。两种组合均覆盖专业服务成功闭环及关键 UI 门禁；第三方完整目标组合不在本次兼容结论内。

浏览器收集实际渲染截图、交互断言、console/pageerror、模块加载响应与脱敏请求列表。阻断非 loopback 浏览器请求；Host 专业 API 配置和 fixture 调用来源逐项验证，仅本地端点；不将浏览器网络记录当作全机网络审计。

## Task 4：证据关闭与停止

1. 执行包全量 node:test、根脚本测试、第四批新测试；每条保存具体 executable/argv/cwd/时间/退出码，实际计数为准，不把上一轮 271 当作本轮结果。
2. 在副本标准构建，比较 client.js 字节与原冻结产物、map 的 mappings/sourcesContent/解析 sources；不同即停止复核。dry-run pack 应为原 43 项白名单；测试与审计文件不能进入业务包。
3. 执行 git diff --check，并单列源码/新脚本检查；原生成代码 4 处模板字符串空白保留，不手改 bundle。新的源文件空白问题必须消除。
4. 安全停止本次 PID，关闭本次 browser/fixture；不 taskkill 所有 node，不停止用户原有服务。保留失败和成功 attempt 的证据及临时输出，不自动递归删除 Profile。
5. 重算真实 Profile、仓库已有文件、权威文档 SHA，证明除本计划及批准新增资产外 0 改动；暂存和 HEAD不变。失败也必须执行后检。
6. 新报告按以下层级分别给出结果：测试/构建、隔离安装、Host、Client 模块、真实浏览器＋模拟 API、真实业务未执行。列明本次未能覆盖的条件，不宣称所有历史数据安全。

批准后的入口（工作目录为本项目根）：

```cmd
node --test tests/scripts/oasis-api-phase4-contract.test.mjs
node --test tests/scripts/*.test.mjs
node --test packages/oasis-professional-service/test/*.test.mjs
node scripts/verify-oasis-api-phase4.mjs --evidence docs/evidence/oasis-api-phase4-2026-09-02/attempt-001 --modes standalone,better-sidebar --offline
git diff --check
git diff --check -- scripts tests packages/oasis-professional-service/src packages/oasis-professional-service/test
```

入口文件为本计划将新增的验证器，尚不可声称这些命令已运行。验证器不接受真实 Base URL 或 JWT 参数；要求新 evidence 根并固定本地 fixture。

立即停止的条件：输入基线漂移、需要改业务源码/既有脚本/锁文件、实际 Profile 被写入、重解析路径跨界、需要在线安装/升级、fixture 外专业 API 请求、凭据泄漏、发现新的业务 P0–P2、live Slot 协议不符或连续同因失败。发现业务缺陷时保留证据并提出最小修复方案，不把“验证批”变成无限修复批。

## 3. 后续真实非生产门禁（4B）

第四批 4A 不需要真实 JWT，因此不向用户索取。拟开始 4B 前须另外确认：实际非生产 Base URL、公开支持的鉴权、用户 UI 配置凭据、合法测试 folder、明确测试费用/额度、数据授权、签名 URL 需求、历史记录处置及本地 artifact/预览完整性缺口。未满足则继续只报告模拟集成结果；任何既有远端内容仍受禁止覆盖约束。
