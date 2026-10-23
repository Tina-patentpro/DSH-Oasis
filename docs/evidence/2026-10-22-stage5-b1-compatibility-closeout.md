# 阶段5 B1旧空前序记录兼容修复、回归及复审（2026-10-22）

用户同意上一轮审计的下一步。本批按优先级先完成B1/P2，保持单代理、不启动Desktop、不新增真实模型/API调用。本项在源代码、合同及临时磁盘合成测试范围关闭；阶段5整体、真实宿主及安装升级验收仍未完成。

## 1. 实现与证据保全

原问题见[三项P2修复全面复审](2026-10-22-stage5-p2-runtime-reaudit.md)：修复前合法的空`upstream_md_file`快照，在读取时被新增`.min(1)`拒绝，导致整个Workspace无法访问。

本批唯一产品改动是`packages/oasis-professional-service/src/v340-document.js:61`：上游文件输入使用`v340DocumentBodySchema.or(z.literal(''))`。它允许历史空输入进入既有结构检查，继续返回`warning / structure`，保持原准备对象、hash及警示；非空正文仍走原1MiB UTF-8限制。新结果、编辑稿、模型输出和Host保留内容的非空合同不变，不放宽普通材料上限，不增加迁移写盘或版本重标记。

新增正式`test/v340-legacy-upstream.test.mjs`及三份固定合成磁盘夹具与来源README。夹具逐字复制旧代码实际生成的prepared、unknown、failed记录，混存旧approved审核及Markdown/JSON双文件保存回执；测试不依赖忽略目录或旧生成器，不用当前代码重算预期旧hash。来源与SHA256见`test/fixtures/v340-pre-p2-empty-upstream/README.md`。

旧运行、准备、完整性、仓库、RPC合同源码均未改。原`test/v340-runtime.test.mjs`整份逐字保持，即原18项及上一轮新增11项全部保持。主锁/依赖/业务资源、活跃lib、应用、Profile和准入未改；旁置构建与活跃client.js逐字一致，无须覆盖lib。历史审计、失败材料和旧状态保留。

## 2. 正式红→绿及实际执行

先写10项正式回归，原实现运行结果为2通过/8失败、0跳过、退出1，错误指向空上游的`too_small`或由其导致的RPC失败；未改产品之前已确认红灯。仅加入输入空字符串分支后，相同10项全部通过、0跳过、退出0，没有修改测试断言来消除失败。

| 新增正式回归 | 结果 |
| --- | --- |
| prepared、unknown、failed分别只读/正常state RPC/关闭重开 | 3项通过，整个记录深相等，0次写盘，磁盘逐字一致 |
| 三态分别观察、重复观察/停止、相同requestKey再次提交及重开 | 3项通过；prepared仅转unknown/INTERRUPTED，其他终态保持；合成执行器调用0次，旧任务/冻结输入及hash保持 |
| prepared直接停止及过期revision保护 | 1项通过；过期停止不写盘，有效停止仅转unknown/ABORTED，不派发，旧批准及保存证据保持 |
| 实际Host材料读取0字节文件 | 1项通过，prepared对象与旧夹具逐项一致，警示/指纹保持，dispatchEnabled=false |
| 新结果、编辑草稿非空保护及显式清空草稿 | 1项通过；空正文结果/草稿拒绝，null明确放弃仍允许 |
| UTF-8超限、NUL、伪造hash及损坏记录不改写 | 1项通过，保留原容量及完整性拒绝 |

未决prepared/unknown仍阻止改稿及新requestKey派发；同requestKey幂等返回不会重放。failed没有被重新标为未决。新输入校验无转换，不清除unknown、不变更来源、不重算旧输入/产物hash或覆盖旧审核/保存回执。新运行的停止/迟到响应逻辑未改，其原正式回归继续通过。

## 3. 新鲜验证命令与结果

根目录`/Users/tinadong7036/Documents/开发项目/dsh-lab`，实际shell为zsh；Node固定为`tools/node-v24.21.0-darwin-arm64/bin/node`。主包工作目录为根下`packages/oasis-professional-service`。所有调用使用私有构建HOME/缓存、合成开关和固定工具，代理指向本机不可用端口；未安装依赖。

原始账本：`/Users/tinadong7036/Documents/开发项目/dsh-lab/.local/stage5-b1-compat-repair-20261022/commands.jsonl`，含完整argv/cwd/UTC/退出码；各日志和验证汇总位于同目录。

| 命令/日志 | 本次结果 | 退出码 |
| --- | --- | --- |
| `node --test test/v340-legacy-upstream.test.mjs` / `red.log` | 产品修改前2通过/8失败 | 1（预期红灯） |
| 同命令 / `green.log` | 10/10、0失败/0跳过 | 0 |
| 主包完整`node --test test/*.test.mjs`对应显式文件列表 / `full.log` | **945/945、0失败/0跳过**；新10项均实际出现通过记录 | 0 |
| 5份Mac安全/启动合同测试 / `mac.log` | **26/26、0失败/0跳过** | 0 |
| 旧代码重新生成的三态兼容探针及旧7探针 / `audit-probes-bounded.log` | **11/11、0失败/0跳过** | 0 |
| 原样旧7探针单独执行 / `audit-probes-isolated.log` | 7/7、0失败/0跳过 | 0 |
| 固定tsdown旁置构建 / `build.log` | 成功；client.js与活跃lib逐字一致 | 0 |
| 固定npm CLI `pack --dry-run --json` / `pack.log` | 117成员，无测试夹具/归档/依赖/运行数据混入 | 0 |
| 两种启动check / `check-synthetic.log`、`check-real.log` | 均拒绝固定应用文件漂移，没有启动Desktop | 各1（门禁仍未通过） |

