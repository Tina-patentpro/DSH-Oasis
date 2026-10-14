# 阶段3正式验收准备与中间证据

当前阶段3程序闭环结论以[独立验收收口](2026-10-14-stage3-independent-acceptance.md)为准。下文保留各准备/未知/阻塞时点的原记录；旧未知运行继续未知，不能把后续独立成功回填为它的成功。

阶段1提交81da8b8，阶段2提交ed9fbedd568492e3e67419f7645c87d7b0c37e63，均未推送。本文前两节记录正式准备时点；后续已有一次真实本地模型尝试，结果unknown/TIMED_OUT，见末节。阶段3仍未完成，不声称双来源收口。

## 正式入口

默认Mac入口保留合成标记及阻断代理。新增明确的 `--check --real-acceptance` / `--start --real-acceptance`，必须通过本地已审admission及所有固定文件指纹。正式模式只移除合成标记，并固定公开DeepSeek协议入口 `https://api.deepseek.com/anthropic`；Host代理旁路仅列 `api.deepseek.com:443` 与 `lzhxpy.oasisintwrite.com:443`，其他目的地仍走阻断代理。NO_PROXY也匹配子域；这是Host代理路由，不是OS防火墙。Renderer维持原loopback旁路/阻断代理、Electron原生sandbox和私有Home/userData，未继承环境密钥或日常配置。

隔离Profile仅把固定上游 `llm-deepseek`（实际为原生 `dsh-llm-deepseek-api-key`）disabled从true改false；其他提供方、账户Adapter、遥测、自动标题/goal驱动仍禁用。复核仅Profile和入口两项pin改变，其余30项保持。旧Profile/pin已保全；端口保持57517。正式入口preflight退出0，实际启动runId1791931107045，launcher28247、Desktop28250；不能凭spawned推断业务成功。

先写缺失能力测试：两项新增测试分别发现仍有fixture标记和缺少准入断言；原12项通过、新2项失败。实现后及最后调整运行记录后14/14、0失败、0跳过，固定Node退出0，git diff --check退出0。日志stage3-launch-red/green/final存本地。正式启动实际显示DeepSeek-V41-Flash / High；绿洲专业API动作禁用并提示登录。DSH模型原生安全密钥输入为空，未读取credentials文件。已请用户直接在该隔离窗口保存密钥并登录绿洲账户，秘密不得进入聊天。

正式切换后原生composer为空，已用阶段2保全的单行测试标记还原。此观察单独保留，不以阶段2同配置连续重启证据替代跨配置草稿恢复。后续真实模式正常重启仍须重新验收。

## 已核对的本地合同

实际资源loader退出0：flow-2-6/0.2.2、claims-disclosure-2、claims-cumulative-2、single-call-cumulative-1；manifest SHA-256=f81d427db60ab671dcd552a24794f68c1a323d2dd1b440510bb26f9bfe23d706，assembly SHA-256=3347b634d6c3228e9c373bf8c64593cb392145576c65721daceefa878b91390a，四份资源哈希全部核对，组装指令26726字符。未输出资源正文或凭据。

同一公开验收输入451字符。API映射技术交底UTF-8 TXT为899字节，SHA-256=229a68b66fb6b5ef315f36b25a552662698a2e933726566e3174e41cfb6870cd；附图说明独立映射，撰写要求/用户指令保留标签及全文。固定本地Fast服务39及已审schema指纹不能替代当前网站元数据；登录后须实时核对并显式关联账户/folder与权威Workspace。不猜folder_id、不沿用旧JWT、不重新派发旧未知运行。

仍待：安全凭据/网站登录、明确网站测试项目和当前schema/费用预览、分别成功响应、编辑再审/无覆盖保存/原生打开/固定资料草稿、正式模式重启恢复，一次集成verify与阶段3提交。当前源码准备不提前提交为阶段3完成。

## 后续集成检查与依赖恢复

