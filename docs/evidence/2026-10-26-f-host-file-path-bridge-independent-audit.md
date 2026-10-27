# F磁盘文件路径桥接小修独立审计

**结论：接受本次限定的磁盘非图片文件路径桥接小修及其无模型GUI子集，未发现阻止该子集接受的新增P1/P2。** 重启只恢复纯文本`@path`，没有恢复结构化occurrence或芯片外观；没有发送或实际内容交付验证。原FH-A01/P2的图片、Blob、旧上传附件等完整范围仍开放，完整F与全目标未完成。

模型配置按既定调度声明为 **GPT-6.1 / max**，未切换模型，也不从输出推断后端。审计者独立于实现者；本次只新增本报告，不修改实现、状态、pin、作者证据或既有独立报告，不提交或推送。

## 1. 范围与读取绑定

根目录为`/Users/tinadong7036/Documents/开发项目/DSH-Oasis`。本批依据[桥接设计](../superpowers/specs/2026-10-26-desktop-host-file-path-bridge-design.md)、[局部计划](../plans/2026-10-26-f-host-file-path-bridge-repair.md)、[作者返回](2026-10-26-f-host-file-path-bridge-return.md)及[执行清单](2026-10-26-f-host-file-path-bridge-execution.json)，只审F范围的公开能力名称适配，不重审完整后续计划或新剩余出口表。

首读为`2026-10-26T14:25:05.859160Z`；执行清单/pin独立比对为`14:26:23.791523Z`，3471文件保全比对为`14:28:00.586644Z`，最终主输入重读为`14:33:47.652465Z`。四份主文稿及测试在本次读取期间未变。SHA均为SHA-256：

| 输入 | 字节 | SHA |
|---|---:|---|
| `docs/evidence/2026-10-26-f-host-file-path-bridge-return.md` | 4796 | `a41b8962e5ea8f5e062ccb0fc66350d0815092ca37a3fd12444458e38d3c5a8c` |
| `docs/evidence/2026-10-26-f-host-file-path-bridge-execution.json` | 12820 | `042785174b50536148c9edf806ea59b5f64235e0656fce8dcdd9038fecee168d` |
| `docs/superpowers/specs/2026-10-26-desktop-host-file-path-bridge-design.md` | 4224 | `e40df6a35bbc3497decaeddcd32c2cdd823f957dc9062fc72c1822fb989312bf` |
| `docs/plans/2026-10-26-f-host-file-path-bridge-repair.md` | 3985 | `470cebbfd21bff77534b2e180f8cd1be2c7317f132a2069d86eac4e0173a1a18` |
| `patches/desktop-2.0.17/host-file-path-bridge.js` | 622 | `cd7238e630811e8e8b925c6c65b112daac73a065844f1fa954cf13830f550918` |
| 同目录`host-file-path-bridge.mjs` | 377 | `a55571c85022040c6b7854e5a9dee2ed08fd99520f189984a220b7deb098db1e` |
| 同目录`package.json` | 510 | `e5385360d0ed8d7107e9abb1b380a1a07403107d7508e732e25d8ad104d109d4` |
| 同目录`cordis.patch.yml` | 96 | `6ce1d1f5b1e2cab2dc3ad14d8b1d6741f3c32fb6cef0697c2576068c71417e41` |
| `scripts/tests/desktop-host-file-path-bridge.test.mjs` | 4602 | `5a857e753ad34cd874d905ea9a0ad956eb8345d0fa97014401b35a4b7b33b287` |
| 新私有`public-injection/f-host-admission.json` | 35319 | `d707506979b434244cfa04dad52cf73daa9ba03c0ee482e8ac63edab143072f6` |
| 新私有`public-injection/launch.mjs` | 2955 | `2a15a33529ff7f7e7371f6ccb4e4090de210f7ec50b85d129652d2395d8a1684` |

私有证据根为`.local/oasis-follow-up-20261026/host-path-bridge/`，有效路线仅其`public-injection/`。本审计实际执行固定Node定向测试、只读`--check`及文件/哈希/状态查询；没有`--start`、安装、浏览器操作、模型/API、上传、发送或费用动作，未读凭据。GUI结论来自已保存的截图/AX和本地合成状态，不声称审计者另启动并操作了一遍Host。

## 2. 公开接点、owner与权限

断点经过源码和实际签名包交叉核对：

