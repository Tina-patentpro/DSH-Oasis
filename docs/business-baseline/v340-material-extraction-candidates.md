# V3.4.0非文本解析候选与部署核对（D0）

执行日期：2026-10-23—24。状态：**PDF、DOCX均为FUNCTIONAL_ONLY / DEPLOYMENT_BLOCKED，不能进入产品D1接线。** 原计划文件名日期保持2026-10-23，不表示本批已于当日完成。仓库及固定依赖不变；所有核对离线、单代理，不安装或复制外部库到产品。

## 核对范围与实际版本

主包`packages/oasis-professional-service/package.json`、同目录`pnpm-lock.yaml`及包入口实际解析：pdfjs-dist、pdf-parse、mammoth、@xmldom/xmldom、fast-xml-parser、yauzl、fflate、jszip均未解析到。固定Node24.21.0；固定Python3.14.8中pypdf、python-docx、lxml、pdfminer/pdfplumber/pypdfium2等均未安装。这是本机指定入口核对，不是全球软件可用性调查。

Codex工具返回的附带依赖bundle版本为26.1020.11348，其Python3.12.14及site-packages位于：

`/Users/tinadong7036/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/`

该目录不是DSH或插件依赖，不可将绝对缓存路径放进产品。仅借其已存在的库做公开合成夹具功能核对，未安装、联网或更改sys.path持久配置。临时进程只读插入明确库路径的对照也不构成部署。

## 候选矩阵

| 候选 | 本地事实及功能证据 | 部署/能力结论 |
|---|---|---|
| pypdf6.10.0 | Codex Python3.12可读两页中英文PDF；固定Python3.14只读借用同一纯Python源码也得到完整预期文本和页号；默认压缩流上限75000000，不能当作本项目限额 | PDF功能候选首选供后续审批；产品没有该依赖或Python启动/发布合同。尚无已批准可分发原包、锁和包部署回执，BLOCKED |
| python-docx1.2.0 + lxml6.1.1 + typing_extensions4.16.0 | Codex3.12可按正文顺序读取段落和表格单元格；页眉/页脚/修订区域在普通正文遍历中缺失，必须预检拒绝或另做显式覆盖 | lxml文件为etree.cpython-312-darwin.so；固定3.14真实加载ImportError。需匹配目标ABI的可追溯分发件、依赖闭包及部署批准，BLOCKED |
| /usr/bin/textutil，macOS27.0.1/26A434 | stdin接收合成DOCX，stdout得到117字节扁平正文（含末尾LF）；实际退出0，无新安装 | OS工具不是跨平台固定包；没有结构定位输出，不能把行序猜为页/段/单元格。仅功能对照，不能承担本合同，BLOCKED |
| pdfplumber0.11.9 / pdfminer.six20251230 / pypdfium2 5.14.0 | Codex环境有元数据；依赖闭包包含其它库/原生组件。本轮未做其完整解析、平台或许可复核 | 未选用、未测试为产品候选；不将存在元数据当作支持 |
| Node包内库路线 | 主包及锁中未发现上述PDF/DOCX候选；没有本地版本/完整分发证据 | 可作为未来替代路线，但本轮不猜版本、不联网选型，不产生已验证推荐 |

选择依据是已检查的本地源码与功能，未声称这些版本为最新或已完成依赖风险审查。未来若选择Node路线，须用明确离线分发件重新核对，不能直接沿用Python烟测结论。

## 身份和许可记录

树指纹算法：对dist-info RECORD中位于安装根内的现存文件，排除pycache/pyc及含`..`条目，记录相对path/bytes/sha256，按path排序，以Python `json.dumps(records,sort_keys=True,separators=(',',':'))` UTF-8编码取SHA256。它绑定本机已见文件，**不是原始wheel/上游签名的替代**。完整逐文件记录见私有证据`parser-fingerprints.json`。

