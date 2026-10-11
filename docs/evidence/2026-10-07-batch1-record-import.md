# 第一批：当前安装包网站记录导入验收

## 当前结论

2026-10-09最新“1个纯合成独立HTML的安全原生预览”目标 **PASS_WITH_CONCERNS**。HTML按源码惰性显示；有效Network样例过滤0/10请求，普通Markdown阳性对照6次请求。独立HTML样例缺口已补齐；全格式、任意载荷与完整第一批收口未据此完成。下方既有结果及已消费调用许可保留。

### 2026-10-09 独立HTML合成样例安全预览

- 用户明确同意上一轮提出的“仅新增1个纯合成HTML、不覆盖旧文件”范围。writing-plans→computer-use:computer-use→verification-before-completion，单代理。实际安装service/EditorHost合同将safePreview下非Markdown文件固定为code，路径导航保持安全标记，不注册/执行HTML页面。目标目录事前不存在，规范路径保持Workspace-a内，现有祖先无reparse/link；仅CreateNew创建一个文件，未新增服务/图片/脚本资源、依赖或应用补丁。
- 样例21行，含合成标题、表格、img、iframe、CSS import/background、外链与内联script；所有资源指向无人监听的127.0.0.1:10209专属路径。文件SHA8aedeb8086abceac054a08980bc243fd996abe275aaf111292adb57cecb7b76a。固定开发run245274e3-31ce-420e-8754-b62ef95ed6b3/主49720/窗口12125616，沿用上轮由工作台保存文件按钮打开的安全标签，只替换导航字段并Enter；实际完整源码及语法高亮可见，不呈富HTML，不触碰正文或保存控件。资料内script只作为文本，不作为操作指令。
- 公开开发菜单打开Network1379222，保持录制/All/非Invert，未清日志/禁缓存/改安全设置/用Console/私有store/HAR。鼠标聚焦过滤框、Ctrl+A核对selected_text、type_text实际更新过滤，稳定截图与树一致。既有ordinary.md普通Files标签切换及一次只读刷新形成6/8请求阳性对照：html.png/inline.png/reference.png各两次、均net::ERR_CONNECTION_REFUSED，证明捕获而非成功加载。返回原安全HTML标签并只读刷新后，专属过滤127.0.0.1:10209/batch1-safe-html-20261009/稳定0/10请求；源码完整、主标题不变。不声称打开DevTools之前首次导航已被网络录制覆盖，也不将阴性计数单独当安全证明。
- check-html-safety-runtime.py before/after及结果断言退出0：45旧保护SHA、110业务包成员、384 Sidebar pin文件、12日常控制保持，两实际原生资源源SHA匹配pin；新增Workspace文件精确为声明HTML且创建SHA未变，Workspace-b无新增，事后10209仍无监听。有限文件边界不等于全Profile/userdata不变；编辑器有编辑/保存工具，本轮只读操作，不称其只读能力。关闭本轮DevTools，保留安全HTML与旧未发送草稿。
- 证据 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-html-safety-20261009：plan、fixture-created、runtime-before/after、ordinary-network/html-network/html-preview、html-safety-result、progress/records-verification。无新模型/API/上传/业务下载或费用、安装重启、提交推送、AGENTS/Skill基线晋升；作者核对不是独立审查。非阻断关切为仅此一个合成样例，不能推广任意脚本/CSS/重定向/Office外部模板或全格式；第一批必要剩余合同与双来源功能证据仍开放。

### 2026-10-08 历史限定结论

2026-10-08最新“现有Markdown安全原生预览、内嵌HTML惰性显示及自动资源隔离”目标 **PASS_WITH_CONCERNS**。实际安全样例0资源请求，普通样例3请求阳性对照；缺少独立HTML文件样例，任意脚本/CSS/全格式与第一批收口仍开放。下方DOCX及下载结论保留为各自限定目标，不新增下载或模型授权。

### 2026-10-08 Markdown与内嵌HTML安全样例

- 用户继续明确提出的现有样例只读检查；computer-use:computer-use→superpowers:verification-before-completion，单代理。先读实际工作区和安装合同：仅现有safe/ordinary Markdown，包含内联/引用图片、原始img与iframe，资源均10209回环地址；没有独立HTML文件。无新样例/外部服务/依赖或安全设置变更，不读/执行资料内指令。
- 沿用健康run245274e3-31ce-420e-8754-b62ef95ed6b3，精确开发窗口12125616；工作台旧结果→已保存权利要求书_20260928-103146_v2_OIW.md→“打开当前文件”，现装panel-host-coordinator的safePreview:true原生接口路由。实际安全Sidebar文件导航输入现有s3c-resource-check-20260915-r3/safe.md，仅Enter打开，不触及正文；固定EditorHost导航保持safePreview、TextEditor资源策略合同。安全样例实际标题、表格、代码块可见，inline/reference图片只呈替代文字，img及iframe完整作为文本；保存/编辑控件存在但未操作，不能声称编辑器只读能力。当前文稿及样例文件均未写入。
- 原生公开开发者菜单打开Network264884；Ctrl+Shift+I无效果不是工具可用证据。保持录制、All类型、非Invert，不清日志、不禁用缓存、不用Console/私有store/Headers/Cookies/HAR。初次set_value显示新过滤字但未更新实际过滤，早期零记录不作资源隔离证据。新鲜焦点/选中文字确认后type_text触发有效过滤；只有后续稳定截图/树用于结论。
- 事前Get-NetTCPConnection确认10209无监听，不启动服务。普通Files路径只读打开既有ordinary.md作阳性对照；有效127.0.0.1:10209过滤实际3/23请求，精确/round3/ordinary/html.png、inline.png、reference.png，全部net::ERR_CONNECTION_REFUSED，仅证明请求被Network捕获，不是成功加载或安全路径失败。随后实际输入safe专属过滤127.0.0.1:10209/round3/safe/，回到原安全标签并再次只读刷新；录制中最终0/25请求且无样例资源行，标题/表格/替代文字及原始HTML文本仍显示。没有点击链接、发送、上传、业务下载、模型生成、费用或放宽网络策略。
- 前后check-markdown-safety-runtime.py与最终结果核对退出0：45保护SHA、110业务包成员、12日常控制保持，新Workspace文件0；384 Sidebar pin文件全量匹配，DSH primitives/index及实际web frontend index两文件SHA匹配pin，resourcePolicyVersion/allowRemoteImages合同存在。有限SHA不是全Profile/userdata不变。首次记录辅助断言误用PSObject.Properties.Count退出1；Hashtable计数45/0/0/0复核后重做断言退出0，未把它当实际漂移或掩去失败。
- 一个猜测UI组件文件路径读取失败不作证据；后续实际文件列表/现装合同核对有效。索引越界/无geometry输入拒绝保留，停止该索引路径，改用新鲜可见截图坐标；选项卡暂态树不作稳定结论，未修改应用以修复工具。关闭本轮DevTools，保留safe.md预览及原未发送草稿。未提交推送/晋升基线，不称独立审查。
- 新证据目录 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-markdown-safety-20261008，含baseline、plan、runtime-before/after、markdown-safety-result、progress/records-verification。独立HTML文件及任意脚本/CSS/重定向、其他格式和第一批关闭需另有必要样例/合同；本轮不静默缩减整体目标，也不自动创建样例。