| 接点 | 独立核对 | 判断 |
|---|---|---|
| Desktop提供方 | 实际2.0.17包`Contents/Resources/app/lib/preload.cjs:22`经contextBridge暴露`__DSH_DESKTOP_FILE_PATH__.getPathForFile`，第25行交给Electron`webUtils.getPathForFile`；第31行公开protocolVersion=1 | 已有的原生File能力，不是新增读文件服务 |
| DSH消费方 | 固定源码`packages/client/ui-conversation/src/client/apply.ts:108`读`__DSH_HOST_PATHS__`；第471—479行调用pathFor、按空路径/图片决定上传或生成路径引用。实际包`@deepseek-ai/dsh-client-ui-conversation/lib/client.js:17926/18369`有相同分支 | 名称不匹配确实存在；修复接回原有非图片磁盘文件分支 |
| Host扩展接点 | 固定`packages/host/webserver/src/index.ts:34`公开`webserver/index-inject`；`injections.ts:18/58`定义并渲染经典head脚本。实际包host-webserver编译文件第352行发事件、第362行渲染 | 当前实现使用已有公开事件，无新增HTTP接口或根fallback |
| 安装及owner | bridge.js第4行先保留已有`__DSH_HOST_PATHS__`，并要求protocolVersion=1；第5—6行检查既有原生函数；第7—12行安装冻结、不可写/不可配置对象 | 不覆盖已有owner；普通Web/缺能力不构造假路径 |
| File传递与失败 | bridge.js第9行把原对象交给`native.getPathForFile(file)`，保留receiver；没有捕获后造路径、名称推断、路径归一化或权限缓存 | 空路径、异常及真实File识别仍归原生提供方 |
| 权限边界 | mjs仅读取自己的固定622字节脚本并追加结构化head项；无文件正文读取、任意路径入口、网络、私有store/Map或CSP/认证变更 | 未增设业务或存储owner；后续内容读取及授权仍沿DSH原路径，本批没有实测发送后的权限/内容结果 |

`IndexInjection`要求经典脚本文本不能含关闭script标签；本脚本为固定本地常量，无该标签或用户输入拼接。head渲染位置在原模块消费之前，不靠替换根Slot、改静态解析或放宽CSP挂接。`package.json`明确private，扩展0.0.1，peer固定Cordis4.0.4和host-webserver0.2.0-rc.2；该扩展是旁置通用兼容补丁，不承载绿洲业务。

固定源归档仍为32801529字节、SHA `bbc09e888e1df3aa37be049abdb7720951e76442d21e5432365d87a465d628f1`，commit`639ed015397290b3745d163aafe02ffee4aa3f84`。本次将apply、facade、editor/runtime、ui-reference、webserver/index、webserver/injections及web-app/index七份实际源码与归档成员逐字节比较，全部相同。不以文件夹版本名代源码身份。

## 3. 新鲜测试与156项配对

审计者在zsh、项目根使用固定`tools/node-v24.21.0-darwin-arm64/bin/node`执行：

| 命令 | 实际结果 |
|---|---|
| `node --test scripts/tests/desktop-host-file-path-bridge.test.mjs` | **8通过、0失败/取消/跳过，退出0**，约71ms |
| `node .local/oasis-follow-up-20261026/host-path-bridge/public-injection/launch.mjs --check` | **退出0**，156项、`NO_MODEL_PREFLIGHT_ONLY`、模型/账户禁用、预算0 |

此处node指上述固定可执行文件。八项断言分别有证，不用数量替代范围：

| 测试/断言 | 实际覆盖及限制 |
|---|---|
| 同一File、receiver、Unicode | 原对象身份和this正确，返回Unicode路径不变；原生函数为替身，不冒充Electron权限实证 |
| Windows路径 | 字符串原样转发；不证明Windows安装包可运行 |
| 缺Desktop/缺函数/普通Web | 不安装新桥接，原上传分支保持 |
| 已有owner | 对象及行为保留，不调用/覆盖Desktop替身 |
| 空路径 | 保持空串，不从File.name编造路径 |
| 原生拒绝 | 同一个异常原样传播，不吞错 |
| 幂等、只读 | 第二次安装保持同一对象；对象冻结且属性不可写，源码同时设置不可配置 |
| 公开事件 | 实际Cordis4.0.4 Context发事件，产生一个head script并在VM执行成功；不等于HTTP认证/CSP测试或模型调用 |

作者保留的bootstrap红证据为7项中5失败；公开事件红证据为8项中1失败、随后8项通过。当前测试文件已去掉旧HTML变换路线的3项，历史10项原件另存，未用删历史方式制造通过。此次不重跑全包或昂贵验证。

逐一独立读取新准入的**156/156实际文件**，SHA全部匹配；执行清单26个members、2个fileInputs及4个启动/退出文件合计**32项**，大小和SHA全部匹配。与旧147项比较：共同141项的期望SHA无一重绑，6项旧launcher/profile路径由新隔离根对应路径替代，另加4个扩展文件和5个实际宿主接点，得到156项。旧147项准入文件及其**全部147个实际成员**也仍匹配，不是只保留旧JSON后改底层字节。

