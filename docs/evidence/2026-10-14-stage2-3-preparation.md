# 阶段2–3准备与当前未完成项 — 2026-10-14

这是连续目标的中间证据，不是阶段2或3的完成报告。阶段1已按新授权提交 `81da8b893e3e4ae8477432b74055a3db3989d7af`，含已保全Mac/root适配与超时修复；提交前48/48、0失败、0跳过，未推送。后续阶段完成后各自提交，当前未完成阶段的工作保持工作树状态。

## 阶段2实际开始

固定私有Node执行 `scripts/macos-development-launch.mjs --check` 退出0，然后 `--start --acceptance`。2026-10-14启动记录为 `runId=1791928144421`、launcher22501、Desktop22506；实际Host界面URL为loopback57517。隔离Home、userData、缓存/临时目录均属当前根目录 `.dsh-test/mac-dev`。原生官方首次引导已实际显示Desktop2.0.17，跳过外部DeepSeek账户登录；没有关闭认证或启用真实模型。

Computer Use实际观察：初始设置内出现“绿洲工作台”“侧边卡片”；主窗口有默认Workspace、原生未发送composer、“打开技术研发与中国发明专利工作台”入口。随后打开“添加工作区”原生目录选择器，定位新根目录的workspace-a，但“打开”仍禁用，A/B注册未证实成功。

当前UI验收阻碍为Computer Use的ScreenCaptureKit错误（-3811/-3812）、AXError.invalidUIElement及最终“Sky Computer Use native pipe closed before response”。重新绑定和一次会话重置未恢复；用户确认窗口正常可见并要求保持打开。Chrome可启动，浏览器通道访问loopback返回ERR_BLOCKED_BY_CLIENT；没有绕过认证/安全或改系统权限。插件发现没有返回可直接替代该原生通道的相关集成，未安装/删除插件。

已请求明确的AppleScript与系统截图替代操作授权，因为Computer Use工具要求界面操作技术替换有明确授权；这不是重复索取阶段范围/真实测试许可。等待期间继续不依赖GUI的接口审计与测试。窗口保持打开；进程与57517监听经实际ps/lsof核对，不能仅据启动记录推断存活。

仍需：实际绿洲Sidebar业务视图、A/B注册与归属、输入草稿、同页切换、合成结果/编辑/再审、保存/原生打开/固定版本草稿、正常退出重启恢复。以上未被初始界面或静态测试替代。

## 阶段3独立准备

源码审计确认产品模式固定网站origin `https://lzhxpy.oasisintwrite.com`，原生模型不受旧localModelEnabled=false设置控制；当前启动器仍显式OASIS_UNIFIED_FIXTURE=1且所有外部模型适配器禁用，不能拿当前合成模式做真实双来源验收。

专业API使用网站登录的Host credentials grant，生产映射要求从网站显式关联Workspace项目，实时核对账户、folder归属、Fast目录唯一身份、服务detail与schema指纹；不使用同名猜测或旧手填JWT。首模板共同四字段映射为技术交底TXT文档、附图说明及带标签合并的撰写要求/用户指令；有上游/文件输入不能静默遗漏。运行前须真实核对当前绑定/凭据和费用预览；本轮未读秘密或发出真实请求。

已准备四字段合计451字符的公开合成材料，存 `.local/stages1-3-20261014/public-sample.json`，后续两来源使用同一内容；只用于程序验收，不包含真实用户资料。参数与输入哈希见本地progress.json。

8份受影响API/账户/映射/请求/结果测试首次退出1，130项中128通过，失败为 `API reviewed original and edited child save through the common no-overwrite path` 和 `API root saves keep terminal OIW on original and edited versions without mutating original artifact names`。原因与阶段1同类：Mac tmpdir在/var而native Workspace合同要求/private/var的canonical路径。仅对这两处测试夹具调用realpath；未改生产安全合同。修复后130/130、0失败、0跳过，退出0。原失败与成功日志分别为 `.local/stages1-3-20261014/api-contracts.log` / `api-contracts-green.log`。