2026-10-08本轮“已核对DOCX经Sidebar原生文件入口只读打开/预览”目标为 **PASS**：两页PDF实际显示，有限保全核对退出0。仅覆盖该样本，不关闭第一批、Markdown/HTML/远程资源隔离或内容质量验收；下述下载目标及历史404保持各自证据边界。

### 2026-10-08 Sidebar原生DOCX只读预览

- 用户“继续”承接明确提出的现有文件只读检查，不调用模型。转入本轮时开发进程0；原start-development.cmd --s6-ui-check --batch1-site-read-check只启动一次，完整准入逐文件校验耗时但无失败，未跳过或重复启动，最终退出0。新run245274e3-31ce-420e-8754-b62ef95ed6b3、主49720、开发EXE子进程3412监听127.0.0.1:43121，Host/renderer健康；日常窗口未操作。
- Computer Use新鲜精确选择开发窗口12125616，截图与可访问树确认旧输入/未发送草稿恢复。功能中心→文件，点击唯一精确路径 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\workspace-a\权利要求书-20260505-1742.docx；DSH原生Office→PDF预览显示第1页，正常只读滚动显示第2页。工具栏为读取/定位/打开方式/缩放，未观察编辑/保存控件，也未点击这些动作。不是绿洲工作台当前草稿内容，不发送对话、不编辑、不再下载、不调用模型或安装插件。
- check-sidebar-preview-runtime.py before/after及sidebar-docx-result断言均退出0：45项保护文件SHA、110业务包成员、12日常控制保持，Workspace新文件0。45项包含上轮新增完成清单；本次不以正常原生Tab/cache事务变化冒充全量Profile/userdata不变。源码、入口、准入、配置及依赖未修改；作者核对非独立审查。
- 固定DSH原生documentpreview/client、office-to-pdf Host、libreoffice-kit worker三文件SHA均匹配candidate-pin；客户端经授权Workspace读取调用本地Host转换服务，scope.remote不是云端Office。worker设置Batch=true,EnableMacrosExecution=false，仅静态宏禁用合同，不是恶意宏运行验收。既有DOCX只读ZIP检查17成员，无宏/嵌入载荷/HTML/JS或altChunk；1项外部关系为settings.xml.rels的file: attachedTemplate，不披露目标，不声称没有外部关系或任意外部模板安全。
- 两次猜测路径读取失败不作证据；随后按实际目录与pin解析读取成功，未安装或更改原生预览。样本正文/依赖树可见，但未独立审核正文/排版，不将本次Office原生路径推广为Sidebar安全Markdown/HTML路线证据。
- 原始记录目录 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-sidebar-preview-20261008：baseline、plan、runtime-before/after、sidebar-docx-result及progress/records-verification。第一批其余安全格式证据仍开放，无额外请求/生成上传费用、提交推送或基线晋升；旧工具404及已消费下载授权保留。

2026-10-08当前“记录1664网站保存版权利要求附件一次下载、字节/SHA一致及无覆盖”目标为 **PASS**。实际0保存/1同内容跳过/0失败；不代表第一批/Sidebar已完成，不改历史签名工具下载HTTP404结论。本轮用户明确批准的一次顶层附件下载已消费，不再追加或重试。

### 2026-10-08 网站保存版权利要求附件实际验收

- 用户明确同意上一轮所提一次下载，只限账户33/folder193工学键盘/record1664的顶层网站保存版权利要求附件，不选报告/输入/禁选工具。沿用现有安装和运行cb22a4cd/开发窗口90508030；Git脏树保全，无源码/依赖/入口/网络/凭据修改，没有新安装或生成上传费用。
- PowerShell（login=false）运行check-top-level-download-runtime.py before退出0，110包/准入/入口保持、44项保护SHA及12日常控制保持、Workspace新文件0。首次只读刷新隔夜ticket的本地items响应IMPORT_EXPIRED；源合同在client.listItems之前检查expiry，未发送附件或commit。页面提示正常“重新读取项目”取得新上下文后读取既有关联工学键盘，39源记录/部分材料提示保持。不是续期已消费的工具重试。不可见索引输入被拒绝的结果保留；新鲜截图/可见坐标操作后读取成功，不将旧树当新结果。
- 公开DevTools Network Response只读查找精确键（1匹配）取得新鲜metadata：key record:1664:file:5f69afa11b4aa4eb1278b5fcb7023a0a5c6d4e3976cc52a94451c224f311677e，revision6c47edf3e799b0aac6daa459effc1ee78e39dda1d8068bed33677fdd440be7e5，record1664/role output/file/size null/downloadable true，文件权利要求书-20260505-1742.docx。不读Headers/Cookies/Payload，不执行Console/应用脚本，不保存完整响应、原始URL、签名或凭据。关闭本轮DevTools后，输出筛选不发请求；只勾选唯一权利要求附件，报告/输入/工具不选，提交前保存one-commit-intent及旧DOCX SHA。
- Computer Use一次“关联并导入选中文件”提交后仅观察：实际截图/树显示项目关联已保存、0项保存/1项同内容跳过/0项失败。新清单 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\workspace-a\.oasis-import-6f394591-d0c1-4b00-a714-85ba547e5eec.jsonl，精确上述key/revision/归属且只选择1项；四行import→verified-existing→result skipped→finished completed。verified-existing记录本次取得15987字节，SHA256112318c9bb6580568735640f2e8f0df660a188fb361d939033866a89136a5540，与原DOCX一致，故未新建/覆盖附件。现装service先client.download获取bytes再sameFile比对、client在附件前后重新校验key/revision/项目，无缓存跳过下载分支；不把旧文件存在本身当下载成功，也不声称新文件已保存、正文审核或历史原件认证。
- runtime after及结果断言退出0：110包/准入保持，44保护/12日常控制一致，19根目录旧文件SHA保持，仅新增上述清单。正常commit确认同一账户/folder/Workspace（native/Profile事务metadata允许正常更新）；有限哈希证明不推广为全量运行中Profile/userdata不变。附件的一次授权已消费；没有第二次submit/下载、报告/输入请求、重试回退或提交推送。
- 原始记录目录 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-top-level-download-20261008，含runtime-before/after、output-attempt-preflight、one-commit-intent、output-result。旧404/失败清单及安装证明保留。首轮补充Client文件读取错名失败不作证据；随后实际website-import-client.js读取成功并核对download链路。作者核对不作为独立审查。
- 仍开放：Sidebar原生文件打开/安全预览、第一批收口及其他业务里程碑；不自动读取或发给模型。下一步仅提出对已核对的现有DOCX进行Sidebar只读打开/可用预览检查，不下载报告/重复输入/新生成。既有工具404具体原因仍未知，不能从本次顶层成功倒推签名过期。

