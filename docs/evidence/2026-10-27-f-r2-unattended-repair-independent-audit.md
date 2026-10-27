# F-R2-U-A01：修复增量独立处置

日期：2026-10-27。沿用本次 **GPT6.1 Max新上下文独立审计席位**，只处置首轮P2修复与54个新增成员；未开启另一审计代理、重做原批全范围审计或启动Desktop。

**结论：F-R2-U-A01在新增v2观察器及具名修复Profile范围内关闭；新增Critical/P1/P2/Minor均0。** 接受新Profile正常重启111.237秒窗口内的Host二进制上传开始数0及公开草稿/附件字节保持。首轮v1的FAIL、正常流量记录与[首轮独立报告](2026-10-27-f-r2-unattended-independent-audit.md)保持原字节；完整F继续OPEN。

## 1. 冻结身份与范围

首轮报告15368字节、SHA `9975a8202121e7bccbb7ee98eefc5ab64b5844bfb179df702669e180a06f4e25` 已先冻结，本次独立重核保持。原109成员亦仅做保全hash复核，109/109一致；不重跑其全范围测试或重判其它既有出口。

| 本次增量对象 | bytes / 数量 | 独立SHA256 |
|---|---:|---|
| [修复返回](2026-10-27-f-r2-unattended-repair-return.md) | 4449 | `6b5ba7ca98a34e0a081dbdc97c69bbeac434aa2cec3829680af1e03d1decbfd6` |
| [修复执行单](2026-10-27-f-r2-unattended-repair-execution.json) | 16259 / 54成员 | `09d8555f91011bf60142b902c0c5eee06243c2390f1cce0e3792f618b43f2a1b` |
| [v2观察器](../../scripts/tests/fixtures/recovery-upload-observer-2.mjs) | 1462 | `bf9f5dd0acae3f20ef521d9962803f0bcc69d97364ab108823fc329ee75f327c` |
| [v2回归](../../scripts/tests/recovery-upload-observer-2.test.mjs) | 2828 | `860e72902354684b932d062fec1e1c0c52e4f56aeed23ba6e5be45df44f54f4a` |
| [两版使用边界](../../scripts/tests/fixtures/recovery-upload-observer-versions.md) | 834 | `4b4f635757bf797cd55b601aced669c6b762177c41739a633a48304270f05544` |
| 新修复Profile准入 | 42616 / 198pin | `94753482cbc026897d8093a8875048850ce611dd5bc1141243d82473fcb793ab` |

54/54成员及198/198pin全部独立相等。新准入位于 `.dsh-test/f-r2-unattended-20261027-repair/evidence/f-assembly.json`；新Node fixture精确包含v2观察器源码，客户端proof与首轮逐字相同。原产品代码、依赖、v4及装配器没有本次修复增量。

修复返回中的短号 `F-R2-A01/P2` 在本报告中准确对应首轮 **F-R2-U-A01**，不修改冻结返回或执行单。本报告是同一审计的范围内处置，不把作者GREEN直接改称独立接受。

## 2. P2修复核验

v2在URL解析处捕获异常，仅增加 `unclassifiedRequests`，不输出异常对象或原始地址；记录writer的异常亦被捕获，增加 `evidenceWriteFailures`，不向HTTP诊断通道抛出。任一异常计数非0、缺subscribed/disposed、无实际请求、关键字段缺失，都不能作为“零上传”接受。writer在dispose时失败可能没有最后记录，这必须按缺disposed拒绝，不能补0。

独立使用原反例的真实本地HTTP请求 `POST http://[?auditToken=QUERY_ONLY_MARKER`，只把导入目标换成v2。两个固定解释器均返回200/`handled`、exit 0，记录 `unclassifiedRequests=1`；stdout/stderr都不含query标记。因此该请求继续处理，同时证据被标为不可接受，没有把未知分类冒充0。

独立额外检查writer分别在subscribed、request、disposed及所有写入阶段抛错：四种情形均不阻断原handler，正文和响应保持；前两种有失败计数，后两种缺终止记录或全无记录，均不满足接受条件。常规端口隔离、精确方法/路径、真实上传阳性、无正文/头/query值输出、dispose后不再计数和合成访问getter探针亦在v2上重新定向验证。

本次实际只跑受影响定向集：新增2项回归＋3项独立行为探针，两解释器各 **5/5、exit 0**；另各执行一次独立原畸形target进程探针，均exit 0。没有重新运行整个99项集合。已读取并复算54成员中的作者RED日志（2失败，URL异常与writer异常）及最终两解释器日志（各99 pass、0 fail/skip）；99/99是作者执行证据，不冒充本次独立全量重跑。

原v1源码及测试作为历史保留，版本说明明确禁止新消费。关闭仅适用于v2当前输入；没有把v1改判为安全，也没有把两者装入无夹具195pin运行组合。

## 3. 新修复运行的实际记录

独立从实际JSONL逐行校验必需字段、累计HTTP/二进制计数、两个异常计数及完整生命周期。没有从空列表构造计数0。

