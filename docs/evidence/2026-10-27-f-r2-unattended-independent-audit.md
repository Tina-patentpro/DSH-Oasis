# F：R2无干预重启与无夹具开发装配独立审计

日期：2026-10-27。调度要求为 **GPT6.1 Max、新上下文独立审计**；本审计单代理执行，未继承实施过程，只以具名送审入口、实际文件及独立命令判断。基底与当前HEAD均为 `efd70b5b0575ae33a0b50ade077ed63d4f53c653`，分支 `mac/continuity-v2`。

**结论：原送审增量不能整体按“无阻断观察夹具”接受。新增必改 Critical 0、P1 0、P2 1、Minor 0。** 接受下文具名正常流量观察、公开草稿/字节保持和无夹具开发装配子集；P2修复前不接受观察器的无阻断/异常路径隐私保证。完整F仍OPEN。本报告记录原冻结输入；后续修复、新夹具、新Profile及新复验均不在本报告中预先接受，原FAIL与原件保留。

## 1. 审计范围与输入身份

实际读取根/项目AGENTS、协同README/登记中 `dsh-oasis` 的两个 `current_entry` 相关F段落、指定计划/返回/执行单及进度记录的两项Ruling；采用 `requesting-code-review` 的独立只读审查要求与 `verification-before-completion`。没有制定或启动新的业务计划。

送审时仅6个未跟踪文件；已跟踪产品源码、v4转换/产物、原装配器、依赖及旧报告均无增量。下表SHA256由审计者独立复算：

| 对象 | SHA256 |
|---|---|
| [本轮计划](../plans/2026-10-27-f-r2-unattended-assembly.md) | `b0797c72592b9328ac64054bb0255c868d796987dcb3282f9243445da736adc4` |
| [作者返回](2026-10-27-f-r2-unattended-return.md) | `b97c7a63a8b9c523c5240392429e0495ee26caf85d1117bce672529fb09e4f95` |
| [109成员执行单](2026-10-27-f-r2-unattended-execution.json) | `7fa2c01d2e022051cd68cb8f35636efde40af0987bb499b844fddb936b922f61` |
| [观察器](../../scripts/tests/fixtures/recovery-upload-observer.mjs) | `c29e62904fcea943c0e9ac15697aa60a180c66e85d7f179b5ac94a755ecd2fbd` |
| [观察器测试](../../scripts/tests/recovery-upload-observer.test.mjs) | `54b44a1416cfd64d8f90d0e0f72318c5361468783a53e1b869cac25db824890f` |
| [无夹具接续说明](../../patches/f-host-assembly/2026-10-27-fixture-free-handoff.md) | `05c5c839fbf5d69e4693b03541c5cb94038be4724e698538b7a9c70ac06b49e2` |
| 恢复组合准入，198pin | `2ab457b451bf29b2d78f45423a8fe75811f15c9c8ea8cf3ccfae62492e0a71e3` |
| 无夹具组合准入，195pin | `31318410058fffb1d065790a93827a14d72542a10370d8574d091a91649b7990` |

两准入分别位于本仓库 `.dsh-test/f-r2-unattended-20261027/evidence/f-assembly.json` 与 `.dsh-test/f-development-clean-20261027/evidence/f-assembly.json`。独立复算109/109成员、198/198及195/195pin、旧v4执行单152/152成员、原公开Profile17/17文件均一致；3587/3587基底文件SHA保持，baseline路径集合等于指定BASE的Git树，`git diff --exit-code BASE --` 退出0。14份规划输入的当前文件与原字节快照亦全部一致；这只证明输入保全，不新增执行许可。

独立工作文件仅新增在 `.local/f-r2-unattended-20261027/audit-independent/`；没有改动109冻结成员、旧返回/执行单/审计、Profile数据、Git index/HEAD或分支。没有启动Desktop/Host、读取认证或credentials、发送消息、调用真实模型/专业API、上传用户资料、提交、推送或发布。

## 2. 必改发现：F-R2-U-A01 / P2

**诊断订阅的URL解析异常能终止进程，并把原始request-target中的query打印到stderr。**

位置：[recovery-upload-observer.mjs](../../scripts/tests/fixtures/recovery-upload-observer.mjs) 第11行；冻结的 `proof/index.mjs` 含同一函数，源码包含关系已独立确认。