### 本轮限定安装与真实开发列表

- PowerShell（login=false）运行create-only安装辅助器install-signed-tool-address.py，退出0。保存退出后再次确认开发进程0；候选SHA29cf38a9af31ae8f47e8b94e435efef8e4051fa811f06e59c1b7a7a429cf19fa及现装诊断包完整匹配。新完整checkpoint41,388文件/1,831,295,276字节，包括app/Home/userdata/user/runtime/两个Workspace及7控制文件，排除仅具名下载缓存；源/副本/安装前后均SHA核对。仅替换src/website-record-files.js及必要candidate-pin/admission哈希，其他part/入口/依赖/Profile配置/网络不变，110包成员全部匹配，日常新增差异0。原有checkpoint及失败证据保留。
- 原start-development.cmd --s6-ui-check --batch1-site-read-check启动退出0；新launch-1791378861604.json/run cb22a4cd-4b5a-4323-aa7c-c602f8dd65b0，主69592，Host-boot完成/renderer healthy。独立Get-CimInstance/Get-NetTCPConnection退出0证明43121仅127.0.0.1监听，PID48036为主69592的开发EXE子进程；不将历史Node Host PID复用到本次。
- Computer Use从新鲜apps精确选择开发窗口90508030（不操作日常窗口），实际截图/树确认旧输入、未发送草稿、当前Workspace同步。功能中心→从网站导入→本轮初次只读项目列表（5项）→既有关联工学键盘→输出筛选。39源记录第1页：1664的顶层网站权利要求附件和报告仍可选且大小待下载核实；两个签名工具资源以“不支持的材料”禁选，并显示“历史工具资源地址未获网站附件下载确认，请选择网站保存的附件”。未按同名补大小、未替换绑定、没有15987字节可选工具条目，部分记录不可读提示保留。实际操作0勾选/0提交/0下载/0生成上传费用。
- check-signed-tool-address-runtime.py before/after均退出0：110包/准入及入口保持，最新checkpoint的44项Home/Workspace保护SHA及12日常控制无新增差异，Workspace新文件0；这不是全量运行中userdata无变化证明。主/固定构建201已验证输入再次SHA匹配，未重跑未改输入的测试。作者核对非独立审查，无提交推送/发布/基线晋升。
- 原始记录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-signed-tool-address-install\checkpoint.json、installed.json、runtime-before.json、runtime-after.json、record-list-ui.json；新检查点目录为同上工作目录的checkpoint-before-signed-tool-address。旧原始响应/URL/签名/凭据及材料正文没有另行落盘。
- 未验证：网站保存的顶层附件当前能否下载、bytes/SHA/同名无覆盖、Sidebar安全文件预览；原工具HTTP404原因仍未知。下一步只能提出新的顶层权利要求附件一次明确授权下载，不重用已消费工具重试、不自动下载报告或重复输入。旧DOCX若内容相同应跳过，否则保持旧文件无覆盖。

### 签名工具地址来源与离线最小修正

- 用户回传前端app.oasisintwrite.com/workspace页面后，Chrome真实v1.0.7通过项目管理/工学键盘39会话/2026-05-05 17:42:18历史正常只读导航。对应record1664/folder193详情HTTP200，当前失败key73adee/revision80d04c精确匹配嵌套response.data.outputs.claims_docx[0]，tool_file/url、15987字节、files/tools路径族、timestamp/nonce/sign参数。顶层file_url[0]为不同uploads/workflow地址，大小未知，其digest(url)匹配9月成功f9e273清单；报告亦存在这两层来源，网站UI显示2份下载入口。没有点击下载，不能证明顶层当前可用、两地址bytes一致或工具签名过期。脱敏记录在 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-attachment-source-readonly；不保存原始URL、签名值、响应正文或凭据。
- 用户同意下一步后补充现有OpenSpec合同；仅website-record-files.js add的输出边界7行：最终规范化URL的解码路径属于/files/tools/且三个参数均存在，生成已有unsupported/禁选说明。不改输入、无签名工具及其他受信路径；download_url指向网站地址时只判断该实际选定地址。不按同名合并另一地址的size/mime，不自动替换旧选择，不添加Bearer/重定向/网络回退，不改V2、RPC、Client或UI结构。
- 新增11回归：4组139测试RED时132通过/7目标失败/0跳过，真实Node退出1；4个原有兼容保全新增断言本来通过，不冒充缺失能力红灯。GREEN受影响220/220退出0，涵盖字段提取、真实Client旧选择拒绝且附件GET0、真实Service禁选票据拒绝/无写入/脱敏、已有Controller不可选与React静态渲染禁选原因。仅是离线/合成及静态渲染，不是新候选实际Desktop界面证据。
- build/full test/pack均退出0：858项中856通过、2既有条件跳过、0失败。跳过为approved isolated Home admits only the explicit native offline flag、isolated Host declares native services before accessing Cordis context，未计通过。构建保留既有deps.onlyBundle建议，不因本批修改构建配置。固定私有Node24.19.0/pnpm11.25.0，既有network-guard/dead proxy/隔离Home；本轮没有启动DSH或真实请求。
- 候选110成员，相对现装诊断包仅src/website-record-files.js一成员变化，Client lib重建字节相同。候选SHA256：29cf38a9af31ae8f47e8b94e435efef8e4051fa811f06e59c1b7a7a429cf19fa；路径 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\candidate\batch1-signed-tool-address\oasis-professional-service-0.0.1.tgz。
- baseline/final辅助核对退出0：主/固定构建201项匹配、3036 tracked无无关漂移、安装110成员保持原包、43项Home/Workspace保护SHA及12项日常控制新增差异0，旧DOCX和失败清单未改。package/lock/其他依赖不变；有限控制证据不扩大为整个日常Profile/Userdata不变。仅一个生产源文件、4测试文件及必要记录变化；不暂存、提交、推送、晋升AGENTS/Skill版本。
- 单代理作者自审：逐项核对最终URL优先级、编码路径/参数、不混同名元数据、未知大小、旧票据无自动改选、脱敏/输入兼容；未发现当前目标阻塞缺陷。不是独立审查或合并准入。Skill工作区/提交/子代理步骤服从用户保全和单代理规则；旧Skill版本只读实包核对，不由本切片启动CLI补证。

