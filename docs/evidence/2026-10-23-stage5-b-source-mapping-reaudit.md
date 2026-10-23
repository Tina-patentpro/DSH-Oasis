# 阶段5 B批来源证据与映射冻结全面复审

日期：2026-10-23。项目：`/Users/tinadong7036/Documents/开发项目/dsh-lab`；分支`mac/continuity-v2`，HEAD `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：确认2项P2，不能给出“新增46项没有遗漏”的结论。** 当前正式全量1135/1135与补充150项通过，台账内容和既有运行源码未确认新增问题；但新增测试的干净副本准备和校验器动态路径读取边界存在可复现遗漏。本轮只审计，没有修复实现或改动正式测试。

## 发现与影响

### B-R1 / P2：父目录检查后被替换，校验器读到仓库外资源仍通过

位置：`scripts/check-v340-source-mapping.mjs:46–56`，重点是52行的`open(target, O_RDONLY | O_NOFOLLOW)`。

`readInside`先逐级`lstat`，然后按原路径打开文件；`O_NOFOLLOW`只约束最后一个路径分量，不能保证先前检查的父目录在打开时仍指向同一目录。最后一个旧版资源的`assets`父目录若在最终`lstat`返回后、`open`前被移出并换成符号链接，实际打开的是所选repoRoot外的同名字节。只要该文件哈希匹配，本次校验仍返回14节点/28格通过。

旁置探针保留真实文件操作，仅在真实`lstat`/`open`边界安排确定性切换，并记录打开前的真实物理路径。对照无重定向时通过且没有越界读取；重定向时读取`outside/claims-output-template.md`，校验仍`accepted=true`。连续三轮相同结果，每轮2项检查为1通过、1断言失败（exit 1）。所有资源均是仓库明确资源的合成副本，没有读取真实凭据、Profile或用户材料。

这违反本批“拒绝重定向/只读所选仓库明确资源”的合同，静态符号链接测试没有覆盖该窗口。影响是新离线校验器的读取归属，不能用内容哈希相同代替路径归属。修复应在读取边界绑定并核对已接受的目录/文件身份，拒绝检查与打开之间的替换；需要正式动态父目录重定向与不变路径对照，不能仅增加一次早期realpath或放宽路径白名单。

证据：`.local/stage5-b-source-mapping-reaudit-20261023/read-race-probe.mjs`、`read-race.log`、`race-redirect.json`，以及`read-race-repeat2.log`、`read-race-repeat3.log`和各自JSON。探针不计为正式新增回归。

### B-R2 / P2：新增正式回归依赖不存在于干净检出的.local父目录

位置：`packages/oasis-professional-service/test/v340-source-mapping.test.mjs:17–18`。

`variant()`直接在`repoRoot/.local/v340-mapping-test-`下调用`mkdtemp`，未创建父目录。`.local`是忽略的本机运行目录，干净副本不保证存在。把该46项测试及其明确依赖原字节复制到旁置目录后，未创建`.local`执行同一正式文件，结果2通过44失败（exit 1），失败为夹具准备阶段的`ENOENT ... mkdtemp`。只创建空`.local`后，同一测试和实现全部46通过（exit 0）。

因此当前工作区的绿灯依赖已有本机状态，不能证明该正式文件可在干净环境直接运行。应由夹具明确建立临时目录父级或使用与清单入口合同一致的独立临时根，并补缺父目录的正式对照。不能通过提交运行目录或把`.local`预先存在当作安装验收条件解决。

证据：`clean-no-local.log`、`clean-with-local.log`与`clean-copy/`。这是测试最小依赖的旁置副本验证，没有删除当前工作区.local，没有安装依赖，也不宣称完成整个安装包的干净恢复验收。

## 已核对内容与未发现其他问题的范围

| 范围 | 实际核对 | 结果与边界 |
|---|---|---|
| 14节点×2来源 | JSON与人工表格、完整节点集合、输入顺序、全部来源和禁用声明 | 14行28格，真实可执行0；没有把静态台账当运行能力 |
| 136项输入 | 独立解析V3.4.0原文每节点输入表，逐项比较ID、通道、重要性、单项边界和处理规则 | 136项原文完全一致；API占位映射逐输入一项；user_input没有变成材料 |
| 本地资源 | 固定原文/包身份；common→node.instruction→tables；14个实际loadV340Instruction装配哈希 | 哈希与装配一致；不等于专业语义质量已审核 |
| 历史兼容 | flow-2-6/0.2.2 manifest/4资源、各资源实际漂移拒绝、旧身份不适用于新版 | 原资源原字节保持；未改旧hash、旧草稿或审核/保存证据 |
| API | 旧合同证据范围、每节点服务/method/path/schema/结果/项目归属为null及对应gaps | 14格如实BLOCKED，补证要求保留；没有真实查询、猜ID或开放来源 |
| 清单入口 | 路径白名单、静态符号链接、越界、非清单文件、错误参数、不回显输入 | 现有和补充静态边界通过；动态父目录重定向存在B-R1 |
| 新正式46 | 当前工作区全量包含46；干净副本同字节运行及单变量对照 | 当前通过，但存在B-R2；未新增或修改正式测试来掩盖遗漏 |

114项台账缺口（14×2本地、14×6 API、2全局）继续保留，不是114个新缺陷。C/E仍未接线，D非文本、F当前候选Desktop/正常重启、G真实双来源、H收口与阶段6仍未验收。原14节点通道/结构合同的机械一致性不替代专利专业内容审查。

## 本轮新鲜命令与结果

执行方式为zsh及仓库固定`tools/bin/node`；所有日志均在`.local/stage5-b-source-mapping-reaudit-20261023/`。

| 命令/范围 | 退出码及结果 | 日志 |
|---|---|---|
| `OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs` | exit 0，1135/1135，无跳过 | full.log |
| `tools/bin/node --test .local/stage5-b-source-mapping-reaudit-20261023/additional-boundaries.mjs` | exit 0，150/150，无跳过 | additional-boundaries.log |
| 干净最小依赖副本，未创建.local，`tools/bin/node --test packages/oasis-professional-service/test/v340-source-mapping.test.mjs` | exit 1，2通过44失败，夹具ENOENT | clean-no-local.log |
| 同副本只创建.local，运行同字节正式46 | exit 0，46/46 | clean-with-local.log |
| `tools/bin/node --test .local/stage5-b-source-mapping-reaudit-20261023/read-race-probe.mjs`，及repeat2/repeat3 | 每轮exit 1，1对照通过1反例失败；三轮均实际越界且接受 | read-race*.log及各自JSON |
| `tools/bin/node scripts/check-v340-source-mapping.mjs --manifest docs/business-baseline/v340-source-mapping.json` | exit 0，14节点、28格、114缺口，dispatchEnabled=false、realCallVerified=false | mapping-summary.json |
| 独立解析原文输入表并比较 | exit 0，14节点136行完全一致 | original-input-crosscheck.json |

补充150覆盖每个节点的装配/身份、单项边界、错误通道、上游归属、资源顺序、本地/API启用、必需字段、URL正文和缺绑定gap；另测非法UTF-8/JSON/null/超限清单、全部4旧资源漂移、URL形式repoRoot、非清单入口、CLI参数及不回显。以上是私有审计补证，不计为正式新增测试，也不抵消失败反例。

## 保全与本轮限制

起点3323个非忽略文件逐一冻结SHA256，B批上轮9项产物指纹全部匹配。报告写入前3323文件全部不变；最终只给`docs/project-current-state.md`加本轮结论前缀，旧状态完整原字节后缀保留；新增本报告。原B JSON/Markdown、校验器、正式46、原16/16/28、生产src/lib、容量常量、锁文件/pin和历史证据不改。保全和日志摘要见`.local/stage5-b-source-mapping-reaudit-20261023/audit-summary.json`及该目录的`preservation.json`。

遵循当前单代理规则完成作者复审，没有独立代理或独立新上下文背书。本轮没有启动Desktop/DSH、浏览器/loopback、模型/API、上传、登录或费用操作；没有安装/升级、修改Profile/pin、提交/推送/发布。生产包未改，因此未重复构建/pack，也没有将旧构建或Desktop证据外推到当前验收。

本报告将上轮“本批未确认遗留P1/P2”的结论更新为上述2项已确认P2；旧收口报告和FAIL日志保留，不自动修复或推进下一批。
