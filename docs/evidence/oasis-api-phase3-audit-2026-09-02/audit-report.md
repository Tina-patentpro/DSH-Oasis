# Oasis API 第三批正式审计

日期：2026-09-02（Asia/Shanghai）

## 结论

**FAIL**。确认 **1 个 P1、4 个 P2**。第三批暂不应验收或进入真实 API 联调；先修复下述问题，再复审。

全量现有测试 254/254 通过，不等于这些边界已覆盖。审计用独立夹具复现了缺陷，未修复业务代码、未提交、未访问真实 API、未启动 DSH Profile。没有发现已发生的真实凭证泄露或生产事故；所有反例均使用合成数据。

## 1. 审计合同与冻结范围

- 工作区：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研
- 包：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service
- 基线 HEAD：`3c2bd5a469b67ed4070b0b9beacc30212cd038e3`。
- 第三批范围：相对该 HEAD 的 24 个已跟踪修改文件，以及已有第三批目标合同/证据台账 2 个未跟踪文件。开始时暂存区为空。
- 审计顺序：冻结哈希 → 权威文档到代码契约 → Host/回写/Client 独立反例 → 全量和聚焦测试 → 隔离构建/打包 → 前后保护校验。
- 仅在本审计证据目录中新建脚本、报告、构建输出、缓存及临时测试工作区；没有将审计输出混入包。
- 停止条件：权威文档/原工作树变化、需要真实凭证/环境、需要修改已有业务代码或 Profile 时停止对应动作。发现 P1/P2 后停止接受第三批通过结论，但继续只读审计和本地隔离取证。

冻结证据：

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-audit-2026-09-02\baseline-before.json
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-audit-2026-09-02\baseline-after.json
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-audit-2026-09-02\reviewed-working-tree.diff

## 2. 必须修复的发现

### F1 / P1：允许的文件来源不等于无凭证 URL，远程回写会原样发布 URL 凭证

定位：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\writeback-service.js:219-240，重点 222-224、239-240。

- **触发**：允许来源的 `file_url` 含 URL userinfo 或令牌查询参数。审计使用 `audit-user:audit-pass` 和 `AUDIT_DUMMY_ONLY`，不是真实凭证。
- **实证**：真实 API adapter（mock fetch）→ Host 完成运行 → Domain 严格解析 → 人工批准 → WorkbenchService → 真实本地文件回写。Markdown 和 `.oasis.json` 都包含合成凭证。
- **根因**：adapter 与 Domain 只约束协议/来源，新增 metadata 也只验证 `url.origin`，随后保存完整 href。来源校验会丢失 URL 的 username/password/search/hash 信息，不能证明这些部分安全。
- **影响**：与本批“不写入凭证”目标合同相冲突；导出结果可将 URL 中访问能力带到工作区、同步或后续共享。并不是说所有查询参数都是秘密；带明确 userinfo 的反例已足以证明缺陷。
- **归属**：URL 接受策略继承自第二批；本批新增写回扩大了凭证暴露面，必须在第三批验收前关闭。
- **最小修复方向**：共享安全 URL 策略，至少禁止 username/password；对敏感查询参数/片段失败关闭，或者单独生成不可访问的脱敏显示记录，不能把完整 URL 继续保存在 Markdown/JSON。不要静默改写签名链接并声称仍可用。入口、Domain、回写出口均需负例；业务文件保持无凭证。
- **复现名称**：`url-credentials-published`。

### F2 / P2：观察历史运行前未校验环境身份，会关联到另一个环境的同号流水

定位：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-remote-service.js:575-581。

- **触发**：A 环境完成的运行保留在 Workspace；用户更改非生产 API 配置、重启后以 B 环境观察旧运行。两个环境记录号均为 90。
- **实证**：运行快照为 `https://oasis-staging.example`；active runtime 为 `https://oasis-other-staging.example`。Host 发出 1 次 B 流水读取，并把 B 的 money=999 返回为旧运行的 `observed`；Client schema 接受。
- **根因**：只按数字 `linkId === recordId` 匹配，没有比较 active origin 与 execution/run 的 origin。配置要求 restart 不会阻止持久化历史运行跨重启保留。
- **影响**：错误的关联结果被展示给用户；不涉及实际扣款/退款动作，但会误导核验。
- **归属**：本批新增观察路径直接引入。第二批 continuation 也存在相似环境切换风险，列为关联旧风险，不声称本批新引入全部路径。
- **最小修复方向**：发请求前验证 active origin 与 execution/run 快照相同；不一致时安全报错或明确不可验证，且不读取 B 流水。禁止用裸数字跨环境关联。账号变化的身份策略也需明确，但本次未证明同一环境的 ID 是否按账号分配。
- **复现名称**：`cross-environment-collision`。