新鲜日志/命令/基线/候选差异与ledger：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-signed-tool-address。未安装，不消费新下载授权。下一步若批准安装，需本批保存正常退出、新完整checkpoint、一成员及必要pin/admission限定安装、原入口重开及只读列表核对；新顶层实际下载另定一次明确许可。旧文件若鲜取bytes相同应跳过、不覆盖，不把旧存在文件当成功证明。

**FAIL（指定输出下载/第一批）**：用户本轮回传保存正常退出后，诊断候选已限定安装、原入口重开并取得实际Desktop证据。只对清单指定的输出DOCX提交一次，返回 `IMPORT_REQUEST_FAILED`，安全诊断为 `history-attachment / response / http / HTTP404`，新清单 partial；界面与清单一致。诊断传播已实际观察，但附件下载仍失败，不能称修复或第一批完成。本次重试许可已消费，已停止，不再自动重试、扩大白名单、给旧附件加Bearer或替换同名条目。日常DSH、原文件与旧失败记录均保留。

### 本轮限定安装与实际输出验收

- 本轮用户确认保存正常退出；新鲜开发Desktop/私有Node进程0（94b0cf）。完整checkpoint安装退出0（932d38）：41,383文件/1,828,097,108字节，最多8线程逐文件校验与新建复制，source/copy/final一致，只排除原列明下载缓存，包含最新用户导入及原生草稿。备份 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\checkpoint-before-download-diagnostics。
- 仅替换6个候选包成员及candidate-pin/admission两项元数据；现装110成员匹配，其余七个备份part无漂移，launcher/start-development/版本/依赖/锁/Profile配置/网络边界不改，日常额外漂移0。原入口 `--s6-ui-check --batch1-site-read-check` 启动退出0（660436）；run479e97f8-7d8f-42b5-b170-48e707d8edd6、主29012/Host81980/127.0.0.1:43121，Host及renderer healthy。安装前包/主源码/构建SHA匹配原验证输入，不重复构建或全量业务测试。
- Computer Use仅开发23071240，首次激活失败后新鲜重选一次成功；截图/树一致，已同步workspace-a、原技术交底与未发送固定版本对话草稿可见，没有发送或生成。功能中心→网站导入，沿用账户33/工学键盘193，不更换绑定；本次列表读取5项目、记录39源行，原有部分材料失败仍明确标注。
- 为区分同名条目，观察原生开发者菜单并打开返回的开发工具25691418，只查Network公开 import/items Response。一次必要本页刷新响应200中：已选key73adee...及revision80d04c...与旧e091e999清单逐项一致，大小15987；同名大小待核实项是不同key5f69af.../revision6c47ed...，未选择。未查看/回传请求头、Payload或凭据，不运行控制台代码，不调用私有store。CtrlShiftI无效果；正常菜单成功，不扩建诊断工具。开发工具已关闭。
- 实际只勾选15987字节目标输出，已选清单1项、0输入；提交按钮仅点击一次，先观察下载中，随后0保存/0跳过/1失败。稳定可见结果说明“历史附件下载：接口响应失败（响应状态），HTTP404。不会自动重试。” 新清单 `.oasis-import-a0233c3d-2387-47cf-b240-ebf62c8abdfb.jsonl` 只含import/result/finished三行，无intent或保存动作，selected1且key/选择修订与旧清单完全一致。
- result.details严格为四项白名单：endpoint=history-attachment、stage=response、kind=http、httpStatus=404；finished=partial。证明附件响应阶段实际404，但为什么返回404仍未知，不能推断文件删除、地址过期、权限变化或映射错误。未用旧文件宣称当前下载成功。
- 后验/结果核对分别退出0（8a1476/be9d72）：现装110与pin/admission匹配；43项Home/Workspace有限控制无漂移，原15987字节DOCX SHA保持；仅新增本次失败清单，日常12项控制新增差异0。没有第二次点击/下载、输入复测、上传/收费生成、日常窗口操作、源码更改或提交推送。
- 安装、运行及UI/清单记录 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-download-diagnostics-install（checkpoint.json、installed.json、runtime-before.json、runtime-after.json、output-attempt-preflight.json、output-result.json）。单代理作者核对非独立审查，实际界面诊断不代表专业业务内容或Sidebar安全文件验收。

### 下一步建议（计划，不自动执行）

只读核对网站记录1664的目标附件来源、字段与下载接口映射：比对同一key的实际元数据/返回合同及已有API文档，区分两个同名条目；只保存脱敏分类/指纹，不保存URL、凭据或正文。网站端文件状态、旧地址与映射原因在获得相应证据前保持未知。不再下载或新建生成，不放宽origin/路径/重定向/鉴权合同；若需要新下载、后端变更或行为修正，再说明具体范围与授权。旧DOCX保全，第一批输出/Sidebar门禁保持开放。

## 上轮候选准备结论（历史：退出/安装门禁已由本轮满足）

**BLOCKED_WAITING_FOR_USER（仅候选安装）**：用户同意下一步后，已完成逐项失败安全诊断的离线候选。当前开发 Desktop 仍运行，须用户保存并正常退出后，创建包含最新导入文件及草稿的新完整 checkpoint，再限定安装；不自动关闭用户窗口。第一批输出下载仍有 `IMPORT_REQUEST_FAILED`，原因未明，不能称下载已修复。一次指定输出 DOCX 重试已获准但尚未消费，输入不再重复验收；不增加生成、上传、费用或发布授权。

### 用户实际导入回传与本轮只读核验

- 用户自行操作并回传截图，不归为代理点击。三份清单位于 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\workspace-a。09c1d65e-985a-46c6-8d7e-ae9bd02f4e49 保存语义生图_OIW.md、同内容跳过申请文件检查-Basic_OIW.md，仅历史正文证据。
- e091e999-1bcc-4614-ae07-85a52a1e25d9 选定输入记录5046/technical-disclosure.txt和输出记录1664/权利要求书-20260505-1742.docx。输入保存3460字节，SHA-256 f264638f123106d7b128616d9510661a4e4818cd17d417c84042b55b442a4285；输出失败码 IMPORT_REQUEST_FAILED，旧清单无 details，最终 partial。c0e3915d-c22e-4428-a12d-26878cf75799 仅重复选择输入，同内容跳过并 completed，不证明输出恢复。选样门禁已满足，不再要求重新指定样本。
- 既有同名 DOCX 为15987字节，SHA-256 112318c9bb6580568735640f2e8f0df660a188fb361d939033866a89136a5540，与导入前 checkpoint 一致；不得冒充本次成功下载，且必须保全。将来只按 e091e999 清单的所选 key 与修订核对输出身份，不把同名两个条目当作同一文件。
- 新鲜只读检查退出0（c0865b）：三份清单及所有 intent/verified-existing 文件字节/SHA 匹配；已装110成员、launcher/pin/admission保持；38项有限保护控制保持，日常控制新增差异0。未请求网站、重试或修改运行副本。原始证据：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-download-diagnostics\current-controls.json。