构建命令为`node node_modules/tsdown/dist/run.mjs --config tsdown.config.mjs --out-dir ../../.local/stage5-b1-compat-repair-20261022/build`。`verification-summary.json`逐项记录新10项在全量输出中的通过名称、原29项测试文件未改、三份固定夹具与原审计字节相同、组件pin和pack检查。

### 一次旧私有探针等待不足及诊断

第一次将全量和两份私有探针并行执行时，`audit-probes.log`记录10通过/1失败、退出1。失败项为“all 14 nodes and both synthetic source labels preserve results on repository reopen”：Flow-4-12/local-skill在40次`setImmediate`后仍为prepared，未取得completed。兼容4项当时已全部通过。不能将该轮报为11/11，原失败日志保留。

全量结束后原样单独运行旧7探针7/7通过。进一步只修改本批忽略目录中的探针副本：原40次循环后追加最多5秒、每5毫秒等待，原completed、来源、审核及全部28个Workspace重开深相等断言不变，最终11/11通过。再在另一私有夹具中对完成写盘加入25毫秒延迟，28个组合均记录“40次后prepared、最终completed”，完整矩阵与重开断言通过（`audit-wait-diagnostic.log`，1/1、退出0）。这复现了事件循环次数不能充当磁盘完成期限的问题；未发现对应的产品发布失败。

没有修改正式测试、历史探针或产品来处理这个等待问题，没有新增永久诊断工具。未把隔离重跑抹去首次失败，也不将该合成矩阵称为真实14节点生成验收。

## 4. 单代理复审结论

按“旧输入可读而新输出非空”的已批准方案重新审阅本批差异及调用链：`documentFileSchema`只用于上游输入/inspect，输出`result`、`resultDraft`和RPC命令仍使用原非空schema；仓库读时重新准备所得对象与固定旧prepared对象完全相同，原完整性校验仍执行，没有读错误吞掉或不校验分支。原并发所有者、停止前派发、close、迟到保护和聚合上限代码未改，相关全量回归通过。

B1在本批代码/合同/合成持久化范围关闭，当前范围没有发现新的P1/P2。此为单代理作者单独复审，非第三方独立审计。三份固定夹具的只读证据及旧代码新生成探针互相补充；没有真实业务库迁移、实际Desktop进程重启或跨进程排他验收。

明确不外推的行为：新版共同页面、人工审核/物理Markdown保存/导出/原生对话草稿尚待接线；生产V340没有执行器/创建RPC，两种真实来源保持禁用；真实模型/API/认证/费用、非文本材料及实际安装升级不在本批验证范围，阶段5整体不能关闭。

## 5. 固定输入、保全与剩余事项

13项已批准组件/补丁文件与准入中的hash全部匹配。主锁SHA256 `903575be3f84c6b60e716a7ef7980efdb6f024af4e62982319261d1db27a18f9`，活跃及重构client.js SHA256均为`2c5ea5e3f7b1b40567a27bc2faa83f459863c1478d38eb2ce81d6a254b7c03aa`。本次未重新联网进行整套供应链恢复；组件匹配不等于完整候选准入。

3265份起点冻结文件，仅`src/v340-document.js`及状态摘要按范围修改；新增本报告、1份正式测试、3份原字节JSON夹具及来源README。其他文件、原29项正式测试及旧历史证据保持，原状态完整字节后缀保留；HEAD仍为`84c0cc5bd103a1860e2490494f3f50a1be8404d1`，分支`mac/continuity-v2`。最终逐项结果见`preservation.json`和`final-checks.json`。

后续可继续按已确认设计推进共同页面及审核/保存接线、业务资源/原生适配器的无模型接线、逐节点API精确映射与已有绑定证据、非文本解析，以及候选包清单/合成迁移回退准备；重大UI变化、真实调用和发布仍需各自明确条件。本批没有开始这些下游实现。

指定2.0.17旧恢复路径及旁置应用仍缺失。F1/R1固定恢复与完整候选准入、R6/F3/F4实际Desktop编辑/审核/原生文件/对话草稿/正常重启、安装升级回退和发行仍待验；两种check继续在`/Users/tinadong7036/Applications/DSH Desktop.app/Contents/MacOS/DSH Desktop`报`Pinned file drift`并退出1，不替换pin或放行2.0.18。

本批未启动Desktop或实际DSH进程，未新增真实模型/API、认证/登录/上传/费用/对话发送，未改日常HOME/Profile/应用/准入，未提交/推送/发布。真实调用继续受当前用户禁令及独立数据/费用预算条件限制。