### F3 / P2：未先验证整个流水页，畸形数据被静默转换为“当前页未观察到”

定位：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-remote-service.js:576-583。

关联位置：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-api-contract.js:265-283。

- **触发**：流水项返回 `link_id: "90"` 而不是文档示例中的数值 90，或另一个未命中项字段畸形。
- **实证**：normalizer 不验证项字段类型；Host `find` 跳过字符串 ID，返回 `not-observed`、total=1、item=null；该结果完整通过 Client schema。
- **根因**：验证发生在筛选之后，未命中的异常记录已被丢弃。Client 只看一项投影，无法再判断原页是否可信。
- **影响**：协议错误伪装成正常业务观察，违反本批“返回项不能严格通过安全 schema 时停止”的目标合同。
- **归属**：normalizer 的宽松行为是旧问题；本批观察功能首次将其转为可显示的负面关联结论。
- **最小修复方向**：在 Host/adapter 匹配前严格解析页内全部项，再投影必要字段；形状错误返回安全协议错误，不转换为 miss。只支持文档的两种 envelope；money/balance 文档是数值，不需要为了假设的字符串响应添加强转或默认值。
- **复现名称**：`malformed-ledger-false-negative`。

### F4 / P2：创建与查询的 recordId 冲突时，查询值会覆盖已记录的关联锚点

定位：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-remote-service.js:264-267。

关联位置：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-api-contract.js:251-258。

- **触发**：同一个请求 key 的 create receipt 为 recordId=90，后续已被实现接受的 query result 为 recordId=91。
- **实证**：运行完成，90 被静默改成 91；观察据此返回 91 的 `observed`。
- **根因**：只验证 key，没有验证两次记录 ID 一致性。并且权威文档 8.7 的查询示例只定义进度字段，没有给出 `id`/完成结果字段可充当 create 记录 ID 的依据。
- **影响**：实现对未经契约证明的扩展字段授予更高信任，并丢失原锚点；可能关联错项。
- **归属**：本批新增 ID 持久化和查询传播。这里复现的是实现已支持的输入分支，不代表真实服务器一定返回这类扩展字段。
- **最小修复方向**：已确定的 create ID 不允许被不同值覆盖；冲突失败关闭并保留证据。严格围绕现有文档时，不把 query 的额外 `id` 当作可信关联来源；只有用户认可的契约补充才能恢复该能力。不得为填补空缺猜测新 API。
- **复现名称**：`conflicting-create-query-record-id`。

### F5 / P2：Workspace 移除期间收到观察结果，会保留永久 busy 状态

定位：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\workbench-store.js:787-800。

- **触发**：启动观察；`syncWorkspaces` 临时移除该 Workspace；响应完成；随后恢复同一 workspaceId。
- **实证**：success 更新抛出 `action requires a known Workspace`，catch 再次尝试同一更新并抛错。恢复后 activeOperation 仍为 `running-water-observe`、status 仍为 loading；再次观察被“已有操作”拒绝。
- **根因**：只检查全局 disposed/closing，没有检查 workspace/page 生命周期；状态 Map 保留，而清理依赖一个要求 Workspace 仍已注册的更新函数。
- **影响**：当前任务后续操作保持禁用；仅恢复 Workspace 或普通重读不足以解除 pageOperations 中的占用。
- **归属**：本批新增异步观察方法。
- **最小修复方向**：移除 Workspace 时取消/失效化其 pending operation，并清理 busy；晚到响应检查 workspace/page 与操作世代，不允许写回失效状态。清理不得再次依赖已失效注册，不能重新创建已关闭页面。
- **复现名称**：`client-workspace-removal-stuck`。

## 3. 权威文档 → 生产者 → 消费者契约表

唯一 API 依据：D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md

SHA-256：`429357f3e60e39aeaae1c879c475d629633e88f5a1f71975c618c6899768feb1`。

下表使用函数/字段名标识生产者与消费者，不引入新的 API：