### 已批准最小安全诊断合同与候选

1. 保持导入协议V2与既有端点、请求、选择修订、账户/Workspace归属、附件无Bearer、GET/redirect:error、限额、排他写入及同内容跳过。失败项仅可携带可选 endpoint/stage/kind/httpStatus，复用既有白名单和中文说明。空诊断省略；未知错误不传播 message/cause/stack/URL/token/响应正文；保存/跳过项及旧清单不改。
2. 根因是已有下载诊断在逐项 catch 被丢弃，commit 严格响应合同也未接收，结果UI只显示码。本轮只修诊断传播，不猜测HTTP状态、重定向、代理或URL过期，不扩大网络白名单、不自动重试。
3. 新增9项真实服务→RPC→控制器→清单、渲染行、脱敏/旧合同回归：RED退出1，2通过/7预期失败（缺失 details/schema/UI）；GREEN受影响209/209退出0。完整build/test/pack退出0，845通过/2既有跳过/0失败；只本轮集成候选运行一次完整测试，不把测试数量当业务完成度。
4. 候选 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\candidate\batch1-download-diagnostics\oasis-professional-service-0.0.1.tgz 共110成员，较现装包仅4源/2生成lib变化；主源码与固定构建201项一致，3036原跟踪文件无无关漂移。package.json语义一致、旧打包manifest字节不变。首次推广辅助器原始字节比较失败退出1，已复制两项许可lib；保留错误后只读 finalizer 退出0，不隐去失败或重跑产品测试。
5. 单代理作者自审，不称独立审查；安装/当前Desktop诊断展示/真实DOCX重试/Sidebar安全文件证据尚未获得。离线候选是静态证据，不能关闭第一批。相关新记录位于 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-download-diagnostics。

### 安装与一次输出重试的停止条件

- 当前保存正常退出后核对开发Desktop/私有Node均0；创建包含最新用户状态的完整新checkpoint，校验source/copy/final强哈希。日常额外漂移、并发修改、链接/路径异常或任何不匹配即停，不回滚用户变更。
- 仅安装6个已验证包成员及必要pin/admission元数据，保持launcher/network/依赖/日常不变；原入口重开，核对当前包与旧草稿，再用Computer Use核对清单指定输出身份，只重试一次，不勾选输入。身份或修订已变化则停止重新确认，不猜测条目。
- 如成功，按新清单下载字节/SHA与旧文件核对无覆盖/同内容跳过；如失败，记录四项安全诊断并停止，不再重试、不放宽下载合同。旧文件、旧失败及清单保留。

## 历史结论（以下等待选样记录已被上述用户回传覆盖）

**BLOCKED_WAITING_FOR_USER**：用户再次要求Computer Use后，已只读查看当前关联“工学键盘”的业务记录，未更换项目绑定。三类筛选、记录分页1→2→1及部分失败/禁选提示已有当前安装Desktop实际证据；当前只等待用户明确指定一个输入和一个输出，已发具体候选问题，不将泛称“执行”或预选答案当选样许可。未勾选、下载、关联提交、生成或上传。下载大小/SHA/追溯/无覆盖、修订新鲜度及Sidebar安全文件预览仍待验，不关闭第一批。

### 本轮 Computer Use 记录/筛选/分页

- 新鲜选择仅开发窗口61017146，激活成功、截图/树匹配，沿用账户33/工学键盘已有绑定。没有重复已消费的项目列表重试，只点击当前已关联项目作只读业务记录浏览，未点击“关联到当前项目”。
- 界面显示39条源记录，第一页可见18项历史正文，第二页可见15项历史正文；文件项数量不等于源记录数量，也不等于全部材料已读。输入筛选显示记录5046的technical-disclosure.txt（Technical_Disclosure_file，大小待下载核实）与记录1664一项禁用输入。输出筛选显示可选DOCX及多项禁用项，禁用原因分别为未知输出类型/传输或地址/文件名/类型/大小不满足合同。两页均明确部分记录/材料无法读取，不把它当空列表或完整成功，不擅自解除安全限制。
- 记录1664同名“权利要求书-20260505-1742.docx”分别有大小待核实与15987字节条目；不推定二者身份相同，不自动勾选。已询问用户是否指定输入5046/technical-disclosure.txt及输出1664/上述15987字节条目，也可另指定名称/ID。尚未收到答复，不宣称用户已选定。
- 初次按可访问性分页索引点击被工具拒绝：point(762,2048)超出1194×912窗口，未发点击。重新观察后正常滚动到屏幕内分页按钮，坐标点击成功显示第2页且下一页禁用；历史正文筛选后返回第1页、上一页禁用，0勾选保持。即时截图/树存在过渡滞后，均以随后稳定观察为准；未自动重新读取本页，不新增修复工具或应用改动。筛选“不发请求”为界面说明，本轮未以网络计数独立证明。
- 成对保护检查before退出0（9982d3）/after退出0（86b9a6）：110安装成员一致、入口/pin/admission当前匹配，38项Home/Workspace有限控制SHA保持、日常12控制新增差异0。仅创建证据/核对辅助文件，未修改业务源码、安装配置或真实Profile；不是全userData或远端审计，也没有保存截图载荷/凭据。
- 记录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-site-install-20261007\record-list-computer-use.json、record-list-controls-before.json、record-list-controls-after.json。本轮沿用computer-use:computer-use→superpowers:verification-before-completion方法，单代理核对，不称独立审查，不提交推送或晋升基线。

### 上一轮项目列表接续（历史，已由本轮只读记录进展覆盖）

**BLOCKED_WAITING_FOR_USER**：本轮保存正常退出已确认，不再等待退出、前台或网络批准。完整新checkpoint及限定入口安装退出0，原入口新模式重开、Host/renderer健康，Computer Use一次获准项目列表重试成功显示5项目。当前等待用户指定验收网站项目及一个输入、一个输出；没有选择项目、改关联、勾选或下载。第一批记录/筛选/分页/修订/部分结果/下载与Sidebar文件安全证明仍开放，不以项目列表成功关闭整批。

### 本轮实际安装与网站列表结果