观察器在 `http.server.request.start` 回调内执行 `new URL(request.url, 'http://localhost')`，没有异常边界。独立本地HTTP探针向自建服务器发送 `POST`、request-target为 `http://[`：

| 解释器 | 无观察器 | 启用原观察器 |
|---|---|---|
| 固定工具Node 24.21.0 | 200、`handled`，exit 0 | `ERR_INVALID_URL`、exit 1 |
| 固定内置Node 24.18.1 | 200、`handled`，exit 0 | `ERR_INVALID_URL`、exit 1 |

这不是通过手工改写request对象制造的异常：Node的HTTP解析器接收了相同request-target，无观察器的handler能够完成响应。诊断订阅中的异常成为未捕获异常，使本应仅观察的代码改变请求处理和进程存活。

另一次只含公开标记的请求 `http://[?auditToken=QUERY_ONLY_MARKER` 同样exit 1，异常输出的 `input` 原样包含query标记。因此正常路径“不记录query”的测试没有覆盖异常输出；本反例未使用任何真实凭据或敏感值。

影响限于显式装入此夹具的环境，不据此声称产品正常恢复逻辑有新缺陷。该问题仍违反本轮“夹具不得阻断请求、不记录query/凭据”的边界，必须在将其作为可靠观察工具继续使用前修复。需要无抛出、无原始target/query输出的分类方式，并以同一真实HTTP反例验证handler继续完成、进程退出0；保留原源码、原FAIL和原准入，不重签原109成员。

独立证据：`audit-independent/malformed-request-probe.mjs`、`malformed-baseline.log`、`malformed-observer.log`、两份 `malformed-embedded-*.log`、`malformed-query-probe.mjs`、`malformed-query-observer.log`；命令/退出码另存 `probe-commands.json` 与 `malformed-query-result.json`。探针源码SHA为 `3f92cc00b24a34443bbfe896ffde769f539860d6b90f1a761e30f65312213b3a`；query异常日志SHA为 `749c850d7f20b8aed3965fc6552cd55e9f7efff26b2ac3da5c970a4ad201a0a1`。

## 3. 接受的正常路径与具名观察子集

### 3.1 观察器的已验证正常行为

源码未注册/劫持路由，未操作响应，未调用上传或重试。独立自建HTTP服务器的阳性/阴性探针验证：匹配端口的精确POST上传路径计数；异端口、其它方法与其它路径不增加二进制上传计数；handler收到原正文并返回原状态/正文；常规记录不含header/body/query值；dispose后真实POST不再记账，重复dispose无新增记录。合成diagnostic事件另以抛错getter核实没有访问body、headers、query参数对象或response。该合成探针不冒充真实HTTP阳性。

上述两项独立探针在两个固定解释器均2/2、exit 0；作者新增两项也随完整scripts集通过。但异常路径由F-R2-U-A01明确否定，因此这些通过结果只支持正常路径。

### 3.2 订阅、计数与观察窗口

独立逐行解析两份JSONL，强制要求计数字段实际存在；逐request累加并比对，未用缺值默认0。记录键仅为kind、时间、两个计数及request行的方法/固定二进制分类。两份均由subscribed开头、disposed结束，实际HTTP request存在，计数连续：

| 具名运行 | subscribed → 首条HTTP → disposed（UTC） | HTTP / binary starts |
|---|---|---|
| 首次，Host PID79796 | 13:35:56.521 → 13:35:57.465 → 13:36:22.175 | 47 / 0 |
| 同Profile重启，Host PID79916 | 13:36:42.328 → 13:36:43.049 → 13:37:26.405 | 36 / 0 |

固定Desktop源码的Host启动先等待boot，之后才 `mountScheduled` 挂载Renderer；夹具Node apply同步安装订阅。结合上表支持本配对订阅先于这两次Renderer请求。重启时实际无凭据本地GET403也成为第36条事件，证明观察期间通道活跃，403不是上传成功或认证接受。

接受**这次新隔离Profile、这44.077秒窗口内，Host收到的POST `/api/session/uploadFileBinary` 开始数为0**。没有证据缺失当0的情形，也未出现本报告异常反例中的进程中止；原观察能够保留其正常路径事实。该结论不延伸为永不自动重传。

