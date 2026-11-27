# AR7 原 B：G02／G03 具名只读回执

请求 `INTERFACE-R2-AR7-HOST-FOLLOWUP-20261111`；2026-11-11，Asia/Shanghai。执行者为 DSH-Oasis 项目 Codex，分别履行 AR7-P（DS-02/04/05）和 AR7-C（DS-03/04/05）。本聊天 `01a177c0-e0a2-7841-ab7b-634f0bacc752`，实际回执轮次 `01a1c8e2-12e9-77b1-980d-f1d3f68b8cc4`，由应用只读查询核得。范围为本次授权的原件核对和新增回执。[授权原件][dispatch] · [EXEC-R2 和输入身份](execution-preflight.json)

**AR7-P／G02：当前磁盘装机、Profile 和指定原稿身份已核；实际采用仍为 `UNBOUND`。** 指定原稿可以按原 B 持久化记录精确解析。当前 Host 显式选择该稿及此 bundle 的同版 R7-03 接续证据未取得。

**AR7-C／G03：B 的持久化登记根和两个磁盘候选已核；实际保存仍为 `UNBOUND`。** 观察时两候选均不存在。原稿仍未审核，未见该 run 的持久化写回；Host 的实际最终目标、应用权限及明确保存确认没有对应证据。

## G02：装机、当前指针与指定原稿