- 首个备份worker因串行SHA耗时停止，仅停止已核实本轮Python11708，退出1；当时checkpoint未完成、原launch SHA保持，现有app副本保留，未当作回滚点。新r2只把逐文件lstat/SHA调度改为最多8线程，全部canonical/no-link检查、源/复制/末态/安装后SHA及停进程门禁不变。已有app副本必须与新鲜源逐项一致才复用，不覆盖；其他part新建。原脚本、停止记录与失败保留，不另建重复完整备份。
- r2实际退出0（1ddacf）：41,376文件/1,826,420,128字节完整一致，包含最新原生新增会话与未发送状态，只排除列明下载缓存。备份 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\checkpoint-before-batch1-site-read。仅修改原launch.mjs、candidate-pin及admission三项，新增site-read-check.test.mjs；110业务包成员保持、其余part安装后漂移0、日常12控制新增差异0，未改依赖/锁/Profile/原start-development.cmd。候选与已安装字节匹配，复用对应8/8定向离线验证，不重复业务构建或历史ASAR测试；单代理作者自审，不称独立审查。
- 原私有Node执行launch.mjs --s6-ui-check --batch1-site-read-check，入口内含完整准入检查，启动退出0（0fb994）。新run67da80b0-5f52-4c8f-9aa5-fc4e1f8ca0ac，主65240、Host10452监听127.0.0.1:43121；新启动记录launch-1791370072838.json显示siteReadCheck与限定hostNoProxy。运行检查退出0（9e61fb）：Host boot completed/renderer healthy、110成员/pin/admission当前匹配、38项Home/Workspace有限保护控制漂移0、日常新增差异0。未以日志替代实际UI。
- bundled @oai/sky仅精确激活开发窗口61017146，截图与树匹配。原A项目/任务、V0.3.2输入和旧未发送run/artifact恢复可见，未发送。功能中心→从网站导入→读取网站项目，只点击一次并只读等待稳定；5项目实际显示：Codex运行检测-20260702-023658-项目、Codex记忆测试-1781233866305、工学键盘、洗衣机胶圈自清洁、底盘研究。第1页、前后页禁用；暂态0项/正在读取不是最终空结果。旧“工学键盘/账户33”关联未改变，0勾选、0下载；没有搜索、重读、关联或生成上传。一次获准列表重试已消费，不续期。
- UI后有限控制检查退出0（715b4a）：38项原保护文件SHA保持、新Home/Workspace文件0、日常新增差异0、入口/pin/admission保持。这不是全userData/OS写入审计，不记录截图载荷或凭据。正常开发窗口保留供用户选样，不要求再次退出。
- 新证据目录 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-site-install-20261007：partial-worker-stopped.json、checkpoint.json、installed.json、runtime-before-ui.json、computer-use-result.json。旧网络失败保留为历史；不晋升AGENTS/Skill、不提交推送、不关闭第二批。

### 上一轮退出等待（历史，已由本轮证据覆盖）

**BLOCKED_WAITING_FOR_USER**：用户已明确同意下述网站443（含其子域）放行方案，授权门禁解除，不再索取网络批准。离线入口候选先红后绿，8项定向检查退出0；原开发入口、pin/admission及运行配置尚未修改，真实列表未重试。当前需用户保存并正常退出正在运行的开发副本，才可做包含最新原生状态的完整checkpoint和限定入口安装。日常DSH不用退出，旧保存退出许可已用于上轮候选，不能替代本轮当前运行窗口的退出证据。旧网络失败保留，不宣称第一批完成。

### 网站模式获批后的离线准备

- 仅新候选目录 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\candidate\batch1-site-read-check 保存当前入口字节与测试。实现新增显式--batch1-site-read-check，必须结合--s6-ui-check；只追加Host继承NO_PROXY的已批主机443项，Electron命令行代理及其余隔离环境不变，默认网站仍走dead proxy。新启动记录带siteReadCheck/hostNoProxy便于审计，不包含凭据。
- 实際固定dsh-http-proxy0.2.0-rc.2通过公开installProxyFromEnvironment/proxyRouteFor在测试子进程安装/还原策略，未发网络请求。入口env优先于系统代理，实际Desktop公开源码的overlay在显式proxy环境下为空，故没有依靠系统设置或猜测私有状态。
- 首次测试5项失败中有1项上游返回字段proxy误写成proxyUrl的测试错误，已按实际导出修正，保留red.log；生产候选仍原样再跑red-contract.log，1通过/4项预期缺能力失败、退出1。最小入口实现后green.log退出0：5项新测试加3项继承/路径/互斥测试共8/8。验证默认仍隔离、显式模式只变NO_PROXY、无s6准入拒绝、CLI识别与拒绝、网站及子域443直连、父域/非443/HTTP默认端口/伪后缀/其他模型与registry域仍代理。
- 没有扩展业务实现、依赖或API合同，不重复构建/运行业务完整测试；旧profile-startup.test.mjs依赖历史ASAR，不作为当前2.0.17入口证明或新增修复范围。未安装、未启动新模式、未做真实请求。新鲜原入口SHA仍与上轮checkpoint一致（4ce382），日常12控制新增差异0（bc4364）。候选差异单代理作者自审，仅makeLaunchSpec/CLI模式及启动记录改动，不称独立审查。
- 记录 verified.json 固定旧/新入口、测试及实际代理源码SHA。下一步必须新完整checkpoint后限定更新原launch.mjs及pin/admission，并新增对应测试；其余程序/Profile/凭据/业务文件保持，原start-development.cmd和日常/全局入口不改。获批的一次列表重试只在新模式当前包正常运行后执行，具体输入/输出样本仍待用户选定。

### 最新 Computer Use 实际执行（覆盖下方截图错配门禁）

- 原开发窗口52103818首轮捕获仍错配到当前Codex页面，未对该图操作。对精确返回的开发窗口activate成功后，截图与DSH2.0.17、项目同步、输入页和旧未发送草稿一致；之后仅使用新鲜索引逐项点击/刷新，没有操作日常DSH或Codex界面。
- 功能中心、网站导入对话框实际显示。沿用已有账户及项目关联，不解除/替换，不操作登录。仅点击一次“读取网站项目”，实际projects/network/request失败；警报明确不把失败判为空列表、不会自动重试，已勾选0项、下载0项。未点击重新读取、搜索、关联或生成。
- 继续已批准的本地A/B检查：B稳定后对话输入为空；B工作台归属94ced0c3-e0b7-40b6-87f3-efca0a463b68，旧任务6d58b5aa-cf25-4b4d-ae68-7c02196de28e及材料“测试”，不同于A。返回A并等待稳定刷新后，项目5967c480-f400-4083-b650-9176dade70d1、原任务98d68e38-3dc7-4060-9187-922a35d11b4a、旧技术交底及未发送run/artifact恢复。即时捕获会暂时滞后，不把过渡空视图判为丢失。
- A已有输入Markdown预览实际显示，随后恢复原编辑视图。此项是普通输入预览功能证明，不替代恶意HTML/远程图片拦截或Sidebar已有文件安全预览的安装包证明；后者仍开放。
- UI后只读文件检查退出0（986621）：35项控制中33项SHA保持，2项原生存储变化；日常控制新增差异0。字段核对退出0（882c39）：workspace.json仅B的sessionIds/updatedAt，B旧session投影缓存仅formatVersion/4个row版本/userQuestions变化，不伪装字节未变。为了从B回到原草稿页，使用一次原生“新建会话”视图；原生新增空B会话session-ac3d46f6-5602-4934-9084-8633bc34f846及其缓存文件，旧会话ID未删除（d0ff42）。新增状态保留、不清理；没有发送、生成或材料改写。其他被检查的业务/材料文件保持；有限控制不等于全userData审计。
- 证据：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-install-20261007-r4\computer-use-import-result.json、ui-control-field-diff.json、ui-native-storage-additions.json。没有保存/重复解码截图载荷，没有修改代码、网络策略、账户、关联、日常配置或提交推送。