固定实际客户端 `@deepseek-ai/dsh-client-file-upload/lib/client.js` 第179–196行将非Uint8Array的File/Blob送往该二进制路径，Blob Worker使用POST；Uint8Array另有RPC路径。本轮恢复记录重建的是File，conversation实际 `beginFileUpload` 交给 `ctx.fileUpload.upload`。独立读取的该客户端SHA为 `4c09378ab7cb3dbe58253bd1fad8c4a00ebf5a93b462d96623edb7bd4e566305`。因此本计数适配这两件恢复File；不证明尚未到达Host的Worker意图、其它RPC、外网全部流量或模型接收。

### 3.3 首次seed与同Profile重启区分

首次AX proof明确为 `seeded`；重启initial/dwell均为 `waiting-for-authoritative-workspaces`。这不是把waiting当恢复失败或seed成功：固定proof源码在目标Session已活跃时于seed入口直接返回，重启proof读到的正是该目标；seed helper亦要求目标非活跃并使用add-if-absent。本次接受依赖旧checkpoint实际存在与恢复结果，不依赖重启再次seed。

首次、重启初始及dwell的AX均对应Workspace `71120098-c4d4-4075-bddd-49e1371eb8f7`、Session `session-afaffbc1-9b24-4447-a7fa-98f0daef6428`；当前具名workspace存储的归属与源公开路径一致。草稿均为 `F20261026-A-UNSENT`、18字符、SHA `f91afd470598379d1072eaac60c3eb7f886929b995f93160f38c72a2888cb7c0`。两卡均显示待人工重试，Send禁用；已独立查看dwell PNG及三份AX。

独立解码seed pack并逐字比对重启前后两份IDB File：

| 文件 | bytes | SHA256 |
|---|---:|---|
| F-public-ordinary.md | 96 | `53f292233c61aa19aaa98a7e2a2b6e5d0392ae43e779546d753ff7fbf85b0357` |
| F-public-long-150000.md | 449990 | `159d0f0fa12bf8c4434c6007e661fb191734e408681899d7288b9a73e2747393` |

二者分别与原公开workspace/named/object实物对应。重启前4386字节LevelDB日志是重启后4405字节日志的原样前缀，同Session、Workspace、草稿和原generation仍可见；这是原记录保全的附加字节证据，不冒充完整通用LevelDB解码器。恢复Profile的Host attachments目录仍不存在，与二进制请求零计数相互支持，没有仅凭目录空推定零请求。

**Ruling 1接受：** 显式新空Profile、固定原公开owners与同v4配对，是有界重现；不属于历史R2 Profile迁移、原请求取证或其无干预证明。[原R2人工重试补记](2026-10-27-f-renderer-lease-user-retry-addendum.md)、旧失败/异常/审计及152成员保持，不能倒签。

### 3.4 无夹具195pin开发组合

准入无fixture属性，不含proof三文件；有效patch没有proof包注入，AX/PNG没有proof slot。相对恢复组合仅多出的三条pin正是fixture三文件；有效patch及pnpm物化角色差异已由两次 `--check` 核验。原装配器仍把 `legacy-draft-seed.mjs` 作为只读输入固定在准入中，**这不是运行装入或执行seed**；“无夹具”在此指有效运行组合。

两次实际启动记录的Main PID为80234/80360，均退出0。两份具名AX保留原生 `F-CLEAN-20261027-UNSENT`、Flow-2-6任务页、本地Skills选择与公开用户指令；重启PNG直接可见原生草稿和任务页。独立只读核当前业务存储的任务 `8221ccae-667e-430e-96d4-dc1bfd92a0af`，source为local-skill，用户指令准确，三类run/remoteExecution列表为空。

接受当前固定App、显式link源、195pin开发组合的两次启动/正常重开与双草稿保持。它不是独立可移植包、签名安装器、升级/降级/回退、任意旧数据迁移或全部writer发行接续。

**Ruling 2限定接受：** 未观察到需要修改产品实现/依赖的本批产品缺陷，保留原实现是合理的；本报告发现的是新观察夹具缺陷，必须另处理，不能由“无产品缺陷”豁免。

## 4. 独立执行与保全证据

