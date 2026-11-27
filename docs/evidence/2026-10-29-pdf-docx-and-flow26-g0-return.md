# PDF/DOCX解阻与新版Flow-2-6双来源验收进入条件返回

日期：2026-10-29，Asia/Shanghai。执行者：Codex /root，单代理作者自查。

承接用户“进行3和4”，对应上一轮最终答复中的第3项PDF/DOCX准入与第4项新版Flow-2-6真实双来源验收。绑定[既有计划](../plans/2026-10-29-project-summary-and-next-development-plan.md)的DS-03/Task 4与条件C/G0；[EXEC-R2记录](2026-10-29-pdf-docx-g0-execution-preflight.json)保全21项输入和14项原有工作区文件。中心1.2.1、整体1.3.1/NS1-R1/P28沿本轮实际读取范围核对，不重开规划或扩大授权。

**本批完成固定provider资格复核、候选版本差异诊断、独立公开R2输入的实际Workspace读取与共同准备验证。PDF/DOCX均未达到READY，未执行U1、未接D1；新版真实双来源验收尚未进入，G0不关闭。** 不将准备函数通过算作实际Host、模型、API、专业或用户接受。

## 1. 第3项：固定provider已核，缺件有明确落点

[本轮资格证据](2026-10-29-pdf-docx-provider-readiness.json)逐件比对15个源码/锁成员与原归档，全部原字节一致。来源commit `639ed015397290b3745d163aafe02ffee4aa3f84`；归档SHA256 `bbc09e888e1df3aa37be049abdb7720951e76442d21e5432365d87a465d628f1`。未安装新包、未重跑旧65项provider测试、未修改主包pin，也没有声称已核最新上游。

| 合同要求 | 本轮固定源码证据 | PDF / DOCX判断 |
|---|---|---|
| 268435456字节硬内存，包含native与后代 | Node README 140明确V8堆帽不覆盖进程树；index.ts 222只设堆帽。Python `py/bootstrap.py` 1046–1049在Darwin不设置RLIMIT_AS | 均缺合格执行证据；不以RSS采样/Promise超时替代 |
| 严格文件读取、网络与exec边界 | `sandbox-local/src/profiles.ts` 17与35允许根目录读取；52使用allow default加写入限制 | 均未满足本材料合同；不从公共file-effect full推导全部隔离保证 |
| stdout 2097152 / stderr 16384、5000/15000ms与完整回收 | Node index.ts 243–269共用输出账本；README 141明确逃逸后代观测边界 | 均未取得逐限额、全过程及全部回收证明 |
| 对应格式的parser/runtime/guard/adapter/profile与通知闭包 | 现有分发候选与原件保留；尚无满足上述执行合同的完整U1装配身份 | 均未READY；已有原件不等完整分发闭包接受 |
| DOCX特有原件/ABI与许可 | 两XSL/readme效力、native ABI、OPC/DTD/entity/numbering完整剖面仍沿原缺件 | 仅阻DOCX，不作为PDF前置 |

上述判断只约束本次固定来源与当前证据，不声称DSH所有环境均无此能力。产品方向仍为基于DSH且不限定OS，不恢复旧独立Mac应用/Python/XPC产品前置，不通过新增私有执行器或降低常量绕过门槛。

本轮使用的`.pdf/.docx`内容是扩展名准入探针，并非有效文档/解析器样本；两者在正文读取前被现生产准备入口拒绝。此检查只证明未开放路径继续关闭，不是PDF对象、xref、解码或DOCX ZIP/编号解析验证。

### 新发现：未来提取候选v3与现M06 v3冲突

原提取合同第5节75–77行将`materialEncoding:'extracted-text-v1'`、新提取候选`v340-native-candidate-3`和累计`oasis-v340-2/material_extractions`列为**目标，未实施**。现`src/v340-native-contract.js`第18行起的严格v3已用于M06 0.1.2/0.1.3身份，允许无提取证据，并拒绝`materialEncoding`等额外字段。本轮以真实schema验证了这两点。

这不是已开放路径的运行故障，但会阻止按旧目标版本直接接D1。提取接入需先以新补充明确兼容编码、候选判别版本、摘要与累计证据继承规则；保留当前M06 v3及旧v1/v2的原记录/摘要。不得直接替换v3语义、只改expected hash或给旧回执补签。本批只登记差异，没有静默重命名或修改冻结合同。

### 进入U1仍需的准确材料