| 字段/规则 | 文档依据 | 生产者 | 消费者 | required / fallback | 审计结果 |
| --- | --- | --- | --- | --- | --- |
| create `data.id` | 8.5，2335 行的可选场景示例 | normalizeWorkflowCreateResult / createWorkflow | execution.recordId → observeRunningWater | 可缺失；缺失应不可验证、无流水请求 | 缺失分支正确；冲突覆盖见 F4 |
| create `key` | 2318、2336 行 | adapter matchingTaskKey | Host complete → run.requestKey | 原始 key 绑定；不匹配失败关闭 | 既有回归测试通过 |
| query 进度字段 | 8.7，2413-2422 行 | normalizeWorkflowProgress | poll | 按原 key 查询；只有文档中进度得到证明 | query 完成结果/id 属未证明扩展，不作为新契约事实 |
| runningwater envelope | 5.6，1268 行 | request → normalizeRunningWater | Host observe | total 非负整数、items 数组；两种 envelope | 页壳验证存在，项验证不足 |
| `id/link_id/type/money/balance` | 1280-1287 行 | normalizeRunningWater | `.find` → RPC → Client | 文档数值保持数值，不能异常后默认 miss | F3；筛选前验证缺失 |
| `create_time` | 1289 行 | createTime 投影 | observation.item | 当前实现缺失为 null，字符串透传 | 样例为字符串；未做真实格式验证，不提升为时间排序依据 |
| 页/limit/type | 1264-1266 行 | getRunningWater 固定 GET，无 query | UI 当前页观察 | page=1、limit=20、type 不传=全部 | 当前页描述正确；不同 type 混页关联语义未证明 |
| `link_id == create.id` 唯一对应 | 文档只分别给出字段，没有显式跨端点约束 | Host 单个 `.find` | UI “已观察到关联流水” | 应先具备同环境、唯一且有契约支持的关系 | 关联前提未充分证明；不能把示例相似当作保证 |
| observation.runId/status | 插件内部合同，不是远端 API 字段 | Host observe | RPC wrapper → Zod → Store → Panel | 三态；绑定 activeRunId；不持久化 | 正常隔离通过；F2/F3/F5 未覆盖 |
| file_url | 8.5，2340 行及仅文件场景 | adapter → run.result.fileUrls | RunPreview / remoteArtifact / metadata | 仅记录，不下载；非生产允许来源 | F1：来源限制不足以证明无凭证 |
| requestKeySha256 | 插件内部输出合同 | WorkbenchService | writeback metadata | 原 key 不输出；不输出 provider.price | 正常路径白名单正确；URL 凭证是另一入口 |
| artifact / review / revision | 插件本地合同 | Domain + reviewRun + prepare | commit → mkdir/wx/fsync/hash/rename | 必须 approved、revision 一致、新目录、单次 token | 正常链路和竞态控制通过；旧 artifact 等价性缺口另列 |

文档原文摘录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-audit-2026-09-02\authority-excerpts.json。

## 4. 其他发现、旧风险与证据缺口（不重复计入上述 5 项）

1. **关联唯一性尚未证明**：mock 页内同 linkId 的充值和消费并存时，代码选择第一条充值。文档允许混合类型，但未定义 link_id 的命名空间/唯一性。该反例用于证明实现的假设，不能据此断言真实后端一定重复。真实联调前应取得用户认可的契约证据；无法证明时只显示未验证候选，不声称已关联。不要静默排除 refund 后再声称完整观察。
2. **响应 schema 的交叉字段不变量不足**：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\workbench-contract.js:430-439 接受 `recordId=90,item.linkId=999,total=null,status=observed`。真实 Client RPC wrapper 也接受。当前 Host 正常路径会构造相等 ID，因此单列为防御纵深缺口；宜随 F3 加入相等性和 total 状态校验。
3. **旧 Domain 的预览/产物等价性缺口**：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\workbench-domain.js 的远程分支分别校验 answer/fileUrls 响应哈希与 artifact 自身哈希，没有验证 artifact 是其确定性渲染。修改 Host 存储 artifact 并重算其哈希后，仍能批准并写出不同于 answerText 的正文。本次没有证明公开 RPC 可以进行这种修改；Domain 文件也不在第三批 diff，不能包装为第三批新引入的远程注入漏洞。应列为历史完整性风险。
4. **停止按钮与流水读取不匹配**：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\client\ProfessionalServicePanel.js:153-156 对所有 busy 展示停止按钮；观察流水时调用 stop 返回 `{stopped:false}`。该按钮只会停止工作流轮询，不能取消流水读取。宜按 operation 类型显示，或单独实现取消读取；本次未模拟真实网络无限挂起。
5. **构建非逐字节复现**：现有 bundle 与 tsdown 原始构建在 2082、2090、2125、2133 行不同；统一去除行尾 tab/space 后完全相同。map 的 mappings、sourcesContent 以及解析后的源文件路径相同。4 处位于依赖生成的模板字符串附近，不声称完全没有行为差异，也不误报为主要业务构建失败。应把需要的后处理纳入构建链，或保留标准生成结果；不要手改 bundle 后称构建逐字节一致。
6. **台账新鲜度**：既有台账记录聚焦 108/108，本次相同 9 个文件为 109/109；完整总数仍为 254。可能源于补测时点不同，不能据此断言伪造。历史 TDD 红阶段无独立归档，不能由本次绿测倒推。
7. **尚无真实 Host/浏览器/API 证据**：本次增强了 `apply → RPC → repository → real local files` 的模拟周边服务链路验证，仍不是真实 DSH 进程、Profile、Credential UI 或浏览器交互；不补充这类结论。

