# 阶段5官方来源、原包获取与macOS机制材料批收口

2026-10-25，Asia/Shanghai。执行[G1/获取/macOS关口计划](../plans/2026-10-25-stage5-d1-acquisition-and-macos-gates-plan.md)。用户本轮明确允许官方来源核对、冻结文件清单、隔离获取原件、只读许可/DOCX ABI核验及机制方案复审；不包含安装、物化到运行树、构建或执行原包、Host/Desktop、真实模型/业务API。

**本批材料交付COMPLETE_WITH_BLOCKERS。** 已取得8个确切原件，原包“暂无”不再是当前全局结论；新的cp314 DOCX原件达到静态ABI材料匹配，但未导入。许可闭包与macOS硬资源/隔离仍未通过，两格式均未达到READY_FOR_OFFLINE_PROOF，U1未执行、D1均BLOCKED。

## 1. 绑定、G1决定与执行边界

逻辑`/Users/tinadong7036/Documents/开发项目/dsh-lab`链接实际`/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，git顶层同实际根；mac/continuity-v2，HEAD `035fe82b3f97b983bb561fbefff9ae1ea9d42862`。既有未提交内容保全，原件和私有证据留`.local/stage5-d1-acquisition-20261025/`，原件不进Git/产品包。

用户已选PDF先行、macOS arm64、独立Python3.14.8，DOCX独立解阻。执行中按该目标选定Astral python-build-standalone固定发行20261003作为**工程候选原件来源**，原始发布commit为`5e46737f6480fc315ebfea83866910cbfcc772f0`，release元数据标immutable。此技术选择不改变Python版本、平台或原pin，不等于用户/发行验收。

| G1余项 | 本批明确内容 | 尚未证明 |
|---|---|---|
| 目标OS | U1验证组合限定macOS27.0.1/build26A434/arm64；原件Mach-O/构建声明最低11.0另列 | 没有低版本/其它build或未来OS支持承诺，产品发行最低OS及兼容接受仍OPEN |
| 来源/身份 | 固定Astral20261003 stripped运行时及同版full构建材料；实际URL/长度/SHA已冻结获取 | 发布方digest匹配不是签名/attestation验证，本轮未声称已验证密码学证明 |
| 候选布局 | `runtime/v340-extraction/python/3.14.8/macos-arm64/`、`site-packages/`、`adapter/`、`guard/`、`notices/`（后四者同属runtime/v340-extraction） | 仅相对布局决定，目录未创建、产品files白名单未修改 |
| 启动接口 | 固定解释器配`-I -S -B`，仅验证后的固定依赖树；受限stdin字节、allowlist环境/FD/cwd，不继承用户PATH/PYTHONPATH/PYTHONHOME/site | guard/adapter尚不存在，没有可执行启动命令或实际隔离证明；不能直接运行原件 |
| 更新/回退 | 随具名产品版本校验/更新，不运行时自动下载；运行时/策略变化使新确认失效，旧记录不重签 | 实际封装/签名/分发与旧安装包回退接受留后续 |

工程候选字段已冻结在私有g1-decisions.json；未把“明确字段”写成完整G1部署关口关闭。原件内可执行SHA为`3104082b75b7a6dc6ae6db236fe64e850ca909139e84d1cd9f699bd6fa5132ff`，不同于原开发Python的`a99820a3...`；不能沿用开发指纹。

## 2. 冻结清单与隔离获取

先冻结7文件清单再获取，合计97661223字节。只读检查发现lxml LICENSES.txt引用独立许可，需要同版本源码材料，随后在获取前另冻结1文件补充清单，不覆写原清单。最终**8文件、101858653字节**；每件实际长度/SHA都与发布方元数据一致。

完整文件名、来源URL、角色、长度、发布方/实际SHA及本机相对原件位置见[原件清单JSON](../business-baseline/v340-material-extraction-originals.json)。原件文件本身不随Git提供，干净副本不能假定已有本机原件。

| 组件/角色 | 确切文件 | 字节 |
|---|---|---:|
| PDF | pypdf-6.10.0-py3-none-any.whl | 334459 |
| DOCX | python_docx-1.2.0-py3-none-any.whl | 252987 |
| DOCX native | lxml-6.1.1-cp314-cp314-macosx_10_15_universal2.whl | 8577146 |
| DOCX依赖 | typing_extensions-4.16.0-py3-none-any.whl | 45571 |
| 独立运行时 | cpython-3.14.8+20261003-aarch64-apple-darwin-install_only_stripped.tar.gz | 26663219 |
| 运行时构建材料 | cpython-3.14.8+20261003-aarch64-apple-darwin-pgo+lto-full.tar.zst | 61659605 |
| 发布校验表 | SHA256SUMS（同版release） | 128236 |
| lxml许可/构建源码材料 | lxml-6.1.1.tar.gz | 4197430 |

发行来源为[Astral固定release](https://github.com/astral-sh/python-build-standalone/releases/tag/20261003)及PyPI的[pypdf6.10.0](https://pypi.org/project/pypdf/6.10.0/)、[python-docx1.2.0](https://pypi.org/project/python-docx/1.2.0/)、[lxml6.1.1](https://pypi.org/project/lxml/6.1.1/)、[typing_extensions4.16.0](https://pypi.org/project/typing-extensions/4.16.0/)。公开发行资料/原件下载不涉及业务API/模型、账户登录或用户资料上传。没有获取其它版本/平台、调用包管理器或执行安装钩子。

获取预算独立于业务输入：单原件≤96MiB、总原件≤128MiB，按冻结预期长度/摘要验证；元数据≤16MiB，分块65536字节，无自动重试。只读归档检查预算为wheel≤512条目/单项64MiB/总128MiB，tar≤20000条目/单项512MiB/实际展开≤2GiB，元数据单项≤8MiB/总≤32MiB、Zstd窗口log上限27；不是更改业务1MiB/2MiB/8MiB合同或证明worker限额。

## 3. 只读许可、闭包与DOCX ABI结果

四个wheel的ZIP CRC、全部文件RECORD长度/SHA核对通过；文件数分别60/124/174/5。归档仅流式读字节、列路径/哈希、解析metadata/原生头和保留许可通知，不解包为运行树、不import或调用其中任何代码。

### 运行时

stripped包1698条目，full包3841条目。full的PYTHON.json声明Python3.14.8/aarch64-apple-darwin、SOABI cpython-314-darwin、Py_GIL_DISABLED=0、Py_DEBUG=0、pgo+lto；平台部署声明11.0，元数据/原生头只是兼容线索，不是实跑。full与stripped逐路径对照为1673个普通文件同SHA、16个不同、0个无对应；strip会改变二进制等字节，两个原件/树指纹不可混写。[发行方归档说明](https://docs.astral.sh/python-build-standalone/distributions/)也明确full与install-only/stripped角色不同。

PYTHON.json列110个扩展组，12个静态库引用在full原件中存在；16个声明许可路径中14个可读，**2个缺失**：`python/licenses/LICENSE.zlib-ng.txt`、`python/licenses/LICENSE.zstd.txt`。这表示发布材料引用缺口，不直接等同于每项都实际链接或法律结论；须澄清对应实际组件/版本/通知。完整产品分发还需覆盖pip及其vendor、静态/native来源版本和最终纳入/排除映射，不能只凭顶层Python许可关闭L-P。

### DOCX

新取得wheel为cp314-cp314，7个Mach-O扩展均有arm64与x86_64切片；arm64最低OS原生头声明11.0。与候选runtime的cp314、非free-threaded声明静态匹配，分类为**STATIC_ABI_MATERIAL_MATCHED_NOT_LOADED**。保留旧cp312在开发cp314的ImportError，不用新原件删除旧失败；本轮未安装/导入验证。

lxml源原件补齐LICENSES.txt引用的BSD/GPL/ElementTree许可文本等5项材料；仍需确认wheel内实际libxml2/libxslt静态版本/来源、Schematron资源和最终分发通知。上游[6.1.3发行说明](https://pypi.org/project/lxml/6.1.3/)提及外部参数实体修复；本轮不自动升级6.1.1，也不宣称影响已排除，严格DTD/实体/外部关系拒绝及影响核对仍在后续准入材料中。

## 4. macOS硬内存与隔离方案

| 关口 | 本轮明确方案/资料依据 | 判定 |
|---|---|---|
| 硬内存268435456 | 本地RLIMIT资料不证明合同所需严格范围；Apple的[os_proc_available_memory](https://developer.apple.com/documentation/os/os_proc_available_memory)是建议性查询，文档未给native macOS额度设置接口 | **NO_GO_CURRENT_EVIDENCE**；没有选定可证明覆盖启动/Python/native/映射/后代的强制组件，不能运行U1来冒充已具备方案 |
| 文件/网络隔离 | 候选为Oasis独立、最小权限的sandboxed XPC/helper；不向其授予用户文件/网络entitlement、路径/bookmark，仅传本次字节和固定管道；运行时/依赖/环境/FD白名单在导入前生效 | DESIGN_ONLY；需封装/签名/entitlement与继承实际验证，不能从未sandbox的Host直接启动child就宣称隔离 |
| 外部程序/子进程 | adapter在任何解码/版本探测前拒绝JBIG2等子集外路径，OS边界仍需证明 | App Sandbox的子进程继承不等于禁止exec；没有把它当无子进程或硬内存保证 |
| 独立监护 | 单调时钟覆盖启动/收流，5000/15000ms独立期限，stdout2097152/stderr16384块前置预算；终止所属进程族并等待实际close，异常/迟到输出无部分结果 | DESIGN_ONLY，无helper/监护构建或运行，无压力/拒绝访问/终止试验 |
| parser顺序/缓存 | OS/运行时保护和固定环境→导入前限制→PdfReader前安装有界解码/累计控制→有限对象/XRef展开→全profile确认；实际重复解码计量，缓存命中不算新解码但保有内存计入限额，不能跨policy/上下文借缓存 | DESIGN_ONLY；完整业务零调用、证据/确认/旧编码和保存后相邻准入仍留D1 |

依据[Apple App Sandbox资料](https://developer.apple.com/documentation/security/app-sandbox)及[继承/XPC说明](https://developer.apple.com/library/archive/documentation/Miscellaneous/Reference/EntitlementKeyReference/Chapters/EnablingAppSandbox.html)，访问隔离与进程/内存限制分开判定。没有使用废弃sandbox_init作为获准方案，没有引入VM、变更解释器/平台或放宽容量。机制记录见私有mechanism-decisions.json。

## 5. 复审、纠正与保全

只读通知筛选最初误把pip packaging的2个`.py`文件在两个运行时归档中的4份临时副本归作通知。已记录路径/SHA于metadata-filter-correction.json，仅清除这4份本批生成的副本，限制通知文件类型并重新完成只读检查；未执行、安装或写入产品/运行树，8个原件字节未变。最终metadata/inspection仅保留允许的metadata/通知和检查JSON，库代码/二进制不落地展开。

本轮不新增正式业务回归、不重跑67项编号/1425项主包/92组私有测试，不构建或pack。原合同、源码/正式测试/夹具、锁/pin、台账、旧v1/values-v1及历史FAIL/unknown/审核/保存hash保留，来源全部禁用。

最终材料核验器通过324项断言、20个本地链接和10处官方网页引用检查，`git diff --check`通过。3448个基线文件中3440个不变，本批仅7个既有文档加前缀、2个新文档；7份原文后缀逐字节保全，64份此前私有证据不变，生产源码/测试/合同/锁/映射漂移为0。另1项总计划文件`docs/plans/2026-10-25-dsh-oasis-master-plan.md`在基线后发生范围外修改，来源未归因，已独立记录前后SHA并保留，本批未读取内容或覆写；因此不将它误计为本批或声称所有其它文件不变。HEAD/分支不变，未提交或推送。

一次独立只读整体复审未确认P1/P2或待修Minor；独立重验8原件/101858653字节、4个wheel CRC/RECORD、13份公开资料收据、103份归档metadata/通知摘录、7份前缀保全、运行时16项许可/12项静态库及1673/16/0映射、7个arm64扩展一致。已纠正4份通知误归不列未修缺陷；范围外总计划漂移单独保留。结论为COMPLETE_WITH_BLOCKERS，不代表许可、U1或D1通过。详细断言、摘要、独立复审及并发变更记录位于本批私有证据目录。

## 6. 逐格式交接

PDF的原包获取缺口已有实质推进，G1工程候选/来源/布局/启动接口明确；但运行时2个声明许可缺件、完整分发闭包、G4严格硬内存/隔离和G5/G6实际组件/范围仍缺。DOCX已取得匹配cp314原件，旧ABI缺件更新为静态材料匹配而未加载；native/资源许可和资源机制等仍OPEN。两格式分别保持BLOCKED，不从任一材料成功外推其它关口。

下一项应先澄清原件声明缺失通知/实际静态版本与最终分发映射、具名macOS硬内存/隔离组件；若目标原生路线不能满足合同，记录NO_GO并另行决定变化，不能自行换平台/提高限额。材料可审后才申请明确执行U1，实际通过后再获对应格式D1接线指令。当前没有可直接执行的U1物化/启动命令，不接Host、不启动Desktop或新增真实模型/业务API；阶段5及E—H/阶段6等待办不被此材料批关闭。
