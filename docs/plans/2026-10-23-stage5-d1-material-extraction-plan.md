# 阶段5 D1：PDF/DOCX离线输入接线计划（BLOCKED）

制定于2026-10-24，沿D0约定文件名保留2026-10-23。**D1尚未准入、尚未执行。** 本文冻结解阻材料、接线合同与验收顺序；部署件和硬资源限制没有证据前，不能当作可直接实施的包级计划。用户执行D0的指令不包含D1、新依赖、Desktop或真实调用许可。

> **For agentic workers:** 解阻后依据获准实际分发件补全包级文件清单和物化命令，再按单代理superpowers:executing-plans、test-driven-development及verification-before-completion执行。当前不得安装、改锁/pin/Profile/活跃lib或启动产品。无提交/推送/发布授权。

**Goal:** 对获准格式的一份普通材料文件，完成有界原件读取→离线提取→原/文本/定位证据冻结→原生替身实际准入→共同编辑再审保存及相邻接续；保持来源禁用与旧数据。

**Architecture:** Host持有Workspace权限、原件字节和证据；受限短生命周期worker仅接收已绑定字节，不自行按路径读取。不建通用解析平台或UI，按[冻结合同](../business-baseline/v340-material-extraction-contract.md)增加有标记的新材料编码/原生候选v3/文稿v2分支，保留历史路径原序列化。

**Spec:** [D0候选与部署核对](../business-baseline/v340-material-extraction-candidates.md)、[提取合同](../business-baseline/v340-material-extraction-contract.md)、[D0执行/复审](../evidence/2026-10-23-stage5-d0-material-extraction-closeout.md)。

**2026-10-24 D0-R1修订：** 按用户明确决定，首切片拒绝实际生效的DOCX自动编号/项目符号；保留手写编号、未使用声明及numId=0取消继承的对照。当前仅有独立离线编号资格候选及19项正式回归，未进行D1 Host接线或依赖变更，原BLOCKED条件不变。D1须消费并集成下述行为，不能以本轮脚本的eligible当作全DOCX支持。

**2026-10-24 D0-NUM-R1补修：** 统一默认段落样式w:default的1/true/on真值、0/false/off假值及缺省语义，非法值/重复真值默认样式明确拒绝；假值不取消显式pStyle编号，段落/叶样式numId=0仍取消继承。新增20项真实二进制正式回归，原19项不改，当前编号资格共39项。此为原合同落实，未新增产品格式/Host能力；D1仍BLOCKED，旧审核/输入hash不重签。

## D1-0：解阻清单（当前均未满足）

| 条件 | 当前缺口 | 具体解阻材料与通过证据 |
|---|---|---|
| 产品运行时与平台 | 项目有开发Python3.14.8，但发布包没有Python运行时合同；Codex3.12不可当产品路径 | 明确受支持平台/架构、解释器分发路径/版本/来源/hash、许可及启动/打包方式；固定隔离空环境可重复加载，不能依赖全局PATH |
| PDF分发件 | pypdf6.10.0仅已检查本机文件及功能，无获准原始离线分发件/锁 | 确切原包、来源及完整SHA，依赖闭包和许可通知，获准的离线冻结物化及分发白名单；禁止直接复制Codex缓存充当来源证明 |
| DOCX ABI及闭包 | 已见lxml CPython3.12扩展在固定3.14 ImportError | 针对获准解释器的python-docx/lxml/typing_extensions实际分发件、全部原生依赖与许可、加载成功证据；任何换解释器或依赖版本均先明确评估 |
| 资源与支持子集 | 仅小夹具及pypdf单流±1通过，硬内存/墙钟、聚合解压、预检没有产品实现 | 目标平台能执行合同数值的机制和公开边界夹具结果，失败可回收且无部分prepared；不能用异步超时但进程继续运行替代 |

允许PDF先行：其运行时、原包和资源机制全部就绪后，可仅批准PDF接线；DOCX继续禁用且缺口留档。不能用一种格式的通过填另一种或D整体。当前PDF/DOCX均BLOCKED。

## 进入后的接口与文件范围

以下是与解释器ABI无关的接口合同；实际解析器/运行时分发文件、哈希及命令必须在D1-0后据真实获准输入补入本计划，未补齐不得执行。