新Profile为`.dsh-test/host-path-bridge-public-20261026`，端口57523；清单声明五个本地link，本次定向解析的前端、Sidebar、工作台及桥接分别指向原补丁、已审candidate和本扩展，与声明一致。读取的profile自有cordis.yml为空数组，patch禁用模型、账户、标题、搜索、自动驱动、更新和遥测；沿原清洁环境/阻断代理规格，删除旧路径限定的fixture开关。它不是U1内核隔离证明。launcher的`--check`在获取锁/启动子进程之前返回；其输出中的原准入未变布尔值不代替本报告的实际SHA复核。

当前主包与candidate的src集合仍各117份、逐文件相等。candidate已审client SHA仍`9d97a36a94162cdadea66844e53acc176642917fa63e34a84b34c87dc1ed2f55`；这与下面保全的主包活跃lib是不同具名路径，不能混称本批替换了活跃构建。

## 4. 实际GUI、重启与文本投影

审计者实际查看有效路线的四张PNG、读取四份完整AX，并查看失败路线PNG。有效AX URL均为loopback57523、Desktop2.0.17；不能将截图上的默认模型名称当作已启用或已调用模型。

| 项目 | 本次可接受的证据 | 不接受的外推 |
|---|---|---|
| 重启前原生路径引用 | `before-restart.png/.ax.txt`显示既有`PUBLIC-BRIDGE-A-UNSENT`及两个原生文件引用，无待上传栏 | 不是已审业务artifact引用，也不证明文件正文已给模型 |
| 普通/长文件身份 | 两个新workspace-a文件分别96、449990字节；SHA与原公开夹具相同，长文件为150000 UTF-16单位 | 选择长文件并不等于把150000字符正文传入composer，更未验相邻超限/非BMP边界 |
| 正常重启 | 同一候选两次启动、一次重启、两次code0退出；原未发送文本和两个路径仍可见 | 不恢复结构化occurrence/芯片，不扩为崩溃、断电或运行中恢复 |
| B与返回A | B草稿为空、发送disabled，无A文本/路径；返回A仍为同一文本和路径 | 只证明本次正常A/B切换，不证明跨Host、并发或迟到结果 |
| 上传/发送边界 | 新Profile实际附件文件集合为空；已有截图无上传栏，操作记录未发送 | 支持本次没有走原生临时文件上传分支；未做全网络抓包，也不借用旧批网络0计数 |

Workspace A为`06ba2ccc-6721-435c-93cc-7828ae49c681`，会话`session-fae3541a-0071-4187-9a74-ba4dfa57d341`；B为`efc02fdb-9146-407f-a254-104e6f1d61ff`，会话`session-52b8d664-9fce-4ca7-abfe-d4b0d66c990a`。实际registry与保存的`workspace-after-exit.json`结构相同，路径均归新隔离根，不按同名猜归属。

首次启动`14:10:41.852Z`、退出`14:13:55.525Z`；重启`14:14:05.432Z`、退出`14:21:45.821Z`。两份exit均code0、signal=null、requestedShutdown=false；作者记录Cmd-Q与之相符。对应exit SHA为`4edef5d5a5895775f7529e5a5a27f16cefd7da82343bec438a4bd430daa382dd`、`cf47b0fb3b11b8fdf9e58a34c2e5a6b59b9e4c9e57c492e0be7fcf5437a46d24`。本次只读查询未见四个记录PID仍运行，57523无监听，startup.lock不存在。

**冷恢复的准确结果是纯文本：** 重启后AX及截图为`PUBLIC-BRIDGE-A-UNSENT @F-public-ordinary.md @F-public-long-150000.md `；重启前两个路径是原生引用显示，不能把前后编辑器状态描述为逐字节/结构化相同。

静态依据经过实际编译文件核对：固定ui-reference的`clipboardText(ref)`和`serialize(ref)`均返回同一ref；固定facade在occurrences为空时将`draft.trim()`交给默认sink。实际签名包内ui-reference编译文件13593字节、SHA `c8ddbfe697ebd2768125dffdf9cdc34c07a3ad114253888aa207470063b4418c`，第229—230行与源码一致；ui-conversation编译文件716272字节、SHA `6dde14fc827a2c0f0daf29ab0b7b769aff103ae57bb60b75008c39feccea3b6c`，第13964行有无occurrence分支。ui-reference编译文件是本审计额外读取绑定，不冒称原156项清单已包含它。

这些证据只支持**文件路径的文本投影依据**。本批未点击发送，未实测模型读取、Host内容交付、权限拒绝/允许、引用打开后内容、改文件后的版本一致性或输出质量。路径仍指向可变化的当前文件，绝非固定审核hash/版本或内容寻址快照。

## 5. HTML失败路线保全