直接执行当前package.json的verify三步：固定Node调用tsdown、全包node --test、固定npm pack --dry-run --json。最初869项中的46项受影响失败（871总计，823通过、46失败、2跳过），均为Mac临时目录/var与/private/var别名未canonical化引发的根目录拒绝，包括内置资源、上游、保存、导入与竞争测试。10份测试/夹具文件仅给成功创建的根调用realpath，生产安全合同不变；host-tool原192处CRLF逐字保留。受影响90/90通过，再执行三步退出0：871总计、869通过、0失败、2历史条件跳过。两跳过因历史.dsh-test/stage2-desktop目录不存在，当前Mac运行与原生能力另有实际证据。打包预览110成员，未含运行、凭据、归档、依赖或工具目录；主manifest/lock及client.js/map前后哈希保持。

首次通过pnpm run调用verify时，未传固定store与物化参数，pnpm自动重建node_modules并查询registry，已精确中断，退出130；不是verify通过。先保全部分树，再从完整归档恢复原依赖正文/相对链接。pnpm11.8.0的optimisticRepeatInstall快路径忽略store迁移，故显式关闭该优化后以offline/frozen/ignore-scripts/manage-package-manager-versions=false及固定.local/pnpm-store重新物化；未关闭供应链或完整性校验。92包均reused、downloaded0，registry minimumReleaseAge验证仍失败，CLI退出1，原有供应链限制保留。当前目录图及metadata已由真实pnpm生成，正文/相对链接逐项与原件一致，仅58处生成shims/metadata不同；storeDir为当前根.local/pnpm-store/v11。未手写元数据、未升级或下载依赖，原件和失败树保留。完整检查以固定Node/npm直接运行，避免再次触发pnpm自动物化。

本地日志stage3-package-verify（中断）、stage3-dependency-recovery-*及dependency-recovery.json、stage3-verify-direct（红）、stage3-canonical-fixtures-green、stage3-verify-final/summary、stage3-pack-dry-run.json保全，不入Git。后续只有候选输入变化或新缺陷才重跑所需检查，不无因反复verify。

## 本次真实本地调用及未知恢复

用户先报告密钥/登录已配置；实际原生模型设置随后显示“API密钥已配置”。绿洲插件设置刷新仍显示登录表单，单独请求插件登录；用户后报告“绿洲插件已登录”，该最新状态因Computer Use再次出现-3812尚未取得新鲜UI证明，不能据口头报告称账户/项目/schema联检通过。

实际A共同表单选择本地Skills，来源变化不派发；当前4字段逐字与公开样本相同、此前4合成运行和0远端执行。原生预览明确deepseek-official/deepseek-flash、451字符、内置flow-2-6/0.2.2、云端可能费用，按当前用户授权确认一次。真实runId=run-94b53b36-336c-4c8d-b210-478b8490b9a6，requestKey=4687dafe-5e06-4ed4-81cf-3d9b4e2ff8bf，inputSnapshot SHA-256=c7b73dbbdedb99703c992d0b143113347ed3b1ef8d06df1ac35264ee8fa2b19a。A/Session归属和资源指纹与准备相同；无上游材料；输入/配置/请求标识在dispatch前持久化。本机原生显示High，固定SDK默认输出上限256000 tokens；本次业务route并未显式给maxTokens，不能由SDK默认值推断实际最终请求配置/用量。

创建2026-10-13T22:55:49.256Z，结束等待22:57:49.289Z（北京时间10月14日06:55:49–06:57:49），约120033ms。status=unknown、failureCode=TIMED_OUT、executionSummary仅failureStage=stream、result=null、未审/无新保存。prepared是本地服务整个调用期间的持久状态，不等于尚未dispatch；Host期间有外部443 established socket，但不能据此证明提供方收到、首token、完成、取消或费用。原生UI显示未确认、来源与输入禁用；没有再次提交、切API、清锁或改期限/模型。

按原运行观察后正常退出code0，再经check0以同一正式模式/57517启动runId1791932421871（launcher32686、Desktop32689）。全业务存储重启前后深比较相等：5运行（原4合成+新1未知）、0实际API执行；A/B草稿/来源、原审核和保存均保持。两份旧Markdown及两份metadata哈希保持；实际UI重新显示TIMED_OUT、五版本、锁定来源及原草稿A，未重发。原始provider未知不得改标失败/成功；此项是真实未知恢复保护，不是阶段3成功闭环。

