# 阶段5 D0离线材料解析可行性、合同冻结与复审收口

执行2026-10-23—24；文件名沿批准D0计划的2026-10-23命名保持。项目`/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支`mac/continuity-v2`，HEAD仍`68a3264ff917afd1194259e96aa02699329b6d00`。

## 结论

D0已完成本次离线核对、目标合同与阻塞交接，**D1准入为BLOCKED，PDF/DOCX尚未成为产品支持能力**。pypdf6.10.0、python-docx1.2.0/lxml6.1.1在Codex附带Python3.12上通过公开合成夹具功能核对；pypdf同一纯Python源码在项目固定3.14上也通过两页中英文提取，DOCX的CPython3.12 lxml在3.14实际ImportError。项目主包和固定工具没有已部署的上述解析依赖。

已经冻结原二进制/提取文本hash含义、Host证据、UTF-16定位与归一化、确认失效、有限资源目标、显式新编码及旧数据分支。新资源上限的全部平台执行证据没有齐全，合同明确区分“目标准入值”和“已经实现/验证的保护”；这是D1阻塞之一，不能以小夹具通过代替。D0没有生产实现，未提高任何现有容量，也没有把旧台账改成支持。

## 交付及任务对应

| D0任务 | 实际交付 | 完成边界 |
|---|---|---|
| D0-1部署可行性 | [候选、版本、树指纹、许可与部署矩阵](../business-baseline/v340-material-extraction-candidates.md) | 已核对主包/lock、固定Node/Python、Codex附带库和textutil；无可直接部署候选，明确BLOCKED |
| D0-2证据与容量合同 | [v340-extraction-1目标合同](../business-baseline/v340-material-extraction-contract.md) | 字段/hash/定位/有限目标值及兼容分支冻结；新硬限额、全过滤器/聚合计量、完整支持子集仍未实施/验收，未假装全部准入条件满足 |
| D0-3D1接线及复审 | [D1阻塞与接线计划](../plans/2026-10-23-stage5-d1-material-extraction-plan.md) | 解阻材料、拟接口/文件及正式用例矩阵已列。实际分发文件/物化命令须据批准件补齐；本计划不是已就绪实施批准 |

## 实际命令与证据

工作目录为本仓库根，执行方式zsh；私有证据目录`.local/stage5-d0-material-extraction-20261023/`。这些是本轮新鲜核对，不复用旧1358绿色结果作为本轮测试。

| 核对 | 实际结果 | 证据 |
|---|---|---|
| 固定项目Python/Node依赖元数据 | Python3.14.8、Node24.21.0；指定PDF/DOCX候选未安装/未解析 | python-inventory.json、node-inventory.json |
| Codex附带库元数据/许可/树SHA | 版本、明确路径、逐文件hash与许可材料已冻结；不是产品依赖 | codex-runtime-inventory.json、parser-fingerprints.json |
| 公开合成功能烟测 | 8/8，exit0，Python socket被禁止且0次网络尝试 | candidate-smoke.py、candidate-smoke.log、candidate-smoke.json、fixtures/ |
| 固定3.14只读加载对照及textutil | PDF提取两页预期正文；DOCX ImportError；textutil输出117字节扁平文本且exit0，无结构定位 | deployment-probe.json |
| pypdf流解压上限 | 设8MiB后，−1/等于完整通过，+1抛LimitReachedError；3个边界符合预期 | pdf-filter-boundaries.json |
| 合同实例与旧v1 | 5组私有核对通过：PDF/DOCX原/文本hash与UTF-16范围，旧prepared/completed同值读取，当前文本hash替换为原件hash被拒绝 | contract-example-checks.json |
| B离线台账读取入口 | exit0，14节点/28格/114历史gap，dispatchEnabled=false、realCallVerified=false | mapping-summary.json |
| 文档与保全 | 仅4份既有文档追加记录及4份新文档，旧正文为精确后缀；源码/正式测试/台账/资源/lock/lib不改 | verification-summary.json |

功能烟测以工具返回的本地Python绝对路径执行`-B -I candidate-smoke.py`；固定项目Python也以`-B -I`进行只读加载对照，没有安装依赖或持久修改搜索路径。原/提取全文、定位与固定夹具hash留私有证据，可逐项复核。外部关系/恶意文件的产品网络隔离未验；0次socket尝试仅说明合成烟测，没有把它外推为产品全局网络隔离。

B命令为`tools/bin/node scripts/check-v340-source-mapping.mjs --manifest docs/business-baseline/v340-source-mapping.json`。当前生产主包/正式测试未变，因此不重跑全量/构建/pack，正式总数仍为上轮1358，C累计仍210；本轮8/3/5均为私有核对，不计正式新增。

## 复审与补充澄清

按最新AGENTS单代理执行，并在候选/合同/D1计划形成后做单独作者复审。没有新增独立代理或独立新上下文背书。本轮文档范围未发现尚需修复的P1/P2；以下问题已在目标合同中澄清，不能视作生产补修：

- 普通DOCX正文API会漏读非正文/修订；规定显式预检及不支持，后续D1必须用真实二进制反例验证，不能静默跳过。
- 组件/解释器之外还需绑定适配脚本adapterSHA256，避免实现变化却沿用旧策略确认。
- 新materialEncoding、候选v3及文稿v2须交叉匹配；旧v1/v2不得偷偷携带新字段，旧prompt/摘要按原分支验证。
- 继承上游材料hash只是历史声明，不能证明当前Host读过原件；保留原件未复核警示，禁止按旧路径跨项目取文件。
- 具体容量是有限目标值，单流边界通过不等于全解析器聚合预算、硬内存、超时杀进程均通过。上述仍阻断D1，而非留下隐式无界回退。

五类Review Focus均在合同及D1相应步骤落位：权限/路径绑定→D1-1；非完整内容→D1-1；资源爆炸/外部关系→D1-1；双hash/确认→D1-2；共同上限/干净部署→D1-0、D1-2/3。语义质量、OCR、发行和真实宿主没有被默认为通过或从清单删去。

## 阻塞和后续

D1解阻需要：获准产品运行时/平台封装；候选原始离线分发件及完整SHA/依赖闭包/许可/冻结装配；DOCX匹配解释器的lxml ABI；资源机制和预检可实施证据。当前已给出本机具体版本、树指纹及失败现象，未通过复制Codex缓存、换解释器或提高pin消除问题。解析器或新依赖方案须另作明确决定；本轮不请求直接安装。

PDF可在自身全部条件满足后先进入D1，DOCX单列；两种格式当前均不得接线。D0记录完成不等于D完成，D1实施需后续明确指令，不能以本报告保存自动开始。

本轮没有启动Desktop/实际DSH、真实模型/API/网络/上传/费用、安装/升级、读取凭据、改Profile/pin/活跃lib、提交/推送/发布。旧v1/synthetic/完整/values-v1、草稿/unknown/审核/保存证据、此前未提交C成果、B台账和所有来源禁用保持。OCR、API逐节点映射、F当前Desktop/正常重启/跨Host、G真实双来源、H/阶段6及新增PDF/DOCX导出仍未完成。
