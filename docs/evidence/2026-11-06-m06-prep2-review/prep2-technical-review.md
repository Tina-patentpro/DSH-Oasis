# PREP2技术复审

2026-11-06，Asia/Shanghai；Codex单代理另轮技术复审，非独立审计／专业／用户接受。**结论：在任务私有、协作写入及明确调用约定范围内，PREP2四项修复可作为后续机制基线；本轮未发现新的阻断性实现问题。真实源执行仍未准入。**

## 对象和检查证据

- 冻结包：`FAST39-RESTORE-MECHANISM-PREP-2`，FREEZE SHA256 `9e64932fd76e4b1d454753bd468d75f362b25cd8977297fe335937c43c826340`；11个成员均与冻结身份匹配。
- 模块：`.local/fast39-registry-restore-once-r2/revisions/prep-2/restore_once.py`，22629B，SHA256 `62ade9db0000f9faa35736b5f0ac0d07557d8fc6d13d88db1b0987f8994070d4`。模板、原20项fixture、R3、native工具和validator六项pin均匹配。
- 实际审阅：最终模块全文、最终差异／调用约定、原fixture及新增14项测试逻辑、R3摘要与两阶段冻结合同、PREP1发现与PREP2修订。函数准确位置和pin在[静态核对](prep2-static-checks.json)。未把中间33项版本或首轮调用约定当最终版本。
- 本轮使用记录的Python3.12.14／jsonschema4.26.0，将已核原字节直接compile并加载native／validator／PREP2，绕过旧pyc；核路径根、对象引用和`_pins()`。加载检查exit0，源setup／锁／治理调用0，materialize／assemble／commit均未调用，见[实际加载核对](prep2-load-check.json)。这不是未来真实source调用文件的签收。
- 原最终[34项测试日志](../2026-11-05-fast39-mechanism-prep2/tests-green-final.log)与[test-results-final](../2026-11-05-fast39-mechanism-prep2/test-results-final.json)身份一致：原20＋新增14，原运行exit0。按计划复用，不为本轮重复广验；本轮没有声称新跑34项测试。

## 四项修复逐项复审

| 发现 | 最终实现／证据核对 | 本轮结论 |
|---|---|---|
| MR01 路径越界 | `_real`拒绝点段／非规范拼写，逐组件拒绝link／junction和存档，核resolve结果；`_bytes`再按规范真实路径核精确固定项或evidence后代。原4个MR01用例区分简单／嵌套越界、evidence根和合法路径 | **CLOSED_AT_REVIEWED_MECHANISM_LEVEL**。没有仅靠字符串前缀放行；不升级为OS权限边界 |
| MR02 登记／临时文件链接 | `check_context`核登记非链接，`_registry_bytes`每次重新核路径和打开后的regular类型；临时文件记录设备／inode，在替换前再次核类型、身份、字节，清理只删本次不变文件。原3用例覆盖初始登记链接、写前登记换链与临时换链 | **CLOSED_AT_REVIEWED_MECHANISM_LEVEL**。外来路径保留，未自动接管或覆盖；非合作进程检查点之间的竞态仍属已声明限制 |
| MR03 时间回退 | `assemble`要求带时区且`post-setup last_updated_at <= prepared_at <= now`；`_f1`重现使用冻结prepared_at，不重采时间。最终调用约定要求首次准备由调用处采真实时刻。原2用例覆盖明显回退与合法UTC | **CLOSED_AT_REVIEWED_MECHANISM_LEVEL**。只能核顺序，不能从JSON认证任意人填时刻或用户决定；真实调用处采样身份仍在F0／F1阶段绑定 |
| MR04 终态收据丢失 | replace前保存已确认raw／intent摘要；读回、最终观察和临时清理分开捕错。replace已尝试后异常记UNKNOWN；结果文件无法排他写入时以OutcomeUnavailable携完整载荷及attempt-start路径交调用方，不覆盖外来收据。原5用例覆盖写后缺失、清理、收据占用、锁释放及写后pin不可读 | **CLOSED_AT_REVIEWED_MECHANISM_LEVEL**。未发现终态构造再次依赖写后输入读取；收据不可写仍不能称已持久保存或成功，调用方须保存异常载荷并只读核对 |

MR01—04的PREP1原OPEN和失败证据保留；本表只接续最终PREP2。没有为复审改模块、模板、旧日志、R3或任何expected hash。

## 实际调用与两阶段合同

| 接点 | 已核相容行为 | 尚需在真实阶段取得 |
|---|---|---|
| 加载／materialize | 实际字节加载和固定路径可核；七槽模板、严格Schema及R3成员pin不变 | 真实调用文件／进程加载身份、参数及真实用户指示来源；本轮加载检查不代未来调用批准 |
| 普通setup | `_verify_setup`逐字证明请求／前后版本／own row／空grants／原事件／六字段事务和反向还原；拒绝idempotent当前状态单独作成功证明 | 正常CI后真实F0、准确B_SETUP和commit模式；普通started由原工具单独执行，不由本模块串起 |
| F1／门 | `_f1`匹配F1／外部门／target／mode，区别条件批准与准确最终批准；校验完整候选重现和diff；两摘要职责保持 | 真实setup成功原件、保护／治理原件、F1和有来源的条件覆盖或准确最终批准；JSON的PASS／allow_commit不能认证用户同意 |
| 单次提交 | attempt-start排他新建；持原锁重复核F1和基线，临时文件fsync后一次replace，读回；失败／未知保留尝试，不自动重试或回滚 | 精确B_COMMIT、当时新鲜完整治理0；提交后严格选行／旧事件／归属／14业务行保全和自身普通生命周期 |

完整候选、时间、两种摘要及实际门必须按R3分层冻结；B通过不暗授A。当前source README只读核得revision489，与原观测同hash；未进行源治理重跑或正常周报复盘，不能把旧周报时效错误解除。没有取得真实F0／setup／F1／授权，也未加源锁、执行apply或commit。

## 保留限制与接续

1. 同权限非合作进程的竞态、硬链接或OS隔离不是本机制已证明的安全边界。`_write_new`做文件fsync，不能据此承诺目录元数据／断电后完整耐久性；完整崩溃恢复原就未验，本轮不扩成新平台或通用恢复器。
2. PREP2没有生产CLI或真实source caller；真实调用处必须按最终约定处理Refused、FAILED_BEFORE_REPLACE、UNKNOWN_AFTER_REPLACE及OutcomeUnavailable，保留原尝试，不能换ID绕过。这个阶段缺件阻真实源动作，不影响本次技术复审结论。
3. 依赖只核记录的解释器、jsonschema版本及模块pin，未验完整运行时再分发或任意文件系统。原34项是隔离机制证据，不是源工作流、后台、DSH业务修复或专业接受。
4. 下一可准备对象为真实调用缺件及正常CI的准确工作范围；未满足源门之前不生成或写入真实F0／setup／F1、B阶段或A制作。后续授权仍按准确对象核对，不由本报告新增。

本轮任务2仅完成PREP2技术复审；计划中的正常CI前置没有执行。任务1不等待这些门。两项任务的保全与最终检查见[本轮验证](verification.json)。