单次公开模型地址HEAD不携带凭据/材料，不触发生成：显式直连TLS=0.451s、首字节=0.856s，HTTP401，退出0，证明该时点公开地址可达，不能解释模型流超时。最初curl不识别带port的NO_PROXY，误走127.0.0.1:9而退出7，该结果保留且不归因为模型网络失败。未改系统VPN/安全设置；stdout为空、stderr无所查错误码，缺少原运行第一packet/推理/正文证据。已请求用户核对提供方相同时段完成/用量记录，不接收密钥。

当前阻碍为原真实调用结果未知；按路线图“未知结果时停止新增请求”。双来源成功正文、两来源真实结果动作、当前网站绑定/schema和成功后的恢复均缺证。阶段3不提交为完成，整体目标保持未完成；窗口保持打开，Computer Use一次重新绑定仍-3812，不扩大本机修复或采用未经明确指定的替代UI技术。

定向只读审计固定原生适配器：LlmRuntime.prepareCall限定stream只能dispatch一次；provider默认retryPolicy由可选llm-retry插件在Agent failed-step扩展点执行，本项目直接prepared.stream不进入该Agent循环。DeepSeek适配器只在使用远端文件且遇已识别stale-file-id时允许一次重新派发，本次纯文字无文件，RequestFiles.used为空，不满足该重试条件。没有根据provider默认maxRetries=5推断本次重试5次；当前缺上游请求receipt，源代码单派发合同仍不能替代远端收到/完成/计费证明。

## 用户已登录网页的只读核查

用户报告没有可核对记录后，明确允许使用其已登录网页查询。Chrome现有DeepSeek用量页按“今天”（GMT+8）与开发专用密钥DSH-DEV-MacMini筛选，加载完成显示1次API请求、37,403 Tokens、¥0.09 CNY，模型deepseek-flash。先前零值是加载中状态，不能作为未执行/未计费结论。页面提示数据可能延迟5分钟。这是当天该密钥的用量聚合；未读取原生秘密比对，关联本次运行仍属推断，不能证明精确请求状态、成功结束、取消或获得正文。未把账单用量回填为运行的原生usage，run仍unknown/result=null。

网页已有密钥创建弹窗已关闭；未创建、复制、使用或更改密钥，未保存该弹窗截图。只保全用量筛选后的局部截图。点击一次既有“导出”后下载等待超时，没有确认导出文件，也未重复导出；不把尝试当下载完成。浏览器重新绑定后用量仍可见。

绿洲已登录网站workspace v1.0.7只读进入“专利撰写→权利要求书生成→fast”，未改原项目/材料或创建任务。经正常页面刷新观察已发生的HTTP200目录/detail响应，只提取白名单元数据；api_key/credentials等字段排除，不读取请求头、Cookie或JWT，不复制网站认证到插件。目录编号211，详情服务39/权利要求书生成-Fast，Workflow/sync，价格元数据3，8输入/1文字输出。固定Node24.21.0调用现有normalizeApiDetail、normalizeCategoryCatalog及matchesReleasedFastContract，退出0：已审合同匹配true，指纹4adaf95b2e1579bf495eb9ff79966a5ae6404cd0ee89f79dde352fd97a929303，与2026-09-27脱敏fixture逐项一致。价格按每次预览核对，不当成恒定pin，也未推定货币单位。

因此当前线上schema核对已完成，没有证据支持schema漂移；网页账户登录不能替代隔离插件账户登录或A的显式项目绑定。阶段3仍缺本地成功正文、插件账户/Workspace绑定、真实API生成及两来源结果操作。无新生成/上传、未清未知锁、未改120秒期限或模型/推理/输出参数、未提交阶段3。新增生成须先明确如何处理当前未知结果；原运行永不重发。本地用量截图、无凭据元数据及合同核查JSON保留.local/stages1-3-20261014，不入Git。

## 当前候选逐项审计

继续审查线上详情的客户端入口：已观察的api_key为null、credentials为空字符串；只记录占位类型/是否允许，不记录秘密。使用已保存白名单元数据、上述两个空占位重建脱敏响应，通过现有createOasisApiClient.getApiDetail的离线fetch注入路径检查，固定Node退出0：仅去除两个空占位、原响应未改写、实际客户端返回合同匹配true。真实网络请求0，此证据补足客户端响应形态兼容，不冒充隔离Host认证/项目联检。