**装机观察 12:37:12.521–12:37:17.919 +08:00。** 隔离安装根为 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-native-business-recovery-20261108-r1`；安装登记 `current` 为 `2339cca5a2711bf7851443af5ec144312c0eff84372094e8b6f456e91dedf0e4`，checkpoint 3。安装登记原字节 SHA256 `9a7085ec31ebdc08fe066a4ace4da848519505c80f1848b8cf8893abf282deab`，该 release 的收据 `f931563d873baf8b63407912baf3f04e187c1f18e2fc569093a0af63939a4466` 与登记一致。[装机观察：原件绝对路径、完整 SHA256 和全条目差异](installation-observation.json)

- 用只读遍历比对收据，程序 27,814 条、活动 Profile 16 条、release Profile 快照 16 条全部相符；普通文件核原字节及模式，符号链接核目标字面值。7 个 Profile 组件链接实际解析到当前 release。App Info.plist 为 Desktop 2.0.17；c0–c6 的准确包名、版本和 package.json 摘要见观察记录。业务组件 c3 为 `0.1.0-rc.5`。控制器 SHA256 `8338fec253a916eb780a8fc739f6d973ba22475772db98698543758a408ad405`，两个配套控制文件及 control/node 均和登记匹配。
- 选择状态原件在 `data/userdata/profile-selection/state.json`，值为 `version=2, active=desktop`；磁盘 Profile 为 `data/home/profiles/desktop`，其业务组件链接解析至当前 release 的 `components/c3`。同一观察窗的进程可执行路径列表未匹配 DSH Desktop.app 或 deepseek-harness；不据此推断该窗之外的运行状态。本轮未执行安装控制器、签名验证或原生准入测试。
- 历史生成 bundle 是 `a25f1a190803aaccc3f614b607b2d1502458999d41221f5751969e93b3a62e2b`。两份收据对比为 32 个程序条目、14 个 Profile 条目有差异；同为 rc.5 标签不能移授原 Host 通过。与本用途直接有关的差异包括结果页、客户端选择/确认状态、工作台 RPC/合同、V3.4.0 版本合同和写回服务。当前版静态读点及其精确摘要已核入当前收据；它们说明解析和防护路径，不能代替同版原生执行回执。

**B 观察 12:39:25.398–12:39:25.433 +08:00。** 持久化 Workspace `11e1a348-0248-42a1-8141-bcb6306caccc`，任务 `d8d762fe-36ae-49dd-b275-b7ffff04fda7`，会话 `session-be573ee0-ae7a-4d40-99d5-d607f6106786`，revision **90**。业务存储原字节 SHA256 `aaebeba9fcefc9c630457e6c21d442b0f4ea50ad3ba906347830a2f48727ac3c`，与 12:33:08 发送前观察一致。持久化 `activeTaskId` 为原 B，`tasks[B].v340.activeRunId` 为 **`v340-f56b9fb7-1cf4-4915-8fdc-955c31afaa78`**，该条目状态为 `completed`；“活动指针”不表示正在生成。本轮只读该指针与状态，不核后发 run 的内容、授权或接受。

- 指定 **`v340-89dd69c1-be05-4fca-bea0-a63dd2c5908d`** 从同一 B 任务的 `v340.runs[指定ID]` 解析，归属、节点和历史会话一致。它是 `completed / local-skill / not-reviewed`，M06 资源版本 `0.1.3`，正文 57,201 UTF-8 字节，复算 SHA256 `76edc895aa38614942860c5cf8fda861a542e3cb377f462b06dcbde206a00442`。正文未复制进回执。原 R7-02 结束 revision 86 与现 revision 90 各自保留。[原 R7-02][r702] · [B 观察：原件路径与摘要](host-observation.json)
- 从指定 run 的冻结记录复算输入快照 SHA256 `b563a98036bbb94e3ff835944f5c36a7c69f20b4b6d35f0a6bd8ba8c366895b5`，prepared SHA256 `fb01f3abfc715ef6330aa6d11e47b6909d95509a286c68d987388ccdffd0af8e`，均与原回执字段匹配。三份具名公开 Markdown 的原字节匹配原输入收据，四段文本随冻结输入绑定。业务资源包 SHA256 `e06aa1523338af87b255cbdcb428ae7e693765791820dedc94f69a26ddc37f1d` 和清单 `254a685fe95c9063be7232cb8dcb25333c1864ed9a5e670c0f62a04af3f3ccd4` 在两个 bundle 中都匹配原 run，范围为 8 项制作可见成员及清单另外 2 项仅供操作员的成员。
- 当前已装结果页先看临时 `operation.v340Selection`，没有该值才回退到持久化 `activeRunId`；Host 结果操作按输入的 task/run/version/hash 解析。记录可证明指定原稿存在并有可定位依据，但没有该安装上对它的实际显式选择回执。未读私有 Renderer store、未调用 Host RPC、未切换界面。
- 本用途是消费已有 Markdown 正文，未选 PDF/DOCX、显式旧快照或重新提取；U1/D1 的逐格式准入只随所选材料支路适用，不从原生成合同或本次磁盘核对推出通过，也不把未选格式设为本地接续共同前置。当前 Host 仍须按原门给出同版对象、当前权限、固定审核版本和受影响 R7-03 接点的证据。

## G03：登记根、候选与实际写回的区别

- **持久化登记根。** 精确 Workspace ID 在原生 `workspace.json` 登记 `data/workspace-b` 的绝对路径，会话列含指定 B 会话；会话投影只读身份的 cwd、原 run 的 nativeCandidate.workspaceRoot 和磁盘 realpath 均吻合。登记原件 SHA256 `4106acb78abd607d3fab5a96d26eda2a86c38902614f60335751cfa2efeff419`；会话投影原件 `3ec6ee5ecf7993d4e917651915c3da3430d5c141f503b70ff1b976961aad67d0`。这绑定持久化登记的根；未取得当前 Host 对该根的 live registry status 或 writeback 准入结果。
- **磁盘候选。** 以原结果名在上述根下推得 `claims_20261110114450_89dd69c1.md` 和该版写回会检查的配套 `claims_20261110114450_89dd69c1.oasis.json`。12:39:25 两者 `lstat` 均为不存在，未观察到同名文件或符号链接，文件名无来源标记符合新本地 Skills 候选规则。这只证明当时磁盘候选没有冲突；没有 Host 生成的最终保存计划，也没有实际无覆盖结果。根目录属当前用户、模式 0700、shell 读／写／搜索为 true；应用授权未实测。
- **审核、确认和写回。** 指定 run 持久化为 `not-reviewed`，没有显式 `resultVersions`、审核后的派生版本、写回记录或结果编辑草稿。当前代码在没有显式版本时投影原 run ID 为初始版本，其审核仍是 `not-reviewed`；这不是已确认审核。当前版保存路径静态要求已审核的精确版本/hash、当前 revision、注册根 canonical 校验、目标及配套文件冲突检查、用户明确确认，实际写入采用排他创建。未生成或读取活动确认令牌，未执行审核、保存或任何写入来证明这些条件成立。

## 剩余缺件与解除证据

| 缺件 | 责任、受阻动作与最晚消费点 | 解除证据 |
|---|---|---|
| AR7-G02 当前选择与同版 Host | AR7-P／DSH Host，AR7-C 核同一对象。阻当前组合签收与原稿接续，最迟实际采用／运行前。 | 在不干预其他任务且另有相应范围时，具名原生回执固定实际 bundle、Profile、Workspace/任务/会话/revision 与明确选中 `89dd69c1…` 的版本和正文 hash；附适用 Host/权限准入，以及对差异接点的同版验证。不得用 `f56b9fb7…` 或旧 bundle 的结果替代。 |
| AR7-G03 最终目标及权限 | AR7-C／DSH Host。阻读写、安全打开或声称无覆盖；最迟实际读取／写入前。 | 同一原稿和已审核版的 Host 计划给出实时权威根、准确最终 Markdown 和元数据路径、文件新旧／同名、应用授权与无覆盖处理；写后以原件、字节/hash 和实际回执补结果。 |
| AR7-G03 明确审核与保存确认 | AR7-C／Host 及原确认责任方。阻提交保存，最迟确认／写入前。 | 有效的精确审核版本/哈希与具名审核记录；编辑后再审。用户确认绑定同一版本、当前 revision 及实际目标，不传播确认令牌。后续打开、固定引用及未提交编辑稿正常重启恢复按 R7-03 各自留证。 |
| ARN-11/12 | AR7-P/C 保留原应用待核；本用途未选网站旧快照。 | 只有实际选入对应分支时才核原导入合同、版本、生命周期及真实目标，不用本次磁盘不存在替代未来文件身份。 |

AR7-G01 沿 [R03 限定核收][r03]，二十项文档意见原范围有效。原 [R01][r01]、历史 FAIL／UNKNOWN、九项缺件和前轮 [G02/G03][previous] 继续各按原记录。专业审阅、用户接受、发行及原费用授权彼此独立；历史 R7-02 真实调用余量为 0。本轮只新增证据文档，未启动应用或测试，未切换、审核、保存、重启、调用业务服务、联调、投递或提交。

[dispatch]: </Users/tinadong7036/Documents/开发项目/docs/coordination/execution/2026-11-11-interface-r2-ar7-host-followup/dispatch-preflight.json>
[r03]: </Users/tinadong7036/Documents/开发项目/docs/coordination/execution/2026-11-11-interface-r03-ar7-review/closeout.md>
[r01]: </Users/tinadong7036/Documents/开发项目/docs/coordination/execution/2026-10-30-interface-stage1-closeout/closeout.md>
[r702]: ../2026-11-10-r7-02-live-16384-r1/verification.json
[previous]: ../2026-11-11-interface-r2-ar7-g02-g03/adoption-record.md