| 组件 | 文件数/字节数 | 本地树SHA256 | 已见许可 |
|---|---|---|---|
| pypdf6.10.0 | 62 / 1441556 | `705b82341a475eef858dee77daabe0713fb767759f0c9b4f27e8fa2570bb71c4` | BSD-3-Clause；LICENSE SHA `a97ac230e5f33ef10a5367a850eb01f91f1a0b064e34742c7794d2294557f524` |
| python-docx1.2.0 | 126 / 1556225 | `3be02955d3a702f1c24fd0e20d1db204d6a8bfd64d5778e7aaec95081924eeab` | MIT；LICENSE SHA `7652f271e46d0d533e9dc463f3b5fcbdcacf4d6a9c8d6b554d15efd0f37f6132` |
| lxml6.1.1 | 176 / 20136537 | `ff785737977f18baddacdfcaaa90323343c73377558a6401d7397e631442fbf7` | 主BSD及LICENSES.txt列出的例外，不能只登记单一BSD便称已完成闭包许可核对 |
| typing_extensions4.16.0 | 6 / 182924 | `0cd4eb6bc4f2e64866a76f4dcff5beb2e1e9d609650ca005f4c2684ac8cbc131` | LICENSE文件及SHA已登记，随候选分发闭包单独复核 |
| textutil | 系统可执行文件 | `c6ac9100c5df44fb740bac76738fbfe2f6e4431f7098406a12e38f9ee8518c0e` | 未作为可再分发依赖批准 |

Codex Python3.12.14可执行文件SHA：`811e2679c20fd2c7413f7c5ca28ce903065eea8dadb8660f1b9379a28959a480`；本仓库固定Python入口所指可执行字节SHA：`a99820a3a31b57e615c6e0b050c92046281617beec6e8fdcb52da34bc8b56d99`。两者不可混写为同一个产品运行时。

## 功能核对与局限

8项私有功能烟测全部通过：两页中英文PDF及页号、DOCX段落/表格顺序及定位、无文本PDF不能记文本成功、加密识别与未解密读取失败、损坏PDF拒绝、DOCX遗漏区域反例、重复提取同字节及原/提取hash不同、Python socket替身下0次网络尝试。夹具只含公开合成阀体文字，不是用户文档或真实生成结果。

烟测进程约0.017秒，Darwin报告峰值RSS68386816字节，含生成/导入开销；**不是恶意文件、100页、目标平台或最大输入性能证据**。另将pypdf当前进程ZLIB_MAX_OUTPUT_LENGTH设为8388608，解压8388607、8388608字节完整通过，8388609字节抛LimitReachedError；未改磁盘库文件。只证明该压缩分支可配置，不证明聚合解压、其它过滤器或子进程硬限额已实现。

扫描/混合扫描、字体缺映射、多栏阅读顺序、公式/图像/复杂表格、外部关系、ZIP资源爆炸、页眉/脚注/修订、严格内存/时间与各平台部署仍没有产品验收；见[冻结合同](v340-material-extraction-contract.md)。不向台账写入“已支持”。

## D1解阻材料

1. 明确选择产品运行路线。若采用本轮Python候选，给出获准分发的解释器/版本/平台、启动方式与独立封装边界；不得依赖用户PATH、Codex缓存或日常Python。
2. 提供对应路线的明确离线原包/来源、版本、完整SHA及依赖闭包、许可/通知文件和可重复冻结物化/pack方案。当前本地文件指纹不足以代替分发件批准。
3. DOCX需解决固定Python3.14与CPython3.12 lxml的实际ABI不匹配；如改解释器，须另评固定组合影响，不能暗换到Codex3.12。
4. 证明[合同限额](v340-material-extraction-contract.md)可在读取、解包、解析全过程前置/累计执行，尤其父进程硬终止及内存限制；当前只验证了一个解压分支。

在以上条件未满足前，D1为BLOCKED。本轮交付具体事实与合同，不请求安装或通过更改pin消除阻塞。PDF可在其自身条件满足后先进入D1，DOCX继续单列阻塞，不扩大为D全部完成。
