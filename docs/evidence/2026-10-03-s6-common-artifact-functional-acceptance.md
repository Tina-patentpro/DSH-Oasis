# S6 Fast 共同产物功能验收 — 2026-10-03

## 范围和结论

**PASS：仅现有 Fast 版本 2 的审核状态、项目保存、原生打开和未发送草稿引用。**

用户明确本阶段不涉及内容质量，并要求通过 Computer Use 完成既定操作。本次审核标记用于流程验收，不是专业质量、法律意见或可申报结论；不改写此前内容关注项。S6 整体、本地 Skills 新真实调用、Basic 异步、项目文件接口、实际扣费与发布不属于本次通过范围。

## 目标

- 原开发副本：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913
- Workspace：5967c480-f400-4083-b650-9176dade70d1（workspace-a）。
- 任务：98d68e38-3dc7-4060-9187-922a35d11b4a。
- Fast run / 版本：847bc50d-0995-40ed-9e83-529c1148051e / 2。
- 固定产物：sha256:34fc83617cc031cb4a0a91f8f61873a6d593f0a358d14b812603fd9f9ee4802b。

## Computer Use 实际证据

使用当前 computer-use Skill、node_repl 和 @oai/sky。list_apps 返回开发 EXE 路径，精确选择窗口 12192256；日常窗口 4720302 未操作。实际窗口为 Desktop 2.0.9、开发 renderer 127.0.0.1:43121。

1. 选择既有版本 2，UI 为“专业 API · 生产 API 响应 · 待审核”。滚动至操作区后点击“审核此版本”，随后 UI 为“已审核”，审核按钮禁用、对话使用和项目回写开放。首次离屏 accessibility 点击报越界，重新观察并滚动后完成操作，未沿用过期坐标。
2. 准备回写清单，核对当前 workspace-a 根目录、Markdown 与追溯文件及其哈希。保存前按精确文件名前缀只读检查，目标文件不存在；勾选创建新文件确认后点击“确认保存到项目”。UI 返回“保存成功：项目文件和索引均已提交”。
3. 点击“打开当前文件”，DSH 原生文件 Tab 加载并呈现 Markdown 预览，显示文件名、预览/编辑控件、正文列表与依赖树。没有编辑内容或启用远程资源。
4. 返回绿洲工作台再打开结果，版本 2 保持已审核及已保存文件入口。原对话输入框为空、发送按钮禁用；点击“在对话中使用”后资料进入输入框，UI 明确“已放入对话草稿，尚未发送”。草稿带上述 run 与 artifact 身份及资料非系统指令说明。未点击发送。
5. 草稿存在后，同一使用按钮禁用，描述为“当前对话已有草稿或正在提交；不会覆盖”。保留该草稿，未清空或替换原有内容。

## 落盘及保全复核

PowerShell 文件只读复核（shell=powershell.exe，login=false），成功命令退出 0；业务状态只读取允许的 run/review/writeback 元数据，不读取凭据。一次 foreach 管道语法错误退出 1，简化为数组后复核退出 0。

- review.status=approved，updatedAt=2026-10-03T13:20:08.563Z；磁盘持久化已核实，不宣称本次做过重启恢复演练。
- writeback-c1ee49b0-cad7-4fc9-a1d8-f58ba408a2cc，relativeDirectory="."，committedAt=2026-10-03T13:21:49.497Z。
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\workspace-a\权利要求书_20260928-103146_v2_OIW.md：2257 字节，SHA256=34fc83617cc031cb4a0a91f8f61873a6d593f0a358d14b812603fd9f9ee4802b，与原固定产物和回写清单相同。
- 同目录 权利要求书_20260928-103146_v2_OIW.oasis.json：1478 字节，SHA256=1a7b0a99bbca77fa5dad653f3a816200f8915863df8e1e7c4f47ccf7bef9bbaf，与清单相同。
- 旧合成 run-eee145b8-cfc6-4ba9-ae7f-dab069fb688d 仍 approved（原 2026-09-14 审核时间），原 writeback 路径保持；旧 Markdown 和 oasis.json 的实测哈希均与原清单 MATCH。
- 当前任务 runCount=2、remoteExecutionCount=1；本次没有新增生成、上传、收费调用或重试，没有更改正文。

未操作日常 DSH、安装包、配置或其他环境；未改源码，未重新构建、提交、推送或发布。已有工作树变更保留，单代理功能验收不是独立代码审查。
