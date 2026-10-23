# 阶段5 B批读取准入与干净回归两项P2修复收口

日期：2026-10-23。项目`/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支`mac/continuity-v2`；HEAD `84c0cc5bd103a1860e2490494f3f50a1be8404d1`未改变。

**B-R1、B-R2在当前Mac离线范围已修复并经作者复审，未确认本轮范围遗留P1/P2。** 新增13项正式回归，定点59/59、正式全量1148/1148及补充150项通过。台账、来源禁用、业务容量及旧数据合同不改；阶段5整体仍未完成，本轮不推进C/E或其他批次。

## 修复行为

### B-R1：内核路径限制与已接受身份绑定

`scripts/check-v340-source-mapping.mjs`继续只读固定白名单资源及允许的清单入口，不跟随台账任意路径。核验器现在固定本次根目录身份，逐级记录目录/文件dev、ino，在打开后、读取内容前复核文件描述符与完整路径身份。最后分量文件替换、父目录替换及打开后发生的路径变化均拒绝，不以哈希相同代替归属。

本机Darwin采用内核`O_NOFOLLOW_ANY`禁止路径任一层符号链接，避免父目录检查与打开之间的重定向；同时使用非阻塞打开后检查普通文件类型。已读取本机SDK精确声明`/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/include/sys/fcntl.h:159`并实测。Node24未导出该常量，Darwin数值为`0x20000000`。本机实测表明它不能与`O_NOFOLLOW`组合（正常路径也返回EINVAL），最终只使用前者保护整条路径；正常及重定向正式用例均覆盖最终组合，没有放宽到旧路径读取方式。

Linux保留使用`/proc/self/fd/<已打开目录fd>/<单一分量>`逐级打开并核验身份的分支，持有父目录描述符直到读取结束；本轮只做代码复核，**没有Linux实际运行验收**。其他缺少此实现的平台明确返回`MAPPING_READ_UNSUPPORTED`，没有不安全的路径回退，也不宣称Windows或全部宿主兼容已验收。本次实际正式测试均在固定Mac工具环境运行。

原清单读取上限仍为2MiB；实际读取也分块限制，最多读取上限加1字节用于超限判定，超过2MiB不接受。读取后复核大小及mtime/ctime，拒绝读取期间改变的内容；成功与拒绝均关闭已打开句柄。没有修改业务1MiB文稿、2MiB材料/输入快照、8MiB Workspace或其他容量常量。

### B-R2：测试夹具自行准备.local

`packages/oasis-professional-service/test/v340-source-mapping.test.mjs`的`variant`在`mkdtemp`前显式`mkdir(repoRoot/.local, {recursive:true})`。原46项断言、测试正文与其他代码原字节保留，仅增加这一行初始化；没有提交或预填本机运行目录。

新增正式用例把原46及其明确依赖原字节复制到独立临时根，先断言`.local`不存在，再启动该正式文件，要求46/46通过。子测试进程去除继承的`NODE_TEST_CONTEXT`，以真实独立test runner的退出码及TAP计数判断；未把嵌套test runner的空输出当作通过。

## 新增正式回归与复审

新增`test/v340-source-mapping-admission.test.mjs`的13项，调度辅助仅在`test/helpers/v340-mapping-read-probe.mjs`，不向核验器增加测试钩子或发布内容：

- 不变路径正常核验、来源仍禁用、句柄完整释放的对照。
- 资源和清单父目录重定向、A→B→A恢复、最终文件及普通父目录替换、打开后父目录/文件替换、最终分量符号链接，共9项拒绝用例。
- 没有预建.local时，同字节原46可独立运行。
- 文件在stat之后增长超过上限，实际目标读取量仍受2MiB加1探测字节约束，拒绝且不泄漏句柄。
- 缺少安全读取实现的平台显式拒绝，没有内容读取或路径回退。

辅助进程使用真实复制文件、真实lstat/open/read及真实重命名/符号链接，仅安排确定性的系统调用边界时序。仓库外打开只在实际取得文件描述符后记录，读取只在真实读操作后计数；不会把打开前的realpath元数据探测误计成正文读取。清理前记录未释放句柄数，避免辅助清理掩盖泄漏。没有接触真实凭据、Profile、用户材料或网络。

作者复审核对根/父目录/最终文件身份、A→B→A、内核标志组合、分块读取边界、关闭句柄、干净副本及原46断言保全。此前补充150项继续全部通过，14节点/136输入/28来源格及114项真实缺口保持。遵循单代理规则，**没有独立代理或独立新上下文审查背书**；不声称所有文件系统组合穷尽。

## 新鲜验证

执行方式：zsh调用仓库固定`tools/bin/node`，未安装依赖。日志均在`.local/stage5-b-read-admission-repair-20261023/`。

| 命令/证据 | 结果 |
|---|---|
| 首批新增11项，`tools/bin/node --test packages/oasis-professional-service/test/v340-source-mapping-admission.test.mjs`，admission-red.log | exit 1，2对照通过9项失败，实际拒绝断言及干净副本失败；不是导入错误 |
| 最终两份正式文件，admission-green-final.log | exit 0，59/59，无跳过（原46+新增13） |
| 最终同字节新增13在两项均撤回的旁置副本，both-before.log | exit 1，2通过11失败 |
| 只撤回读取修复、保留.local初始化，withdraw-read-only.log | exit 1，3通过10失败 |
| 只撤回.local初始化、保留读取修复，withdraw-local-only.log | exit 1，12通过1失败 |
| `OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs`，full.log | exit 0，1148/1148，无跳过（原1135+新增13） |
| `tools/bin/node --test .local/stage5-b-source-mapping-reaudit-20261023/additional-boundaries.mjs`，review-boundaries.log | exit 0，150/150，无跳过；审计补证，不计正式新增 |
| `tools/bin/node scripts/check-v340-source-mapping.mjs --manifest docs/business-baseline/v340-source-mapping.json`，mapping-summary.json | exit 0，14节点、28格、114缺口、dispatchEnabled=false、realCallVerified=false |
| `tools/bin/node --check scripts/check-v340-source-mapping.mjs` | exit 0 |

旁置撤回始终使用最终新正式13与辅助文件原字节，没有回退当前实现。原初始红测11项与最终13项分开计数；其中增长/不支持平台补充用例由最终before撤回验证捕获。初轮本机标志组合EINVAL也已诊断并纠正，未将该中间失败冒充最终通过。

## 保全、证据与剩余边界

起点3324个已有非忽略文件已冻结。实际仅改根核验脚本、原46测试的目录准备和当前状态前缀；新增正式13、测试辅助及本报告。原B JSON/Markdown、业务原文/固定包、旧0.2.2资源、生产src/lib、容量/历史数据合同、原16/16/28及旧报告/FAIL均保持起点字节。状态旧文完整后缀保留，HEAD/分支不变；具体SHA256、日志/命令摘要和保全结果见`.local/stage5-b-read-admission-repair-20261023/verification-summary.json`、`preservation.json`。

生产运行包和发布白名单未变，未重复构建/pack，也未运行会改活跃lib的无参数verify。仍未启动Desktop/实际DSH、浏览器/loopback、真实模型/API、登录/上传/费用，未安装/升级、修改Profile/pin、提交/推送/发布。14个API格仍缺实际服务/schema/结果/账户项目证据，来源继续禁用；旧真实运行不外推到新版，Desktop/正常重启、非文本及真实双来源仍须后续独立验收。