### 已批准的最小网站网络放行方案（仅离线候选，未安装）

1. 原开发入口新增显式batch1-site-read-check模式，仅与现有s6-ui-check一起使用；默认/合成模式仍保持loopback-only。只为Host继承的NO_PROXY追加lzhxpy.oasisintwrite.com:443，保留dead proxy、隔离Home、遥测/会话上传/更新关闭和Electron的loopback-only命令行代理。不修改日常应用、系统代理或原生安全设置。
2. 公开dsh-http-proxy的NO_PROXY采用后缀匹配，该条也绕过该主机的子域443端口；这不是严格单origin防火墙，也不限制HTTP方法。实际业务请求仍固定https://lzhxpy.oasisintwrite.com、GET、redirect:error，不将其称为网络层GET-only。若用户不接受此边界，不实施，也不擅建代理平台。
3. 范围内定向测试验证默认仍隔离、显式模式唯一追加项、其他业务/模型/遥测域仍走dead proxy、无通配或父域放行；核对实际固定包代理解析。新模式先不发真实请求。相应launcher/pin/admission修改须保留旧字节及更新校验，禁止绕过准入。
4. 获批后再由用户保存正常退出当前副本，做包含本轮原生新增状态的新完整checkpoint和限定入口安装；原入口正常重开并复核保护控制。仅明确重试一次项目列表，不发送、生成或上传；继续失败则停线，不自动回退。有效列表后由用户指定一个输入和一个输出，才作既定下载验收；没有批准新文件域名或调用预算。

### 用户显示窗口后的定向复核

- bundled @oai/sky重新枚举并只选择原开发进程窗口52103818。首轮只读捕获截图与DSH外壳树不符；一次精确激活失败后重新枚举/选择，只读捕获现返回完整DSH工作台树，但截图仍是其他页面。未对错配截图中的内容或指令采取行动；原因未核实，不把工具故障归为产品缺陷，也不继续点击/键入或另建修复工具。
- 当前树显示Desktop2.0.17、项目5967c480-f400-4083-b650-9176dade70d1、输入页及原API completed状态。原未发送草稿run847bc50d-0995-40ed-9e83-529c1148051e与artifact标识仍可见，发送按钮未操作。此为可访问性层的恢复证据，不替代视觉、A/B隔离、安全预览或字节保全证明；没有切换Workspace或创建会话。
- 新鲜只读文件控制检查退出0（工具69c5d5）：110安装成员匹配，35项Home/Workspace文件漂移0、本轮日常控制新增差异0。未重复构建或测试未变化候选，未生成、上传、下载或发送；无日常窗口操作。
- 原始记录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-install-20261007-r4\ui-after-foreground.json。后续人工输入改为“功能中心”截图，不重复已满足的前台/退出/配置归因门禁。

### 最新安装与运行证据（覆盖下节待归因/未安装状态）

- 用户明确“确认是我，请继续”，归因门禁解除。保留此前所有日常强基线、差异及失败记录；本轮起点明确采用已记录且由用户确认的观察SHA，不回滚日常文件、不冒充旧基线仍一致。
- 完整一致checkpoint及限定安装脚本r4退出0：41,374文件/1,849,953,055字节，源/复制/末态逐项SHA匹配，包含当前程序、Profile、会话、旧未发送草稿、业务与A/B Workspace。备份 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\checkpoint-before-batch1-bridge-r4。原先三个不完整新输出保留，不作为回滚点。
- 枚举辅助脚本的唯一优化为canonical root/祖先链每轮检查一次、每个目录/叶节点lstat及symlink/junction tag拒绝，在不含链接的树上归纳保证canonical后代；文件集合、全部SHA-copy-source-final核对和停进程条件不减。r3只读枚举阶段因重复祖先检查仍慢而停止已核实身份的本轮Python，原数据未修改；旧脚本/失败/不完整输出全部保留。
- 仅原子替换候选中变化的3个成员（WorkspaceContextBridge源、lib/client.js、map）及同步candidate-pin/admission控制，110个安装成员与新包一致，其余完整备份范围文件无变化。保留原package/lock/依赖闭包，pin明确记录main-view-session-1 overlay及新旧TGZ SHA，不冒充未打补丁的干净v5 npm安装；不运行安装脚本、不写pnpm缓存或重新解析版本。逐项后验其余part漂移0，本轮日常12控制新增差异0。
- 原入口 `launch.mjs --s6-ui-check` 内含完整安装/准入检查，退出0，不重复先check再start。主PID80888，Host PID17204监听127.0.0.1:43121；新run c3d13b78-c92a-4780-a95d-f5d9342a54ec，Host boot completed、renderer healthy。
- `verify-batch1-runtime.py`退出0：110候选成员及pin/admission SHA当前一致；35项Home/Workspace非Profile文件与新checkpoint相同、原生投影缓存新增变化0、日常控制新增差异0。此有限控制集不是整个userData/OS写入审计，不以启动日志代替UI或下载证明。
- bundled @oai/sky准确返回当前开发主窗口52103818与日常窗口4720302。仅对开发窗口激活，两次同错，第二次先list_windows重新选择同一实际返回窗口；没有点击、键入、发送、生成、上传、下载或操作日常窗口。只读应用枚举没有返回匹配LockApp，不能据此断言屏幕已解锁。按computer-use Skill“激活失败→新选择→一次重试”恢复预算停线，不换用PowerShell UI Automation、私有store或新浏览器绕过。

新鲜原始证据：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-install-20261007-r4\checkpoint.json、installed.json、runtime-check.json；原入口启动记录 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\evidence\launch-1791354225300.json。未新增真实生成/上传/材料下载/费用、远端写入、日常配置写入、提交推送或基线晋升。

### 用户保存退出后的最新接续

用户已明确回传“开发副本已保存并正常退出”，本候选退出门禁解除，不重复索取退出确认。新鲜进程查询无开发Desktop或私有Node；原启动器全量 `--check --s6-ui-check` 实际退出0（工具结果1f8359），仅验证、不启动。

安装前新增保全冲突：C:\Users\TinaD\.dsh\profiles\web\cordis.patch.yml 的SHA由上轮 bb6cea6b96d86486e08a0f794303e697a5dfacafc0722ae1b57971bd26043117 变为 a16b875a248992859756e3217a1834528aa00e152b55a87573831437c6a7d490，LastWrite=2026-10-07T05:52:24.104544Z（本地13:52:24）。相对上轮12控制新增1项差异，不能沿用“新增差异0”。本轮仅哈希读取，没有改动该文件、回滚它或静默重写旧基线。需用户确认日常Web配置是否由本人/其他任务修改，并暂停配置修改后再定向复核；不需要退出日常DSH，也不把未知来源写成确定归因。