## 5. 本次新鲜验证台账

Shell：cmd（通过 `cmd /c`）；审计脚本使用 Node child_process 的 argv 调用，避免嵌套中文路径转义。未调用 `dsh --dump-config`。

运行环境：Node v22.19.0、pnpm 11.25.0、tsdown 0.22.14、构建日志 rolldown 1.2.5。

| 验证 | 结果 | 证据边界 |
| --- | --- | --- |
| 37 个现有测试文件，全量 `node --test` | 254 通过，0 失败，0 跳过；退出码 0 | 单元/本地进程内集成 |
| 9 个聚焦测试文件 | 109 通过，0 失败；退出码 0 | 本地回归 |
| tsdown 原配置 + 隔离 out-dir + no-clean | 退出码 0 | 构建输出仅在审计目录，不覆盖现有 lib |
| npm pack --dry-run --json --ignore-scripts --offline | 退出码 0，43 个白名单条目 | 打包清单；没有真实发布/下载/安装 |
| git diff --check | 退出码 0 | 原工作树的差异格式 |
| 9 个独立 Host/合同/文件系统反例与正控 | 退出码 0，反例与预期复现一致 | 退出码 0 表示成功复现，不表示安全验收通过 |
| 7 个独立 Client/RPC/插件入口场景 | 退出码 0 | 含生命周期缺陷复现、正控；非浏览器 |
| 前后哈希、HEAD、权威文档 | 退出码 0；2459 个文件零差异，HEAD 和文档哈希均未变化 | Git 列出的已有非忽略文件；不宣称覆盖整个磁盘或 Profile |

已验证的正向控制：

- 审核改变/版本冲突阻止回写，目标目录未创建；已消费 token 不可重放。
- 真实 Windows 文件系统中，最后 rename 前出现的空目标目录保留，返回 WRITEBACK_TARGET_EXISTS；非空/重解析点/越界/哈希/索引失败分支由现有测试验证。不能推广为所有平台或所有竞态都已证明。
- 同一页面并发观察只发送一次；普通网络错误清理 busy；另一个 Workspace 不被覆盖；dispose 后客户端 signal 已 abort、晚到响应不重建状态。
- 当前页面不会显示另一个 runId 的观察结果；Client 拒绝字符串金额等直接可见的 schema 错误。
- 插件 apply 的真实源码接线可通过 loopback handler 发布恰好两个本地文件并各释放一次 tool/RPC/domain；周边服务全部使用审计桩，不读取真实凭证。

主要机器证据：

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-audit-2026-09-02\verification-results.json
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-audit-2026-09-02\full-tests.stdout.log
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-audit-2026-09-02\focused-tests.stdout.log
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-audit-2026-09-02\rerun-probes-IGpLDX\probe-results.json
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-audit-2026-09-02\rerun-lifecycle-ieF5ym\lifecycle-results.json

可重复命令（新建另一个审计输出子目录，不覆盖第一次证据）：

```cmd
node "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-audit-2026-09-02\audit-verify.mjs" --rerun
node "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-audit-2026-09-02\audit-probes.mjs" --rerun-probes
node "D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-audit-2026-09-02\audit-lifecycle.mjs" --rerun-lifecycle
```

后两条已按上述形式再次执行，退出码均为 0。完整验证首次运行的命令/argv/cwd/起止时间与各阶段退出码在 verification-results.json。只运行隔离分解验证，未执行会覆盖 lib 的原地 `pnpm run verify`。

## 6. 后续最小修复顺序（本次未执行）

1. F1：关闭 URL 凭证入口和回写出口；加入真实 adapter→Domain→回写负例。
2. F2/F4：绑定环境；固定有文档依据的记录 ID 来源；冲突不可覆盖；不推测新 API。
3. F3：整个流水页先验证再匹配；补充 Client 交叉字段不变量；无法证明关联唯一性时不返回确定关联。
4. F5：按 Workspace/page 生命周期失效 pending 观察，确保晚到响应与错误均不能遗留锁或复活页面；停止按钮同步按操作类型收敛。
5. 重新跑本报告全部用例，修复后反例应转为拒绝/不可验证或正确清理，随后全量测试、隔离构建、打包与变更保护复查。
6. 更新构建/台账证据后，再单独申请真实隔离 DSH Host、浏览器和非生产 API 联调。真实凭证只在产品 UI 配置，绝不进入脚本/日志。

更简单且安全的临时边界是：不能证明安全或关联时拒绝回写/返回不可验证，而不是新增猜测性的接口、自动重试提交或支付抽象。