| 模块 | 拟职责 |
|---|---|
| 新`src/v340-material-extraction.js` | `extractV340Material({workspaceId,relativePath,filename,mediaType,bytes,rawSHA256,parserIdentity,policy,signal}) -> Promise<{filename,body,sha256,extraction}>`；仅Host调用，校验实际bytes及身份，构造合同证据 |
| 新`src/v340-extraction-worker.js` | `runV340ExtractionWorker({bytes,mediaType,policy,signal}) -> Promise<{body,locations,coverage}>`；固定可执行/参数、stdin原字节、受限stdout；解析脚本及依赖以获准分发清单为准，不能动态安装 |
| 新`src/v340-extraction-contract.js` | 新提取证据严格schema、数值政策、规范hash及UTF-16定位；不导入Node原生进程到浏览器组件 |
| `workspace-materials.js` / `v340-preparation.js` | 精确项目有界原件读取；普通材料按明确格式进入解析器，上游只走旧Markdown；不新增输入ID或两套来源表单 |
| `v340-document.js` | 增加带版本extraction文件值/回执及文稿v2累计材料证据；旧v1读取/组装字节保持 |
| `v340-input-snapshot.js` / `v340-runtime-contract.js` / `v340-runtime-integrity.js` | 新materialEncoding准入、冻结值还原与摘要；完整/values-v1均保留证据，不重新解析历史；原2MiB/8MiB约束 |
| `v340-native-contract.js` / `v340-native-model.js` | 新材料候选v3、确认/请求指纹；历史v1/v2验证不变；原默认Host及公开路由继续禁用 |
| `v340-runtime-service.js` / `workbench-service.js`（确有需要时） | 透传本次取消/关闭与材料准备失败；在准备完整前不消耗额度、不派发，不扩大通用调度 |

不预设修改`index.js`启用来源，不改API适配器、B台账、原资源、客户端UI、原生Slot或固定依赖。若实际需要额外文件，先在D1-0交付受影响清单，不借本表扩大范围。

## Task D1-1：有界读取与支持子集提取

- [ ] 先加入固定公开真实二进制夹具及文本ground truth/hash；覆盖中文/多页、段落/表格、UTF-16代理对、换行和单项ID，先见缺能力的业务失败。
- [ ] 正式验证根/父目录/最终文件身份、同hash跨项目、A→B→A、句柄释放、读取中增长/原地变化、短读。worker只能收到已接受字节，不能转去读变化后的路径。
- [ ] 按合同验证实际格式/MIME及主文档关系，逐项预检扫描/混合页、无字页、字体映射、活动内容/嵌入物、DOCX页眉/修订/复杂表格/外部关系、ZIP重复条目/路径/CRC及炸弹。子集外明确失败，不以警示继续提交部分正文。
- [ ] 在任何DOCX正文提取/冻结前接入`v340-docx-numbering-policy-1`：解析直接numPr、所用样式/basedOn链、默认样式/docDefaults及逐属性继承；有效numId非零或无法确定则整文件UNSUPPORTED_PROFILE。覆盖起点/重启、lvlOverride/startOverride、多级、项目符号和编号样式链接；不展开标签，不先丢编号再生成。拒绝时原材料/草稿不变，prepareCall/stream均0。
- [ ] 将现有39项（原19+默认布尔20）真实二进制编号资格回归作为基础：保留手写编号、未使用num/abstractNum/重启/多级/样式声明，以及段落/叶样式numId=0取消继承；1/true/on等价拒绝，0/false/off未用声明保留，假值显式pStyle仍生效，非法/重复真值默认样式拒绝。新增D1集成用例验证拒绝前不创建部分prepared、不消费预算；成功对照正文/hash/UTF-16定位原样，改变生效编号或策略使确认失效。只检查是否存在numbering.xml或numPr不足以放行/拒绝。
- [ ] 实现已批准格式的窄worker及严格stdout协议；对每项数值执行实际−1/等于/+1及取消/超时/硬内存失败回归，验证进程和文件句柄均回收。stdout/stderr、CPU/内存等不能在无界读取之后才拒绝。
- [ ] 实现Host证据和完整性检查，核对原件hash≠提取文本hash，重复同字节结果稳定；保留原文件不覆盖。运行受影响测试，保留实际红/绿日志。