本轮辅助执行账本：
- 初次安装辅助进程正确拒绝仍在运行的本轮只读preflight Node，退出1、未产生安装写入；随后原入口preflight正常退出0。
- 首个完整checkpoint枚举存在逐文件重复祖先canonical检查的耗时。仅在确认checkpoint尚未完成及Python进程身份属于本轮辅助脚本后，停止该备份worker；保留原脚本及新建不完整checkpoint/evidence，不删除、不覆盖，未进入安装步骤。工具返回退出1，不冒充备份完成。
- 新create-only r2脚本以每目录完整祖先/canonical检查、每叶lstat/symlink与junction-tag拒绝代替重复祖先检查，完整源/复制/末态SHA、全部程序/Profile/会话/业务备份范围及停进程条件不变。r2在checkpoint复制和三个包成员覆盖之前，因上述日常控制新增差异退出1。两个不完整checkpoint均不能用作回滚。
- 覆盖停止后的独立检查退出0：已安装v5的110成员逐字节SHA匹配，候选未安装；开发Desktop/私有Node进程0。没有自动重新打开旧缺陷UI，没有新增生成/上传/下载/费用或日常操作。原离线候选未改变，未重复构建/测试来伪造进度。

原始结果在 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-install-20261007\aborted.json 及 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-install-20261007-r2\blocked-preservation.json。当前第一批实际目标仍FAIL；安装的下一项人工输入改为**配置变更来源确认**，不是重复保存退出/计划批准。真实下载样本门禁未改变。

授权沿用用户“执行第一批，需要时使用computer use进行操作”及已批准计划，不新增生成、上传、费用、日常修改或提交推送。单代理作者自审，不称独立审查。

## 实际 Computer Use 证据

- 经 computer-use:computer-use Skill 和 bundled @oai/sky 精确选择开发进程窗口787718，程序为 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\app\DSH Desktop.exe。日常 C:\Program Files\DSH Desktop\DSH Desktop.exe 窗口不操作；先前“原生自动化不可用”的工具能力判断已被本轮实际调用覆盖。
- Desktop 显示2.0.17/compatibility；workspace-a 与原会话、旧未发送草稿可见。草稿中的原 API run847bc50d-0995-40ed-9e83-529c1148051e 与 artifact 标识可见，没有发送；不把 UI 文本可见性当字节完整性证明。
- 仅点击一次原生“打开技术研发与中国发明专利工作台”，等待20秒并复查仍关联中。通过开发者菜单打开当前开发 renderer 的 DevTools（窗口35982826），Console 检查时为空；Elements 搜索本插件公开诊断属性得到 data-oasis-embedded-state=pending、data-oasis-embedded-reason=workspace-generation-not-current。未执行 Console 脚本、读取宿主私有 store 或自动登录。
- 未进入记录列表/筛选/分页/选择/下载，不制造这些门禁的通过证据。A/B切换、安全预览仍未验收。

原始本轮账本：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-20261007\ui-observations.json。

## 根因与限定修正

实际安装的 DSH0.2 Session Controller 公共 list 不再提供 current；每行包含 id 与 retainedBy，原生 UiSession 从 retainedBy.mainView 解析主视图。原 WorkspaceContextBridge 仍读取 snapshot.current，并把缺失转成 null，导致与 Sidebar scope 会话不一致。源码定位与上述实际诊断相符，不仅是猜测。

修正只在既有 WorkspaceContextBridge：从公开 catalog 解析唯一 mainView Session，无主视图返回 null；异常身份/retention 或多个主视图返回无效上下文，禁止第一行、Sidebar owner、旧 current、同名/路径猜测回退。现有 workspace/generation/归属校验、Slot、界面、业务存储与依赖保持；没有安装中直接改 renderer 的做法。

## 新鲜离线验证与保全

命令均显式 PowerShell executor、login=false，实际使用隔离开发 Node24.19.0、既有固定0.2构建依赖与禁止网络测试 preload。本轮 verify-batch1-candidate.py 的 affected/build/test/pack 全部退出0：

- 新回归先红后绿：8项中旧实现3项失败（预期选择器行为断言，非加载失败），最小代码修正后8/8退出0。
- 受影响6组50/50，0失败；一次集成构建退出0、完整838项中836通过/2既有跳过/0失败、pack退出0。
- 新包110文件，相对已装v5仅 WorkspaceContextBridge 源文件及2个生成lib成员改变。202项主目录/固定构建字节一致；3036项原Git文件强基线仅14项已批准变化、无无关漂移。
- 首个候选提升辅助检查因 pnpm 的 package.json 序列化与原manifest字节不同而退出1；不冒充绿色。当时2个lib已按旧包哈希保全备份后复制。后续只读 finalize-batch1-candidate.py 退出0：packed manifest 与v5字节完全不变，源/包JSON语义完全相同，其余109个包成员逐字节匹配；保留失败辅助脚本和原lib备份，没有重复覆盖。
- UI前后检查均退出0：已安装v5的110成员仍匹配，27项Workspace/Home/Profile/凭据哈希控制无变化、无新增Workspace文件；日常12控制相对本轮开始新增差异0。此前两份日常Web配置差异仍待归因，不回滚或悄悄换基线。此有限控制集不是整个userData/OS写入审计。

离线命令、日志和SHA证据在 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\batch1-20261007：candidate-verification.json、affected.log、build.log、test.log、pack.log、promoted-candidate.json、before.json、after.json。候选包位于 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\dsh-upgrade-20261007\candidate\batch1-bridge\oasis-professional-service-0.0.1.tgz。

## 人工动作与接续

1. 前台/激活门禁已解除，Computer Use已实际执行，不再要求用户功能中心截图。网站放行方案已获批，当前请用户保存并正常退出开发副本并回传确认，日常DSH无需退出；不重复网络批准。当前运行数据未被候选覆盖。
2. 普通Markdown输入预览和A/B稳定往返已有实际证据；Sidebar已有文件的安全预览与更高层证明仍单列待验，不拿普通预览代替，不扩大系统修复。
3. 真实下载仍需用户明确指定网站项目/业务记录中的**一个输入和一个输出**（名称或记录/文件ID）。若用户需要先查看列表，可先完成只读列表展示再由用户选定，不能自动挑样本。按既定大小/SHA/归属/追溯/无覆盖合同下载，不重试未知创建或回退旧/api/files；本批不新增生成上传费用。

AGENTS/开发Skill验收基线暂不晋升；第二批不借本次离线结果关闭。