所有命令通过zsh/独立Python subprocess执行，完整argv、环境覆盖、日志及退出码在审计目录 `commands.json` / `probe-commands.json`；内置解释器仅以 `ELECTRON_RUN_AS_NODE=1` 运行，没有启动Desktop。

| 实际命令/检查 | 结果 |
|---|---|
| `python3 -B .local/f-r2-unattended-20261027/audit-independent/verify-frozen.py` | exit 0；109/152/17/3587、198/195pin、14输入/快照一致 |
| `tools/node-v24.21.0-darwin-arm64/bin/node --version` | v24.21.0，exit 0 |
| `ELECTRON_RUN_AS_NODE=1 '<fixedApp>/Contents/MacOS/DSH Desktop' --version` | v24.18.1，exit 0 |
| 工具Node `--test --test-reporter=tap scripts/tests/*.test.mjs`（argv展开为10文件） | 97 pass、0 fail/skip，exit 0 |
| 内置Node、同一10文件测试 | 97 pass、0 fail/skip，exit 0 |
| 两解释器各运行 `audit-independent/observer-independent.test.mjs` | 各2 pass，exit 0 |
| `scripts/f-development-assembly.mjs --check <recovery-root>` | 198pin / materialized，exit 0 |
| `scripts/f-development-assembly.mjs --check <clean-root>` | 195pin / materialized，exit 0 |
| 两解释器各运行 `malformed-request-probe.mjs`，无观察器/有观察器 | 各exit 0 / exit 1，构成F-R2-U-A01 |
| 工具Node `malformed-query-probe.mjs --observer` | exit 1，stderr包含公开query标记 |
| `git diff --check` | exit 0 |

复核四份原启动/退出JSON为0/null，四原Main及两原Host PID在本审计检查时均已不存在。原冻结记录的端口关闭事实保持；审计期间实施者已开始另批修复复验，后来57583出现监听，故本报告不把该并行状态归因原四次运行，也不声称整个机器当前没有其它实例。

独立脚本首次运行曾有本机Python不接受ISO尾缀Z、将两份静态credential-scan证据文件名误列为凭据路径的审计脚本问题；更正为时区兼容及真正凭据目录排除后完整重算通过，没有读取认证存储。额外探针首次相对导入多一级，保留其setup-error日志后改正；这些是审计准备错误，不是产品FAIL，也没有作为P2证据。

`frozen-check.json` SHA `e260db85646c706677c56a83fc0e2c173867886aa6ac88c169e82242c30e806d`；`commands.json` SHA `f200184cde4b2f36ba30500f0e1dc543140d2117e207c350aedbcbe9810814e4`；`probe-commands.json` SHA `fa5455dca7daa001fafdf0b1aded373d1407dd90e8f7b869260624daa2f0fc65`。这些独立文件不加入原109成员、不覆盖作者记录。

## 5. 未判、未验及提交裁定

以下行为明确排除，均不能由本次测试数量或零计数关闭：

- 历史R2原Profile当时的无干预/零请求：已有人工重试事实，且当时缺本观察证据；本次新Profile不补签。
- Worker/RPC意图、网络全流量、无限期零重传、实际模型接收正文/附件：观察层和44.077秒窗口不足；未触发真实上传/模型。
- 任意孤儿归属、实际多个DSH Renderer、双存储失效、未提交事务崩溃、强杀/跨平台、真实0.1.3 UNKNOWN：本批没有对应实际运行。
- 全writer强制保护、安装器、签名发行、升级/降级/回退：只有具名开发装配/正常重启证据。
- 费用账务或远端全局无push的独立取证：本审计未访问账户/认证/远端日志。零新增真实调用/费用的作者记录与禁用模型配置、空run、零上传记录相容；这是具名受控运行边界，不是外网/账务全量审计。审计者未执行任何真实调用、push或发布。

**本地收录裁定：原观察器作为可继续使用的无阻断夹具，当前不通过，先修F-R2-U-A01。** 原109成员中的正常流量事实、公开字节保持及195pin无夹具开发装配子集可以保全；不因P2删除或改签原证据。后续修复须有独立版本/准入/反例复验与准确接续，不能用此首轮报告预认通过。完整F、E/G/H、U1/D1和发行门均未关闭。