`.local/oasis-follow-up-20261026/host-path-bridge/html-attempt/manifest.json`的SHA为`98ed5df5580ff9d6558336ae64ce38926c6c8f585a49a4c3022b07463237c6cd`。其五项归档成员——旧mjs、旧10项测试、原HTML fixture、旧spec和旧plan——实际SHA逐项与manifest相等。原HTML SHA仍为`2146ac6dd90f5b6f3896d79e6b9a933eaecb6d90525a18f8fabfc364016a5da5`。

`all-green.log`实际为旧10项通过、0失败；SHA `df43c88db71d9c21fe8ca69e44cc2fd74fb7726c24a4eca139bfe094c5167410`。但保存的`gui-first-failure.png/.ax.txt`仍显示普通Markdown的待发送上传卡，故这些绿色测试不证明实际页面消费了变换HTML。旧失败Profile仍存在，旧路线admission SHA `9a9d8881fc2576ca1cba6919d37a50c080b26ee7e02ebd26c21b26101de0f3f7`另存，没有改签为本次成功。

失败原因的固定源码`web-app/src/index.ts:163`及实际签名包编译文件第109行均通过自身`createRequire(import.meta.url)`解析frontend；单改Profile的frontend link不足以改变该解析。此后改用公开注入事件有独立8项测试、新156项准入及新GUI证据，路线分界清楚。保存的未认证loopback静态请求为403，不证明服务缺失；未成功执行的DevTools表达式也不作为能力证据。本审计未重发请求。

## 6. 历史、活跃文件与剩余边界

初始`baseline.json`为563108字节、SHA `744b9e0ae81f1237c2fda24ebd13c4929da1ce370e3e13241ad3bffb181f2ac2`。独立重算其3471个文件：**0缺失、仅9个既有路径变化**，与执行清单相同。这9项是两处状态入口、M06的两个生产源文件及五个测试/辅助文件，属于此前接续工作相对初始状态的累计差异，不误报成本路径桥接修改了9个旧文件。新增扩展/测试/文稿不在初始3471之内。

| 保全对象 | 当前SHA/结果 |
|---|---|
| 原mac-dev准入 | `e72814abad9fae80ee5f66ca3c9bdd84fc2669041a4900d3d330b04def6119aa` |
| 前批147项准入 | `092da5436842c0fa020c6899d0891374aa046d30ab3d62d3a1a65c4cbd58b5e1`，实际147项仍匹配 |
| 固定DMG | `55680cfbfc903b5cc4b2f23ecdfb3812d36e1fdaa3663b4112b329ad1622737f`，498514462字节；实际挂载writeable=false |
| 主包原锁 | `903575be3f84c6b60e716a7ef7980efdb6f024af4e62982319261d1db27a18f9`，与初始相同 |
| 主包活跃`lib/client.js` | `2c5ea5e3f7b1b40567a27bc2faa83f459863c1478d38eb2ce81d6a254b7c03aa`，505960字节，与初始相同 |
| 原来源台账 | `1b084249ab889083287ec0050e232b7a5f372581efba8e300d9da2d1efe65245`，与初始相同 |
| 原格式关口 | `9d9fc75b45e641d9ac80012eb7b5fc30346462c92a91af5f40072ed9e9bbffd6`，与初始相同 |

前四份独立审计也逐一重算且原字节未变：第一批准备`0d15d2d9e06ca4dbb93941f950ee36c81fdc2bea6007d6c871424dc0aac94acd`；M06 R1 `a78bf1e28f21ef28875f8e6cea57bb49757f2d4e6a32892fab4b22e64cebed61`；provider/网站`f930896ed4408664b0deff151641f9157154f6a0904ae0a2c618156cc217cee8`；前批F子集`efa50b8c07b50e5343811d08363b8184ccfdb2ca3a23c24e58f3bc96a3c62272`。原有签名应用来自同一只读DMG，本次未修改或重签，也未以新扩展代整套发行批准。

本批没有新增P1/P2阻止所选窄修接受。**原FH-A01/P2并未关闭：** 图片、无磁盘路径Blob及旧待发送上传附件仍是原生运行时能力缺口，结构化occurrence/芯片冷恢复本次也未实现。该事实不要求绿洲为此复制会话/附件系统，不能借修复之名写私有store、静默升级或补造通用持久化；仍按维护方公共能力或另经确认的小型通用补丁接续。

固定审核版本普通/长稿引用及内容/权限实证、业务跨Host所有权、UNKNOWN原运行恢复和完整F继续开放。E、新资源、U1/D1、真实双来源、专业/用户接受、G0—G5、H及阶段6不因本报告获得通过；原网站3元预算未新增消费。P2显式网站记录导入、P3异步、P4流式/结构化引用、150000字符以上固定文件引用、OCR/扫描混合PDF/复杂版式及新导出保留原范围。**本报告接受小修子集，不将其改写为附件全恢复、固定内容交付或全目标完成。**