| 交付职责 | 缺件与消费方所需证据 |
|---|---|
| DSH公共执行能力提供方 | 当前固定/批准版本的具名能力、实际导出/调用方法、平台范围、硬内存/读/网络/exec/输出/期限/回收证明；无法满足应逐能力明确，不以“provider已测试”替代 |
| 材料提取与分发维护方 | 按PDF与DOCX分别冻结runtime/parser/guard/adapter/hash、来源许可/通知、格式剖面和可执行离线命令；DOCX另交ABI及特有缺件 |
| DSH消费者 | 在版本兼容补充明确后，先消费对应格式READY包，实际Host外U1通过才接D1；保留全部容量限制、旧数据与无覆盖写回 |

仅整理本地退回清单，未向其他聊天、WorkBuddy或第三方发送任务。

## 2. 第4项：独立公开R2已走实际共同输入准备，真实双来源仍缺件

本轮采用[独立自编R2](2026-10-29-m06-public-calibration-input-r2.json)，没有采用从测试输出派生的旧输入。复制3个已哈希的公开Markdown文件到新隔离Workspace，连同4个文本字段，经生产`createWorkspaceMaterialManager`与`createV340PreparationService`执行。文件正文、values、receipts和完整prepared对象与冻结R2逐字节/结构一致，实际输入哈希为`a34ae147caa04a87705e2b809bc2e42aa339b5c29e72f47c7e7ee0d1ea05764b`。

[实际准备回执及当前准入表](2026-10-29-flow26-g0-admission.json)保存Workspace、3文件原哈希、命令、缺前序警示与当前来源状态。`upstream_md_file=not_provided`，其警示为open，upstream为null；没有借用旧生成结果补齐。此输入仅供具名的缺前序容缺校准，不能据此完成全输入或完整专利交付验收。

| 层次 | 本轮状态与进入真实动作前的缺件 |
|---|---|
| 共同文字输入 | **准备已验证**：3文件+4文本，缺前序明示，Workspace归属和完整receipt验证；两来源在catalog仍disabled，dispatchEnabled=false |
| 本地M06资源/规则 | 沿用已接候选0.1.3与原F26 0.1.9范围；本轮再核上一批44项来源身份。0.1.11试行不自动采用。候选程序合同不等安装包实际装配或模型接受 |
| 原生模型/安装装配 | 需固定当前运行Host/Workspace/session/provider/model、共同输入确认及请求标识，保留同一数据/费用范围；本轮未启动Host或调用模型 |
| 专业API输入 | 已观察Fast39不能证明共同八输入无损映射；文件、要求、前序合并/缺省/并存/必需性待业务服务方明确，不根据名称或单例猜值 |
| API结果及归属 | 观察到的单段output不等共同七输出；需实际结果合同或经确认的确定性转换，并明确未评估项；account/origin/Workspace/folder/service/schema权威绑定未接受 |
| 请求授权 | 本次“进行3和4”承接工作目标；旧一次最多3元请求已消费，不重置。新请求需绑定实际数据去向、模型/服务、次数与费用范围；现缺件使请求尚不可审定派发 |
| 业务与用户接受 | 专业审阅者未指定；需按准确产物判据记录审阅、编辑再审、累计Markdown、保存、原生引用草稿及重启恢复；本轮无生成产物，不能预填接受 |

PDF/DOCX未READY并不阻止合格文字路径的独立准备或将来的文字校准；API语义缺件也不代表后台R6独立技术交付不存在。两者都不能用来伪造本目录主线采用或新版双来源业务验收。

## 3. 新鲜验证与保全

执行方式为zsh启动固定`tools/bin/node`，命令和完整输出保存在`.local/pdf-docx-g0-20261029/current-ingress-tests.json`与同目录`.log`。共8/8通过、0失败/跳过：6个本轮公开输入/拒绝/版本诊断，2个既有准备合同测试。没有扩大全量verify或重建诊断产品。

本轮初次定位Python bootstrap误用了`src/bootstrap.py`，该单项读取失败保留在工具输出；通过`rg --files`定位到`py/bootstrap.py`后完成实际源码与归档比对。该读取失败不当作验证通过；最终15成员核验和8项测试均独立exit0。

本轮无产品源码、依赖、锁、pin、日常App/Profile、旧失败根或已有证据覆盖。三处当前状态仅前置本轮接续，历史原字节后缀保留；预存其余11文件保持。无真实模型/API/上传/Send/费用，无提交/推送/发布。最终核对见[验证记录](2026-10-29-pdf-docx-g0-verification.json)。本报告是作者自查，不称独立审计。
