# Week 3 Task 6 实施证据台账

- 日期：2026-08-26
- 范围：审核后写回确认、单次短期令牌、新目录无覆盖提交、相邻元数据、不可变写回历史、Host/Client RPC
- 明确排除：Task 7 UI、既有目录或文件覆盖、网络/Dify/收费管理、全局血缘数据库、专业正确性与法律结论
- Git 起点：`main` / `02b3eb7e40ff230689be8cae4218180869de836e`；工作树包含同一 Week 3 Task 1～5 尚未提交的已验证改动
- Profile 裁决：用户已确认 `better-sidebar` 安装为有意操作；Task 6 不修改、回滚或测试该插件

| 层级 | 证据 | 当前结果 | 证明边界 |
|---|---|---|---|
| Task 6 before | `baseline/*-before.*` | PASS：source 90、Profile 13708/530 links、workspace contracts 4、toolchain failures 0 | 用户确认外部安装后的只读基线；不证明后续无并发变化 |
| Writeback RED/GREEN | `runtime/writeback-prepare-*.txt`、`runtime/writeback-publish-*.txt`、`runtime/task6-focused.txt` | PASS：缺失模块和缺失 publish 分别先 RED；最终 Task 6 聚焦 54/54 | 路径、令牌、锁、暂存、fsync、硬链接、清理与故障注入；不证明浏览器交互 |
| Service/RPC RED/GREEN | `runtime/writeback-integration-*.txt`、`runtime/writeback-recovery-schema-*.txt`、`runtime/writeback-domain-path-*.txt`、`runtime/writeback-manifest-invariants-*.txt` | PASS：端点/服务缺失、unsafe recovery、绝对持久路径和 manifest 越界分别先 RED；最终全部 GREEN | 权威审核门、Domain 写回记录、索引失败、安全 recovery manifest 和 strict RPC/Client；不证明 Desktop 已调用 |
| 隐私与文件系统静态审计 | `runtime/privacy-and-filesystem-audit.txt` | PASS：目标源码无 console/logger/rename；仅出现两处 `recursive: false`；token 仅在瞬态 schema、内存 store、consume 和 RPC 参数链路 | 文本静态扫描；不证明运行时第三方库或进程内存取证 |
| Task 6 全包验证 | `runtime/package-verify.txt`、`runtime/package-verify-escalated.txt` | PASS：首次 build 与 155/155 tests 通过、pack 因沙箱 npm-cache EPERM 中断；按审批完整重跑后 build、155/155、29 项 pack 全通过 | 本地 Node、真实临时文件系统与包合同；不证明 Task 7、Desktop/浏览器或生产环境 |
| Task 6 after | `baseline/*-after.*`、`baseline/source-diff.json`、`baseline/profile-diff.json` | PASS：source 92、Profile 13708/530 links、workspace contracts 4、toolchain failures 0；13 项变化全部命中精确 allowlist、unexpected 0；Profile SHA-256 前后同为 `3B5AADD3C5A26B200F0D673EE94A0FDE38C5B45A5FB49169D12537061A14EEB5` | 本批未修改或回滚真实 Profile/better-sidebar；只证明采样时点状态 |

## 目标合同

- prepare 仅接受已审核批准、未 blocked、当前 run 自有 artifact；只准备一个尚不存在的相对目录。
- prepare 返回 10 分钟有效、单次使用、进程重启失效的确认令牌，以及包含两个文件、大小、哈希、绝对目标和到期时间的瞬态清单。
- token、绝对路径和正文不得进入 Domain、日志或相邻元数据；Domain 只保存相对路径与哈希。
- commit 只接受确认令牌；再次校验 workspace/run/artifact/review/target 后，在目标同级暂存，逐文件 `fsync` 和哈希复检，再用新目录与硬链接实现不覆盖发布。
- 同一目标并发最多一个成功；目标已存在、父级缺失/越界/reparse、Windows 保留名、尾随点空格、过长路径均在写入前拒绝。
- 失败时只清理本操作已知的新暂存文件、新发布文件和空新目录，绝不递归删除；相邻既有文件哈希必须保持不变。
- 文件已经发布但 Domain 索引失败时返回 `WRITEBACK_COMMITTED_INDEX_FAILED`，保留输出与相邻元数据，允许人工恢复索引。

## 当前结论

`STATIC_ONLY`：Task 6 已形成本地实现、真实临时文件系统、构建、155 项 Node 测试与 29 项打包清单闭环；尚未执行 Task 8 的 Host 重启、DSH Desktop/浏览器、临时 Workspace A/B 和进程外竞争验收。

## 实现结果

- prepare 只从 Host 权威 approved、非 blocked run 读取 artifact；Client 只能提交 artifact ID 和相对新目录，不能提交正文、hash 或 review evidence。
- 确认 token 仅保存在 Host 进程内，10 分钟过期、单次消费、最多 128 个；新 manager 无法消费旧 token。
- 路径在 prepare 与 publish 前复检 Workspace canonical root、既有父目录、reparse、目标不存在、Windows 保留名和 240 字符安全预算。
- publish 在目标同父目录创建唯一 staging；两个文件均以 `wx` 写入、`fsync`、大小与 SHA-256 复检，再创建最终新目录并逐文件 hard-link，未使用 rename、覆盖 flag 或递归删除。
- 主 Markdown 与相邻 `.oasis.json` 均由 Host 生成；元数据只含 workspace/task/run/workflow/mock/input/artifact/review 的受限证据，不含 token、绝对路径、正文或价格字段。
- 同一进程内按 canonical target 串行；两个 prepare token 对同一目标并发时最多一个成功，另一个在复检时得到 `WRITEBACK_TARGET_EXISTS`。
- 主文、元数据和 hard-link 故障均只清理本次已知新路径；测试中的既有相邻文件 SHA-256 不变。
- 文件发布成功但 repository/Domain 索引抛错时返回 `WRITEBACK_COMMITTED_INDEX_FAILED`；RPC 只允许 strict 相对 recovery manifest，拒绝任何额外绝对路径。
- Domain WritebackRecord 固定两个相对文件，要求同属记录目录且分别包含 Markdown 与 JSON；token 和绝对路径无法通过持久化 schema。

## 停止条件

- 需要覆盖、移动或删除任何既有文件/目录；
- 无法在写入前证明父目录位于当前 workspace 且不是符号链接、junction 或其他 reparse point；
- token、绝对路径、正文或敏感配置进入持久化 Domain、日志或元数据；
- 失败清理需要递归删除或无法限定到本次新建路径；
- 文件提交与 Domain 索引失败不能被区分并安全恢复；
- 真实 Profile 出现未归因的新变化；
- 本地静态/Node 证据被表述为 Desktop、浏览器或生产证明。