这130项是合成transport/owner/账户合同证据，未启动新的DSH服务、实际上传、模型或专业API生成，不能上推为阶段3成功响应。仍需正式验收模式、当前原生凭据/登录、真实双来源成功与全链操作/恢复和一次集成verify。阶段1–3目标保持未完成，不缩为静态准备。

## 后续实际进展：A合成闭环与当前锁屏

Computer Use在下一轮恢复，无需AppleScript；原生目录选择改用标准粘贴输入并从父目录选中workspace-a，实际注册Workspace `a78c38cf-b15e-4bab-a5ad-d07f22c08907` 和Session `session-91a4132d-6bf3-4e1c-a649-5459a60f472a`。当前原生Workspace存储的canonical路径为新根下 `.dsh-test/mac-dev/workspace-a`；绿洲任务 `27829daf-6299-4e9f-bd29-10d4a813d19b` 的四字段落盘与公开样本逐字一致，来源切换后运行数量不变、远端执行数量零。

当前实际GUI已验证A：通过Better Sidebar打开绿洲；本地来源合成生成、审核v1；编辑产生未审新版本、再审；首次逐字输入只留下A，保留v2并以粘贴方式修订成v3，完整中文编辑标记在落盘正文核对通过。v3固定审核版本保存为 `权利要求书_20261014-061043_v3.md`，SHA-256 `ededde063d20038c70f7b74089a93b004d5aed5132b4b869f10e9b0aa53fdabe`，正文与审核artifact逐字匹配；原生文件Tab已实际打开。来源切至API后共用输入不丢失，再单击生成合成v4、审核并保存 `权利要求书_20261014-061643_v4_OIW.md`，SHA-256 `ca66aab7e760a4ecd7b3816a87f8223fccc43b82938ae83d45b9c41989c09638`。两文件同存A根目录；重复准备v4保存实际返回WRITEBACK_TARGET_EXISTS，文件哈希及唯一writeback保持。

原未发送草稿A先逐字保全。本地v3已准备固定版本原生对话草稿，包含选定artifact标识和完整可见正文且只出现一次，有草稿时入口禁用；之后原草稿A已实际还原。API合成v4也成功准备同等固定版本草稿，逐行/哈希标识匹配，未发送。AX显示会折叠空行，故可见正文按非空行核对，不声称AX值是底层草稿字节哈希。API草稿后准备再次还原原草稿时，Computer Use明确返回“Mac已锁定且无法自动解锁”；该次动作后原草稿是否还原尚未核对，已请求用户手动解锁，原草稿副本仍保全。没有继续盲目发送按键、发送消息或新建真实请求。

A实际业务记录revision20、4个合成版本（3个本地链版本和1个API版本）、两个唯一保存记录、0实际API执行。证明和当前文件哈希在 `.local/stages1-3-20261014/stage2-a-acceptance.json`；实际2560×1080截图包括 `stage2-a-input-full.png`、`stage2-a-edited.png`、`stage2-a-file-open.png`、`stage2-a-conversation-prepared.png`、`stage2-a-api-saved.png`。最早两份134×127缩略图不作可读视觉证据；放大原生窗口后截图正常。

重启前check发现隔离cordis.patch.yml漂移。与保全前原件逐字diff，仅Desktop官方首次设置把 `windowsMaterial: off` 从desktop-shell.config末尾重排到macosMaterial之后，键和值/行/disabled配置均保持；断言单行重排精确相等，其余31项准入哈希全部保持。保存旧pin/配置后，仅更新这一已复核指纹并补partial状态说明，check退出0；未放宽校验、改依赖/模型/网络/认证配置。复核diff与前后pin见本地 `official-onboarding-profile.diff`、`admission-before-stage2-serialization-review.json` 和 `stage2-check-current-status.log`。

阶段2仍需B归属/草稿、正常退出与重启恢复；未提交为阶段2完成。阶段3实际生成仍未开始。用户解锁后先检查/还原原草稿，再继续剩余项，不因锁屏或观察中断自行重启现有Host。