2026-10-14 07:26（北京时间）重新核对launcher32686、Desktop32689、Host32700均存活，Host独占127.0.0.1:57517监听。当前oasis_workbench.json与正式正常重启后完整快照深比较相等，SHA-256=ef332a17fe5de336db75a0d2e560afc2f5eda95337c6d5d3368a54290266a151。没有晚到正文或新增运行。此为本地状态观察，非提供方状态确认。

| 完成要求 | 权威证据及判定 |
|---|---|
| 阶段1开发、定向审计及Git提交 | 当前HEAD历史含81da8b8，流生命周期/错误映射/保全证据完备；仅无模型范围完成，真实超时根因未定 |
| 阶段2实际Desktop合成双来源及恢复、Git提交 | 当前HEAD为ed9fbed；阶段2closeout和A/B全量快照证明切换、审核/编辑、无覆盖保存、原生打开/资料草稿及固定地址恢复；合成范围完成 |
| 设置 | 原生模型密钥配置实际确认；网页账户已登录；隔离插件最新登录状态、账户及Workspace/folder绑定仍缺现场联检 |
| 同页切换/输入 | 阶段2实际共用表单通过；正式本地派发输入与公开样本一致；API正式绑定尚未完成，不能判真实双来源完成 |
| 本地真实生成 | 原运行unknown/TIMED_OUT/result=null；有开发密钥当日计费聚合，缺精确完成状态及正文，未完成 |
| API真实生成 | 线上目录/详情及实际客户端响应形态兼容、已审合同一致；没有真实upload/create/result，未完成 |
| 同等产物与对话 | 两来源合成全链通过；真实来源正文缺失，尚无真实审核、编辑再审、保存、打开及固定资料草稿证据 |
| 当前组合恢复 | 合成恢复及真实未知状态/原草稿保护有实际正常重启证据；真实双成功产物后的恢复仍未完成；无新发行/发布授权 |
| 构建/测试/打包 | 已读取原始verify摘要与现有日志：退出0，869通过/2已说明历史跳过，110包成员；无候选代码变化而重复测试 |
| 阶段3Git提交及整体完成 | 阶段3改动仍未提交；成功正文与两来源全链缺项使完成条件不成立，不以文档/账单/静态绿灯缩减目标 |

仅作者单代理自审，未宣称独立复审。继续独立真实验收的明确决定已请求但尚未收到；泛称目标自动续接不替代此决定，未知锁和停止新请求规则保持。

## 独立验收新授权及重开

上述待决定状态已被用户后续明确授权覆盖：批准保留原未知、不重发/清锁，同一公开样本，本地模型与专业API各最多一次；任何新未知立即停止；阶段3验收通过后提交Git，不推送。新预算另记stage3-independent-acceptance-budget.json，不重置旧许可或旧运行。模型/120000ms期限及固定组合保持。

重新核对原32686/32689/32700进程及57517监听均已不存在；--check --real-acceptance退出0。首次start因孤立startup.lock退出1；该文件仍指向已不存在的launcher32686。核对业务存储没有lsof写者、os.kill(pid,0)确认为ProcessLookupError，并校验原文件字节/inode后，把启动锁原件移动到唯一.local保全路径。这只是进程启动锁，不是业务未决锁；未删除或清除unknown。再次官方start取得runId1791953068780、launcher50337、Desktop50382、Host50422，127.0.0.1:57517实际监听。未依据启动成功宣称验收完成。

重开后完整oasis_workbench存储与重开前深比较相等；旧两个Markdown及两个metadata哈希均保持。Computer Use原生getApp再次在初始捕获时报ScreenCaptureKit -3811；复用同Chrome扩展的本地界面导航被Chrome ERR_BLOCKED_BY_CLIENT阻断，未绕过或修改其规则。检查固定client-connection公开HTTP/RPC合同：连接仍需原生认证，不将浏览器JWT、模型/API秘密或私有store当作替代连接方式。

截至本次准备，本地模型0/1、专业API创建0/1，未新增上传或创建任务。明确请求用户指定允许AppleScript / System Events用于这个隔离窗口，因为Computer Use工具规则“Use cua_repl for all UI actions … unless specifically requested by the user”要求替代UI技术明确指定。尚未执行AppleScript；技术路径待决定不消费调用许可，不替代真实成功及原生结果动作验收。当前新阻碍为UI控制通道，不是尚未批准独立调用；原未知记录继续保护。