**已有编号资格回归：** `test/v340-docx-numbering-policy.test.mjs`、`test/fixtures/v340-docx-numbering/`及`test/v340-docx-default-boolean.test.mjs`、`test/fixtures/v340-docx-default-boolean/`，调用未接入Host的独立`scripts/check-v340-docx-numbering.py`；不是产品材料读取/提取回归。**拟正式文件：** `test/v340-material-extraction.test.mjs`、`test/v340-extraction-limits.test.mjs`、`test/fixtures/v340-extraction/`。若仅批准PDF，DOCX用例应验证未支持，不伪造解析成功或skip缺件。

## Task D1-2：冻结证据、确认及历史兼容

- [ ] 红测原件修改但提取正文相同、策略/解析器/适配脚本改变、定位变化、Workspace/根/路径改变均使确认失效，prepareCall/stream均为0。
- [ ] 接入新materialEncoding、候选v3及文稿v2合同，正式拒绝缺标记/空标记/不匹配组合；新准备证据必须来自Host，浏览器/RPC/模型不能自填或覆盖rawSHA、定位及人工确认。继承上游证据保留原件未重新核验警示，不把结构自洽/同hash视为当前原件已核验或跨项目权限。
- [ ] 新全/紧凑快照只由冻结值重建；派发后源文件变化或删除仍使用原正文与证据；不再调用解析器/外部文件来“恢复”旧hash。
- [ ] 用改动前冻结的旧native v1/v2、synthetic、无tag完整/values-v1、旧草稿和已审保存记录验证同值读取、重开unknown不重派、旧prompt/回执hash不变，旧文稿v1组装字节不变。旧安装包读新数据仅记录回退限制，不冒充兼容。
- [ ] 原2MiB快照、8MiB记录、1MiB文稿在含完整证据时仍严格拒绝超限；不能删定位、rawSHA或历史T表/警示来使记录通过。结果错误不得清理旧草稿或保存文件。

**拟正式文件：** `test/v340-extraction-snapshot.test.mjs`、`test/v340-extraction-compatibility.test.mjs`；复用旧v1夹具及`v340-native-*`、`v340-snapshot-admission.test.mjs`，不重写旧预期。

## Task D1-3：共同闭环、实际相邻准入及复审

- [ ] 用真实二进制夹具经过正式材料入口和原生内存替身生成，核对实际请求正文/receipts、原文件hash及提取定位，禁止网络。不能只直接调用组装器或mock解析器。
- [ ] 在共同页面/业务服务中编辑新版本、未审保存拒绝、再审后实际临时磁盘Markdown与SHA一致；旧版本、材料证据和原稿保持。
- [ ] 将实际保存的文稿v2送入相邻候选，核对完整正文、材料历史、T1—T6/警示/来源及定位；再开仓库全记录同值。新旧v1/v2上游组合都覆盖，不能因新材料丢旧链。
- [ ] 验证14节点普通文件ID可复用而upstream_md_file不接二进制，全部来源禁用/默认Host不注入；API缺口不被本地成功替代。
- [ ] 受影响组通过后只运行一次最终主包全量和旁置构建/精确pack/源码映射，活跃lib保持；干净副本不依赖既有.local或Codex依赖；旁置撤回关键修复证明正式用例有效。
- [ ] 单代理单独复审五类Review Focus和上述完整链，记录P1/P2/剩余未验范围；输出格式各自结论及新hash，不将作者复审写作独立新上下文审查。

**拟正式文件：** `test/v340-extraction-lifecycle.test.mjs`；复用`v340-backtick-fence.test.mjs`、`v340-native-lifecycle.test.mjs`、`v340-results.test.mjs`及来源映射59项。

所有测试命令须在D1-0补全实际存在文件后明确；主包集成仍为`OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs`。本轮D0不运行这些拟新增测试或重建产品。

## 退出与保留

准入条件未满足时只继续解阻材料核对，不写生产接线。不支持的格式保留明确失败和原输入；实际部署、完整提取、业务正文参与、已审保存及相邻交接分别出证，不能用一个成功状态代替全部。

D1离线候选完成也不启动Desktop、不开放本地/API来源、不调用真实模型/API。OCR、专业API逐节点证据、F宿主/正常重启/跨进程、G真实质量与双来源、H/阶段6、DOCX/PDF新增导出仍未完成，等待各自范围授权。