| 新修复运行 | subscribed → 首条实际HTTP → disposed（UTC） | HTTP / binary / unclassified / writerFailure |
|---|---|---|
| 首次，Host PID82347 | 13:51:03.648 → 13:51:04.419 → 13:51:29.902 | 47 / 0 / 0 / 0 |
| 同Profile重启，Host PID82444 | 13:51:40.604 → 13:51:41.244 → 13:53:31.841 | 35 / 0 / 0 / 0 |

新198pin继续通过同一维护入口 `--check`。v2订阅Node apply同步完成，固定App的boot先于Renderer挂载，首条HTTP也晚于subscribed；本次未改变首轮核验的该启动关系。重启窗口独立算得 **111.237秒**；两次新启动退出JSON均code 0、signal null。审计检查时两原Main PID82331/82430及Host PID82347/82444均不存在，57583 TCP connect_ex为61，当前无该端口监听。

首次、重启initial/dwell三份AX均为Workspace `71120098-c4d4-4075-bddd-49e1371eb8f7`、Session `session-afaffbc1-9b24-4447-a7fa-98f0daef6428`，18字符、SHA `f91afd470598379d1072eaac60c3eb7f886929b995f93160f38c72a2888cb7c0`、2件待重试文件、Send禁用；dwell PNG亦已独立查看。首次proof是seeded，重启两份是waiting；相同固定client仍在目标活跃时禁止seed，因此不把waiting当重新seed成功。

重启前后两File字节均等于首轮/原公开件：96字节、SHA `53f292233c61aa19aaa98a7e2a2b6e5d0392ae43e779546d753ff7fbf85b0357`；449990字节、SHA `159d0f0fa12bf8c4434c6007e661fb191734e408681899d7288b9a73e2747393`。原IDB日志保留为后日志原样前缀，Host attachments目录不存在。这里仍仅判断Host收到的二进制请求开始，Worker意图、RPC与模型消费的边界沿首轮不变。

### 证据目录偏差的裁定

新fixture的JSON转义路径替换没有命中；**新准入固定的index实际把v2 ledger追加到首轮Profile的evidence目录**。本次按该index明确绝对路径、PID/UUID文件名、v2字段、运行时间区间及54成员SHA核对，实际文件为：

- `upload-observation-82347-93488f83-3254-4814-9418-6c1779704ad3.jsonl`
- `upload-observation-82444-cba4931c-2ba8-443c-a24d-dc872aa5331b.jsonl`

它们均为新增文件，不是原109中的79796/79916两份ledger；原109仍全部原hash。只搜索repair目录得到的 `repair/dwell.json` 空列表保留，没有被当作零请求。该偏差属于已披露的本次归档位置错误；来源、时间、pin与实物可准确对应，故不阻断本次有界接受。它不证明两个Profile共享业务存储，也不构成旧准入重新签署。未来新夹具应明确输出到其新root，不修改本次已冻结源码或文件来修饰位置。

## 4. 独立命令与处置边界

实际通过zsh/Python subprocess执行，完整argv在 `.local/f-r2-unattended-20261027/audit-independent/repair-commands.json`。

| 命令/检查 | 退出码及实际结果 |
|---|---|
| `python3 -B .local/f-r2-unattended-20261027/audit-independent/verify-repair.py` | 0；54成员、198pin、原109与首轮报告保持 |
| 工具Node24.21.0：`--test --test-reporter=tap scripts/tests/recovery-upload-observer-2.test.mjs <audit>/observer-independent-v2.test.mjs` | 0；5 pass、0 fail/skip |
| 内置Node24.18.1、`ELECTRON_RUN_AS_NODE=1`、同一2文件 | 0；5 pass、0 fail/skip |
| 两解释器：`<audit>/malformed-request-v2-probe.mjs --observer` | 各0；handler 200，query不泄漏，未分类计数1 |
| 固定工具Node：`scripts/f-development-assembly.mjs --check <repair-root>` | 0；198pin、materialized、realCallBudget 0 |

独立 `repair-check.json` SHA `aa25ef943cc2450dae43ebb792a1e33efd64b3e5d0fcb7cdbfca33a347f2d2d9`；`repair-commands.json` SHA `cf07d6c47b1b5465f49c5fc5f4869ba5b616c36a34a33c908c797d90de5f159a`；`repair-supplementary.json` SHA `e757b376a19278dea2353ab56efdd5066af9c1708aaed1fb26ae5be59794c2e8`。没有覆盖首轮审计目录既有探针/日志或原109/54成员。

本审计未启动Desktop、读取认证/credentials、触发真实上传/模型/API、费用、消息发送、提交、推送或发布。独立探针使用自建loopback服务器与公开标记；实际Desktop过程依据冻结证据复核。

未判/未验继续沿[首轮报告第5节](2026-10-27-f-r2-unattended-independent-audit.md#5-未判未验及提交裁定)：历史R2原Profile无干预证明、无限期零重传、Worker/RPC全流量、真实Host重传/模型收到附件、多个实际DSH Renderer、双存储/强杀/跨平台、真实UNKNOWN、全writer与安装发行升级回退。无夹具195pin与双草稿保持沿首轮接受，不在本次重新验收。

**允许将v1历史/FAIL保全、v2修复及具名返回/处置作为本轮限定增量分批本地收录；未发现该增量仍须修复的Critical/P1/P2/Minor。** 该裁定不授权推送、发布或扩大真实调用，也不关闭完整F及其它独立验收门。
